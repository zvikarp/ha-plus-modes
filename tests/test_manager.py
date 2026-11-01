"""Exercise real HA service calls, persistence, timers, and mode concurrency."""

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.core import Context
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.modes_plus.manager import ModeManager


@pytest.fixture
def manager(hass):
    manager = ModeManager(hass)
    manager.store.async_save = AsyncMock()
    manager.ready = True
    return manager


def add(manager, key, priority=10, group="", **settings):
    manager.definition(
        SimpleNamespace(
            entry_id=key,
            data={"name": key, "priority": priority, "group": group, **settings},
            options={},
        )
    )


@pytest.fixture
def lights(hass):
    calls = []
    hass.states.async_set("light.shelter", "off")

    async def handle(call):
        calls.append(dict(call.data))
        hass.states.async_set(
            call.data["entity_id"],
            "on" if call.service == "turn_on" else "off",
            {key: value for key, value in call.data.items() if key != "entity_id"},
            context=call.context,
        )

    hass.services.async_register("light", "turn_on", handle)
    hass.services.async_register("light", "turn_off", handle)
    return calls


async def test_alert_layers_and_restores_baseline(hass, manager, lights):
    add(
        manager,
        "shabbat",
        50,
        effects={"light.shelter": {"state": "on", "brightness": 80}},
    )
    add(manager, "night", 10, values={"bedroom_brightness": 15})
    add(
        manager,
        "alert",
        100,
        effects={"light.shelter": {"state": "on", "brightness": 255}},
    )
    await manager.change("shabbat", True)
    await manager.change("night", True)
    await manager.change("alert", True)
    assert set(manager.state["active"]) == {"shabbat", "night", "alert"}
    assert hass.states.get("light.shelter").attributes["brightness"] == 255
    await manager.change("night", False)
    assert len(lights) == 2  # Unchanged device effects are not resent.
    await manager.change("alert", False)
    assert hass.states.get("light.shelter").attributes["brightness"] == 80
    assert not manager.snapshot()["values"]
    await manager.change("shabbat", False)
    assert hass.states.get("light.shelter").state == "off"
    assert not manager.state["baselines"]


async def test_manual_change_is_not_overwritten_on_exit(hass, manager, lights):
    add(manager, "night", effects={"light.shelter": {"state": "on", "brightness": 30}})
    await manager.change("night", True)
    hass.states.async_set("light.shelter", "on", {"brightness": 100}, context=Context())
    await manager.retry()
    assert len(lights) == 1
    await manager.change("night", False)
    assert hass.states.get("light.shelter").attributes["brightness"] == 100
    assert len(lights) == 1


async def test_exclusive_groups_and_concurrent_changes(manager):
    add(manager, "home", group="presence")
    add(manager, "away", group="presence")
    add(manager, "night")
    import asyncio

    await asyncio.gather(
        manager.change("home", True),
        manager.change("away", True),
        manager.change("night", True),
    )
    assert set(manager.state["active"]) == {"away", "night"}


async def test_expired_timer_reveals_shabbat(hass, manager, lights, freezer):
    add(
        manager,
        "shabbat",
        50,
        effects={"light.shelter": {"state": "on", "brightness": 80}},
    )
    add(
        manager,
        "alert",
        100,
        effects={"light.shelter": {"state": "on", "brightness": 255}},
    )
    await manager.change("shabbat", True)
    await manager.change("alert", True, duration=1)
    freezer.move_to(dt_util.utcnow() + timedelta(minutes=2))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert "alert" not in manager.state["active"]
    assert hass.states.get("light.shelter").attributes["brightness"] == 80
    manager.close()


async def test_unavailable_and_service_failure_retry(hass, manager, lights):
    add(manager, "night", effects={"light.shelter": {"state": "on", "brightness": 30}})
    hass.states.async_set("light.shelter", "unavailable")
    await manager.change("night", True)
    assert "light.shelter" in manager.errors
    hass.states.async_set("light.shelter", "off")
    with patch.object(manager, "_send", side_effect=HomeAssistantError("Disconnected")):
        await manager.retry()
    assert "Disconnected" in manager.errors["light.shelter"]
    await manager.retry()
    assert not manager.errors
    assert hass.states.get("light.shelter").state == "on"


async def test_restart_expires_alert_and_uses_current_underlying(hass, manager, lights):
    add(
        manager,
        "shabbat",
        50,
        effects={"light.shelter": {"state": "on", "brightness": 80}},
    )
    add(
        manager,
        "alert",
        100,
        effects={"light.shelter": {"state": "on", "brightness": 255}},
    )
    await manager.change("shabbat", True)
    await manager.change("alert", True, duration=1)
    from copy import deepcopy

    saved = deepcopy(manager.state)
    manager.close()
    restored = ModeManager(hass)
    restored.store.async_load = AsyncMock(return_value=saved)
    restored.store.async_save = AsyncMock()
    restored.modes = manager.modes
    await restored.load()
    with patch(
        "custom_components.modes_plus.manager.dt_util.utcnow",
        return_value=dt_util.utcnow() + timedelta(minutes=2),
    ):
        await restored.start()
    assert set(restored.state["active"]) == {"shabbat"}
    assert hass.states.get("light.shelter").attributes["brightness"] == 80
    restored.close()


async def test_permission_denied_before_activation(hass, manager):
    add(manager, "night", effects={"light.shelter": {"state": "on"}})
    with pytest.raises(HomeAssistantError, match="permission"):
        await manager.change("night", True, context=Context(user_id="missing-user"))
    assert not manager.state["active"]


async def test_remove_active_mode_returns_to_underlying(hass, manager, lights):
    add(
        manager,
        "shabbat",
        50,
        effects={"light.shelter": {"state": "on", "brightness": 80}},
    )
    add(
        manager,
        "alert",
        100,
        effects={"light.shelter": {"state": "on", "brightness": 255}},
    )
    await manager.change("shabbat", True)
    await manager.change("alert", True)
    await manager.remove("alert")
    assert hass.states.get("light.shelter").attributes["brightness"] == 80


async def test_editing_active_priority_and_effects_reconciles(hass, manager, lights):
    add(
        manager,
        "night",
        10,
        effects={"light.shelter": {"state": "on", "brightness": 30}},
    )
    add(
        manager,
        "shabbat",
        50,
        effects={"light.shelter": {"state": "on", "brightness": 80}},
    )
    await manager.change("night", True)
    await manager.change("shabbat", True)
    await manager.update(
        SimpleNamespace(
            entry_id="night",
            data={
                "name": "Night",
                "priority": 100,
                "effects": {"light.shelter": {"state": "on", "brightness": 20}},
            },
            options={},
        )
    )
    assert hass.states.get("light.shelter").attributes["brightness"] == 20
    assert set(manager.state["active"]) == {"night", "shabbat"}


async def test_failed_restore_stays_pending_until_retry(hass, manager, lights):
    add(manager, "night", effects={"light.shelter": {"state": "on"}})
    await manager.change("night", True)
    with patch.object(manager, "_send", side_effect=HomeAssistantError("Disconnected")):
        await manager.change("night", False)
    assert "light.shelter" in manager.state["baselines"]
    await manager.retry()
    assert hass.states.get("light.shelter").state == "off"
    assert not manager.state["baselines"]


async def test_service_timeout_is_reported_and_retryable(hass, manager, lights):
    add(manager, "night", effects={"light.shelter": {"state": "on"}})
    with patch.object(manager, "_send", side_effect=TimeoutError):
        await manager.change("night", True)
    assert "timed out" in manager.errors["light.shelter"]
    await manager.retry()
    assert not manager.errors
    assert hass.states.get("light.shelter").state == "on"


async def test_restart_reapplies_active_effects_after_device_state_reset(
    hass, manager, lights
):
    from copy import deepcopy

    add(
        manager,
        "shabbat",
        50,
        effects={"light.shelter": {"state": "on", "brightness": 80}},
    )
    await manager.change("shabbat", True)
    saved = deepcopy(manager.state)
    hass.states.async_set("light.shelter", "off")
    restored = ModeManager(hass)
    restored.store.async_load = AsyncMock(return_value=saved)
    restored.store.async_save = AsyncMock()
    restored.modes = manager.modes
    await restored.load()
    await restored.start()
    assert hass.states.get("light.shelter").attributes["brightness"] == 80
    assert restored.state["baselines"]["light.shelter"]["state"] == "off"
    restored.close()


async def test_group_selection_replaces_and_clears_only_that_group(manager):
    add(manager, "home", group="Presence")
    add(manager, "away", group="Presence")
    add(manager, "shabbat", group="Calendar")
    await manager.change("shabbat", True)
    await manager.select("Presence", "home")
    await manager.select("Presence", "away", duration=30)
    assert set(manager.state["active"]) == {"away", "shabbat"}
    assert manager.state["active"]["away"]["until"]
    await manager.select("Presence", "")
    assert set(manager.state["active"]) == {"shabbat"}
    manager.close()


async def test_group_membership_is_checked_before_any_state_change(manager):
    add(manager, "home", group="Presence")
    add(manager, "shabbat", group="Calendar")
    await manager.change("home", True)
    with pytest.raises(HomeAssistantError, match="does not belong"):
        await manager.select("Presence", "shabbat")
    with pytest.raises(HomeAssistantError, match="Unknown group"):
        await manager.select("Missing", "")
    assert set(manager.state["active"]) == {"home"}


async def test_independent_mode_selection_preserves_other_independent_modes(manager):
    add(manager, "night")
    add(manager, "shabbat")
    await manager.change("shabbat", True)
    await manager.select("", "night", standalone_mode_id="night")
    await manager.select("", "", standalone_mode_id="night")
    assert set(manager.state["active"]) == {"shabbat"}
