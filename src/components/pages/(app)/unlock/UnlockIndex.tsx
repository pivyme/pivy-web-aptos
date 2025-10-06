"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PinStep } from "../onboarding/steps/PinStep";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "motion/react";
import { EASE_OUT_QUART } from "@/config/animation";
import PivyLogo from "@/components/icons/PivyLogo";
import MainButton from "@/components/common/MainButton";

export default function UnlockIndex() {
  const { me, isSignedIn, disconnect } = useAuth();
  const aptosWallet = useAptosWallet();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  // Simple validation with hard redirects to prevent loops
  useEffect(() => {
    if (!isSignedIn || !me) {
      console.log("🔒 UnlockIndex: Not signed in, hard redirecting to login");
      window.location.href = "/login";
      return;
    }

    // Check if user has meta keys to unlock
    const hasBackendMetaKeys = me.wallets?.some(
      (wallet) => wallet.metaKeys?.metaSpendPub
    );
    if (!hasBackendMetaKeys) {
      console.log(
        "🔄 UnlockIndex: No meta keys found, redirecting to onboarding"
      );
      router.push("/onboarding");
      return;
    }
  }, [
    isSignedIn,
    me,
    router,
  ]);

  const handleConnectWallet = async () => {
    if (!aptosWallet.connect) {
      setConnectionError("Wallet adapter not ready. Please refresh the page.");
      return;
    }

    setIsConnecting(true);
    setConnectionError("");

    try {
      // Get the first available wallet (usually the one the user has installed)
      const availableWallets = aptosWallet.wallets || [];
      if (availableWallets.length === 0) {
        setConnectionError("No wallets detected. Please install an Aptos wallet extension.");
        return;
      }

      // Connect to the first available wallet
      const walletToConnect = availableWallets[0];
      await aptosWallet.connect(walletToConnect.name);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setConnectionError("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUnlockSuccess = () => {
    const search = window.location.search;
    router.push(`/app${search}`);
  };

  // Don't render anything while validating - let redirects happen
  if (!isSignedIn || !me) {
    return null;
  }

  // Show wallet connection step if wallet is not connected
  if (!aptosWallet.connected) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-screen bg-white overflow-hidden px-5">
        <button
          onClick={disconnect}
          className="fixed top-6 left-6 z-10 cursor-pointer flex items-center justify-center text-gray-600 hover:text-black transition-colors"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1 flex items-center justify-center w-full max-w-md">
          <div className="w-full">
            {/* Main content */}
            <div className="text-center mb-8 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, type: "tween", ease: EASE_OUT_QUART }}
                className="mb-6 flex justify-center"
              >
                <PivyLogo />
              </motion.div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.05,
                  duration: 0.5,
                  type: "tween",
                  ease: EASE_OUT_QUART,
                }}
                className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4"
              >
                Connect Your Wallet
              </motion.h1>

              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.1,
                  duration: 0.5,
                  type: "tween",
                  ease: EASE_OUT_QUART,
                }}
                className="text-gray-500 text-base md:text-lg leading-tight max-w-sm mx-auto text-balance"
              >
                Connect your Aptos wallet to unlock your account and access your meta keys.
              </motion.p>
            </div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.15,
                duration: 0.5,
                type: "tween",
                ease: EASE_OUT_QUART,
              }}
              className="mb-0"
            >
              <MainButton
                onClick={handleConnectWallet}
                disabled={isConnecting}
                isLoading={isConnecting}
                className="rounded-2xl py-4 disabled:opacity-40 w-full"
              >
                {isConnecting
                  ? "Connecting Wallet..."
                  : "Connect Aptos Wallet"}
              </MainButton>

              <AnimatePresence initial={false}>
                {connectionError && (
                  <motion.div
                    className="text-center relative flex items-end justify-center mt-4"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <p className="text-sm invisible">{connectionError}</p>
                    <motion.p
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                      className="text-red-500 text-sm font-medium inline-block absolute bottom-0"
                    >
                      {connectionError}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-6"></div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-white overflow-hidden px-5">
      <button
        onClick={disconnect}
        className="fixed top-6 left-6 z-10 cursor-pointer flex items-center justify-center text-gray-600 hover:text-black transition-colors"
        aria-label="Go back"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <div className="flex-1 flex items-center justify-center w-full max-w-md">
        <PinStep
          onNext={handleUnlockSuccess}
          onComplete={handleUnlockSuccess}
        />
      </div>
    </div>
  );
}
