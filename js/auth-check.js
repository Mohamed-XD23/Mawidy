import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { sanitizeHTML } from "./utils.js";

const loginBtn = document.getElementById('login-btn');
const userInfoSpan = document.getElementById('user-info');

// ➤ تحديد الوصول حسب نوع المستخدم (Role-based access)
async function handleUserRole(user) {
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    if (userData && userData.role) {
      const currentPath = window.location.pathname;
      
      if (userData.role === 'worker') {
        // الحلاق يجب أن يذهب إلى worker_dashboard.html
        if (!currentPath.includes('worker_dashboard.html')) {
          console.log('توجيه الحلاق إلى worker_dashboard.html');
          window.location.href = 'worker_dashboard.html';
          return;
        }
      } else if (userData.role === 'customer' || userData.role === 'client') {
        // العميل لا يمكنه الوصول إلى worker_dashboard.html
        if (currentPath.includes('worker_dashboard.html')) {
          console.log('منع العميل من worker_dashboard.html');
          window.location.href = 'index.html';
          return;
        }
        
        // إذا كان العميل في صفحة التسجيل أو صفحات أخرى، يبقى هناك
        // لا حاجة لإعادة توجيه للعملاء
        console.log('العميل يبقى في الصفحة الحالية:', currentPath);
      }
    } else {
      console.warn('لم يتم العثور على بيانات المستخدم أو نوع المستخدم');
    }
  } catch (error) {
    console.error('خطأ في جلب بيانات المستخدم:', error);
    // في حالة الخطأ، إعادة توجيه للصفحة الرئيسية فقط إذا كان في worker_dashboard
    if (window.location.pathname.includes('worker_dashboard.html')) {
      window.location.href = 'index.html';
    }
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is signed in
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfoSpan) {
      userInfoSpan.style.display = 'inline';
      const safeEmail = sanitizeHTML(user.email);
      userInfoSpan.innerHTML = `مرحباً، ${safeEmail} (<span id="logout-link" style="cursor: pointer; text-decoration: underline;">تسجيل الخروج</span>)`;

      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
        logoutLink.addEventListener('click', () => {
          signOut(auth).then(() => {
            window.location.href = 'index.html'; // توجيه للصفحة الرئيسية بعد تسجيل الخروج
          }).catch((error) => {
            console.error('Error signing out: ', error);
          });
        });
      }
    }
    
    // تطبيق التحكم في الوصول حسب النوع
    await handleUserRole(user);
  } else {
    // User is signed out
    if (loginBtn) loginBtn.style.display = 'inline';
    if (userInfoSpan) {
      userInfoSpan.style.display = 'none';
      userInfoSpan.innerHTML = ''; // Clear user info
    }
  }
});