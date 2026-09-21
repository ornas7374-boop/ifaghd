"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Section, SectionHeader } from "./Section";

const faqs = [
  {
    q: "شنو يعني \"موقع premium\" بالضبط؟",
    a: "تصميم مخصص كامل (ليس قالب)، هيكل معلومات صحّي، تجربة قراءة عربية سليمة، سرعة فوق 90 على PageSpeed، SEO مبني من الأساس، وأنيميشن ذكي — لا كسل ولا مبالغة.",
  },
  {
    q: "شلون تضمنون تسليم بـ 7-21 يوم؟",
    a: "لأننا نشتغل بنظام باقات ثابتة (Productized). ما فيه Discovery Phase مفتوح. تتفق معنا في اليوم صفر، نشتغل بخطوات محددة، وإذا تأخّرنا يوم واحد نرد جزءاً من المبلغ. مكتوب في العقد.",
  },
  {
    q: "أنا صاحب مطعم/عيادة، هل تصمّمون لي؟",
    a: "نعم — الست قطاعات اللي نخدمها بشكل رئيسي: مطاعم و F&B، عيادات وميدسبا، استشارات، عقارات، فتنس، Ed-tech. عندنا مكتبة قوالب داخلية للحالات الشائعة تختصر وقت الإنتاج بدون ما تُظهر نفس الشكل.",
  },
  {
    q: "شلون تختلفون عن Wix أو الفريلانسر؟",
    a: "Wix سريعة لكن جينيريك ودعم العربية ضعيف. الفريلانسر غير مضمون. نحن ندمج جودة الوكالات + سرعة الـ SaaS + شفافية الأسعار الثابتة. لا خيار ثالث في MENA يجمع الثلاثة.",
  },
  {
    q: "بعد الإطلاق؟ شنو يحصل إذا أبغى تعديلات؟",
    a: "كل باقة تشمل فترة دعم (30 / 90 يوم). بعدها اشتراك CARE بـ 999 SAR شهرياً يعطيك 5 تعديلات + هوستنج + تقرير أداء + دعم أولوية. أو تدفع لكل تعديل حسب الحاجة — أنت تختار.",
  },
  {
    q: "الملكية الفكرية للموقع؟",
    a: "الموقع ملكك 100% بعد التسليم — النطاق، الكود، المحتوى، الأصول. نسلّم كل شي (بما فيه ملفات Figma) بدون قيود.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq">
      <SectionHeader
        eyebrow="FAQ · أسئلة شائعة"
        title={<>الأسئلة اللي دايماً نسمعها.</>}
        subtitle="لسه عندك سؤال ما لقيته؟ راسلنا مباشرة، نجاوب في نفس اليوم."
      />

      <div className="mx-auto max-w-3xl" dir="rtl">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={f.q}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="border-b border-white/8 last:border-b-0"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-6 py-6 text-right transition hover:bg-white/[0.02]"
              >
                <span
                  className="text-lg font-medium text-white sm:text-xl"
                  style={{ fontFamily: "var(--font-ibm-arabic)" }}
                >
                  {f.q}
                </span>
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all ${
                    isOpen
                      ? "border-[color:var(--mint)] bg-[color:var(--mint)]/10 text-[color:var(--mint)] rotate-45"
                      : "border-white/15 text-white/60"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p
                      className="pb-6 text-base leading-relaxed text-white/70"
                      style={{ fontFamily: "var(--font-ibm-arabic)" }}
                    >
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}
