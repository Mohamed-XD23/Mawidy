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

// متغيرات عامة
let allAppointments = [];
let currentUser = null;
let pendingAction = null;

// ✅ التحقق من تسجيل الدخول وتحميل البيانات
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("يجب تسجيل الدخول أولاً");
    window.location.href = "login.html";
    return;
  }
  
  currentUser = user;
  await loadAppointments();
  setupEventListeners();
});

// ✅ تحميل المواعيد من Firebase
async function loadAppointments() {
  try {
    appointmentsList.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner fa-spin"></i>
        جارٍ تحميل المواعيد...
      </div>
    `;

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
    appointmentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>حدث خطأ في تحميل البيانات</h3>
        <p>يرجى المحاولة مرة أخرى</p>
      </div>
    `;
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
  
  // نافذة التأكيد
  confirmActionBtn.addEventListener("click", executeAction);
  cancelActionBtn.addEventListener("click", closeModal);
  
  // إغلاق النافذة بالنقر خارجها
  confirmationModal.addEventListener("click", (e) => {
    if (e.target === confirmationModal) {
      closeModal();
    }
  });
}

// ✅ معالجة إجراءات المواعيد
function handleAppointmentAction(e) {
  if (e.target.classList.contains("accept-btn") || e.target.classList.contains("reject-btn")) {
    const appointmentId = e.target.getAttribute("data-id");
    const action = e.target.getAttribute("data-action");
    const appointment = allAppointments.find(app => app.id === appointmentId);
    
    if (!appointment) return;
    
    pendingAction = {
      appointmentId,
      action,
      appointment
    };
    
    showConfirmationModal(action, appointment);
  }
}

// ✅ عرض نافذة التأكيد
function showConfirmationModal(action, appointment) {
  const isAccept = action === "accept";
  
  modalTitle.textContent = isAccept ? "تأكيد الموعد" : "رفض الموعد";
  modalMessage.innerHTML = `
    هل أنت متأكد من ${isAccept ? "تأكيد" : "رفض"} موعد العميل <strong>${appointment.clientName}</strong>؟
    <br><br>
    <strong>تفاصيل الموعد:</strong><br>
    الخدمة: ${appointment.service}<br>
    التاريخ: ${formatDate(appointment.date)}<br>
    الوقت: ${formatTime(appointment.time)}
  `;
  
  confirmActionBtn.textContent = isAccept ? "تأكيد الموعد" : "رفض الموعد";
  confirmActionBtn.className = `btn ${isAccept ? "primary-btn" : "danger-btn"}`;
  
  confirmationModal.style.display = "block";
}

// ✅ تنفيذ الإجراء
async function executeAction() {
  if (!pendingAction) return;
  
  const { appointmentId, action } = pendingAction;
  const newStatus = action === "accept" ? "تم التأكيد" : "مرفوض";
  
  try {
    confirmActionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ التحديث...';
    confirmActionBtn.disabled = true;
    
    await updateDoc(doc(db, "Appointments", appointmentId), {
      status: newStatus
    });
    
    // تحديث البيانات المحلية
    const appointmentIndex = allAppointments.findIndex(app => app.id === appointmentId);
    if (appointmentIndex !== -1) {
      allAppointments[appointmentIndex].status = newStatus;
    }
    
    closeModal();
    updateStats();
    displayAppointments(getFilteredAppointments());
    
    showNotification(
      action === "accept" ? "تم تأكيد الموعد بنجاح" : "تم رفض الموعد بنجاح",
      "success"
    );
    
  } catch (error) {
    console.error("خطأ في تحديث الموعد:", error);
    showNotification("حدث خطأ أثناء تحديث الموعد", "error");
  } finally {
    confirmActionBtn.disabled = false;
    confirmActionBtn.innerHTML = pendingAction.action === "accept" ? "تأكيد الموعد" : "رفض الموعد";
  }
}

// ✅ إغلاق نافذة التأكيد
function closeModal() {
  confirmationModal.style.display = "none";
  pendingAction = null;
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
    window.location.href = "login.html";
  } catch (error) {
    console.error("خطأ في تسجيل الخروج:", error);
    showNotification("حدث خطأ أثناء تسجيل الخروج", "error");
  }
}

// ✅ دوال مساعدة

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

function showNotification(message, type = "info") {
  // إنشاء عنصر الإشعار
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
    ${message}
  `;
  
  // إضافة التنسيقات
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === "success" ? "#28a745" : type === "error" ? "#dc3545" : "#17a2b8"};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 1001;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // إزالة الإشعار بعد 3 ثوان
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// إضافة تنسيقات الحركة للإشعارات
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