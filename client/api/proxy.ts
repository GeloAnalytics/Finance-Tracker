declare const process: { env: Record<string, string | undefined> };
declare const Buffer: { from(input: ArrayBuffer): Uint8Array };

const BACKEND_ORIGIN = (
  process.env.FINANCEWISE_API_ORIGIN || 'https://financewise-api.vercel.app'
).replace(/\/+$/, '');

function getBackendPath(url: string): string {
  const parsed = new URL(url, 'https://financewise-proxy.invalid');
  const originalPath = parsed.searchParams.get('path') || '/';
  parsed.searchParams.delete('path');
  const normalizedPath = originalPath.startsWith('/') ? originalPath : `/${originalPath}`;
  const apiPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  const query = parsed.searchParams.toString();
  return `${apiPath}${query ? `?${query}` : ''}`;
}

function getRequestBody(req: any): string | undefined {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return undefined;
  if (req.body === undefined || req.body === null || req.body === '') return undefined;
  return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
}

export default async function handler(req: any, res: any): Promise<void> {
  const target = `${BACKEND_ORIGIN}${getBackendPath(req.url || '/')}`;
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers || {})) {
    if (['host', 'origin', 'content-length'].includes(name.toLowerCase())) continue;
    if (Array.isArray(value)) headers.set(name, value.join(', '));
    else if (typeof value === 'string') headers.set(name, value);
  }

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: getRequestBody(req),
  });

  res.statusCode = upstream.status;
  upstream.headers.forEach((value, name) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) {
      res.setHeader(name, value);
    }
  });

  const setCookies = typeof (upstream.headers as any).getSetCookie === 'function'
    ? (upstream.headers as any).getSetCookie()
    : [];
  if (setCookies.length > 0) res.setHeader('set-cookie', setCookies);

  const payload = Buffer.from(await upstream.arrayBuffer());
  res.setHeader('content-length', payload.byteLength);
  res.end(payload);
}
