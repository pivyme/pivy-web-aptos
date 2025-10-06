"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircleIcon, Loader2Icon, XIcon } from "lucide-react";
import axios from "axios";
import { formatUnits } from "viem";
import { getChainDisplayName } from "@/config/chains";
import Spinner from "@/components/ui/spinner";

// LocalStorage key for CCTP transactions
const CCTP_TRANSACTIONS_KEY = "pivy_cctp_transactions";

// Types for CCTP transaction tracking
interface CCTPTransactionData {
  id: string;
  amount: string;
  chain: string;
  linkId: string;
  username?: string;
  tag?: string;
  timestamp: number;
  status: "pending" | "completed" | "failed";
}

// LocalStorage utilities
const getCCTPTransactions = (): CCTPTransactionData[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CCTP_TRANSACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCCTPTransaction = (transaction: CCTPTransactionData) => {
  if (typeof window === "undefined") return;
  try {
    const transactions = getCCTPTransactions();
    const filtered = transactions.filter((t) => t.id !== transaction.id);
    localStorage.setItem(
      CCTP_TRANSACTIONS_KEY,
      JSON.stringify([transaction, ...filtered])
    );
  } catch (error) {
    console.error("Failed to save CCTP transaction:", error);
  }
};

const removeCCTPTransaction = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const transactions = getCCTPTransactions();
    const filtered = transactions.filter((t) => t.id !== id);
    localStorage.setItem(CCTP_TRANSACTIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove CCTP transaction:", error);
  }
};

export default function CCTPTransactionTracker() {
  const [pendingTransactions, setPendingTransactions] = useState<
    CCTPTransactionData[]
  >([]);
  const [checkingTransactions, setCheckingTransactions] = useState<Set<string>>(
    new Set()
  );

  // Load pending transactions from localStorage on mount
  useEffect(() => {
    const transactions = getCCTPTransactions();
    setPendingTransactions(transactions);

    // Auto-check pending transactions on mount - but throttle to avoid spam
    // Only check the first pending transaction, user can manually refresh others
    const firstPending = transactions.find((t) => t.status === "pending");
    if (firstPending) {
      checkTransactionStatus(firstPending.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for localStorage changes to update in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      const transactions = getCCTPTransactions();
      setPendingTransactions(transactions);
    };

    // Poll localStorage every 2 seconds to detect changes
    const interval = setInterval(handleStorageChange, 2000);

    return () => clearInterval(interval);
  }, []);

  // Check transaction status from backend
  const checkTransactionStatus = async (transactionId: string) => {
    try {
      setCheckingTransactions((prev) => new Set(prev).add(transactionId));

      // Get existing transaction to preserve linkId, username, and tag
      const existingTransaction = pendingTransactions.find(
        (t) => t.id === transactionId
      );

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/cctp/cctp-status/${transactionId}`,
        { timeout: 10000 }
      );

      const { success, transaction } = response.data;

      if (success && transaction) {
        // Extract link info from response
        const linkId = transaction.link?.id || existingTransaction?.linkId || "";
        const username = transaction.link?.user?.username || existingTransaction?.username || "";
        const tag = transaction.link?.tag !== undefined ? transaction.link.tag : (existingTransaction?.tag || "");

        const transactionData: CCTPTransactionData = {
          id: transactionId,
          amount: transaction.amount
            ? formatUnits(BigInt(transaction.amount), 6)
            : "0",
          chain: transaction.chain,
          linkId: linkId,
          username: username,
          tag: tag,
          timestamp: Date.now(),
          status: transaction.status === "COMPLETED" 
            ? "completed" 
            : transaction.status === "FAILED" 
            ? "failed" 
            : "pending",
        };

        // Update localStorage
        saveCCTPTransaction(transactionData);
        
        // Refresh list
        setPendingTransactions(getCCTPTransactions());
      }
    } catch (error) {
      console.error("Error checking transaction status:", error);
    } finally {
      setCheckingTransactions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  // Handle clicking on a transaction pill
  const handleTransactionPillClick = (transaction: CCTPTransactionData) => {
    if (!transaction.username) return;

    // Build the redirect URL
    const baseUrl = `${window.location.origin}/${transaction.username}`;
    const fullUrl = transaction.tag ? `${baseUrl}/${transaction.tag}` : baseUrl;
    const url = new URL(fullUrl);
    url.searchParams.set("cctpTransactionId", transaction.id);

    // Redirect to the link page with the transaction ID
    window.location.href = url.toString();
  };

  // Handle removing a completed/failed transaction
  const handleRemoveTransaction = (
    e: React.MouseEvent,
    transactionId: string
  ) => {
    e.stopPropagation();
    removeCCTPTransaction(transactionId);
    setPendingTransactions(getCCTPTransactions());
  };

  if (pendingTransactions.length === 0) {
    return null;
  }

  const processingCount = pendingTransactions.filter(
    (t) => t.status === "pending"
  ).length;

  return (
    <div className="bg-gray-100 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-900">
          On-going USDC transactions
        </div>
        {processingCount > 0 && (
          <div className="text-xs text-gray-500">
            {processingCount} processing
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-hide">
          {pendingTransactions.map((transaction) => {
            const linkDisplay = transaction.username
              ? transaction.tag
                ? `@${transaction.username}/${transaction.tag}`
                : `@${transaction.username}`
              : "Loading...";

            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${
                  checkingTransactions.has(transaction.id) ? "opacity-60" : ""
                }`}
                onClick={() => {
                  if (transaction.username) {
                    handleTransactionPillClick(transaction);
                  }
                }}
              >
                <div className="flex-shrink-0">
                  {checkingTransactions.has(transaction.id) ? (
                    <Spinner />
                  ) : transaction.status === "completed" ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    </div>
                  ) : transaction.status === "failed" ? (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <XIcon className="w-5 h-5 text-red-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Loader2Icon className="w-5 h-5 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {transaction.amount} USDC
                  </div>
                  <div className="text-xs text-gray-500">
                    {transaction.status === "pending" ? (
                      <>
                        Sending to{" "}
                        <span className="font-semibold text-gray-700">
                          {linkDisplay}
                        </span>
                        {" • "}
                        {getChainDisplayName(transaction.chain)}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-gray-700">
                          {linkDisplay}
                        </span>
                        {" • "}
                        {transaction.status === "completed"
                          ? "Completed"
                          : "Failed"}
                        {" • "}
                        {getChainDisplayName(transaction.chain)}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {transaction.status !== "pending" && (
                    <button
                      onClick={(e) => handleRemoveTransaction(e, transaction.id)}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <XIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}

// Export utility functions for use in other components
export {
  getCCTPTransactions,
  saveCCTPTransaction,
  removeCCTPTransaction,
  type CCTPTransactionData,
};
