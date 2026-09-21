// Firestore SDK Test — uses same config as firebase-config.js
// Run with: node firestore-sdk-test.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBRiI-yHfl7Ja_icXP2dVRGTAlQRiPU_ys",
  authDomain: "multi-agent-traffic-sim-2026.firebaseapp.com",
  projectId: "multi-agent-traffic-sim-2026",
  storageBucket: "multi-agent-traffic-sim-2026.firebasestorage.app",
  messagingSenderId: "127494752654",
  appId: "1:127494752654:web:a13425ebded83d2ef27cdf"
};

console.log("=== FIREBASE SDK FIRESTORE DIAGNOSTIC ===");
console.log("Project ID :", firebaseConfig.projectId);
console.log("App ID     :", firebaseConfig.appId);
console.log("Auth Domain:", firebaseConfig.authDomain);
console.log("");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase app initialized OK");
console.log("Firestore db object created OK");
console.log("");

// TEST 1: Read from 'test' collection (already exists)
console.log("TEST 1: Reading from 'test' collection...");
try {
  const snap = await getDocs(collection(db, 'test'));
  console.log("✅ READ SUCCESS — docs found:", snap.size);
  snap.forEach(d => console.log("  Doc:", d.id, JSON.stringify(d.data())));
} catch (err) {
  console.error("❌ READ FAILED:", err.code, err.message);
}

console.log("");

// TEST 2: Read from 'users' collection
console.log("TEST 2: Reading from 'users' collection...");
try {
  const snap = await getDocs(collection(db, 'users'));
  console.log("✅ READ SUCCESS — docs found:", snap.size);
} catch (err) {
  console.error("❌ READ FAILED:", err.code, err.message);
}

console.log("");

// TEST 3: Write a test document
console.log("TEST 3: Writing test document...");
try {
  await setDoc(doc(db, 'sdk-test', 'ping'), {
    timestamp: new Date().toISOString(),
    source: 'firestore-sdk-test.mjs'
  });
  console.log("✅ WRITE SUCCESS");
} catch (err) {
  console.error("❌ WRITE FAILED:", err.code, err.message);
}

console.log("");
console.log("=== TEST COMPLETE ===");
process.exit(0);
