// worker.js
import { db, auth } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
  // Removed select as it's not a direct export in this version
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { formatStars, showWorkersSkeleton, setButtonLoading, displayRatingStars, showLoginRegisterModal } from "./utils.js";

let allWorkers = []; // مصفوفة لتخزين جميع الحلاقين


// ✅ عرض الحلاقين في الواجهة
function displayWorkers(workers) {
  const container = document.getElementById("workers-container");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");

  if (loadingState) loadingState.style.display = "none";
  if (emptyState) emptyState.style.display = "none";
  container.innerHTML = "";

  if (!workers.length) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  workers.forEach(worker => {
    const card = document.createElement("div");
    card.className = "worker-card";

    // Header
    const header = document.createElement("div");
    header.className = "worker-header";

    const avatar = document.createElement("div");
    avatar.className = "worker-avatar";
    const initials = worker.name?.split(' ').map(w => w[0]).join('').substring(0, 2) || "?";
    avatar.textContent = initials;

    const info = document.createElement("div");
    info.className = "worker-info";

    const name = document.createElement("h3");
    name.textContent = worker.name;

    const rating = document.createElement("div");
    rating.className = "worker-rating";
    const ratingContainer = document.createElement("div");
				    ratingContainer.className = "rating-container";
    const ratingValue = parseFloat(worker.actualRating || 0);
    ratingContainer.innerHTML = `
      ${displayRatingStars(ratingValue)}
      <span class="rating-text" style="margin-right: 8px; color: var(--text-secondary);">(${worker.actualRating || "0.0"})</span>
    `;
    rating.appendChild(ratingContainer);

    info.appendChild(name);
    info.appendChild(rating);
    header.appendChild(avatar);
    header.appendChild(info);

    // Details
    const details = document.createElement("div");
    details.className = "worker-details";

    const specialties = document.createElement("div");
    specialties.className = "worker-specialties";
    ["حلاقة", "لحية", "تصفيف"].forEach(service => {
      const tag = document.createElement("span");
      tag.className = "specialty-tag";
      tag.textContent = service;
      specialties.appendChild(tag);
    });

    const location = document.createElement("div");
    location.className = "worker-location";
    location.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${worker.location || "الموقع غير محدد"}`;

    details.appendChild(specialties);
    details.appendChild(location);

    // Status
    const status = document.createElement("div");
    status.className = "worker-status";

    const badge = document.createElement("span");
    badge.className = `availability-badge ${worker.isAvailable ? 'available' : 'unavailable'}`;
    badge.textContent = worker.isAvailable ? "متاح الآن" : "غير متاح";

    const bookBtn = document.createElement("button");
    bookBtn.className = "book-btn";
    bookBtn.textContent = worker.isAvailable ? "احجز الآن" : "غير متاح";
    bookBtn.disabled = !worker.isAvailable;

    if (worker.isAvailable) {
      bookBtn.addEventListener("click", () => {
        onAuthStateChanged(auth, user => {
          if (user) {
            // المستخدم مسجل الدخول، اسمح له بالانتقال إلى صفحة الحجز
            const loader = setButtonLoading(bookBtn, "جارٍ التحميل...");
            localStorage.setItem("selectedWorkerUID", worker.id);
            // تأخير قصير لإظهار loading ثم التوجيه
            setTimeout(() => {
              window.location.href = `booking.html?workerId=${worker.id}`;
            }, 500);
          } else {
            // المستخدم غير مسجل الدخول، اعرض الـ Modal
            showLoginRegisterModal();
          }
        });
      });
    }

    card.addEventListener("click", (e) => {
      if (e.target !== bookBtn) {
        localStorage.setItem("selectedWorkerUID", worker.id);
        window.location.href = "worker_profile.html";
      }
    });

    status.appendChild(badge);
    status.appendChild(bookBtn);

    card.appendChild(header);
    card.appendChild(details);
    card.appendChild(status);

    container.appendChild(card);
  });
}

// ✅ تحميل الحلاقين مع Loading Indicators
async function loadWorkers() {
  const container = document.getElementById("workers-container");

  if (!container) {
    console.error("❌ لم يتم العثور على workers-container");
    return;
  }

  try {
    // عرض skeleton loading
    showWorkersSkeleton(container, 6);

    // تحميل البيانات من Firebase (لا حاجة لـ select هنا)
    const qWorkers = query(collection(db, "worker")); // Removed select
    const workersSnap = await getDocs(qWorkers);

    const qReviews = query(collection(db, "Reviews")); // Assuming you need all review data
    const reviewsSnap = await getDocs(qReviews);

    // Group ratings
    const ratingsMap = new Map();
    reviewsSnap.forEach((doc) => {
      const { workerId, rating } = doc.data();
      if (rating != null) {
        if (!ratingsMap.has(workerId)) {
          ratingsMap.set(workerId, { total: 0, count: 0 });
        }
        const entry = ratingsMap.get(workerId);
        entry.total += rating;
        entry.count += 1;
      }
    });

    allWorkers = workersSnap.docs.map((doc) => {
      const worker = doc.data();
      const entry = ratingsMap.get(doc.id) || { total: 0, count: 0 };
      const actualRating = entry.count > 0 ? (entry.total / entry.count).toFixed(1) : "0.0";
      // Accessing fields directly from worker object
      return { id: doc.id, name: worker.name, location: worker.location, isAvailable: worker.isAvailable, actualRating };
    });

    displayWorkers(allWorkers);
    setupFilters();
  } catch (err) {
    console.error("❌ خطأ في تحميل العمال من Firebase:", err);

    // عرض رسالة خطأ للمستخدم
    if (container) {
      container.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 60px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c;"></i>
          <h3>حدث خطأ في تحميل بيانات الحلاقين</h3>
          <p>يرجى إعادة تحميل الصفحة أو التحقق من اتصالك بالإنترنت.</p>
          <button onclick="window.location.reload()" class="btn primary-btn">إعادة تحميل</button>
        </div>`;
    }
  }
}

// ✅ دالة إعادة المحاولة مع Loading Indicator
async function retryLoadWorkers() {
  const container = document.getElementById("workers-container");

  // عرض skeleton loading
  showWorkersSkeleton(container, 6);

  try {
    await loadWorkers();
  } catch (error) {
    console.error("خطأ في إعادة المحاولة:", error);
    // في حالة الفشل، اعرض رسالة خطأ
    if (container) {
      container.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 60px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c;"></i>
          <h3>حدث خطأ في تحميل البيانات</h3>
          <p>يرجى إعادة تحميل الصفحة</p>
          <button onclick="window.location.reload()" class="btn primary-btn">إعادة تحميل</button>
        </div>`;
    }
  }
}

// ✅ إعداد الفلاتر
function setupFilters() {
  document.getElementById("search-name")?.addEventListener("input", applyFilters);
  document.getElementById("sort-rating")?.addEventListener("change", applyFilters);
  document.getElementById("filter-availability")?.addEventListener("change", applyFilters);
}

// ✅ تطبيق الفلاتر
function applyFilters() {
  const searchTerm = document.getElementById("search-name").value.toLowerCase();
  const sort = document.getElementById("sort-rating").value;
  const availability = document.getElementById("filter-availability").value;

  let filtered = [...allWorkers];

  if (searchTerm) {
    filtered = filtered.filter(w => w.name.toLowerCase().includes(searchTerm));
  }

  if (availability !== "") {
    filtered = filtered.filter(w => w.isAvailable === (availability === "true"));
  }

  if (sort === "high") {
    filtered.sort((a, b) => (b.actualRating || 0) - (a.actualRating || 0));
  } else if (sort === "low") {
    filtered.sort((a, b) => (a.actualRating || 0) - (b.actualRating || 0));
  }

  displayWorkers(filtered);
}

// تحميل العمال عند بدء الصفحة
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", loadWorkers);
} else {
  // DOM جاهز بالفعل
  loadWorkers();
}

// ✅ جعل دالة retryLoadWorkers متاحة عالمياً
window.retryLoadWorkers = retryLoadWorkers;
