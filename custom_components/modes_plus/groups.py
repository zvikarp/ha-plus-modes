"""Durable group names shared by setup forms and the household panel."""

import asyncio

from homeassistant.helpers.storage import Store

from .const import DOMAIN

NEW_GROUP = "__modes_plus_create_group__"
DATA_GROUPS = f"{DOMAIN}_groups"


class GroupRegistry:
    """Keep empty groups and adopt legacy free-text names without changing entries."""

    def __init__(self, hass):
        self.hass = hass
        self.store = Store(hass, 1, f"{DOMAIN}.groups")
        self.names = set()
        self.loaded = False
        self.lock = asyncio.Lock()

    async def load(self):
        async with self.lock:
            if not self.loaded:
                self.names.update(
                    (await self.store.async_load() or {}).get("names", [])
                )
                self.loaded = True
            legacy = {
                group
                for entry in self.hass.config_entries.async_entries(DOMAIN)
                if (group := {**entry.data, **entry.options}.get("group", ""))
            }
            if legacy - self.names:
                self.names.update(legacy)
                await self._save()
        return self

    async def create(self, name):
        name = name.strip()
        if not name or len(name) > 80 or name == NEW_GROUP:
            raise ValueError("Use a group name between 1 and 80 characters")
        async with self.lock:
            if existing := next(
                (item for item in self.names if item.casefold() == name.casefold()),
                None,
            ):
                return existing
            self.names.add(name)
            try:
                await self._save()
            except Exception:
                self.names.remove(name)
                raise
            return name

    async def _save(self):
        await self.store.async_save({"names": sorted(self.names, key=str.casefold)})


async def async_get_groups(hass):
    if DATA_GROUPS not in hass.data:
        hass.data[DATA_GROUPS] = GroupRegistry(hass)
    return await hass.data[DATA_GROUPS].load()
