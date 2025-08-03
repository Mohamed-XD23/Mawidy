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
import { sanitizeHTML } from "./utils.js";

// Strong password regex (at least 8 characters, one uppercase, one lowercase, one number, and one special character)
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const role = document.getElementById("role").value;
  const submitButton = document.querySelector("#register-form button[type=submit]");

  // Validation checks
  if (!name || !email || !password || !confirmPassword || !role) {
    showMessage("يرجى ملء جميع الحقول.", 'error', 'حقل مفقود');
    return;
  }

  if (password !== confirmPassword) {
    showMessage("كلمات المرور غير متطابقة.", 'error', 'خطأ في كلمة المرور');
    return;
  }

  if (!strongPasswordRegex.test(password)) {
    showMessage(
      "كلمة المرور يجب أن تحتوي على الأقل 8 أحرف، وحرف كبير، وحرف صغير، ورقم، ورمز خاص (@$!%*?&).",
      'error',
      'كلمة مرور ضعيفة'
    );
    return;
  }

  // Show loading indicator
  const loader = setButtonLoading(submitButton, "جارٍ إنشاء الحساب...");

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

    showMessage("تم إنشاء الحساب بنجاح!", 'success', 'مرحبًا بك');
    
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
        errorMessage = "البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.";
        break;
      case 'auth/invalid-email':
        errorMessage = "البريد الإلكتروني غير صحيح.";
        break;
      case 'auth/weak-password':
        errorMessage = "كلمة المرور ضعيفة جداً.";
        break;
      case 'auth/network-request-failed':
        errorMessage = "فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.";
        break;
    }
    
    showMessage(errorMessage, 'error', 'خطأ في إنشاء الحساب');
  } finally {
    // Hide loading indicator
    if (loader && typeof loader.stop === 'function') {
      loader.stop();
    }
  }
});

// Utility function to show messages (similar to login.js)
function showMessage(message, type = 'info', title = '') {
  // Create message element if it doesn't exist
  let messageEl = document.getElementById('message-popup');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'message-popup';
    messageEl.className = 'message-popup';
    document.body.appendChild(messageEl);
  }

  // Set message content
  messageEl.innerHTML = `
    <div class="message-content ${type}">
      <h3>${title || (type === 'success' ? 'نجاح' : type === 'error' ? 'خطأ' : 'معلومة')}</h3>
      <p>${sanitizeHTML(message)}</p>
      <button class="close-btn">&times;</button>
    </div>
  `;

  // Add close functionality
  const closeBtn = messageEl.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      messageEl.style.display = 'none';
    });
  }

  // Show message
  messageEl.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

// Utility function for button loading state (similar to login.js)
function setButtonLoading(button, loadingText) {
  if (!button) return null;
  
  const originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `
    <span class="spinner"></span>
    ${loadingText}
  `;
  
  return {
    stop: () => {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  };
}