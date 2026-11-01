"""Native config/option forms create modes without requiring YAML."""

from unittest.mock import patch

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def test_create_mode_with_native_device_picker(hass):
    with patch("custom_components.modes_plus.async_setup_entry", return_value=True):
        result = await hass.config_entries.flow.async_init(
            "modes_plus", context={"source": config_entries.SOURCE_USER}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"name": "Night", "priority": 10, "group": ""}
        )
        assert result["type"] is FlowResultType.MENU
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"next_step_id": "device"}
        )
        assert result["step_id"] == "device"
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {"entity_id": "light.hall", "state": "on", "brightness": 15},
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"next_step_id": "finish"}
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"]["effects"]["light.hall"] == {"state": "on", "brightness": 38}


async def test_invalid_switch_brightness_and_options_cancel_do_not_mutate(hass):
    entry = MockConfigEntry(
        domain="modes_plus",
        title="Night",
        data={
            "name": "Night",
            "priority": 10,
            "effects": {"light.hall": {"state": "on"}},
            "values": {},
        },
    )
    entry.add_to_hass(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"name": "Night", "priority": 10, "group": ""}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "device"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"entity_id": "switch.fan", "state": "on", "brightness": 15}
    )
    assert result["errors"]["base"] == "invalid_effect"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {"entity_id": "light.bedroom", "state": "off", "brightness": 0},
    )
    assert "light.bedroom" not in entry.data["effects"]


async def test_behavior_and_remove_are_saved_through_options(hass):
    entry = MockConfigEntry(
        domain="modes_plus",
        title="Night",
        data={
            "name": "Night",
            "priority": 10,
            "effects": {"light.hall": {"state": "on"}},
            "values": {},
        },
    )
    entry.add_to_hass(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"name": "Night", "priority": 20, "group": ""}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "behavior"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"key": "bedroom_brightness", "value": 15}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "remove"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"setting": "device:light.hall"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "finish"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"]["values"] == {"bedroom_brightness": 15}
    assert not result["data"]["effects"]
    assert result["data"]["priority"] == 20


async def test_create_group_then_reuse_dropdown_choice(hass):
    from custom_components.modes_plus.groups import NEW_GROUP

    with patch("custom_components.modes_plus.async_setup_entry", return_value=True):
        result = await hass.config_entries.flow.async_init(
            "modes_plus", context={"source": config_entries.SOURCE_USER}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"name": "Home", "priority": 10, "group": NEW_GROUP}
        )
        assert result["step_id"] == "group"
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"name": "Presence"}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"next_step_id": "finish"}
        )
        assert result["data"]["group"] == "Presence"
        second = await hass.config_entries.flow.async_init(
            "modes_plus", context={"source": config_entries.SOURCE_USER}
        )
        group_selector = next(
            value
            for key, value in second["data_schema"].schema.items()
            if key.schema == "group"
        )
        assert {"value": "Presence", "label": "Presence"} in group_selector.config[
            "options"
        ]
        second = await hass.config_entries.flow.async_configure(
            second["flow_id"], {"name": "Away", "priority": 10, "group": "Presence"}
        )
        second = await hass.config_entries.flow.async_configure(
            second["flow_id"], {"next_step_id": "finish"}
        )
        assert second["data"]["group"] == "Presence"
