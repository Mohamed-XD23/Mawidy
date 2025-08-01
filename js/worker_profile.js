import { auth, db } from "./firebase-config.js";
import {
  doc, getDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp, orderBy, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  calculateAverageFromTotals, isValidRating, setButtonLoading,
  showModal, displayRatingStars, createRatingStars,
  showProfileSkeleton, showReviewsSkeleton, showMessage
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
      // ➤ إعادة التوجيه للصفحة الرئيسية إذا كان المستخدم غير مسجل الدخول
      showModal({
        type: 'warning',
        title: 'تسجيل الدخول مطلوب',
        message: 'يجب تسجيل الدخول أولاً لمشاهدة ملف الحلاق.',
        primaryText: 'تسجيل الدخول',
        onPrimary: () => window.location.href = "login.html"
      });
      
      // ➤ إضافة إعادة التوجيه الإجبارية بعد فترة قصيرة
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);
      return;
    }

    const currentUserId = user.uid;
    let uid = localStorage.getItem("selectedWorkerUID") ||
              new URLSearchParams(location.search).get("workerId");
    if (!uid) {
      showMessage("لم يتم تحديد الحلاق.", "warning");
      return setTimeout(() => location.href = "worker_list.html", 2000);
    }
    localStorage.setItem("selectedWorkerUID", uid);

    try {
      const snap = await getDoc(doc(db, "worker", uid));
      if (!snap.exists()) throw new Error("غير موجود");
      const worker = snap.data();

      container.innerHTML = `
        <div class="card">
          <img id="worker-photo" class="worker-photo" loading="lazy" />
          <h2 id="worker-name"></h2>
          <p id="worker-phone"></p>
          <p id="worker-bio" class="bio"></p>
          <p class="worker-status">الحالة: <span id="worker-status"></span></p>
          <div class="worker-rating-section">
            <strong>التقييم:</strong>
            <div id="worker-rating" class="rating-display-container"></div>
          </div>
          <button id="bookNowBtn" class="btn primary-btn">احجز الآن</button>
        </div>
        <div class="reviews-section">
          <h3>آراء العملاء</h3>
          <div id="reviews-list"></div>
          <form id="review-form"></form>
        </div>
      `;

      document.getElementById("worker-photo").src = worker.photoURL || "img/default-avatar.svg";
      document.getElementById("worker-photo").onerror = () => {
        document.getElementById("worker-photo").src = "img/default-avatar.svg";
      };
      document.getElementById("worker-name").textContent = worker.name || "غير متوفر";
      document.getElementById("worker-phone").textContent = worker.phone || "غير متوفر";
      document.getElementById("worker-bio").textContent = worker.bio || "لا يوجد وصف";
      document.getElementById("worker-status").textContent = worker.isAvailable ? "متاح الآن" : "غير متاح";
      const bookBtn = document.getElementById("bookNowBtn");
      bookBtn.disabled = !worker.isAvailable;
      bookBtn.onclick = () => {
        setButtonLoading(bookBtn, "... جار التحميل");
        localStorage.setItem("selectedWorkerUID", uid);
        setTimeout(() => location.href = "booking.html", 500);
      };

      await fetchAndRenderReviews(uid, currentUserId);

    } catch (e) {
      showModal({
        type: "error",
        title: "خطأ",
        message: "تعذر تحميل بيانات الحلاق.",
        primaryText: "إعادة المحاولة",
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
  if (!container) return console.error("reviews-list غير موجود");

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
        <div class="review-avatar">${(r.userName || "م")[0]}</div>
        <div>
          <span class="review-user">${r.userName || "مستخدم"}</span>
          <span class="review-date">${dateStr}</span>
        </div>
        <div class="review-stars">${displayRatingStars(r.rating || 0)}</div>
      </div>
      <p class="review-comment">${r.comment || ""}</p>
    `;
    if (r.userId === currentUserId) {
      const edit = document.createElement("button");
      edit.textContent = "تعديل";
      edit.className = "btn edit-btn";
      edit.onclick = () => showEditForm(id);
      const del = document.createElement("button");
      del.textContent = "حذف";
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
      <p class="already-rated">لقد قمت بتقييم هذا الحلاق من قبل. يمكنك تعديل أو حذف تقييمك أعلاه.</p>
    `;
  }
}

function confirmDelete(reviewId, workerId, currentUserId, btn) {
  showModal({
    type: "warning",
    title: "تأكيد الحذف",
    message: "هل تريد حذف التقييم؟",
    primaryText: "نعم",
    secondaryText: "إلغاء",
    onPrimary: async () => {
      const loader = setButtonLoading(btn, "جارٍ الحذف...");
      try {
        await deleteDoc(doc(db, "Reviews", reviewId));
        await fetchAndRenderReviews(workerId, currentUserId);
      } catch {
        showMessage("خطأ أثناء الحذف", "error");
      } finally {
        loader.stop();
      }
    }
  });
}

function setupReviewForm() {
  const form = document.getElementById("review-form");
  form.innerHTML = `
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
  form.onsubmit = async e => {
    e.preventDefault();
    const comment = document.getElementById("review-text").value.trim();
    if (!isValidRating(selectedRating) || !comment) {
      return showModal({ type: "warning", title: "مفقود", message: "رجاءً أدخل تقييم وتعليق." });
    }
    const btn = form.querySelector("button");
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
      form.reset();
      loader.stop();
      showMessage("تم الإرسال!", "success");
    } catch {
      loader.stop();
      showMessage("خطأ أثناء الإرسال", "error");
    }
  };
}

function showEditForm(reviewId) {
  const item = document.querySelector(`[data-review-id="${reviewId}"]`);
  const comment = item.dataset.comment;
  const rating = parseInt(item.dataset.rating);
  const form = document.getElementById("review-form");
  form.innerHTML = `
    <h4>تعديل التقييم</h4>
    <textarea id="edit-review-text">${comment}</textarea>
    <div class="rating-input-section">
      <label>اختر تقييمك:</label>
      <div id="edit-review-rating-stars" class="rating-input-container"></div>
    </div>
    <button id="save-edit-btn" class="btn primary-btn">حفظ</button>
    <button id="cancel-edit-btn" class="btn secondary-btn">إلغاء</button>
  `;
  let edited = rating;
  createRatingStars(
    document.getElementById("edit-review-rating-stars"),
    rating,
    v => edited = v
  );
  document.getElementById("save-edit-btn").onclick = async () => {
    const btn = document.getElementById("save-edit-btn");
    const loader = setButtonLoading(btn, "جارٍ الحفظ...");
    try {
      await updateDoc(doc(db, "Reviews", reviewId), {
        comment: document.getElementById("edit-review-text").value.trim(),
        rating: edited,
        updatedAt: serverTimestamp()
      });
      const user = auth.currentUser;
      await fetchAndRenderReviews(localStorage.getItem("selectedWorkerUID"), user.uid);
      loader.stop();
      showMessage("تم التعديل!", "success");
    } catch {
      loader.stop();
      showMessage("خطأ أثناء التعديل", "error");
    }
  };
  document.getElementById("cancel-edit-btn").onclick = () => {
    const user = auth.currentUser;
    fetchAndRenderReviews(localStorage.getItem("selectedWorkerUID"), user.uid);
  };
}
