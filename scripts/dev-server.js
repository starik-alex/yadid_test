'use strict';

/*
 * Zero-dependency local server: serves public/ with clean URLs and runs api/*.js like Vercel does.
 * By default DRY_RUN=1, so forms work end to end but nothing is e-mailed.
 *
 *   npm run dev                 → http://localhost:5173
 *   DRY_RUN=0 npm run dev       → really send to FormSubmit
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

if (process.env.DRY_RUN === undefined) process.env.DRY_RUN = '1';

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};
const ROUTES = {
  '/api/lead': path.join(ROOT, 'api', 'lead.js'),
  '/api/webinar': path.join(ROOT, 'api', 'webinar.js')
};

function resolveStatic(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const base = path.join(PUBLIC, clean);
  if (!base.startsWith(PUBLIC)) return null;
  const candidates = [base, base + '.html', path.join(base, 'index.html')];
  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) || null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = ROUTES[url.pathname];
  if (route) return require(route)(req, res);

  const file = resolveStatic(url.pathname);
  if (!file) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Not found');
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Yadid landing → http://localhost:${PORT}  (DRY_RUN=${process.env.DRY_RUN})`);
  });
}

module.exports = server;
