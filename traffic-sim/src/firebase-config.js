import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace this with your actual Firebase config object from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBRiI-yHfl7Ja_icXP2dVRGTAlQRiPU_ys",
  authDomain: "multi-agent-traffic-sim-2026.firebaseapp.com",
  projectId: "multi-agent-traffic-sim-2026",
  storageBucket: "multi-agent-traffic-sim-2026.firebasestorage.app",
  messagingSenderId: "127494752654",
  appId: "1:127494752654:web:a13425ebded83d2ef27cdf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };
