import app from '../server/src/app';

type VercelRequest = {
  url?: string;
  [key: string]: any;
};

type VercelResponse = {
  [key: string]: any;
};

/**
 * Mount the existing Express API at /api inside the same Vercel project as
 * the Vite frontend. The rewrite stores the original API path in `path` so
 * every Express route keeps its existing /api/... URL.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const rewrittenUrl = new URL(req.url || '/', 'https://financewise.local');
  const requestedPath = rewrittenUrl.searchParams.get('path') || '/';
  rewrittenUrl.searchParams.delete('path');

  const apiPath = requestedPath.startsWith('/api')
    ? requestedPath
    : `/api${requestedPath.startsWith('/') ? requestedPath : `/${requestedPath}`}`;
  const query = rewrittenUrl.searchParams.toString();
  req.url = `${apiPath}${query ? `?${query}` : ''}`;

  return app(req as any, res as any);
}
