# GoDaddy SSL Toolkit Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the "Keystore Builder" Tauri desktop app to "GoDaddy SSL Toolkit" and make the CSR/Private Key tab the default, matching actual usage while keeping the full keystore workflow and cleanup utility as first-class tabs.

**Architecture:** Two files change. `src-tauri/tauri.conf.json` holds the OS-level window title and app bundle name. `src/App.tsx` holds the in-app header, the "New Keystore" button, the confirm dialog copy, the tab bar, the tab labels, and the default `AppMode` state. No functional code changes — only strings and the initial value of one `useState`. Verification is manual via `npm run tauri:dev` (runtime checks) and `npm run tauri:build` (installer/bundle name check), because the project has no existing automated test harness and a rename provides no meaningful unit-test surface.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite. Run from `keystore-builder-tauri/` subdirectory.

**Intentionally unchanged:** Tauri bundle identifier (`com.godaddy.keystore-builder`), npm package name (`keystore-builder-tauri`), Rust crate name, internal `AppMode` enum values (`'workflow'`, `'csr-only'`, `'cleanup'`), directory names, icons. See the design spec at `docs/superpowers/specs/2026-04-29-ssl-toolkit-rename-design.md` for why.

---

## File Structure

Only two files change:

- `keystore-builder-tauri/src-tauri/tauri.conf.json` — OS window title and bundle product name
- `keystore-builder-tauri/src/App.tsx` — in-app header, button label, confirm dialog copy, tab order, one tab label, default `AppMode` value

No new files. No files deleted.

---

## Task 1: Update the Tauri native config

**Files:**
- Modify: `keystore-builder-tauri/src-tauri/tauri.conf.json` (lines 3 and 16)

- [ ] **Step 1: Update `productName`**

In `keystore-builder-tauri/src-tauri/tauri.conf.json`, change:

```json
  "productName": "Keystore Builder",
```

to:

```json
  "productName": "GoDaddy SSL Toolkit",
```

- [ ] **Step 2: Update the window title**

In the same file, change the `app.windows[0].title` field:

```json
        "title": "Keystore Builder",
```

to:

```json
        "title": "GoDaddy SSL Toolkit",
```

- [ ] **Step 3: Verify the file still parses as valid JSON**

Run from the repo root:

```bash
cd keystore-builder-tauri && node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 4: Confirm the bundle identifier is still `com.godaddy.keystore-builder`**

Run from the repo root:

```bash
grep '"identifier"' keystore-builder-tauri/src-tauri/tauri.conf.json
```

Expected output:

```
  "identifier": "com.godaddy.keystore-builder",
```

If this has changed, revert that line. The identifier must NOT change — changing it causes the upgrade to install as a separate app on teammates' machines instead of upgrading in place.

- [ ] **Step 5: Commit**

```bash
git add keystore-builder-tauri/src-tauri/tauri.conf.json
git commit -m "Rename Tauri app to GoDaddy SSL Toolkit"
```

---

## Task 2: Update `App.tsx` — header, button, confirm dialog, tab bar, default mode

**Files:**
- Modify: `keystore-builder-tauri/src/App.tsx` (five distinct regions: lines ~24, ~28, ~58, ~64, ~69–88)

- [ ] **Step 1: Change the default `AppMode`**

In `keystore-builder-tauri/src/App.tsx`, change:

```tsx
  const [mode, setMode] = useState<AppMode>('workflow');
```

to:

```tsx
  const [mode, setMode] = useState<AppMode>('csr-only');
```

- [ ] **Step 2: Update the confirm dialog copy**

In the same file, change:

```tsx
    if (confirm('Start a new keystore? This will clear all current data.')) {
```

to:

```tsx
    if (confirm('Start a new project? This will clear all current data.')) {
```

- [ ] **Step 3: Update the in-app header title**

Change:

```tsx
          <h1>Keystore Builder</h1>
```

to:

```tsx
          <h1>GoDaddy SSL Toolkit</h1>
```

- [ ] **Step 4: Update the "New Keystore" button label**

Change:

```tsx
            New Keystore
```

to:

```tsx
            New Project
```

- [ ] **Step 5: Reorder the tabs and rename "Full Workflow"**

Replace the entire `<div className="tabs">` block (currently lines ~69–88):

```tsx
      <div className="tabs">
        <button
          className={`tab ${mode === 'workflow' ? 'active' : ''}`}
          onClick={() => setMode('workflow')}
        >
          Full Workflow
        </button>
        <button
          className={`tab ${mode === 'csr-only' ? 'active' : ''}`}
          onClick={() => setMode('csr-only')}
        >
          CSR/Private Key
        </button>
        <button
          className={`tab ${mode === 'cleanup' ? 'active' : ''}`}
          onClick={() => setMode('cleanup')}
        >
          Cleanup Files
        </button>
      </div>
```

with:

```tsx
      <div className="tabs">
        <button
          className={`tab ${mode === 'csr-only' ? 'active' : ''}`}
          onClick={() => setMode('csr-only')}
        >
          CSR/Private Key
        </button>
        <button
          className={`tab ${mode === 'workflow' ? 'active' : ''}`}
          onClick={() => setMode('workflow')}
        >
          Full Keystore Workflow
        </button>
        <button
          className={`tab ${mode === 'cleanup' ? 'active' : ''}`}
          onClick={() => setMode('cleanup')}
        >
          Cleanup Files
        </button>
      </div>
```

Notes on what changed:
- CSR/Private Key button moved from second to first position
- Full Workflow button moved from first to second, and its label changed to "Full Keystore Workflow"
- Cleanup Files stays in third position, unchanged

- [ ] **Step 6: Confirm TypeScript still compiles**

Run from the repo root:

```bash
cd keystore-builder-tauri && npx tsc --noEmit
```

Expected output: no errors (exit code 0).

If this fails: re-read the edits — a stray character in a JSX attribute or a mismatched brace is the likely cause.

- [ ] **Step 7: Confirm no stray "Keystore Builder" strings remain in `App.tsx`**

Run from the repo root:

```bash
grep -n "Keystore Builder" keystore-builder-tauri/src/App.tsx || echo "clean"
```

Expected output: `clean`

- [ ] **Step 8: Commit**

```bash
git add keystore-builder-tauri/src/App.tsx
git commit -m "Rebrand header, tab order, and default mode for SSL Toolkit"
```

---

## Task 3: Runtime verification in dev mode

**Files:** none modified — this is a manual verification task.

- [ ] **Step 1: Install dependencies if needed**

From the repo root:

```bash
cd keystore-builder-tauri && npm install
```

Skip this step if `node_modules/` is already populated and `package.json` has not changed.

- [ ] **Step 2: Launch the app in dev mode**

From `keystore-builder-tauri/`:

```bash
npm run tauri:dev
```

Wait for the Tauri window to open. First run compiles the Rust side and can take several minutes.

- [ ] **Step 3: Visual verification checklist**

In the running app, confirm each item:

1. OS window title bar reads **"GoDaddy SSL Toolkit"** (not "Keystore Builder").
2. In-app header (large text at the top of the window) reads **"GoDaddy SSL Toolkit"**.
3. Top-right button reads **"New Project"** (not "New Keystore").
4. Tab bar left-to-right reads: **CSR/Private Key**, **Full Keystore Workflow**, **Cleanup Files**.
5. On launch, the **CSR/Private Key** tab is the active tab and its content is showing.
6. Clicking **Full Keystore Workflow** shows the 4-step stepper (Generate CSR → Submit to GoDaddy → Import Certificate → Create Keystore) and the Step 1 form.
7. Clicking **Cleanup Files** shows the cleanup tool.
8. Clicking **CSR/Private Key** returns to the CSR generator.
9. Clicking **"New Project"** shows a confirm dialog that reads **"Start a new project? This will clear all current data."** Clicking Cancel closes the dialog; clicking OK clears state and lands on the CSR/Private Key tab.

- [ ] **Step 4: Stop the dev process**

Ctrl+C in the terminal running `npm run tauri:dev`.

If any item in Step 3 failed, do NOT proceed to Task 4. Return to Task 1 or Task 2, locate the issue, fix it (make a new commit — do not amend), and re-run this task.

---

## Task 4: Bundle verification

**Files:** none modified — this is a manual verification task.

- [ ] **Step 1: Build the production bundle**

From `keystore-builder-tauri/`:

```bash
npm run tauri:build
```

This compiles Rust in release mode and produces an installer under `src-tauri/target/release/bundle/`. Expect this to take several minutes on first run.

- [ ] **Step 2: Verify the bundle name**

On macOS, list the produced `.app` bundle:

```bash
ls keystore-builder-tauri/src-tauri/target/release/bundle/macos/
```

Expected output contains: `GoDaddy SSL Toolkit.app`

If the output instead contains `Keystore Builder.app`, the `productName` change in Task 1 did not take effect — revisit Task 1 Step 1.

- [ ] **Step 3: (Optional) Open the built app and spot-check**

```bash
open "keystore-builder-tauri/src-tauri/target/release/bundle/macos/GoDaddy SSL Toolkit.app"
```

Confirm the same visual checklist from Task 3 Step 3. No new commit — the build artifacts are gitignored.

---

## Self-review

Spec coverage check (items from `docs/superpowers/specs/2026-04-29-ssl-toolkit-rename-design.md`):

| Spec item | Implementing task |
|---|---|
| Header title → "GoDaddy SSL Toolkit" | Task 2 Step 3 |
| "New Keystore" button → "New Project" | Task 2 Step 4 |
| Confirm dialog copy | Task 2 Step 2 |
| Tab order CSR → Workflow → Cleanup | Task 2 Step 5 |
| "Full Workflow" label → "Full Keystore Workflow" | Task 2 Step 5 |
| Default tab = `csr-only` | Task 2 Step 1 |
| OS window title | Task 1 Step 2 |
| `productName` | Task 1 Step 1 |
| Bundle identifier unchanged | Task 1 Step 4 |
| Dev-mode verification (spec's 8 test steps) | Task 3 Step 3 |
| Build verification | Task 4 |

All spec items covered. No placeholders, no "TBD" or "handle edge cases" language. Method names and property names match between tasks.
