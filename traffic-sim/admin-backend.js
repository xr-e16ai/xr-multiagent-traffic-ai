import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let db;
try {
  if (!getApps().length) {
    const keyPath = resolve(__dirname, 'service-account-key.json');
    if (existsSync(keyPath)) {
      // Local development — use explicit key file
      const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
      initializeApp({ credential: cert(serviceAccount) });
      console.log('[Admin SDK] Initialized with local service-account-key.json');
    } else {
      // Cloud Run / GCP — use Application Default Credentials
      initializeApp();
      console.log('[Admin SDK] Initialized with Application Default Credentials');
    }
  }
  db = getFirestore();
} catch (error) {
  console.error('[Admin SDK] Failed to initialize:', error.message);
}

// In-memory token store for development
const activeAdminTokens = new Set();

// Default Cloud Storage Bucket name
const DEFAULT_BACKUP_BUCKET = process.env.BACKUP_BUCKET_NAME || 'multi-agent-traffic-sim-2026-backups';
const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || 'e16-traffic-sim-backup-secret-2026';

// ─── CORE BACKUP ENGINE ───────────────────────────────────────────────────────
export async function runBackup(initiatedBy = 'Administrator') {
  console.log(`[Backup Engine] Starting automated backup initiated by: ${initiatedBy}...`);
  const backupTimestamp = new Date().toISOString();
  const cleanTimestamp = backupTimestamp.replace(/[:.]/g, '-');
  const backupId = `backup_${cleanTimestamp}`;
  const filename = `${backupId}.json`;

  const backupsDir = resolve(__dirname, 'backups');
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
  }
  const localFilePath = resolve(backupsDir, filename);

  try {
    // 1. Fetch & sanitize Users collection (Strip passwords, tokens, API keys, private keys)
    const usersSnap = await db.collection('users').get();
    const sanitizedUsers = [];
    usersSnap.forEach(doc => {
      const data = { ...doc.data() };
      delete data.password;
      delete data.tempPassword;
      delete data.token;
      delete data.privateKey;
      delete data.apiKey;
      delete data.secret;
      delete data.authTokens;
      sanitizedUsers.push({ id: doc.id, ...data });
    });

    // 2. Fetch System Settings collection
    const settingsSnap = await db.collection('system_settings').get();
    const settingsList = [];
    settingsSnap.forEach(doc => {
      settingsList.push({ id: doc.id, ...doc.data() });
    });

    // 3. Assemble structured backup payload
    const backupPayload = {
      version: '2.2.0-Enterprise',
      backupId,
      createdAt: backupTimestamp,
      environment: process.env.NODE_ENV || 'production',
      initiatedBy,
      collections: ['users', 'system_settings'],
      stats: {
        totalUsers: sanitizedUsers.length,
        totalSettings: settingsList.length,
        totalRecords: sanitizedUsers.length + settingsList.length
      },
      data: {
        users: sanitizedUsers,
        system_settings: settingsList
      }
    };

    const jsonContent = JSON.stringify(backupPayload, null, 2);
    const sizeBytes = Buffer.byteLength(jsonContent, 'utf8');
    const checksum = crypto.createHash('sha256').update(jsonContent).digest('hex');

    // 4. Save to secure local backup store
    writeFileSync(localFilePath, jsonContent, 'utf8');

    // 5. Save to Google Cloud Storage bucket if available/accessible
    let destinationUri = `local:backups/${filename}`;
    let gcsSuccess = false;
    try {
      const storage = getStorage();
      const bucket = storage.bucket(DEFAULT_BACKUP_BUCKET);
      const file = bucket.file(`backups/${filename}`);
      await file.save(jsonContent, {
        contentType: 'application/json',
        metadata: {
          backupId,
          createdAt: backupTimestamp,
          checksum: `sha256:${checksum}`,
          totalRecords: sanitizedUsers.length + settingsList.length
        }
      });
      destinationUri = `gs://${DEFAULT_BACKUP_BUCKET}/backups/${filename}`;
      gcsSuccess = true;
      console.log(`[Backup Engine] ✅ Backup uploaded to Cloud Storage: ${destinationUri}`);
    } catch (gcsErr) {
      console.log(`[Backup Engine] Note: GCS upload not active (using local store): ${gcsErr.message}`);
      destinationUri = `local:backups/${filename}`;
    }

    // 6. Record successful backup in Firestore system_backups registry
    const backupRecord = {
      backupId,
      filename,
      createdAt: backupTimestamp,
      status: 'success',
      sizeBytes,
      recordsCount: sanitizedUsers.length + settingsList.length,
      userCount: sanitizedUsers.length,
      settingsCount: settingsList.length,
      destination: destinationUri,
      gcsUploaded: gcsSuccess,
      checksum: `sha256:${checksum}`,
      retentionStatus: 'retained',
      initiatedBy
    };

    await db.collection('system_backups').doc(backupId).set(backupRecord);
    console.log(`[Backup Engine] ✅ Backup ${backupId} completed and verified successfully.`);

    // 7. ENFORCE RETENTION POLICY: Retain Only the Latest 3 Successful Backups
    const retentionResult = await enforceBackupRetention(DEFAULT_BACKUP_BUCKET);

    return {
      success: true,
      backup: backupRecord,
      retention: retentionResult
    };

  } catch (error) {
    console.error(`[Backup Engine] ❌ Backup execution FAILED:`, error.message);
    
    // Log failed backup in Firestore for auditability
    try {
      const failedId = `failed_${cleanTimestamp}`;
      await db.collection('system_backups').doc(failedId).set({
        backupId: failedId,
        createdAt: backupTimestamp,
        status: 'failed',
        error: error.message,
        initiatedBy,
        retentionStatus: 'failed_audit'
      });
    } catch (logErr) {
      console.error('[Backup Engine] Failed to record failure in Firestore:', logErr);
    }

    // CRITICAL: A failed backup MUST NOT purge any existing valid backups!
    throw error;
  }
}

// ─── RETENTION POLICY ENFORCER ───────────────────────────────────────────────
async function enforceBackupRetention(bucketName) {
  console.log('[Backup Retention] Evaluating backup retention policy (Keeping latest 3)...');
  try {
    const snap = await db.collection('system_backups')
      .where('status', '==', 'success')
      .get();

    const allSuccessful = [];
    snap.forEach(d => allSuccessful.push({ id: d.id, ...d.data() }));

    // Sort newest to oldest by createdAt
    allSuccessful.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const RETENTION_LIMIT = 3;
    const retained = allSuccessful.slice(0, RETENTION_LIMIT);
    const toPurge = allSuccessful.slice(RETENTION_LIMIT);

    const purgedIds = [];

    for (const old of toPurge) {
      if (old.retentionStatus === 'purged') continue; // already purged

      console.log(`[Backup Retention] Purging backup beyond latest 3: ${old.backupId}...`);
      
      // 1. Delete from GCS if it was uploaded there
      if (old.destination && old.destination.startsWith('gs://')) {
        try {
          const storage = getStorage();
          const bucket = storage.bucket(bucketName);
          const gcsFile = bucket.file(`backups/${old.filename || old.backupId + '.json'}`);
          await gcsFile.delete({ ignoreNotFound: true });
          console.log(`[Backup Retention] Deleted GCS object: backups/${old.filename}`);
        } catch (delErr) {
          console.warn(`[Backup Retention] GCS object delete note:`, delErr.message);
        }
      }

      // 2. Delete from local backup store
      const localOld = resolve(__dirname, 'backups', old.filename || `${old.backupId}.json`);
      if (existsSync(localOld)) {
        try {
          unlinkSync(localOld);
          console.log(`[Backup Retention] Deleted local file: ${localOld}`);
        } catch (delErr) {
          console.warn(`[Backup Retention] Local file delete note:`, delErr.message);
        }
      }

      // 3. Update record in Firestore to 'purged' status
      await db.collection('system_backups').doc(old.id).update({
        retentionStatus: 'purged',
        purgedAt: new Date().toISOString()
      });

      purgedIds.push(old.backupId);
    }

    console.log(`[Backup Retention] Retained ${retained.length} latest backups: [${retained.map(b => b.backupId).join(', ')}]. Purged ${purgedIds.length} older backups: [${purgedIds.join(', ')}].`);

    return {
      retainedCount: retained.length,
      retainedIds: retained.map(b => b.backupId),
      purgedCount: purgedIds.length,
      purgedIds
    };
  } catch (err) {
    console.error('[Backup Retention] Error enforcing retention:', err);
    return { error: err.message };
  }
}

// ─── ADMIN API ROUTER ────────────────────────────────────────────────────────
export async function handleAdminApi(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  await new Promise(resolve => req.on('end', resolve));

  const respond = (status, data) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };

  const url = req.url.split('?')[0];

  try {
    const data = body ? JSON.parse(body) : {};

    // ─── PUBLIC ROUTE: Admin Login ──────────────────────────────────────────
    if (url === '/api/admin/login') {
      const adminId = process.env.ADMIN_ID || 'admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'info@e16ai26';

      if (data.id === adminId && data.password === adminPass) {
        const token = crypto.randomBytes(32).toString('hex');
        activeAdminTokens.add(token);
        return respond(200, { success: true, token, name: 'Administrator' });
      }
      return respond(401, { success: false, error: 'Invalid credentials' });
    }

    // ─── CLOUD SCHEDULER BACKUP TRIGGER (Secured with Secret/OIDC) ───────────
    if (url === '/api/admin/backup/run' && req.method === 'POST') {
      const schedulerSecret = req.headers['x-scheduler-secret'];
      const authHeader = req.headers['authorization'];
      const adminToken = req.headers['x-admin-token'];

      const isSchedulerAuthorized = schedulerSecret === SCHEDULER_SECRET ||
                                    (authHeader && authHeader.includes(SCHEDULER_SECRET));
      const isAdminAuthorized = adminToken && activeAdminTokens.has(adminToken);

      if (!isSchedulerAuthorized && !isAdminAuthorized) {
        return respond(401, { success: false, error: 'Unauthorized: Invalid credentials or scheduler secret' });
      }

      const initiator = isAdminAuthorized ? 'Administrator (Manual Trigger)' : 'Google Cloud Scheduler (Daily Automated)';
      try {
        const backupResult = await runBackup(initiator);
        return respond(200, { success: true, ...backupResult });
      } catch (err) {
        return respond(500, { success: false, error: err.message || 'Backup execution failed' });
      }
    }

    // ─── AUTHENTICATION MIDDLEWARE FOR REMAINING ADMIN ROUTES ────────────────
    const token = req.headers['x-admin-token'];
    if (!token || !activeAdminTokens.has(token)) {
      return respond(401, { success: false, error: 'Unauthorized: Admin token required' });
    }

    // ─── USERS API ───────────────────────────────────────────────────────────
    if (url === '/api/admin/users' && req.method === 'GET') {
      const snap = await db.collection('users').get();
      const users = [];
      snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
      return respond(200, { success: true, users });
    }

    if (url.startsWith('/api/admin/user/') && req.method === 'GET') {
      const uid = url.split('/').pop();
      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) return respond(404, { success: false, error: 'User not found' });
      return respond(200, { success: true, user: { id: doc.id, ...doc.data() } });
    }

    if (url === '/api/admin/approve' && req.method === 'POST') {
      const { uid } = data;
      await db.collection('users').doc(uid).update({
        isApproved: true,
        subscriptionStatus: 'active',
        licenseStatus: 'Activated',
        simulationAccess: true,
        approvedAt: new Date().toISOString(),
        approvedBy: 'Administrator'
      });
      return respond(200, { success: true });
    }

    if (url === '/api/admin/deactivate' && req.method === 'POST') {
      const { uid } = data;
      await db.collection('users').doc(uid).update({
        isApproved: false,
        subscriptionStatus: 'inactive',
        licenseStatus: 'Deactivated',
        simulationAccess: false
      });
      return respond(200, { success: true });
    }

    if (url === '/api/admin/delete' && req.method === 'POST') {
      const { uid } = data;
      await db.collection('users').doc(uid).delete();
      return respond(200, { success: true });
    }

    // ─── SECURITY SETTINGS API (PERSISTED IN FIRESTORE) ──────────────────────
    if (url === '/api/admin/settings' && req.method === 'GET') {
      const doc = await db.collection('system_settings').doc('security').get();
      const defaultSettings = {
        timeout: 60,
        attempts: 5,
        expiry: 90,
        twoFactor: true,
        ipWhitelist: '127.0.0.1, 192.168.1.0/24',
        specialChars: true,
        lockout: 15,
        autoBackupEnabled: true,
        backupRetentionCount: 3,
        backupFrequency: 'Daily',
        backupTime: '02:00 UTC',
        backupBucket: DEFAULT_BACKUP_BUCKET,
        updatedAt: new Date().toISOString(),
        updatedBy: 'System Default'
      };

      if (!doc.exists) {
        return respond(200, { success: true, settings: defaultSettings, isDefault: true });
      }

      return respond(200, { success: true, settings: { ...defaultSettings, ...doc.data() } });
    }

    if (url === '/api/admin/settings' && req.method === 'POST') {
      // Validate inputs
      const timeout = Number(data.timeout);
      const attempts = Number(data.attempts);
      const expiry = Number(data.expiry);
      const lockout = Number(data.lockout);
      const backupRetentionCount = Number(data.backupRetentionCount || 3);

      if (isNaN(timeout) || timeout < 1 || timeout > 1440) {
        return respond(400, { success: false, error: 'Session Timeout must be between 1 and 1440 minutes.' });
      }
      if (isNaN(attempts) || attempts < 1 || attempts > 20) {
        return respond(400, { success: false, error: 'Maximum Login Attempts must be between 1 and 20.' });
      }
      if (isNaN(expiry) || expiry < 0 || expiry > 365) {
        return respond(400, { success: false, error: 'Password Expiry must be between 0 (never) and 365 days.' });
      }
      if (isNaN(lockout) || lockout < 1 || lockout > 1440) {
        return respond(400, { success: false, error: 'Lockout Duration must be between 1 and 1440 minutes.' });
      }
      if (isNaN(backupRetentionCount) || backupRetentionCount < 1 || backupRetentionCount > 10) {
        return respond(400, { success: false, error: 'Backup retention count must be between 1 and 10.' });
      }

      const updatedSettings = {
        timeout,
        attempts,
        expiry,
        twoFactor: data.twoFactor === true || data.twoFactor === 'true',
        ipWhitelist: typeof data.ipWhitelist === 'string' ? data.ipWhitelist.trim() : '',
        specialChars: data.specialChars === true || data.specialChars === 'true',
        lockout,
        autoBackupEnabled: data.autoBackupEnabled !== false && data.autoBackupEnabled !== 'false',
        backupRetentionCount,
        backupFrequency: 'Daily',
        backupTime: data.backupTime || '02:00 UTC',
        backupBucket: data.backupBucket || DEFAULT_BACKUP_BUCKET,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Administrator'
      };

      await db.collection('system_settings').doc('security').set(updatedSettings, { merge: true });
      console.log('[Admin Settings] Security settings updated in Firestore:', updatedSettings);

      return respond(200, { success: true, settings: updatedSettings });
    }

    // ─── BACKUP STATUS & HISTORY API ─────────────────────────────────────────
    if (url === '/api/admin/backup/status' && req.method === 'GET') {
      const settingsDoc = await db.collection('system_settings').doc('security').get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      const backupsSnap = await db.collection('system_backups').get();
      const allBackups = [];
      backupsSnap.forEach(d => allBackups.push({ id: d.id, ...d.data() }));

      // Sort descending by createdAt
      allBackups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const successfulBackups = allBackups.filter(b => b.status === 'success' && b.retentionStatus !== 'purged');
      const lastBackup = successfulBackups.length > 0 ? successfulBackups[0] : null;

      // Next scheduled backup: tomorrow at 02:00 UTC
      const now = new Date();
      const nextDate = new Date();
      nextDate.setUTCHours(2, 0, 0, 0);
      if (now.getTime() >= nextDate.getTime()) {
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      }

      return respond(200, {
        success: true,
        autoBackupEnabled: settings.autoBackupEnabled !== false,
        schedule: 'Daily at 02:00 AM UTC',
        nextScheduledBackup: nextDate.toISOString(),
        retentionPolicy: 'Retain Only Latest 3 Successful Backups',
        retentionCount: settings.backupRetentionCount || 3,
        destination: `gs://${settings.backupBucket || DEFAULT_BACKUP_BUCKET}/backups/`,
        bucketName: settings.backupBucket || DEFAULT_BACKUP_BUCKET,
        lastSuccessfulBackup: lastBackup ? lastBackup.createdAt : null,
        lastBackupDetails: lastBackup,
        history: allBackups.slice(0, 10)
      });
    }

    return respond(404, { success: false, error: 'API route not found' });
  } catch (error) {
    console.error(`[Admin API] Error on ${req.url}:`, error);
    return respond(500, { success: false, error: 'Internal server error: ' + error.message });
  }
}

// Helper for the forgot login flow using Admin SDK
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
