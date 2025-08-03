// js/auth-guard.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { showLoginRegisterModal, sanitizeHTML, updateUserInfoDisplay } from './utils.js';

const loginBtn = document.getElementById('login-btn');
const userInfoSpan = document.getElementById('user-info');

// ➤ تحديد الوصول حسب نوع المستخدم (Role-based access control)
async function handleRoleBasedAccess(user) {
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    if (userData && userData.role) {
      const currentPath = window.location.pathname;
      
      if (userData.role === 'worker') {
        // العامل يمكنه الوصول إلى worker_dashboard.html فقط
        const workerAllowedPages = ['worker_dashboard.html', 'index.html'];
        const isAllowed = workerAllowedPages.some(page => currentPath.includes(page));
        
        if (!isAllowed) {
          window.location.href = 'worker_dashboard.html';
          return false;
        }
      } else if (userData.role === 'customer' || userData.role === 'client') {
        // العميل لا يمكنه الوصول إلى worker_dashboard.html
        if (currentPath.includes('worker_dashboard.html')) {
          window.location.href = 'index.html';
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('خطأ في جلب بيانات المستخدم:', error);
    // في حالة الخطأ، منع الوصول للصفحات الحساسة
    if (window.location.pathname.includes('worker_dashboard.html')) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
}

// ➤ حماية الصفحات الحساسة وإعادة التوجيه حسب نوع المستخدم
onAuthStateChanged(auth, async user => {
  if (!user) {
    // 1. مسح البيانات الحساسة من localStorage
    localStorage.removeItem('selectedWorkerUID');
    
    // 2. تحديد الصفحات المحمية
    const protectedPages = ['worker_list.html', 'worker_dashboard.html', 'booking.html', 'worker_profile.html'];
    const currentPath = window.location.pathname;
    
    if (protectedPages.some(page => currentPath.includes(page))) {
      // عرض مودال تسجيل الدخول بدلاً من إعادة التوجيه المباشر
      showLoginRegisterModal();
      return;
    }
  }
  
  // التحقق من نوع المستخدم وتطبيق الوصول المناسب
  if (user) {
    const canAccess = await handleRoleBasedAccess(user);
    if (!canAccess) return; // إذا تم إعادة التوجيه، لا تكمل
  }
  
  // التحكم في عرض واجهة المستخدم
  if (window.location.pathname === '/' || window.location.pathname.includes('/index.html')) {
    if (user) {
      // User is signed in
      if (loginBtn) loginBtn.style.display = 'none';
      updateUserInfoDisplay(user);
    } else {
      // User is signed out
      if (loginBtn) loginBtn.style.display = 'inline';
      if (userInfoSpan) {
        userInfoSpan.style.display = 'none';
        userInfoSpan.innerHTML = ''; // Clear user info
      }
    }
  } else {
    // للصفحات الأخرى، تطبيق منطق حماية المصادقة
    if (!user) {
      // المستخدم غير مسجل الدخول ويحاول الوصول لصفحة محمية
      showLoginRegisterModal();
    }
  }
});

export function setupLogout(selector) {
  const btn = document.querySelector(selector);
  if (btn) {
    btn.addEventListener('click', async () => {
      await signOut(auth);
      // مسح جميع البيانات الحساسة من localStorage عند تسجيل الخروج
      localStorage.removeItem('selectedWorkerUID');
      window.location.href = 'index.html';
    });
  }
}

