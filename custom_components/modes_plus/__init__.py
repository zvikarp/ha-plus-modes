"""HA Plus Modes integration lifecycle and automation actions."""

import math

import voluptuous as vol
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, EVENT_HOMEASSISTANT_STOP
from homeassistant.core import CoreState, callback
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN, PLATFORMS
from .frontend import async_register_frontend, async_unregister_frontend
from .manager import ModeManager


def _finite_duration(value):
    if not math.isfinite(value):
        raise vol.Invalid("Duration must be finite")
    return value


CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass, config):
    return True


async def async_setup_entry(hass, entry):
    manager = hass.data.get(DOMAIN)
    if manager is None:
        manager = ModeManager(hass)
        await manager.load()
        hass.data[DOMAIN] = manager
        await async_register_frontend(hass, manager)

        async def action(call):
            if call.service == "retry":
                await manager.retry(call.context)
            else:
                await manager.change(
                    call.data["mode_id"],
                    call.service == "activate",
                    call.data.get("duration", 0),
                    call.context,
                )

        for service in ("activate", "deactivate", "retry"):
            fields = {} if service == "retry" else {vol.Required("mode_id"): cv.string}
            if service == "activate":
                fields[vol.Optional("duration", default=0)] = vol.All(
                    vol.Coerce(float), vol.Range(min=0, max=525600), _finite_duration
                )
            hass.services.async_register(
                DOMAIN, service, action, schema=vol.Schema(fields)
            )

        async def started(event):
            await manager.start()

        @callback
        def stopped(event):
            manager.close()

        manager.listeners.append(
            hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, stopped)
        )
        if hass.state != CoreState.running:
            manager.listeners.append(
                hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, started)
            )
    manager.definition(entry)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_updated))
    if hass.state == CoreState.running:
        await manager.start()
    return True


async def _updated(hass, entry):
    await hass.data[DOMAIN].update(entry)


async def async_unload_entry(hass, entry):
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    manager = hass.data[DOMAIN]
    await manager.remove(entry.entry_id)
    if not manager.modes:
        manager.close()
        async_unregister_frontend(hass)
        for service in ("activate", "deactivate", "retry"):
            hass.services.async_remove(DOMAIN, service)
        hass.data.pop(DOMAIN)
    return True
