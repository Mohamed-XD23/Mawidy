import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { sanitizeHTML, t } from "./utils.js";

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
        // worker_redirect_comment
        if (!currentPath.includes('worker_dashboard.html')) {
          console.log(t('redirecting_worker'));
          window.location.href = 'worker_dashboard.html';
          return;
        }
      } else if (userData.role === 'customer' || userData.role === 'client') {
        // customer_access_restriction_comment
        if (currentPath.includes('worker_dashboard.html')) {
          console.log(t('restricting_customer_access'));
          window.location.href = 'index.html';
          return;
        }
        
        // customer_stays_on_page_comment
        // no_redirect_needed_comment
        console.log(t('customer_stays_on_current_page'), currentPath);
      }
    } else {
      console.warn(t('user_data_not_found'));
    }
  } catch (error) {
    console.error(t('error_fetching_user_data'), error);
    // error_redirect_comment
    if (window.location.pathname.includes('worker_dashboard.html')) {
      window.location.href = 'index.html';
    }
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is signed in
    if (userInfoSpan) {
      userInfoSpan.style.display = 'inline';
      const safeEmail = sanitizeHTML(user.email);
      userInfoSpan.innerHTML = `${t('welcome_user')} ${safeEmail} (<span id="logout-link" style="cursor: pointer; text-decoration: underline;">${t('logout')}</span>)`;

      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
        logoutLink.addEventListener('click', () => {
          signOut(auth).then(() => {
            window.location.href = 'index.html'; // redirect_after_logout_comment
          }).catch((error) => {
            console.error(t('error_signing_out'), error);
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