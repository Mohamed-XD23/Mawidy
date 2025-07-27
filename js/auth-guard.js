// js/auth-guard.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'login.html';
  }
});

export function setupLogout(selector) {
  const btn = document.querySelector(selector);
  if (btn) {
    btn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });
  }
}
// ثم استدعاؤها في كل صفحة:
// <script type="module">
//   import { setupLogout } from './js/auth-guard.js';
//   setupLogout('#logout-button');
// </script>
// يمكنك استخدام هذه الدالة في كل صفحة تحتاج إلى حماية
// من خلال استدعائها في ملف JavaScript الخاص بتلك الصفحة.