// Mirrors Rust's filename_for: rewrites a leading `*.` to `_.` so the frontend
// references the same file path that the backend actually writes.
export function filenameSafe(domain: string): string {
  return domain.startsWith('*.') ? '_.' + domain.slice(2) : domain;
}
