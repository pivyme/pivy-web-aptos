"use client";

import HeroSection from "./sections/HeroSection";
import SolutionSection from "./sections/SolutionSection";
import LenisInit from "@/components/utils/LenisInit";
import FeaturesSection from "./sections/FeaturesSection";
import MarketSection from "./sections/MarketSection";
import FaqSection from "./sections/FaqSection";
import CtaSection from "./sections/CtaSection";
import FooterSection from "./sections/FooterSection";
import NavSection from "./sections/NavSection";

export default function LandingIndex() {
  return (
    <main>
      <LenisInit />
      <div className="w-full flex flex-col items-center">
        <NavSection />

        <HeroSection />

        <SolutionSection />

        <FeaturesSection />

        <MarketSection />

        <CtaSection />

        <FaqSection />

        <FooterSection />
      </div>
    </main>
  );
}
