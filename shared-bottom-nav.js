// ============================================================
// shared-bottom-nav.js
// شريط التنقل السفلي المشترك لصفحات تطبيق سفرة (الزبون)
// أي تعديل هون (روابط، أيقونات، ترتيب) بينعكس تلقائيًا على كل
// صفحة تستدعي هالملف.
// ============================================================

import { subscribeToCart } from "./cart-service.js";
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const currentPage = location.pathname.split("/").pop() || "index.html";

const navItems = [
    { href: "home.html", icon: "fa-house", label: "الرئيسية" },
    { href: "restaurants.html", icon: "fa-utensils", label: "المطاعم" },
    { href: "cart.html", icon: "fa-cart-shopping", label: "السلة", id: "nav-cart" },
    { href: "orders.html", icon: "fa-receipt", label: "طلباتي" },
    { href: "adman.html", icon: "fa-bell", label: "إدارة الطلبات", id: "nav-adman" },
    { href: "my-account.html", icon: "fa-user", label: "حسابي" },
];

const navHTML = `
    <nav class="app-bottom-nav" aria-label="التنقل الرئيسي">
        ${navItems.map(item => `
            <a href="${item.href}" class="${item.href === currentPage ? 'active' : ''}" ${item.id ? `id="${item.id}"` : ''}>
                <i class="fa-solid ${item.icon}"></i>
                <span>${item.label}</span>
            </a>
        `).join("")}
    </nav>
`;

const mountPoint = document.getElementById('app-bottom-nav');
if (mountPoint) {
    mountPoint.outerHTML = navHTML;
    document.body.classList.add('has-bottom-nav');
}

// ===== صوت وحركة خفيفة عند الضغط على أي عنصر بالشريط السفلي =====
function playNavTapSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.08);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        o.start();
        o.stop(ctx.currentTime + 0.13);
    } catch (e) { /* تجاهل لو المتصفح ما يدعم الصوت */ }
}

document.querySelectorAll('.app-bottom-nav a').forEach((link) => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const icon = link.querySelector('i') || link;
        icon.classList.remove('tap-animate');
        void icon.offsetWidth; // إعادة تشغيل الأنيميشن من الصفر
        icon.classList.add('tap-animate');
        playNavTapSound();
        const href = link.getAttribute('href');
        setTimeout(() => { window.location.href = href; }, 150);
    });
});

// ===== زر واتساب العائم لإدارة الطلبات (بيظهر بس لصاحب المطعم) =====
const whatsappFab = document.createElement('a');
whatsappFab.href = 'adman.html';
whatsappFab.className = 'whatsapp-order-fab';
whatsappFab.id = 'whatsapp-order-fab';
whatsappFab.setAttribute('aria-label', 'إدارة الطلبات');
whatsappFab.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
document.body.appendChild(whatsappFab);

// عرض عدد أصناف السلة كـ badge فوق أيقونة السلة
// (بتنعكس فورًا سواء السلة محلية عند زائر، أو مخزّنة بالحساب عند مستخدم مسجل)
function renderCartBadge(count) {
    const cartLink = document.getElementById('nav-cart');
    if (!cartLink) return;
    const existing = cartLink.querySelector('.nav-badge');
    if (existing) existing.remove();
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.textContent = count > 9 ? '9+' : count;
        cartLink.appendChild(badge);
    }
}

subscribeToCart((cart) => {
    const count = (cart || []).reduce((sum, i) => sum + (i.qty || 1), 0);
    renderCartBadge(count);
});

// عرض عدد الطلبات الجديدة (قيد المعالجة) كـ badge فوق جرس "إدارة الطلبات"
// وفوق زر الواتساب العائم، وإظهار/إخفاء الزر العائم حسب وجود مطعم مرتبط بالحساب
// بتظهر فقط لصاحب المطعم اللي مرتبط بحسابه مطعم (نفس منطق ownerEmail المستخدم في adman.html)
function renderAdminOrdersBadge(count) {
    const adminLink = document.getElementById('nav-adman');
    if (adminLink) {
        const existing = adminLink.querySelector('.nav-badge');
        if (existing) existing.remove();
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = count > 9 ? '9+' : count;
            adminLink.appendChild(badge);
        }
    }

    const fab = document.getElementById('whatsapp-order-fab');
    if (fab) {
        const existing = fab.querySelector('.nav-badge');
        if (existing) existing.remove();
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = count > 9 ? '9+' : count;
            fab.appendChild(badge);
        }
    }
}

function setFabVisibility(isRestaurantOwner) {
    const fab = document.getElementById('whatsapp-order-fab');
    if (!fab) return;
    fab.classList.toggle('visible', !!isRestaurantOwner);
}

let ordersUnsubscribe = null;

onAuthStateChanged(auth, async (user) => {
    if (ordersUnsubscribe) {
        ordersUnsubscribe();
        ordersUnsubscribe = null;
    }
    if (!user) {
        renderAdminOrdersBadge(0);
        setFabVisibility(false);
        return;
    }
    try {
        const restQ = query(collection(db, "restaurants"), where("ownerEmail", "==", user.email));
        const restSnap = await getDocs(restQ);
        if (restSnap.empty) {
            renderAdminOrdersBadge(0);
            setFabVisibility(false);
            return;
        }
        setFabVisibility(true);
        const myRestaurantId = restSnap.docs[0].id;
        const ordersQ = query(
            collection(db, "orders"),
            where("restaurantId", "==", myRestaurantId),
            where("status", "==", "قيد المعالجة")
        );
        ordersUnsubscribe = onSnapshot(ordersQ, (snap) => {
            renderAdminOrdersBadge(snap.size);
        });
    } catch (e) {
        // مش صاحب مطعم أو حصل خطأ بالجلب — ما في بادج ولا زر عائم، بدون ما نكسر باقي الصفحة
        renderAdminOrdersBadge(0);
        setFabVisibility(false);
    }
});
