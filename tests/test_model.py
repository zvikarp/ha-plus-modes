"""Prove precedence and trust-boundary validation without device side effects."""

import pytest

from custom_components.modes_plus.model import resolve, validate


def mode(name, priority, **kwargs):
    return validate({"name": name, "priority": priority, **kwargs})


def test_alert_returns_to_current_underlying_modes():
    modes = {
        "shabbat": mode(
            "Shabbat", 50, effects={"light.shelter": {"state": "on", "brightness": 80}}
        ),
        "night": mode("Night", 10, values={"bedroom_brightness": 15}),
        "alert": mode(
            "Missile Alert",
            100,
            effects={"light.shelter": {"state": "on", "brightness": 255}},
        ),
    }
    active = dict.fromkeys(modes)
    effects, values = resolve(modes, active)
    assert effects["light.shelter"]["mode_id"] == "alert"
    assert values["bedroom_brightness"]["value"] == 15
    active.pop("night")
    active.pop("alert")
    effects, values = resolve(modes, active)
    assert effects["light.shelter"]["mode_id"] == "shabbat"
    assert not values  # No stale Night snapshot.


def test_ties_are_stable_independent_of_activation_order():
    modes = {key: mode(key, 10, values={"brightness": key}) for key in ("a", "b")}
    assert resolve(modes, {"b": {}, "a": {}}) == resolve(modes, {"a": {}, "b": {}})
    assert resolve(modes, modes)[1]["brightness"]["value"] == "b"


@pytest.mark.parametrize(
    "data",
    [
        {"effects": {"lock.front": {"state": "off"}}},
        {"effects": {"light.hall": {"state": "on", "brightness": 256}}},
        {"effects": {"light.hall": {"state": "off", "brightness": 30}}},
        {"effects": {"switch.fan": {"state": "on", "brightness": 30}}},
        {"effects": {"light.hall": {"state": "on", "service": "lock.unlock"}}},
        {"effects": []},
        {"values": {"key": []}},
        {"values": {"key": float("nan")}},
        {"priority": float("inf")},
        {"name": " "},
        {"group": []},
    ],
)
def test_invalid_definitions_are_rejected(data):
    with pytest.raises(ValueError):
        validate({"name": "Test", "priority": 10, **data})
