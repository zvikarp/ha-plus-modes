"""Native mode forms with entity pickers and reusable effect editing."""

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import DOMAIN
from .groups import NEW_GROUP, async_get_groups
from .model import validate


def basics(defaults, groups):
    return vol.Schema(
        {
            vol.Required("name", default=defaults.get("name", "")): str,
            vol.Required(
                "priority", default=defaults.get("priority", 10)
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0, max=1000, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                "group", default=defaults.get("group", "")
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[{"value": "", "label": "Independent mode"}]
                    + [
                        {"value": name, "label": name}
                        for name in sorted(groups, key=str.casefold)
                    ]
                    + [{"value": NEW_GROUP, "label": "Create a new group…"}],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Optional(
                "icon", default=defaults.get("icon", "mdi:home-switch")
            ): selector.IconSelector(),
        }
    )


class ModeEditor:
    """Shared creation/options wizard, leaving storage to its owning flow."""

    _definition = None

    async def _basics(self, step_id, user_input, defaults):
        errors = {}
        groups = await async_get_groups(self.hass)
        if user_input is not None:
            try:
                self._definition = validate({**defaults, **user_input})
                group = self._definition["group"]
                if group == NEW_GROUP:
                    return await self.async_step_group()
                if group and group not in groups.names:
                    raise ValueError("Select an existing group")
            except ValueError:
                errors["base"] = "invalid_definition"
            else:
                return await self.async_step_settings()
        return self.async_show_form(
            step_id=step_id,
            data_schema=basics(user_input or defaults, groups.names),
            errors=errors,
        )

    async def async_step_group(self, user_input=None):
        errors = {}
        if user_input is not None:
            try:
                groups = await async_get_groups(self.hass)
                self._definition["group"] = await groups.create(user_input["name"])
            except ValueError:
                errors["base"] = "invalid_group"
            else:
                return await self.async_step_settings()
        return self.async_show_form(
            step_id="group",
            data_schema=vol.Schema({vol.Required("name"): str}),
            errors=errors,
        )

    async def async_step_settings(self, user_input=None):
        return self.async_show_menu(
            step_id="settings", menu_options=["device", "behavior", "remove", "finish"]
        )

    async def async_step_device(self, user_input=None):
        errors = {}
        if user_input is not None:
            effect = {"state": user_input["state"]}
            if user_input.get("brightness", 0):
                effect["brightness"] = round(user_input["brightness"] * 255 / 100)
            entity_id = user_input["entity_id"]
            try:
                from homeassistant.helpers import entity_registry as er

                registry_entry = er.async_get(self.hass).async_get(entity_id)
                if registry_entry and registry_entry.platform == DOMAIN:
                    raise ValueError("Cannot control mode switches")
                validate({**self._definition, "effects": {entity_id: effect}})
            except ValueError:
                errors["base"] = "invalid_effect"
            else:
                self._definition["effects"][entity_id] = effect
                return await self.async_step_settings()
        return self.async_show_form(
            step_id="device",
            data_schema=vol.Schema(
                {
                    vol.Required("entity_id"): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain=["light", "switch"])
                    ),
                    vol.Required("state", default="on"): selector.SelectSelector(
                        selector.SelectSelectorConfig(options=["on", "off"])
                    ),
                    vol.Optional("brightness", default=0): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=0,
                            max=100,
                            step=1,
                            unit_of_measurement="%",
                            mode=selector.NumberSelectorMode.SLIDER,
                        )
                    ),
                }
            ),
            errors=errors,
        )

    async def async_step_behavior(self, user_input=None):
        errors = {}
        if user_input is not None:
            key = user_input["key"].strip()
            if not key:
                errors["base"] = "invalid_definition"
            else:
                self._definition["values"][key] = user_input["value"]
                return await self.async_step_settings()
        return self.async_show_form(
            step_id="behavior",
            data_schema=vol.Schema(
                {
                    vol.Required("key"): str,
                    vol.Required("value", default=15): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=0, max=100, mode=selector.NumberSelectorMode.BOX
                        )
                    ),
                }
            ),
            errors=errors,
        )

    async def async_step_remove(self, user_input=None):
        choices = [
            {"value": "device:" + key, "label": key}
            for key in self._definition["effects"]
        ] + [
            {"value": "value:" + key, "label": key}
            for key in self._definition["values"]
        ]
        if not choices:
            return await self.async_step_settings()
        if user_input is not None:
            kind, key = user_input["setting"].split(":", 1)
            self._definition["effects" if kind == "device" else "values"].pop(key, None)
            return await self.async_step_settings()
        return self.async_show_form(
            step_id="remove",
            data_schema=vol.Schema(
                {
                    vol.Required("setting"): selector.SelectSelector(
                        selector.SelectSelectorConfig(options=choices)
                    )
                }
            ),
        )


class ModesConfigFlow(ModeEditor, config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        return await self._basics("user", user_input, {})

    async def async_step_finish(self, user_input=None):
        return self.async_create_entry(
            title=self._definition["name"], data=self._definition
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return ModesOptionsFlow(config_entry)


class ModesOptionsFlow(ModeEditor, config_entries.OptionsFlow):
    def __init__(self, entry):
        self._entry = entry

    async def async_step_init(self, user_input=None):
        from copy import deepcopy

        return await self._basics(
            "init", user_input, deepcopy({**self._entry.data, **self._entry.options})
        )

    async def async_step_finish(self, user_input=None):
        self.hass.config_entries.async_update_entry(
            self._entry, title=self._definition["name"]
        )
        return self.async_create_entry(title="", data=self._definition)
