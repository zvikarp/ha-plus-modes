"""Authenticated overview API, bundled panel, and dashboard card."""

from pathlib import Path

import voluptuous as vol
from homeassistant.components import frontend, websocket_api
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig

from .const import DOMAIN, SIGNAL
from .groups import async_get_groups

PATH = "/modes_plus/modes-plus.js"


@websocket_api.websocket_command({vol.Required("type"): "modes_plus/snapshot"})
@websocket_api.async_response
async def snapshot(hass, connection, msg):
    manager = hass.data.get(DOMAIN)
    if manager is None:
        connection.send_error(msg["id"], "not_loaded", "HA+ Modes is not loaded")
        return
    # Check entity read access before exposing device settings to restricted users.
    from homeassistant.auth.permissions.const import POLICY_READ

    data = manager.snapshot()
    permitted = connection.user.permissions.check_entity
    data["effects"] = {
        key: value
        for key, value in data["effects"].items()
        if permitted(key, POLICY_READ)
    }
    data["errors"] = {
        key: value
        for key, value in data["errors"].items()
        if permitted(key, POLICY_READ)
    }
    for mode in data["modes"]:
        mode["effects"] = {
            key: value
            for key, value in mode["effects"].items()
            if permitted(key, POLICY_READ)
        }
    connection.send_result(msg["id"], data)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "modes_plus/create_group",
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=80)),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def create_group(hass, connection, msg):
    manager = hass.data.get(DOMAIN)
    if manager is None:
        connection.send_error(msg["id"], "not_loaded", "HA+ Modes is not loaded")
        return
    try:
        manager.groups = await async_get_groups(hass)
        name = await manager.groups.create(msg["name"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_group", str(err))
        return
    from homeassistant.helpers.dispatcher import async_dispatcher_send

    async_dispatcher_send(hass, SIGNAL)
    connection.send_result(msg["id"], {"name": name})


async def async_register_frontend(hass, manager):
    from homeassistant.loader import async_get_integration

    integration = await async_get_integration(hass, DOMAIN)
    url = f"{PATH}?v={integration.version}"
    if not hass.data.get("modes_plus_frontend_registered"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    "/modes_plus/icon.png",
                    str(Path(__file__).parent / "brand/icon.png"),
                    cache_headers=False,
                ),
                StaticPathConfig(
                    "/modes_plus/modes-plus.js",
                    str(Path(__file__).parent / "frontend" / "modes-plus.js"),
                    cache_headers=False,
                ),
            ]
        )
        add_extra_js_url(hass, url)
        websocket_api.async_register_command(hass, snapshot)
        websocket_api.async_register_command(hass, create_group)
        hass.data["modes_plus_frontend_registered"] = True
    from homeassistant.components.panel_custom import async_register_panel

    await async_register_panel(
        hass,
        webcomponent_name="modes-plus-panel",
        frontend_url_path="ha-plus-modes",
        sidebar_title="HA+ Modes",
        sidebar_icon="modes-plus:logo",
        module_url=url,
        require_admin=False,
        config={},
    )


def async_unregister_frontend(hass):
    frontend.async_remove_panel(hass, "ha-plus-modes")
