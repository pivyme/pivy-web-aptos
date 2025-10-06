import OnboardingIndex from "@/components/pages/(app)/onboarding/OnboardingIndex";
import OnboardingGuard from "@/components/auth/OnboardingGuard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding - PIVY",
};

export default function Onboarding() {
  return <OnboardingIndex />;
}
