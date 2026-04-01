# Win Spotlight

A fast, Raycast-style launcher for Windows. Press **Alt+Space** to open a floating search bar, find apps instantly, and switch between running windows.

![WinApp screenshot](screenshot.png)

## Features

- **Global hotkey** (Alt+Space) to toggle the launcher
- **Fuzzy search** across all installed apps (Start Menu, Desktop, UWP/Store apps)
- **Running windows** shown with a green badge — select to switch focus
- **Usage tracking** — frequently launched apps rise to the top
- **Real app icons** extracted via the Windows Shell API
- **Acrylic blur** background with rounded corners on Windows 11
- **Instant answers** — calculator, unit/currency conversion, color preview, date math, timezone conversion, and percentage helpers directly in the search bar
- **Regional settings** — auto-detected locale with manual overrides for timezone and currency

## Instant Answers

Type directly into the search bar to get instant results — no need to open a separate app.

### Calculator

Basic arithmetic with support for parentheses, exponentiation, and modulo.

| Query | Result |
|---|---|
| `10/3` | 3.333333333 |
| `(2+3)*4` | 20 |
| `2^8` | 256 |
| `17 % 5` | 2 |

### Percentage

| Query | Result |
|---|---|
| `20% of 150` | 30 |
| `what % is 30 of 200` | 15% |
| `100 + 15%` | 115 |
| `100 - 15%` | 85 |

### Unit Conversion

Supports length, weight, temperature, volume, speed, data, time, and area. Use `in` or `to` between units.

| Query | Result |
|---|---|
| `10kg in lbs` | 22.046226 lb |
| `100f to c` | 37.777778 c |
| `5 miles in km` | 8.04672 km |
| `1tb to gb` | 1,024 gb |
| `2 hours in minutes` | 120 min |

### Currency Conversion

Live rates from [open.er-api.com](https://open.er-api.com) (160+ currencies, updated daily). Results are cached for 1 hour.

| Query | Result |
|---|---|
| `100 USD to EUR` | Single conversion |
| `100 USD` | Top conversions (EUR, GBP, JPY, CAD, AUD, CHF, CNY) |
| `50 pounds to yen` | Aliases work (pound, dollar, euro, etc.) |
| `100 ALL to USD` | All supported currencies including ALL (Albanian Lek) |

Your local currency (auto-detected from system locale) is included in the top conversions list.

### Color Preview

Type a color in any format to see a swatch and all conversions. Each format is shown as a separate row so you can copy the one you need.

| Query | Formats shown |
|---|---|
| `#ff5733` | HEX, RGB, HSL, OKLCH |
| `rgb(255, 87, 51)` | HEX, RGB, HSL, OKLCH |
| `hsl(11, 100%, 60%)` | HEX, RGB, HSL, OKLCH |
| `oklch(63.28% 0.1893 41.09)` | HEX, RGB, HSL, OKLCH |

### Date & Time Math

| Query | Result |
|---|---|
| `today + 30 days` | Future date |
| `today - 2 weeks` | Past date |
| `days until Dec 25` | Number of days |
| `days since Jan 1` | Number of days |
| `days between Jan 1 and Mar 15` | Number of days |

### Timezone Conversion

| Query | Result |
|---|---|
| `now in Tokyo` | Current time in Tokyo |
| `3pm EST in JST` | Converted time |
| `10:30 UTC to PST` | Converted time |

Supports abbreviations (EST, PST, JST, UTC, etc.) and city names (Tokyo, London, New York, etc.). Your local time is shown as context in the label.

## Settings

Open settings via the gear icon in the launcher footer.

- **General** — Theme (system/light/dark), launch at login, activation shortcut
- **Regional** — Override auto-detected timezone and currency (defaults follow your OS locale)
- **About** — Version info

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+
- [Rust](https://rustup.rs/) stable

## Getting started

```bash
pnpm install
pnpm tauri dev
```

## Building for production

```bash
pnpm tauri build
```

Installers (MSI and NSIS) are output to `src-tauri/target/release/bundle/`.

## Tech stack

- **Backend:** Rust + Tauri 2
- **Frontend:** React + TypeScript + Vite + shadcn/ui
- **Search:** fuzzy-matcher (Skim algorithm)
- **Icons:** Zero-dependency PNG encoder with Windows Shell API extraction
