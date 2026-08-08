// Escapes a value for safe interpolation into an HTML template string.
// Use this any time DB-sourced or user-entered text is inserted via innerHTML.
export function escapeHtml(value: unknown): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
