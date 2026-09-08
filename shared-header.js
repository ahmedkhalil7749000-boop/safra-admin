// ============================================================
// shared-header.js
// الهيدر المشترك لكل صفحات موقع سفرة (الشعار + القائمة + زر الدخول)
// ------------------------------------------------------------
// أي تعديل هون (لون، رابط جديد، اسم، إلخ) بينعكس تلقائيًا
// على كل صفحة تستدعي هالملف. ما تحتاج تعدل كل صفحة لحالها.
// ============================================================

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initPushNotifications } from "./push-notifications.js";

// تفعيل نظام الإشعارات الفورية (Push) لكل صفحة تستخدم الهيدر المشترك
initPushNotifications();

// -------- شكل الهيدر: عدّل هون لو بدك تغيّر الشعار/الروابط/الألوان --------
const headerHTML = `
    <header class="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div class="mx-auto px-4 h-16 flex justify-between items-center">
            <a href="index.html" class="text-lg font-black text-safra-dark tracking-tight flex items-center gap-2">
                <img src="logo.png" alt="سفرة" class="h-9 w-9 object-contain rounded-full">
                سفرة
            </a>
            <div id="auth-actions" class="flex items-center gap-3"></div>
        </div>
    </header>
`;

// نحط الهيدر بمكانه (عنصر فاضي بكل صفحة اسمه app-header)
const mountPoint = document.getElementById('app-header');
if (mountPoint) {
    mountPoint.outerHTML = headerHTML;
}

// زر تسجيل الخروج (بيشتغل من أي صفحة)
window.handleLogout = function () {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
};

// إظهار زر "تسجيل دخول" أو بيانات المستخدم + زر خروج، حسب حالة الدخول
onAuthStateChanged(auth, (user) => {
    const authActions = document.getElementById('auth-actions');
    if (!authActions) return;

    if (user) {
        authActions.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-gray-500 max-w-[110px] truncate">${user.email}</span>
                <button onclick="handleLogout()" class="bg-red-50 text-red-600 w-8 h-8 flex items-center justify-center rounded-full text-sm hover:bg-red-100 transition" title="تسجيل خروج">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
            </div>
        `;
    } else {
        authActions.innerHTML = `
            <a href="Auth.html" class="bg-safra-gold text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-safra-gold-dark transition shadow-sm">تسجيل الدخول</a>
        `;
    }
});
