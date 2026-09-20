// scripts/backfill-restaurant-trial.js
//
// سكريبت لمرة وحدة (one-off): يمر على كل وثائق collection('restaurants') الموجودة
// حالياً، ويفعّل لها "الشهر الأول مجاني" بأثر رجعي — فقط للمطاعم يلي اتسجلت قبل
// إضافة ميزة الفترة التجريبية أصلاً (يعني ما عندها subscriptionStatus/trialEndsAt).
//
// ما بيلمس أي مطعم عنده subscriptionStatus موجود أصلاً (تجريبي/نشط/منتهي/قيد
// المراجعة...)، حتى لو كان اشتراكه منتهي من زمان — هدف السكريبت إعطاء الفرصة فقط
// للمطاعم يلي فاتتها الميزة بالكامل، مش تصفير اشتراكات موجودة. آمن نشغّله أكتر من
// مرة (idempotent): بعد أول تشغيل ناجح، كل المطاعم رح يصير عندها subscriptionStatus
// فمرات التشغيل اللاحقة ما رح تلمسها.
//
// ==============================================================================
// طريقة التشغيل:
// ==============================================================================
// 1) ثبّت firebase-admin لو مش مثبت بهاد المجلد (functions/ عندها أصلاً):
//      npm install firebase-admin
//
// 2) حمّل ملف Service Account Key من Firebase Console:
//      Project settings → Service accounts → Generate new private key
//    وحطه بمكان آمن (لا ترفعه على git)، مثلاً: ./serviceAccountKey.json
//
// 3) شغّل السكريبت (بوضع "تجربة" أول — ما بيكتب شي فعلياً، بس بيطبعلك شو رح يصير):
//      node scripts/backfill-restaurant-trial.js --key=./serviceAccountKey.json --dry-run
//
// 4) إذا النتيجة تمام، شغّله فعلياً بدون --dry-run:
//      node scripts/backfill-restaurant-trial.js --key=./serviceAccountKey.json
//
// اختياري: تقدر تغيّر عدد أيام الفترة التجريبية عبر --days=30 (الافتراضي: 30)
// ==============================================================================

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const path = require("path");

// ---- قراءة معطيات سطر الأوامر ----
const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
        const [key, value] = arg.replace(/^--/, "").split("=");
        return [key, value === undefined ? true : value];
    })
);

const DRY_RUN = !!args["dry-run"];
const TRIAL_DAYS = parseInt(args["days"], 10) || 30;
const KEY_PATH = args["key"];

if (!KEY_PATH) {
    console.error("❌ لازم تمرر مسار ملف Service Account Key، مثلاً:");
    console.error("   node scripts/backfill-restaurant-trial.js --key=./serviceAccountKey.json --dry-run");
    process.exit(1);
}

initializeApp({
    credential: cert(require(path.resolve(KEY_PATH))),
});

const db = getFirestore();

async function backfill() {
    console.log(`${DRY_RUN ? "🔍 وضع التجربة (dry-run) — ما رح يتكتب شي فعلياً" : "✍️  وضع الكتابة الفعلية"}`);
    console.log(`مدة الفترة التجريبية اللي رح تنضاف: ${TRIAL_DAYS} يوم من لحظة تشغيل السكريبت\n`);

    const snapshot = await db.collection("restaurants").get();

    if (snapshot.empty) {
        console.log("ما في وثائق بـcollection('restaurants') أصلاً.");
        return;
    }

    let missingCount = 0;
    let alreadySetCount = 0;

    // Firestore بيسمح بحد أقصى 500 عملية بالـ batch الواحد
    const BATCH_LIMIT = 450;
    let batch = db.batch();
    let opsInBatch = 0;
    const batches = [];

    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // لو عندها subscriptionStatus أصلاً (بأي قيمة)، لا تلمسها — هاي مطاعم
        // انسجلت بعد إضافة ميزة الفترة التجريبية، أو تعاملت مع اشتراك فعلي أصلاً.
        if (data.subscriptionStatus !== undefined && data.subscriptionStatus !== null && data.subscriptionStatus !== "") {
            alreadySetCount++;
            return;
        }

        missingCount++;
        console.log(`  → ${docSnap.id}  (${data.name || "بدون اسم"})  رح ينضافلها تجربة مجانية حتى ${trialEnd.toLocaleString('ar-EG')}`);

        if (!DRY_RUN) {
            batch.set(docSnap.ref, {
                subscriptionStatus: "تجريبي",
                subscriptionEndDate: Timestamp.fromDate(trialEnd),
                trialEndsAt: Timestamp.fromDate(trialEnd),
                trialUsed: true,
                trialBackfilledAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            opsInBatch++;
            if (opsInBatch >= BATCH_LIMIT) {
                batches.push(batch);
                batch = db.batch();
                opsInBatch = 0;
            }
        }
    });

    if (!DRY_RUN && opsInBatch > 0) {
        batches.push(batch);
    }

    if (!DRY_RUN) {
        for (const b of batches) {
            await b.commit();
        }
    }

    console.log(`\nملخص: ${snapshot.size} مطعم إجمالي — ${alreadySetCount} عنده حالة اشتراك أصلاً (ما انلمس) — ${missingCount} ${DRY_RUN ? "كان رح ينضافله" : "انضاف له"} الشهر المجاني بأثر رجعي.`);
}

backfill()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ صار خطأ أثناء تنفيذ السكريبت:", err);
        process.exit(1);
    });
