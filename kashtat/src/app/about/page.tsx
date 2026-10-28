import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/site/info-page";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "من نحن",
  description:
    "الكشتات منصة سعودية لاكتشاف وحجز الكشتات والمخيمات والمواقع البرية بالساعة أو اليوم أو الليلة، بتوفر فعلي وتأكيد فوري وتقييمات من حجوزات حقيقية.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <InfoPage path="/about" title="من نحن">
      <p>
        الكشتات منصة سعودية تجمع أماكن الكشتات والمخيمات والمواقع البرية في مكان واحد، وتخليك تحجز
        بالساعة أو اليوم أو الليلة بدون مراسلات ولا انتظار رد.
      </p>

      <h2>ليش الكشتات؟</h2>
      <ul>
        <li>
          <strong>توفر فعلي:</strong> التقويم يمنع الحجز المزدوج، فالوقت اللي تشوفه متاح هو متاح
          فعلًا.
        </li>
        <li>
          <strong>سعر واضح:</strong> السعر النهائي يظهر كامل قبل التأكيد، شامل الإضافات.
        </li>
        <li>
          <strong>تقييمات حقيقية:</strong> ما يقدر يقيّم المكان إلا اللي حجزه وخلّص حجزه.
        </li>
        <li>
          <strong>أماكن مراجعة:</strong> كل مكان يضيفه صاحبه يمر على مراجعة فريق المنصة قبل ما ينشر.
        </li>
      </ul>

      <h2>لأصحاب الأماكن</h2>
      <p>
        عندك كشتة أو مخيم أو أرض برية؟ أضف مكانك من{" "}
        <Link href="/owner" className="font-semibold text-brand hover:text-brand-hover">
          لوحة أصحاب الأماكن
        </Link>
        ، وحدد أسعارك وأوقاتك والأيام المحجوزة، وتابع حجوزاتك من مكان واحد.
      </p>

      <h2>مرحلة تجريبية</h2>
      <p>
        المنصة حاليًا في مرحلة تجريبية: الحجوزات تتأكد مباشرة بدون دفع إلكتروني. عندك سؤال أو
        ملاحظة؟{" "}
        <Link href="/contact" className="font-semibold text-brand hover:text-brand-hover">
          تواصل معنا
        </Link>
        .
      </p>
    </InfoPage>
  );
}
