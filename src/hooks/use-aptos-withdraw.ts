import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useMetaKeys } from "@/providers/MetaKeysProvider";
import { useUser } from "@/providers/UserProvider";
import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Secp256k1PrivateKey,
  Deserializer,
  SimpleTransaction,
  AccountAuthenticator,
} from "@aptos-labs/ts-sdk";
import PivyStealthAptos from "@/lib/@pivy/core/pivy-stealth-aptos";
import { sleep } from "@/utils/process";
import {
  type UserToken as TokenBalance,
  type StealthBalance,
  type ChainId,
} from "@/lib/api/user";
import {
  txService,
  type PrepareAptosWithdrawalRequest,
  type PrepareAptosStealthPaymentRequest,
} from "@/lib/api/tx";
import { addressService, type SearchResult } from "@/lib/api/address";
import { isTestnet, FEE_CONFIGS, getFeeMultiplier } from "@/config/chains";
import { type TokenInputOutput } from "@/components/pages/(app)/username-pay/TokenInput";
import { useDebounce } from "@uidotdev/usehooks";
import { Sound, useSound } from "@/providers/SoundProvider";

interface FeeDetails {
  fee: number;
  amountToReceive: number;
  totalDebit: number;
  mode: "EXACT" | "DEDUCTED";
  feeBigInt: bigint;
  amountToReceiveBigInt: bigint;
  totalDebitBigInt: bigint;
}

interface UseWithdrawArgs {
  token: TokenBalance | null | undefined;
  initialSearchQuery?: string | null;
}

export function useAptosWithdraw({
  token,
  initialSearchQuery,
}: UseWithdrawArgs) {
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
  const getChainKey = (chain?: string) => {
    // If no chain or it's Aptos-related, determine based on environment
    if (
      !chain ||
      chain === "APTOS_MAINNET" ||
      chain === "APTOS_TESTNET" ||
      chain === "APTOS" ||
      chain === "MAINNET" ||
      chain === "DEVNET"
    ) {
      return isTestnet ? "APTOS_TESTNET" : "APTOS_MAINNET";
    }
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
    if (!debouncedSearchQuery.trim() || !token) {
      setSearchResults([]);
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
          getChainKey(token.chain)
        );
        const results = response.data?.results || [];
        setSearchResults(results);

        // Auto-select if it's a Pivy link and we found exactly one result
        const pivyLinkRegex =
          /^https?:\/\/pivy\.me\/[a-zA-Z0-9_.-]+(?:\/.*)?$/i;
        if (pivyLinkRegex.test(debouncedSearchQuery) && results.length === 1) {
          const result = results[0];
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
    const enteredAmountBigInt = BigInt(
      Math.round(withdrawAmount.amount * 10 ** decimals)
    );

    const feeConfig = FEE_CONFIGS.APTOS;
    if (!feeConfig) {
      setFeeDetails(null);
      return;
    }

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

    // EXACT mode calculation
    let totalDebitExactBigInt =
      (enteredAmountBigInt * feeDivisor) / (feeDivisor - 1n);
    if ((enteredAmountBigInt * feeDivisor) % (feeDivisor - 1n) !== 0n) {
      totalDebitExactBigInt += 1n;
    }

    if (totalDebitExactBigInt <= totalBalanceBigInt) {
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

  const handleWithdrawAmountChange = useCallback(
    (output: TokenInputOutput | null) => {
      setWithdrawAmount(output);
    },
    [setWithdrawAmount]
  );

  const predefinedTokenForInput = useMemo(() => {
    if (!token) return [];
    return [
      {
        name: token.name,
        symbol: token.symbol,
        address: token.mintAddress,
        decimals: token.decimals,
        image: token.imageUrl || undefined,
        isNative: token.isNative,
        priceUsd: token.priceUsd,
      },
    ];
  }, [token]);

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
      !metaKeys.APTOS ||
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
    } else if (selectedResult.type === "ans") {
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
      // Handle Pivy username withdrawal
      if (
        selectedResult.type === "pivy" ||
        selectedResult.type === "username"
      ) {
        console.log("--- Initiating PIVY Username Withdrawal (Aptos) ---");
        const recipientUsername = selectedResult.username;

        // Get recipient's meta keys
        const addressInfo = await addressService.getAddressByUserTag(
          recipientUsername
        );
        if (addressInfo.error || !addressInfo.data) {
          throw new Error(
            `Failed to get user data for @${recipientUsername}: ${addressInfo.error}`
          );
        }

        const network = isTestnet ? Network.TESTNET : Network.MAINNET;
        const config = new AptosConfig({ network });
        const aptos = new Aptos(config);

        const balances = token.balances
          .sort((a: StealthBalance, b: StealthBalance) => b.amount - a.amount)
          .filter((b: StealthBalance) => b.amount > 0);

        // Pick stealth addresses to cover withdrawal
        const finalPicks: any[] = [];
        let remainingToPick = amountToWithdraw;

        for (const balance of balances) {
          if (remainingToPick <= 0n) break;

          const balanceAmount = BigInt(
            Math.round(balance.amount * 10 ** token.decimals)
          );
          const pickAmount =
            remainingToPick < balanceAmount ? remainingToPick : balanceAmount;

          if (!metaKeys.APTOS) {
            throw new Error("APTOS meta keys not found");
          }

          const kp = await PivyStealthAptos.deriveStealthKeypair(
            metaKeys.APTOS.metaSpendPriv,
            metaKeys.APTOS.metaViewPriv,
            balance.ephemeralPubkey
          );

          const stealthAccount = Account.fromPrivateKey({
            privateKey: new Secp256k1PrivateKey(kp.stealthPrivBytes),
          });

          // Verify the derived address matches the balance address
          const derivedAddress = stealthAccount.accountAddress.toStringLong();
          if (derivedAddress !== balance.address) {
            console.error(
              `Address mismatch! Derived: ${derivedAddress}, Expected: ${balance.address}`
            );
            throw new Error(
              `Stealth address derivation mismatch: derived ${derivedAddress} but expected ${balance.address}`
            );
          }

          finalPicks.push({
            address: balance.address,
            ephemeralPubkey: balance.ephemeralPubkey,
            amount: Number(pickAmount) / 10 ** token.decimals,
            amountBigInt: pickAmount,
            stealthAccount,
          });

          remainingToPick -= pickAmount;
        }

        if (finalPicks.length === 0 || remainingToPick > 0n) {
          throw new Error("Insufficient balance");
        }

        const payingAddress = finalPicks[0];

        // Consolidate if multiple addresses
        if (finalPicks.length > 1) {
          console.log("Consolidating funds...");
        }

        // Perform stealth payment
        const stealthPaymentPayload: PrepareAptosStealthPaymentRequest = {
          chain: getChainKey(token.chain) as ChainId,
          fromAddress: payingAddress.address,
          recipientUsername,
          token: token.mintAddress,
          amount: feeDetails.amountToReceiveBigInt.toString(),
        };

        if (note && note.trim().length > 0) {
          stealthPaymentPayload.paymentData = [{ type: "note", value: note }];
        }

        const prepareStealthResponse =
          await txService.prepareAptosStealthPayment(
            accessToken,
            stealthPaymentPayload
          );

        if (prepareStealthResponse.error || !prepareStealthResponse.data) {
          throw new Error(
            prepareStealthResponse.error || "Failed to prepare stealth payment."
          );
        }

        const { outcome } = prepareStealthResponse.data;
        if (!outcome.ok || !outcome.result) {
          throw new Error("Backend failed to prepare transaction.");
        }

        const { transactionBytes, feePayerAuthenticator } =
          outcome.result as any;

        // Deserialize the transaction
        const txBytes = new Uint8Array(Buffer.from(transactionBytes, "base64"));
        const txDeserializer = new Deserializer(txBytes);
        const transaction = SimpleTransaction.deserialize(txDeserializer);

        // Deserialize the fee payer authenticator
        const feePayerAuthBytes = new Uint8Array(
          Buffer.from(feePayerAuthenticator, "base64")
        );
        const feePayerDeserializer = new Deserializer(feePayerAuthBytes);
        const feePayerAuth =
          AccountAuthenticator.deserialize(feePayerDeserializer);

        // Sign with stealth account
        const senderAuth = await aptos.transaction.sign({
          signer: payingAddress.stealthAccount,
          transaction,
        });

        // Submit with both signatures
        const committedTx = await aptos.transaction.submit.simple({
          transaction,
          senderAuthenticator: senderAuth,
          feePayerAuthenticator: feePayerAuth,
        });

        await aptos.waitForTransaction({ transactionHash: committedTx.hash });

        // Get the confirmed transaction to access version
        const confirmedTx = (await aptos.getTransactionByHash({
          transactionHash: committedTx.hash,
        })) as any;

        setLastTxSignature(confirmedTx.version.toString());
        await txService.saveAptosWithdrawalGroup(
          accessToken,
          confirmedTx.version.toString(),
          getChainKey(token.chain) as ChainId
        );
        await sleep(2000);
        await refreshStealthBalances();
        await refreshActivities();
        playSound(Sound.SUCCESS);
        setShowSuccessDialog(true);
        return;
      }

      // Standard withdrawal to address/ANS
      const network = isTestnet ? Network.TESTNET : Network.MAINNET;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      const balances = token.balances
        .sort((a: StealthBalance, b: StealthBalance) => b.amount - a.amount)
        .filter((b: StealthBalance) => b.amount > 0);

      // Pick stealth addresses
      const finalPicks: any[] = [];
      let remainingToPick = amountToWithdraw;

      for (const balance of balances) {
        if (remainingToPick <= 0n) break;

        const balanceAmount = BigInt(
          Math.round(balance.amount * 10 ** token.decimals)
        );
        const pickAmount =
          remainingToPick < balanceAmount ? remainingToPick : balanceAmount;

        if (!metaKeys.APTOS) {
          throw new Error("APTOS meta keys not found");
        }

        const kp = await PivyStealthAptos.deriveStealthKeypair(
          metaKeys.APTOS.metaSpendPriv,
          metaKeys.APTOS.metaViewPriv,
          balance.ephemeralPubkey
        );

        const stealthAccount = Account.fromPrivateKey({
          privateKey: new Secp256k1PrivateKey(kp.stealthPrivBytes),
        });

        // Verify the derived address matches the balance address
        const derivedAddress = stealthAccount.accountAddress.toStringLong();
        if (derivedAddress !== balance.address) {
          console.error(
            `Address mismatch! Derived: ${derivedAddress}, Expected: ${balance.address}`
          );
          throw new Error(
            `Stealth address derivation mismatch: derived ${derivedAddress} but expected ${balance.address}`
          );
        }

        finalPicks.push({
          address: balance.address,
          amount: Number(pickAmount) / 10 ** token.decimals,
          amountBigInt: pickAmount,
          stealthAccount,
        });

        remainingToPick -= pickAmount;
      }

      if (finalPicks.length === 0 || remainingToPick > 0n) {
        throw new Error("Insufficient balance");
      }

      // Prepare withdrawal transactions
      const withdrawalItems = finalPicks.map((p) => ({
        fromStealthAddress: p.address,
        amount: p.amountBigInt.toString(),
      }));

      const preparePayload: PrepareAptosWithdrawalRequest = {
        chain: getChainKey(token.chain) as ChainId,
        recipient: address,
        token: token.mintAddress,
        withdrawals: withdrawalItems,
      };

      const prepareResponse = await txService.prepareAptosWithdrawal(
        accessToken,
        preparePayload
      );

      if (prepareResponse.error || !prepareResponse.data) {
        throw new Error(
          prepareResponse.error || "Failed to prepare withdrawal."
        );
      }

      const successfulTxVersions: string[] = [];
      const outcomes = prepareResponse.data.outcomes;
      setTotalTxCount(outcomes.length);

      // Execute transactions
      for (const outcome of outcomes) {
        if (!outcome.ok || !outcome.result) continue;

        try {
          const { transactionBytes, feePayerAuthenticator } =
            outcome.result as any;
          const pick = finalPicks[outcome.index];

          // Deserialize the transaction
          const txBytes = new Uint8Array(
            Buffer.from(transactionBytes, "base64")
          );
          const txDeserializer = new Deserializer(txBytes);
          const transaction = SimpleTransaction.deserialize(txDeserializer);

          // Deserialize the fee payer authenticator
          const feePayerAuthBytes = new Uint8Array(
            Buffer.from(feePayerAuthenticator, "base64")
          );
          const feePayerDeserializer = new Deserializer(feePayerAuthBytes);
          const feePayerAuth =
            AccountAuthenticator.deserialize(feePayerDeserializer);

          const senderAuth = await aptos.transaction.sign({
            signer: pick.stealthAccount,
            transaction,
          });

          const committedTx = await aptos.transaction.submit.simple({
            transaction,
            senderAuthenticator: senderAuth,
            feePayerAuthenticator: feePayerAuth,
          });

          await aptos.waitForTransaction({ transactionHash: committedTx.hash });

          // Get the confirmed transaction to access version
          const confirmedTx = (await aptos.getTransactionByHash({
            transactionHash: committedTx.hash,
          })) as any;
          successfulTxVersions.push(confirmedTx.version.toString());
          setCurrentTxNumber((prev) => prev + 1);
        } catch (err: any) {
          console.error(`Transaction failed for index ${outcome.index}:`, err);
        }
      }

      if (successfulTxVersions.length > 0) {
        const withdrawalId = successfulTxVersions.join("|");
        setLastTxSignature(withdrawalId);
        await txService.saveAptosWithdrawalGroup(
          accessToken,
          withdrawalId,
          getChainKey(token.chain) as ChainId
        );
        await sleep(2000);
        await refreshStealthBalances();
        await refreshActivities();
        playSound(Sound.SUCCESS);
      } else if (outcomes.length > 0) {
        throw new Error("All withdrawal transactions failed.");
      }

      setShowSuccessDialog(true);
    } catch (err: any) {
      setError(`Transaction failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  const resetState = () => {
    setIsSending(false);
    setError(null);
    setShowSuccessDialog(false);
    setLastTxSignature(null);
    setCurrentTxNumber(0);
    setTotalTxCount(0);
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
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectedResult,
    handleResultSelect,
    handleClearSearch,
    withdrawAmount,
    setWithdrawAmount: handleWithdrawAmountChange,
    feeDetails,
    getChainKey,
    predefinedTokenForInput,
  };
}
