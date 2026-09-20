// auth-logic.js
// منطق تسجيل الدخول / إنشاء الحساب المشترك بين Auth.html وrestaurant-partner-auth.html
// بدل ما يتكرر نفس كود Firebase Auth + كتابة بيانات المستخدم بـ Firestore بكل صفحة لحالها

import { auth, db } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    linkWithCredential,
    EmailAuthProvider,
    getAdditionalUserInfo,
    deleteUser,
    signOut
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

/* =====================================================================
 *            التحقق من رقم الجوال برمز SMS (Firebase Phone Auth)
 * =====================================================================
 * الفكرة: بدل ما ننشئ الحساب بالبريد وبعدين نتحقق من الرقم (وبيضل الحساب
 * موجود حتى لو المستخدم ما كمّل التحقق)، منعكس الترتيب:
 *   1) منرسل رمز SMS للرقم  → signInWithPhoneNumber
 *   2) المستخدم بيدخل الرمز  → confirm()  (هون بينعمل حساب مربوط بالرقم)
 *   3) منربط البريد وكلمة المرور على نفس الحساب → linkWithCredential
 * النتيجة: حساب واحد فيه مزوّدين (هاتف + بريد/كلمة مرور) ورقمه متحقق فعليًا.
 */

/**
 * تجهيز reCAPTCHA غير المرئي المطلوب من Firebase قبل إرسال أي رمز SMS
 * @param {string} containerId - id لعنصر div فاضي بالصفحة
 * @returns {RecaptchaVerifier}
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
    // Firebase بيرفض إنشاء أكثر من verifier على نفس العنصر، فمنعيد استخدام الموجود
    if (window.__safraRecaptcha) return window.__safraRecaptcha;

    window.__safraRecaptcha = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible'
    });
    return window.__safraRecaptcha;
}

/** إعادة تصفير reCAPTCHA (لازم بعد أي محاولة فاشلة عشان الإرسال الجاي يشتغل) */
export function resetRecaptcha() {
    if (window.__safraRecaptcha) {
        try { window.__safraRecaptcha.clear(); } catch (e) { /* تجاهل */ }
        window.__safraRecaptcha = null;
    }
    const holder = document.getElementById('recaptcha-container');
    if (holder) holder.innerHTML = '';
}

/**
 * تحويل الرقم لصيغة دولية E.164 (+962...) المطلوبة من Firebase
 * @param {string} phone - الرقم كما كتبه المستخدم (محلي أو دولي)
 * @param {string} callingCode - كود الدولة بدون + (مثال: '962')
 * @returns {string|null}
 */
export function toE164(phone, callingCode) {
    let digits = String(phone).replace(/[\s\-()]/g, '');

    if (digits.startsWith('+')) return digits;
    if (digits.startsWith('00')) return '+' + digits.slice(2);
    if (digits.startsWith('0')) {
        if (!callingCode) return null;
        return '+' + callingCode + digits.slice(1);
    }
    if (callingCode && digits.startsWith(callingCode)) return '+' + digits;
    if (callingCode) return '+' + callingCode + digits;
    return null;
}

/**
 * إرسال رمز التحقق للرقم
 * @param {string} phoneE164
 * @param {RecaptchaVerifier} verifier
 * @returns {Promise<ConfirmationResult>} استعمل نتيجته لاحقًا بـ confirmPhoneAndCreateAccount
 */
export async function sendPhoneCode(phoneE164, verifier) {
    return await signInWithPhoneNumber(auth, phoneE164, verifier);
}

/**
 * تأكيد الرمز ثم ربط البريد/كلمة المرور وإنشاء وثيقة المستخدم بـ Firestore
 * @param {ConfirmationResult} confirmationResult - ناتج sendPhoneCode
 * @param {string} code - الرمز اللي كتبه المستخدم
 * @param {string} email
 * @param {string} password
 * @param {object} userData - بيانات إضافية (role, fullName, businessName...)
 * @returns {Promise<UserCredential>}
 */
export async function confirmPhoneAndCreateAccount(confirmationResult, code, email, password, userData = {}) {
    const phoneCred = await confirmationResult.confirm(code);
    const isNewUser = getAdditionalUserInfo(phoneCred)?.isNewUser;

    // الرقم مسجّل مسبقًا بحساب ثاني → منوقف العملية بدون ما نلمس الحساب القديم
    if (!isNewUser) {
        await signOut(auth);
        const err = new Error('phone-already-registered');
        err.code = 'safra/phone-already-registered';
        throw err;
    }

    const user = phoneCred.user;

    try {
        await linkWithCredential(user, EmailAuthProvider.credential(email, password));
    } catch (error) {
        // فشل الربط (مثلاً البريد مستعمل) → منحذف الحساب المؤقت عشان ما يضل معلّق
        try { await deleteUser(user); } catch (e) { try { await signOut(auth); } catch (e2) {} }
        throw error;
    }

    await setDoc(doc(db, "users", user.uid), {
        email: email,
        phoneE164: user.phoneNumber,
        phoneVerified: true,
        createdAt: serverTimestamp(),
        ...userData
    });

    return phoneCred;
}
