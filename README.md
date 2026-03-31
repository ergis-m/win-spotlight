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
- **Frontend:** TypeScript + Vite (vanilla, no framework)
- **Search:** fuzzy-matcher (Skim algorithm)
- **Icons:** Zero-dependency PNG encoder with Windows Shell API extraction
