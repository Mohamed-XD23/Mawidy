//booking.js
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
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { setButtonLoading, showLoadingState, showModal, displayRatingStars, showMessage } from "./utils.js"; // إضافة showMessage وإزالة showSnackbar إذا لم تعد تستخدم مباشرة

const serviceRadios = document.querySelectorAll('input[name="service"]');
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const totalPriceSpan = document.getElementById("total-price");
const confirmBtn = document.getElementById("confirmBooking");

const selectedWorkerUID = localStorage.getItem("selectedWorkerUID");

// دالة لعرض الرسائل باستخدام Modal (تم نقلها إلى utils.js واستيرادها)
// function showMessage(message, type = 'info', title = null) { ... }

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

// ✅ دالة تحميل معلومات الحلاق مع Loading Indicator
async function loadWorkerInfo() {
  const workerInfo = document.getElementById("worker-info");
  
  // عرض loading state
  if (workerInfo) {
    showLoadingState(workerInfo, "جارٍ تحميل معلومات الحلاق...");
  }
  
  try {
    const workerDoc = await getDoc(doc(db, "worker", selectedWorkerUID));
    if (workerDoc.exists()) {
      const workerData = workerDoc.data();
      
      // تحديث العنوان
      const bookingTitle = document.querySelector(".booking-title");
      if (bookingTitle) {
        bookingTitle.textContent = `احجز موعدك مع ${workerData.name} 📅`;
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
      
      if (workerNameDisplay) workerNameDisplay.textContent = workerData.name;
      if (workerPhoneDisplay) workerPhoneDisplay.innerHTML = `<i class="fas fa-phone"></i> ${workerData.phone || "غير متوفر"}`;
      
      // حساب التقييم الفعلي من مجموعة Reviews
      const actualRating = await calculateWorkerRating(selectedWorkerUID);
      if (workerRatingDisplay) {
        workerRatingDisplay.innerHTML = `
          ${displayRatingStars(parseFloat(actualRating))}
          <span style="margin-right: 8px; color: var(--text-secondary);">(${actualRating})</span>
        `;
      }
      
      // إظهار معلومات الحلاق
      if (workerInfo) workerInfo.style.display = "block";
    }
  } catch (error) {
    console.error("خطأ في تحميل بيانات الحلاق:", error);
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
    loadWorkerInfo();
  } else {
    showMessage("لم يتم اختيار حلاق. سيتم توجيهك لقائمة الحلاقين", 'error');
    setTimeout(() => {
      window.location.href = "worker_list.html";
    }, 3000);
  }
});

// التحقق من المصادقة
onAuthStateChanged(auth, (user) => {
  if (!user) {
    showMessage("يجب تسجيل الدخول أولاً", 'error');
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
  }
});

// ✅ تأكيد الحجز
document.getElementById("booking-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    showModal({
      type: 'warning',
      title: 'تسجيل الدخول مطلوب',
      message: 'يجب تسجيل الدخول أولاً لحجز موعد.',
      primaryText: 'تسجيل الدخول'
    });
    setTimeout(() => window.location.href = 'login.html', 2000);
    return;
  }

  // ➤ استخدام addDoc (POST-equivalent في Firebase) بدلاً من getDocs للعمليات الحساسة
  try {
    const selectedWorkerUID = localStorage.getItem("selectedWorkerUID");
    
    await addDoc(collection(db, "Appointments"), {
      clientId: user.uid,
      clientName: user.displayName || user.email.split('@')[0],
      workerId: selectedWorkerUID,
      service,
      date,
      time,
      price,
      status: "بانتظار التأكيد",
      createdAt: serverTimestamp(),
      // إضافة random ID لتقليل التنبؤ بالبيانات
      requestId: Math.random().toString(36).substring(2)
    });

    // عرض modal تأكيد الحجز
    showModal({
      type: 'success',
      title: 'تم الحجز بنجاح! 🎉',
      message: `...`,
      primaryText: 'ممتاز',
      onPrimary: () => {
        localStorage.removeItem("selectedWorkerUID");
        window.location.href = "index.html";
      }
    });
  } catch (error) {
    logClientError(error, 'booking-form-submit');
    console.error("❌ خطأ في الحجز:", error);
    
    let errorMessage = "حدث خطأ أثناء الحجز. يرجى المحاولة مرة أخرى.";
    
    if (error.code === 'permission-denied') {
      errorMessage += " ليس لديك صلاحية للوصول لهذه الخدمة.";
    } else if (error.code === 'unavailable') {
      errorMessage += " الخدمة غير متاحة حالياً. تحقق من اتصالك بالإنترنت.";
    }
    
    showMessage(errorMessage, 'error');
  }
});
