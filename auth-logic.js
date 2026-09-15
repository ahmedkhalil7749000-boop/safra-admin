// auth-logic.js
// منطق تسجيل الدخول / إنشاء الحساب المشترك بين Auth.html وrestaurant-partner-auth.html
// بدل ما يتكرر نفس كود Firebase Auth + كتابة بيانات المستخدم بـ Firestore بكل صفحة لحالها

import { auth, db } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
 * @returns {Promise<UserCredential>}
 */
export async function loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
}

/**
 * إنشاء حساب جديد بالبريد الإلكتروني وكلمة المرور، وكتابة بيانات المستخدم بتجميعة users بـ Firestore
 * @param {string} email
 * @param {string} password
 * @param {object} userData - بيانات إضافية تُخزّن مع المستخدم (مثلاً: role, fullName, phone, businessName...)
 * @returns {Promise<UserCredential>}
 */
export async function signUpWithEmail(email, password, userData = {}) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        createdAt: serverTimestamp(),
        ...userData
    });

    return cred;
}

/**
 * جلب نوع الحساب (role) للمستخدم من تجميعة users بـ Firestore
 * @param {string} uid
 * @returns {Promise<string>} 'customer' كقيمة افتراضية إذا ما كان في مستند محفوظ
 */
export async function getUserRole(uid) {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() ? userDoc.data().role : 'customer';
}

/**
 * إرسال رابط استعادة كلمة المرور
 * @param {string} email
 */
export async function resetPassword(email) {
    return await sendPasswordResetEmail(auth, email);
}
