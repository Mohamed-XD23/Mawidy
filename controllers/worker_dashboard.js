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
  orderBy,
  addDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showModal, showAppointmentsSkeleton, setButtonLoading, showMessage, sanitizeHTML, t } from "./utils.js"; // إضافة showMessage

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
  setupAccessibility(); // إضافة دالة تحسين الوصولية
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
    showMessage(t('error_loading_appointments'), 'error', t('error_title'));
    appointmentsList.innerHTML = ""; // مسح أي محتوى سابق
  }
}

// ✅ عرض المواعيد
function displayAppointments(appointments) {
  appointmentsList.innerHTML = "";

  if (appointments.length === 0) {
    appointmentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times" aria-hidden="true"></i>
        <h3>لا توجد مواعيد</h3>
        <p>لم يتم العثور على مواعيد مطابقة للفلاتر المحددة</p>
        <button class="btn secondary-btn" onclick="location.reload()">
          <i class="fas fa-redo"></i>
          إعادة التحميل
        </button>
      </div>
    `;
    return;
  }

  appointments.forEach(appointment => {
    const card = createAppointmentCard(appointment);
    appointmentsList.appendChild(card);
  });
  
  // بعد تحديث DOM، إضافة سمات ARIA للمكونات الديناميكية
  addDynamicAriaAttributes();
}

// ✅ إضافة سمات ARIA للمكونات الديناميكية بعد إنشائها
function addDynamicAriaAttributes() {
  // إضافة سمات ARIA لبطاقات المواعيد
  const appointmentCards = document.querySelectorAll('.appointment-card');
  appointmentCards.forEach((card, index) => {
    card.setAttribute('role', 'article');
    card.setAttribute('aria-labelledby', `appointment-title-${index}`);
    
    // إضافة ID فريد للعناصر الداخلية إن لم يكن موجوداً
    const clientNameElement = card.querySelector('.client-info h3');
    if (clientNameElement) {
      clientNameElement.setAttribute('id', `appointment-title-${index}`);
    }
    
    // إضافة سمات ARIA للأزرار
    const actionButtons = card.querySelectorAll('.action-btn');
    actionButtons.forEach((button, btnIndex) => {
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.setAttribute('aria-label', `${button.textContent.trim()} للموعد ${index + 1}`);
      
      // إضافة تعليمات صوتية للقراء الشاشة
      const srOnly = document.createElement('span');
      srOnly.className = 'sr-only';
      srOnly.textContent = 'اضغط Enter أو المس لتفعيل هذا الزر';
      srOnly.setAttribute('aria-live', 'polite');
      button.appendChild(srOnly);
    });
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
        <div class="client-avatar" role="img" aria-label="صورة شخصية لـ ${sanitizeHTML(appointment.clientName) || "عميل"}">${clientInitial}</div>
        <div>
          <h3 style="margin: 0; color: #333;" tabindex="0">${sanitizeHTML(appointment.clientName) || "عميل"}</h3>
          <small style="color: #666;">عميل رقم: ${appointment.clientId.substring(0, 8)}...</small>
        </div>
      </div>
      <div class="status-badge ${getStatusClass(appointment.status)}" 
           role="status" 
           aria-live="polite"
           aria-label="حالة الموعد: ${appointment.status}">
        ${appointment.status}
      </div>
    </div>
    
    <div class="appointment-details" role="group" aria-label="تفاصيل الموعد">
      <div class="detail-item">
        <i class="fas fa-cut" aria-hidden="true"></i>
        <span><strong>الخدمة:</strong> ${sanitizeHTML(appointment.service)}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-money-bill-wave" aria-hidden="true"></i>
        <span><strong>السعر:</strong> ${sanitizeHTML(appointment.price)} دج</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-calendar-alt" aria-hidden="true"></i>
        <span><strong>التاريخ:</strong> ${formattedDate}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-clock" aria-hidden="true"></i>
        <span><strong>الوقت:</strong> ${formattedTime}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
        <span><strong>تاريخ الطلب:</strong> ${formatCreatedAt(appointment.createdAt)}</span>
      </div>
    </div>
    
    ${appointment.status === "بانتظار التأكيد" ? `
      <div class="appointment-actions" role="group" aria-label="إجراءات الموعد">
        <button class="action-btn accept-btn" 
                data-id="${appointment.id}" 
                data-action="accept"
                aria-label="تأكيد الموعد لـ ${sanitizeHTML(appointment.clientName)}"
                title="تأكيد الموعد">
          <i class="fas fa-check" aria-hidden="true"></i>
          <span>تأكيد الموعد</span>
        </button>
        <button class="action-btn reject-btn" 
                data-id="${appointment.id}" 
                data-action="reject"
                aria-label="رفض الموعد لـ ${sanitizeHTML(appointment.clientName)}"
                title="رفض الموعد">
          <i class="fas fa-times" aria-hidden="true"></i>
          <span>رفض الموعد</span>
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
  
  // إضافة مستمع للوحة المواعيد لتحسين التنقل بالتاب
  appointmentsList.addEventListener('keydown', handleAppointmentsListKeydown);
}

// ✅ التعامل مع ضغط مفاتيح لوحة المواعيد
function handleAppointmentsListKeydown(e) {
  // إذا تم الضغط على Enter أو Space على بطاقة موعد
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('appointment-card')) {
    e.preventDefault();
    
    // فتح أول زر إجراء في البطاقة إن وجد
    const actionButton = e.target.querySelector('.action-btn');
    if (actionButton) {
      actionButton.click();
    }
  }
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
    showMessage(t('update_appointment_error'), 'error', t('error_title'));
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
    showMessage(t('logout_error'), 'error', t('error_title'));
  }handleLogout
}

// ✅ تحسين الوصولية - إضافة جديدة
function setupAccessibility() {
  // إعداد التركيز على المودال عند فتحه
  const modal = document.getElementById("confirmation-modal");
  if (modal) {
    // إضافة مستمع لفتح المودال
    modal.addEventListener('show', () => {
      // البحث عن أول عنصر قابل للتركيز داخل المودال
      const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
      if (focusableElements.length > 0) {
        // تحديد أول عنصر قابل للتركيز
        focusableElements[0].focus();
        
        // إنشاء حلقة تركيز داخل المودال
        createFocusTrap(modal, focusableElements);
      }
    });
  }
}

// ✅ إنشاء حلقة تركيز داخل عنصر معين (مثل المودال)
function createFocusTrap(container, focusableElements) {
  // التعامل مع التنavig بالتاب
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      // الحصول على العنصر الحالي الذي لديه التركيز
      const currentFocus = document.activeElement;
      
      // إذا لم يكن هناك أي عنصر في التركيز، التركيز على الأول
      if (!currentFocus) {
        e.preventDefault();
        focusableElements[0].focus();
        return;
      }
      
      // الحصول على مؤشر العنصر الحالي في القائمة
      const currentIndex = Array.from(focusableElements).indexOf(currentFocus);
      
      // إذا كان الضغط على TAB بدون Shift
      if (!e.shiftKey) {
        e.preventDefault();
        // إذا كان العنصر الحالي هو الأخير، العودة إلى الأول
        if (currentIndex === focusableElements.length - 1) {
          focusableElements[0].focus();
        } else {
          // التركيز على العنصر التالي
          focusableElements[currentIndex + 1].focus();
        }
      } 
      // إذا كان الضغط على TAB مع Shift
      else {
        e.preventDefault();
        // إذا كان العنصر الحالي هو الأول، التركيز على الأخير
        if (currentIndex === 0) {
          focusableElements[focusableElements.length - 1].focus();
        } else {
          // التركيز على العنصر السابق
          focusableElements[currentIndex - 1].focus();
        }
      }
    }
  });
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
  return date.toLocaleDateString("en-US", {
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
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ✅ حفظ تقييم العامل
async function saveWorkerRating(workerId, rating, comment) {
  try {
    // التأكد من صحة التقييم
    if (!isValidRating(rating)) {
      showMessage("يرجى اختيار تقييم بين 1 و5 نجوم.", 'warning', 'تقييم خاطئ');
      return;
    }
    
    // التأكد من وجود تعليق
    if (!comment || comment.trim().length < 5) {
      showMessage("يرجى إدخال تعليق بحد أدنى 5 أحرف.", 'warning', 'تعليق غير كافٍ');
      return;
    }
    
    await addDoc(collection(db, "Reviews"), {
      workerId,
      clientId: auth.currentUser.uid,
      rating,
      comment: sanitizeHTML(comment),
      createdAt: serverTimestamp()
    });
    
    // عرض رسالة نجاح واضحة
    showModal({
      type: 'success',
      title: 'تم إرسال التقييم!',
      message: 'شكرًا لتقييمك. سيتم مشاركته مع الحلاق.',
      primaryText: 'حسنًا',
      onPrimary: () => {
        window.location.reload();
      }
    });
  } catch (error) {
    console.error("❌ خطأ في حفظ التقييم:", error);
    showMessage("فشل حفظ التقييم. يرجى المحاولة مرة أخرى.", 'error', 'خطأ في الحفظ');
  }
}

// ✅ تحديث حالة الموعد
async function updateAppointmentStatus(appointmentId, newStatus) {
  try {
    const appointmentRef = doc(db, "Appointments", appointmentId);
    await updateDoc(appointmentRef, { status: newStatus });
    
    // عرض رسالة نجاح
    showModal({
      type: 'success',
      title: 'تم تحديث الحالة!',
      message: `تم تحديث حالة الموعد إلى "${newStatus}" بنجاح.`,
      primaryText: 'حسنًا'
    });
    
    // إعادة تحميل المواعيد بعد 1.5 ثانية
    setTimeout(async () => {
      allAppointments = [];
      await loadAppointments();
    }, 1500);
  } catch (error) {
    console.error("❌ خطأ في تحديث الحالة:", error);
    showMessage("فشل تحديث حالة الموعد. يرجى المحاولة مرة أخرى.", 'error', 'خطأ في التحديث');
  }
}

// ✅ تحميل معلومات العامل
async function loadWorkerInfo() {
  try {
    const workerDoc = await getDoc(doc(db, "workers", currentUser.uid));
    if (workerDoc.exists()) {
      const workerData = workerDoc.data();
      
      // تحديث معلومات العامل في DOM
      if (workerLanguagesDisplay) workerLanguagesDisplay.textContent = workerData.languages?.join(", ") || "غير متوفر";
      if (workerExperienceDisplay) workerExperienceDisplay.textContent = workerData.experience || "غير متوفر";
      if (workerEducationDisplay) workerEducationDisplay.textContent = workerData.education || "غير متوفر";
      if (workerCertificationsDisplay) workerCertificationsDisplay.textContent = workerData.certifications?.join(", ") || "غير متوفر";
      if (workerAwardsDisplay) workerAwardsDisplay.textContent = workerData.awards?.join(", ") || "غير متوفر";
      if (workerPortfolioDisplay) workerPortfolioDisplay.innerHTML = workerData.portfolio?.map(url => `<a href="${sanitizeHTML(url)}" target="_blank">روابط المحفظة</a>`).join("، ") || "غير متوفر";
      if (workerTestimonialsDisplay) {
        // استخدام أول شهادة كمثال
        if (workerData.testimonials && workerData.testimonials.length > 0) {
          workerTestimonialsDisplay.textContent = workerData.testimonials[0];
        } else {
          workerTestimonialsDisplay.textContent = "لا توجد شهادات";
        }
      }
    }
  } catch (error) {
    console.error("❌ خطأ في تحميل معلومات العامل:", error);
    showMessage("فشل تحميل معلومات العامل. يرجى المحاولة مرة أخرى.", 'error', 'خطأ في التحميل');
  }
}

// ✅ عرض المواعيد
function renderAppointments(appointments) {
  const container = document.getElementById("appointments-container");
  if (!container) return;

  // إظهار حالة الفراغ عند عدم وجود مواعيد
  if (appointments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>لا توجد مواعيد</h3>
        <p>عذرًا، لا يوجد مواعيد متاحة في الوقت الحالي</p>
        <button class="btn secondary-btn touch-target" onclick="location.reload()">
          <i class="fas fa-redo"></i>
          إعادة التحميل
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  appointments.forEach(appointment => {
    const card = createAppointmentCard(appointment);
    container.appendChild(card);
  });
  
  // بعد تحديث DOM، إضافة سمات ARIA للمكونات الديناميكية
  addDynamicAriaAttributes();
}

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
      clientName: sanitizeHTML(user.displayName) || sanitizeHTML(user.email),
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