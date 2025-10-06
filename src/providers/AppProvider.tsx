import { AuthProvider } from "@/providers/AuthProvider";
import { AptosWalletProvider } from "./AptosWalletProvider";
import { PropsWithChildren } from "react";
import UserProvider from "./UserProvider";
import { SoundProvider } from "./SoundProvider";

export default function AppProvider({ children }: PropsWithChildren) {
  return (
    <AptosWalletProvider>
      <AuthProvider>
        <UserProvider>
          <SoundProvider>
            <div>{children}</div>
          </SoundProvider>
        </UserProvider>
      </AuthProvider>
    </AptosWalletProvider>
  );
}
