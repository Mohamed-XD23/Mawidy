// customer_profile.js
import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { sanitizeHTML, showMessage, showModal, t } from "./utils.js"; // 🐛 Fix: added missing utilities and translation function

const profileInfo = document.getElementById("profileInfo");
const appointmentsList = document.getElementById("appointmentsList");
const appointmentsListContainer = document.getElementById("appointmentsListContainer");

// Check authentication state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showMessage(t('please_login'), 'error');
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
    return;
  }

  try {
    // Load user profile information
    await loadUserProfile(user);
    
    // Load user appointments
    await loadUserAppointments(user.uid);
  } catch (error) {
    console.error("Error loading profile:", error);
    profileInfo.innerHTML = `<p class="error">${t('error_loading_profile')}</p>`;
  }
});

/**
 * Load user profile information
 * @param {Object} user - Firebase user object
 */
async function loadUserProfile(user) {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  
  if (userDoc.exists()) {
    const data = userDoc.data();
    
    // Sanitize user data before displaying
    const sanitizedName = sanitizeHTML(data.name || 'غير محدد');
    const sanitizedEmail = sanitizeHTML(user.email || 'غير محدد');
    
    profileInfo.innerHTML = `
      <div class="profile-item">
        <span class="label">الاسم:</span>
        <span class="value">${sanitizedName}</span>
      </div>
      <div class="profile-item">
        <span class="label">البريد:</span>
        <span class="value">${sanitizedEmail}</span>
      </div>
      <div class="profile-item">
        <span class="label">تاريخ التسجيل:</span>
        <span class="value">${data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-US') : 'غير محدد'}</span>
      </div>
    `;
  } else {
    profileInfo.innerHTML = `<p class="error">${t('profile_not_found')}</p>`;
  }
}

/**
 * Load user appointments
 * @param {string} userId - User ID
 */
async function loadUserAppointments(userId) {
  try {
    const q = query(
      collection(db, "Appointments"),
      where("clientId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      appointmentsList.innerHTML = "<li class='no-appointments'>لا توجد مواعيد سابقة</li>";
    } else {
      appointmentsList.innerHTML = "";
      snapshot.forEach((doc) => {
        const app = doc.data();
        
        // Sanitize appointment data before displaying
        const sanitizedDate = sanitizeHTML(app.date || '');
        const sanitizedWorkerName = sanitizeHTML(app.workerName || 'غير محدد');
        const sanitizedService = sanitizeHTML(app.service || 'غير محدد');
        const sanitizedStatus = sanitizeHTML(app.status || 'غير محدد');
        
        const appointmentElement = document.createElement('li');
        appointmentElement.className = 'appointment-item';
        appointmentElement.innerHTML = `
          <div class="appointment-details">
            <div class="appointment-date">${sanitizedDate}</div>
            <div class="appointment-worker">الحلاق: ${sanitizedWorkerName}</div>
            <div class="appointment-service">الخدمة: ${sanitizedService}</div>
            <div class="appointment-status">الحالة: ${sanitizedStatus}</div>
          </div>
        `;
        
        appointmentsList.appendChild(appointmentElement);
      });
    }
  } catch (error) {
    console.error("Error loading appointments:", error);
    showMessage(t('error_loading_appointments'), 'error', t('error_title'));
    appointmentsList.innerHTML = "";
  }
}
