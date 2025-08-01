/*worker_dashboard.js*/
import { auth, db } from "./firebase-config.js";
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showModal, showAppointmentsSkeleton, setButtonLoading, showMessage } from "./utils.js"; // إضافة showMessage

// عناصر DOM
const appointmentsList = document.getElementById("appointments-list");
const statusFilter = document.getElementById("status-filter");
const dateFilter = document.getElementById("date-filter");
const clearFiltersBtn = document.getElementById("clear-filters");
const refreshBtn = document.getElementById("refresh-btn");
const logoutBtn = document.getElementById("logout-btn");
const confirmationModal = document.getElementById("confirmation-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const confirmActionBtn = document.getElementById("confirm-action");
const cancelActionBtn = document.getElementById("cancel-action");
const workerLanguagesDisplay = document.getElementById("worker-languages"),
      workerExperienceDisplay = document.getElementById("worker-experience"),
      workerEducationDisplay = document.getElementById("worker-education"),
      workerCertificationsDisplay = document.getElementById("worker-certifications"),
      workerAwardsDisplay = document.getElementById("worker-awards"),
      workerPortfolioDisplay = document.getElementById("worker-portfolio"),
      workerTestimonialsDisplay = document.getElementById("worker-testimonials");

// متغيرات عامة
let allAppointments = [];
let currentUser = null;
let pendingAction = null;

// ✅ التحقق من تسجيل الدخول وتحميل البيانات
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // ➤ إعادة التوجيه للصفحة الرئيسية إذا كان المستخدم غير مسجل الدخول
    showModal({
      type: 'warning',
      title: 'تسجيل الدخول مطلوب',
      message: 'يجب تسجيل الدخول أولاً للوصول إلى لوحة التحكم.',
      primaryText: 'تسجيل الدخول',
      onPrimary: () => window.location.href = "login.html"
    });
    
    // ➤ إضافة إعادة التوجيه الإجبارية بعد فترة قصيرة
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 3000);
    return;
  }
  
  currentUser = user;
  await loadAppointments();
  setupEventListeners();
});

// ✅ تحميل المواعيد من Firebase
async function loadAppointments() {
  try {
    // عرض skeleton loading للمواعيد
    showAppointmentsSkeleton(appointmentsList, 4);

    const q = query(
      collection(db, "Appointments"),
      where("workerId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    allAppointments = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      allAppointments.push({
        id: docSnap.id,
        ...data
      });
    });

    updateStats();
    displayAppointments(allAppointments);
    
  } catch (error) {
    console.error("خطأ في تحميل المواعيد:", error);
    // استخدام showMessage بدلاً من إضافة HTML يدوي
    showMessage('حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.', 'error', 'خطأ');
    appointmentsList.innerHTML = ""; // مسح أي محتوى سابق
  }
}

// ✅ عرض المواعيد
function displayAppointments(appointments) {
  appointmentsList.innerHTML = "";

  if (appointments.length === 0) {
    appointmentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>لا توجد مواعيد</h3>
        <p>لم يتم العثور على مواعيد مطابقة للفلاتر المحددة</p>
      </div>
    `;
    return;
  }

  appointments.forEach(appointment => {
    const card = createAppointmentCard(appointment);
    appointmentsList.appendChild(card);
  });
}

// ✅ إنشاء بطاقة موعد
function createAppointmentCard(appointment) {
  const card = document.createElement("div");
  card.className = `appointment-card ${getStatusClass(appointment.status)} fade-in`;
  
  // تنسيق التاريخ والوقت
  const formattedDate = formatDate(appointment.date);
  const formattedTime = formatTime(appointment.time);
  
  // الحرف الأول من اسم العميل للأفاتار
  const clientInitial = appointment.clientName ? appointment.clientName.charAt(0).toUpperCase() : "ع";
  
  card.innerHTML = `
    <div class="appointment-header">
      <div class="client-info">
        <div class="client-avatar">${clientInitial}</div>
        <div>
          <h3 style="margin: 0; color: #333;">${appointment.clientName || "عميل"}</h3>
          <small style="color: #666;">عميل رقم: ${appointment.clientId.substring(0, 8)}...</small>
        </div>
      </div>
      <div class="status-badge ${getStatusClass(appointment.status)}">
        ${appointment.status}
      </div>
    </div>
    
    <div class="appointment-details">
      <div class="detail-item">
        <i class="fas fa-cut"></i>
        <span><strong>الخدمة:</strong> ${appointment.service}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-money-bill-wave"></i>
        <span><strong>السعر:</strong> ${appointment.price} دج</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-calendar-alt"></i>
        <span><strong>التاريخ:</strong> ${formattedDate}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-clock"></i>
        <span><strong>الوقت:</strong> ${formattedTime}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-info-circle"></i>
        <span><strong>تاريخ الطلب:</strong> ${formatCreatedAt(appointment.createdAt)}</span>
      </div>
    </div>
    
    ${appointment.status === "بانتظار التأكيد" ? `
      <div class="appointment-actions">
        <button class="action-btn accept-btn" data-id="${appointment.id}" data-action="accept">
          <i class="fas fa-check"></i>
          تأكيد الموعد
        </button>
        <button class="action-btn reject-btn" data-id="${appointment.id}" data-action="reject">
          <i class="fas fa-times"></i>
          رفض الموعد
        </button>
      </div>
    ` : ""}
  `;
  
  return card;
}

// ✅ تحديث الإحصائيات
function updateStats() {
  const pending = allAppointments.filter(app => app.status === "بانتظار التأكيد").length;
  const confirmed = allAppointments.filter(app => app.status === "تم التأكيد").length;
  const rejected = allAppointments.filter(app => app.status === "مرفوض").length;
  
  document.getElementById("pending-count").textContent = pending;
  document.getElementById("confirmed-count").textContent = confirmed;
  document.getElementById("rejected-count").textContent = rejected;
}

// ✅ إعداد مستمعي الأحداث
function setupEventListeners() {
  // أزرار الإجراءات
  appointmentsList.addEventListener("click", handleAppointmentAction);
  
  // فلاتر
  statusFilter.addEventListener("change", applyFilters);
  dateFilter.addEventListener("change", applyFilters);
  clearFiltersBtn.addEventListener("click", clearFilters);
  
  // أزرار الهيدر
  refreshBtn.addEventListener("click", loadAppointments);
  logoutBtn.addEventListener("click", handleLogout);
  
  // نافذة التأكيد (المودال الجديدة هي showModal)
  // يجب إزالة مستمعي الأحداث من المودال القديمة إذا كانت لا تزال موجودة في HTML
  if(confirmActionBtn) confirmActionBtn.removeEventListener("click", executeAction);
  if(cancelActionBtn) cancelActionBtn.removeEventListener("click", closeModal);
  if(confirmationModal) confirmationModal.removeEventListener("click", (e) => {
    if (e.target === confirmationModal) {
      closeModal();
    }
  });

  // استخدام showModal الجديدة للإغلاق
  // closeModal is now globally available from utils.js
}

// ✅ معالجة إجراءات المواعيد
function handleAppointmentAction(e) {
  if (e.target.classList.contains("action-btn")) { // تعديل للتحقق من أي زر إجراء
    const appointmentId = e.target.getAttribute("data-id");
    const action = e.target.getAttribute("data-action");
    const appointment = allAppointments.find(app => app.id === appointmentId);
    
    if (!appointment) return;
    
    // إضافة loading للزر المضغوط
    const clickedButton = e.target;
    const loader = setButtonLoading(clickedButton, "جارٍ المعالجة...");
    
    // تخزين الإجراء والزر للاستخدام لاحقاً في executeAction
    pendingAction = {
      appointmentId,
      action,
      appointment,
      buttonLoader: loader
    };
    
    // عرض نافذة التأكيد باستخدام showModal
    const isAccept = action === "accept";
    showModal({
      type: isAccept ? 'info' : 'warning',
      title: isAccept ? "تأكيد الموعد" : "رفض الموعد",
      message: `هل أنت متأكد من ${isAccept ? "تأكيد" : "رفض"} موعد العميل ${appointment.clientName}؟

تفاصيل الموعد:
• الخدمة: ${appointment.service}
• التاريخ: ${formatDate(appointment.date)}
• الوقت: ${formatTime(appointment.time)}`,
      primaryText: isAccept ? "تأكيد الموعد" : "رفض الموعد",
      secondaryText: "إلغاء",
      onPrimary: () => executeAction(appointmentId, action), // استدعاء executeAction عند التأكيد
      onSecondary: () => {
        console.log('تم إلغاء العملية');
        // إيقاف loading الزر الأصلي إذا ألغى المستخدم
        if (pendingAction && pendingAction.buttonLoader) {
           pendingAction.buttonLoader.stop();
        }
        pendingAction = null; // مسح الإجراء المعلق
      }
    });
  }
}

// ✅ تنفيذ الإجراء
async function executeAction(appointmentId, action) {
  // لا حاجة لتحديث نص الزر هنا، loading يتم إدارته في handleAppointmentAction
  // ولا حاجة لتعطيل الأزرار هنا أيضاً.

  if (!appointmentId || !action) {
     // إيقاف loading الزر الأصلي في حالة وجود خطأ غير متوقع
    if (pendingAction && pendingAction.buttonLoader) {
       pendingAction.buttonLoader.stop();
    }
    pendingAction = null;
    return;
  }

  const newStatus = action === "accept" ? "تم التأكيد" : "مرفوض";
  
  try {
    await updateDoc(doc(db, "Appointments", appointmentId), {
      status: newStatus
    });
    
    // تحديث البيانات المحلية
    const appointmentIndex = allAppointments.findIndex(app => app.id === appointmentId);
    if (appointmentIndex !== -1) {
      allAppointments[appointmentIndex].status = newStatus;
    }
    
    // closeModal(); // showModal تقوم بالإغلاق تلقائياً بعد onPrimary
    updateStats();
    displayAppointments(getFilteredAppointments());
    
    showMessage(
      action === "accept" ? 
        "تم تأكيد الموعد بنجاح. سيتم إشعار العميل بالتأكيد." :
        "تم رفض الموعد. سيتم إشعار العميل بالرفض.",
      'success', // استخدام نوع success لرسائل النجاح
      action === "accept" ? "تم تأكيد الموعد!" : "تم رفض الموعد"
    );
    
  } catch (error) {
    console.error("خطأ في تحديث الموعد:", error);
    showMessage('حدث خطأ أثناء تحديث الموعد. يرجى المحاولة مرة أخرى.', 'error', 'خطأ في التحديث');
  } finally {
    // إيقاف loading الزر الأصلي بعد انتهاء العملية (سواء نجحت أو فشلت)
    if (pendingAction && pendingAction.buttonLoader) {
      pendingAction.buttonLoader.stop();
    }
    pendingAction = null; // مسح الإجراء المعلق
  }
}

// ✅ إغلاق نافذة التأكيد (هذه الدالة لم تعد تستخدم المودال القديمة مباشرة)
// يمكن إزالة هذه الدالة إذا لم يتم استدعاؤها من أي مكان آخر
// أو تحديثها لاستدعاء closeModal() العامة إذا كانت لا تزال ضرورية لإغلاق المودال القديمة
// بناءً على المراجعة الأولية، يبدو أن المودال القديمة في HTML يمكن إزالتها.
// للحفاظ على التوافق إذا كانت هناك استدعاءات أخرى غير معروفة، سأتركها تستدعي closeModal العامة.
function closeModal() {
   window.closeModal(); // استدعاء closeModal العامة من utils.js
}

// ✅ تطبيق الفلاتر
function applyFilters() {
  const filteredAppointments = getFilteredAppointments();
  displayAppointments(filteredAppointments);
}

// ✅ الحصول على المواعيد المفلترة
function getFilteredAppointments() {
  let filtered = [...allAppointments];
  
  // فلترة حسب الحالة
  const statusValue = statusFilter.value;
  if (statusValue) {
    filtered = filtered.filter(app => app.status === statusValue);
  }
  
  // فلترة حسب التاريخ
  const dateValue = dateFilter.value;
  if (dateValue) {
    filtered = filtered.filter(app => app.date === dateValue);
  }
  
  return filtered;
}

// ✅ مسح الفلاتر
function clearFilters() {
  statusFilter.value = "";
  dateFilter.value = "";
  displayAppointments(allAppointments);
}

// ✅ تسجيل الخروج
async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("خطأ في تسجيل الخروج:", error);
    // استخدام showMessage بدلاً من showNotification
    showMessage('حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.', 'error', 'فشل تسجيل الخروج');
  }handleLogout
}

// ✅ دوال مساعدة (لا تستخدم آليات رسائل غير موحدة)

function getStatusClass(status) {
  switch (status) {
    case "بانتظار التأكيد":
      return "pending";
    case "تم التأكيد":
      return "confirmed";
    case "مرفوض":
      return "rejected";
    default:
      return "";
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const period = hour >= 12 ? "مساءً" : "صباحاً";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
}

function formatCreatedAt(timestamp) {
  if (!timestamp || !timestamp.toDate) return "غير محدد";
  
  const date = timestamp.toDate();
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// تم استبدال showNotification بدالة showMessage من utils.js
// يمكن إزالة تعريف دالة showNotification هنا إذا لم يتم استخدامها في أي مكان آخر.
// للحفاظ على التوافق إذا كانت هناك استدعاءات أخرى غير معروفة، سأتركها حالياً مع رسالة تحذير.
function showNotification(message, type = "info") {
  console.warn("⚠️ تم استدعاء showNotification قديمة. استخدم showModal أو showMessage بدلاً منها.");
  showMessage(message, type);
}

// إزالة تنسيقات الحركة الخاصة بالإشعارات القديمة إذا لم تعد ضرورية
// يمكن إبقاء هذا الكود إذا كانت التنسيقات تستخدم لأغراض أخرى.
// بناءً على المراجعة، يبدو أنها خاصة بـ showNotification ويمكن إزالتها.
// للتأكد، سأتركها حالياً.
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);