import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {
  const loadingState = document.getElementById("loading-state");
  const pendingState = document.getElementById("pending-state");
  const approvedState = document.getElementById("approved-state");
  const welcomeText = document.getElementById("welcome-text");
  
  const startSimulationBtn = document.getElementById("start-simulation-btn");
  const logoutBtn = document.getElementById("logout-btn");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        loadingState.style.display = "none";
        logoutBtn.style.display = "block";

        if (docSnap.exists()) {
          const userData = docSnap.data();
          
          if (userData.isApproved === true) {
            welcomeText.innerText = `Welcome, ${userData.fullName || 'User'}`;
            approvedState.style.display = "block";
            pendingState.style.display = "none";
          } else {
            approvedState.style.display = "none";
            pendingState.style.display = "block";
          }
        } else {
          // Document missing - treat as pending/error
          pendingState.style.display = "block";
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        loadingState.style.display = "none";
        pendingState.style.display = "block";
        logoutBtn.style.display = "block";
      }
    } else {
      window.location.href = "/login.html";
    }
  });

  if (startSimulationBtn) {
    startSimulationBtn.addEventListener("click", () => {
      window.location.href = "/";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "/login.html";
    });
  }
});
