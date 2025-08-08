import { auth, db } from "./firebase-config.js";
import {
  doc, getDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp, orderBy, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  calculateAverageFromTotals, isValidRating, setButtonLoading,
  showModal, displayRatingStars, createRatingStars, t,
  showProfileSkeleton, showReviewsSkeleton, showMessage, sanitizeHTML
} from "./utils.js";
import dayjs from "https://esm.sh/dayjs@1.11.10";
import relativeTime from "https://esm.sh/dayjs@1.11.10/plugin/relativeTime";
import "https://esm.sh/dayjs@1.11.10/locale/ar";

dayjs.extend(relativeTime);
dayjs.locale("ar");

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".profile-container");
  showProfileSkeleton(container);

  onAuthStateChanged(auth, async user => {
    if (!user) {
      // redirect_to_home
      showModal({
        type: 'warning',
        title: t('login_required_title'),
        message: t('login_required_message'),
        primaryText: t('login_button_text'),
        onPrimary: () => window.location.href = "login.html"
      });
      
      // redirect_delay
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);
      return;
    }

    const currentUserId = user.uid;
    let uid = localStorage.getItem("selectedWorkerUID") ||
              new URLSearchParams(location.search).get("workerId");
    if (!uid) {
      showMessage(t('no_worker_selected'), "warning");
      return setTimeout(() => location.href = "worker_list.html", 2000);
    }
    localStorage.setItem("selectedWorkerUID", uid);

    try {
      const snap = await getDoc(doc(db, "worker", uid));
      if (!snap.exists()) throw new Error(t('worker_not_found'));
      const worker = snap.data();

      container.innerHTML = `
        <div class="card">
          <img id="worker-photo" class="worker-photo" loading="lazy" />
          <h2 id="worker-name"></h2>
          <p id="worker-phone"></p>
          <p id="worker-bio" class="bio"></p>
          <p class="worker-status">${t('worker_status_label')}<span id="worker-status"></span></p>
          <div class="worker-rating-section">
            <strong>${t('worker_rating_label')}</strong>
            <div id="worker-rating" class="rating-display-container"></div>
          </div>
          <button id="bookNowBtn" class="btn primary-btn">${t('book_now_button')}</button>
        </div>
        <div class="reviews-section">
          <h3>${t('customer_reviews')}</h3>
          <div id="reviews-list"></div>
          <form id="review-form"></form>
        </div>
      `;

      document.getElementById("worker-photo").src = worker.photoURL || "img/default-avatar.svg";
      document.getElementById("worker-photo").onerror = () => {
        document.getElementById("worker-photo").src = "img/default-avatar.svg";
      };
      document.getElementById("worker-name").textContent = worker.name || t('default_worker_name');
      document.getElementById("worker-phone").textContent = worker.phone || t('default_worker_phone');
      document.getElementById("worker-bio").textContent = worker.bio || t('default_worker_bio');
      document.getElementById("worker-status").textContent = worker.isAvailable ? t('worker_available') : t('worker_unavailable');
      const bookBtn = document.getElementById("bookNowBtn");
      bookBtn.disabled = !worker.isAvailable;
      bookBtn.onclick = () => {
        setButtonLoading(bookBtn, t('book_button_loading'));
        localStorage.setItem("selectedWorkerUID", uid);
        setTimeout(() => location.href = "booking.html", 500);
      };

      await fetchAndRenderReviews(uid, currentUserId);

    } catch (e) {
      showModal({
        type: "error",
        title: t('error_title'),
        message: t('error_loading_worker'),
        primaryText: t('retry_button'),
        onPrimary: () => location.reload()
      });
    }
  });
});

async function fetchAndRenderReviews(workerId, currentUserId) {
  const container = document.getElementById("reviews-list");
  for (let i = 0; i < 5 && !container; i++) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (!container) return console.error(t('reviews_list_not_found'));

  showReviewsSkeleton(container, 3);
  const snaps = await getDocs(
    query(
      collection(db, "Reviews"),
      where("workerId", "==", workerId),
      orderBy("createdAt", "desc")
    )
  );
  container.innerHTML = "";

  let total = 0, count = 0, userReviewed = false, userDocId = null;
  snaps.forEach(docSnap => {
    const r = docSnap.data(), id = docSnap.id;
    const dateStr = r.createdAt?.toDate ? dayjs(r.createdAt.toDate()).fromNow() : "";
    total += r.rating || 0; count++;
    if (r.userId === currentUserId) {
      userReviewed = true;
      userDocId = id;
    }
    const div = document.createElement("div");
    div.className = "review-item";
    div.dataset.reviewId = id;
    div.dataset.comment = r.comment || "";
    div.dataset.rating = r.rating || 0;
    div.innerHTML = `
      <div class="review-header">
        <div class="review-avatar">${(sanitizeHTML(r.userName) || t('review_avatar_default'))[0]}</div>
        <div>
          <span class="review-user">${sanitizeHTML(r.userName) || t('review_user_default')}</span>
          <span class="review-date">${dateStr}</span>
        </div>
        <div class="review-stars">${displayRatingStars(r.rating || 0)}</div>
      </div>
      <p class="review-comment">${sanitizeHTML(r.comment) || ""}</p>
    `;
    if (r.userId === currentUserId) {
      const edit = document.createElement("button");
      edit.textContent = t('edit_review_button');
      edit.className = "btn edit-btn";
      edit.onclick = () => showEditForm(id);
      const del = document.createElement("button");
      del.textContent = t('delete_review_button');
      del.className = "btn delete-btn";
      del.onclick = () => confirmDelete(id, workerId, currentUserId, del);
      div.append(edit, del);
    }
    container.append(div);
  });

  const avg = calculateAverageFromTotals(total, count);
  document.getElementById("worker-rating").innerHTML =
    `${displayRatingStars(parseFloat(avg))}<span>(${avg})</span>`;

  if (!userReviewed) {
    setupReviewForm();
  } else {
    document.getElementById("review-form").innerHTML = `
      <p class="already-rated">${t('already_rated_message')}</p>
    `;
  }
}

function confirmDelete(reviewId, workerId, currentUserId, btn) {
  showModal({
    type: "warning",
    title: t('confirm_delete_title'),
    message: t('confirm_delete_message'),
    primaryText: t('yes_button'),
    secondaryText: t('cancel_button'),
    onPrimary: async () => {
      const loader = setButtonLoading(btn, t('deleting_review'));
      try {
        await deleteDoc(doc(db, "Reviews", reviewId));
        await fetchAndRenderReviews(workerId, currentUserId);
      } catch {
        showMessage(t('error_deleting_review'), "error");
      } finally {
        loader.stop();
      }
    }
  });
}

function setupReviewForm() {
  const form = document.getElementById("review-form");
  form.innerHTML = `
    <h4>${t('add_review_heading')}</h4>
    <textarea id="review-text" required></textarea>
    <div class="rating-input-section">
      <label>${t('choose_your_rating')}</label>
      <div id="review-rating-stars" class="rating-input-container"></div>
    </div>
    <button type="submit" class="btn primary-btn">${t('submit_review_button')}</button>
  `;
  let selectedRating = 0;
  createRatingStars(
    document.getElementById("review-rating-stars"),
    0,
    r => selectedRating = r
  );
  form.onsubmit = async e => {
    e.preventDefault();
    const comment = document.getElementById("review-text").value.trim();
    if (!isValidRating(selectedRating) || !comment) {
      return showModal({ type: "warning", title: t('missing_rating_title'), message: t('missing_rating_message') });
    }
    const btn = form.querySelector("button");
    const loader = setButtonLoading(btn, t('sending_review'));
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "Reviews"), {
        workerId: localStorage.getItem("selectedWorkerUID"),
        comment, rating: selectedRating,
        userId: user.uid, userName: user.displayName || user.email || t('default_user_name'),
        createdAt: serverTimestamp()
      });
      await fetchAndRenderReviews(localStorage.getItem("selectedWorkerUID"), user.uid);
      form.reset();
      loader.stop();
      showMessage(t('review_sent_success'), "success");
    } catch {
      loader.stop();
      showMessage(t('error_sending_review'), "error");
    }
  };
}

function showEditForm(reviewId) {
  const item = document.querySelector(`[data-review-id="${reviewId}"]`);
  const comment = item.dataset.comment;
  const rating = parseInt(item.dataset.rating);
  const form = document.getElementById("review-form");
  form.innerHTML = `
    <h4>${t('edit_review_heading')}</h4>
    <textarea id="edit-review-text">${comment}</textarea>
    <div class="rating-input-section">
      <label>${t('choose_your_rating')}</label>
      <div id="edit-review-rating-stars" class="rating-input-container"></div>
    </div>
    <button id="save-edit-btn" class="btn primary-btn">${t('save_button')}</button>
    <button id="cancel-edit-btn" class="btn secondary-btn">${t('cancel_button')}</button>
  `;
  let edited = rating;
  createRatingStars(
    document.getElementById("edit-review-rating-stars"),
    rating,
    v => edited = v
  );
  document.getElementById("save-edit-btn").onclick = async () => {
    const btn = document.getElementById("save-edit-btn");
    const loader = setButtonLoading(btn, t('saving_review'));
    try {
      await updateDoc(doc(db, "Reviews", reviewId), {
        comment: document.getElementById("edit-review-text").value.trim(),
        rating: edited,
        updatedAt: serverTimestamp()
      });
      const user = auth.currentUser;
      await fetchAndRenderReviews(localStorage.getItem("selectedWorkerUID"), user.uid);
      loader.stop();
      showMessage(t('review_edited_success'), "success");
    } catch {
      loader.stop();
      showMessage(t('error_editing_review'), "error");
    }
  };
  document.getElementById("cancel-edit-btn").onclick = () => {
    const user = auth.currentUser;
    fetchAndRenderReviews(localStorage.getItem("selectedWorkerUID"), user.uid);
  };
}

// save_rating
async function saveRating() {
  const ratingInputs = document.querySelectorAll('.rating-stars input[name="rating"]:checked');
  const commentInput = document.getElementById("review-text");
  
  // التأكد من وجود تقييم
  if (ratingInputs.length === 0) {
    showMessage(t('rating_required'), 'warning', t('rating_required_title'));
    return;
  }
  
  // التأكد من وجود تعليق
  const comment = commentInput.value.trim();
  if (!comment || comment.length < 5) {
    showMessage(t('comment_required'), 'warning', t('comment_required_title'));
    return;
  }
  
  try {
    const workerId = localStorage.getItem('selectedWorkerUID');
    if (!workerId) {
      showMessage(t('no_worker_selected_error'), 'error', t('worker_selection_error_title'));
      return;
    }
    
    await addDoc(collection(db, "Reviews"), {
      workerId,
      clientId: auth.currentUser.uid,
      rating: parseInt(ratingInputs[0].value),
      comment: sanitizeHTML(comment),
      createdAt: serverTimestamp()
    });
    
    // show clear success message
    showModal({
      type: 'success',
      title: t('review_sent_success_title'),
      message: t('review_sent_success_message'),
      primaryText: t('ok_button_text'),
      onPrimary: () => window.location.reload()
    });
  } catch (error) {
    console.error("❌ خطأ في حفظ التقييم:", error);
    showMessage(t('error_saving_review'), 'error', t('error_saving_review_title'));
  }
}

// handle_rating_load_failure
//     }catch (error) {
//       console.error(t('error_loading_ratings'), error);
//       showMessage(t('error_loading_ratings_message'), 'error', t('error_loading_ratings_title'));
// }