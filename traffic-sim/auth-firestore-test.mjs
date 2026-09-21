// Authenticated Firestore REST Test
// Signs in anonymously → gets real Firebase ID token → hits Firestore REST
// Run: node auth-firestore-test.mjs
import { default as fetch } from 'node-fetch';

const API_KEY = "AIzaSyBRiI-yHfl7Ja_icXP2dVRGTAlQRiPU_ys";
const PROJECT_ID = "multi-agent-traffic-sim-2026";

console.log("=== AUTHENTICATED FIRESTORE REST TEST ===\n");

// STEP 1: Sign in anonymously to get a real Firebase ID token
console.log("Step 1: Getting Firebase ID token via anonymous sign-in...");
let idToken = null;
try {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    }
  );
  const data = await r.json();
  if (data.idToken) {
    idToken = data.idToken;
    console.log("  ✅ Firebase ID token obtained (anon user)");
    console.log("  UID:", data.localId);
  } else {
    console.log("  ❌ Failed to get ID token:", JSON.stringify(data));
  }
} catch (e) {
  console.log("  ❌ Network error:", e.message);
}

if (!idToken) {
  console.log("\nCannot continue without ID token.");
  process.exit(1);
}

console.log("");

// STEP 2: Try to READ from 'test' collection using real auth token
console.log("Step 2: Reading 'test' collection with auth token...");
try {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/test`,
    {
      headers: { 'Authorization': `Bearer ${idToken}` }
    }
  );
  const text = await r.text();
  console.log("  HTTP Status:", r.status);
  console.log("  Response:", text.substring(0, 400));
  if (r.status === 200) {
    console.log("  ✅ DATABASE EXISTS AND IS READABLE");
  } else if (r.status === 403) {
    console.log("  ⚠️  DATABASE EXISTS but SECURITY RULES are blocking access");
  } else if (r.status === 404) {
    console.log("  ❌ DATABASE NOT FOUND — database resource does not exist");
  }
} catch (e) {
  console.log("  ❌ Network error:", e.message);
}

console.log("");

// STEP 3: Try to WRITE a document using real auth token  
console.log("Step 3: Writing test document with auth token...");
try {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/auth-test?documentId=ping`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          timestamp: { stringValue: new Date().toISOString() },
          source: { stringValue: 'auth-firestore-test' }
        }
      })
    }
  );
  const text = await r.text();
  console.log("  HTTP Status:", r.status);
  console.log("  Response:", text.substring(0, 400));
  if (r.status === 200) {
    console.log("  ✅ WRITE SUCCESS — database is fully working");
  } else if (r.status === 403) {
    console.log("  ⚠️  WRITE BLOCKED BY SECURITY RULES — database exists but rules deny writes");
  } else if (r.status === 404) {
    console.log("  ❌ DATABASE NOT FOUND — the (default) database does not exist");
  }
} catch (e) {
  console.log("  ❌ Network error:", e.message);
}

console.log("\n=== TEST COMPLETE ===");
process.exit(0);
