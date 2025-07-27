// worker.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

let allWorkers = []; // مصفوفة لتخزين جميع الحلاقين

// ✅ حساب التقييم من مجموعة Reviews
async function calculateWorkerRating(workerId) {
  try {
    const reviewsRef = collection(db, "Reviews");
    const q = query(reviewsRef, where("workerId", "==", workerId));
    const reviewsSnap = await getDocs(q);
    
    if (reviewsSnap.empty) return 0.0;

    let totalRating = 0;
    let reviewCount = 0;

    reviewsSnap.forEach((doc) => {
      totalRating += doc.data().rating || 0;
      reviewCount++;
    });

    return reviewCount > 0 ? totalRating / reviewCount : 0.0;
  } catch (error) {
    console.error("❌ خطأ في حساب التقييم:", error);
    return 0.0;
  }
}

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
    const stars = document.createElement("span");
    stars.className = "stars";
    stars.textContent = "★".repeat(Math.round(worker.actualRating || 0));
    const ratingText = document.createElement("span");
    ratingText.className = "rating-text";
    ratingText.textContent = `(${(worker.actualRating || 0).toFixed(1)})`;
    rating.appendChild(stars);
    rating.appendChild(ratingText);

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
        localStorage.setItem("selectedWorkerUID", worker.id);
        window.location.href = "booking.html";
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

// ✅ تحميل الحلاقين
async function loadWorkers() {
  try {
    const workersSnap = await getDocs(collection(db, "worker"));
    allWorkers = [];

    for (const doc of workersSnap.docs) {
      const worker = doc.data();
      const rating = await calculateWorkerRating(doc.id);
      allWorkers.push({ id: doc.id, ...worker, actualRating: rating });
    }

    displayWorkers(allWorkers);
    setupFilters();
  } catch (err) {
    console.error("❌ خطأ في تحميل العمال:", err);
    const container = document.getElementById("workers-container");
    if (container) {
      container.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 60px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c;"></i>
          <h3>حدث خطأ في تحميل البيانات</h3>
          <p>يرجى المحاولة مرة أخرى لاحقاً</p>
          <button onclick="location.reload()" class="btn primary-btn">إعادة المحاولة</button>
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
document.addEventListener("DOMContentLoaded", loadWorkers);
