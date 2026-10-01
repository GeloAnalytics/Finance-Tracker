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

  if (!configured) {
    // A production static host needs the injected Render URL, but local
    // preview/static servers do not have Vite's /api proxy. Point local
    // browsers directly at the API so `npm run preview` and Live Server work
    // the same way as `npm run dev`.
    const isLocalBrowser = typeof window !== 'undefined'
      && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    return isLocalBrowser ? 'http://localhost:3001/api' : '/api';
  }
  if (configured.startsWith('/')) {
    return configured.replace(/\/+$/, '') || '/api';
  }

  const origin = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;
  const normalized = origin.replace(/\/+$/, '');
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
}
