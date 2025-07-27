//login.js
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ⬇️ تسجيل الدخول بالبريد وكلمة المرور
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("يرجى إدخال البريد الإلكتروني وكلمة المرور");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("✅ تم تسجيل الدخول:", user);
    window.location.href = "worker_list.html";
  } catch (error) {
    console.error("❌ خطأ في تسجيل الدخول:", error.message);
    alert("فشل تسجيل الدخول: " + error.message);
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

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = result._tokenResponse?.isNewUser;

      if (isNewUser) {
        const confirmCreate = window.confirm(
          "هذا أول تسجيل دخول لك باستخدام Google، هل تريد إنشاء حساب جديد؟"
        );
        if (confirmCreate) {
          alert("تم إنشاء حساب جديد بنجاح");
          window.location.href = "worker_list.html";
          // بعد تأكيد الإنشاء:
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            role: "customer",
            createdAt: serverTimestamp(),
          });
        } else {
          await user.delete();
          alert("تم إلغاء العملية ولم يتم إنشاء حساب.");
        }
      } else {
        window.location.href = "worker_list.html";
      }
    } catch (error) {
      console.error("❌ فشل تسجيل الدخول عبر Google:", error.message);
      alert("فشل تسجيل الدخول عبر Google: " + error.message);
    }
  });

// ⬇️ تسجيل الدخول عبر Facebook
document
  .querySelector(".social-btn.facebook")
  .addEventListener("click", async () => {
    const provider = new FacebookAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = result._tokenResponse?.isNewUser;

      if (isNewUser) {
        const confirmCreate = window.confirm(
          "هذا أول تسجيل دخول لك باستخدام Facebook، هل تريد إنشاء حساب جديد؟"
        );
        if (confirmCreate) {
          alert("تم إنشاء حساب جديد بنجاح");
          window.location.href = "worker_list.html";
          // بعد تأكيد الإنشاء:
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            role: "customer",
            createdAt: serverTimestamp(),
          });
        } else {
          await user.delete();
          alert("تم إلغاء العملية ولم يتم إنشاء حساب.");
        }
      } else {
        window.location.href = "worker_list.html";
      }
    } catch (error) {
      console.error("❌ فشل تسجيل الدخول عبر Facebook:", error.message);
      alert("فشل تسجيل الدخول عبر Facebook: " + error.message);
    }
  });
