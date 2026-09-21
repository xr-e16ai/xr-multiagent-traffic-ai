import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let db;
try {
  const serviceAccountPath = resolve(__dirname, 'service-account-key.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('[Admin SDK] Initialized successfully');
  }
  db = getFirestore();
} catch (error) {
  console.error('[Admin SDK] Failed to initialize:', error.message);
}

// In-memory token store for development
// In production, this should be in Redis or a Firestore collection
const activeAdminTokens = new Set();

export async function handleAdminApi(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  
  await new Promise(resolve => req.on('end', resolve));

  const respond = (status, data) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };

  try {
    const data = body ? JSON.parse(body) : {};

    // ─── PUBLIC ROUTE ───
    if (req.url === '/api/admin/login') {
      const adminId = process.env.ADMIN_ID || 'admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123';

      if (data.id === adminId && data.password === adminPass) {
        const token = crypto.randomBytes(32).toString('hex');
        activeAdminTokens.add(token);
        return respond(200, { success: true, token, name: 'Administrator' });
      }
      return respond(401, { success: false, error: 'Invalid credentials' });
    }

    // ─── AUTHENTICATION MIDDLEWARE ───
    const token = req.headers['x-admin-token'];
    if (!token || !activeAdminTokens.has(token)) {
      return respond(401, { success: false, error: 'Unauthorized' });
    }

    // ─── PROTECTED ROUTES ───
    if (req.url === '/api/admin/users' && req.method === 'GET') {
      const snap = await db.collection('users').get();
      const users = [];
      snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
      return respond(200, { success: true, users });
    }

    if (req.url.startsWith('/api/admin/user/') && req.method === 'GET') {
      const uid = req.url.split('/').pop();
      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) return respond(404, { success: false, error: 'Not found' });
      return respond(200, { success: true, user: { id: doc.id, ...doc.data() } });
    }

    if (req.url === '/api/admin/approve' && req.method === 'POST') {
      const { uid } = data;
      await db.collection('users').doc(uid).update({
        isApproved: true,
        subscriptionStatus: 'active',
        simulationAccess: true,
        approvedAt: new Date().toISOString(),
        approvedBy: 'Administrator'
      });
      return respond(200, { success: true });
    }

    if (req.url === '/api/admin/deactivate' && req.method === 'POST') {
      const { uid } = data;
      await db.collection('users').doc(uid).update({
        isApproved: false,
        subscriptionStatus: 'inactive',
        simulationAccess: false
      });
      return respond(200, { success: true });
    }

    if (req.url === '/api/admin/delete' && req.method === 'POST') {
      const { uid } = data;
      await db.collection('users').doc(uid).delete();
      return respond(200, { success: true });
    }

    return respond(404, { success: false, error: 'API route not found' });
  } catch (error) {
    console.error(`[Admin API] Error on ${req.url}:`, error);
    return respond(500, { success: false, error: 'Internal server error' });
  }
}

// Helper for the forget login flow using Admin SDK
export async function getEmailByPhone(phoneNumber) {
  try {
    const snap = await db.collection('users').where('mobileNumber', '==', phoneNumber).limit(1).get();
    if (snap.empty) return null;
    return snap.docs[0].data();
  } catch (e) {
    console.error('getEmailByPhone error:', e);
    return null;
  }
}
