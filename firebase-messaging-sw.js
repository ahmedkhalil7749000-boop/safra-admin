// ============================================================
// firebase-messaging-sw.js
// Service Worker مسؤول عن استقبال إشعارات Push وقت يكون المتصفح
// بالخلفية أو الصفحة مسكّرة. لازم يبقى بالمسار الجذري (root) للموقع.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// نفس إعدادات firebase-config.js (لازم تُكرَّر هون لأن الـ Service Worker
// ما بقدر يعمل import لملف ES module عادي)
firebase.initializeApp({
    apiKey: "AIzaSyCp_boObC6rDyAcLYJ-FBqm8_QwRQXShUk",
    authDomain: "safra-project-3.firebaseapp.com",
    projectId: "safra-project-3",
    storageBucket: "safra-project-3.firebasestorage.app",
    messagingSenderId: "352714677428",
    appId: "1:352714677428:web:5e3ae3b812beb9b5fe0be1"
});

const messaging = firebase.messaging();

// استقبال الإشعار وعرضه وقت تكون الصفحة بالخلفية أو مغلقة
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "سفرة";
    const options = {
        body: payload.notification?.body || "",
        icon: '/logo.png',
        badge: '/logo.png',
        data: payload.data || {},
        // تخلي الإشعار يضل ظاهر على الشاشة لحد ما المستخدم يضغط عليه أو يسكّره يدوياً
        // (بدون هاي الخاصية، بعض الأجهزة/المتصفحات بتخفي الإشعار تلقائياً بعد ثواني)
        requireInteraction: true,
        // اهتزاز يلفت الانتباه (يشتغل على الموبايل بالأخص)
        vibrate: [200, 100, 200, 100, 200],
        // كل إشعار طلب جديد إله tag مختلف (orderId) عشان ما ينكتب فوق إشعار سابق
        // ولو رجع نفس orderId (نادراً) ما يتكرر إشعارين لنفس الطلب
        tag: payload.data?.orderId ? `order-${payload.data.orderId}` : undefined,
        renotify: true
    };
    self.registration.showNotification(title, options);
});

// عند الضغط على الإشعار: افتح رابط الصفحة المرتبطة بيه (من data.link)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = event.notification.data?.link || '/';
    event.waitUntil(clients.openWindow(link));
});
