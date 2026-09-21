import { auth, db } from "./firebase-config.js";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { collection, doc, getDocs, getDoc, setDoc, query, where } from "firebase/firestore";

let confirmationResult = null;

// Normalization function
function normalizeString(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Replace multiple spaces with a single space
}

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const viewLanding = document.getElementById("view-landing");
  const viewSignup = document.getElementById("view-signup");
  const viewSignupSuccess = document.getElementById("view-signup-success");
  const viewReturning = document.getElementById("view-returning");
  const forgotModal = document.getElementById("forgot-modal");
  
  // Buttons for navigation
  const navSignupBtn = document.getElementById("nav-signup-btn");
  const navReturningBtn = document.getElementById("nav-returning-btn");
  const backBtns = document.querySelectorAll(".back-btn");
  const navFromSuccessBtn = document.getElementById("nav-from-success-btn");
  const forgotNameLink = document.getElementById("forgot-name-link");
  const closeModalBtn = document.getElementById("close-modal-btn");
  
  // Message elements
  const loginMsg = document.getElementById("login-msg");
  const forgotMsg = document.getElementById("forgot-msg");
  
  // Sign up fields
  const signupName = document.getElementById("signup-name");
  const signupOrg = document.getElementById("signup-org");
  const signupEmail = document.getElementById("signup-email");
  const signupPhone = document.getElementById("signup-phone");
  const signupSendOtpBtn = document.getElementById("signup-send-otp-btn");
  const signupStep1 = document.getElementById("signup-step-1");
  
  const signupOtp = document.getElementById("signup-otp");
  const signupVerifyOtpBtn = document.getElementById("signup-verify-otp-btn");
  const signupStep2 = document.getElementById("signup-step-2");
  
  const signupFinalBtn = document.getElementById("signup-final-btn");
  
  // Sign in fields
  const signinStep1 = document.getElementById("signin-step-1");
  const signinStep2 = document.getElementById("signin-step-2");
  const signinName = document.getElementById("signin-name");
  const signinPhone = document.getElementById("signin-phone");
  const signinSendOtpBtn = document.getElementById("signin-send-otp-btn");
  const signinOtp = document.getElementById("signin-otp");
  const signinVerifyBtn = document.getElementById("signin-verify-btn");
  
  // Forgot fields
  const forgotPhone = document.getElementById("forgot-phone");
  const forgotSubmitBtn = document.getElementById("forgot-submit-btn");

  // State
  let otpVerified = false;
  let verifiedUid = null;
  
  // Utility functions
  function showView(view) {
    document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
    view.classList.add("active");
    hideError();
  }
  
  function showError(msgEl, msg) {
    msgEl.innerText = msg;
    msgEl.classList.add("visible");
    setTimeout(() => { msgEl.classList.remove("visible"); }, 4000);
  }
  
  function hideError() {
    loginMsg.classList.remove("visible");
    forgotMsg.classList.remove("visible");
  }

  function setLoading(btn, isLoading) {
    if (isLoading) {
      btn.classList.add("loading");
      btn.disabled = true;
    } else {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  // Navigation Logic
  navSignupBtn.addEventListener("click", () => showView(viewSignup));
  navReturningBtn.addEventListener("click", () => showView(viewReturning));
  navFromSuccessBtn.addEventListener("click", () => showView(viewReturning));
  
  backBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const targetId = e.target.getAttribute("data-target");
      showView(document.getElementById(targetId));
    });
  });

  forgotNameLink.addEventListener("click", () => {
    forgotModal.classList.add("active");
  });
  
  closeModalBtn.addEventListener("click", () => {
    forgotModal.classList.remove("active");
  });

  // ========== SIGN UP LOGIC ==========
  
  function validateSignupStep1() {
    const name = signupName.value.trim();
    const org = signupOrg.value.trim();
    const email = signupEmail.value.trim();
    const phone = signupPhone.value.trim();
    
    // Basic email regex for front-end check
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValid = name.length > 0 && org.length > 0 && emailValid && /^\d{10}$/.test(phone);
    signupSendOtpBtn.disabled = !isValid;
  }
  
  signupName.addEventListener("input", validateSignupStep1);
  signupOrg.addEventListener("input", validateSignupStep1);
  signupEmail.addEventListener("input", validateSignupStep1);
  signupPhone.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    validateSignupStep1();
  });
  
  signupOtp.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    signupVerifyOtpBtn.disabled = !/^\d{6}$/.test(e.target.value.trim());
  });

  // reCAPTCHA init
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'normal',
    'callback': (response) => {
      validateSignupStep1();
    },
    'expired-callback': () => {
      showError(loginMsg, "Recaptcha expired. Please solve it again.");
      signupSendOtpBtn.disabled = true;
    }
  });

  window.recaptchaVerifier.render();

  // ── Dedicated invisible verifier for Returning User OTP ──
  window.signinRecaptchaVerifier = new RecaptchaVerifier(auth, 'signin-recaptcha-container', {
    'size': 'invisible'
  });

  signupSendOtpBtn.addEventListener("click", async () => {
    const phone = "+91" + signupPhone.value.trim();
    setLoading(signupSendOtpBtn, true);

    try {
      confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      signupStep1.style.display = "none";
      signupStep2.style.display = "block";
      signupOtp.focus();
    } catch (error) {
      console.error(error);
      showError(loginMsg, error.message || "Failed to send OTP.");
      window.recaptchaVerifier.render().then((widgetId) => {
        grecaptcha.reset(widgetId);
      });
    } finally {
      setLoading(signupSendOtpBtn, false);
    }
  });

  signupVerifyOtpBtn.addEventListener("click", async () => {
    const code = signupOtp.value.trim();
    setLoading(signupVerifyOtpBtn, true);

    try {
      const result = await confirmationResult.confirm(code);
      verifiedUid = result.user.uid;
      otpVerified = true;
      
      signupStep2.style.display = "none";
      signupFinalBtn.disabled = false;
    } catch (error) {
      console.error(error);
      showError(loginMsg, "Invalid OTP code.");
    } finally {
      setLoading(signupVerifyOtpBtn, false);
    }
  });

  signupFinalBtn.addEventListener("click", async () => {
    if (!otpVerified || !verifiedUid) return;
    
    setLoading(signupFinalBtn, true);
    
    try {
      const rawName = signupName.value.trim();
      const rawOrg = signupOrg.value.trim();
      const rawEmail = signupEmail.value.trim();
      const rawPhone = "+91" + signupPhone.value.trim();
      const now = new Date().toISOString();
      
      // ── DIAGNOSTIC: log pre-write state ──
      console.log("[SIGNUP] Attempting Firestore write...");
      console.log("[SIGNUP] UID:", verifiedUid);
      console.log("[SIGNUP] Target path: users/" + verifiedUid);
      console.log("[SIGNUP] DB object:", db);
      
      const docRef = doc(db, "users", verifiedUid);
      
      await setDoc(docRef, {
        uid: verifiedUid,
        fullName: rawName,
        fullNameNormalized: normalizeString(rawName),
        organizationName: rawOrg,
        organizationNameNormalized: normalizeString(rawOrg),
        email: rawEmail,
        mobileNumber: rawPhone,
        createdAt: now,
        lastLogin: now,
        role: "user",
        isApproved: false,
        subscriptionStatus: "pending",
        instructionAccepted: false
      });
      
      console.log("[SIGNUP] ✅ Firestore write SUCCESS");
      showView(viewSignupSuccess);
      
    } catch (error) {
      // ── DIAGNOSTIC: full error breakdown ──
      console.error("=== FIRESTORE WRITE ERROR ===");
      console.error("code:", error.code);
      console.error("message:", error.message);
      console.error("name:", error.name);
      console.error("full error object:", error);
      console.error("============================");
      showError(loginMsg, "Error creating account. Please try again.");
    } finally {
      setLoading(signupFinalBtn, false);
    }
  });

  // ========== RETURNING USER LOGIC ==========
  
  function validateSigninStep1() {
    const name = signinName.value.trim();
    const phone = signinPhone.value.trim();
    const isValid = name.length > 0 && /^\d{10}$/.test(phone);
    signinSendOtpBtn.disabled = !isValid;
  }
  
  signinName.addEventListener("input", validateSigninStep1);
  signinPhone.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    validateSigninStep1();
  });

  signinOtp.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    signinVerifyBtn.disabled = !/^\d{6}$/.test(e.target.value.trim());
  });
  
  signinSendOtpBtn.addEventListener("click", async () => {
    const phone = "+91" + signinPhone.value.trim();
    setLoading(signinSendOtpBtn, true);
    
    try {
      // Use the dedicated returning-user verifier (invisible, separate from signup)
      confirmationResult = await signInWithPhoneNumber(auth, phone, window.signinRecaptchaVerifier);
      signinStep1.style.display = "none";
      signinStep2.style.display = "block";
      signinOtp.focus();
    } catch (error) {
      console.error(error);
      showError(loginMsg, error.message || "Failed to send OTP.");
      // Reset the invisible verifier on error so it can be reused
      if (window.signinRecaptchaVerifier) {
        window.signinRecaptchaVerifier.clear();
        window.signinRecaptchaVerifier = new RecaptchaVerifier(auth, 'signin-recaptcha-container', {
          'size': 'invisible'
        });
      }
    } finally {
      setLoading(signinSendOtpBtn, false);
    }
  });
  
  signinVerifyBtn.addEventListener("click", async () => {
    const code = signinOtp.value.trim();
    const rawName = signinName.value.trim();
    const normalizedEnteredName = normalizeString(rawName);
    
    setLoading(signinVerifyBtn, true);
    
    try {
      // 1. Verify OTP
      const result = await confirmationResult.confirm(code);
      const uid = result.user.uid;
      
      // 2. Read User Document securely by UID
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        showError(loginMsg, "No User Found\nPlease register first.");
        // Reset view
        signinStep2.style.display = "none";
        signinStep1.style.display = "block";
        return;
      }
      
      const userData = userDoc.data();
      
      // 3. Compare Name (Client-side UX check)
      const isMatch = (userData.fullNameNormalized === normalizedEnteredName) ||
                      (userData.fullName && userData.fullName.toLowerCase().trim() === rawName.toLowerCase());
                      
      if (isMatch) {
        // Match! Update last login and redirect
        const now = new Date().toISOString();
        await setDoc(userDocRef, { lastLogin: now }, { merge: true });
        
        sessionStorage.setItem("loginStatus", "true");
        sessionStorage.setItem("uid", uid);
        sessionStorage.setItem("fullName", userData.fullName);
        
        window.location.href = "/dashboard.html";
      } else {
        showError(loginMsg, "Invalid User\nThe entered Full Name does not match our records.");
        signinStep2.style.display = "none";
        signinStep1.style.display = "block";
      }
      
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/invalid-verification-code') {
        showError(loginMsg, "Invalid OTP code.");
      } else {
        showError(loginMsg, "Error verifying user. Please try again.");
      }
    } finally {
      setLoading(signinVerifyBtn, false);
    }
  });

  // ========== FORGOT YOUR NAME LOGIC ==========
  
  forgotPhone.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    forgotSubmitBtn.disabled = !/^\d{10}$/.test(e.target.value.trim());
  });
  
  forgotSubmitBtn.addEventListener("click", async () => {
    const phone = "+91" + forgotPhone.value.trim();
    
    setLoading(forgotSubmitBtn, true);
    
    try {
      const response = await fetch("/send-forgot-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phoneNumber: phone
        })
      });
      
      if (response.ok) {
        forgotMsg.style.color = "#52c41a";
        showError(forgotMsg, "Your Login User Name and Handphone will be sent to your registered email address.");
        setTimeout(() => { forgotMsg.style.color = ""; }, 4000);
      } else {
        showError(forgotMsg, "If an account is registered with this handphone number, the login information will be sent to the registered email address.");
      }
    } catch (error) {
      console.error("Backend fetch error:", error);
      showError(forgotMsg, "If an account is registered with this handphone number, the login information will be sent to the registered email address.");
    } finally {
      setLoading(forgotSubmitBtn, false);
    }
  });
});
