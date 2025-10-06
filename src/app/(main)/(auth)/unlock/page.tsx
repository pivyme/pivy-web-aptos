import UnlockIndex from "@/components/pages/(app)/unlock/UnlockIndex";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unlock - PIVY",
};

export default function UnlockPage() {
  return <UnlockIndex />;
}
