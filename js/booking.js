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
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const serviceRadios = document.querySelectorAll('input[name="service"]');
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const totalPriceSpan = document.getElementById("total-price");
const confirmBtn = document.getElementById("confirmBooking");

const selectedWorkerUID = localStorage.getItem("selectedWorkerUID");

// دالة لعرض الرسائل
function showMessage(message, type = 'info') {
  const existingMessage = document.querySelector('.message-toast');
  if (existingMessage) existingMessage.remove();
  
  const toast = document.createElement('div');
  toast.className = `message-toast ${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
  `;
  
  if (type === 'error') {
    toast.style.background = 'var(--color-secondary)';
  } else if (type === 'success') {
    toast.style.background = 'var(--color-success)';
  } else {
    toast.style.background = 'var(--color-primary)';
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 4000);
}

// ✅ دالة لحساب التقييم الفعلي للحلاق من مجموعة Reviews
async function calculateWorkerRating(workerId) {
  try {
    const reviewsRef = collection(db, "Reviews");
    const q = query(reviewsRef, where("workerId", "==", workerId));
    const reviewsSnap = await getDocs(q);
    
    if (reviewsSnap.empty) {
      return 0.0; // لا توجد تقييمات
    }
    
    let totalRating = 0;
    let reviewCount = 0;
    
    reviewsSnap.forEach((docSnap) => {
      const review = docSnap.data();
      totalRating += review.rating || 0;
      reviewCount++;
    });
    
    return reviewCount > 0 ? (totalRating / reviewCount) : 0.0;
  } catch (error) {
    console.error("خطأ في حساب التقييم للحلاق:", workerId, error);
    return 0.0; // في حالة الخطأ، إرجاع 0
  }
}

// ✅ دالة تحميل معلومات الحلاق
async function loadWorkerInfo() {
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
      if (workerRatingDisplay) workerRatingDisplay.innerHTML = `<i class="fas fa-star"></i> ${actualRating.toFixed(1)}`;
      
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
  if (!user) return showMessage("يجب تسجيل الدخول لإتمام الحجز", 'error');

  const selectedService = document.querySelector('input[name="service"]:checked');
  const service = selectedService ? selectedService.value : '';
  const date = dateInput.value;
  const time = timeInput.value;
  const price = selectedService ? parseInt(selectedService.dataset.price) : 0;

  if (!service || !date || !time) {
    return showMessage("يرجى ملء جميع الحقول", 'error');
  }

  // التحقق من أن التاريخ ليس في الماضي
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    return showMessage("لا يمكن حجز موعد في تاريخ سابق", 'error');
  }

  // إظهار حالة التحميل
  const originalText = confirmBtn.textContent;
  confirmBtn.disabled = true;
  confirmBtn.textContent = "جارٍ التحقق...";

  try {
    // ✅ منع الزبون من تكرار الحجز إذا كان لديه طلب قيد الانتظار
    const q1 = query(
      collection(db, "Appointments"),
      where("clientId", "==", user.uid),
      where("status", "==", "بانتظار التأكيد")
    );
    const existing = await getDocs(q1);
    if (!existing.empty) {
      const pendingCount = existing.size;
      const message = pendingCount === 1 
        ? "لديك بالفعل حجز قيد الانتظار. يرجى الانتظار حتى تتم معالجته."
        : `لديك ${pendingCount} حجوزات قيد الانتظار. يرجى الانتظار حتى تتم معالجتها.`;
      
      showMessage(message, 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = originalText;
      return;
    }

    // ✅ منع تكرار الحجز مع نفس الحلاق في نفس الوقت والتاريخ
    const q2 = query(
      collection(db, "Appointments"),
      where("workerId", "==", selectedWorkerUID),
      where("date", "==", date),
      where("time", "==", time),
      where("status", "in", ["بانتظار التأكيد", "تم التأكيد"])
    );
    const conflict = await getDocs(q2);
    if (!conflict.empty) {
      alert("هذا الموعد محجوز مسبقًا مع هذا الحلاق. يرجى اختيار وقت مختلف.");
      confirmBtn.disabled = false;
      confirmBtn.textContent = originalText;
      return;
    }

    // تحديث نص الزر بعد التحققات
    confirmBtn.textContent = "جارٍ الحفظ...";

    await addDoc(collection(db, "Appointments"), {
      clientId: user.uid,
      clientName: user.displayName || user.email || "عميل",
      workerId: selectedWorkerUID,
      service,
      price,
      date,
      time,
      status: "بانتظار التأكيد",
      createdAt: serverTimestamp()
    });

    // عرض رسالة تأكيد مفصلة
    const confirmationMessage = `✅ تم إرسال طلب الحجز بنجاح!

📋 تفاصيل الحجز:
• الخدمة: ${service}
• التاريخ: ${date}
• الوقت: ${time}
• السعر: ${price} دج
• الحالة: بانتظار التأكيد

📞 سيتم التواصل معك قريباً لتأكيد الموعد.`;
    
    showMessage("تم إرسال طلب الحجز بنجاح! ✅", 'success');
    
    // إظهار تفاصيل الحجز
    setTimeout(() => {
      showMessage(`الخدمة: ${service} | التاريخ: ${date} | الوقت: ${time}`, 'info');
    }, 2000);
    
    // مسح localStorage بعد الحجز الناجح
    setTimeout(() => {
      localStorage.removeItem("selectedWorkerUID");
      window.location.href = "worker_list.html";
    }, 4000);
  } catch (error) {
    console.error("خطأ في الحجز:", error);
    
    // عرض رسالة خطأ مفصلة حسب نوع الخطأ
    let errorMessage = "❌ حدث خطأ أثناء الحجز. ";
    
    if (error.code === 'permission-denied') {
      errorMessage += "ليس لديك صلاحية للوصول لهذه الخدمة.";
    } else if (error.code === 'unavailable') {
      errorMessage += "الخدمة غير متاحة حالياً. تحقق من اتصالك بالإنترنت.";
    } else if (error.code === 'failed-precondition') {
      errorMessage += "فشل في التحقق من الشروط المطلوبة.";
    } else {
      errorMessage += "يرجى المحاولة مرة أخرى.";
    }
    
    showMessage(errorMessage, 'error');
    
    // إعادة تعيين الزر
    confirmBtn.disabled = false;
    confirmBtn.textContent = originalText;
  }
});
