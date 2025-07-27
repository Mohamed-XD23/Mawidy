//worker_profile.js
import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Import dayjs for relative time formatting
import dayjs from 'https://esm.sh/dayjs@1.11.10';
import relativeTime from 'https://esm.sh/dayjs@1.11.10/plugin/relativeTime';
import 'https://esm.sh/dayjs@1.11.10/locale/ar';

// Configure dayjs
dayjs.extend(relativeTime);
dayjs.locale('ar');

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("يرجى تسجيل الدخول أولاً.");
      window.location.href = "login.html";
      return;
    }

    const currentUserId = user.uid;
    const uid = localStorage.getItem("selectedWorkerUID");

    if (!uid) {
      alert("لم يتم تحديد الحلاق");
      window.location.href = "worker_list.html";
      return;
    }

    const workerDocRef = doc(db, "worker", uid);
    const workerSnap = await getDoc(workerDocRef);

    if (!workerSnap.exists()) {
      alert("الحلاق غير موجود");
      return;
    }

    const worker = workerSnap.data();

    // عرض بيانات الحلاق
    document.getElementById("worker-name").textContent = worker.name;
    document.getElementById("worker-bio").textContent =
      worker.bio || "لا يوجد وصف.";
    document.getElementById("worker-phone").textContent =
      worker.phone || "غير متوفر";
    document.getElementById("worker-status").textContent = worker.isAvailable
      ? "متاح الآن"
      : "غير متاح";
    document.getElementById("worker-photo").src =
      worker.photoURL || "img/default-avatar.png";

    // إضافة event listener لزر "احجز الآن"
    document.getElementById("bookNowBtn").addEventListener("click", () => {
      // حفظ UID الحلاق في localStorage
      localStorage.setItem("selectedWorkerUID", uid);
      // التوجيه إلى صفحة الحجز
      window.location.href = "booking.html";
    });

    // تحميل التقييمات
    const reviewsRef = collection(db, "Reviews");
    const q = query(
      reviewsRef,
      where("workerId", "==", uid),
      orderBy("createdAt", "desc")
    );
    const reviewsSnap = await getDocs(q);

    const reviewsContainer = document.getElementById("reviews-list");
    reviewsContainer.innerHTML = "";

    let totalRating = 0;
    let reviewCount = 0;
    let userAlreadyReviewed = false;
    let userReviewDocId = null;

    if (reviewsSnap.empty) {
      reviewsContainer.innerHTML = "<p>لا توجد تقييمات بعد.</p>";
    } else {
      reviewsSnap.forEach((docSnap) => {
        const review = docSnap.data();
        const reviewId = docSnap.id;

        // تنسيق التاريخ باستخدام التوقيت النسبي
        let dateStr = "";
        if (review.createdAt && review.createdAt.toDate) {
          const dateObj = review.createdAt.toDate();
          dateStr = dayjs(dateObj).fromNow(); // مثل: "قبل 3 أيام"
        }

        if (review.userId === currentUserId) {
          userAlreadyReviewed = true;
          userReviewDocId = reviewId;
        }

        totalRating += review.rating || 0;
        reviewCount++;

        const div = document.createElement("div");
        div.className = "review-item";
        div.setAttribute("data-review-id", reviewId);
        // حفظ البيانات الأولية
        div.setAttribute("data-comment", review.comment || "");
        div.setAttribute("data-rating", review.rating || 0);
        div.innerHTML = `
          <div class="review-header">
            <div class="review-avatar">${
              review.userName ? review.userName[0] : "م"
            }</div>
            <div>
              <span class="review-user">${review.userName || "مستخدم"}</span>
              <span class="review-date">${dateStr || ""}</span>
            </div>
            <div class="review-stars">${"★".repeat(
              review.rating || 0
            )}${"☆".repeat(5 - (review.rating || 0))}</div>
          </div>
          <p class="review-comment">${review.comment || ""}</p>
        `;

        // أزرار التعديل والحذف للمستخدم الحالي فقط
        if (review.userId === currentUserId) {
          const editBtn = document.createElement("button");
          editBtn.textContent = "تعديل";
          editBtn.className = "btn edit-btn";
          editBtn.onclick = () => showEditForm(reviewId);

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "حذف";
          deleteBtn.className = "btn delete-btn";
          deleteBtn.onclick = async () => {
            if (confirm("هل أنت متأكد من حذف التقييم؟")) {
              await deleteDoc(doc(db, "Reviews", reviewId));
              showSnackbar("تم حذف التقييم بنجاح", "success");
              location.reload();
            }
          };

          div.appendChild(editBtn);
          div.appendChild(deleteBtn);
        }

        reviewsContainer.appendChild(div);
      });
    }

    // عرض المتوسط
    const average =
      reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : "0.0";
    document.getElementById("worker-rating").textContent = average;

    // إذا سبق للمستخدم التقييم، لا نعرض الفورم بل نعرض إمكانية التعديل
    const reviewForm = document.getElementById("review-form");
    if (userAlreadyReviewed) {
      reviewForm.innerHTML =
        "<p class='already-rated'>لقد قمت بتقييم هذا الحلاق من قبل. يمكنك تعديل أو حذف تقييمك أعلاه.</p>";
    } else {
      reviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const comment = document.getElementById("review-text").value.trim();
        const rating = parseInt(document.getElementById("review-rating").value);

        if (!rating || rating < 1 || rating > 5) {
          showSnackbar("يرجى اختيار تقييم صالح", "warning");
          return;
        }

        try {
          await addDoc(collection(db, "Reviews"), {
            workerId: uid,
            comment,
            rating,
            userId: currentUserId,
            userName: user.displayName || user.email || "مستخدم",
            createdAt: serverTimestamp(),
          });

          showSnackbar("✅ تم إرسال التقييم بنجاح", "success");
          location.reload();
        } catch (error) {
          console.error("❌ خطأ أثناء إرسال التقييم:", error.message);
          showSnackbar("حدث خطأ أثناء إرسال التقييم", "error");
        }
      });
    }
  });
});

// ✅ تعديل التقييم مع تأخير إعادة التحميل
function showEditForm(reviewId) {
  const originalCard = document.querySelector(`[data-review-id="${reviewId}"]`);
  const reviewForm = document.getElementById("review-form");

  // قراءة القيم الحالية من DOM أو من attributes المحفوظة
  const savedComment = originalCard.getAttribute("data-comment");
  const savedRating = originalCard.getAttribute("data-rating");
  
  let currentComment, currentRating;
  
  if (savedComment !== null && savedRating !== null) {
    // استخدام البيانات المحفوظة إذا كانت متوفرة
    currentComment = savedComment;
    currentRating = parseInt(savedRating);
  } else {
    // قراءة من DOM إذا لم تكن البيانات محفوظة
    currentComment = originalCard.querySelector(".review-comment").textContent;
    const currentStars = originalCard.querySelector(".review-stars").textContent;
    const starCount = (currentStars.match(/★/g) || []).length;
    currentRating = starCount > 0 ? starCount : 5;
  }

  reviewForm.innerHTML = `
    <h4>تعديل التقييم</h4>
    <textarea id="edit-review-text">${currentComment || ""}</textarea>
    <input type="number" id="edit-review-rating" min="1" max="5" value="${currentRating || 5}" />
    <button id="save-edit-btn" class="btn primary-btn">حفظ التعديل</button>
    <button id="cancel-edit-btn" class="btn">إلغاء</button>
  `;

  document.getElementById("save-edit-btn").onclick = async () => {
    const saveBtn = document.getElementById("save-edit-btn");
    const newComment = document.getElementById("edit-review-text").value.trim();
    const newRating = parseInt(
      document.getElementById("edit-review-rating").value
    );

    if (!newRating || newRating < 1 || newRating > 5) {
      showSnackbar("يرجى اختيار تقييم صالح", "warning");
      return;
    }

    // Show loading state
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> جارٍ الحفظ...';

    try {
      await updateDoc(doc(db, "Reviews", reviewId), {
        comment: newComment,
        rating: newRating,
        updatedAt: serverTimestamp(),
      });

      // تحديث العنصر في DOM
      if (originalCard) {
        originalCard.querySelector(".review-comment").textContent = newComment;
        originalCard.querySelector(".review-stars").innerHTML =
          "★".repeat(newRating) + "☆".repeat(5 - newRating);
        
        // حفظ البيانات المحدثة في attributes للوصول إليها لاحقاً
        originalCard.setAttribute("data-comment", newComment);
        originalCard.setAttribute("data-rating", newRating);
      }

      // إعادة حساب المتوسط وعرضه
      recalculateAverageRating();

      showSnackbar("✅ تم تعديل التقييم بنجاح", "success");
      reviewForm.innerHTML =
        "<p class='already-rated'>لقد قمت بتقييم هذا الحلاق من قبل. يمكنك تعديل أو حذف تقييمك أعلاه.</p>";
    } catch (error) {
      console.error("🔥 خطأ أثناء التعديل:", error.code, error.message);
      showSnackbar("حدث خطأ أثناء التعديل: " + error.message, "error");
      
      // Reset button state on error
      saveBtn.disabled = false;
      saveBtn.textContent = "حفظ التعديل";
    }
  };

  document.getElementById("cancel-edit-btn").onclick = () => {
    reviewForm.innerHTML =
      "<p class='already-rated'>لقد قمت بتقييم هذا الحلاق من قبل. يمكنك تعديل أو حذف تقييمك أعلاه.</p>";
  };
}

function recalculateAverageRating() {
  const allStars = document.querySelectorAll(".review-stars");
  let total = 0;
  let count = 0;

  allStars.forEach((starsEl) => {
    const starsText = starsEl.textContent || "";
    const stars = starsText.split("").filter((s) => s === "★").length;
    total += stars;
    count++;
  });

  const avg = count > 0 ? (total / count).toFixed(1) : "0.0";
  document.getElementById("worker-rating").textContent = avg;
}

// Snackbar function to replace alert()
function showSnackbar(message, type = 'default') {
  const snackbar = document.getElementById('snackbar');
  snackbar.textContent = message;
  snackbar.className = `show ${type}`;
  
  setTimeout(() => {
    snackbar.className = '';
  }, 3000);
}
