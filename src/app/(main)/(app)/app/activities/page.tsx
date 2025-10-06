import ActivitiesIndex from "@/components/pages/(app)/activities/ActivitiesIndex";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activities - PIVY",
};

export default function ActivitiesPage() {
  return <ActivitiesIndex />;
}
