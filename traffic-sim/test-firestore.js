import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRiI-yHfl7Ja_icXP2dVRGTAlQRiPU_ys",
  authDomain: "multi-agent-traffic-sim-2026.firebaseapp.com",
  projectId: "multi-agent-traffic-sim-2026",
  storageBucket: "multi-agent-traffic-sim-2026.firebasestorage.app",
  messagingSenderId: "127494752654",
  appId: "1:127494752654:web:a13425ebded83d2ef27cdf"
};

import { initializeFirestore } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "default");

async function test() {
  try {
    console.log("Testing Firestore Connection...");
    const docRef = doc(db, "test/connection");
    await setDoc(docRef, { test: "success", time: new Date().toISOString() });
    console.log("Write success!");
    const snap = await getDoc(docRef);
    console.log("Read success! Data:", snap.data());
    process.exit(0);
  } catch (e) {
    console.error("Firestore Error:", e);
    process.exit(1);
  }
}

test();
