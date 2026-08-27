import { Craftsmanship } from "@/components/Craftsmanship";
import { DetailBand } from "@/components/DetailBand";
import { Footer } from "@/components/Footer";
import { HeroSequence } from "@/components/HeroSequence";
import { Nav } from "@/components/Nav";
import { Performance } from "@/components/Performance";
import { Reserve } from "@/components/Reserve";
import { Specifications } from "@/components/Specifications";

export default function Page() {
  return (
    <>
      <Nav />
      <main id="top" className="bg-ink">
        <HeroSequence />
        <Specifications />
        <DetailBand />
        <Craftsmanship />
        <Performance />
        <Reserve />
      </main>
      <Footer />
    </>
  );
}
