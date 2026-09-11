// ============================================================
// shared-bottom-nav.js
// شريط التنقل السفلي المشترك لصفحات تطبيق سفرة (الزبون)
// أي تعديل هون (روابط، أيقونات، ترتيب) بينعكس تلقائيًا على كل
// صفحة تستدعي هالملف.
// ============================================================

import { subscribeToCart } from "./cart-service.js";

const currentPage = location.pathname.split("/").pop() || "index.html";

const navItems = [
    { href: "index.html", icon: "fa-house", label: "الرئيسية" },
    { href: "restaurants.html", icon: "fa-utensils", label: "المطاعم" },
    { href: "cart.html", icon: "fa-cart-shopping", label: "السلة", id: "nav-cart" },
    { href: "orders.html", icon: "fa-receipt", label: "طلباتي" },
    { href: "my-account.html", icon: "fa-user", label: "حسابي" },
];

const navHTML = `
    <nav class="app-bottom-nav">
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
