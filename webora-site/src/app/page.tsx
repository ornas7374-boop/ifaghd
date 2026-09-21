import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { Solution } from "@/components/Solution";
import { Process } from "@/components/Process";
import { Pricing } from "@/components/Pricing";
import { Market } from "@/components/Market";
import { Traction } from "@/components/Traction";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Process />
        <Pricing />
        <Market />
        <Traction />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
