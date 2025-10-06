import React, { useCallback, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import TokenInput from "./TokenInput";
import AptosPayButton from "./AptosPayButton";
import CollectInfoForm from "./CollectInfoForm";
import WalletSelectModal from "./WalletSelectModal";
import { usePay } from "@/providers/PayProvider";
import { EASE_SNAPPY_OUT } from "@/config/animation";
import { Textarea } from "@/components/ui/textarea";
import StaticTokenInput from "./StaticTokenInput";
import { userService, ChainId } from "@/lib/api/user";
import { SupportedChain } from "@/config/chains";
import { serializeFormattedStringToFloat } from "@/utils/formatting";

// Convert chain to API chain ID
const getChainId = (chain: SupportedChain): ChainId => {
  switch (chain) {
    case "APTOS":
      return process.env.NEXT_PUBLIC_IS_TESTNET === "true" ? "APTOS_TESTNET" : "APTOS_MAINNET";
    default:
      return "APTOS_TESTNET";
  }
};

export default function PaymentInterface() {
  const {
    selectedChain,
    wallet,
    amount,
    setAmount,
    paymentNote,
    setPaymentNote,
    selectedToken,
    setSelectedToken,
    addressData,
    paymentSuccess,
    setPaymentSuccess,
    currentColor,
    collectInfoData,
    setCollectInfoData,
    isWalletModalOpen,
    setIsWalletModalOpen,
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

  const [collectInfoErrors, setCollectInfoErrors] = useState({});
  const [fixedTokenBalance, setFixedTokenBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fundraisers should always allow open amounts, even with a goal
  const isFundraiser = addressData?.linkData?.template === "fundraiser";
  const isFixedPrice = addressData?.linkData?.amountType === "FIXED" && !isFundraiser;
  const chainDataForFixedPrice = isFixedPrice
    ? addressData?.chains?.[selectedChain!]
    : null;
  const tokenForFixedPrice =
    chainDataForFixedPrice?.mint && isFixedPrice
      ? {
          name: chainDataForFixedPrice.mint.name,
          symbol: chainDataForFixedPrice.mint.symbol,
          address: chainDataForFixedPrice.mint.mintAddress,
          decimals: chainDataForFixedPrice.mint.decimals,
          image: chainDataForFixedPrice.mint.imageUrl,
          isNative: chainDataForFixedPrice.mint.isNative,
        }
      : null;

  // Fetch balance for fixed token
  useEffect(() => {
    const fetchBalance = async () => {
      if (
        !isFixedPrice ||
        !wallet.connected ||
        !wallet.publicKey ||
        !walletChain
      ) {
        setFixedTokenBalance(null);
        return;
      }

      const mintAddress = addressData?.chains?.[selectedChain!]?.mint?.mintAddress;
      if (!mintAddress) {
        setFixedTokenBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const chainId = getChainId(walletChain as SupportedChain);
        const response = await userService.getBalance(wallet.publicKey, chainId);

        if (response.data) {
          const tokenBalances =
            "tokenBalance" in response.data
              ? response.data.tokenBalance
              : response.data.splBalance;

          const allTokens = [
            {
              ...response.data.nativeBalance,
              isNative: true,
              tokenAmount: response.data.nativeBalance.amount,
            },
            ...tokenBalances,
          ];

          const foundToken = allTokens.find(
            (t) =>
              t.mint === mintAddress ||
              // Handle native APT case where mint address is "0x1::aptos_coin::AptosCoin"
              ((t as any).isNative &&
                walletChain === "APTOS" &&
                mintAddress.includes("::aptos_coin::AptosCoin"))
          );

          setFixedTokenBalance(foundToken ? foundToken.tokenAmount : 0);
        } else {
          setFixedTokenBalance(0);
        }
      } catch (error) {
        console.error("Failed to fetch balance for fixed token:", error);
        setFixedTokenBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [
    isFixedPrice,
    wallet.connected,
    wallet.publicKey,
    walletChain,
    selectedChain,
    addressData,
  ]);

  // Memoize the TokenInput onChange callback to prevent infinite re-renders for open payments
  const handleTokenInputChange = useCallback(
    (output: any) => {
      // This handler is for open payments only
      if (isFixedPrice) return;

      if (output) {
        setAmount(output.rawAmount);
        setSelectedToken({
          symbol: output.token.symbol,
          decimals: output.token.decimals,
          isNative: output.token.isNative,
          address: output.token.address,
        });
      } else {
        setAmount("");
        setSelectedToken(null);
      }
    },
    [isFixedPrice, setAmount, setSelectedToken]
  );

  // Check if collect info is required and validate it
  const collectInfoValidation = useMemo(() => {
    const collectFields = addressData?.linkData?.collectFields;
    const isRequired =
      collectFields &&
      (collectFields.name || collectFields.email || collectFields.telegram);

    if (!isRequired) return { required: false, isValid: true, errors: {} };

    const errors: any = {};

    if (collectFields.name && !collectInfoData.name.trim()) {
      errors.name = "Name is required";
    }
    if (collectFields.email) {
      if (!collectInfoData.email.trim()) {
        errors.email = "Email is required";
      } else if (!/^\S+@\S+\.\S+$/.test(collectInfoData.email)) {
        errors.email = "Email address is invalid";
      }
    }
    if (collectFields.telegram && !collectInfoData.telegram.trim()) {
      errors.telegram = "Telegram is required";
    }

    const isValid = Object.keys(errors).length === 0;

    return {
      required: true,
      isValid,
      errors,
    };
  }, [addressData, collectInfoData]);

  // Handle collect info form changes
  const handleCollectInfoChange = useCallback(
    (data: any) => {
      setCollectInfoData(data);
      // Clear errors when user types
      setCollectInfoErrors({});
    },
    [setCollectInfoData]
  );

  // Handle payment error
  const handlePaymentError = useCallback((error: any) => {
    console.log("Payment error:", error);
    // Handle error state here if needed
  }, []);

  const handlePrePaymentValidation = useCallback(() => {
    if (collectInfoValidation.required && !collectInfoValidation.isValid) {
      setCollectInfoErrors(collectInfoValidation.errors);
      console.log("Payment blocked: collect info validation failed");
      return false;
    }
    return true;
  }, [collectInfoValidation, setCollectInfoErrors]);

  const handlePaymentSuccess = useCallback(
    async (txHash: string) => {
      console.log("Payment successful!", txHash);

      // Record payment with collect info data to backend
      try {
        const paymentData = {
          linkId: addressData?.linkData?.id || "",
          transactionSignature: txHash,
          amount: serializeFormattedStringToFloat(amount),
          tokenSymbol: selectedToken?.symbol || "",
          tokenAddress: selectedToken?.address || "",
          sourceChain: selectedChain || "",
          paymentNote: paymentNote,
          collectInfo: collectInfoValidation.required
            ? collectInfoData
            : undefined,
        };

        console.log("Recording payment:", paymentData);
        // const result = await backend.payments.recordPayment(paymentData);

        // if (result.data?.success) {
        //   console.log("Payment recorded successfully:", result.data);
        // } else {
        //   console.log("Payment recording failed:", result.error);
        // }
      } catch (error) {
        console.log("Error recording payment:", error);
        // Don't block the success flow if recording fails
      }

      setPaymentSuccess({
        signature: txHash,
        amount: serializeFormattedStringToFloat(amount),
        token: selectedToken,
        timestamp: Date.now(),
        sourceChain: selectedChain,
        collectInfo: collectInfoValidation.required
          ? collectInfoData
          : undefined,
      });
    },
    [
      amount,
      selectedToken,
      selectedChain,
      setPaymentSuccess,
      collectInfoData,
      addressData,
      paymentNote,
      collectInfoValidation,
    ]
  );

  if (!selectedChain || paymentSuccess) return null;

  return (
    <AnimatePresence>
      {wallet.connected && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: {
              height: {
                duration: 0.4,
                ease: EASE_SNAPPY_OUT,
                delay: 0.1,
              },
              opacity: {
                duration: 0.2,
                delay: 0.1,
              },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: {
                duration: 0.2,
                ease: EASE_SNAPPY_OUT,
              },
              opacity: {
                delay: 0.1,
                duration: 0.1,
              },
            },
          }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.4,
                ease: EASE_SNAPPY_OUT,
                delay: 0.1,
              },
            }}
            exit={{
              y: 20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: EASE_SNAPPY_OUT,
              },
            }}
            className="rounded-[1.6rem]"
          >
            <div className="space-y-4">
              <div className="text-center">
                {isFixedPrice && tokenForFixedPrice ? (
                  <StaticTokenInput
                    amount={amount}
                    token={tokenForFixedPrice}
                    balance={fixedTokenBalance}
                    isLoadingBalance={isLoadingBalance}
                  />
                ) : (
                  <TokenInput
                    chain={walletChain as any}
                    address={wallet.publicKey || ""}
                    defaultToken="APT"
                    onChange={handleTokenInputChange}
                  />
                )}
                <div className="relative mt-2">
                  <Textarea
                    className="w-full min-h-24 rounded-2xl border-2 border-transparent bg-gray-100 p-3 pb-8 text-sm placeholder:text-gray-500 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder="Add a note to this payment 📋"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    rows={1}
                  />
                  <div className="pl-4 text-left text-xs text-gray-400 mt-2">
                    *optional
                  </div>
                </div>
              </div>

              {/* Collect Info Form */}
              {collectInfoValidation.required && (
                <div className="mt-4">
                  <CollectInfoForm
                    formData={collectInfoData}
                    onFormChange={handleCollectInfoChange}
                    errors={collectInfoErrors}
                  />
                </div>
              )}

              {/* Payment Button - Always visible */}
              {walletChain === "APTOS" ? (
                <div className="mt-4">
                  <AptosPayButton
                    selectedToken={selectedToken}
                    amount={amount}
                    stealthData={addressData}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onValidate={handlePrePaymentValidation}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  {/* EVM/USDC Payment - Coming Soon */}
                  <div className="text-center text-gray-500 text-sm py-4 border-2 border-dashed border-gray-300 rounded-2xl">
                    EVM/USDC payments coming soon
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 text-center mt-4">
                Secured by PIVY • Private Self-custodial payments
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Wallet Selection Modal */}
      <WalletSelectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </AnimatePresence>
  );
}
