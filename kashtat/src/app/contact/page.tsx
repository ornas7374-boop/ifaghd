import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/site/info-page";
import { pageMeta } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "تواصل معنا",
  description:
    "تواصل مع فريق الكشتات بخصوص حجز أو مكان أو اقتراح أو طلب يتعلق ببياناتك الشخصية. راسلنا على البريد الإلكتروني ونرد عليك في أقرب وقت.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <InfoPage path="/contact" title="تواصل معنا">
      <p>حيّاك. راسلنا على البريد الإلكتروني بخصوص أي شيء يتعلق بالمنصة:</p>
      <p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center rounded-md border border-border-strong px-4 py-2 font-semibold text-brand hover:border-brand"
          dir="ltr"
        >
          {CONTACT_EMAIL}
        </a>
      </p>

      <h2>عشان نخدمك أسرع</h2>
      <ul>
        <li>
          <strong>عن حجز:</strong> اكتب رقم الحجز (يبدأ بـ KSH)، وتلقاه في صفحة حجوزاتي.
        </li>
        <li>
          <strong>عن مكان:</strong> أرسل رابط صفحة المكان.
        </li>
        <li>
          <strong>عن بياناتك:</strong> اطلب الاطلاع على بياناتك أو تعديلها أو حذفها من نفس البريد
          المسجل في حسابك. التفاصيل في{" "}
          <Link href="/privacy" className="font-semibold text-brand hover:text-brand-hover">
            سياسة الخصوصية
          </Link>
          .
        </li>
      </ul>
    </InfoPage>
  );
}
