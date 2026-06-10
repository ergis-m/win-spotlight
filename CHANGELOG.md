# Changelog

All notable changes to Win Spotlight are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Add entries to the `[Unreleased]` section as you work. When you run
`scripts/release.ps1` (or `release.sh`), that section is stamped with the new
version and date, and its contents become the GitHub Release notes.

## [Unreleased]

### Added

### Changed

- The launcher window now sizes itself to its content: with an empty input it shows just the search bar (or your widgets, if configured), and springs open to fit results as you type.
- Bigger search bar: taller input with larger text and icon, scaled per launcher size (compact / normal / fancy).

### Fixed

## [0.5.0] - 2026-06-10

### Added

- Animated focus ring that glides between search results as you move the selection.
- Dark Mode widget: a 1×1 tile that toggles Windows between light and dark theme (the system theme, not just the app).
- Setting to show or hide open browser tabs as individual search results (General settings). When off, the browser window is shown instead.

### Changed
- Rebuilt state and data-flow for the launcher to use a single, reactive store for all state.
- Simplified search to two tabs: Apps (apps, windows, browser tabs, games, and smart answers) and Files — replacing the previous All, Apps, Files, and Media tabs.
- Faster searching: results arrive without icon data, and app icons are loaded on demand and cached for the session.

### Fixed

- Typing no longer briefly freezes the launcher on the Files tab — searching the file index and loading thumbnails now run in the background instead of on the UI thread.

## [0.4.3] - 2026-05-29

### Added

- Weather widget: current conditions, temperature, and an hourly forecast, with a selectable temperature unit (automatic, °C, or °F).
- Combined System widget showing live CPU and memory usage on a shared chart, plus uptime, memory, and CPU-core details.
- Clock widget options for a 12- or 24-hour format and an optional seconds display.
- Redesigned Widgets settings as an interactive board — drag to reorder with snap-to-grid, resize from a corner handle, add or remove widgets, and configure each one.

### Changed

- Larger launcher window across all size presets, so it's more comfortable on high-resolution displays.
- The Settings window now opens larger (twice its previous size), capped at 80% of the current monitor and centered on it.
- Refreshed widget styling: translucent glass tiles, smooth gradients, glowing values, and gradient-filled charts.
- Consolidated the separate CPU, Memory, and Uptime widgets into the single System widget.

### Fixed

- Weather no longer fails with "Weather unavailable" when a geolocation provider is rate-limited — it now falls back across multiple providers and caches the resolved location.

## [0.4.2] - 2026-05-26

### Added

- Resource widgets (CPU, memory, uptime, drives) for the home area.

### Fixed

- Dependency and version fixes.

## [0.4.0] - 2026-05-23

### Added

- Widget area with composable, configurable widgets.

## [0.3.2] - 2026-04-17

### Changed

- Better handling and visibility of the selected result.
- Improved focus management.

## [0.3.1] - 2026-04-16

### Changed

- More contrast and a more compact result layout.
- Removed network checks for better performance.

## [0.3.0] - 2026-04-14

### Added

- "Update available" badge.

### Changed

- Moved state management to Zustand and reworked composition.
- Removed onboarding flow; performance optimizations.

## [0.2.17] - 2026-04-13

### Added

- Steam games and Chrome tabs in search results.

### Changed

- Pin and drag support; settings UI revamp; minimal styling pass.

### Fixed

- Autorun fix.
- Added missing "game" kind to the `SearchResult` union type.

## [0.2.0] - 2026-04-01

### Added

- File search and indexing.
- Taskbar actions.
- Thumbnails and hints.
- Onboarding and settings remake.
- Networking utilities.

## [0.1.0] - 2026-03-31

### Added

- Initial release: React + shadcn UI, calculator, and commands.

[Unreleased]: https://github.com/ergis-m/win-spotlight/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/ergis-m/win-spotlight/compare/v0.4.3...v0.5.0
[0.4.3]: https://github.com/ergis-m/win-spotlight/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/ergis-m/win-spotlight/compare/v0.4.0...v0.4.2
[0.4.0]: https://github.com/ergis-m/win-spotlight/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/ergis-m/win-spotlight/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/ergis-m/win-spotlight/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/ergis-m/win-spotlight/compare/v0.2.17...v0.3.0
[0.2.17]: https://github.com/ergis-m/win-spotlight/compare/v0.2.0...v0.2.17
[0.2.0]: https://github.com/ergis-m/win-spotlight/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ergis-m/win-spotlight/releases/tag/v0.1.0
