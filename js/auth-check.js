import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth();
const loginBtn = document.getElementById('login-btn');
const userInfoSpan = document.getElementById('user-info');

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfoSpan) {
      userInfoSpan.style.display = 'inline';
      // You can display user information here, e.g., user's email or a logout button
      userInfoSpan.innerHTML = `مرحباً، ${user.email} (<span id="logout-link" style="cursor: pointer; text-decoration: underline;">تسجيل الخروج</span>)`;

      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
        logoutLink.addEventListener('click', () => {
          signOut(auth).then(() => {
            // Sign-out successful.
            window.location.reload(); // Reload the page after logout
          }).catch((error) => {
            // An error happened.
            console.error('Error signing out: ', error);
          });
        });
      }
    }
  } else {
    // User is signed out
    if (loginBtn) loginBtn.style.display = 'inline';
    if (userInfoSpan) {
      userInfoSpan.style.display = 'none';
      userInfoSpan.innerHTML = ''; // Clear user info
    }
  }
});