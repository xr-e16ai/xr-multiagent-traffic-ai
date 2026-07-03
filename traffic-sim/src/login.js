import { auth, db } from "./firebase-config.js";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

let confirmationResult = null;

document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("login-name");
  const phoneInput = document.getElementById("login-phone");
  const otpInput = document.getElementById("login-otp");
  const sendOtpBtn = document.getElementById("send-otp-btn");
  const verifyOtpBtn = document.getElementById("verify-otp-btn");
  const msgEl = document.getElementById("login-msg");
  
  const step1 = document.getElementById("step-1");
  const step2 = document.getElementById("step-2");
  const stepSuccess = document.getElementById("step-success");

  function showError(msg) {
    msgEl.innerText = msg;
    msgEl.classList.add("visible");
    setTimeout(() => { msgEl.classList.remove("visible"); }, 4000);
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

  // Input Validation
  function validateStep1() {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const isPhoneValid = /^\d{10}$/.test(phone);
    const isNameValid = name.length > 0;
    
    if (isNameValid && isPhoneValid) {
      sendOtpBtn.disabled = false;
    } else {
      sendOtpBtn.disabled = true;
    }
  }

  function validateStep2() {
    const otp = otpInput.value.trim();
    verifyOtpBtn.disabled = !/^\d{6}$/.test(otp);
  }

  nameInput.addEventListener("input", validateStep1);
  phoneInput.addEventListener("input", (e) => {
    // Force numbers only
    e.target.value = e.target.value.replace(/\D/g, '');
    validateStep1();
  });
  
  otpInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    validateStep2();
  });

  // Init reCAPTCHA
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'normal',
    'callback': (response) => {
      // Re-validate just to be sure
      validateStep1();
    },
    'expired-callback': () => {
      showError("Recaptcha expired. Please solve it again.");
      sendOtpBtn.disabled = true;
    }
  });
  
  window.recaptchaVerifier.render();

  sendOtpBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const phone = "+91" + phoneInput.value.trim();
    
    setLoading(sendOtpBtn, true);

    try {
      confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      step1.style.display = "none";
      step2.style.display = "block";
      otpInput.focus();
    } catch (error) {
      console.error(error);
      showError(error.message || "Failed to send OTP.");
      window.recaptchaVerifier.render().then((widgetId) => {
        grecaptcha.reset(widgetId);
      });
    } finally {
      setLoading(sendOtpBtn, false);
    }
  });

  verifyOtpBtn.addEventListener("click", async () => {
    const code = otpInput.value.trim();
    setLoading(verifyOtpBtn, true);

    try {
      const result = await confirmationResult.confirm(code);
      const user = result.user;
      
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      const now = new Date().toISOString();

      if (docSnap.exists()) {
        // Existing user, update lastLogin
        await setDoc(docRef, { lastLogin: now }, { merge: true });
      } else {
        // New user
        await setDoc(docRef, {
          uid: user.uid,
          fullName: nameInput.value.trim(),
          mobileNumber: "+91" + phoneInput.value.trim(),
          createdAt: now,
          lastLogin: now,
          isApproved: false,
          role: "user",
          subscriptionStatus: "pending"
        });
      }

      step2.style.display = "none";
      stepSuccess.style.display = "flex";
      msgEl.style.display = "none";
      
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1500);
      
    } catch (error) {
      console.error(error);
      showError("Invalid OTP. Please try again.");
    } finally {
      setLoading(verifyOtpBtn, false);
    }
  });
});
