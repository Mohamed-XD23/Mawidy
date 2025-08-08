//login.js
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"; // 🐛 Fix: Added missing import for serverTimestamp used later for createdAt
import { 
  showModal, 
  showMessage, 
  setButtonLoading,
  updateUserInfoDisplay,
  t // 🐛 Fix: Added missing import for translation function 't' to avoid ReferenceError
} from "./utils.js";

// ✅ Firebase imports
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

// ⬇️ تسجيل الدخول بالبريد وكلمة المرور
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const submitButton = document.querySelector("#login-form button[type=submit]");
  
  if (!email || !password) {
    showModal({
      type: 'warning',
      title: 'بيانات مطلوبة',
      message: t('login_validation'),
      primaryText: 'موافق'
    });
    return;
  }

  // Show loading indicator
  const loader = setButtonLoading(submitButton, t('login_loading'));
  
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    
    // ➤ التحقق من وجود مستخدم بعد تسجيل الدخول
    if (user) {
      showMessage(t('login_success'), 'success', t('welcome'));
      // ➤ دع auth-check.js يتولى إعادة التوجيه حسب نوع المستخدم
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    }
  } catch (error) {
    console.error("❌ خطأ في تسجيل الدخول:", error);
    showMessage(t('login_error'), 'error', t('login_error_title'));
  } finally {
    // Hide loading indicator
    if (loader && typeof loader.stop === 'function') {
      loader.stop();
    }
  }
});

// ⬇️ تبديل رؤية كلمة المرور
document.querySelectorAll('.eye-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const inputId = button.getAttribute('data-target');
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');

    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    icon.classList.toggle("fa-eye", !hidden);
    icon.classList.toggle("fa-eye-slash", hidden);
  });
});

// ⬇️ تسجيل الدخول عبر Google
document
  .querySelector(".social-btn.google")
  .addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    const button = document.querySelector(".social-btn.google");
    
    // Show loading indicator
    const loader = setButtonLoading(button, t('login_google_loading'));

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = result._tokenResponse?.isNewUser;

      if (isNewUser) {
        showModal({
          type: 'info',
          title: 'إنشاء حساب جديد',
          message: 'هذا أول تسجيل دخول لك باستخدام Google، هل تريد إنشاء حساب جديد؟',
          primaryText: 'نعم، أنشئ حساب',
          secondaryText: 'إلغاء',
          onPrimary: async () => {
            await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              email: user.email,
              role: "customer",
              createdAt: serverTimestamp(),
            });
            showModal({
              type: 'success',
              title: 'مرحباً بك! 🎉',
              message: 'تم إنشاء حسابك الجديد بنجاح. يمكنك الآن تصفح الحلاقين وحجز المواعيد.',
              primaryText: 'ابدأ التصفح',
              onPrimary: () => {
                window.location.href = "index.html";
              }
            });
          },
          onSecondary: async () => {
            await user.delete();
            showModal({
              type: 'info',
              title: 'تم الإلغاء',
              message: 'تم إلغاء العملية ولم يتم إنشاء حساب.',
              primaryText: 'موافق'
            });
          }
        });
      } else {
        window.location.href = "index.html";
      }
    } catch (error) {
      console.error("❌ خطأ في تسجيل الدخول عبر Google:", error);
      showMessage(t('login_google_error'), 'error', t('login_error_title'));
    } finally {
      // Hide loading indicator
      if (loader && typeof loader.stop === 'function') {
        loader.stop();
      }
    }
  });

// ⬇️ تسجيل الدخول عبر Facebook
document
  .querySelector(".social-btn.facebook")
  .addEventListener("click", async () => {
    const provider = new FacebookAuthProvider();
    const button = document.querySelector(".social-btn.facebook");
    
    // Show loading indicator
    const loader = setButtonLoading(button, t('login_facebook_loading'));

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = result._tokenResponse?.isNewUser;

      if (isNewUser) {
        showModal({
          type: 'info',
          title: 'إنشاء حساب جديد',
          message: 'هذا أول تسجيل دخول لك باستخدام Facebook، هل تريد إنشاء حساب جديد؟',
          primaryText: 'نعم، أنشئ حساب',
          secondaryText: 'إلغاء',
          onPrimary: async () => {
            await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              email: user.email,
              role: "customer",
              createdAt: serverTimestamp(),
            });
            showModal({
              type: 'success',
              title: 'مرحباً بك! 🎉',
              message: 'تم إنشاء حسابك الجديد بنجاح. يمكنك الآن تصفح الحلاقين وحجز المواعيد.',
              primaryText: 'ابدأ التصفح',
              onPrimary: () => {
                window.location.href = "index.html";
              }
            });
          },
          onSecondary: async () => {
            await user.delete();
            showModal({
              type: 'info',
              title: 'تم الإلغاء',
              message: 'تم إلغاء العملية ولم يتم إنشاء حساب.',
              primaryText: 'موافق'
            });
          }
        });
      } else {
        window.location.href = "index.html";
      }
    } catch (error) {
      console.error("❌ خطأ في تسجيل الدخول عبر Facebook:", error);
      showMessage(t('login_facebook_error'), 'error', t('login_error_title'));
    } finally {
      // Hide loading indicator
      if (loader && typeof loader.stop === 'function') {
        loader.stop();
      }
    }
  });