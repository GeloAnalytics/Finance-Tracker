/// <reference types="vite/client" />

/**
 * Resolve the API endpoint used by both auth and the data client.
 *
 * VITE_API_ORIGIN is supplied by Render from the backend's
 * RENDER_EXTERNAL_URL. VITE_API_URL remains supported for local/manual
 * deployments and may already include the /api path.
 */
export function getApiBase(): string {
  const configured = (
    import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_API_URL || ''
  ).trim();

  if (!configured) return '/api';
  if (configured.startsWith('/')) {
    return configured.replace(/\/+$/, '') || '/api';
  }

  const origin = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;
  const normalized = origin.replace(/\/+$/, '');
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
}
