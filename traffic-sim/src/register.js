import { auth, db } from "./firebase-config.js";
import { RecaptchaVerifier, signInWithPhoneNumber, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

let confirmationResult = null;

document.addEventListener("DOMContentLoaded", () => {
  const sendOtpBtn = document.getElementById("send-otp-btn");
  const verifyOtpBtn = document.getElementById("verify-otp-btn");
  const otpSection = document.getElementById("otp-section");
  const msgEl = document.getElementById("reg-msg");

  const nameInput = document.getElementById("reg-name");
  const phoneInput = document.getElementById("reg-phone");
  const emailInput = document.getElementById("reg-email");
  const passwordInput = document.getElementById("reg-password");
  const otpInput = document.getElementById("reg-otp");
  const registerEmailBtn = document.getElementById("register-email-btn");

  // Setup reCAPTCHA
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'normal',
    'callback': (response) => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
      sendOtpBtn.disabled = false;
    }
  });

  sendOtpBtn.addEventListener("click", async () => {
    msgEl.style.color = "white";
    msgEl.innerText = "Sending OTP...";
    const phoneNumber = phoneInput.value.trim();

    if (!phoneNumber) {
      msgEl.style.color = "red";
      msgEl.innerText = "Please enter a valid phone number.";
      return;
    }

    try {
      confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      msgEl.style.color = "green";
      msgEl.innerText = "OTP sent successfully!";
      sendOtpBtn.style.display = "none";
      otpSection.style.display = "block";
    } catch (error) {
      console.error(error);
      msgEl.style.color = "red";
      msgEl.innerText = error.message;
      window.recaptchaVerifier.render().then((widgetId) => {
        grecaptcha.reset(widgetId);
      });
    }
  });

  async function saveUserProfile(user) {
    await setDoc(doc(db, "users", user.uid), {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      otpVerified: true,
      paymentStatus: false,
      simulationAccess: false,
      approvedBy: "",
      approvedDate: null,
      registeredDate: new Date().toISOString()
    });
  }

  registerEmailBtn.addEventListener("click", async () => {
    msgEl.style.color = "white";
    msgEl.innerText = "Registering...";
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      msgEl.style.color = "red";
      msgEl.innerText = "Please enter both email and password.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      msgEl.innerText = "Registration successful. Creating profile...";
      await saveUserProfile(userCredential.user);
      
      msgEl.style.color = "green";
      msgEl.innerText = "Profile created! Redirecting...";
      
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1500);
    } catch (error) {
      console.error(error);
      msgEl.style.color = "red";
      msgEl.innerText = error.message;
    }
  });

  verifyOtpBtn.addEventListener("click", async () => {
    msgEl.style.color = "white";
    msgEl.innerText = "Verifying OTP...";
    const code = otpInput.value.trim();

    if (!code) {
      msgEl.style.color = "red";
      msgEl.innerText = "Please enter the OTP.";
      return;
    }

    try {
      const result = await confirmationResult.confirm(code);
      msgEl.innerText = "OTP verified. Creating profile...";
      
      await saveUserProfile(result.user);

      msgEl.style.color = "green";
      msgEl.innerText = "Registration successful! Redirecting...";
      
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1500);
      
    } catch (error) {
      console.error(error);
      msgEl.style.color = "red";
      msgEl.innerText = "Invalid OTP. Please try again.";
    }
  });
});
