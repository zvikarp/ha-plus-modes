# Changelog

## 0.2.0 — Unreleased

- Updated the supplied brand icon and added our own theme-colored monochrome sidebar mark.
- Added reusable, persistent groups, selected through native configuration dropdowns or created in the panel. Existing group names and independent modes remain compatible.
- Replaced individual mode buttons with Group → Mode → Duration selection, group sections, and inactive chips. Added rounded controls, accessible themed dropdowns, and icon-only refresh.
- Fixed concurrent startup so all mode entries share one manager.
- Added a CI-gated manual release workflow following Plant Care, including coordinated version bumps, tagged releases, generated notes, and a clean HACS archive.

## 0.1.0 — Unreleased

- Native Home Assistant setup and configuration forms with device, icon, power, and brightness selectors.
- Overlapping household modes, deterministic priority resolution, and optional exclusive groups.
- Timed overrides, persisted active modes, and restart reconciliation.
- Guarded prior-state restoration, manual-change protection, per-device errors, and retry actions.
- Automation-friendly mode switches, status sensors, and effective numeric behavior values.
- Bundled HA-themed sidebar panel and dashboard card.
- Integration, resolver, persistence, permissions, configuration, and frontend interaction tests.
