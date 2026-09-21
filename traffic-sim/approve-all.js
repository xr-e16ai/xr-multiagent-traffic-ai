import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRiI-yHfl7Ja_icXP2dVRGTAlQRiPU_ys",
  authDomain: "multi-agent-traffic-sim-2026.firebaseapp.com",
  projectId: "multi-agent-traffic-sim-2026",
  storageBucket: "multi-agent-traffic-sim-2026.firebasestorage.app",
  messagingSenderId: "127494752654",
  appId: "1:127494752654:web:a13425ebded83d2ef27cdf"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "default");

async function approveAll() {
  try {
    console.log("Fetching users...");
    const usersSnap = await getDocs(collection(db, "users"));
    console.log(`Total users in DB: ${usersSnap.docs.length}`);
    let count = 0;
    for (const userDoc of usersSnap.docs) {
      console.log(`User: ${userDoc.id}, Data:`, userDoc.data());
      if (userDoc.data().isApproved !== true) {
        await updateDoc(doc(db, "users", userDoc.id), { isApproved: true });
        count++;
        console.log(`Approved user: ${userDoc.id}`);
      }
    }
    console.log(`Successfully approved ${count} users.`);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

approveAll();
