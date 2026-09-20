// ============================================================
// care-tags.js
// تعريفات "سفرة العافية" المشتركة: أكل بيتي للنفاس والمريض وكبار السن.
// بتنستخدم بلوحة المطعم (اختيار التصنيف) وبصفحات الزبون (العرض والفلترة).
// القيم المخزّنة بالفايرستور هي الـ key العربي بحقل careTags بوثيقة menuItems.
// ============================================================

// لمين الأكل (الطباخة بتختار وحدة أو أكتر)
export const CARE_AUDIENCES = [
    { key: "نفاس",      label: "للنفاس",      hint: "أكل بيتي لأيام ما بعد الولادة", icon: "fa-baby" },
    { key: "مريض",      label: "للمريض",      hint: "أكل خفيف وسهل",                 icon: "fa-mug-hot" },
    { key: "كبار السن", label: "لكبار السن",  hint: "أكل طري ومريح",                 icon: "fa-person-cane" },
];

// مواصفات إضافية (تصريح من الطباخة، مو تحقق من المنصة)
export const CARE_TRAITS = [
    { key: "قليل الملح" },
    { key: "بدون سكر مضاف" },
    { key: "سهل الهضم" },
    { key: "بدون قلي" },
];

export const CARE_AUDIENCE_KEYS = CARE_AUDIENCES.map(a => a.key);
export const CARE_TRAIT_KEYS = CARE_TRAITS.map(t => t.key);
export const CARE_ALL_KEYS = [...CARE_AUDIENCE_KEYS, ...CARE_TRAIT_KEYS];

// تنبيه يظهر للزبون (مهم: التصنيف من الطباخة وليس نصيحة طبية)
export const CARE_DISCLAIMER =
    "التصنيف من اختيار الطباخة وليس نصيحة طبية. إذا عندك حالة صحية أو حساسية، اسأل طبيبك، واسأل الطباخة عن المكونات قبل الطلب.";

// تنبيه للطباخة عند اختيار التصنيفات
export const CARE_COOK_NOTE =
    "اختاري فقط إذا الطبخة فعلاً مناسبة، واكتبي المكونات بالوصف. لا تكتبي إن الأكل يعالج أو يشفي من مرض.";

// بيرجع فقط القيم المعروفة (بيتجاهل أي قيمة غريبة بالبيانات)
export function cleanCareTags(value) {
    return Array.isArray(value) ? value.filter(v => CARE_ALL_KEYS.includes(v)) : [];
}
