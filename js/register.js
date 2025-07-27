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
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

// ➤ إنشاء حساب بالبريد وكلمة المرور
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm').value;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) return alert("البريد الإلكتروني غير صالح");
  if (!password) return alert("الرجاء إدخال كلمة المرور");
  if (password.length < 6) return alert("كلمة المرور يجب أن تكون على الأقل 6 حروف");
  if (password !== confirmPassword) return alert("كلمتا المرور غير متطابقتين");

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      role: "customer",
      createdAt: serverTimestamp()
    });

    console.log("✅ تم إنشاء الحساب:", user);
    window.location.href = "worker_list.html";
  } catch (error) {
    console.error("❌ فشل في إنشاء الحساب:", error.message);
    alert("خطأ: " + error.message);
  }
});

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
    alert("خطأ Google: " + error.message);
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
    alert("خطأ Facebook: " + error.message);
  }
});
