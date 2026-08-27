import { PERFORMANCE_FIGURES } from "@/lib/content";
import { Reveal } from "@/components/Reveal";

export function Performance() {
  return (
    <section id="performance" className="border-t border-paper/10 bg-ink">
      <div className="mx-auto max-w-[92rem] px-6 py-32 sm:px-10 md:py-52">
        <Reveal>
          <p className="label">Performance</p>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mt-12 flex items-baseline gap-4 md:mt-16 md:gap-8">
            <span className="display text-[5.5rem] leading-[0.86] text-accent sm:text-[9rem] md:text-[15rem] lg:text-[19rem]">
              1,600
            </span>
            <span className="font-sans text-[0.8rem] font-light tracking-[0.34em] text-accent/70 uppercase sm:text-sm md:text-base">
              hp
            </span>
          </p>
        </Reveal>

        <Reveal delay={0.16}>
          <h2 className="display mt-10 max-w-3xl text-[2.4rem] leading-[1.05] text-paper sm:text-5xl md:mt-16 md:text-[4.4rem]">
            Engineered for extremes.
          </h2>
        </Reveal>

        <Reveal delay={0.24}>
          <dl className="mt-24 grid gap-x-16 sm:grid-cols-2 md:mt-36 lg:grid-cols-4">
            {PERFORMANCE_FIGURES.map((figure) => (
              <div
                key={figure.term}
                className="border-t border-paper/10 pt-7 pb-9 md:pt-9 md:pb-0"
              >
                <dd className="display text-[3.4rem] leading-none text-paper md:text-[4.6rem]">
                  {figure.value}
                  <span className="ml-2 font-sans text-[0.65rem] font-light tracking-[0.3em] text-accent uppercase">
                    {figure.unit}
                  </span>
                </dd>
                <dt className="label mt-6 text-paper/45">{figure.term}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
