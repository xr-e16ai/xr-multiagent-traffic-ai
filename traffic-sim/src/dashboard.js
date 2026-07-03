import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {
  const welcomeText = document.getElementById("welcome-text");
  const statusPhone = document.getElementById("status-phone");
  const statusPayment = document.getElementById("status-payment");
  const statusSimulation = document.getElementById("status-simulation");
  const lockMessage = document.getElementById("lock-message");
  const startSimulationBtn = document.getElementById("start-simulation-btn");
  const logoutBtn = document.getElementById("logout-btn");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          
          welcomeText.innerText = `Welcome, ${userData.name || 'User'}`;
          statusPhone.innerText = userData.otpVerified ? "✅ Verified" : "❌ Pending";
          statusPayment.innerText = userData.paymentStatus ? "✅ Paid" : "❌ Pending";
          statusSimulation.innerText = userData.simulationAccess ? "✅ Approved" : "❌ Locked";

          if (userData.simulationAccess) {
            startSimulationBtn.disabled = false;
            startSimulationBtn.style.background = "#4caf50";
            lockMessage.style.display = "none";
          } else {
            startSimulationBtn.disabled = true;
            startSimulationBtn.style.background = "#555";
            startSimulationBtn.style.cursor = "not-allowed";
            lockMessage.style.display = "block";
          }
        } else {
          welcomeText.innerText = "Welcome, User";
          lockMessage.style.display = "block";
          lockMessage.innerText = "User profile not found. Please register properly.";
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    } else {
      window.location.href = "/login.html";
    }
  });

  startSimulationBtn.addEventListener("click", () => {
    window.location.href = "/";
  });

  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/login.html";
  });
});
