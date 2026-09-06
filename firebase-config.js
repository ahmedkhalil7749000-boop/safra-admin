// firebase-config.js
// إعدادات Firebase المشتركة لكل صفحات مشروع سفرة
// كل صفحة تستورد من هذا الملف بدل ما تكرر نفس الإعدادات
// ملاحظة: هذا الملف محدّث لمشروع Firebase الجديد (safra-project-3)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCp_boObC6rDyAcLYJ-FBqm8_QwRQXShUk",
    authDomain: "safra-project-3.firebaseapp.com",
    projectId: "safra-project-3",
    storageBucket: "safra-project-3.firebasestorage.app",
    messagingSenderId: "352714677428",
    appId: "1:352714677428:web:5e3ae3b812beb9b5fe0be1",
    measurementId: "G-B1DQ8VT4SC"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false
});

export const storage = getStorage(app);
