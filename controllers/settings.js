// settings.js
import { auth, db } from "./firebase-config.js";
import { 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  updatePassword as firebaseUpdatePassword,
  deleteUser as firebaseDeleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { sanitizeHTML, showModal, showMessage, t } from "./utils.js"; // 🐛 Fix: added missing utilities and translation function

// Strong password regex (at least 6 characters)
const strongPasswordRegex = /^.{6,}$/;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      showMessage(t('please_login'), 'error');
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    }
  });

  // Add event listeners
  document.getElementById('updateNameBtn').addEventListener('click', updateName);
  document.getElementById('updatePasswordBtn').addEventListener('click', updatePassword);
  document.getElementById('deleteAccountBtn').addEventListener('click', deleteAccount);
  
  // Add language and theme selection event listeners
  document.getElementById('changeLanguageBtn').addEventListener('click', changeLanguage);
  document.getElementById('changeThemeBtn').addEventListener('click', changeTheme);
  
  // Set initial values for language and theme selectors
  const languageSelect = document.getElementById('languageSelect');
  const themeSelect = document.getElementById('themeSelect');
  
  // Get current language and theme from localStorage or default values
  const currentLanguage = localStorage.getItem('language') || 'ar';
  const currentTheme = localStorage.getItem('theme') || 'auto';
  
  languageSelect.value = currentLanguage;
  themeSelect.value = currentTheme;
});

/**
 * Update user's name in Firestore
 */
async function updateName() {
  const newNameInput = document.getElementById("nameInput");
  const newName = newNameInput.value.trim();
  
  // Sanitize input
  const sanitizedName = sanitizeHTML(newName);
  
  if (!sanitizedName) {
    showMessage("أدخل اسمًا جديدًا", 'error', 'خطأ');
    return;
  }

  try {
    const userDoc = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userDoc, { name: sanitizedName });
    showMessage("تم تحديث الاسم بنجاح.", 'success', 'نجاح');
    newNameInput.value = "";
  } catch (error) {
    console.error("Error updating name:", error);
    showMessage("حدث خطأ أثناء تحديث الاسم. يرجى المحاولة مرة أخرى.", 'error', 'خطأ');
  }
}

/**
 * Update user's password
 */
async function updatePassword() {
  const passwordInput = document.getElementById("passwordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");
  
  const newPassword = passwordInput.value;
  const confirmNewPassword = confirmPasswordInput.value;
  
  if (!newPassword || !confirmNewPassword) {
    showMessage("يرجى ملء جميع حقول كلمة المرور.", 'error', 'حقل مفقود');
    return;
  }
  
  if (newPassword !== confirmNewPassword) {
    showMessage("كلمات المرور غير متطابقة.", 'error', 'خطأ في كلمة المرور');
    return;
  }
  
  if (!strongPasswordRegex.test(newPassword)) {
    showMessage("كلمة السر يجب أن تحتوي على الأقل 6 أحرف.", 'error', 'كلمة مرور ضعيفة');
    return;
  }

  try {
    await firebaseUpdatePassword(auth.currentUser, newPassword);
    showMessage("تم تغيير كلمة السر بنجاح.", 'success', 'نجاح');
    passwordInput.value = "";
    confirmPasswordInput.value = "";
  } catch (error) {
    console.error("Error updating password:", error);
    showMessage("حدث خطأ أثناء تغيير كلمة السر. يرجى المحاولة مرة أخرى.", 'error', 'خطأ');
  }
}

/**
 * Delete user account
 */
async function deleteAccount() {
  // Use i18n-powered modal dialog instead of confirm
  showModal({
    type: 'warning',
    title: t('delete_account'),
    message: t('delete_account_confirm'),
    primaryText: t('yes'),
    secondaryText: t('no'),
    onPrimary: () => {
      // Proceed with account deletion
      performAccountDeletion();
    },
    onSecondary: () => {
      // User cancelled deletion
      return;
    }
  });
}

/**
 * Perform the actual account deletion
 */
async function performAccountDeletion() {
  try {
    // Delete user from Firebase Authentication
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user found');

    // Delete user document from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await deleteDoc(userDocRef);

    // Delete user from Firebase Authentication
    await user.delete();

    // Redirect to login page
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error deleting account:', error);
    showMessage(t('error_deleting_account'), 'error', 'خطأ');
  }
}

/**
 * Language and theme selection functions
async function changeLanguage() {
  const languageSelect = document.getElementById('languageSelect');
  const selectedLanguage = languageSelect.value;
  
  // Save language preference to localStorage
  localStorage.setItem('language', selectedLanguage);
  
  // Dispatch language change event
  const event = new CustomEvent('languageChanged', { detail: { language: selectedLanguage } });
  window.dispatchEvent(event);
  
  showMessage("تم تحديث اللغة بنجاح", 'success', 'نجاح');
}

async function changeTheme() {
  const themeSelect = document.getElementById('themeSelect');
  const selectedTheme = themeSelect.value;
  
  // Save theme preference to localStorage
  localStorage.setItem('theme', selectedTheme);
  
  // Apply theme
  applyTheme(selectedTheme);
  
  showMessage("تم تحديث الوضع بنجاح", 'success', 'نجاح');
}

function applyTheme(theme) {
  const body = document.body;
  
  if (theme === 'light') {
    body.classList.remove('dark-mode');
  } else if (theme === 'dark') {
    body.classList.add('dark-mode');
  } else if (theme === 'auto') {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }
}

// Make functions globally available for onclick attributes if needed
window.updateName = updateName;
window.updatePassword = updatePassword;
window.deleteAccount = deleteAccount;
window.changeLanguage = changeLanguage;
window.changeTheme = changeTheme;
