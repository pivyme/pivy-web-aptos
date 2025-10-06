"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { isTestnet } from "@/config/chains";

/* --------------------------------- APTOS --------------------------------- */
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { AptosWalletProvider } from "./AptosWalletProvider";

/* ----------------------------------- EVM ---------------------------------- */
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  // MAINNETS
  mainnet,
  base,
  polygon,
  bsc,
  arbitrum,
  avalanche,
  optimism,
  // TESTNETS
  sepolia,
  baseSepolia,
  polygonAmoy,
  bscTestnet,
  arbitrumSepolia,
  avalancheFuji,
  optimismSepolia,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

import axios from "axios";
import { COLOR_PICKS } from "@/config/styling";
import { paymentsService } from "@/lib/api/payments";
import { AddressResponse } from "@/lib/api/address";

const queryClient = new QueryClient();

// Types
interface CollectInfoFormData {
  name: string;
  email: string;
  telegram: string;
}

// Context Types
interface PayContextType {
  // Address data
  addressData: any;
  isInitializing: boolean;
  error: string | null;

  // Chain selection
  selectedChain: string | null;
  availableChains: string[];
  setSelectedChain: (chain: string) => void;

  // Payment modes
  isUsdcMode: boolean;
  setIsUsdcMode: (value: boolean) => void;

  // UI state
  currentColor: string;
  enableColorRotation: boolean;
  setEnableColorRotation: (value: boolean) => void;

  // Wallet
  wallet: {
    connected: boolean;
    connecting: boolean;
    publicKey: string | null;
    disconnect: () => void;
  };
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (value: boolean) => void;
  handleOpenWalletModal: () => void;

  // Payment data
  amount: string;
  setAmount: (value: string) => void;
  paymentNote: string;
  setPaymentNote: (value: string) => void;
  selectedToken: any;
  setSelectedToken: (token: any) => void;
  collectInfoData: CollectInfoFormData;
  setCollectInfoData: (data: CollectInfoFormData) => void;

  // Payment flow
  paymentSuccess: any;
  setPaymentSuccess: (details: any) => void;
  resetForNewPayment: () => void;
  submitPaymentInfoAndGetId: () => Promise<string | undefined>;

  // USDC Payment Processing State (for cross-layout persistence)
  usdcProcessingState: {
    isPaying: boolean;
    setIsPaying: (value: boolean) => void;
    currentStep: number;
    setCurrentStep: (value: number) => void;
    isConfirmingInWallet: boolean;
    setIsConfirmingInWallet: (value: boolean) => void;
    isApproving: boolean;
    setIsApproving: (value: boolean) => void;
    allowance: string;
    setAllowance: (value: string) => void;
    collectInfoErrors: any;
    setCollectInfoErrors: (value: any) => void;
  };
}

const PayContext = createContext<PayContextType | null>(null);

export function usePay() {
  const context = useContext(PayContext);
  if (!context) {
    throw new Error("usePay must be used within a PayProvider");
  }
  return context;
}

// Internal Pay Context Provider (wrapped by wallet providers)
function PayContextProvider({
  children,
  username,
  tag,
  initialData,
}: {
  children: React.ReactNode;
  username: string;
  tag: string;
  initialData?: AddressResponse;
}) {
  const isMounted = useIsMounted();

  // Address data
  const [addressData, setAddressData] = useState<any>(initialData || null);
  const [isInitializing, setIsInitializing] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const globallyAvailableChains = useMemo(() => {
    const chainsStr = process.env.NEXT_PUBLIC_AVAILABLE_CHAINS || "APTOS";
    return chainsStr.split(",").map((chain) => chain.trim().toUpperCase());
  }, []);

  // Chain selection
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [availableChains, setAvailableChains] = useState<string[]>([]);

  // Payment modes
  const [isUsdcMode, setIsUsdcMode] = useState(false);

  // UI state
  const [currentColor, setCurrentColor] = useState<string>("blue"); // Default color
  const [enableColorRotation, setEnableColorRotation] = useState(false); // Easy toggle for debugging

  // Color rotation for debugging (disabled by default)
  useEffect(() => {
    if (!enableColorRotation) return;

    const interval = setInterval(() => {
      setCurrentColor((prevColor) => {
        const currentIndex = COLOR_PICKS.findIndex((c) => c.id === prevColor);
        const nextIndex = (currentIndex + 1) % COLOR_PICKS.length;
        return COLOR_PICKS[nextIndex].id;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [enableColorRotation]);

  // Set color from API response when addressData is loaded
  useEffect(() => {
    if (addressData?.linkData?.backgroundColor) {
      setCurrentColor(addressData.linkData.backgroundColor);
    } else if (addressData?.userData?.profileImageData?.backgroundColor) {
      // Fallback to user's profile color if link doesn't have one
      setCurrentColor(addressData.userData.profileImageData.backgroundColor);
    }
  }, [addressData]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("cctpTransactionId")) {
      setIsUsdcMode(true);
    }
  }, []);

  // Wallet modal state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Payment data
  const [amount, setAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);
  const [collectInfoData, setCollectInfoData] = useState<CollectInfoFormData>({
    name: "",
    email: "",
    telegram: "",
  });

  // USDC Payment Processing State (lifted to persist across layout changes)
  const [isPaying, setIsPaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isConfirmingInWallet, setIsConfirmingInWallet] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [allowance, setAllowance] = useState("0");
  const [collectInfoErrors, setCollectInfoErrors] = useState({});

  const handleSetCollectInfoData = useCallback((data: CollectInfoFormData) => {
    setCollectInfoData(data);
  }, []);

  const submitPaymentInfoAndGetId = async (): Promise<string | undefined> => {
    const paymentData = [];
    if (paymentNote) {
      paymentData.push({
        type: "note",
        value: paymentNote,
      });
    }

    for (const [key, value] of Object.entries(collectInfoData)) {
      if (value) {
        paymentData.push({
          type: key,
          value: value as string,
        });
      }
    }

    if (paymentData.length === 0) {
      return undefined;
    }

    const paymentInfoResponse = await paymentsService.submitPaymentInfo({
      paymentData,
    });

    if (paymentInfoResponse.error) {
      console.error(
        "Failed to submit payment info:",
        paymentInfoResponse.error
      );
      throw new Error(
        "Failed to submit payment information. Please try again."
      );
    }

    if (paymentInfoResponse.data) {
      return paymentInfoResponse.data.data.paymentInfoId;
    }

    return undefined;
  };

  const aptosWallet = useAptosWallet();

  const handleDisconnect = useCallback(async () => {
    try {
      if (aptosWallet?.connected) {
        await aptosWallet.disconnect();
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  }, [aptosWallet]);

  const wallet = useMemo(() => {
    if (!isMounted) {
      return {
        connected: false,
        connecting: false,
        publicKey: null,
        disconnect: handleDisconnect,
      };
    }

    return {
      connected: aptosWallet?.connected || false,
      connecting: false, // Aptos wallet doesn't have connecting state
      publicKey: aptosWallet?.account?.address.toString() || null,
      disconnect: handleDisconnect,
    };
  }, [
    isMounted,
    aptosWallet?.connected,
    aptosWallet?.account?.address,
    handleDisconnect,
  ]);

  const handleOpenWalletModal = () => {
    if (!isMounted) return;
    setIsWalletModalOpen(true);
  };

  // Reset function for new payment
  const resetForNewPayment = useCallback(() => {
    setPaymentSuccess(null);
    setPaymentNote("");
    setIsUsdcMode(false);
    setCollectInfoData({
      name: "",
      email: "",
      telegram: "",
    });

    // Reset USDC processing state
    setIsPaying(false);
    setCurrentStep(0);
    setIsConfirmingInWallet(false);
    setIsApproving(false);
    setAllowance("0");
    setCollectInfoErrors({});

    const isFixed = addressData?.linkData?.amountType === "FIXED";
    if (!isFixed) {
      setAmount("");
      setSelectedToken(null);
    }

    // Also clear any pending CCTP transaction from the URL
    const url = new URL(window.location.href);
    if (url.searchParams.has("cctpTransactionId")) {
      url.searchParams.delete("cctpTransactionId");
      window.history.replaceState({}, "", url);
    }
  }, [addressData]);

  useEffect(() => {
    if (!addressData) return;

    const isFixed = addressData.linkData?.amountType === "FIXED";

    if (
      isFixed &&
      selectedChain &&
      addressData.chains[selectedChain]
    ) {
      const chainData = addressData.chains[selectedChain];
      setAmount(chainData.amount.toString());
      if (chainData.mint) {
        setSelectedToken({
          symbol: chainData.mint.symbol,
          decimals: chainData.mint.decimals,
          isNative: chainData.mint.isNative,
          address: chainData.mint.mintAddress,
        });
      }
    } else if (!isFixed) {
      setAmount("");
      setSelectedToken(null);
    }

    setPaymentNote("");
    setCollectInfoData({
      name: "",
      email: "",
      telegram: "",
    });
  }, [addressData, selectedChain]);

  // Fetch address data on mount
  useEffect(() => {
    let mounted = true;

    const fetchAddressData = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/address/${username}${
            tag ? `/${tag}` : ""
          }`,
          {
            params: {
              chain: isTestnet ? "DEVNET" : "MAINNET",
            },
          }
        );

        if (!mounted) return;

        if (!response.data) {
          throw new Error("User not found");
        }

        setAddressData(response.data);

        console.log("Address data:", response.data);

        // Set available chains from the response
        if (response.data.supportedChains) {
          const backendChains = response.data.supportedChains;
          // Filter chains based on base chain name (e.g., "APTOS" matches "APTOS_TESTNET")
          const filteredChains = backendChains.filter((chain: string) =>
            globallyAvailableChains.some((globalChain: string) =>
              chain.toUpperCase().includes(globalChain.toUpperCase())
            )
          );

          console.log("Backend chains:", backendChains);
          console.log("Globally available:", globallyAvailableChains);
          console.log("Filtered chains:", filteredChains);

          setAvailableChains(filteredChains);
          // Auto-select APTOS first if available, otherwise first chain
          if (filteredChains.length > 0) {
            const aptosChain = filteredChains.find((chain: string) =>
              chain.includes("APTOS")
            );
            setSelectedChain(aptosChain || filteredChains[0]);
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error("Error fetching address data:", err);
        setError(
          err.response?.status === 404 ||
            err.response?.data?.message === "User not found"
            ? "Invalid link"
            : err.response?.data?.message || "Failed to load data"
        );
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    fetchAddressData();

    return () => {
      mounted = false;
    };
  }, [username, tag, initialData, globallyAvailableChains]);

  const value: PayContextType = {
    // Address data
    addressData,
    isInitializing,
    error,

    // Chain selection
    selectedChain,
    availableChains,
    setSelectedChain,

    // Payment modes
    isUsdcMode,
    setIsUsdcMode,

    // UI state
    currentColor,
    enableColorRotation,
    setEnableColorRotation,

    // Wallet
    wallet,
    isWalletModalOpen,
    setIsWalletModalOpen,
    handleOpenWalletModal,

    // Payment data
    amount,
    setAmount,
    paymentNote,
    setPaymentNote,
    selectedToken,
    setSelectedToken,
    collectInfoData,
    setCollectInfoData: handleSetCollectInfoData,

    // Payment flow
    paymentSuccess,
    setPaymentSuccess,
    resetForNewPayment,
    submitPaymentInfoAndGetId,

    // USDC Payment Processing State
    usdcProcessingState: {
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
    },
  };

  return (
    <PayContext.Provider value={value}>
      {children}
    </PayContext.Provider>
  );
}


// Wallet Provider Wrapper with Context
function PayWalletProviderWithContext({
  children,
  username,
  tag,
  initialData,
}: {
  children: React.ReactNode;
  username: string;
  tag: string;
  initialData?: AddressResponse;
}) {
  const isMounted = useIsMounted();

  /* ----------------------------------- EVM ---------------------------------- */
  const config = getDefaultConfig({
    appName: "PIVY",
    projectId: "none",
    chains: isTestnet
      ? [
          sepolia,
          baseSepolia,
          polygonAmoy,
          bscTestnet,
          arbitrumSepolia,
          avalancheFuji,
          optimismSepolia,
        ]
      : [mainnet, base, polygon, optimism, arbitrum, bsc, avalanche],
    ssr: false,
  });

  // Only render wallet providers and context on client side to prevent SSR issues
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="loading loading-dots w-12 text-gray-600"></div>
          <div className="text-center text-gray-400  font-medium">
            Initializing Payment Link...
          </div>
        </div>
      </div>
    );
  }

  return (
    <AptosWalletProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            modalSize="compact"
            theme={lightTheme({
              borderRadius: "large",
              accentColor: "#479af5",
              accentColorForeground: "#ffffff",
              fontStack: "system",
              overlayBlur: "small",
            })}
          >
            <PayContextProvider
              username={username}
              tag={tag}
              initialData={initialData}
            >
              {children}
            </PayContextProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </AptosWalletProvider>
  );
}

// Main PayProvider export
export default function PayProvider({
  children,
  username,
  tag,
  initialData,
}: {
  children: React.ReactNode;
  username: string;
  tag: string;
  initialData?: AddressResponse;
}) {
  return (
    <PayWalletProviderWithContext
      username={username}
      tag={tag}
      initialData={initialData}
    >
      {children}
    </PayWalletProviderWithContext>
  );
}
