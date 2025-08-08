//register.js
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { sanitizeHTML, showMessage, setButtonLoading, t } from "./utils.js"; // 🐛 Fix: added missing utilities and translation function

// Strong password regex (at least 8 characters, one uppercase, one lowercase, one number, and one special character)
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  // Default to customer role since selection removed
const role = 'customer';
  const submitButton = document.querySelector("#register-form button[type=submit]");

  // Validation checks
  if (!name || !email || !password || !confirmPassword) {
    showMessage(t('register_validation'), 'error', t('missing_field'));
    return;
  }

  if (password !== confirmPassword) {
    showMessage(t('password_mismatch'), 'error', t('password_error_title'));
    return;
  }

  if (!strongPasswordRegex.test(password)) {
    showMessage(
      t('weak_password_description'),
      'error',
      t('weak_password_title')
    );
    return;
  }

  // Show loading indicator
  const loader = setButtonLoading(submitButton, t('register_loading'));

  try {
    // Create user with email and password
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Save user data to Firestore with the selected role
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      role: role,
      createdAt: serverTimestamp(),
    });

    showMessage(t('register_success'), 'success', t('welcome'));
    
    // Redirect to index.html to let auth-check.js handle role-based navigation
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    console.error("❌ خطأ في إنشاء الحساب:", error);
    let errorMessage = "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.";
    
    // Handle specific Firebase errors
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = t('email_exists');
        break;
      case 'auth/invalid-email':
        errorMessage = t('invalid_email');
        break;
      case 'auth/weak-password':
        errorMessage = t('weak_password');
        break;
      case 'auth/network-request-failed':
        errorMessage = t('network_error');
        break;
    }
    
    showMessage(errorMessage, 'error', t('register_error_title'));
  } finally {
    // Hide loading indicator
    if (loader && typeof loader.stop === 'function') {
      loader.stop();
    }
  }
});