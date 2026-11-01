"""Explain winning settings and expose effective behavior values."""

from homeassistant.components.sensor import SensorEntity

from .const import DOMAIN
from .entity import ModeEntity
from .model import resolve


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ModeStatus(hass.data[DOMAIN], entry, "status")])


class ModeStatus(ModeEntity, SensorEntity):
    _attr_name = "Status"
    _attr_icon = "mdi:home-switch"

    @property
    def native_value(self):
        if self.mode_id not in self.manager.state["active"]:
            return "inactive"
        effects, values = resolve(self.manager.modes, self.manager.state["active"])
        owned = sum(
            item["mode_id"] == self.mode_id
            for item in [*effects.values(), *values.values()]
        )
        total = len(self.manager.modes[self.mode_id]["effects"]) + len(
            self.manager.modes[self.mode_id]["values"]
        )
        return (
            "overridden"
            if total and not owned
            else "partially_overridden"
            if owned < total
            else "active"
        )

    @property
    def extra_state_attributes(self):
        snapshot = self.manager.snapshot()
        return {
            "mode_id": self.mode_id,
            "effective_values": {
                key: item["value"] for key, item in snapshot["values"].items()
            },
            "effective_effects": snapshot["effects"],
            "errors": snapshot["errors"],
            **self.manager.state["active"].get(self.mode_id, {}),
        }
