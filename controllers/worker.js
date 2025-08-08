// worker.js
import { db, auth, updateDoc, doc } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

// Make auth available globally for retry functionality
window.auth = auth;
import { formatStars, showWorkersSkeleton, setButtonLoading, displayRatingStars, showLoginRegisterModal, showMessage, sanitizeHTML, t } from "./utils.js"; // 🐛 Fix: added missing 't' for translations

let allWorkers = []; // workers_array

// loading_workers_data
async function loadWorkers() {
  const container = document.getElementById("workers-container");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  
  try {
    showWorkersSkeleton(container, 6);
    
    // get_workers_data
    // adjust_query
    const workersRef = collection(db, "users");
    const q = query(workersRef, where("role", "==", "worker"));
    const querySnapshot = await getDocs(q);
    
    allWorkers = [];
    querySnapshot.forEach((doc) => {
      allWorkers.push({ id: doc.id, ...doc.data() });
    });
    
    // update_actual_ratings
    for (let i = 0; i < allWorkers.length; i++) {
      const worker = allWorkers[i];
      // check_user_access
      try {
        const ratingsRef = collection(db, "users", worker.id, "ratings");
        const ratingsSnapshot = await getDocs(ratingsRef);
        
        let totalRating = 0;
        let ratingCount = 0;
        
        ratingsSnapshot.forEach((doc) => {
          const ratingData = doc.data();
          totalRating += ratingData.average;
          ratingCount++;
        });
        
        worker.actualRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "0.0";
      } catch (ratingsError) {
        // default_rating
        console.warn(`${t('cannot_read_ratings')} ${worker.id}:`, ratingsError);
        worker.actualRating = "0.0";
      }
    }
    
    // display_workers
    displayWorkers(allWorkers);
  } catch (error) {
    console.error("❌ error_loading_workers:", error);
    showMessage(t('error_loading_workers'), 'error', t('error_title'));
    
    if (loadingState) loadingState.style.display = "none";
    if (emptyState) {
      emptyState.style.display = "block";
      container.style.display = "none";
    }
  } finally {
    showWorkersSkeleton(container, 0);
  }
}

// display_workers
function displayWorkers(workers) {
  const container = document.getElementById("workers-container");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");

  if (loadingState) loadingState.style.display = "none";
  
  if (!workers.length) {
    if (emptyState) {
      emptyState.style.display = "block";
      container.style.display = "none";
    }
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  container.style.display = "grid";
  
  container.innerHTML = "";

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
    name.textContent = sanitizeHTML(worker.name);

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
    [t('haircut'), t('beard_trim'), t('styling')].forEach(service => {
      const tag = document.createElement("span");
      tag.className = "specialty-tag";
      tag.textContent = service;
      specialties.appendChild(tag);
    });

    const location = document.createElement("div");
    location.className = "worker-location";
    location.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${sanitizeHTML(worker.location) || t('location_undefined')}`;

    details.appendChild(specialties);
    details.appendChild(location);

    // Status
    const status = document.createElement("div");
    status.className = "worker-status";

    const badge = document.createElement("span");
    badge.className = `availability-badge ${worker.isAvailable ? 'available' : 'unavailable'}`;
    badge.textContent = worker.isAvailable ? t('available_now') : t('not_available');

    const bookBtn = document.createElement("button");
    bookBtn.className = "book-btn";
    bookBtn.textContent = worker.isAvailable ? t('book_now') : t('not_available');
    bookBtn.disabled = !worker.isAvailable;

    if (worker.isAvailable) {
      bookBtn.addEventListener("click", () => {
        onAuthStateChanged(auth, user => {
          if (user) {
            // user_logged_in
            const loader = setButtonLoading(bookBtn, t('loading'));
            localStorage.setItem("selectedWorkerUID", worker.id);
            // short_loading_delay
            setTimeout(() => {
              window.location.href = `booking.html?workerId=${worker.id}`;
            }, 500);
          } else {
            // user_not_logged_in
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
  })};
// page_event_listener
document.addEventListener("DOMContentLoaded", async () => {
  // load_workers_data
  await loadWorkers();
});