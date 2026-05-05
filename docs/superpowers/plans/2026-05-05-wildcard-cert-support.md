# Wildcard Certificate Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow leading-wildcard domains (`*.example.com`) through the entire CSR → Import → Keystore flow without breaking non-wildcard behavior.

**Architecture:** Rust owns validation and filename derivation. The validator accepts a `*.` prefix; a single helper `filename_for(domain)` rewrites `*.` → `_.` and is used wherever Rust writes files. The CSR subject still uses the raw domain so CN stays `*.example.com`. The frontend mirrors the same transform in a shared helper (`filenameSafe`) for UI text and for the file paths it stores on the project.

**Tech Stack:** Rust (Tauri backend), TypeScript/React (frontend), OpenSSL + keytool (external binaries).

**Spec:** `docs/superpowers/specs/2026-05-05-wildcard-cert-support-design.md`

**Working directory for all commands:** `keystore-builder-tauri/` unless noted otherwise. Paths below are relative to the repo root.

---

## Task 1: Rust validator — TDD

**Files:**
- Modify: `keystore-builder-tauri/src-tauri/src/lib.rs` (add helper `is_valid_domain` and a `#[cfg(test)] mod tests` block)

- [ ] **Step 1: Add the failing test module**

Append this to the bottom of `keystore-builder-tauri/src-tauri/src/lib.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_plain_domain() {
        assert!(is_valid_domain("example.com"));
        assert!(is_valid_domain("www.example.com"));
        assert!(is_valid_domain("a-b.c-d.example.com"));
    }

    #[test]
    fn accepts_leading_wildcard() {
        assert!(is_valid_domain("*.example.com"));
        assert!(is_valid_domain("*.foo.example.com"));
    }

    #[test]
    fn rejects_bad_wildcards() {
        assert!(!is_valid_domain("*"));
        assert!(!is_valid_domain("*."));
        assert!(!is_valid_domain("*foo.com"));
        assert!(!is_valid_domain("foo.*.com"));
        assert!(!is_valid_domain("**.com"));
    }

    #[test]
    fn rejects_malformed() {
        assert!(!is_valid_domain(""));
        assert!(!is_valid_domain("localhost"));
        assert!(!is_valid_domain("*.localhost"));
        assert!(!is_valid_domain(".example.com"));
        assert!(!is_valid_domain("example.com."));
        assert!(!is_valid_domain("..com"));
        assert!(!is_valid_domain("foo bar.com"));
        assert!(!is_valid_domain("foo/bar.com"));
    }
}
```

- [ ] **Step 2: Run the tests, verify they fail**

Run from the repo root:

```bash
cd keystore-builder-tauri/src-tauri && cargo test
```

Expected: compile error — `cannot find function is_valid_domain in this scope`.

- [ ] **Step 3: Implement `is_valid_domain`**

Add this helper near the top of `keystore-builder-tauri/src-tauri/src/lib.rs`, just below the existing `validate_directory_path` function (around line 48):

```rust
// Validate a hostname, optionally with a single leading `*.` wildcard label.
fn is_valid_domain(domain: &str) -> bool {
    let host = domain.strip_prefix("*.").unwrap_or(domain);

    if host.is_empty() || host.starts_with('.') || host.ends_with('.') {
        return false;
    }
    if !host.contains('.') {
        return false;
    }
    host.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-')
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
cd keystore-builder-tauri/src-tauri && cargo test
```

Expected: `test result: ok. 4 passed; 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add keystore-builder-tauri/src-tauri/src/lib.rs
git commit -m "Add is_valid_domain helper with wildcard support"
```

---

## Task 2: Rust filename helper — TDD

**Files:**
- Modify: `keystore-builder-tauri/src-tauri/src/lib.rs` (add helper `filename_for` and tests)

- [ ] **Step 1: Add the failing tests**

Inside the existing `#[cfg(test)] mod tests` block from Task 1, add:

```rust
    #[test]
    fn filename_for_plain_domain_unchanged() {
        assert_eq!(filename_for("example.com"), "example.com");
        assert_eq!(filename_for("www.example.com"), "www.example.com");
    }

    #[test]
    fn filename_for_wildcard_rewrites_leading_star() {
        assert_eq!(filename_for("*.example.com"), "_.example.com");
        assert_eq!(filename_for("*.foo.example.com"), "_.foo.example.com");
    }

    #[test]
    fn filename_for_only_rewrites_leading_star() {
        // Defense-in-depth: non-leading `*` is rejected by validator, but
        // the transform itself must never touch anything past the first label.
        assert_eq!(filename_for("foo.*.com"), "foo.*.com");
    }
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
cd keystore-builder-tauri/src-tauri && cargo test
```

Expected: compile error — `cannot find function filename_for in this scope`.

- [ ] **Step 3: Implement `filename_for`**

Add immediately below `is_valid_domain` in `keystore-builder-tauri/src-tauri/src/lib.rs`:

```rust
// Derive a filesystem-friendly name from a domain. Leading `*.` becomes `_.`
// so shells and Java tooling don't choke on the asterisk.
fn filename_for(domain: &str) -> String {
    domain.replacen("*.", "_.", 1)
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
cd keystore-builder-tauri/src-tauri && cargo test
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add keystore-builder-tauri/src-tauri/src/lib.rs
git commit -m "Add filename_for helper for wildcard-safe paths"
```

---

## Task 3: Wire helpers into `generate_csr`

**Files:**
- Modify: `keystore-builder-tauri/src-tauri/src/lib.rs` (function `generate_csr`, currently around lines 96–140)

- [ ] **Step 1: Replace the inline validation and filename construction**

Locate the `generate_csr` function. Replace its body's validation block and the two `format!` file-path lines. The current code looks like:

```rust
#[tauri::command]
fn generate_csr(domain: String, output_dir: String) -> CommandResult {
    // Validate domain (basic validation)
    if !domain.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-') {
        return CommandResult {
            success: false,
            stdout: None,
            stderr: None,
            error: Some("Invalid domain name".to_string()),
        };
    }

    let key_file = format!("{}/{}.key", output_dir, domain);
    let csr_file = format!("{}/{}.csr", output_dir, domain);
    let subject = format!("/C=US/ST=Arizona/L=Tempe/O={}/OU=IT/CN={}", domain, domain);
```

Change it to:

```rust
#[tauri::command]
fn generate_csr(domain: String, output_dir: String) -> CommandResult {
    if !is_valid_domain(&domain) {
        return CommandResult {
            success: false,
            stdout: None,
            stderr: None,
            error: Some("Invalid domain. Use example.com or *.example.com".to_string()),
        };
    }

    let file_stem = filename_for(&domain);
    let key_file = format!("{}/{}.key", output_dir, file_stem);
    let csr_file = format!("{}/{}.csr", output_dir, file_stem);
    let subject = format!("/C=US/ST=Arizona/L=Tempe/O={}/OU=IT/CN={}", domain, domain);
```

Everything below (the `Command::new("openssl")...` block) is unchanged.

- [ ] **Step 2: Compile and re-run tests**

```bash
cd keystore-builder-tauri/src-tauri && cargo test
```

Expected: all existing tests still pass, no compile errors.

- [ ] **Step 3: Commit**

```bash
git add keystore-builder-tauri/src-tauri/src/lib.rs
git commit -m "Wire wildcard-aware validator and filename helper into generate_csr"
```

---

## Task 4: Wire `filename_for` into `create_keystore`

**Files:**
- Modify: `keystore-builder-tauri/src-tauri/src/lib.rs` (function `create_keystore`, around lines 145–180)

`create_keystore` currently builds its output paths from the raw domain:

```rust
    let keystore_file = format!("{}/{}.{}", output_dir, domain, extension);
    let temp_p12 = format!("{}/temp.p12", output_dir);
```

- [ ] **Step 1: Rewrite the filename construction**

Replace those two lines with:

```rust
    let file_stem = filename_for(&domain);
    let keystore_file = format!("{}/{}.{}", output_dir, file_stem, extension);
    let temp_p12 = format!("{}/temp.p12", output_dir);
```

(`temp.p12` stays as-is — it's a scratch file, not domain-derived.)

Nothing else in the function changes. The `-name` flag keeps using the `alias` argument.

- [ ] **Step 2: Compile**

```bash
cd keystore-builder-tauri/src-tauri && cargo build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add keystore-builder-tauri/src-tauri/src/lib.rs
git commit -m "Use filename_for in create_keystore output path"
```

---

## Task 5: Frontend shared helper

**Files:**
- Create: `keystore-builder-tauri/src/utils/domain.ts`

- [ ] **Step 1: Create the helper file**

Create `keystore-builder-tauri/src/utils/domain.ts` with:

```ts
// Mirrors Rust's filename_for: rewrites a leading `*.` to `_.` so the frontend
// references the same file path that the backend actually writes.
export function filenameSafe(domain: string): string {
  return domain.startsWith('*.') ? '_.' + domain.slice(2) : domain;
}
```

- [ ] **Step 2: Commit**

```bash
git add keystore-builder-tauri/src/utils/domain.ts
git commit -m "Add filenameSafe frontend helper for wildcard domains"
```

---

## Task 6: Use `filenameSafe` in Step 1

**Files:**
- Modify: `keystore-builder-tauri/src/components/Step1CSRGenerator.tsx`

- [ ] **Step 1: Import the helper**

At the top of `keystore-builder-tauri/src/components/Step1CSRGenerator.tsx`, below the existing imports, add:

```ts
import { filenameSafe } from '../utils/domain';
```

- [ ] **Step 2: Rewrite the file-path construction**

Locate these two lines inside `handleGenerateCSR` (currently around lines 31–32):

```ts
    const keyFile = `${project.outputDir}/${project.domain}.key`;
    const csrFile = `${project.outputDir}/${project.domain}.csr`;
```

Replace with:

```ts
    const fileStem = filenameSafe(project.domain);
    const keyFile = `${project.outputDir}/${fileStem}.key`;
    const csrFile = `${project.outputDir}/${fileStem}.csr`;
```

- [ ] **Step 3: Update the placeholder to hint wildcards**

Locate the domain `<input>` (currently around line 88):

```tsx
          placeholder="www.example.com"
```

Change to:

```tsx
          placeholder="www.example.com or *.example.com"
```

- [ ] **Step 4: Commit**

```bash
git add keystore-builder-tauri/src/components/Step1CSRGenerator.tsx
git commit -m "Support wildcard domains in Step 1 (paths + placeholder)"
```

---

## Task 7: Use `filenameSafe` in Step 4 success path

**Files:**
- Modify: `keystore-builder-tauri/src/components/Step4KeystoreCreation.tsx`

- [ ] **Step 1: Import the helper**

At the top of `keystore-builder-tauri/src/components/Step4KeystoreCreation.tsx`, below the existing imports:

```ts
import { filenameSafe } from '../utils/domain';
```

- [ ] **Step 2: Fix the displayed keystore path**

Locate this line inside `handleCreateKeystore` (currently around line 47):

```ts
        const keystorePath = `${project.outputDir}/${project.domain}.${keystoreExt}`;
```

Replace with:

```ts
        const keystorePath = `${project.outputDir}/${filenameSafe(project.domain)}.${keystoreExt}`;
```

- [ ] **Step 3: Commit**

```bash
git add keystore-builder-tauri/src/components/Step4KeystoreCreation.tsx
git commit -m "Show correct wildcard-safe keystore path in Step 4"
```

---

## Task 8: Manual dev-mode verification

**Prereqs:**
- `keystore-builder-tauri/` dependencies installed (`npm install` if needed).
- OpenSSL available on `PATH` (already required by the app).

- [ ] **Step 1: Run the dev build**

From the repo root:

```bash
cd keystore-builder-tauri && npm run tauri dev
```

Wait for the app window to open.

- [ ] **Step 2: Generate a wildcard CSR**

In the app:
1. Go to the "CSR / Private Key" tab (Step 1).
2. Enter domain: `*.poli-film.net`.
3. Pick any writable output directory (e.g. `/tmp/wildcard-test` — create it first).
4. Click "Generate CSR & Private Key".

Expected:
- Success message lists paths `/tmp/wildcard-test/_.poli-film.net.key` and `/tmp/wildcard-test/_.poli-film.net.csr`.
- Both files exist on disk.

- [ ] **Step 3: Verify CN is still `*.poli-film.net`**

In a separate terminal:

```bash
openssl req -in /tmp/wildcard-test/_.poli-film.net.csr -noout -subject
```

Expected output contains `CN = *.poli-film.net`.

- [ ] **Step 4: Verify non-wildcard regression**

Start a new project in the app (the existing "New Project" button), enter `www.poli-film.net`, pick the same output dir, generate.

Expected:
- Files named `www.poli-film.net.key` / `.csr` (no underscore rewrite).
- CN = `www.poli-film.net`.

- [ ] **Step 5: Verify invalid input is rejected**

Try each of these domains one at a time and confirm the UI surfaces the error message `"Invalid domain. Use example.com or *.example.com"`:

- `*`
- `foo.*.com`
- `*foo.com`
- empty

- [ ] **Step 6: End-to-end keystore build (wildcard)**

Using the wildcard CSR from Step 2:
1. Submit to GoDaddy (or use any test-issued cert — a self-signed one generated via `openssl x509 -req -in ... -signkey ... -out _.poli-film.net.crt -days 30` is fine for this check).
2. In the app, advance to "Import Certificate", pick the issued cert.
3. Advance to "Create Keystore", enter any password, click Create.

Expected:
- Success message shows `/tmp/wildcard-test/_.poli-film.net.p12` (or `.jks`).
- File exists on disk.
- `openssl pkcs12 -in _.poli-film.net.p12 -nokeys -passin pass:<pw> | openssl x509 -noout -subject` shows `CN = *.poli-film.net`.

- [ ] **Step 7: Stop the dev server and commit if anything was tweaked**

Kill the `npm run tauri dev` process. If verification surfaced a bug and required code changes, commit them. Otherwise this task has no commit.

---

## Done Criteria

- `cargo test` passes in `keystore-builder-tauri/src-tauri/`.
- TypeScript builds without errors (`npm run build` in `keystore-builder-tauri/`, if the reviewer wants a belt-and-braces check).
- Manual verification Task 8 Steps 2–6 all succeed.
- No changes to any file outside `keystore-builder-tauri/src-tauri/src/lib.rs`, `keystore-builder-tauri/src/utils/domain.ts`, `keystore-builder-tauri/src/components/Step1CSRGenerator.tsx`, and `keystore-builder-tauri/src/components/Step4KeystoreCreation.tsx`.
