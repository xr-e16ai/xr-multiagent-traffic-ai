// Deep API key + project verification test
// Run: node verify-apikey.mjs
import { default as fetch } from 'node-fetch';

const API_KEY = "AIzaSyBRiI-yHfl7Ja_icXP2dVRGTAlQRiPU_ys";
const PROJECT_ID = "multi-agent-traffic-sim-2026";

console.log("=== DEEP FIREBASE PROJECT/API KEY VERIFICATION ===\n");

// TEST 1: Verify API key is valid by hitting Firebase Auth REST API
// This tells us which project the API key belongs to
console.log("TEST 1: Verifying API key via Firebase Auth REST...");
try {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
  );
  const data = await r.json();
  console.log("  HTTP Status:", r.status);
  // A valid key returns 400 (missing fields), an invalid key returns 400 with INVALID_API_KEY
  if (data.error) {
    console.log("  Error code:", data.error.status || data.error.message);
    if (data.error.message?.includes("INVALID_API_KEY")) {
      console.log("  ❌ API KEY IS INVALID or wrong project");
    } else {
      console.log("  ✅ API KEY IS VALID (error is expected for empty body)");
    }
  }
} catch (e) {
  console.log("  Network error:", e.message);
}

console.log("");

// TEST 2: Try Firestore REST with authentication workaround
// Use the public Google Identity endpoint to check project
console.log("TEST 2: Checking Firebase project config endpoint...");
try {
  const r = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}?key=${API_KEY}`
  );
  const text = await r.text();
  console.log("  HTTP Status:", r.status);
  console.log("  Response (first 300 chars):", text.substring(0, 300));
} catch (e) {
  console.log("  Network error:", e.message);
}

console.log("");

// TEST 3: Check Firestore REST with key - direct database check
console.log("TEST 3: Checking Firestore REST API for database existence...");
try {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)?key=${API_KEY}`
  );
  const text = await r.text();
  console.log("  HTTP Status:", r.status);
  console.log("  Response:", text.substring(0, 400));
} catch (e) {
  console.log("  Network error:", e.message);
}

console.log("");

// TEST 4: Check if the Firestore API endpoint responds for a KNOWN working project
// Using a dummy/sample Google project that has Firestore enabled to confirm network is working
console.log("TEST 4: Testing Firestore API availability (network check)...");
try {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/firebase-sdks/databases`
  );
  console.log("  HTTP Status:", r.status, "(just checking API is reachable)");
} catch (e) {
  console.log("  Network error:", e.message);
}

console.log("\n=== VERIFICATION COMPLETE ===");
process.exit(0);
