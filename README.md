# HA+ Modes

<img src="./custom_components/modes_plus/brand/icon.png" alt="HA+ Modes" width="140">

Local household modes for Home Assistant: Shabbat, Night, Guests, Away, and temporary emergency overrides. Uses Home Assistant's native setup forms, theme, sidebar, entities, and automations.

## Install

### HACS custom repository

1. In HACS, open **Custom repositories** and add `https://github.com/zvikarp/ha-plus-modes` with the **Integration** type.
2. Install **HA+ Modes** and restart Home Assistant.
3. Open **Settings → Devices & services → Add integration → HA+ Modes**.

This is a custom repository installation; the integration is not yet listed in the default HACS catalog.

### Manual installation

1. Copy `custom_components/modes_plus` into your Home Assistant configuration's `custom_components` directory.
2. Restart Home Assistant (2025.1 or later).
3. Open **Settings → Devices & services → Add integration → HA+ Modes**.
4. Name the mode and set its priority. Select an existing **Group**, choose **Create a new group…**, or choose **Independent mode** to preserve an ungrouped mode. Home and Away belong to the same group, such as Presence; Shabbat and Missile Alert belong to different groups so they can overlap.
5. Use **Add or replace a light or switch**, choose the entity, power state, and optional brightness. Repeat for each device, then choose **Save mode**.
6. Open **HA+ Modes** in the sidebar. Choose **Group → Mode → Duration**, then **Apply**. Choose **None · normal behavior** to clear that group. Add further modes through Devices & services; use each entry's **Configure** action to edit it. You can also create groups directly in the panel.

No cloud account, container, separate backend, or YAML is needed to create modes. Schedules and external alert sources remain normal Home Assistant automations.

## Your household

| Group | Mode | Priority | Example |
| --- | --- | ---: | --- |
| Presence | Home / Away | 10 | One presence setting at a time |
| Daily rhythm | Day / Night | 10 | Night sets hallway lighting to 10% and `bedroom_brightness` to 15 |
| Calendar | Shabbat | 50 | Your explicitly selected Shabbat lighting and switches |
| Safety | Missile Alert | 100 | Shelter lighting on at full brightness |

**Within a group, selecting a mode replaces its previous selection. Across groups, modes stay active underneath higher-priority modes.** Put Shabbat and Missile Alert in different groups to get automatic return to Shabbat after the alert. Ending Missile Alert immediately reevaluates the settings of the modes still active. If Night ended during the alert, it does not come back. Same-priority conflicts use the stable mode ID as a deterministic tie breaker; use different priorities when order matters.

**Device ownership is per entity:** the highest-priority mode mentioning a light or switch owns that device's complete configured effect. Unspecified devices remain controlled by other modes. Behavior values resolve independently per key. Brightness 0 in the form means “unspecified,” not “off.”

## Activate from automations

Every mode has an **Active** switch and a **Status** sensor grouped under its device. Use standard **Switch: Turn on/off** actions with these entities. Trigger the Shabbat switch from your existing Shabbat-time automation; trigger Missile Alert from your existing alert automation. The integration neither detects alerts nor calculates religious times.

For timed activation, use the **HA+ Modes: Activate mode** action. Copy `mode_id` from the switch or status sensor's attributes:

```yaml
action: modes_plus.activate
data:
  mode_id: YOUR_MODE_ID
  duration: 120  # minutes; omit or use 0 for indefinite activation
```

Repeated activation refreshes the timer. `modes_plus.deactivate` ends a mode. `modes_plus.retry` retries failed device commands. Acknowledging an alert should be a separate automation action from ending its mode.

## Night button behavior

Add a behavior value named `bedroom_brightness` with value 15 to Night. Behavior values are numbers from 0 to 100 and are exposed in the `effective_values` attribute of every mode status sensor. Connect the button's existing automation once:

```yaml
action: light.turn_on
target:
  entity_id: light.bedroom
data:
  brightness_pct: >-
    {{ (state_attr('sensor.night_status', 'effective_values') or {})
       .get('bedroom_brightness', 100) }}
```

Use the actual status sensor entity ID from your installation. The default here is 100 when no active mode owns that behavior. Creating a behavior value does not automatically rewrite your button automations.

For other actions, trigger normal HA automations on mode switches. Arbitrary scripts are intentionally not treated as reversible effects; their device writes do not participate in priority resolution.

## Dashboard

The card is registered automatically, like HA+ Plant Care. Find **HA+ Modes** in the card picker, or add a manual card:

```yaml
type: custom:modes-plus-card
title: Home modes
# Optional: include the groups containing these mode IDs
# modes:
#   - YOUR_MODE_ID
```

The sidebar and card connect each group heading to its current mode and show alternative modes as inactive chips. The selection controls use themed, keyboard-operable dropdowns; buttons are rounded and refresh is an icon-only button with an accessible label. The sidebar icon is our own monochrome vector logo, colored by HA's active/inactive theme states.

The panel also shows activation sources, expiration times, overridden settings, effective settings, device errors with retry, and the last 30 requested changes. A card filtered by mode IDs includes the whole matching group so it cannot hide that group's actual active mode.

### Existing installations

Existing free-text group names are adopted automatically into the dropdown. Ungrouped modes remain independent, each with its own selection scope; their identities, switches, active states, deadlines, and device baselines are preserved. The existing `activate`, `deactivate`, and switch actions remain compatible with automations. No config-entry version migration or destructive rewrite is required; group names are stored separately in HA storage. Rolling back leaves original mode entries readable; newly created empty groups remain in their separate storage file and are ignored by older versions.

## State, manual changes, and failures

- Active modes, expiration times, prior device states, and command ownership persist in Home Assistant storage. Startup waits for HA to finish loading before reconciling devices. Expired temporary modes are removed before applying settings.
- Device commands are serialized. Intent is saved before commands; failures are shown rather than reported as successful device actions. Other devices continue processing.
- Unchanged winning effects are not resent. A manual device change is respected until the winning effect changes or Home Assistant restarts. Active modes reapply their settings at startup.
- When no mode controls a device, its captured prior state is restored **only if its current HA command context still matches the integration's last command**. Later manual or external changes are left alone. Integrations that discard command contexts cause conservative non-restoration.
- This is transition-based control, not continuous enforcement. Device state updates do not cause modes to fight manual controls. Use **Retry device actions** when an unavailable device comes back.
- Timers use persisted absolute deadlines. A timer ending during downtime is handled at startup. Removing or disabling an active mode ends it and reveals remaining modes.
- A mode cannot target another mode switch. Use groups for mutual exclusion and HA automations for activation logic.
- User-initiated device actions check entity control permissions. Configuration uses HA's administrator-only config flows.
- Service completion establishes that HA accepted a device command, not physical confirmation from the device. Alert-source reliability remains the responsibility of the existing alert integration and automations.

## Development

Use Python 3.13 and the Home Assistant 2025.1.3 test harness:

```sh
python3.13 -m venv .venv
.venv/bin/pip install --no-deps homeassistant==2025.1.3 pytest-homeassistant-custom-component==0.13.204
.venv/bin/pip install -c .venv/lib/python3.13/site-packages/homeassistant/package_constraints.txt '.[test]'
.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/pytest
node --check custom_components/modes_plus/frontend/modes-plus.js
npm ci --ignore-scripts
npm test
```

Tests cover overlapping Shabbat/Night/alert modes, stable ties, manual changes, exclusive groups, timers, restart recovery, service failures, permissions, removal, native forms, and setup/unload behavior.

## Releases

Like Plant Care, releases are manually selected through **Actions → Release → Run workflow** on `main`. Choose patch, minor, or major. If the source version is already ahead of the latest stable release, that prepared version is released first; otherwise both the manifest and project versions are bumped together.

The release workflow first runs the same CI checks as pull requests, then commits any version bump, creates the tag and GitHub Release with generated notes, and attaches `modes_plus.zip`. The archive contains the integration files at its root and excludes Python caches. The frontend resource URL follows the manifest version automatically. Publishing a release manually also runs CI and attaches the archive from that release's tag; a mismatched tag/version is rejected.

Install the release archive by extracting its contents into `custom_components/modes_plus`. Source-based HACS custom-repository installation remains available. No release is published merely by opening or merging a pull request; run the manual workflow when ready.

## Shared UI development

Edit `src/modes-plus.js` and run `npm ci` followed by `npm run build`
from the repository root. Commit the generated frontend file with its source.
The integration bundles a pinned release of
[`@ha-plus/ui`](https://github.com/zvikarp/ha-plus-packages) so HACS installs
remain self-contained. `npm run check:build` detects generated-file drift.

Upgrade the UI dependency by installing a versioned tarball asset from the
packages repository's releases, rebuilding and running the frontend tests.
Commit `package.json`, `package-lock.json` and the rebuilt frontend together.
