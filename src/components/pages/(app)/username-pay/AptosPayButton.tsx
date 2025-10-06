import React, { useState, useMemo } from "react";
import bs58 from "bs58";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { CHAINS, isTestnet } from "@/config/chains";
import PivyStealthAptos from "@/lib/@pivy/core/pivy-stealth-aptos";
import { usePay } from "@/providers/PayProvider";
import MainButton from "@/components/common/MainButton";

interface AptosPayButtonProps {
  selectedToken: any;
  amount: string;
  stealthData: any;
  onSuccess?: (txHash: string) => void;
  onError?: (error: any) => void;
  className?: string;
  onValidate?: () => boolean;
}

export default function AptosPayButton({
  selectedToken,
  amount,
  stealthData,
  onSuccess,
  onError,
  className,
  onValidate,
}: AptosPayButtonProps) {
  const { submitPaymentInfoAndGetId, currentColor } = usePay();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aptosWallet = useAptosWallet();

  // Memoize the disabled state to prevent infinite re-renders
  const isDisabled = useMemo(() => {
    return (
      isPaying ||
      !selectedToken ||
      !amount ||
      parseFloat(amount) <= 0 ||
      !aptosWallet.connected ||
      !aptosWallet.account
    );
  }, [isPaying, selectedToken, amount, aptosWallet.connected, aptosWallet.account]);

  async function handlePay() {
    try {
      if (onValidate && !onValidate()) {
        return;
      }

      // Prevent multiple simultaneous calls
      if (isPaying) return;

      setIsPaying(true);
      setError(null); // Clear any previous errors

      // Check wallet connection
      if (!aptosWallet.connected || !aptosWallet.account) {
        throw new Error("Wallet not connected");
      }

      // Sanitize amount by removing commas (e.g., "1,000" -> "1000")
      const sanitizedAmount = amount.replace(/,/g, "");

      // Validate inputs
      if (!selectedToken || !sanitizedAmount || parseFloat(sanitizedAmount) <= 0) {
        throw new Error("Invalid payment parameters");
      }

      // Basic stealth data validation
      if (!stealthData) {
        console.error("Stealth data is required");
        throw new Error("Payment link data not loaded");
      }

      // Get stealth data for APTOS chain
      const getAptosChainData = () => {
        const chains = stealthData.chains || {};
        // Try APTOS_TESTNET first (testnet), then APTOS or APTOS_MAINNET (mainnet)
        if (isTestnet) {
          return chains.APTOS_TESTNET || chains.APTOS || null;
        }
        return chains.APTOS_MAINNET || chains.APTOS || null;
      };

      const aptosChainData = getAptosChainData();
      if (!aptosChainData) {
        console.error("Missing APTOS chain configuration in stealth data");
        throw new Error("APTOS payment not configured for this link");
      }
      if (!aptosChainData.metaSpendPub || !aptosChainData.metaViewPub) {
        console.error("Missing metaSpendPub or metaViewPub for APTOS chain");
        throw new Error("Invalid payment configuration");
      }

      // Initialize Aptos client
      const network = isTestnet ? Network.TESTNET : Network.MAINNET;
      const config = new AptosConfig({ network });
      const aptos = new Aptos(config);

      // Convert amount to smallest unit based on decimals
      const exactAmount = BigInt(
        Math.floor(parseFloat(sanitizedAmount) * 10 ** selectedToken.decimals)
      );

      // Validate the amount
      const MAX_U64 = BigInt("18446744073709551615"); // 2^64 - 1
      if (exactAmount > MAX_U64) {
        throw new Error("Amount too large");
      }
      if (exactAmount <= 0n) {
        throw new Error("Amount must be greater than 0");
      }

      // Initialize PivyStealthAptos
      const pivy = new PivyStealthAptos();

      // Generate ephemeral keypair using Secp256k1
      const ephemeral = pivy.generateEphemeralKey();
      const ephPubB58 = ephemeral.publicKeyB58;

      console.log("Generating stealth address...");
      // Derive stealth address
      const stealthAddress = await pivy.deriveStealthPub(
        aptosChainData.metaSpendPub,
        aptosChainData.metaViewPub,
        ephemeral.privateKey
      );

      console.log("Stealth address:", stealthAddress.stealthAptosAddress);

      // Encrypt ephemeral private key
      const encryptedMemo = await pivy.encryptEphemeralPrivKey(
        ephemeral.privateKey,
        aptosChainData.metaViewPub
      );

      // Submit Payment info to get paymentInfoId
      const paymentInfoId = await submitPaymentInfoAndGetId();

      // Determine label (link ID)
      const label = stealthData.linkData.id;
      console.log("LABEL:", label);

      // Encrypt label using the same method as note
      const encryptedLabel = await pivy.encryptNote(
        label,
        ephemeral.privateKey,
        aptosChainData.metaViewPub
      );

      // Encrypt note if provided
      let encryptedNote = new Uint8Array(0);
      if (paymentInfoId) {
        const noteResult = await pivy.encryptNote(
          paymentInfoId,
          ephemeral.privateKey,
          aptosChainData.metaViewPub
        );
        encryptedNote = new Uint8Array(noteResult);
      }

      // Prepare data for transaction
      const encryptedLabelBytes = new Uint8Array(encryptedLabel);
      const ephPubBytes = bs58.decode(ephPubB58);
      const payloadBytes = bs58.decode(encryptedMemo); // Decode Base58 to bytes

      // Validate payload sizes against Move function limits
      if (encryptedLabelBytes.length > 256) {
        throw new Error(
          `Encrypted label too long: ${encryptedLabelBytes.length} bytes (max 256)`
        );
      }
      if (payloadBytes.length > 121) {
        throw new Error(
          `Payload too long: ${payloadBytes.length} bytes (max 121)`
        );
      }
      if (encryptedNote.length > 256) {
        throw new Error(
          `Note too long: ${encryptedNote.length} bytes (max 256)`
        );
      }

      // Configure stealth program
      const chain = isTestnet ? CHAINS.APTOS_TESTNET : CHAINS.APTOS_MAINNET;
      const PACKAGE_ID = chain.stealthProgramId;
      const MODULE_NAME = "pivy_stealth";

      if (!PACKAGE_ID) {
        throw new Error("Stealth program not configured for this network");
      }

      // Determine if this is a FungibleAsset (USDC-like) or CoinType (APT)
      const isFungibleAsset = !selectedToken.isNative && 
        selectedToken.address.startsWith("0x") && 
        selectedToken.address.length === 66; // FA metadata addresses are 32-byte addresses

      console.log("Token type:", isFungibleAsset ? "FungibleAsset" : "CoinType");
      console.log("Signing and submitting transaction...");

      let response;
      if (isFungibleAsset) {
        // For FungibleAsset (like USDC)
        response = await aptosWallet.signAndSubmitTransaction({
          sender: aptosWallet.account.address,
          data: {
            function: `${PACKAGE_ID}::${MODULE_NAME}::pay`,
            functionArguments: [
              stealthAddress.stealthAptosAddress, // stealth_owner
              selectedToken.address, // fa_metadata
              exactAmount.toString(), // amount
              Array.from(encryptedLabelBytes), // label
              Array.from(ephPubBytes), // eph_pubkey
              Array.from(payloadBytes), // payload
              Array.from(encryptedNote), // note
            ],
          },
        });
      } else {
        // For CoinType (like APT)
        const coinType = selectedToken.isNative
          ? "0x1::aptos_coin::AptosCoin"
          : selectedToken.address;

        response = await aptosWallet.signAndSubmitTransaction({
          sender: aptosWallet.account.address,
          data: {
            function: `${PACKAGE_ID}::${MODULE_NAME}::pay_coin`,
            typeArguments: [coinType],
            functionArguments: [
              stealthAddress.stealthAptosAddress, // stealth_owner
              exactAmount.toString(), // amount
              Array.from(encryptedLabelBytes), // label
              Array.from(ephPubBytes), // eph_pubkey
              Array.from(payloadBytes), // payload
              Array.from(encryptedNote), // note
            ],
          },
        });
      }

      const txHash = response.hash;
      console.log("Transaction submitted:", txHash);

      // Wait for confirmation
      await aptos.waitForTransaction({
        transactionHash: txHash,
      });

      console.log("Transaction confirmed!");
      onSuccess?.(txHash);
    } catch (error: any) {
      console.error("Payment failed:", error);
      const errorMessage = 
        error.message || 
        error.toString() || 
        "An unexpected error occurred during payment.";
      setError(errorMessage);
      onError?.(error);
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <>
      <MainButton
        className={`w-full font-bold ${className || ""}`}
        onClick={handlePay}
        isLoading={isPaying}
        disabled={isDisabled}
        color={currentColor as any}
      >
        {isPaying
          ? "Processing..."
          : stealthData?.linkData?.type === "DOWNLOAD"
          ? "Pay & Download"
          : "Pay"}
      </MainButton>
      {error && (
        <p className="text-red-500 text-sm text-center mt-2">{error}</p>
      )}
    </>
  );
}

