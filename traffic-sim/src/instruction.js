import { db } from "./firebase-config.js";
import { doc, getDoc } from "firebase/firestore";
// ─── AGENT CARDS DATA ───
const AGENTS = [
  {
    icon: "🚶",
    title: "AI Pedestrian Agent",
    desc: "AI pedestrians intelligently decide whether to CROSS or WAIT based on vehicle speed, distance and traffic signal state."
  },
  {
    icon: "🚗",
    title: "AI Driver Agent",
    desc: "AI drivers continuously analyse the road ahead and decide whether to BRAKE, STOP or ACCELERATE based on real-time conditions."
  },
  {
    icon: "🚦",
    title: "AI Traffic Light Agent",
    desc: "Traffic signals automatically change state according to road conditions and pedestrian safety requirements."
  },
  {
    icon: "⚠️",
    title: "AI Safety Agent",
    desc: "The Safety Agent continuously evaluates road conditions and predicts collision risk, issuing real-time alerts."
  }
];

// ─── VIDEO CARDS DATA (extend this array to add more videos later) ───
const VIDEOS = [
  {
    title: "Pedestrian Crossing Simulation",
    src:   "/assets/videos/pedestrian-demo.mp4",
    desc:  "Observe how AI pedestrians intelligently react to approaching vehicles and signal states."
  },
  {
    title: "Driver Behaviour",
    src:   "/assets/videos/driver-demo.mp4",
    desc:  "See how AI vehicles brake and accelerate dynamically based on road conditions."
  },
  {
    title: "Traffic Signal Intelligence",
    src:   "/assets/videos/traffic-light-demo.mp4",
    desc:  "Watch how the AI Traffic Light Agent controls signals dynamically in real time."
  },
  {
    title: "Risk Detection",
    src:   "/assets/videos/safety-demo.mp4",
    desc:  "See how the AI Safety Agent predicts dangerous situations before they occur."
  }
];

// ─── RENDER AGENT CARDS ───
function renderAgentCards() {
  const grid = document.getElementById("agent-grid");
  if (!grid) return;
  grid.innerHTML = AGENTS.map(a => `
    <div class="agent-card">
      <span class="agent-icon">${a.icon}</span>
      <h3>${a.title}</h3>
      <p>${a.desc}</p>
    </div>
  `).join("");
}

// ─── RENDER VIDEO CARDS ───
// Videos fall back to a styled placeholder if the file is missing or fails to load.
function renderVideoCards() {
  const grid = document.getElementById("video-grid");
  if (!grid) return;

  grid.innerHTML = VIDEOS.map((v, i) => `
    <div class="video-card">
      <div class="video-wrapper">
        <video
          id="video-${i}"
          controls
          muted
          preload="none"
          loading="lazy"
          style="border-radius:0;"
        >
          <source src="${v.src}" type="video/mp4">
          <source src="${v.src.replace('.mp4','.webm')}" type="video/webm">
        </video>
        <div class="video-placeholder" id="placeholder-${i}">
          <span class="ph-icon">🎬</span>
          <p>Simulation Preview<br><strong>Coming Soon</strong></p>
        </div>
      </div>
      <div class="video-card-body">
        <h4>${v.title}</h4>
        <p>${v.desc}</p>
      </div>
    </div>
  `).join("");

  // If video fails (file missing), show placeholder
  VIDEOS.forEach((_, i) => {
    const video = document.getElementById(`video-${i}`);
    const placeholder = document.getElementById(`placeholder-${i}`);
    if (!video || !placeholder) return;

    const showPlaceholder = () => {
      video.style.display = "none";
      placeholder.style.display = "flex";
    };

    video.addEventListener("error", showPlaceholder);

    // If src is empty or after a brief check
    video.addEventListener("loadedmetadata", () => {
      placeholder.style.display = "none";
      video.style.display = "block";
    });

    // Proactively check if the video can be loaded
    fetch(video.querySelector("source")?.src || "", { method: "HEAD" })
      .then(res => { if (!res.ok) showPlaceholder(); })
      .catch(() => showPlaceholder());
  });
}

// ─── CONFIRMATION LOGIC ───
function setupConfirmation() {
  const checkbox    = document.getElementById("accept-checkbox");
  const continueBtn = document.getElementById("continue-btn");
  if (!checkbox || !continueBtn) return;

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      continueBtn.disabled = false;
      continueBtn.setAttribute("aria-disabled", "false");
      continueBtn.classList.add("enabled");
    } else {
      continueBtn.disabled = true;
      continueBtn.setAttribute("aria-disabled", "true");
      continueBtn.classList.remove("enabled");
    }
  });

  continueBtn.addEventListener("click", async () => {
    if (continueBtn.disabled) return;
    
    const uid = sessionStorage.getItem("uid");
    if (!uid) {
      window.location.href = "/login.html";
      return;
    }
    
    const originalText = continueBtn.innerHTML;
    continueBtn.innerHTML = "Checking Access...";
    continueBtn.disabled = true;
    
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().simulationAccess === true) {
        localStorage.setItem("instructionAccepted", "true");
        window.location.href = "/";
      } else {
        // Show "Simulation Access Restricted" section and hide the confirmation card
        document.getElementById("review-section").style.display = "block";
        document.querySelector(".confirm-card").parentElement.style.display = "none";
      }
    } catch (e) {
      console.error("Error checking approval:", e);
      continueBtn.innerHTML = "Error. Try Again";
      continueBtn.disabled = false;
    }
  });
}

// ─── AUTH GUARD ───
// Redirects to login if the user is not authenticated.
if (sessionStorage.getItem("loginStatus") !== "true") {
  window.location.href = "/login.html";
}

// ─── INIT ───
document.addEventListener("DOMContentLoaded", () => {
  renderAgentCards();
  renderVideoCards();
  setupConfirmation();
});
