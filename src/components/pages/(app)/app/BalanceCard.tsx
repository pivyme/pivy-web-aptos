"use client";

import TokenAvatar from "@/components/common/TokenAvatar";
import { useUser } from "@/providers/UserProvider";
import { formatUiNumber } from "@/utils/formatting";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import WithdrawModal from "./WithdrawModal";
import {
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import QRScannerModal from "./QRScannerModal";
import { ScanLine, Send, X, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { PIVY_DEMO_TOKEN } from "@/config/chains";

type TokenBalance = ReturnType<typeof useUser>["stealthBalances"][0];

interface TokenBalanceItemProps {
  token: TokenBalance;
  onClick: () => void;
  onDemoBadgeClick?: () => void;
}

function TokenBalanceItem({
  token,
  onClick,
  onDemoBadgeClick,
}: TokenBalanceItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDemoBadgeDismissed, setIsDemoBadgeDismissed] = useState(false);

  // Helper function to check if token is a demo token
  const isDemoToken = (token: TokenBalance): boolean => {
    if (
      token.chain === "APTOS_MAINNET" &&
      token.mintAddress === PIVY_DEMO_TOKEN.APTOS_MAINNET
    ) {
      return true;
    }
    if (
      token.chain === "APTOS_TESTNET" &&
      token.mintAddress === PIVY_DEMO_TOKEN.APTOS_TESTNET
    ) {
      return true;
    }
    return false;
  };

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(
      `demo-badge-dismissed-${token.mintAddress}`
    );
    setIsDemoBadgeDismissed(dismissed === "true");
  }, [token.mintAddress]);

  const isDemo = isDemoToken(token);

  const handleDemoBadgeDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(`demo-badge-dismissed-${token.mintAddress}`, "true");
    setIsDemoBadgeDismissed(true);
  };

  const handleDemoBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDemoBadgeClick?.();
  };

  return (
    <button
      className="w-full py-1 md:py-3 md:px-3 flex flex-col items-start text-start h-fit cursor-pointer relative"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cute hover indicator */}
      <motion.div
        className="absolute w-full h-full bg-background-500 rounded-2xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0"
        animate={{
          scale: isHovered ? 1 : 0.4,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{
          duration: 0.12,
          ease: "easeInOut",
        }}
      />
      <div className="flex flex-row items-center gap-4 justify-between w-full z-10 relative">
        <div className="flex items-center space-x-3">
          <TokenAvatar
            imageUrl={token.imageUrl}
            symbol={token.symbol}
            variant="default"
            isVerified={token.isVerified}
            chain={token.chain as any}
            isNative={token.isNative}
          />

          <div className="flex flex-col">
            <div className="flex flex-row items-center gap-1">
              <div className="font-semibold md:text-lg">
                <span>
                  {formatUiNumber(token.total, "", {
                    maxDecimals: 4,
                  })}{" "}
                </span>
                <span className="opacity-40 font-medium">{token.symbol}</span>
              </div>
              {/* TODO: warning on unverified tokens*/}
              {/* {token.isVerified && (
                <CheckIcon className="w-4 h-4 text-primary-600" />
              )} */}
            </div>
            <div className="text-sm -mt-1">
              <span className="opacity-50">{token.name}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center gap-2">
          <span className="opacity-50 text-sm font-medium">
            $
            {formatUiNumber(token.usdValue, "", {
              maxDecimals: 2,
            })}
          </span>
          <Send className="size-4 opacity-50" />
        </div>
      </div>

      {/* Demo Token Badge */}
      <AnimatePresence>
        {isDemo && !isDemoBadgeDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full z-10 relative overflow-hidden"
            onClick={handleDemoBadgeClick}
          >
            <div className="bg-gradient-to-r from-primary-100 to-primary-200 border border-primary-600 rounded-xl p-3 cursor-pointer hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-start gap-2">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 10, 0],
                    scale: [1, 1.1, 1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                  className="shrink-0 mt-0.5"
                >
                  <Sparkles className="size-4 text-black" />
                </motion.div>
                <div className="flex-1 text-black">
                  <div className="font-semibold text-sm mb-0.5">
                    Demo Token - Click me!
                  </div>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    We sent you this to experience how seamless PIVY withdrawals
                    are. Click to try it out!
                  </div>
                </div>
                <div
                  onClick={handleDemoBadgeDismiss}
                  className="shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-3.5 text-black" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

function BalanceCard() {
  const {
    stealthBalancesSummary,
    stealthBalances,
    stealthBalancesInitialLoading,
  } = useUser();

  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>();
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleTokenClick = (token: TokenBalance) => {
    setSelectedToken(token);
    setIsWithdrawModalOpen(true);
  };

  const handleDemoBadgeClick = (token: TokenBalance) => {
    setSelectedToken(token);
    setQrCodeData("https://pivy.me/pivy");
    setIsWithdrawModalOpen(true);
  };

  const processQRCode = (code: string): string | null => {
    const trimmedCode = code.trim();

    // Case 1: Pivy link (https://pivy.me/username or https://pivy.me/username/anything)
    // Pass the full URL directly to backend
    const pivyLinkRegex = /^https?:\/\/pivy\.me\/[a-zA-Z0-9_.-]+(?:\/.*)?$/i;
    if (pivyLinkRegex.test(trimmedCode)) {
      return trimmedCode; // Return full URL
    }

    // Case 2: Aptos address (starts with 0x and has correct length)
    const aptosAddressRegex = /^0x[a-fA-F0-9]{64}$/;
    if (aptosAddressRegex.test(trimmedCode)) {
      return trimmedCode;
    }

    // Case 3: Plain username (fallback)
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (usernameRegex.test(trimmedCode) && trimmedCode.length > 0) {
      return trimmedCode;
    }

    return null;
  };

  const handleQRCodeScanned = (code: string) => {
    const processedCode = processQRCode(code);
    if (processedCode) {
      setQrCodeData(processedCode);
      setIsQRScannerOpen(false);

      // If we have a selected token, open the withdraw modal
      if (selectedToken) {
        setIsWithdrawModalOpen(true);
      } else if (stealthBalances.length > 0) {
        // Auto-select the first token if none is selected
        setSelectedToken(stealthBalances[0]);
        setIsWithdrawModalOpen(true);
      }
    } else {
      console.warn("Could not process QR code:", code);
    }
  };

  return (
    <>
      <div className="rounded-3xl p-1.5 bg-primary-400 shadow-supa-smooth relative">
        <div className="bg-white rounded-[1.2rem] overflow-hidden transition-shadow ">
          <div className="p-5 sm:p-6">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <span>Your Stealth Balances</span>
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip="Click on a token to withdraw your balance."
                    style={{ zIndex: 100 }}
                  >
                    <InformationCircleIcon className="size-4" />
                  </div>
                </div>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setIsQRScannerOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer absolute right-5 top-5"
                    aria-label="Scan QR code"
                  >
                    <ScanLine className="size-6 md:size-8 text-gray-700" />
                  </button>
                )}
              </div>
              <div className="flex flex-row gap-1 items-end mt-2">
                {stealthBalancesInitialLoading ? (
                  <div className="skeleton w-16 h-7"></div>
                ) : (
                  <div className="text-3xl md:text-4xl font-bold leading-none">
                    {"$"}
                    {formatUiNumber(
                      stealthBalancesSummary?.totalBalanceUsd || 0,
                      "",
                      {
                        maxDecimals: 2,
                      }
                    )}
                  </div>
                )}
                {stealthBalancesInitialLoading ? (
                  <div className="skeleton w-16 h-7"></div>
                ) : (
                  <div className="opacity-50 font-medium text-lg">USD</div>
                )}
              </div>
            </div>

            {/* Tokens Boxes */}
            <div className="mt-4">
              {stealthBalances.length > 0 ? (
                <>
                  <div className="text-sm opacity-50 font-medium">Tokens</div>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {stealthBalancesInitialLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="loading loading-spinner size-5" />
                      </div>
                    ) : (
                      stealthBalances.map((token) => (
                        <TokenBalanceItem
                          key={token.mintAddress}
                          token={token}
                          onClick={() => handleTokenClick(token)}
                          onDemoBadgeClick={() => handleDemoBadgeClick(token)}
                        />
                      ))
                    )}
                  </div>
                </>
              ) : (
                !stealthBalancesInitialLoading && (
                  <div className="bg-gray-50 rounded-2xl p-4 w-full font-medium">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
                      <div className="text-sm text-gray-500">
                        No stealth balances yet
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-center text-balance">
                      This shows tokens you&apos;ve received through PIVY&apos;s
                      stealth payments, not your regular wallet balance
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-primary-700 text-xs md:text-[0.8rem] font-medium select-none pt-1.5">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-primary-700 stroke-2" />
          <span>Private payments received through PIVY</span>
        </div>
      </div>

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => {
          setIsWithdrawModalOpen(false);
          setQrCodeData(null); // Clear QR data when modal closes
        }}
        token={selectedToken}
        initialSearchQuery={qrCodeData}
      />
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onCodeSolved={handleQRCodeScanned}
      />
    </>
  );
}

export default BalanceCard;
