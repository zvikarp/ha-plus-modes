"""Serialized durable mode transitions and guarded device restoration."""

import asyncio
from datetime import timedelta

from homeassistant.auth.permissions.const import POLICY_CONTROL
from homeassistant.core import Context, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, SIGNAL
from .groups import async_get_groups
from .model import resolve, validate


class ModeManager:
    def __init__(self, hass):
        self.hass = hass
        self.modes = {}
        self.state = {"active": {}, "baselines": {}, "applied": {}, "history": []}
        self.groups = None
        self.errors = {}
        self.lock = asyncio.Lock()
        self.store = Store(hass, 1, DOMAIN)
        self.cancel_timer = None
        self.ready = False
        self.listeners = []

    async def load(self):
        self.groups = await async_get_groups(self.hass)
        saved = await self.store.async_load()
        if saved:
            self.state.update(saved)

    def definition(self, entry):
        self.modes[entry.entry_id] = validate({**entry.data, **entry.options})

    async def start(self):
        async with self.lock:
            first_start = not self.ready
            self.ready = True
            self.state["active"] = {
                key: value
                for key, value in self.state["active"].items()
                if key in self.modes
            }
            self._expire()
            await self._reconcile(force=first_start)
            self._timer()

    async def _authorize(self, entity_ids, context):
        if not context or not context.user_id:
            return
        user = await self.hass.auth.async_get_user(context.user_id)
        if user is None or any(
            not user.permissions.check_entity(key, POLICY_CONTROL) for key in entity_ids
        ):
            raise HomeAssistantError(
                "You do not have permission to control these mode devices"
            )

    async def change(self, mode_id, active, duration=0, context=None):
        async with self.lock:
            await self._change_locked(mode_id, active, duration, context)

    async def select(
        self, group, mode_id, duration=0, context=None, standalone_mode_id=None
    ):
        """Validate membership and choose/clear a group under the transition lock."""
        async with self.lock:
            if group:
                known = set(self.groups.names if self.groups else ()) | {
                    mode["group"] for mode in self.modes.values() if mode["group"]
                }
                if group not in known or standalone_mode_id is not None:
                    raise HomeAssistantError("Unknown group")
                members = {
                    key for key, mode in self.modes.items() if mode["group"] == group
                }
            else:
                if (
                    standalone_mode_id not in self.modes
                    or self.modes[standalone_mode_id]["group"]
                ):
                    raise HomeAssistantError("Choose an independent mode")
                members = {standalone_mode_id}
            if mode_id:
                if mode_id not in members:
                    raise HomeAssistantError(
                        "This mode does not belong to the selected group"
                    )
                await self._change_locked(mode_id, True, duration, context)
            else:
                for key in sorted(members & self.state["active"].keys()):
                    await self._change_locked(key, False, 0, context)

    async def _change_locked(self, mode_id, active, duration, context):
        if mode_id not in self.modes:
            raise HomeAssistantError("Unknown mode")
        if not self.ready:
            raise HomeAssistantError(
                "Modes are waiting for Home Assistant to finish starting"
            )
        affected = set(self.modes[mode_id]["effects"])
        registry = er.async_get(self.hass)
        affected.update(
            item.entity_id
            for item in er.async_entries_for_config_entry(registry, mode_id)
            if item.domain == "switch"
        )
        group = self.modes[mode_id]["group"]
        if group:
            for key in self.state["active"]:
                if self.modes[key]["group"] == group:
                    affected.update(self.modes[key]["effects"])
                    affected.update(
                        item.entity_id
                        for item in er.async_entries_for_config_entry(registry, key)
                        if item.domain == "switch"
                    )
        await self._authorize(affected, context)
        self._expire()
        if active:
            group = self.modes[mode_id]["group"]
            if group:
                for other in list(self.state["active"]):
                    if other != mode_id and self.modes[other]["group"] == group:
                        self.state["active"].pop(other)
            now = dt_util.utcnow()
            self.state["active"][mode_id] = {
                "since": now.isoformat(),
                "until": (now + timedelta(minutes=duration)).isoformat()
                if duration
                else None,
                "source": "user" if context and context.user_id else "automation",
            }
        else:
            self.state["active"].pop(mode_id, None)
        self.state["history"] = (
            [
                {
                    "mode": self.modes[mode_id]["name"],
                    "active": active,
                    "at": dt_util.utcnow().isoformat(),
                }
            ]
            + self.state["history"]
        )[:30]
        # Commit intent before device commands: restart recovery can finish a transition.
        await self.store.async_save(self.state)
        await self._reconcile(context)
        self._timer()

    def _expire(self):
        now = dt_util.utcnow()
        for key, active in list(self.state["active"].items()):
            if active["until"] and dt_util.parse_datetime(active["until"]) <= now:
                self.state["active"].pop(key)

    def _timer(self):
        if self.cancel_timer:
            self.cancel_timer()
            self.cancel_timer = None
        deadlines = [
            dt_util.parse_datetime(item["until"])
            for item in self.state["active"].values()
            if item["until"]
        ]
        if deadlines:
            self.cancel_timer = async_track_point_in_utc_time(
                self.hass, self._on_timer, min(deadlines)
            )

    async def _on_timer(self, _now):
        async with self.lock:
            self._expire()
            await self._reconcile()
            self._timer()

    def snapshot(self):
        effects, values = resolve(self.modes, self.state["active"])
        return {
            "groups": sorted(
                set(self.groups.names if self.groups else ())
                | {mode["group"] for mode in self.modes.values() if mode["group"]},
                key=str.casefold,
            ),
            "modes": [
                {"id": key, **mode, "active": self.state["active"].get(key)}
                for key, mode in self.modes.items()
            ],
            "effects": effects,
            "values": values,
            "errors": self.errors,
            "history": self.state["history"],
        }

    def _read(self, entity_id):
        state = self.hass.states.get(entity_id)
        if not state or state.state not in ("on", "off"):
            return None
        result = {"state": state.state}
        if (
            entity_id.startswith("light.")
            and state.state == "on"
            and state.attributes.get("brightness") is not None
        ):
            result["brightness"] = state.attributes["brightness"]
        return result

    async def _send(self, entity_id, desired, context):
        registry_entry = er.async_get(self.hass).async_get(entity_id)
        if registry_entry and registry_entry.platform == DOMAIN:
            raise HomeAssistantError(
                "A mode cannot control another mode switch; use exclusive groups instead"
            )
        await self._authorize([entity_id], context)
        domain = entity_id.split(".")[0]
        data = {"entity_id": entity_id}
        if "brightness" in desired:
            data["brightness"] = desired["brightness"]
        await self.hass.services.async_call(
            domain, "turn_" + desired["state"], data, blocking=True, context=context
        )

    async def _reconcile(self, context=None, *, force=False):
        effects, _ = resolve(self.modes, self.state["active"])
        self.errors = {}
        for entity_id in set(effects) | set(self.state["baselines"]):
            current = self._read(entity_id)
            if entity_id in effects:
                desired = effects[entity_id]["desired"]
                if current is None:
                    self.errors[entity_id] = (
                        "Device unavailable; retry when it is available."
                    )
                    continue
                self.state["baselines"].setdefault(entity_id, current)
                if (
                    not force
                    and self.state["applied"].get(entity_id, {}).get("desired")
                    == desired
                ):
                    continue  # Preserve manual changes until the winning effect changes.
            else:
                applied = self.state["applied"].get(entity_id)
                if current is None:
                    self.errors[entity_id] = (
                        "Cannot restore an unavailable device; retry."
                    )
                    continue
                # Restore only if no later command has changed the device context.
                live = self.hass.states.get(entity_id)
                if not applied or live.context.id != applied["context_id"]:
                    self.state["baselines"].pop(entity_id, None)
                    self.state["applied"].pop(entity_id, None)
                    continue
                desired = self.state["baselines"][entity_id]
            command_context = Context(
                parent_id=context.id if context else None,
                user_id=context.user_id if context else None,
            )
            await self.store.async_save(self.state)
            try:
                async with asyncio.timeout(10):
                    await self._send(entity_id, desired, command_context)
            except TimeoutError:
                self.errors[entity_id] = (
                    "Device action timed out; check the device and retry."
                )
                continue
            except HomeAssistantError as err:
                self.errors[entity_id] = str(err)
                continue
            if entity_id in effects:
                self.state["applied"][entity_id] = {
                    "desired": desired,
                    "context_id": command_context.id,
                }
            else:
                self.state["baselines"].pop(entity_id, None)
                self.state["applied"].pop(entity_id, None)
        await self.store.async_save(self.state)
        async_dispatcher_send(self.hass, SIGNAL)

    async def retry(self, context=None):
        async with self.lock:
            await self._authorize(
                set(self.state["baselines"])
                | {
                    entity_id
                    for key in self.state["active"]
                    for entity_id in self.modes[key]["effects"]
                },
                context,
            )
            await self._reconcile(context)

    async def update(self, entry):
        async with self.lock:
            self.definition(entry)
            group = self.modes[entry.entry_id]["group"]
            if entry.entry_id in self.state["active"] and group:
                for other in list(self.state["active"]):
                    if other != entry.entry_id and self.modes[other]["group"] == group:
                        self.state["active"].pop(other)
            if self.ready:
                await self._reconcile()
                self._timer()

    async def remove(self, mode_id):
        async with self.lock:
            self.modes.pop(mode_id, None)
            self.state["active"].pop(mode_id, None)
            if self.ready:
                await self._reconcile()
                self._timer()

    @callback
    def close(self):
        if self.cancel_timer:
            self.cancel_timer()
        for unsubscribe in self.listeners:
            unsubscribe()
