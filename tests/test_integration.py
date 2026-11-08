"""Integration lifecycle and HA's real entity/service registration."""

from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.exceptions import HomeAssistantError
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry


def entry(name="Shabbat", priority=50):
    return MockConfigEntry(
        domain="modes_plus",
        title=name,
        data={
            "name": name,
            "priority": priority,
            "effects": {},
            "values": {"bedroom_brightness": 15},
        },
    )


async def test_setup_entities_actions_options_and_unload(hass):
    mode = entry()
    mode.add_to_hass(hass)
    with (
        patch("custom_components.modes_plus.async_register_frontend", new=AsyncMock()),
        patch("custom_components.modes_plus.async_unregister_frontend"),
    ):
        # Skip frontend dependencies, but run the custom integration and platforms.
        with patch("homeassistant.setup.async_process_deps_reqs", return_value=True):
            assert await hass.config_entries.async_setup(mode.entry_id)
        await hass.async_start()
        await hass.async_block_till_done()
        manager = hass.data["modes_plus"]
        assert manager.ready
        switch = next(
            state
            for state in hass.states.async_all("switch")
            if state.attributes.get("mode_id") == mode.entry_id
        )
        sensor = next(
            state
            for state in hass.states.async_all("sensor")
            if state.attributes.get("mode_id") == mode.entry_id
        )
        await hass.services.async_call(
            "switch", "turn_on", {"entity_id": switch.entity_id}, blocking=True
        )
        await hass.async_block_till_done()
        assert hass.states.get(switch.entity_id).state == "on"
        assert hass.states.get(sensor.entity_id).attributes["effective_values"] == {
            "bedroom_brightness": 15
        }
        await hass.services.async_call(
            "modes_plus", "deactivate", {"mode_id": mode.entry_id}, blocking=True
        )
        await hass.async_block_till_done()
        assert hass.states.get(switch.entity_id).state == "off"
        hass.config_entries.async_update_entry(
            mode, options={**mode.data, "priority": 100}
        )
        await hass.async_block_till_done()
        assert manager.modes[mode.entry_id]["priority"] == 100
        assert await hass.config_entries.async_unload(mode.entry_id)
        assert "modes_plus" not in hass.data
        assert not hass.services.has_service("modes_plus", "activate")


@patch("homeassistant.components.http.HomeAssistantHTTP.start", new=AsyncMock())
async def test_real_frontend_registration(
    hass, hass_client, hass_ws_client, hass_read_only_access_token
):
    assert await async_setup_component(hass, "http", {})
    assert await async_setup_component(hass, "frontend", {})
    from custom_components.modes_plus.frontend import (
        async_register_frontend,
        async_unregister_frontend,
    )
    from custom_components.modes_plus.manager import ModeManager

    manager = ModeManager(hass)
    hass.data["modes_plus"] = manager
    await async_register_frontend(hass, manager)
    assert "ha-plus-modes" in hass.data["frontend_panels"]
    client = await hass_client()
    response = await client.get("/modes_plus/modes-plus.js")
    assert response.status == 200
    assert "modes-plus-card" in await response.text()
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "modes_plus/snapshot"})
    result = await ws.receive_json()
    assert result["success"]
    assert result["result"]["modes"] == []
    assert (
        hass.data["frontend_panels"]["ha-plus-modes"].sidebar_icon == "modes-plus:logo"
    )
    await ws.send_json({"id": 2, "type": "modes_plus/create_group", "name": "Presence"})
    created = await ws.receive_json()
    assert created["success"]
    assert created["result"]["name"] == "Presence"
    await ws.send_json({"id": 3, "type": "modes_plus/snapshot"})
    assert (await ws.receive_json())["result"]["groups"] == ["Presence"]
    readonly = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await readonly.send_json(
        {"id": 1, "type": "modes_plus/create_group", "name": "Forbidden"}
    )
    denied = await readonly.receive_json()
    assert not denied["success"]
    assert "Forbidden" not in manager.groups.names
    await hass.async_block_till_done()
    async_unregister_frontend(hass)
    assert "ha-plus-modes" not in hass.data["frontend_panels"]
    await async_register_frontend(hass, manager)
    assert "ha-plus-modes" in hass.data["frontend_panels"]
    async_unregister_frontend(hass)


async def test_recursive_mode_target_is_rejected_without_deadlock(hass):
    from homeassistant.helpers import entity_registry as er

    from custom_components.modes_plus.manager import ModeManager

    registry = er.async_get(hass)
    target = registry.async_get_or_create("switch", "modes_plus", "test_active")
    manager = ModeManager(hass)
    with pytest.raises(HomeAssistantError, match="another mode"):
        await manager._send(target.entity_id, {"state": "on"}, None)


async def test_concurrent_entry_startup_uses_one_shared_manager(hass):
    import asyncio

    entries = [entry("Night", 10), entry("Shabbat", 50), entry("Missile Alert", 100)]
    for mode in entries:
        mode.add_to_hass(hass)
    with (
        patch(
            "custom_components.modes_plus.async_register_frontend", new=AsyncMock()
        ) as register,
        patch("homeassistant.setup.async_process_deps_reqs", return_value=True),
    ):
        assert all(
            await asyncio.gather(
                *(hass.config_entries.async_setup(mode.entry_id) for mode in entries)
            )
        )
        await hass.async_block_till_done()
    manager = hass.data["modes_plus"]
    assert set(manager.modes) == {mode.entry_id for mode in entries}
    register.assert_awaited_once()
    states = [
        state
        for state in hass.states.async_all("switch")
        if state.attributes.get("mode_id") in manager.modes
    ]
    assert len(states) == 3
