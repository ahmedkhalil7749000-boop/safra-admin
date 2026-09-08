// ============================================================
// cart-service.js
// خدمة السلة المشتركة لكل صفحات تطبيق سفرة (الزبون)
// ------------------------------------------------------------
// بتحل مشكلتين:
// 1) بتتأكد إن كل أصناف السلة من نفس المطعم. لو حد حاول يضيف
//    صنف من مطعم تاني، بترجع "conflict" بدل ما تخلط الطلب.
// 2) لو المستخدم مسجل دخول: السلة بتتخزن بـ Firestore (carts/{uid})
//    بدل localStorage بس، فما بتضيع لو بدّل جهاز أو مسح المتصفح.
//    لو زائر (مش مسجل): السلة بتضل محليًا متل ما كانت.
//    ولحظة ما يسجل دخول ولو كان عنده سلة محفوظة محليًا، بتنضم
//    تلقائيًا لسلة حسابه (مرة وحدة بس).
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
async function mergeLocalCartIntoAccount(uid) {
    const localCart = getLocalCart();
    if (localCart.length === 0) return;

    const remoteCart = await readRemoteCart(uid);

    // لو سلة الحساب فيها أصناف من مطعم مختلف عن السلة المحلية،
    // منحافظ على سلة الحساب (الأصل) ومنلغي المحلية عشان ما نخلط طلبين
    const sameRestaurant = remoteCart.length === 0 || remoteCart[0].restaurantId === localCart[0].restaurantId;
    const finalCart = sameRestaurant ? [...remoteCart, ...localCart] : remoteCart;

    await writeRemoteCart(uid, finalCart);
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

// إضافة صنف للسلة، مع التأكد إنه من نفس مطعم باقي الأصناف.
// النتيجة:
//   { added: true, cart }
//   { added: false, conflict: true, currentRestaurantId, cart }  <- لو في تعارض مطعم
export async function addToCart(restaurantId, item) {
    const cart = await getCart();
    if (cart.length > 0 && cart[0].restaurantId !== restaurantId) {
        return { added: false, conflict: true, currentRestaurantId: cart[0].restaurantId, cart };
    }
    cart.push({ restaurantId, ...item });
    await saveCart(cart);
    return { added: true, cart };
}

// بتفرّغ السلة الحالية وتضيف الصنف الجديد بدالها
// (تُستخدم بعد ما المستخدم يأكد إنه بدو يستبدل سلته بمطعم جديد)
export async function replaceCartWithItem(restaurantId, item) {
    const cart = [{ restaurantId, ...item }];
    await saveCart(cart);
    return cart;
}

export async function clearCart() {
    await saveCart([]);
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
