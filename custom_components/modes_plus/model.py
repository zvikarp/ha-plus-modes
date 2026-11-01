"""Validated mode definitions and deterministic priority resolution."""

import re
from math import isfinite


def validate(data):
    """Reject ambiguous effects and unsafe arbitrary service execution."""
    if not isinstance(data.get("name"), str) or not data["name"].strip():
        raise ValueError("A name is required")
    priority = data.get("priority", 0)
    if (
        isinstance(priority, bool)
        or not isinstance(priority, (int, float))
        or not isfinite(priority)
    ):
        raise ValueError("Priority must be a finite number")
    if not isinstance(data.get("group", ""), str):
        raise ValueError("Group must be text")
    icon = data.get("icon", "mdi:home-switch")
    if not isinstance(icon, str) or not re.fullmatch(r"mdi:[a-z0-9-]+", icon):
        raise ValueError("Choose a Material Design icon")
    effects = data.get("effects", {})
    if not isinstance(effects, dict):
        raise ValueError("Effects must be an object")
    for entity_id, effect in effects.items():
        if (
            not isinstance(entity_id, str)
            or entity_id.split(".")[0] not in ("light", "switch")
            or not re.fullmatch(r"(?:light|switch)\.[a-z0-9_]+", entity_id)
        ):
            raise ValueError("Effects require light or switch entity IDs")
        if (
            not isinstance(effect, dict)
            or set(effect) - {"state", "brightness"}
            or effect.get("state") not in ("on", "off")
        ):
            raise ValueError("Each effect requires state: on or off")
        if "brightness" in effect:
            value = effect["brightness"]
            if (
                not entity_id.startswith("light.")
                or effect["state"] != "on"
                or isinstance(value, bool)
                or not isinstance(value, int)
                or not 1 <= value <= 255
            ):
                raise ValueError(
                    "Brightness requires a light turned on and an integer from 1 to 255"
                )
    values = data.get("values", {})
    if not isinstance(values, dict) or any(
        not isinstance(k, str)
        or not k
        or not isinstance(v, (str, int, float, bool))
        or isinstance(v, float)
        and not isfinite(v)
        for k, v in values.items()
    ):
        raise ValueError("Behavior values must have text keys and finite scalar values")
    return {
        **data,
        "effects": effects,
        "values": values,
        "group": data.get("group", "").strip(),
        "priority": priority,
        "icon": icon,
    }


def resolve(modes, active):
    """Higher priority wins; stable mode ID breaks ties, independent of timing."""
    effects, values = {}, {}
    for mode_id in sorted(
        (key for key in active if key in modes),
        key=lambda key: (modes[key]["priority"], key),
    ):
        mode = modes[mode_id]
        for entity_id, effect in mode["effects"].items():
            effects[entity_id] = {"mode_id": mode_id, "desired": effect}
        for key, value in mode["values"].items():
            values[key] = {"mode_id": mode_id, "value": value}
    return effects, values
