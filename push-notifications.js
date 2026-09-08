// ============================================================
// push-notifications.js
// وحدة تفعيل الإشعارات الفورية (Push Notifications) عبر Firebase Cloud Messaging
// تُستدعى من أي صفحة هيك: 
//   import { initPushNotifications } from "./push-notifications.js";
//   initPushNotifications();
// ============================================================

import { app, auth, db } from "./firebase-config.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ لازم تحط هون مفتاح VAPID الخاص بمشروعك قبل النشر:
// Firebase Console → إعدادات المشروع → Cloud Messaging → Web configuration → Generate key pair
const VAPID_KEY = "ضع_مفتاح_VAPID_من_إعدادات_فايربيس_هون";

// إشعار داخل الصفحة (يظهر وقت تكون الصفحة مفتوحة أمام المستخدم فعلاً)
function showInAppToast(title, body) {
    const toast = document.createElement('div');
    toast.className = "fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 bg-safra-dark text-white px-4 py-3 rounded-lg shadow-lg z-[100] text-sm max-w-sm";
    toast.innerHTML = `<p class="font-bold mb-0.5">${title}</p><p class="text-gray-200">${body}</p>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 7000);
}

let initialized = false;

export async function initPushNotifications() {
    if (initialized) return; // تجنب التسجيل المكرر لو استُدعيت الدالة أكثر من مرة
    initialized = true;

    try {
        if (!("serviceWorker" in navigator)) {
            console.warn("هذا المتصفح لا يدعم Service Workers، الإشعارات الفورية لن تعمل.");
            return;
        }

        const supported = await isSupported().catch(() => false);
        if (!supported) {
            console.warn("هذا المتصفح لا يدعم Firebase Cloud Messaging.");
            return;
        }

        // تسجيل الـ Service Worker المسؤول عن استقبال الإشعارات بالخلفية
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = getMessaging(app);

        // إشعارات وقت تكون الصفحة مفتوحة (foreground)
        onMessage(messaging, (payload) => {
            const title = payload.notification?.title || "سفرة";
            const body = payload.notification?.body || "";
            showInAppToast(title, body);
        });

        // ما نطلب إذن الإشعارات ونربط التوكن إلا لمستخدم مسجل دخول فعلاً
        onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            if (typeof Notification === "undefined") return;
            if (Notification.permission === "denied") return;

            let permission = Notification.permission;
            if (permission === "default") {
                permission = await Notification.requestPermission();
            }
            if (permission !== "granted") return;

            try {
                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration
                });
                if (token) {
                    // نخزّن التوكن على وثيقة المستخدم عشان Cloud Functions تقدر ترسل له
                    await setDoc(doc(db, "users", user.uid), { fcmToken: token }, { merge: true });
                }
            } catch (err) {
                console.error("تعذر الحصول على توكن الإشعارات:", err.message);
            }
        });
    } catch (err) {
        console.error("تعذر تفعيل نظام الإشعارات الفورية:", err.message);
    }
}
