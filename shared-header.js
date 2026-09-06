// ============================================================
// shared-header.js
// الهيدر المشترك لكل صفحات موقع سفرة (الشعار + القائمة + زر الدخول)
// ------------------------------------------------------------
// أي تعديل هون (لون، رابط جديد، اسم، إلخ) بينعكس تلقائيًا
// على كل صفحة تستدعي هالملف. ما تحتاج تعدل كل صفحة لحالها.
// ============================================================

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// -------- شكل الهيدر: عدّل هون لو بدك تغيّر الشعار/الروابط/الألوان --------
const headerHTML = `
    <header class="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
            <div class="flex items-center gap-8">
                <a href="index.html" class="text-2xl font-black text-amber-600 tracking-tight flex items-center gap-2">
                    🍽️ سفرة
                </a>
                <nav class="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
                    <a href="index.html" class="hover:text-amber-600 transition">الرئيسية</a>
                    <a href="المطاعم.html" class="hover:text-amber-600 transition">المطاعم</a>
                    <a href="cart.html" class="hover:text-amber-600 transition">السلة</a>
                    <a href="orders.html" class="hover:text-amber-600 transition">طلباتي</a>
                    <a href="لوحة_المطعم.html" class="hover:text-amber-600 transition">لوحة المطعم</a>
                </nav>
            </div>
            <div id="auth-actions" class="flex items-center gap-4"></div>
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
            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-gray-700 hidden sm:inline">${user.email}</span>
                <button onclick="handleLogout()" class="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-red-100 transition">تسجيل خروج</button>
            </div>
        `;
    } else {
        authActions.innerHTML = `
            <a href="Auth.html" class="bg-amber-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-amber-700 transition shadow-sm">تسجيل الدخول / إنشاء حساب</a>
        `;
    }
});
