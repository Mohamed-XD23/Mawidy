// register.js
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getCountFromServer
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

// ✅ Added sanitizeHTML to imports
import { 
  showModal, 
  setButtonLoading, 
  showMessage, 
  logClientError, 
  sanitizeHTML 
} from "./utils.js";

// ➤ إنشاء حساب بالبريد وكلمة المرور
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const email = sanitizeHTML(document.getElementById('reg-email').value.trim());
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm').value;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showModal({
        type: 'warning',
        title: 'بريد إلكتروني غير صالح',
        message: 'يرجى إدخال بريد إلكتروني صحيح.',
        primaryText: 'موافق'
      });
      return;
    }

    // ➤ التحقق من قوة كلمة المرور باستخدام Regex متقدم
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%&*]).{8,}$/;
    if (!passwordRegex.test(password)) {
      showModal({
        type: 'warning',
        title: 'كلمة مرور غير آمنة',
        message: `كلمة المرور يجب أن تحتوي على:\n- 8 أحرف على الأقل\n- حرف كبير وصغير\n- رقم\n- رمز خاص (!@#$%&*)`,
        primaryText: 'موافق'
      });
      return;
    }

    if (password !== confirmPassword) {
      showModal({
        type: 'warning',
        title: 'كلمات المرور غير متطابقة',
        message: 'يرجى التأكد من تطابق كلمتي المرور.',
        primaryText: 'موافق'
      });
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // استخدام addDoc بدلاً من setDoc لتجنب مشاكل CORS في بعض الأجهزة المحمية
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      email: user.email,
      role: "customer",
      createdAt: serverTimestamp(),
      securityHeaders: {
        xssProtection: 'enabled',
        cspReportOnly: false
      }
    });

    console.log("✅ تم إنشاء الحساب:", user);
    showModal({
      type: 'success',
      title: 'مرحباً بك! 🎉',
      message: 'تم إنشاء حسابك بنجاح. يمكنك الآن تصفح الحلاقين وحجز المواعيد.',
      primaryText: 'ابدأ التصفح',
      onPrimary: () => {
        window.location.href = "worker_list.html";
      }
    });
  } catch (error) {
    logClientError(error, 'registration');
    console.error("❌ فشل في إنشاء الحساب:", error.message);
    showModal({
      type: 'error',
      title: 'فشل إنشاء الحساب',
      message: `حدث خطأ أثناء إنشاء الحساب: ${error.message}`,
      primaryText: 'إعادة المحاولة'
    });
  }
});

// ➤ عرض معلومات المستخدم بعد التسجيل
function updateUserInfoDisplay(user) {
  const userInfoSpan = document.getElementById('user-info');
  if (userInfoSpan && user) {
    const safeEmail = sanitizeHTML(user.email);
    userInfoSpan.innerHTML = `مرحباً، ${safeEmail} (<span id="logout-link" style="cursor: pointer; text-decoration: underline;">تسجيل الخروج</span>)`;
    
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', async () => {
        await signOut(auth);
        window.location.reload();
      });
    }
  }
}

// ➤ إظهار/إخفاء كلمة المرور
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

// ➤ تسجيل باستخدام Google
document.querySelector('.social-btn.google').addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // أول مرة، أنشئ الحساب
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: "customer",
        createdAt: serverTimestamp()
      });
      console.log("✅ تم إنشاء حساب Google جديد");
    }

    window.location.href = "worker_list.html";
  } catch (error) {
    console.error("❌ فشل Google:", error.message);
    showModal({
      type: 'error',
      title: 'فشل التسجيل عبر Google',
      message: `حدث خطأ أثناء التسجيل عبر Google: ${error.message}`,
      primaryText: 'إعادة المحاولة'
    });
  }
});

// ➤ تسجيل باستخدام Facebook
document.querySelector('.social-btn.facebook').addEventListener('click', async () => {
  const provider = new FacebookAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: "customer",
        createdAt: serverTimestamp()
      });
      console.log("✅ تم إنشاء حساب Facebook جديد");
    }

    window.location.href = "worker_list.html";
  } catch (error) {
    console.error("❌ فشل Facebook:", error.message);
    showModal({
      type: 'error',
      title: 'فشل التسجيل عبر Facebook',
      message: `حدث خطأ أثناء التسجيل عبر Facebook: ${error.message}`,
      primaryText: 'إعادة المحاولة'
    });
  }
});
