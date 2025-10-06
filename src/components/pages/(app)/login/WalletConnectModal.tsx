/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";

import CuteModal from "@/components/common/CuteModal";
import { cnm } from "@/utils/style";
import { useAuth } from "@/providers/AuthProvider";
import { backend } from "@/lib/api";

import {
  useWallet as useAptosWallet,
} from "@aptos-labs/wallet-adapter-react";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletButton = ({
  wallet,
  isConnecting,
  onClick,
}: {
  wallet: any;
  isConnecting: boolean;
  onClick: () => void;
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      className={cnm(
        "bg-white text-start w-full h-auto p-0 rounded-3xl transition-all duration-200 relative",
        "hover:bg-gray-50 bg-gray-50"
      )}
      onClick={onClick}
      disabled={isConnecting}
    >
      <div className="flex items-center gap-4 p-4 w-full">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          <img
            src={imageError ? "/assets/chains/aptos.svg" : wallet.icon || "/assets/chains/aptos.svg"}
            alt={wallet.name}
            style={{ width: "32px", height: "32px" }}
            className="rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-gray-900">{wallet.name}</h3>
          <p className="text-sm text-gray-600 mt-1">Connect with {wallet.name}</p>
        </div>
        {isConnecting && (
          <div className="flex items-center justify-center mr-2">
            <div className="size-7 loading loading-dots text-gray-500" />
          </div>
        )}
      </div>
    </button>
  );
};

export default function WalletConnectModal({
  isOpen,
  onClose,
}: WalletConnectModalProps) {
  const { authenticateWithSIWA } = useAuth();

  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [siwaInput, setSiwaInput] = useState<any>(null);
  const [isLoadingNonce, setIsLoadingNonce] = useState(false);

  const aptosWallet = useAptosWallet();

  // Get all wallets (both installed and not installed)
  const allWallets = aptosWallet.wallets || [];

  // Pre-fetch SIWA nonce when modal opens
  useEffect(() => {
    if (isOpen && !siwaInput && !isLoadingNonce) {
      setIsLoadingNonce(true);
      backend.auth.getSIWANonce()
        .then((response) => {
          if (response.error || !response.data) {
            console.error("Failed to get SIWA nonce:", response.error);
            setError("Failed to initialize wallet connection. Please try again.");
          } else {
            setSiwaInput(response.data.data);
          }
        })
        .catch((error) => {
          console.error("Error fetching SIWA nonce:", error);
          setError("Failed to initialize wallet connection. Please try again.");
        })
        .finally(() => {
          setIsLoadingNonce(false);
        });
    }
  }, [isOpen, siwaInput, isLoadingNonce]);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSiwaInput(null);
      setError(null);
      setConnecting(null);
    }
  }, [isOpen]);

  const handleConnect = async (walletName: string) => {
    if (!siwaInput) {
      setError("Wallet connection not ready. Please wait and try again.");
      return;
    }

    const walletId = walletName.toLowerCase().replace(/\s+/g, "-");
    setConnecting(walletId);
    setError(null);

    try {
      // Pass the pre-fetched SIWA input to avoid async operations during popup opening
      await authenticateWithSIWA(walletName, siwaInput);
      onClose();
    } catch (e: any) {
      console.error("Failed to connect wallet:", e);
      setError(
        `Failed to connect to ${walletName}. ${
          e?.message || "Please try again."
        }`
      );
    } finally {
      setConnecting(null);
    }
  };

  return (
    <CuteModal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Wallet"
      size="lg"
    >
      <div className="flex flex-col min-h-[400px]">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">Connect your Aptos Wallet</h2>
          <p className="text-gray-600 text-sm ">
            Choose a wallet to connect
          </p>
        </div>

        {isLoadingNonce ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="loading loading-dots w-8 text-gray-600"></div>
            <p className="text-gray-500 text-sm mt-2">Preparing wallet connection...</p>
          </div>
        ) : allWallets.length === 0 ? (
          <div className="text-center py-8 -sans">
            <p className="text-gray-500">No wallets detected.</p>
            <p className="text-sm text-gray-400 mt-1">
              Please install a compatible wallet extension.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {allWallets.map((wallet) => {
              const walletId = wallet.name.toLowerCase().replace(/\s+/g, "-");
              const isConnecting = connecting === walletId;

              return (
                <WalletButton
                  key={walletId}
                  wallet={wallet}
                  isConnecting={isConnecting}
                  onClick={() => handleConnect(wallet.name)}
                />
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>
    </CuteModal>
  );
}
