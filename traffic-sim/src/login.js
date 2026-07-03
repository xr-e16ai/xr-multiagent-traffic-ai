import { auth } from "./firebase-config.js";
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword } from "firebase/auth";

let confirmationResult = null;

document.addEventListener("DOMContentLoaded", () => {
  const sendOtpBtn = document.getElementById("send-otp-btn");
  const verifyOtpBtn = document.getElementById("verify-otp-btn");
  const otpSection = document.getElementById("otp-section");
  const msgEl = document.getElementById("login-msg");
  const phoneInput = document.getElementById("login-phone");
  const otpInput = document.getElementById("login-otp");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const loginEmailBtn = document.getElementById("login-email-btn");

  // Setup reCAPTCHA
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'normal',
    'callback': (response) => {
      sendOtpBtn.disabled = false;
    }
  });

  loginEmailBtn.addEventListener("click", async () => {
    msgEl.style.color = "white";
    msgEl.innerText = "Logging in...";
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      msgEl.style.color = "red";
      msgEl.innerText = "Please enter both email and password.";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      msgEl.style.color = "green";
      msgEl.innerText = "Login successful! Redirecting...";
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1000);
    } catch (error) {
      console.error(error);
      msgEl.style.color = "red";
      msgEl.innerText = "Invalid credentials. Please try again.";
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
      await confirmationResult.confirm(code);
      msgEl.style.color = "green";
      msgEl.innerText = "Login successful! Redirecting...";
      
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1000);
      
    } catch (error) {
      console.error(error);
      msgEl.style.color = "red";
      msgEl.innerText = "Invalid OTP. Please try again.";
    }
  });
});
