// js/auth-guard.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { showLoginRegisterModal, sanitizeHTML } from './utils.js';

const loginBtn = document.getElementById('login-btn');
const userInfoSpan = document.getElementById('user-info');

// ➤ إضافة إعادة التوجيه للصفحة الرئيسية عند تسجيل الخروج أو عدم التحقق
onAuthStateChanged(auth, user => {
  if (!user) {
    // 1. مسح البيانات الحساسة من localStorage
    localStorage.removeItem('selectedWorkerUID');
    
    // 2. إعادة التوجيه للصفحة الرئيسية
    const protectedPages = ['/worker_list.html', '/worker_dashboard.html', '/booking.html'];
    if (protectedPages.some(page => window.location.pathname.endsWith(page))) {
      window.location.href = 'index.html';
      return;
    }
  }
  
  // Check if the current page is index.html
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
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
    // For other pages, apply the auth guard logic
    if (!user) {
      // المستخدم غير مسجل الدخول ويحاول الوصول لصفحة محمية (غير index)
      // اعرض الـ Modal بدلاً من إعادة التوجيه المباشر
      showLoginRegisterModal();
      // لمنع عرض محتوى الصفحة المحمية خلف المودال، يمكن إضافة بعض التنسيقات
      // أو التأكد من أن المودال يغطي الصفحة بالكامل.
      // لا نعيد التوجيه هنا تلقائياً للسماح للمستخدم بالتفاعل مع المودال.
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

function updateUserInfoDisplay(user) {
  const userInfoSpan = document.getElementById('user-info');
  if (userInfoSpan && user) {
    userInfoSpan.style.display = 'inline';
    userInfoSpan.innerHTML = sanitizeHTML(user.email);
  } else {
    // إضافة إعادة التوجيه عند محاولة الوصول لصفحات محمية
    const protectedPages = ['/worker_profile.html', '/worker_dashboard.html', '/booking.html'];
    if (protectedPages.some(page => window.location.pathname.endsWith(page))) {
      window.location.href = 'index.html';
    }
  }
}
