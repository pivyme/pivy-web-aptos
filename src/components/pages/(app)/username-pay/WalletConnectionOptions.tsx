import Image from "next/image";
import { ArrowRightIcon } from "lucide-react";
import { usePay } from "@/providers/PayProvider";
import MainButton from "@/components/common/MainButton";

export default function WalletConnectionOptions() {
  const {
    selectedChain,
    wallet,
    handleOpenWalletModal,
    setIsUsdcMode,
    addressData,
  } = usePay();

  // Convert network-specific chains to wallet chains
  const getWalletChain = (chain: string): string => {
    if (
      chain === "APTOS_TESTNET" ||
      chain === "APTOS" ||
      chain === "APTOS_MAINNET"
    ) {
      return "APTOS";
    }
    return chain;
  };

  const walletChain = selectedChain ? getWalletChain(selectedChain) : null;

  // Get display name for the wallet chain
  const getWalletDisplayName = (chain: string | null): string => {
    if (!chain) return "wallet";
    if (chain === "APTOS") return "Aptos";
    return chain;
  };

  // Check if USDC EVM payment should be available
  // Only show USDC option if:
  // 1. amountType is "OPEN" OR
  // 2. amountType is "FIXED" AND isStable is true AND stableToken is "USDC"
  const shouldShowUsdcOption = () => {
    const linkData = addressData?.linkData;
    if (!linkData) return false;

    const amountType = linkData.amountType;
    const isStable = linkData.isStable;
    const stableToken = linkData.stableToken;

    return (
      amountType === "OPEN" ||
      (amountType === "FIXED" && isStable && stableToken === "USDC")
    );
  };

  if (!selectedChain || wallet.connected) return null;

  return (
    <div className="space-y-4">
      <MainButton
        className="w-full tracking-tight font-semibold px-5 py-3 text-lg rounded-2xl"
        onClick={handleOpenWalletModal}
      >
        Connect your {getWalletDisplayName(walletChain)} wallet
      </MainButton>

      {shouldShowUsdcOption() && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-500 bg-white">or</span>
            </div>
          </div>

          <button
            onClick={() => setIsUsdcMode(true)}
            className="w-full flex items-center justify-center gap-2 py-4 text-gray-600 hover:text-gray-900 transition-colors group rounded-[1.2rem] border border-gray-200 hover:border-gray-300"
          >
            <Image
              src="/assets/tokens/usdc.png"
              width={20}
              height={20}
              alt="USDC"
            />
            <span className="text-sm font-medium">
              Pay with USDC from any EVM chain
            </span>
            <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>
        </>
      )}
    </div>
  );
}
