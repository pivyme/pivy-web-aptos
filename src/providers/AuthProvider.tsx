"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocalStorage } from "usehooks-ts";
import {
  SUPPORTED_CHAINS,
  type SupportedChain,
  isTestnet,
} from "@/config/chains";
import { backend, type Wallet, type UserProfile } from "@/lib/api";
import { SecureMetaKeyStorage } from "@/lib/@pivy/core/secure-meta-keys-storage";
import { determineRedirectPath } from "@/utils/auth-utils";
import dynamic from "next/dynamic";
import FullscreenLoader from "@/components/common/FullscreenLoader";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { serializeSignInOutput } from "@aptos-labs/siwa";

// Dynamically import MetaKeysProvider to avoid SSR issues
const DynamicMetaKeysProvider = dynamic(
  () =>
    import("@/providers/MetaKeysProvider").then((mod) => mod.MetaKeysProvider),
  {
    ssr: false,
    loading: () => <FullscreenLoader text="Just a moment" />,
  }
);

interface AuthContextType {
  // Chain selection
  selectedChain: SupportedChain;
  setSelectedChain: (chain: SupportedChain) => void;

  // Auth state
  isSignedIn: boolean;
  isSigningIn: boolean;
  backendToken: string | null;
  accessToken: string | null; // Alias for backendToken
  wallets: Wallet[];
  me: UserProfile | null;

  // Actions
  disconnect: () => void;
  fetchMe: () => Promise<void>;

  // SIWA (Sign-In with Aptos) authentication
  authenticateWithSIWA: (walletName: string, siwaInput?: any) => Promise<void>;

  availableChains: SupportedChain[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const aptosWallet = useAptosWallet();

  // Simplified state - only what we really need
  const [selectedChain, setSelectedChain] = useState<SupportedChain>(
    SUPPORTED_CHAINS.APTOS
  );
  const [backendToken, setBackendToken] = useLocalStorage<string | null>(
    "pivy-access-token",
    null
  );
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const redirectHistoryRef = useRef<string[]>([]);
  const lastRedirectTimeRef = useRef<number>(0);

  const availableChains = useMemo(() => {
    return [SUPPORTED_CHAINS.APTOS];
  }, []);

  const isSignedIn = !!backendToken && !!me;

  // Disabled cross-tab sync to prevent infinite loops
  // Only keep essential coordination via localStorage checks in sign-in function

  // Disconnect function - simplified with hard redirect
  const disconnect = useCallback(async () => {
    try {
      // Clear all state immediately
      setBackendToken(null);
      setWallets([]);
      setMe(null);
      setIsSigningIn(false);

      // Clear meta keys
      SecureMetaKeyStorage.clearMetaKeys();

      // Clear onboarding data
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("pivy-onboarding-state")) {
          localStorage.removeItem(key);
        }
        // Also clear PIN step refresh flag
        if (key === "pivy-pin-step-refreshed") {
          localStorage.removeItem(key);
        }
      });

      // Use hard redirect to completely reset the app state
      window.location.href = "/login";
    } catch (error) {
      console.error("Disconnect error:", error);
      // Even on error, force hard redirect to login
      window.location.href = "/login";
    }
  }, [setBackendToken]);

  // Fetch user profile
  const fetchMe = useCallback(async () => {
    if (!backendToken) return;

    try {
      const meResponse = await backend.auth.getMe(backendToken);
      if (meResponse.data) {
        setMe(meResponse.data);
      } else if (meResponse.error) {
        // Token invalid - clear everything and hard redirect
        setBackendToken(null);
        setMe(null);
        setWallets([]);
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Clear invalid state and hard redirect
      setBackendToken(null);
      setMe(null);
      setWallets([]);
      window.location.href = "/login";
    }
  }, [backendToken, setBackendToken]);

  // Safety: Reset isSigningIn if it's stuck for too long (10 seconds)
  useEffect(() => {
    if (isSigningIn) {
      const timeout = setTimeout(() => {
        console.warn("⚠️ isSigningIn stuck, resetting to false");
        setIsSigningIn(false);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isSigningIn]);

  // Auto-fetch profile when we have token but no user
  useEffect(() => {
    if (backendToken && !me && !isSigningIn) {
      console.log("🔄 Auto-fetching user profile");
      fetchMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendToken, me, isSigningIn]); // Removed fetchMe from deps to prevent loops

  // Mark as hydrated after first render to prevent hydration mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // SIWA (Sign-In with Aptos) authentication
  const authenticateWithSIWA = useCallback(
    async (walletName: string, preFetchedSiwaInput?: any) => {
      setIsSigningIn(true);
      try {
        console.log("Starting SIWA authentication with:", walletName);

        // Disconnect if already connected to avoid conflicts
        if (aptosWallet.connected) {
          console.log("Wallet already connected, disconnecting first");
          await aptosWallet.disconnect();
          // Small delay to ensure clean disconnect
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        let siwaInput = preFetchedSiwaInput;

        // Get SIWA nonce from backend if not pre-fetched
        if (!siwaInput) {
          const nonceResponse = await backend.auth.getSIWANonce();
          if (nonceResponse.error || !nonceResponse.data) {
            throw new Error(`Failed to get SIWA nonce: ${nonceResponse.error}`);
          }
          siwaInput = nonceResponse.data.data;
        }

        console.log("Using SIWA input:", siwaInput);

        // Use current domain and base URL instead of backend-provided ones
        const currentDomain =
          typeof window !== "undefined" ? window.location.host : "";
        const currentUrl =
          typeof window !== "undefined" ? window.location.origin : "";

        console.log("Calling signIn with wallet:", walletName);

        // Use signIn function from wallet adapter (handles both connection and signing)
        // Request email for Aptos Connect wallets (Google login)
        const signInOutput = await aptosWallet.signIn({
          walletName,
          input: {
            nonce: siwaInput.nonce,
            domain: currentDomain,
            chainId: isTestnet ? "aptos:testnet" : "aptos:mainnet",
            resources: ["aptosconnect.app.email"],
          },
        });

        if (!signInOutput) {
          throw new Error("Sign in was cancelled or failed");
        }

        console.log("Sign in successful, received output");

        // Serialize the sign-in output properly using SIWA library
        const serializedOutput = serializeSignInOutput(signInOutput);

        // Extract email from Aptos Connect if provided
        const email = signInOutput.input?.resources
          ?.find((resource: string) =>
            resource.startsWith("aptosconnect.app.email")
          )
          ?.split(":")
          ?.at(1);

        if (email) {
          console.log("Email retrieved from Aptos Connect:", email);
        } else {
          console.log(
            "No email provided (wallet may not support email sharing)"
          );
        }

        console.log("Sending SIWA callback to backend");

        // Send to backend for verification with additional data
        const response = await backend.auth.siwaCallback(serializedOutput, "", {
          input: {
            nonce: siwaInput.nonce,
            domain: currentDomain,
            uri: currentUrl,
            statement: siwaInput.statement,
            version: siwaInput.version,
            chainId: isTestnet ? "aptos:testnet" : "aptos:mainnet",
          },
          domain: currentDomain,
          uri: currentUrl,
          email: email, // Pass email to backend if available
        });

        if (response.error || !response.data) {
          throw new Error(`SIWA authentication failed: ${response.error}`);
        }

        console.log("SIWA authentication successful");

        // Set all auth data
        setBackendToken(response.data.token);
        setWallets([response.data.wallet]);

        // Fetch user profile
        const meResponse = await backend.auth.getMe(response.data.token);
        if (meResponse.data) {
          setMe(meResponse.data);

          // Small delay to ensure state is updated before redirect
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Determine redirect
          const params = new URLSearchParams(window.location.search);
          const redirectUrl = params.get("redirectUrl");
          if (redirectUrl) {
            console.log(`🔄 Redirecting to: ${redirectUrl}`);
            router.push(redirectUrl);
            return;
          }
          const redirectPath = determineRedirectPath(meResponse.data);
          if (redirectPath) {
            console.log(`🔄 Redirecting to: ${redirectPath}`);
            router.push(redirectPath);
          }
        }
      } catch (error) {
        console.error("SIWA authentication error:", error);

        // Disconnect wallet on error
        if (aptosWallet.connected) {
          await aptosWallet.disconnect();
        }

        throw error;
      } finally {
        setIsSigningIn(false);
      }
    },
    [aptosWallet, router, setBackendToken]
  );

  const value: AuthContextType = {
    selectedChain,
    setSelectedChain,
    isSignedIn,
    isSigningIn,
    backendToken,
    accessToken: backendToken,
    wallets,
    me,
    disconnect,
    fetchMe,
    availableChains,
    authenticateWithSIWA,
  };

  // Handle routes that require authentication
  const routesRequiringAuth = ["/unlock"];
  const requiresAuth = routesRequiringAuth.includes(pathname);

  useEffect(() => {
    if (requiresAuth && !isSignedIn) {
      const redirectUrl = `${pathname}${window.location.search}`;
      window.location.href = `/login?redirectUrl=${encodeURIComponent(
        redirectUrl
      )}`;
    }
  }, [requiresAuth, isSignedIn, pathname]);

  // Prevent infinite redirect loops
  useEffect(() => {
    const currentPath = pathname;
    const now = Date.now();

    // Reset redirect history when user signs out or goes to login
    if (!isSignedIn || currentPath === "/login") {
      redirectHistoryRef.current = [];
      lastRedirectTimeRef.current = 0;
      return;
    }

    // Only track redirects for signed-in users on protected routes
    if (isSignedIn && me) {
      const newHistory = [...redirectHistoryRef.current, currentPath].slice(
        -10
      ); // Keep last 10 redirects
      redirectHistoryRef.current = newHistory;
      lastRedirectTimeRef.current = now;

      // Check for redirect loops between specific problematic routes
      const recentRoutes = newHistory.slice(-6); // Check last 6 routes

      // If we've been bouncing between /app and /unlock more than 3 times in the last 6 redirects
      const appToUnlockCount = recentRoutes.filter((route, index) => {
        if (index === 0) return false;
        return (
          (recentRoutes[index - 1] === "/app" && route === "/unlock") ||
          (recentRoutes[index - 1] === "/unlock" && route === "/app")
        );
      }).length;

      // Check for the login -> app -> unlock -> login loop
      const loginAppUnlockLoop = recentRoutes.filter((route, index) => {
        if (index < 3) return false;
        const prev3 = recentRoutes[index - 3];
        const prev2 = recentRoutes[index - 2];
        const prev1 = recentRoutes[index - 1];
        const current = route;
        return (
          prev3 === "/login" &&
          prev2 === "/app" &&
          prev1 === "/unlock" &&
          current === "/login"
        );
      }).length;

      if (appToUnlockCount >= 4 || loginAppUnlockLoop >= 2) {
        console.error(
          "🚨 INFINITE REDIRECT LOOP DETECTED - Force disconnecting user"
        );
        console.error("Redirect history:", newHistory);
        console.error("App-Unlock loop count:", appToUnlockCount);
        console.error("Login-App-Unlock-Login loop count:", loginAppUnlockLoop);
        disconnect();
        return;
      }

      // Also check for rapid redirects (more than 10 redirects in 30 seconds)
      const recentRedirects = newHistory.length;
      const timeSinceFirstRedirect = now - lastRedirectTimeRef.current;

      if (recentRedirects >= 10 && timeSinceFirstRedirect < 30000) {
        // 30 seconds
        console.error(
          "🚨 RAPID REDIRECT LOOP DETECTED - Force disconnecting user"
        );
        console.error("Redirect history:", newHistory);
        disconnect();
        return;
      }
    }
  }, [pathname, isSignedIn, me, disconnect]);

  if (requiresAuth && !isSignedIn) {
    return (
      <AuthContext.Provider value={value}>
        <FullscreenLoader text="Redirecting to login..." />
      </AuthContext.Provider>
    );
  }

  // Show consistent loading state during hydration to prevent SSR mismatches
  if (!isHydrated) {
    return (
      <AuthContext.Provider value={value}>
        <FullscreenLoader text="Just a moment" />
      </AuthContext.Provider>
    );
  }

  // Determine what to render based on auth state
  const renderContent = () => {
    if (isSignedIn && me) {
      // User is fully authenticated with profile loaded
      return <DynamicMetaKeysProvider>{children}</DynamicMetaKeysProvider>;
    }

    if (backendToken && !me && !isSigningIn) {
      // Have token but profile not loaded yet - auto-fetch will handle this
      return <FullscreenLoader text="Loading your profile" />;
    }

    if (!backendToken && !isSigningIn) {
      // No token, not signing in - show login/public pages
      return children;
    }

    return <FullscreenLoader text="Just a moment" />;
  };

  return (
    <AuthContext.Provider value={value}>{renderContent()}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
