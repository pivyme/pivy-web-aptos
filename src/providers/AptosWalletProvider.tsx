"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { PropsWithChildren } from "react";

export const AptosWalletProvider = ({ children }: PropsWithChildren) => {
  const network =
    process.env.NEXT_PUBLIC_IS_TESTNET === "true"
      ? Network.TESTNET
      : Network.MAINNET;

  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      dappConfig={{
        network,
      }}
      onError={(error) => {
        console.error("Aptos Wallet Adapter error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}; 