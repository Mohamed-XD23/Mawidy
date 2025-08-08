//booking.js
// ⬇️ Firebase imports
// 🐛 Fix: Use db instance exported from firebase-config instead of importing non-existent "db" from firebase-firestore.
import { auth, db } from "./firebase-config.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  getCountFromServer // TODO: Consider removing if unused
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { sanitizeHTML } from './utils.js';

// ⬇️ UI imports
import { 
  setButtonLoading, 
  showLoadingState, 
  showModal, 
  displayRatingStars, 
  showMessage,
  showLoginRegisterModal
} from "./utils.js"; // تحديث الاستيرادات لتتضمن جميع الوظائف المستخدمة

const serviceRadios = document.querySelectorAll('input[name="service"]');
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const totalPriceSpan = document.getElementById("total-price");
const confirmBtn = document.getElementById("confirmBooking");

let currentUser = null; // 🐛 Fix: Declare currentUser to avoid ReferenceError when assigned later.
const selectedWorkerUID = localStorage.getItem("selectedWorkerUID");

// ✅ دالة لحساب التقييم الفعلي للحلاق من مجموعة Reviews باستخدام utils
async function calculateWorkerRating(workerId) {
  try {
    const reviewsRef = collection(db, "Reviews");
    const q = query(reviewsRef, where("workerId", "==", workerId));
    const reviewsSnap = await getDocs(q);
    
    if (reviewsSnap.empty) {
      return "0.0";
    }
    
    let total = 0;
    let count = 0;
    reviewsSnap.forEach((docSnap) => {
      const rating = docSnap.data().rating || 0;
      total += rating;
      count++;
    });
    
    return (total / count).toFixed(1);
  } catch (error) {
    console.error("خطأ في حساب التقييم ��لحلاق:", workerId, error);
    return "0.0";
  }
}

// ✅ دالة تحميل بيانات الحلاق
async function loadWorkerData(workerId) {
  try {
    const workerDoc = await getDoc(doc(db, "worker", workerId));
    if (!workerDoc.exists()) {
      console.error("❌ لم يتم العثور على بيانات الحلاق");
      showEmptyState();
      return;
    }

    const workerData = workerDoc.data();
    
    // تحديث العنوان
    const bookingTitle = document.querySelector(".booking-title");
    if (bookingTitle) {
      const safeWorkerName = sanitizeHTML(workerData.name);
      bookingTitle.textContent = `احجز موعدك مع ${safeWorkerName} 📅`;
    }
    
    // عرض معلومات الحلاق
    const workerInfo = document.getElementById("worker-info");
    const workerAvatarDisplay = document.getElementById("worker-avatar-display");
    const workerNameDisplay = document.getElementById("worker-name-display");
    const workerPhoneDisplay = document.getElementById("worker-phone-display");
    const workerRatingDisplay = document.getElementById("worker-rating-display");
    
    // إنشاء avatar بالأحرف الأولى
    if (workerAvatarDisplay) {
      const initials = workerData.name.split(' ').map(n => n[0]).join('').substring(0, 2);
      workerAvatarDisplay.textContent = initials;
    }
    
    if (workerNameDisplay) workerNameDisplay.textContent = sanitizeHTML(workerData.name);
    if (workerPhoneDisplay) workerPhoneDisplay.innerHTML = `<i class="fas fa-phone"></i> ${sanitizeHTML(workerData.phone) || "غير متوفر"}`;
    
    // حساب التقييم الفعلي من مجموعة Reviews
    const actualRating = await calculateWorkerRating(workerId);
    if (workerRatingDisplay) {
      workerRatingDisplay.innerHTML = `
        ${displayRatingStars(parseFloat(actualRating))}
        <span style="margin-right: 8px; color: var(--text-secondary);">(${actualRating})</span>
      `;
    }
    
    // إظهار معلومات الحلاق
    if (workerInfo) workerInfo.style.display = "block";
  } catch (error) {
    console.error("❌ خطأ في تحميل بيانات الحلاق:", error);
    showEmptyState();
  }
}

// ✅ عرض حالة فارغة عند عدم وجود حلاقين متاحين
function showEmptyState() {
  const container = document.getElementById("worker-info");
  const emptyState = document.getElementById("empty-state");
  
  if (container) container.style.display = "none";
  if (document.getElementById("booking-form")) document.getElementById("booking-form").style.display = "none";
  
  if (emptyState) {
    emptyState.style.display = "block";
  } else {
    console.warn("⚠️ لم يتم العثور على عنصر empty-state في DOM");
  }
}

// ✅ حساب السعر عند تغيير نوع الخدمة
serviceRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      const price = parseInt(radio.getAttribute("data-price"));
      totalPriceSpan.textContent = price;
    }
  });
});

// تحديد السعر الافتراضي وتاريخ اليوم كحد أدنى
document.addEventListener("DOMContentLoaded", () => {
  const firstService = document.querySelector('input[name="service"]');
  if (firstService) {
    firstService.checked = true;
    const price = parseInt(firstService.getAttribute("data-price"));
    totalPriceSpan.textContent = price;
  }
  
  // تحديد التاريخ الأدنى لليوم الحالي
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  
  // تحميل معلومات العامل
  if (selectedWorkerUID) {
    loadWorkerData(selectedWorkerUID);
  } else {
    showMessage("لم يتم اختيار حلاق. سيتم توجيهك لقائمة الحلاقين", 'error');
    setTimeout(() => {
      window.location.href = "worker_list.html";
    }, 3000);
  }
});

// ✅ التحقق من تسجيل الدخول وتحميل البيانات
onAuthStateChanged(auth, (user) => {
  if (!user) {
    showMessage("يجب تسجيل الدخول أولاً لحجز موعد.", 'error');
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
    return;
  }
  
  currentUser = user;
  loadWorkerData(selectedWorkerUID);
});

// ✅ معالجة إرسال النموذج
async function handleBookingSubmit(e) {
  e.preventDefault();

  const service = document.querySelector('input[name="service"]:checked');
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const submitButton = document.getElementById("confirmBooking");

  if (!service || !date || !time) {
    showModal({
      type: 'warning',
      title: 'بيانات ناقصة',
      message: 'يرجى ملء جميع الحقول المطلوبة.',
      primaryText: 'حسنًا'
    });
    return;
  }

  // عرض مؤشر التحميل
  const loader = setButtonLoading(submitButton, "جارٍ تأكيد الحجز...");

  try {
    const workerId = localStorage.getItem("selectedWorkerUID");
    const user = auth.currentUser;

    if (!user) {
      showLoginRegisterModal();
      return;
    }

    await addDoc(collection(db, "Appointments"), {
      workerId,
      clientId: user.uid,
      clientName: user.displayName || user.email,
      service: service.value,
      price: parseInt(service.dataset.price),
      date,
      time,
      status: "بانتظار التأكيد",
      createdAt: serverTimestamp()
    });

    // عرض رسالة نجاح واضحة
    showModal({
      type: 'success',
      title: 'تم تأكيد الحجز!',
      message: `تم تأكيد الحجز بنجاح. سيتم إعلام الحلاق بالموعد الجديد.

تفاصيل الموعد:
• الخدمة: ${service.value}
• التاريخ: ${date}
• الوقت: ${time}`,
      primaryText: 'حسنًا',
      onPrimary: () => window.location.href = "worker_list.html"
    });

  } catch (error) {
    console.error("❌ خطأ في تأكيد الحجز:", error);
    showMessage("فشل تأكيد الحجز. يرجى المحاولة مرة أخرى.", 'error', 'خطأ في التأكيد');
  } finally {
    // إخفاء مؤشر التحميل
    if (loader && typeof loader.stop === 'function') {
      loader.stop();
    }
  }
}

// تهيئة مستمع الحدث بعد تعريف الدالة
const bookingForm = document.getElementById("booking-form");
if (bookingForm) {
  bookingForm.addEventListener("submit", handleBookingSubmit);
}
