import { resolve } from 'path';
import { defineConfig } from 'vite';

import { sendLoginDetailsEmail } from './send-email.js';

import { handleAdminApi, getEmailByPhone } from './admin-backend.js';

// Real backend API plugin for Email & Admin
function backendPlugin() {
  return {
    name: 'backend',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        
        // Admin API routes
        if (req.url.startsWith('/api/admin/')) {
          return handleAdminApi(req, res);
        }

        // Handle Forgot Login Flow (Email)
        if (req.url === '/send-forgot-login' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { phoneNumber } = JSON.parse(body);
              
              // Secure Firestore Query using Admin SDK
              const userData = await getEmailByPhone(phoneNumber);
              
              if (userData && userData.email && userData.fullName) {
                await sendLoginDetailsEmail(userData.email, userData.fullName, phoneNumber);
              }
              
              res.setHeader('Content-Type', 'application/json');
              // Always return generic success to avoid enumeration
              res.end(JSON.stringify({ success: true, message: "Processed securely" }));
            } catch (err) {
              console.error("[Forgot Login] Error:", err);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files in the project root (traffic-sim/)
  const env = loadEnv(mode, resolve(__dirname, '.'), '');
  
  // Expose loaded environment variables on process.env so send-email.js can access them
  process.env.GMAIL_CLIENT_ID = env.GMAIL_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
  process.env.GMAIL_CLIENT_SECRET = env.GMAIL_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
  process.env.GMAIL_REFRESH_TOKEN = env.GMAIL_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN;
  process.env.GMAIL_SENDER_EMAIL = env.GMAIL_SENDER_EMAIL || process.env.GMAIL_SENDER_EMAIL;

  // Map the Cloud Run/Secret Manager GEMINI_API_KEY to Vite's VITE_ prefix so it gets injected into the frontend build
  process.env.VITE_GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  return {
    plugins: [backendPlugin()],
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          login: resolve(__dirname, 'login.html'),
          dashboard: resolve(__dirname, 'dashboard.html'),
          adminLogin: resolve(__dirname, 'admin-login.html'),
          adminDashboard: resolve(__dirname, 'admin-dashboard.html'),
          adminUsers: resolve(__dirname, 'admin-users.html'),
          adminUserDetails: resolve(__dirname, 'admin-user-details.html'),
          adminOrgs: resolve(__dirname, 'admin-organizations.html'),
          adminAnalytics: resolve(__dirname, 'admin-analytics.html'),
          adminReports: resolve(__dirname, 'admin-reports.html'),
          adminPayments: resolve(__dirname, 'admin-payments.html'),
          adminSettings: resolve(__dirname, 'admin-settings.html'),
        },
      },
    },
  };
});
