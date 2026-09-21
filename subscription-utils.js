// ============================================================
// subscription-utils.js
// منطق موحّد: هل اشتراك المطعم الأساسي (تجربة مجانية أو مدفوع) ساري؟
// نفس المنطق منسوخ بـ functions/index.js (دالة createOrder) —
// أي تعديل هون لازم ينعكس هناك كمان.
//
// لإيقاف الفرض مؤقتًا (المطاعم كلها تظهر وتستقبل طلبات مهما كانت
// حالة الاشتراك): غيّر ENFORCE_SUBSCRIPTION إلى false هون وبـ functions/index.js
// ============================================================

export const ENFORCE_SUBSCRIPTION = true;

// مهلة المطاعم القديمة (يلي ما عندها حالة اشتراك ولا تجربة): بتضل ظاهرة لحد هالتاريخ،
// وبعدها بتختفي إذا ما اشتركت. غيّر التاريخ هون (وبنفس القيمة بـ functions/index.js).
// الصيغة: "سنة-شهر-يومTساعة:دقيقة:ثانية+03:00" (توقيت الأردن)
export const LEGACY_GRACE_UNTIL = "2026-09-22T23:59:59+03:00";

function toMs(v) {
    if (!v) return null;
    if (typeof v.toMillis === "function") return v.toMillis();
    if (typeof v.toDate === "function") return v.toDate().getTime();
    if (v instanceof Date) return v.getTime();
    if (typeof v === "number") return v;
    if (typeof v.seconds === "number") return v.seconds * 1000;
    const t = new Date(v).getTime();
    return isNaN(t) ? null : t;
}

// الاشتراك الأساسي ساري إذا:
//  - المطعم قديم (ما عنده حالة اشتراك ولا تجربة أصلاً) => ساري لحد LEGACY_GRACE_UNTIL بس
//    (أو لحد ما الأدمن يضغط زر "تطبيق نظام التجربة على المطاعم الحالية" فياخد تجربة 30 يوم)
//  - الفترة التجريبية (trialEndsAt) لسا ما خلصت
//  - أو الاشتراك المدفوع "نشط" وتاريخ نهايته لسا ما وصل
export function isBasicSubscriptionActive(r, now = Date.now()) {
    if (!ENFORCE_SUBSCRIPTION) return true;
    if (!r) return true;

    const trialEnd = toMs(r.trialEndsAt);
    const subEnd = toMs(r.subscriptionEndDate);

    if (!r.subscriptionStatus && !trialEnd) return now < new Date(LEGACY_GRACE_UNTIL).getTime(); // مطعم قديم: لحد نهاية المهلة
    if (trialEnd && trialEnd > now) return true;          // التجربة سارية
    if (r.subscriptionStatus === "نشط" && (!subEnd || subEnd > now)) return true;
    if (r.subscriptionStatus === "تجريبي" && subEnd && subEnd > now) return true;
    return false;
}

// مغلق = موقوف يدويًا من صاحبه، أو اشتراكه الأساسي منتهي
export function isRestaurantClosed(r) {
    return !!r && (r.status === "متوقف" || !isBasicSubscriptionActive(r));
}
