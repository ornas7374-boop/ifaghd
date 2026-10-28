import { HeroScene } from "./hero-scene";
import { HeroSearch } from "./hero-search";

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative overflow-hidden border-b border-border bg-bg"
    >
      <HeroScene />
      <div className="pointer-events-none relative z-[1] mx-auto flex min-h-[780px] max-w-[1248px] flex-col justify-between gap-8 px-4 pt-16 pb-10 sm:px-6 sm:pt-24">
        <div className="pointer-events-auto flex max-w-[560px] flex-col gap-5">
          <span className="self-start rounded-pill bg-sand-subtle px-3 py-1 text-[13px] font-semibold text-sand">
            كشتات · مخيمات · مواقع برية
          </span>
          <h1
            id="hero-title"
            className="text-[clamp(40px,6vw,64px)] leading-[1.25] font-bold [text-shadow:0_2px_24px_var(--bg)]"
          >
            كشتات ومخيمات السعودية،
            <br />
            محجوزة بضغطة.
          </h1>
          <p className="max-w-[480px] text-[19px] leading-8 text-ink-muted [text-shadow:0_1px_16px_var(--bg)]">
            اكتشف أماكن الكشتات والمخيمات في الرياض وجدة وأبها وغيرها، اختر وقتك بالساعة أو اليوم أو
            الليلة، وأضف ما تحتاجه من خدمات مع تأكيد فوري.
          </p>
        </div>
        <HeroSearch />
      </div>
    </section>
  );
}
