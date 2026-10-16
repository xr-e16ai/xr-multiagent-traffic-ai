import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

// ESM-compatible __dirname (Vite's esbuild bundler injects __vite_injected_original_import_meta_url)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Backend middleware plugin (dev server only)
//
// IMPORTANT: admin-backend.js and send-email.js are imported via computed URL
// strings (`new URL(..., import.meta.url).href`).  This makes the import path
// a runtime expression so esbuild does NOT bundle those modules into the temp
// vite config file.  Bundling them caused firebase-admin's gRPC keepalive
// timers to open immediately, which blocked `vite.createServer()` from ever
// resolving and made `npm run dev` hang indefinitely.
// ---------------------------------------------------------------------------
function backendPlugin() {
  return {
    name: 'backend',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Admin API routes
        if (req.url.startsWith('/api/admin/')) {
          const adminBackendUrl = new URL('./admin-backend.js', import.meta.url).href;
          const { handleAdminApi } = await import(adminBackendUrl);
          return handleAdminApi(req, res);
        }

        // Forgot Login flow (email)
        if (req.url === '/send-forgot-login' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { phoneNumber } = JSON.parse(body);

              const adminBackendUrl = new URL('./admin-backend.js', import.meta.url).href;
              const sendEmailUrl    = new URL('./send-email.js',    import.meta.url).href;

              const { getEmailByPhone }       = await import(adminBackendUrl);
              const { sendLoginDetailsEmail } = await import(sendEmailUrl);

              const userData = await getEmailByPhone(phoneNumber);

              if (userData && userData.email && userData.fullName) {
                await sendLoginDetailsEmail(userData.email, userData.fullName, phoneNumber);
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Processed securely' }));
            } catch (err) {
              console.error('[Forgot Login] Error:', err);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env files from the project root (traffic-sim/)
  const env = loadEnv(mode, resolve(__dirname, '.'), '');

  // Expose vars so server-side modules (send-email.js, etc.) can read them
  process.env.GMAIL_CLIENT_ID      = env.GMAIL_CLIENT_ID      || process.env.GMAIL_CLIENT_ID;
  process.env.GMAIL_CLIENT_SECRET  = env.GMAIL_CLIENT_SECRET  || process.env.GMAIL_CLIENT_SECRET;
  process.env.GMAIL_REFRESH_TOKEN  = env.GMAIL_REFRESH_TOKEN  || process.env.GMAIL_REFRESH_TOKEN;
  process.env.GMAIL_SENDER_EMAIL   = env.GMAIL_SENDER_EMAIL   || process.env.GMAIL_SENDER_EMAIL;

  // Map GEMINI_API_KEY → VITE_ prefix so the frontend build picks it up
  process.env.VITE_GEMINI_API_KEY =
    env.GEMINI_API_KEY        ||
    process.env.GEMINI_API_KEY        ||
    env.VITE_GEMINI_API_KEY   ||
    process.env.VITE_GEMINI_API_KEY;

  return {
    plugins: [backendPlugin()],

    server: {
      host: '127.0.0.1',
      port: 5173,
    },

    build: {
      rollupOptions: {
        input: {
          main:            resolve(__dirname, 'index.html'),
          instruction:     resolve(__dirname, 'instruction.html'),
          login:           resolve(__dirname, 'login.html'),
          dashboard:       resolve(__dirname, 'dashboard.html'),
          adminLogin:      resolve(__dirname, 'admin-login.html'),
          adminDashboard:  resolve(__dirname, 'admin-dashboard.html'),
          adminUsers:      resolve(__dirname, 'admin-users.html'),
          adminUserDetails:resolve(__dirname, 'admin-user-details.html'),
          adminOrgs:       resolve(__dirname, 'admin-organizations.html'),
          adminOrgDetails: resolve(__dirname, 'admin-organization-details.html'),
          adminAnalytics:  resolve(__dirname, 'admin-analytics.html'),
          adminReports:    resolve(__dirname, 'admin-reports.html'),
          adminPayments:   resolve(__dirname, 'admin-payments.html'),
          adminSettings:   resolve(__dirname, 'admin-settings.html'),
        },
      },
    },
  };
});
