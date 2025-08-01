// utils.js
// دوال مساعدة مشتركة للتطبيق

/**
 * حساب متوسط التقييم من مصفوفة التقييمات
 * @param {Array} reviews - مصفوفة التقييمات
 * @returns {string} متوسط التقييم مع رقم عشري واحد
 */
export function calculateAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return "0.0";
  
  const total = reviews.reduce((acc, cur) => acc + (cur.rating || 0), 0);
  return (total / reviews.length).toFixed(1);
}

/**
 * حساب متوسط التقييم من البيانات الخام
 * @param {number} totalRating - مجموع التقييمات
 * @param {number} reviewCount - عدد التقييمات
 * @returns {string} متوسط التقييم مع رقم عشري واحد
 */
export function calculateAverageFromTotals(totalRating, reviewCount) {
  if (!reviewCount || reviewCount === 0) return "0.0";
  return (totalRating / reviewCount).toFixed(1);
}

/**
 * تنسيق عرض النجوم بناءً على التقييم
 * @param {number} rating - التقييم (من 1 إلى 5)
 * @returns {string} النجوم المنسقة
 */
export function formatStars(rating) {
  const fullStars = Math.floor(rating);
  const emptyStars = 5 - fullStars;
  return "★".repeat(fullStars) + "☆".repeat(emptyStars);
}

/**
 * التحقق من صحة التقييم
 * @param {number} rating - التقييم المراد التحقق منه
 * @returns {boolean} true إذا كان التقييم صحيحاً
 */
export function isValidRating(rating) {
  return rating && rating >= 1 && rating <= 5;
}

/**
 * تنسيق التاريخ النسبي باللغة العربية
 * @param {Date} date - التاريخ المراد تنسيقه
 * @returns {string} التاريخ المنسق
 */
export function formatRelativeTime(date) {
  if (!date) return "";
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return "الآن";
  if (diffInSeconds < 3600) return `قبل ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `قبل ${Math.floor(diffInSeconds / 3600)} ساعة`;
  if (diffInSeconds < 2592000) return `قبل ${Math.floor(diffInSeconds / 2592000)} يوم`;
  if (diffInSeconds < 31536000) return `قبل ${Math.floor(diffInSeconds / 31536000)} شهر`;
  return `قبل ${Math.floor(diffInSeconds / 31536000)} سنة`;
}

/**
 * عرض رسالة snackbar (سيتم استبدالها بـ showMessage)
 * @param {string} message - الرسالة المراد عرضها
 * @param {string} type - نوع الرسالة (success, error, warning, default)
 */
// export function showSnackbar(message, type = 'default') { ... }
// تم إزالة تعريف showSnackbar هنا لأنه تم استبدال استدعاءاتها بـ showMessage

/**
 * إضافة حالة التحميل للزر
 * @param {HTMLElement} button - عنصر الزر
 * @param {string} loadingText - النص أثناء التحميل
 * @returns {Object} كائن يحتوي على دوال التحكم
 */
export function setButtonLoading(button, loadingText = 'جارٍ التحميل...') {
  if (!button) {
    console.error("❌ الزر غير موجود في setButtonLoading");
    return null;
  }
  
  const originalText = button.textContent;
  const originalDisabled = button.disabled;
  
  // إضافة كلاسات التحميل
  button.classList.add('loading');
  button.disabled = true;
  
  // إضافة spinner والنص - Enhanced SVG Spinner
  button.innerHTML = `
    <span class="loading-spinner">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle class="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="spinner-path" d="M4 12a8 8 0 018-8v8H4z" fill="currentColor"></path>
      </svg>
    </span>
    <span class="btn-text">${loadingText}</span>
  `;
  
  return {
    stop: () => {
      button.classList.remove('loading');
      button.disabled = originalDisabled;
      button.textContent = originalText;
    },
    updateText: (newText) => {
      const textSpan = button.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = newText;
    }
  };
}

/**
 * إنشاء loading state للحاويات
 * @param {HTMLElement} container - الحاوية المراد عرض التحميل فيها
 * @param {string} message - رسالة التحميل
 */
export function showLoadingState(container, message = 'جارٍ التحميل...') {
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-state">
      <div class="dual-spinner">
        <div class="inner-spinner"></div>
      </div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * إنشاء skeleton loading للبطاقات
 * @param {HTMLElement} container - الحاوية
 * @param {number} count - عدد البطاقات الوهمية
 */
export function showSkeletonCards(container, count = 3) {
  if (!container) {
    console.error("❌ Container غير موجود في showSkeletonCards");
    return;
  }
  
  let skeletonHTML = '';
  for (let i = 0; i < count; i++) {
    skeletonHTML += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton skeleton-text title" style="width: 80%; height: 20px; margin: 10px 0;"></div>
        <div class="skeleton skeleton-text subtitle" style="width: 60%; height: 16px; margin: 8px 0;"></div>
        <div class="skeleton skeleton-text content" style="width: 90%; height: 14px; margin: 6px 0;"></div>
        <div class="skeleton skeleton-text content" style="width: 70%; height: 14px; margin: 6px 0;"></div>
        <div class="skeleton skeleton-text" style="width: 50%; height: 32px; margin: 15px 0; border-radius: 16px;"></div>
      </div>
    `;
  }
  
  container.innerHTML = skeletonHTML;
}

/**
 * إنشاء modal للرسائل
 * @param {Object} options - خيارات المودال
 */
export function showModal(options = {}) {
  const {
    type = 'info', // success, error, warning, info
    title = 'تنبيه',
    message = '',
    primaryText = 'موافق',
    secondaryText = null,
    onPrimary = null,
    onSecondary = null,
    onClose = null
  } = options;

  // إزالة أي مودال موجودة لتجنب التداخل
  closeModal();

  // إنشاء المودال باستخدام فئات CSS
  const modalHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-backdrop" onclick="closeModal()"></div>
      <div class="modal-container">
        <div class="modal-content">
          <div class="modal-icon ${type}">
            ${getModalIcon(type)}
          </div>
          <h2 class="modal-title">${title}</h2>
          <p class="modal-message">${message}</p>
          <div class="modal-actions ${secondaryText ? 'horizontal' : ''}">
            <button class="modal-btn primary" onclick="handleModalPrimary()">${primaryText}</button>
            ${secondaryText ? `<button class="modal-btn secondary" onclick="handleModalSecondary()">${secondaryText}</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // إضافة المودال للصفحة
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // حفظ callbacks
  window.modalCallbacks = {
    onPrimary,
    onSecondary,
    onClose
  };

  // منع scroll في الخلفية
  document.body.style.overflow = 'hidden';
}

/**
 * إغلاق المودال
 */
export function closeModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
    
    // تشغيل callback الإغلاق
    if (window.modalCallbacks?.onClose) {
      window.modalCallbacks.onClose();
    }
    
    // تنظيف callbacks
    delete window.modalCallbacks;
  }
}

// إضافة closeModal إلى النطاق العام للاستخدام في onclick
window.closeModal = closeModal;

/**
 * معالج الزر الأساسي
 */
window.handleModalPrimary = function() {
  if (window.modalCallbacks?.onPrimary) {
    window.modalCallbacks.onPrimary();
  }
  closeModal();
}

/**
 * معالج الزر الثانوي
 */
window.handleModalSecondary = function() {
  if (window.modalCallbacks?.onSecondary) {
    window.modalCallbacks.onSecondary();
  }
  closeModal();
}

/**
 * الحصول على أيقونة المودال باستخدام Font Awesome (تم التعديل)
 */
export function getModalIcon(type) {
  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-xmark"></i>',
    warning: '<i class="fa-solid fa-circle-exclamation"></i>',
    info: '<i class="fa-solid fa-circle-info"></i>'
  };
  
  return icons[type] || icons.info;
}

/**
 * دالة موحدة لعرض الرسائل باستخدام showModal
 * @param {string} message - محتوى الرسالة
 * @param {string} type - نوع الرسالة (success, error, warning, info)
 * @param {string|null} title - عنوان الرسالة (اختياري)
 */
export function showMessage(message, type = 'info', title = null) {
  const titles = {
    success: 'تم بنجاح!',
    error: 'حدث خطأ!',
    warning: 'تنبيه',
    info: 'معلومة'
  };
  
  showModal({
    type: type,
    title: title || titles[type] || 'رسالة',
    message: message,
    primaryText: 'موافق'
  });
}

/**
 * إنشاء rating stars تفاعلية
 * @param {HTMLElement} container - الحاوية
 * @param {number} initialRating - التقييم الأولي
 * @param {Function} onChange - دالة التغيير
 */
export function createRatingStars(container, initialRating = 0, onChange = null) {
  if (!container) return;

  const starsHTML = Array.from({length: 5}, (_, i) => {
    const starValue = 5 - i; // عكس الترتيب
    return `
      <input type="radio" name="rating" value="${starValue}" id="star${starValue}" ${starValue === initialRating ? 'checked' : ''}>
      <label for="star${starValue}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </label>
    `;
  }).join('');

  container.innerHTML = `<div class="rating">${starsHTML}</div>`;

  // إضافة event listeners
  if (onChange) {
    const inputs = container.querySelectorAll('input[name="rating"]');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        onChange(parseInt(e.target.value));
      });
    });
  }
}

/**
 * عرض rating stars للقراءة فقط
 * @param {number} rating - التقييم
 * @param {number} maxStars - أقصى عدد نجوم
 */
export function displayRatingStars(rating, maxStars = 5) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  
  let starsHTML = '';
  
  for (let i = 0; i < maxStars; i++) {
    if (i < fullStars) {
      starsHTML += `<svg class="star" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>`;
    } else if (i === fullStars && hasHalfStar) {
      starsHTML += `<svg class="star" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <defs>
          <linearGradient id="half-fill">
            <stop offset="50%" stop-color="currentColor"/>
            <stop offset="50%" stop-color="#e0e0e0"/>
          </linearGradient>
        </defs>
        <path fill="url(#half-fill)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>`;
    } else {
      starsHTML += `<svg class="star empty" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>`;
    }
  }
  
  return `<div class="rating-display">${starsHTML}</div>`;
}

// جعل الدوال المساعدة للمودال متاحة عالمياً (للاستخدام المباشر في onclick)
window.closeModal = closeModal;
window.handleModalPrimary = handleModalPrimary;
window.handleModalSecondary = handleModalSecondary;
window.showLoginRegisterModal = showLoginRegisterModal;
window.showMessage = showMessage;

/**
 * إظهار loading overlay للصفحة كاملة
 * @param {string} title - عنوان التحميل
 * @param {string} message - رسالة التحميل
 * @returns {Function} دالة لإخفاء الـ overlay
 */
export function showLoadingOverlay(title = 'جارٍ التحميل', message = 'يرجى الانتظار...') {
  // إزالة أي overlay موجود
  hideLoadingOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loading-overlay';
  
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner large"></div>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  return hideLoadingOverlay;
}

/**
 * إخفاء loading overlay
 */
export function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * إضافة loading للنماذج
 * @param {HTMLFormElement} form - النموذج
 * @param {string} loadingText - نص التحميل
 * @returns {Function} دالة لإيقاف التحميل
 */
export function setFormLoading(form, loadingText = 'جارٍ الإرسال...') {
  if (!form) return () => {};
  
  const submitButton = form.querySelector('button[type="submit"]');
  const inputs = form.querySelectorAll('input, textarea, select');
  
  // تعطيل جميع الحقول
  inputs.forEach(input => {
    input.disabled = true;
  });
  
  // إضافة loading للزر
  const buttonLoader = submitButton ? setButtonLoading(submitButton, loadingText) : null;
  
  return () => {
    // إعادة تفعيل الحقول
    inputs.forEach(input => {
      input.disabled = false;
    });
    
    // إيقاف loading الزر
    if (buttonLoader) {
      buttonLoader.stop();
    }
  };
}

// Enhanced Skeleton loading functions
export function showWorkersSkeleton(container, count = 6) {
  if (!container) return;
  
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'worker-card skeleton-card';
    skeleton.innerHTML = `
      <div class="worker-header">
        <div class="skeleton-avatar skeleton"></div>
        <div class="worker-info">
          <div class="skeleton-line skeleton"></div>
          <div class="skeleton-line skeleton"></div>
        </div>
      </div>
      <div class="worker-details">
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
      </div>
      <div class="worker-actions">
        <div class="skeleton-button skeleton"></div>
      </div>
    `;
    container.appendChild(skeleton);
  }
}

export function showProfileSkeleton(container) {
  if (!container) return;
  
  container.innerHTML = `
    <div class="profile-skeleton">
      <div class="skeleton-avatar-large skeleton"></div>
      <div class="skeleton-info">
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-button-large skeleton"></div>
      </div>
    </div>
  `;
}

export function showAppointmentsSkeleton(container, count = 4) {
  if (!container) return;
  
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'appointment-card skeleton-card';
    skeleton.innerHTML = `
      <div class="appointment-header">
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
      </div>
      <div class="appointment-details">
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
      </div>
      <div class="appointment-actions">
        <div class="skeleton-button skeleton"></div>
        <div class="skeleton-button skeleton"></div>
      </div>
    `;
    container.appendChild(skeleton);
  }
}

export function showReviewsSkeleton(container, count = 3) {
  if (!container) return;
  
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'review-card skeleton-card';
    skeleton.innerHTML = `
      <div class="review-header">
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
      </div>
      <div class="skeleton-line skeleton"></div>
      <div class="skeleton-line skeleton"></div>
    `;
    container.appendChild(skeleton);
  }
}

/**
 * عرض modal للمستخدمين غير المسجلين لتسجيل الدخول أو إنشاء حساب.
 */
export function showLoginRegisterModal() {
  showModal({
    type: 'info',
    title: 'تسجيل الدخول مطلوب',
    message: 'يجب عليك تسجيل الدخول أو إنشاء حساب لإتمام عملية الحجز.',
    primaryText: 'تسجيل الدخول',
    secondaryText: 'إنشاء حساب',
    onPrimary: () => { window.location.href = 'login.html'; },
    onSecondary: () => { window.location.href = 'register.html'; }
  });
}

// دالة تحديث نموذج التقييم
export function updateReviewForm(userAlreadyReviewed, userReviewDocId = null) {
  const form = document.getElementById("review-form");
  if (!form) return;

  if (userAlreadyReviewed) {
    form.innerHTML = `
      <p style="text-align: center; color: var(--text-secondary);">
        لقد قمت بتقييم هذا الحلاق. يمكنك تعديله أو حذفه.
      </p>
    `;
  } else {
    form.innerHTML = `
      <p class="note">ملاحظة: يُسمح بتقييم واحد فقط لكل مستخدم. يمكنك تعديله أو حذفه لاحقًا.</p>
      <h4>أضف تقييمك</h4>
      <textarea id="review-text" required></textarea>
      <div class="rating-input-section">
        <label>اختر تقييمك:</label>
        <div id="review-rating-stars" class="rating-input-container"></div>
      </div>
      <button type="submit" class="btn primary-btn">إرسال</button>
    `;
    let selectedRating = 0;
    createRatingStars(
      document.getElementById("review-rating-stars"),
      0,
      r => selectedRating = r
    );
    const btn = form.querySelector("button");
    form.onsubmit = async e => {
      e.preventDefault();
      const comment = document.getElementById("review-text").value.trim();
      if (!isValidRating(selectedRating) || !comment) {
        return showModal({ type:"warning", title:"مطلوب", message:"أدخل تعليقًا وتقييمًا." });
      }
      const loader = setButtonLoading(btn, "جارٍ الإرسال...");
      try {
        const user = auth.currentUser;
        await addDoc(collection(db, "Reviews"), {
          workerId: localStorage.getItem("selectedWorkerUID"),
          comment, rating: selectedRating,
          userId: user.uid, userName: user.displayName || user.email || "مستخدم",
          createdAt: serverTimestamp()
        });
        await fetchAndRenderReviews(localStorage.getItem("selectedWorkerUID"), user.uid);
        loader.stop();
        showMessage("✅ تم إرسال التقييم بنجاح", "success");
      } catch (e) {
        loader.stop();
        showMessage("خطأ أثناء الإرسال", "error");
      }
    };
  }
}

/**
 * Sanitizes HTML input to prevent XSS attacks
 * @param {string} input - The user input to sanitize
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(input) {
  if (!input) return '';
  // 1. Remove script tags completely
  let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // 2. Escape HTML special characters
  sanitized = sanitized.replace(/[&<>'"`]/g, (match) => {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
      '`': '&#x60;'
    };
    return escapeMap[match];
  });
  
  // 3. Filter dangerous URI schemes
  sanitized = sanitized.replace(/(javascript:|data:)/gi, 'unsafe-protocol:');
  
  return sanitized;
}

// Add error logging function
export function logClientError(error, context = 'unknown') {
  try {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack || 'No stack trace',
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Log to console for development
    console.error('Client Error:', errorData);
    
    // In production, send to Firebase
    if (typeof db !== 'undefined') {
      addDoc(collection(db, 'client_errors'), errorData)
        .catch(dbError => {
          console.error('Failed to log error to Firebase:', dbError);
        });
    }
  } catch (fatalError) {
    console.error('Fatal error logging failed:', fatalError);
  }
}

// Make logClientError globally available
window.logClientError = logClientError;

// جعل الدوال المساعدة للمودال متاحة عالمياً (للاستخدام المباشر في onclick)
window.closeModal = closeModal;
window.handleModalPrimary = handleModalPrimary;
window.handleModalSecondary = handleModalSecondary;
window.showLoginRegisterModal = showLoginRegisterModal;
window.showMessage = showMessage;

// إزالة select من firebase firestore import if not used elsewhere
// import { ..., select } from "...";
// التأكد من أن select لم يتم استخدامه في أي مكان آخر قبل حذفه بالكامل
// في هذا السياق، يبدو أنه لم يعد مستخدماً في booking.js
// ولكن لضمان عدم كسر شيء آخر، سأتركه كما هو حالياً.
