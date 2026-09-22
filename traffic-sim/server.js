/**
 * server.js — Production HTTP server for Cloud Run
 *
 * Serves:
 *   - Static built Vite frontend from /dist
 *   - POST /send-forgot-login  (Gmail API)
 *   - /api/admin/*             (Firebase Admin SDK operations)
 *
 * Does NOT depend on Vite's configureServer() hook.
 * Credentials come only from environment variables or Application Default Credentials.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleAdminApi, getEmailByPhone } from './admin-backend.js';
import { sendLoginDetailsEmail } from './send-email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const DIST_DIR = path.resolve(__dirname, 'dist');

// ─── MIME TYPES ──────────────────────────────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function serve404(res) {
  const fallback = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(fallback)) {
    // SPA fallback — for any unknown route, serve index.html
    serveFile(res, fallback);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
  });
}

// ─── REQUEST HANDLER ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0]; // strip query strings for routing

  // ── Admin API routes ──────────────────────────────────────────────────────
  if (url.startsWith('/api/admin/')) {
    return handleAdminApi(req, res);
  }

  // ── Forgot Login (Gmail) ──────────────────────────────────────────────────
  if (url === '/send-forgot-login' && req.method === 'POST') {
    const body = await readBody(req);
    res.setHeader('Content-Type', 'application/json');
    try {
      const { phoneNumber } = JSON.parse(body);
      const userData = await getEmailByPhone(phoneNumber);
      if (userData && userData.email && userData.fullName) {
        await sendLoginDetailsEmail(userData.email, userData.fullName, phoneNumber);
      }
      // Always return generic success to avoid account enumeration
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: 'Processed securely' }));
    } catch (err) {
      console.error('[Forgot Login] Error:', err);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    }
    return;
  }

  // ── Static file serving ───────────────────────────────────────────────────
  // Map "/" to "/index.html"
  let filePath = url === '/' ? '/index.html' : url;
  // Strip leading slash for path.join
  filePath = path.join(DIST_DIR, filePath);

  // Security: prevent path traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
  } else {
    // For .html requests that don't exist as files, return 404
    // For everything else, fall back to index.html (SPA)
    serve404(res);
  }
});

// ─── START ───────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Traffic Sim production server running on port ${PORT}`);
  console.log(`[Server] Serving static files from: ${DIST_DIR}`);
  console.log(`[Server] Admin API: /api/admin/*`);
  console.log(`[Server] Forgot Login: POST /send-forgot-login`);
});

server.on('error', (err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
