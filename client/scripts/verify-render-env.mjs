const apiOrigin = (process.env.VITE_API_ORIGIN || '').trim();

if (!apiOrigin) {
  console.error(
    'Missing VITE_API_ORIGIN. The Render static site must link this variable '
    + 'to the financewise-server RENDER_EXTERNAL_URL before building.'
  );
  process.exit(1);
}

if (!/^https?:\/\//i.test(apiOrigin)) {
  console.error(`Invalid VITE_API_ORIGIN: ${apiOrigin}`);
  process.exit(1);
}

console.log(`Render API origin configured: ${apiOrigin}`);
