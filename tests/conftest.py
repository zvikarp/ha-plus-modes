"""Home Assistant integration fixtures."""

import pytest

pytest_plugins = "pytest_homeassistant_custom_component"


@pytest.fixture(autouse=True)
def custom_integrations(enable_custom_integrations):
    return None
