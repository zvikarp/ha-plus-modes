"""Switches usable from standard HA controls and automations."""

from homeassistant.components.switch import SwitchEntity

from .const import DOMAIN
from .entity import ModeEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ModeSwitch(hass.data[DOMAIN], entry, "active")])


class ModeSwitch(ModeEntity, SwitchEntity):
    _attr_name = "Active"

    @property
    def icon(self):
        return self.manager.modes[self.mode_id].get("icon", "mdi:home-switch")

    @property
    def is_on(self):
        return self.mode_id in self.manager.state["active"]

    @property
    def extra_state_attributes(self):
        return {
            "mode_id": self.mode_id,
            **self.manager.state["active"].get(self.mode_id, {}),
        }

    async def async_turn_on(self, **kwargs):
        await self.manager.change(self.mode_id, True, context=self._context)

    async def async_turn_off(self, **kwargs):
        await self.manager.change(self.mode_id, False, context=self._context)
