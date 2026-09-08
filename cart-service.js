// ============================================================
// cart-service.js
// خدمة السلة المشتركة لكل صفحات تطبيق سفرة (الزبون)
// ------------------------------------------------------------
// السلة بتدعم أكتر من مطعم بنفس الوقت. كل أصناف السلة بتتخزن
// سوا بمصفوفة وحدة، وكل صنف معه restaurantId تبعه. وقت العرض
// (cart.html) ووقت تأكيد الطلب (checkout.html) منجمّع الأصناف
// حسب المطعم، وكل مجموعة بتصير طلب (order) منفصل لمطعمه.
//
// تخزين السلة:
// - لو المستخدم مسجل دخول: بتتخزن بـ Firestore (carts/{uid})
//   فما بتضيع لو بدّل جهاز أو مسح المتصفح.
// - لو زائر (مش مسجل): بتضل بالـ localStorage متل قبل.
// - لحظة ما يسجل دخول ولو كان عنده سلة محفوظة محليًا، بتنضم
//   تلقائيًا لسلة حسابه (مرة وحدة بس).
//
// كل الصفحات لازم تستورد من هون بدل ما تحكي مباشرة مع
// localStorage.getItem('safra_cart') / setItem زي ما كان قبل.
// ============================================================

import { db, auth } from "./firebase-config.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const LOCAL_KEY = 'safra_cart';

let currentUser = null;
let mergedForUid = null; // عشان دمج السلة المحلية يصير مرة وحدة بس لكل تسجيل دخول

const authReady = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user && mergedForUid !== user.uid) {
            mergedForUid = user.uid;
            await mergeLocalCartIntoAccount(user.uid);
        }
        resolve(user);
    });
});

function getLocalCart() {
    try {
        const cart = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

function setLocalCart(cart) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cart));
}

async function readRemoteCart(uid) {
    const snap = await getDoc(doc(db, "carts", uid));
    return snap.exists() ? (snap.data().items || []) : [];
}

async function writeRemoteCart(uid, cart) {
    await setDoc(doc(db, "carts", uid), { items: cart, updatedAt: Date.now() });
}

// بتنقل أي سلة محفوظة محليًا (كزائر) لحساب المستخدم بعد تسجيل الدخول
// (دمج بسيط: كل أصناف السلتين مع بعض، كل مطعم بضل مجموعة لحاله)
async function mergeLocalCartIntoAccount(uid) {
    const localCart = getLocalCart();
    if (localCart.length === 0) return;

    const remoteCart = await readRemoteCart(uid);
    await writeRemoteCart(uid, [...remoteCart, ...localCart]);
    localStorage.removeItem(LOCAL_KEY);
}

// بترجع محتوى السلة الحالي (من الحساب لو مسجل دخول، وإلا من التخزين المحلي)
export async function getCart() {
    await authReady;
    if (currentUser) return readRemoteCart(currentUser.uid);
    return getLocalCart();
}

// بتحفظ السلة كاملة بمكانها الصح
export async function saveCart(cart) {
    await authReady;
    if (currentUser) {
        await writeRemoteCart(currentUser.uid, cart);
    } else {
        setLocalCart(cart);
    }
}

// إضافة صنف للسلة (من أي مطعم - السلة بتدعم أكتر من مطعم بنفس الوقت)
export async function addToCart(restaurantId, item) {
    const cart = await getCart();
    cart.push({ restaurantId, ...item });
    await saveCart(cart);
    return { added: true, cart };
}

export async function clearCart() {
    await saveCart([]);
}

// بتجمّع أصناف السلة حسب المطعم.
// بترجع مصفوفة: [{ restaurantId, items: [...] }, ...]
// بنفس ترتيب أول ظهور لكل مطعم بالسلة.
export function groupCartByRestaurant(cart) {
    const order = [];
    const map = new Map();
    for (const item of cart) {
        if (!map.has(item.restaurantId)) {
            map.set(item.restaurantId, []);
            order.push(item.restaurantId);
        }
        map.get(item.restaurantId).push(item);
    }
    return order.map((restaurantId) => ({ restaurantId, items: map.get(restaurantId) }));
}

// اشتراك بتغيّرات السلة بشكل حي (مفيد لعرض عدد الأصناف بشريط التنقل).
// بترجع دالة لإلغاء الاشتراك.
export function subscribeToCart(callback) {
    let unsubscribeSnapshot = null;
    let storageHandler = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
        if (storageHandler) { window.removeEventListener('storage', storageHandler); storageHandler = null; }

        if (user) {
            unsubscribeSnapshot = onSnapshot(doc(db, "carts", user.uid), (snap) => {
                callback(snap.exists() ? (snap.data().items || []) : []);
            });
        } else {
            callback(getLocalCart());
            storageHandler = () => callback(getLocalCart());
            window.addEventListener('storage', storageHandler);
        }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        if (storageHandler) window.removeEventListener('storage', storageHandler);
    };
}
