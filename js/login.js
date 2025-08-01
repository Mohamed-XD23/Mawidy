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
import { showModal } from "./utils.js";

// ⬇️ تسجيل الدخول بالبريد وكلمة المرور
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showModal({
      type: 'warning',
      title: 'بيانات مطلوبة',
      message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
      primaryText: 'موافق'
    });
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
    showModal({
      type: 'error',
      title: 'فشل تسجيل الدخول',
      message: `حدث خطأ أثناء تسجيل الدخول: ${error.message}`,
      primaryText: 'إعادة المحاولة'
    });
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
                window.location.href = "worker_list.html";
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
        window.location.href = "worker_list.html";
      }
    } catch (error) {
      console.error("❌ فشل تسجيل الدخول عبر Google:", error.message);
      showModal({
        type: 'error',
        title: 'فشل تسجيل الدخول',
        message: `حدث خطأ أثناء تسجيل الدخول عبر Google: ${error.message}`,
        primaryText: 'إعادة المحاولة'
      });
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
                window.location.href = "worker_list.html";
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
        window.location.href = "worker_list.html";
      }
    } catch (error) {
      console.error("❌ خطأ في تسجيل الدخول عبر Facebook:", error.message);
      showModal({
        type: 'error',
        title: 'فشل تسجيل الدخول',
        message: `حدث خطأ أثناء تسجيل الدخول عبر Facebook: ${error.message}`,
        primaryText: 'إعادة المحاولة'
      });
    }
  });

// ➤ عرض معلومات المستخدم بعد تسجيل الدخول
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
