# GoDaddy SSL Toolkit Rename & Reorient Design

**Date:** 2026-04-29
**Status:** Approved

## Background

The Tauri desktop app currently titled "Keystore Builder" has three tabs:

1. **Full Workflow** (default) — 4-step CSR → submission → certificate import → keystore creation
2. **CSR/Private Key** — standalone CSR and private key generation
3. **Cleanup Files** — file cleanup utility

In practice, usage has shifted: the CSR/Private Key tab is now used roughly 70–80% of the time, with the full keystore workflow used regularly but less often. The app name "Keystore Builder" under-represents what the tool is actually used for, and the default tab no longer matches typical usage.

## Goal

Rename the app to **"GoDaddy SSL Toolkit"** and reorient the UI around CSR/Private Key generation as the primary tool, while keeping the keystore workflow and cleanup utility as first-class tabs.

## User-visible changes

| Item | Location | Before | After |
|---|---|---|---|
| Header title | `src/App.tsx` | Keystore Builder | GoDaddy SSL Toolkit |
| "New Keystore" button label | `src/App.tsx` | New Keystore | New Project |
| Confirm dialog text | `src/App.tsx` `handleNewProject` | "Start a new keystore? This will clear all current data." | "Start a new project? This will clear all current data." |
| Tab order | `src/App.tsx` | Full Workflow · CSR/Private Key · Cleanup Files | CSR/Private Key · Full Keystore Workflow · Cleanup Files |
| "Full Workflow" tab label | `src/App.tsx` | Full Workflow | Full Keystore Workflow |
| Default tab on launch | `src/App.tsx` `useState<AppMode>('workflow')` | `workflow` | `csr-only` |
| OS window title | `src-tauri/tauri.conf.json` `app.windows[0].title` | Keystore Builder | GoDaddy SSL Toolkit |
| App bundle product name | `src-tauri/tauri.conf.json` `productName` | Keystore Builder | GoDaddy SSL Toolkit |

## Intentionally NOT changed

- **Bundle identifier** (`com.godaddy.keystore-builder` in `tauri.conf.json`): keep as-is. Changing it would cause the renamed version to install as a separate app on teammates' machines rather than upgrade in place, losing settings and creating duplicate icons.
- **Internal package name** (`keystore-builder-tauri` in `package.json`): keep. Dev-facing only, no user benefit from renaming.
- **Rust crate / Cargo package name**: keep. Same reasoning.
- **Directory names** (`keystore-creator/keystore-builder-tauri`): keep. Same reasoning.
- **Icons and resources**: keep existing icons. Rebrand icon work is a separate effort.
- **Tab component internal names** (`workflow`, `csr-only`, `cleanup` as `AppMode` values): keep. Dev-facing only; renaming would cascade through types and hooks without user-visible benefit.

## Out of scope

- Teammate communication about the rename. The user will handle this separately.
- Icon redesign.
- Any functional changes to the three tabs — this is purely a rename and reorder.

## Testing

1. Run `npm run tauri:dev` from `keystore-builder-tauri/`.
2. Confirm the OS window title bar shows "GoDaddy SSL Toolkit".
3. Confirm the in-app header shows "GoDaddy SSL Toolkit".
4. Confirm the **CSR/Private Key** tab is active on launch.
5. Confirm tab order left-to-right: CSR/Private Key · Full Keystore Workflow · Cleanup Files.
6. Click each tab — confirm each loads without regression.
7. Click "New Project" button — confirm the confirm dialog shows "Start a new project? …" and that accepting resets state and returns to the CSR/Private Key tab.
8. Run `npm run tauri:build` and confirm the resulting installer / `.app` bundle is named "GoDaddy SSL Toolkit".

## Risks

- **Teammates not finding the app after upgrade**: mitigated by keeping the bundle identifier unchanged — the app upgrades in place under the new display name.
- **The rename is a one-way door for in-flight work**: low risk because the only state in the app is transient per-project state that isn't persisted across installs.
