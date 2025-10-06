import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useMetaKeys } from "@/providers/MetaKeysProvider";
import { useUser } from "@/providers/UserProvider";
import { sleep } from "@/utils/process";
import {
  type UserToken as TokenBalance,
  type StealthBalance,
  type ChainId,
} from "@/lib/api/user";
import { txService } from "@/lib/api/tx";
import { addressService, type SearchResult } from "@/lib/api/address";
import {
  isTestnet,
  CHAINS,
  FEE_CONFIGS,
  getFeeMultiplier,
} from "@/config/chains";
import { type TokenInputOutput } from "@/components/pages/(app)/username-pay/TokenInput";
import { useDebounce } from "@uidotdev/usehooks";
import { Sound, useSound } from "@/providers/SoundProvider";

interface FeeDetails {
  fee: number;
  amountToReceive: number;
  totalDebit: number;
  mode: "EXACT" | "DEDUCTED";
  // Add BigInts for precision
  feeBigInt: bigint;
  amountToReceiveBigInt: bigint;
  totalDebitBigInt: bigint;
}

interface UseWithdrawArgs {
  token: TokenBalance | null | undefined;
  initialSearchQuery?: string | null;
}

export function useWithdraw({ token, initialSearchQuery }: UseWithdrawArgs) {
  const { accessToken, me } = useAuth();
  const { playSound } = useSound();
  const { metaKeys } = useMetaKeys();
  const { refreshActivities, refreshStealthBalances } = useUser();

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastTxSignature, setLastTxSignature] = useState<string | null>(null);
  const [currentTxNumber, setCurrentTxNumber] = useState(0);
  const [totalTxCount, setTotalTxCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  );
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Set initial search query when provided
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery.trim()) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Amount and fee state
  const [withdrawAmount, setWithdrawAmount] = useState<TokenInputOutput | null>(
    null
  );
  const [feeDetails, setFeeDetails] = useState<FeeDetails | null>(null);

  // Get the chain key for the current token
  const getChainKey = (chain: string) => {
    return chain;
  };

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      setSearchResults([]);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Search effect
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      // `isSearching` is handled by the `searchQuery` effect
      return;
    }

    const performSearch = async () => {
      if (debouncedSearchQuery.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        const response = await addressService.searchDestination(
          debouncedSearchQuery,
          token!.chain
        );
        const results = response.data?.results || [];
        setSearchResults(results);

        // Auto-select if it's a Pivy link and we found exactly one result
        const pivyLinkRegex =
          /^https?:\/\/pivy\.me\/[a-zA-Z0-9_.-]+(?:\/.*)?$/i;
        if (pivyLinkRegex.test(debouncedSearchQuery) && results.length === 1) {
          const result = results[0];
          // Only auto-select if it's a pivy type result
          if (result.type === "pivy" || result.type === "username") {
            handleResultSelect(result);
          }
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, token]);

  // Fee calculation effect
  useEffect(() => {
    if (!withdrawAmount || !token || withdrawAmount.amount <= 0) {
      setFeeDetails(null);
      return;
    }

    const decimals = token.decimals;
    // Use BigInt for all calculations to avoid floating point errors
    const enteredAmountBigInt = BigInt(
      Math.round(withdrawAmount.amount * 10 ** decimals)
    );

    const chainKey = "APTOS"; // Only Aptos supported for withdrawals
    const feeConfig = FEE_CONFIGS[chainKey as keyof typeof FEE_CONFIGS];

    if (!feeConfig) {
      setFeeDetails(null);
      return;
    }

    // Calculate fee divisor from the centralized config
    const feeDivisor = getFeeMultiplier(feeConfig.WITHDRAWAL_FEE_PERCENTAGE);
    const totalBalanceBigInt = BigInt(Math.round(token.total * 10 ** decimals));

    // Special case: 0% fee (no fee charged)
    if (feeDivisor === 0n) {
      const totalDebitBigInt =
        enteredAmountBigInt <= totalBalanceBigInt
          ? enteredAmountBigInt
          : totalBalanceBigInt;

      setFeeDetails({
        fee: 0,
        amountToReceive: Number(totalDebitBigInt) / 10 ** decimals,
        totalDebit: Number(totalDebitBigInt) / 10 ** decimals,
        mode: "EXACT",
        feeBigInt: 0n,
        amountToReceiveBigInt: totalDebitBigInt,
        totalDebitBigInt: totalDebitBigInt,
      });
      return;
    }

    // EXACT mode calculation: total = sent / (1 - fee) = sent * divisor / (divisor - 1)
    let totalDebitExactBigInt =
      (enteredAmountBigInt * feeDivisor) / (feeDivisor - 1n);
    if ((enteredAmountBigInt * feeDivisor) % (feeDivisor - 1n) !== 0n) {
      totalDebitExactBigInt += 1n; // Round up to cover fee
    }

    if (totalDebitExactBigInt <= totalBalanceBigInt) {
      // "EXACT" mode
      const feeBigInt = totalDebitExactBigInt - enteredAmountBigInt;
      setFeeDetails({
        fee: Number(feeBigInt) / 10 ** decimals,
        amountToReceive: Number(enteredAmountBigInt) / 10 ** decimals,
        totalDebit: Number(totalDebitExactBigInt) / 10 ** decimals,
        mode: "EXACT",
        feeBigInt,
        amountToReceiveBigInt: enteredAmountBigInt,
        totalDebitBigInt: totalDebitExactBigInt,
      });
    } else {
      // "DEDUCTED" mode
      const totalDebitDeductedBigInt =
        totalBalanceBigInt < enteredAmountBigInt
          ? totalBalanceBigInt
          : enteredAmountBigInt;

      const feeBigInt = totalDebitDeductedBigInt / feeDivisor;
      const amountToReceiveBigInt = totalDebitDeductedBigInt - feeBigInt;

      setFeeDetails({
        fee: Number(feeBigInt) / 10 ** decimals,
        amountToReceive: Number(amountToReceiveBigInt) / 10 ** decimals,
        totalDebit: Number(totalDebitDeductedBigInt) / 10 ** decimals,
        mode: "DEDUCTED",
        feeBigInt,
        amountToReceiveBigInt,
        totalDebitBigInt: totalDebitDeductedBigInt,
      });
    }
  }, [withdrawAmount, token]);

  const handleResultSelect = (result: SearchResult) => {
    setSelectedResult(result);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedResult(null);
  };

  const performWithdrawal = async (note?: string) => {
    if (
      !accessToken ||
      !me ||
      !metaKeys ||
      isSending ||
      !feeDetails ||
      !token ||
      !selectedResult
    ) {
      setError("An unexpected error occurred. Please try again.");
      return;
    }

    let address = "";
    if (selectedResult.type === "address") {
      address = selectedResult.address;
    } else if (selectedResult.type === "sns") {
      address = selectedResult.targetAddress;
    } else if (
      selectedResult.type === "pivy" ||
      selectedResult.type === "username"
    ) {
      // Address is not needed here, it's handled in the pivy withdrawal logic
    } else {
      setError("Withdrawing to this destination is not yet supported.");
      return;
    }

    const amountToWithdraw = feeDetails.totalDebitBigInt;

    if (
      amountToWithdraw > BigInt(Math.round(token.total * 10 ** token.decimals))
    ) {
      setError("Amount is greater than balance");
      return;
    }
    if (
      selectedResult.type !== "pivy" &&
      selectedResult.type !== "username" &&
      !address
    ) {
      setError("Please select a valid destination address");
      return;
    }
    if (amountToWithdraw <= 0n) {
      setError("Amount must be greater than 0");
      return;
    }

    setError(null);
    setIsSending(true);

    try {
      if (token.chain === "DEVNET" || token.chain === "MAINNET") {
        await sleep(2000);
        await refreshStealthBalances();
        await refreshActivities();
        setLastTxSignature(
          "aptos_dummy_tx_signature_for_demo_purposes_" + Date.now()
        );
        setShowSuccessDialog(true);
      }
    } catch (err: any) {
      setError(`Transaction failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  const resetState = () => {
    // Reset withdrawal state
    setIsSending(false);
    setError(null);
    setShowSuccessDialog(false);
    setLastTxSignature(null);
    setCurrentTxNumber(0);
    setTotalTxCount(0);
    // Reset search and amount state
    setSearchQuery("");
    setSearchResults([]);
    setSelectedResult(null);
    setWithdrawAmount(null);
    setFeeDetails(null);
  };

  return {
    isSending,
    error,
    showSuccessDialog,
    lastTxSignature,
    currentTxNumber,
    totalTxCount,
    performWithdrawal,
    resetWithdrawState: resetState,
    // Search
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectedResult,
    handleResultSelect,
    handleClearSearch,
    // Amount & Fees
    withdrawAmount,
    setWithdrawAmount,
    feeDetails,
    getChainKey,
  };
}
