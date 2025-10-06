import LoginIndex from "@/components/pages/(app)/login/LoginIndex";
import LoginGuard from "@/components/auth/LoginGuard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - PIVY",
};

export default function Login() {
  return (
    <LoginGuard>
      <LoginIndex />
    </LoginGuard>
  );
}
