"""Group creation and nondestructive adoption of existing mode definitions."""

from unittest.mock import AsyncMock

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.modes_plus.groups import GroupRegistry, async_get_groups


async def test_legacy_group_names_are_adopted_without_changing_entries(hass):
    entry = MockConfigEntry(
        domain="modes_plus",
        title="Home",
        data={"name": "Home", "priority": 10, "group": "Presence"},
    )
    entry.add_to_hass(hass)
    groups = await async_get_groups(hass)
    assert groups.names == {"Presence"}
    assert dict(entry.data) == {"name": "Home", "priority": 10, "group": "Presence"}
    assert not entry.options


async def test_empty_groups_persist_and_duplicate_creation_is_idempotent(hass):
    registry = await async_get_groups(hass)
    assert await registry.create(" Daily rhythm ") == "Daily rhythm"
    assert await registry.create("daily RHYTHM") == "Daily rhythm"
    reloaded = GroupRegistry(hass)
    await reloaded.load()
    assert reloaded.names == {"Daily rhythm"}


async def test_failed_save_does_not_leave_a_phantom_group(hass):
    registry = await async_get_groups(hass)
    registry.store.async_save = AsyncMock(side_effect=OSError("Disk full"))
    with pytest.raises(OSError):
        await registry.create("Presence")
    assert not registry.names


@pytest.mark.parametrize("name", ["", "  ", "x" * 81])
async def test_group_name_validation(hass, name):
    registry = await async_get_groups(hass)
    with pytest.raises(ValueError):
        await registry.create(name)
