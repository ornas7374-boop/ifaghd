import { SPECIFICATIONS } from "@/lib/content";
import { Reveal } from "@/components/Reveal";

/** A printed specification sheet: type and thin rules, no cards. */
export function Specifications() {
  return (
    <section className="border-t border-paper/10 bg-ink">
      <div className="mx-auto max-w-[92rem] px-6 py-28 sm:px-10 md:py-40">
        <Reveal className="mb-16 md:mb-24">
          <p className="label">Specification</p>
          <h2 className="display mt-7 text-[2.6rem] leading-[1.05] text-paper sm:text-5xl md:text-[4.4rem]">
            The measured facts.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <dl className="grid gap-x-24 md:grid-cols-2">
            {SPECIFICATIONS.map((spec) => (
              <div
                key={spec.term}
                // Narrow screens stack term over value; wide ones set them as a
                // ruled line of a printed sheet.
                className="border-t border-paper/10 py-5 sm:flex sm:items-baseline sm:justify-between sm:gap-8 sm:py-6 md:py-7"
              >
                <dt className="label shrink-0 text-paper/45">{spec.term}</dt>
                <dd className="mt-2 font-serif text-lg font-light tracking-[0.005em] text-paper/85 sm:mt-0 sm:text-right sm:text-xl md:text-[1.4rem]">
                  {spec.value}
                </dd>
              </div>
            ))}
            {/* Closes the sheet so the last rule reads as a bottom edge. */}
            <div className="border-t border-paper/10 md:col-span-2" />
          </dl>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="copy mt-14 max-w-xl text-[0.82rem] md:mt-20">
            Figures are homologated for the European specification. Weight is
            quoted dry, without fluids. Top speed is limited for the tyre.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
