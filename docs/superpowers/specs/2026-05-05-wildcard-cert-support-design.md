# Wildcard Certificate Support — Design

**Date:** 2026-05-05
**Status:** Approved
**Scope:** Single feature, small. One implementation plan.

## Problem

The Tauri app's domain validator (`keystore-builder-tauri/src-tauri/src/lib.rs:101`, inside `generate_csr`) rejects any character that isn't alphanumeric, `.`, or `-`. Wildcard domains like `*.poli-film.net` fail validation before `openssl` is ever invoked. Wildcard certs are a common GoDaddy product, so users need to be able to run the full flow (CSR → import → keystore) with a `*.<host>` domain.

## Goals

- Accept leading-wildcard domains (`*.example.com`) throughout the CSR → Import → Keystore flow.
- Keep `CN=*.example.com` in the CSR subject so the resulting cert is a valid wildcard.
- Use a filename-safe form (`_.example.com`) for every file the app writes (`.key`, `.csr`, `.p12`, `.pfx`, `.jks`) and for the keystore alias default, so Java/shell tooling doesn't choke on the literal `*`.
- Require no new UI controls — the existing domain field accepts wildcards.

## Non-goals

- Multi-SAN certificates (e.g. `example.com` + `*.example.com` on one cert).
- Wildcards in non-leading positions (`foo.*.bar.com`).
- Bare `*`.
- Migrating any existing project state — this is net-new capability.

## Approach

Backend (Rust) owns the wildcard rules. The frontend passes the raw domain (`*.example.com`) to Rust, which validates it, uses it verbatim for the OpenSSL CN, and derives a filename-safe form for file paths. The frontend mirrors the same filename transform in one shared helper so UI text that references the output files stays consistent.

This keeps the naming rule in one place per side and avoids drift between the filename the user sees in the UI and the file Rust actually wrote.

## Changes

### 1. Rust — domain validator

`keystore-builder-tauri/src-tauri/src/lib.rs`.

Replace the inline validation inside `generate_csr` with a helper:

```rust
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

Acceptance behavior:

| Input | Accepted |
|---|---|
| `example.com` | yes |
| `www.example.com` | yes |
| `*.example.com` | yes |
| `*.foo.example.com` | yes |
| `*` | no |
| `*.` | no |
| `*foo.com` | no |
| `foo.*.com` | no |
| `**.com` | no |
| `localhost` | no (no dot) |
| `*.localhost` | no (no dot after strip) |
| `..com` | no |
| empty string | no |

Error message when rejected: `"Invalid domain. Use example.com or *.example.com"`.

### 2. Rust — filename derivation

Add a helper next to the validator:

```rust
fn filename_for(domain: &str) -> String {
    domain.replacen("*.", "_.", 1)
}
```

Update `generate_csr` to build `key_file` / `csr_file` paths from `filename_for(&domain)` while keeping the `-subj` argument built from the raw `domain` (so CN stays `*.example.com`).

Update `create_keystore` similarly: the output file path and the intermediate `temp.p12` path derive from `filename_for(&domain)`. The `-name <alias>` flag continues to use the `alias` argument the caller passes.

### 3. Frontend — shared helper

Create `keystore-builder-tauri/src/utils/domain.ts`:

```ts
export function filenameSafe(domain: string): string {
  return domain.startsWith('*.') ? '_.' + domain.slice(2) : domain;
}
```

Replace every place the frontend constructs an output filename from `project.domain`:

- `Step1CSRGenerator.tsx` — `keyFile` / `csrFile` strings used both for the success message and for storing paths back to the project.
- `Step4KeystoreCreation.tsx` — the success-message path `${project.outputDir}/${project.domain}.${keystoreExt}` uses `filenameSafe(project.domain)` so it matches the file Rust actually wrote.

Step 3 and `CleanupTool` don't reference `project.domain` for filename construction (Step 3 uses an explicit file picker; Cleanup works off the output directory listing), so no changes needed there. The Step 4 alias field defaults to the static string `"tomcat"` today — we leave that alone.

### 4. UI — copy tweaks

- `Step1CSRGenerator.tsx`:
  - Domain `<input>` placeholder → `www.example.com or *.example.com`.
  - The "Certificate Details (auto-filled)" info box continues to display the raw `project.domain` for Organization and Common Name (so it reads `*.example.com`, which is correct).
  - The success message's listed file paths use `filenameSafe(project.domain)` (via the changes in §3).

No new checkboxes, badges, or mode toggles.

## Testing

### Rust unit tests

Add `#[cfg(test)] mod tests` to `lib.rs`:

- `is_valid_domain` — cases from the table above.
- `filename_for` — `example.com` → `example.com`; `*.example.com` → `_.example.com`; `*.foo.example.com` → `_.foo.example.com`; does not transform non-leading `*` (defense-in-depth; validator already rejects those).

### Manual verification (dev mode)

With `*.poli-film.net`:

1. Step 1 generates `_.poli-film.net.key` and `_.poli-film.net.csr` in the chosen output directory.
2. `openssl req -in _.poli-film.net.csr -noout -subject` prints `subject=... CN=*.poli-film.net`.
3. Step 3 accepts the issued cert and chain as normal.
4. Step 4 produces `_.poli-film.net.p12` (and `.jks` if chosen) using the default `"tomcat"` alias.
5. `keytool -list -keystore _.poli-film.net.jks -storepass <pw>` lists the alias without error.

Also re-verify the non-wildcard golden path (`www.poli-film.net`) still works unchanged.

## Risks

- **Existing projects** with `project.domain` values saved from prior versions are unaffected — no wildcard domain could have been saved before (validator rejected it).
- **Keystore alias override:** if a user manually types `*` into the alias field, `keytool` will likely fail. We default to the safe form; further guarding is out of scope.
- **Shell globbing:** `_.example.com.*` patterns in shells still glob as expected; literal `*` in filenames would have been a real problem, which is why we don't use it.
