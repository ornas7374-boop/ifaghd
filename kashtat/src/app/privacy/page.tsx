import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/site/info-page";
import { pageMeta } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "سياسة الخصوصية",
  description:
    "وش البيانات اللي تجمعها منصة الكشتات، وليش نحتاجها، ووين تنحفظ، ومين يشوفها، وكيف تطلب الاطلاع عليها أو حذفها.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <InfoPage path="/privacy" title="سياسة الخصوصية" updated="2026-10-28">
      <p>نجمع أقل قدر من البيانات اللي نحتاجه عشان تشتغل المنصة. هذي الصفحة توضح كل شيء.</p>

      <h2>وش نجمع؟</h2>
      <ul>
        <li>
          <strong>بيانات الحساب:</strong> الاسم والبريد الإلكتروني، ورقم الجوال إذا أضفته (اختياري).
          كلمة المرور تنحفظ مشفّرة ولا يشوفها أحد.
        </li>
        <li>
          <strong>الحجوزات:</strong> المكان والتاريخ والوقت وعدد الضيوف والإضافات والمبلغ.
        </li>
        <li>
          <strong>التقييمات:</strong> اللي تكتبها بعد اكتمال حجزك.
        </li>
        <li>
          <strong>لأصحاب الأماكن:</strong> بيانات المكان اللي يضيفونه.
        </li>
      </ul>
      <p>ما نستخدم أدوات تحليلات أو إعلانات تتبعك، وما نبيع بياناتك لأي جهة.</p>

      <h2>ملفات تعريف الارتباط والتخزين في المتصفح</h2>
      <ul>
        <li>ملفات ارتباط لتسجيل الدخول فقط، عشان تبقى مسجل دخولك.</li>
        <li>تفضيل الوضع الفاتح أو الداكن، محفوظ في متصفحك.</li>
      </ul>

      <h2>مين يشوف بياناتك؟</h2>
      <ul>
        <li>صاحب المكان يشوف بيانات حجزك عنده عشان يجهز لك المكان.</li>
        <li>فريق المنصة لإدارة الحجوزات ومراجعة الأماكن والتقييمات.</li>
        <li>التقييمات المنشورة تظهر للجميع بدون اسمك.</li>
      </ul>

      <h2>وين تنحفظ؟</h2>
      <p>
        الموقع مستضاف على Vercel، والبيانات محفوظة في قاعدة بيانات Supabase. الخوادم في مدينة مومباي
        بالهند (أقرب منطقة متاحة للمملكة)، والاتصال بين جهازك والموقع مشفّر.
      </p>

      <h2>حقوقك</h2>
      <p>
        تقدر تطلب الاطلاع على بياناتك أو تصحيحها أو حذف حسابك وبياناته. راسلنا من البريد المسجل في
        حسابك على{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand" dir="ltr">
          {CONTACT_EMAIL}
        </a>
        . ولأي سؤال ثاني{" "}
        <Link href="/contact" className="font-semibold text-brand hover:text-brand-hover">
          تواصل معنا
        </Link>
        .
      </p>
    </InfoPage>
  );
}
