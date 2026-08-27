import { Reveal } from "@/components/Reveal";

export function Craftsmanship() {
  return (
    <section
      id="craftsmanship"
      className="border-t border-paper/10 bg-ink"
    >
      <div className="mx-auto grid max-w-[92rem] gap-14 px-6 py-28 sm:px-10 md:grid-cols-[0.9fr_1.1fr] md:gap-24 md:py-44">
        <Reveal>
          <p className="label mb-8">Craftsmanship</p>
          <h2 className="display text-[2.8rem] leading-[1] text-paper sm:text-6xl md:text-[5rem]">
            Every detail
            <span className="block">has a reason.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.12} className="max-w-[38rem] md:pt-2">
          <div className="copy space-y-7 text-[0.95rem] md:text-base">
            <p>
              A car of this order is not assembled so much as it is composed.
              The monocoque is laid up in carbon fibre by hand, ply by ply, each
              sheet oriented to the load it will one day carry. Curing takes
              longer than a mass-market body shell takes to exist at all. What
              emerges is a single structure of extraordinary stiffness and
              almost no mass — the discipline that makes everything else
              possible.
            </p>
            <p>
              The hides are selected from a small number of tanneries and cut
              only where the grain runs true. Stitching is set by hand at a
              fixed count per centimetre, and a seam that wanders by a
              millimetre is cut out and begun again. Aluminium switchgear is
              milled from solid, knurled, and finished so that it is cold to the
              touch and stays cold. Nothing is plated to look like metal.
              Everything is the material it appears to be.
            </p>
            <p>
              The engine is built by a single technician who signs it. Sixteen
              cylinders, four turbochargers, more than three thousand
              components, and a tolerance regime borrowed from aerospace rather
              than from motoring. It is run, measured, taken apart, measured
              again, and only then released.
            </p>
            <p>
              Then the car is driven — properly driven, at speed, on a closed
              surface, by people who will refuse it. Perfection is not a claim
              made in a brochure. It is the standard a car has to survive before
              it is allowed to leave Molsheim.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
