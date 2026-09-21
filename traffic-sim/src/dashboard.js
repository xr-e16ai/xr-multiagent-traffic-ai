import { db } from "./firebase-config.js";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", async () => {
  const loadingState = document.getElementById("loading-state");
  const pendingState = document.getElementById("pending-state");
  const approvedState = document.getElementById("approved-state");
  const welcomeText = document.getElementById("welcome-text");
  
  const startSimulationBtn = document.getElementById("start-simulation-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // Check application session
  const loginStatus = sessionStorage.getItem("loginStatus");
  const uid = sessionStorage.getItem("uid");

  if (loginStatus === "true" && uid) {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      loadingState.style.display = "none";
      logoutBtn.style.display = "block";

      if (docSnap.exists()) {
        const userData = docSnap.data();
        welcomeText.innerText = `Welcome, ${userData.fullName || 'User'}`;
        approvedState.style.display = "block";
        pendingState.style.display = "none";
      } else {
        // Document missing - treat as pending/error
        pendingState.style.display = "block";
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      loadingState.style.display = "none";
      pendingState.style.display = "block";
      if (error.code === 'unavailable' || error.message?.includes("NOT_FOUND") || error.code === 5) {
          welcomeText.innerText = `Database Connection Error`;
          approvedState.style.display = "none";
      }
      logoutBtn.style.display = "block";
    }
  } else {
    window.location.href = "/login.html";
  }

  if (startSimulationBtn) {
    startSimulationBtn.addEventListener("click", () => {
      // If instructions already accepted in this browser, skip straight to simulation
      if (localStorage.getItem("instructionAccepted") === "true") {
        window.location.href = "/";
      } else {
        window.location.href = "/instruction.html";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.href = "/login.html";
    });
  }
});
