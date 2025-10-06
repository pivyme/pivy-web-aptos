import {
  ArrowRightIcon,
  InfoIcon,
  CheckCircleIcon,
  Loader2Icon,
  CopyIcon,
  ArrowUpRightIcon,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import React, { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { USDC_ABI, getUsdcAddress, getTokenMessengerInfo } from "@/config/cctp";
import { getChainDisplayName, getChainIconName } from "@/config/chains";
import { formatUnits, parseUnits } from "viem";
import { ethers } from "ethers";
import axios from "axios";
import { motion } from "motion/react";
import { usePay } from "@/providers/PayProvider";
import CollectInfoForm from "./CollectInfoForm";
import { Textarea } from "@/components/ui/textarea";
import MainButton from "@/components/common/MainButton";
import Image from "next/image";
import TokenInput, { PredefinedToken } from "./TokenInput";
import StaticTokenInput from "./StaticTokenInput";
import { getTransitionConfig } from "@/config/animation";
import { isTestnet } from "@/config/chains";
import { saveCCTPTransaction } from "./CCTPTransactionTracker";
import { getExplorerTxLink, ExplorerChain } from "@/utils/misc";

// Loading step component for visual feedback
const LoadingStep = ({
  isActive,
  isCompleted,
  title,
  description,
  isLast,
}: {
  isActive: boolean;
  isCompleted: boolean;
  title: string;
  description: string;
  isLast?: boolean;
}) => {
  let statusClass = "bg-gray-100 text-gray-400";
  let titleClass = "text-gray-400";
  let descriptionClass = "text-gray-400";

  if (isCompleted) {
    statusClass =
      "bg-emerald-100 text-emerald-700 shadow-inner shadow-emerald-200";
    titleClass = "text-emerald-700";
    descriptionClass = "text-emerald-700";
  } else if (isActive) {
    statusClass = "bg-primary-50 text-primary-500";
    titleClass = "text-primary-900";
    descriptionClass = "text-gray-600";
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${statusClass}`}
        >
          {isCompleted && <CheckCircleIcon className="w-5 h-5" />}
          {isActive && <Loader2Icon className="w-5 h-5 animate-spin" />}
          {!isCompleted && !isActive && (
            <div className="w-2 h-2 rounded-full bg-current" />
          )}
        </div>
        {!isLast && (
          <div
            className={`w-0.5 h-8 ${
              isCompleted ? "bg-emerald-200" : "bg-gray-200"
            }`}
          />
        )}
      </div>
      <div>
        <h3 className={`font-semibold ${titleClass}`}>{title}</h3>
        <p className={`text-sm ${descriptionClass}`}>{description}</p>
      </div>
    </div>
  );
};

export default function UsdcEvmPayment({
  amount,
  setAmount,
  stealthData,
  onSuccess,
}: {
  amount: string;
  setAmount: (amount: string) => void;
  stealthData: any;
  onSuccess?: (details: any) => void;
}) {
  const {
    setIsUsdcMode,
    selectedChain,
    submitPaymentInfoAndGetId,
    paymentNote,
    setPaymentNote,
    collectInfoData,
    setCollectInfoData,
    addressData,
    usdcProcessingState,
  } = usePay();

  // Destructure USDC processing state from provider (persists across layout changes)
  const {
    isPaying,
    setIsPaying,
    currentStep,
    setCurrentStep,
    isConfirmingInWallet,
    setIsConfirmingInWallet,
    isApproving,
    setIsApproving,
    allowance,
    setAllowance,
    collectInfoErrors,
    setCollectInfoErrors,
  } = usdcProcessingState;

  const { isConnected, chain, address } = useAccount();

  // Extract linkId, username, and tag from addressData
  const linkId = addressData?.linkData?.id || "";
  const username = addressData?.userData?.username || "";
  const tag = addressData?.linkData?.tag || "";

  // Local UI state (doesn't need to persist across layouts)
  const [isCopied, setIsCopied] = useState(false);
  const [trackingTransactionId, setTrackingTransactionId] =
    useState<string>("");

  // Load pending transactions from localStorage on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cctpTransactionId = urlParams.get("cctpTransactionId");

    if (cctpTransactionId && !isPaying) {
      // Don't run if a payment is already in progress
      console.log("Resuming CCTP transaction tracking for:", cctpTransactionId);
      setTrackingTransactionId(cctpTransactionId);

      const resumePolling = async () => {
        try {
          setIsPaying(true);

          const completedTransaction = await pollTransactionStatus(
            cctpTransactionId
          );

          // The amount should come from the transaction data
          const formattedAmount = completedTransaction.amount
            ? formatUnits(BigInt(completedTransaction.amount), 6)
            : amount; // Fallback to state amount, though it might be empty

          // Update localStorage to mark as completed
          saveCCTPTransaction({
            id: cctpTransactionId,
            amount: formattedAmount,
            chain: completedTransaction.chain,
            linkId: linkId,
            username: username,
            tag: tag,
            timestamp: Date.now(),
            status: "completed",
          });

          // Construct correct explorer URL
          const txHash =
            completedTransaction.destTxHash || completedTransaction.id;
          let explorerUrl = completedTransaction.explorerUrl;

          // Fix Aptos explorer URL if needed
          if (
            selectedChain === "APTOS_TESTNET" ||
            selectedChain === "APTOS_MAINNET"
          ) {
            explorerUrl = getExplorerTxLink(
              txHash,
              selectedChain as ExplorerChain
            );
          }

          onSuccess?.({
            signature: txHash,
            amount: formattedAmount,
            token: {
              symbol: "USDC",
              name: "USD Coin",
              imageUrl: "/tokens/usdc.png",
            },
            timestamp: Date.now(),
            explorerUrl: explorerUrl,
            sourceChain: selectedChain,
            bridgeData: {
              ...completedTransaction,
              transactionId: cctpTransactionId,
              srcTxHash: completedTransaction.srcTxHash,
              destTxHash: completedTransaction.destTxHash,
              chain: completedTransaction.chain,
            },
          });
        } catch (error: any) {
          console.error("Error resuming CCTP polling:", error);

          // Update localStorage to mark as failed
          saveCCTPTransaction({
            id: cctpTransactionId,
            amount: amount || "0",
            chain: selectedChain || "UNKNOWN",
            linkId: linkId,
            username: username,
            tag: tag,
            timestamp: Date.now(),
            status: "failed",
          });

          // Only show user-friendly errors, not timeout errors
          if (
            !error.message?.includes("timed out") &&
            !error.message?.includes("polling")
          ) {
            alert(`Transaction tracking error: ${error.message}`);
          }
          // Reset state
          setIsPaying(false);
          setCurrentStep(0);
        }
      };

      resumePolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if this is a fixed price USDC payment
  const isFixedPriceUsdc = () => {
    const linkData = stealthData?.linkData;
    return (
      linkData?.amountType === "FIXED" &&
      linkData?.isStable &&
      linkData?.stableToken === "USDC"
    );
  };

  // Get USDC contract address for current chain
  const usdcAddress = chain?.id
    ? getUsdcAddress(chain.id, !!chain.testnet)
    : "";

  const usdcPredefinedToken: PredefinedToken[] = React.useMemo(
    () => [
      {
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        image: "/assets/tokens/usdc.png",
        address: usdcAddress,
      },
    ],
    [usdcAddress]
  );

  const handleTokenInputChange = React.useCallback(
    (output: any) => {
      if (output) {
        setAmount(output.rawAmount);
      } else {
        setAmount("");
      }
    },
    [setAmount]
  );

  console.log("usdcAddress", usdcAddress);

  // Get USDC balance
  const { isLoading: isLoadingUsdcBalance, data: usdcBalance } =
    useReadContract({
      address: usdcAddress as `0x${string}`,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [address],
      query: {
        enabled: isConnected && !!usdcAddress,
      },
    });

  // Get Token Messenger contract info
  const tokenMessengerInfo = chain?.id ? getTokenMessengerInfo(chain.id) : null;

  // Get USDC allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: usdcAddress as `0x${string}`,
      abi: USDC_ABI,
      functionName: "allowance",
      args: [address, tokenMessengerInfo?.address],
      query: {
        enabled: isConnected && !!usdcAddress && !!tokenMessengerInfo?.address,
      },
    }
  );

  useEffect(() => {
    if (currentAllowance) {
      setAllowance(currentAllowance.toString());
    }
  }, [currentAllowance, setAllowance]);

  const formattedUsdcBalance = formatUnits((usdcBalance as any) || 0n, 6);

  // Check if collect info is required and validate it
  const collectInfoValidation = React.useMemo(() => {
    const collectFields = stealthData?.linkData?.collectFields;
    const isRequired =
      collectFields &&
      (collectFields.name || collectFields.email || collectFields.telegram);

    if (!isRequired) return { required: false, isValid: true, errors: {} };

    const errors: any = {};

    if (collectFields.name && !collectInfoData.name.trim()) {
      errors.name = "Name is required";
    }
    if (collectFields.email && !collectInfoData.email.trim()) {
      errors.email = "Email is required";
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
  }, [stealthData, collectInfoData]);

  // Handle collect info form changes
  const handleCollectInfoChange = React.useCallback(
    (data: any) => {
      setCollectInfoData(data);
      // Clear errors when user types
      setCollectInfoErrors({});
    },
    [setCollectInfoData, setCollectInfoErrors]
  );

  const handleApproveUsdc = async () => {
    if (!window.ethereum || !chain?.id || !usdcAddress || !tokenMessengerInfo)
      return;

    try {
      setIsApproving(true);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, signer);

      const tx = await usdcContract.approve(
        tokenMessengerInfo.address,
        ethers.MaxUint256
      );

      await tx.wait();
      await refetchAllowance();
    } catch (error) {
      console.error("Error approving USDC:", error);
    } finally {
      setIsApproving(false);
    }
  };

  // Function to poll transaction status from backend with exponential backoff
  async function pollTransactionStatus(transactionId: string) {
    let retryCount = 0;
    let i = 0;

    while (true) {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/cctp/cctp-status/${transactionId}`,
          { timeout: 10000 } // 10 second timeout per request
        );

        const { success, transaction } = response.data;

        if (!success || !transaction) {
          throw new Error("Invalid response from backend");
        }

        if (transaction.status === "COMPLETED") {
          console.log("✅ CCTP transaction completed successfully");
          return transaction;
        } else if (transaction.status === "FAILED") {
          const errorMsg = transaction.errorMessage || "Transaction failed";
          console.error("❌ CCTP transaction failed:", errorMsg);
          throw new Error(errorMsg);
        }

        // Update UI based on status
        if (
          transaction.status === "SUBMITTED" ||
          transaction.status === "PROCESSING"
        ) {
          setCurrentStep(2);
        } else if (transaction.status === "ATTESTATION_PENDING") {
          setCurrentStep(2);
        } else if (transaction.status === "COMPLETING") {
          setCurrentStep(3);
        }

        // Reset retry count on successful response
        retryCount = 0;

        // Variable polling interval: start fast, then slow down
        const pollInterval =
          i < 12
            ? 3000 // First minute: 3 seconds
            : i < 24
            ? 5000 // Next 2 minutes: 5 seconds
            : 10000; // After 3 minutes: 10 seconds

        await new Promise((r) => setTimeout(r, pollInterval));
      } catch (error: any) {
        retryCount++;

        console.warn(
          `⚠️ Error polling transaction status (attempt ${retryCount}):`,
          error.message
        );

        // If it's a network error, retry with exponential backoff
        if (
          retryCount < 5 &&
          (error.code === "NETWORK_ERROR" || error.code === "ECONNABORTED")
        ) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
          console.log(`🔄 Retrying in ${backoffDelay}ms...`);
          await new Promise((r) => setTimeout(r, backoffDelay));
          continue;
        }

        // For other errors, continue with normal polling interval
        await new Promise((r) => setTimeout(r, 5000));
      }

      i++; // Increment counter for polling interval calculation
    }
  }

  const sanitizedAmount = amount.replace(/,/g, "") || "0";

  const handlePayEvmUSDC = async () => {
    if (
      !window.ethereum ||
      !chain?.id ||
      !usdcAddress ||
      !tokenMessengerInfo ||
      !stealthData ||
      !selectedChain
    ) {
      console.error("Missing required data for USDC payment:", {
        hasEthereum: !!window.ethereum,
        chainId: chain?.id,
        hasUsdcAddress: !!usdcAddress,
        hasTokenMessenger: !!tokenMessengerInfo,
        hasStealthData: !!stealthData,
        selectedChain,
      });
      return;
    }

    try {
      setIsConfirmingInWallet(true);

      // Validate collect info before processing payment
      if (collectInfoValidation.required && !collectInfoValidation.isValid) {
        setCollectInfoErrors(collectInfoValidation.errors);
        console.log("Payment blocked: collect info validation failed");
        setIsConfirmingInWallet(false);
        return;
      }

      console.log("isTestnet", isTestnet);
      // Submit Payment info and get ID (like SuiPayButton)
      const paymentInfoId = await submitPaymentInfoAndGetId();

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      // Get target chain info based on selected chain
      let targetDomain: number;
      let prepareData: any;
      let recipientBytes32: string;

      // Determine target chain based on selected chain
      const sourceChain =
        selectedChain === "APTOS_MAINNET" || selectedChain === "APTOS_TESTNET"
          ? "APTOS"
          : selectedChain;

      if (sourceChain === "APTOS") {
        targetDomain = 9; // Aptos domain

        // Get Aptos chain data
        const chains = stealthData.chains || {};
        const getAptosChainData = () => {
          // The stealth data uses network-specific keys like "APTOS_MAINNET" or "APTOS_TESTNET"
          if (selectedChain === "APTOS_TESTNET") {
            return chains.APTOS_TESTNET || chains.APTOS || null;
          }
          return chains.APTOS_MAINNET || chains.APTOS || null;
        };

        const aptosChainData = getAptosChainData();
        if (!aptosChainData) {
          throw new Error("Missing Aptos chain configuration in stealth data");
        }
        if (!aptosChainData.metaSpendPub || !aptosChainData.metaViewPub) {
          throw new Error(
            "Missing metaSpendPub or metaViewPub for Aptos chain"
          );
        }

        // Import Aptos stealth helpers
        const { PivyStealthAptos } = await import(
          "@/lib/@pivy/core/pivy-stealth-aptos"
        );
        const pivyAptos = new PivyStealthAptos();

        // Generate ephemeral key (matches AptosPayButton.tsx)
        const ephemeral = pivyAptos.generateEphemeralKey();
        const ephPubB58 = ephemeral.publicKeyB58;
        console.log("🔑 Ephemeral public key (base58):", ephPubB58);

        // Derive stealth address
        const stealthData_derived = await pivyAptos.deriveStealthPub(
          aptosChainData.metaSpendPub,
          aptosChainData.metaViewPub,
          ephemeral.privateKey
        );

        // Encrypt ephemeral private key (this becomes the "memo" field)
        const encryptedMemo = await pivyAptos.encryptEphemeralPrivKey(
          ephemeral.privateKey,
          aptosChainData.metaViewPub
        );

        // Determine label and encrypt it
        const label = stealthData.linkData.id;
        console.log("LABEL", label);

        const encryptedLabelBytes = await pivyAptos.encryptNote(
          label,
          ephemeral.privateKey,
          aptosChainData.metaViewPub
        );
        const encryptedLabel = (await import("bs58")).default.encode(
          encryptedLabelBytes
        );

        // Encrypt note if provided
        let encryptedNote = "";
        if (paymentInfoId) {
          const encryptedNoteBytes = await pivyAptos.encryptNote(
            paymentInfoId,
            ephemeral.privateKey,
            aptosChainData.metaViewPub
          );
          encryptedNote = (await import("bs58")).default.encode(
            encryptedNoteBytes
          );
        }

        prepareData = {
          stealthAddress: stealthData_derived.stealthAptosAddress,
          ephPub: ephPubB58, // Ephemeral public key (base58)
          ephemeralPrivKey: ephemeral.privateKey,
          encryptedPayload: encryptedMemo, // Encrypted ephemeral private key (base58)
          encryptedLabel,
          encryptedNote,
        };

        console.log("📦 Aptos prepareData:", {
          ...prepareData,
          ephemeralPrivKey: "***", // Don't log private key
        });

        // Convert Aptos address to bytes32 for CCTP
        // Aptos addresses are 0x-prefixed hex strings (32 bytes)
        const addressHex = stealthData_derived.stealthAptosAddress.startsWith(
          "0x"
        )
          ? stealthData_derived.stealthAptosAddress.slice(2)
          : stealthData_derived.stealthAptosAddress;
        recipientBytes32 = "0x" + addressHex.padStart(64, "0");
      } else {
        throw new Error(`Unsupported source chain: ${sourceChain}`);
      }

      const messengerContract = new ethers.Contract(
        tokenMessengerInfo.address,
        ["function depositForBurn(uint256,uint32,bytes32,address)"],
        signer
      );

      const amountInWei = parseUnits(sanitizedAmount.toString(), 6);
      const tx = await messengerContract.depositForBurn(
        amountInWei,
        targetDomain,
        recipientBytes32,
        usdcAddress
      );

      setIsConfirmingInWallet(false);
      setIsPaying(true);
      setCurrentStep(1);

      await tx.wait();
      console.log("depositForBurn tx", tx.hash);

      setCurrentStep(2);

      console.log(
        "💾 Submitting transaction to backend for reliable processing..."
      );

      let cctpData: any = {
        srcDomain: tokenMessengerInfo.domain,
        srcTxHash: tx.hash,
        amount: amountInWei.toString(),
        attestation: {
          // Submit with PENDING, backend will poll for completion
          attestation: "PENDING",
          message: "",
          eventNonce: 0,
        },
        usdcAddress,
        linkId: stealthData.linkData?.id,
        paymentInfoId: paymentInfoId, // Include payment info ID for linking
      };

      if (sourceChain === "APTOS") {
        console.log("🔍 Adding Aptos data to CCTP payload:", {
          recipientAddress: prepareData.stealthAddress,
          ephPub: prepareData.ephPub,
          hasEncryptedPayload: !!prepareData.encryptedPayload,
          hasEncryptedLabel: !!prepareData.encryptedLabel,
        });

        cctpData = {
          ...cctpData,
          recipientAddress: prepareData.stealthAddress,
          ephPub: prepareData.ephPub, // Ephemeral public key (base58)
          encryptedPayload: prepareData.encryptedPayload, // Encrypted ephemeral private key (base58)
          encryptedLabel: prepareData.encryptedLabel, // Encrypted label (base58)
          encryptedNote: prepareData.encryptedNote, // Encrypted note/payment info ID (base58)
        };

        console.log(
          "📤 Final CCTP payload:",
          JSON.stringify(cctpData, null, 2)
        );
      }

      // Submit to backend for reliable processing
      // Determine the chain parameter based on the target chain
      let chainParam: string;
      if (sourceChain === "APTOS") {
        chainParam = selectedChain; // "APTOS_MAINNET" or "APTOS_TESTNET"
      } else {
        throw new Error(
          `Unsupported source chain for backend submission: ${sourceChain}`
        );
      }

      const submitRes = await axios({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/cctp/submit-cctp-tx`,
        data: cctpData,
        params: {
          chain: chainParam,
        },
      });

      if (!submitRes.data.success) {
        throw new Error(
          submitRes.data.message || "Failed to submit CCTP transaction"
        );
      }

      const { transactionId } = submitRes.data;
      console.log("CCTP transaction submitted to backend:", transactionId);

      // Set tracking transaction ID in state for URL generation
      setTrackingTransactionId(transactionId);

      // Save to localStorage for tracking
      saveCCTPTransaction({
        id: transactionId,
        amount: sanitizedAmount,
        chain: chainParam,
        linkId: linkId,
        username: username,
        tag: tag,
        timestamp: Date.now(),
        status: "pending",
      });

      // Add transactionId to URL for refresh resilience
      const url = new URL(window.location.href);
      url.searchParams.set("cctpTransactionId", transactionId);
      window.history.replaceState({}, "", url);

      // Poll for completion - this is safe even if user disconnects.
      // The polling function will now handle all step updates from the backend.
      const completedTransaction = await pollTransactionStatus(transactionId);

      onSuccess?.({
        signature: completedTransaction.destTxHash || completedTransaction.id,
        amount: sanitizedAmount,
        token: {
          symbol: "USDC",
          name: "USD Coin",
          imageUrl: "/tokens/usdc.png",
        },
        timestamp: Date.now(),
        explorerUrl: completedTransaction.explorerUrl,
        bridgeData: {
          ...completedTransaction,
          transactionId: transactionId,
          srcTxHash: completedTransaction.srcTxHash,
          destTxHash: completedTransaction.destTxHash,
          chain: completedTransaction.chain,
        },
      });
    } catch (error: any) {
      console.error("💥 Error processing CCTP payment:", error);

      // Provide user-friendly error messages
      let userMessage = "An error occurred during payment processing.";

      if (error.message?.includes("User rejected")) {
        userMessage = "Transaction was cancelled.";
      } else if (
        error.message?.includes("insufficient funds") ||
        error.message?.includes("Insufficient")
      ) {
        userMessage = "Insufficient funds for this transaction.";
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("timeout")
      ) {
        userMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message?.includes("attestation")) {
        userMessage =
          "Transaction submitted but attestation is taking longer than expected (15-20 minutes is normal). You can safely close this window - the transaction will continue processing.";
      }

      // Show error in UI (you might want to add an error state)
      alert(userMessage);

      setCurrentStep(0);
      setIsConfirmingInWallet(false);
    } finally {
      setIsPaying(false);
    }
  };

  const needsApproval =
    BigInt(allowance) < parseUnits(sanitizedAmount.toString(), 6);
  const hasInsufficientBalance =
    parseUnits(sanitizedAmount?.toString?.() ?? "0", 6) >
    BigInt((usdcBalance as any) ?? 0);

  // Copy tracking link to clipboard
  const handleCopyTrackingLink = async () => {
    if (isCopied) return;

    // Build tracking URL with transaction ID
    const url = new URL(window.location.href);
    if (trackingTransactionId) {
      url.searchParams.set("cctpTransactionId", trackingTransactionId);
    }
    const trackingUrl = url.toString();

    try {
      await navigator.clipboard.writeText(trackingUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Error handled silently
    }
  };

  // Handle closing the processing view and returning to main view
  const handleCloseAndTrackLater = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("cctpTransactionId");
    window.history.replaceState({}, "", url);
    setIsPaying(false);
    setCurrentStep(0);
    // The CCTPTransactionTracker component will automatically update via localStorage
  };

  if (isPaying) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ ...getTransitionConfig("SPRING_BOUNCE_ONE") }}
      >
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-8 relative">
              {/* USDC Logo */}
              <motion.img
                src="/assets/tokens/usdc.png"
                alt="USDC"
                className="w-12 h-12"
                initial={{ scale: 0, x: 0 }}
                animate={{
                  scale: [0, 1.2, 1, 1.1, 1],
                  x: [-20, 0],
                }}
                transition={{
                  duration: 2,
                  ease: "easeOut",
                }}
              />

              {/* Connecting Dots Animation */}
              <div className="flex space-x-1">
                <motion.div
                  className="h-2 w-2 rounded-full bg-blue-500"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 0,
                  }}
                />
                <motion.div
                  className="h-2 w-2 rounded-full bg-blue-500"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 0.5,
                  }}
                />
                <motion.div
                  className="h-2 w-2 rounded-full bg-blue-500"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 1,
                  }}
                />
              </div>

              {/* Chain Logo */}
              <motion.img
                src={`/assets/chains/${getChainIconName(selectedChain)}.svg`}
                alt={getChainDisplayName(selectedChain)}
                className="w-12 h-12"
                initial={{ scale: 0, x: 0 }}
                animate={{
                  scale: [0, 1.2, 1, 1.1, 1],
                  x: [20, 0],
                }}
                transition={{
                  duration: 2,
                  ease: "easeOut",
                }}
              />
            </div>

            <h3 className="text-2xl font-extrabold text-gray-900">
              Sending {amount} USDC
            </h3>
            <p className="text-gray-600 font-medium">
              Bridging to {getChainDisplayName(selectedChain)} ✨
            </p>
          </div>

          <div className="space-y-2 py-2">
            <LoadingStep
              isActive={currentStep === 1}
              isCompleted={currentStep > 1}
              title="Deposit & Burn USDC"
              description="Converting your USDC for cross-chain transfer"
            />
            <LoadingStep
              isActive={currentStep === 2}
              isCompleted={currentStep > 2}
              title="Awaiting Attestation"
              description="Circle is verifying your transaction"
            />
            <LoadingStep
              isActive={currentStep === 3}
              isCompleted={currentStep > 3}
              title={`Completing on ${getChainDisplayName(selectedChain)}`}
              description={`Finalizing USDC delivery to ${getChainDisplayName(
                selectedChain
              )}`}
              isLast
            />
          </div>

          <div className="space-y-3">
            <p className="text-center text-xs text-gray-500">
              Powered by{" "}
              <a
                href="https://www.circle.com/cross-chain-transfer-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium transition-colors"
              >
                Circle&apos;s CCTP
                <ArrowUpRightIcon className="w-3.5 h-3.5 inline-block" />
              </a>
            </p>

            {/* Duration and info in flat style */}
            <div className="bg-gray-100 rounded-2xl p-4 space-y-3">
              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  ⏳ Processing Time: 15-20 minutes
                </p>
                <p className="text-xs text-gray-600">
                  Cross-chain transfers require multiple blockchain
                  confirmations and attestations.
                </p>
              </div>

              <div className="border-t border-gray-200" />

              {/* Show different messages based on step */}
              {currentStep === 1 ? (
                // Step 1: During deposit - don't close
                <div>
                  <p className="font-semibold text-gray-900 mb-2">
                    ⚠️ Please do not close this window yet
                  </p>
                  <p className="text-xs text-gray-600">
                    Your transaction is being deposited on the blockchain. This
                    should complete in a few seconds.
                  </p>
                </div>
              ) : (
                // Step 2+: After backend submission - safe to close
                <div>
                  <p className="font-semibold text-gray-900 mb-2">
                    ✨ You can safely close this window
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    Your transaction is being processed securely in the
                    background. To track your transaction later, copy this link:
                  </p>

                  {/* Copy tracking link button */}
                  <button
                    onClick={handleCopyTrackingLink}
                    disabled={isCopied}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white rounded-xl hover:bg-gray-50 transition-colors text-xs font-medium"
                  >
                    <span className="truncate text-left flex-1 pr-2 text-gray-700">
                      {(() => {
                        const url = new URL(window.location.href);
                        if (trackingTransactionId) {
                          url.searchParams.set(
                            "cctpTransactionId",
                            trackingTransactionId
                          );
                        }
                        return url.toString();
                      })()}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isCopied ? "copied" : "copy"}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          rotate: isCopied ? [0, 10, -5, 0] : 0,
                        }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{
                          duration: 0.15,
                          ease: [0.23, 1.2, 0.32, 1],
                        }}
                        className="flex-shrink-0"
                      >
                        {isCopied ? (
                          <div className="text-green-600 flex items-center gap-1">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className="text-xs font-semibold">
                              Copied!
                            </span>
                          </div>
                        ) : (
                          <CopyIcon className="w-4 h-4 text-gray-600" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </button>
                </div>
              )}
            </div>

            {/* Close and track later button - only show after step 1 */}
            {currentStep > 1 && (
              <div className="mt-4 pb-4">
                <MainButton
                  onClick={handleCloseAndTrackLater}
                  className="w-full"
                  color="gray"
                  variant="light"
                >
                  Close & Track Later
                </MainButton>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  let actionButtonContent = "Pay";
  if (hasInsufficientBalance) {
    actionButtonContent = "Insufficient USDC balance";
  } else if (needsApproval) {
    actionButtonContent = isApproving
      ? "Waiting for approval..."
      : "🔓 Approve USDC";
  } else if (isConfirmingInWallet) {
    actionButtonContent = "Confirm in wallet...";
  } else if (isPaying) {
    actionButtonContent = "✨ Processing...";
  } else if (stealthData?.linkData?.type === "DOWNLOAD") {
    actionButtonContent = "🎁 Pay & Download";
  }

  return (
    <div className="bg-white rounded-[1.6rem] p-1">
      <div>
        <div className="mb-6 flex items-center">
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete("cctpTransactionId");
              window.history.replaceState({}, "", url);
              setIsUsdcMode(false);
            }}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 group"
          >
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            <span>Back</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ ...getTransitionConfig("SPRING_BOUNCE_ONE") }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/tokens/usdc.png"
                alt="USDC"
                width={32}
                height={32}
                className="w-8 h-8"
                priority
              />
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  Pay with USDC
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">
                    Cross-chain
                  </span>
                </h3>
                <p className="text-sm text-gray-600">
                  Send USDC from any major EVM chain
                </p>
                <p className="text-sm text-gray-500 pt-1">
                  Funds will be delivered on the{" "}
                  <span className="font-semibold text-gray-700">
                    {getChainDisplayName(selectedChain)}
                  </span>{" "}
                  network.
                </p>
              </div>
            </div>
            <button
              className="group p-2 hover:bg-gray-50 rounded-xl transition-colors hidden"
              onClick={() => {
                /* Add info modal/tooltip here */
              }}
            >
              <InfoIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>

          <div
            className={
              isConnected
                ? "mb-6 flex justify-center"
                : "py-16 flex justify-center"
            }
          >
            <ConnectButton
              label="Connect EVM Wallet to continue"
              chainStatus={"icon"}
            />
          </div>

          {isConnected && (
            <>
              <div className="relative mb-2">
                {isFixedPriceUsdc() ? (
                  <StaticTokenInput
                    amount={amount}
                    token={{
                      name: "USD Coin",
                      symbol: "USDC",
                      decimals: 6,
                      imageUrl: "/assets/tokens/usdc.png",
                    }}
                    balance={parseFloat(formattedUsdcBalance)}
                    isLoadingBalance={isLoadingUsdcBalance}
                  />
                ) : (
                  <TokenInput
                    mode="predefined"
                    tokens={usdcPredefinedToken}
                    value={amount}
                    onChange={handleTokenInputChange}
                    disabled={isFixedPriceUsdc()}
                    balance={parseFloat(formattedUsdcBalance)}
                    isShowMax={!isFixedPriceUsdc()}
                  />
                )}
              </div>

              {/* <div className="flex justify-between items-center text-sm px-1 mb-6">
                <span className="text-gray-600">Balance</span>
                <span className="text-gray-900">
                  {isLoadingUsdcBalance
                    ? "Loading..."
                    : formatUiNumber(formattedUsdcBalance, "USDC")}
                </span>
              </div> */}

              {/* Payment Note */}
              <div className="relative mb-4">
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

              {/* Collect Info Form */}
              {collectInfoValidation.required && (
                <div className="mb-4">
                  <CollectInfoForm
                    formData={collectInfoData}
                    onFormChange={handleCollectInfoChange}
                    errors={collectInfoErrors}
                  />
                </div>
              )}

              <div className="mb-6 mt-4">
                <MainButton
                  onClick={
                    hasInsufficientBalance
                      ? undefined
                      : needsApproval
                      ? handleApproveUsdc
                      : handlePayEvmUSDC
                  }
                  disabled={
                    hasInsufficientBalance ||
                    isApproving ||
                    isPaying ||
                    !amount ||
                    !tokenMessengerInfo ||
                    isConfirmingInWallet
                  }
                  isLoading={isApproving || isPaying || isConfirmingInWallet}
                  customLoading={
                    isApproving || isConfirmingInWallet ? (
                      <>{actionButtonContent}</>
                    ) : undefined
                  }
                  className="w-full tracking-tight font-bold px-8 py-2 text-lg transition-colors shadow-sm"
                  color="blue"
                >
                  {actionButtonContent}
                </MainButton>
              </div>
            </>
          )}

          <p className="text-center text-xs text-gray-500">
            Powered by{" "}
            <a
              href="https://www.circle.com/cross-chain-transfer-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium transition-colors"
            >
              USDC&apos;s CCTP
              <ArrowUpRightIcon className="w-3.5 h-3.5 inline-block" />
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
