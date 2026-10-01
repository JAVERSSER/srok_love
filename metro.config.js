const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some dependencies (e.g. zustand) publish an ESM build via "exports" that
// contains `import.meta`, which breaks when Metro bundles it into a classic
// (non-module) <script> for web. Falling back to the legacy "main" field
// resolution avoids picking those ESM entry points.
config.resolver.unstable_enablePackageExports = false;

// Dev-server proxy for the web app, mirroring api/proxy.js on Vercel. The
// backend's auth cookies are SameSite=Lax, so a page on localhost calling the
// backend directly never gets them sent back. Proxying /api and /media
// through Metro makes them first-party localhost cookies.
const BACKEND = process.env.BACKEND_ORIGIN || 'http://139.59.249.224:8000';
const DROP_REQUEST = ['host', 'connection', 'content-length', 'accept-encoding', 'origin', 'referer'];
const DROP_RESPONSE = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'];

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function proxy(req, res) {
  const headers = { ...req.headers };
  DROP_REQUEST.forEach((h) => delete headers[h]);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  let upstream;
  try {
    upstream = await fetch(BACKEND + req.url, {
      method: req.method,
      headers,
      body: hasBody ? await readBody(req) : undefined,
      redirect: 'manual',
    });
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ detail: 'Backend server is unreachable.' }));
    return;
  }
  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.includes(key)) res.setHeader(key, value);
  });
  // Each cookie needs its own Set-Cookie header.
  const cookies = upstream.headers.getSetCookie();
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/media/')) {
      proxy(req, res).catch(next);
      return;
    }
    return middleware(req, res, next);
  },
};

module.exports = config;
