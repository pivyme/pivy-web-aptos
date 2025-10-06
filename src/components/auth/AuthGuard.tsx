"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useMetaKeys } from "@/providers/MetaKeysProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FullScreenLoader from "../common/FullscreenLoader";

interface AuthGuardProps {
  children: ReactNode;
}

function AuthGuardContent({ children }: AuthGuardProps) {
  const { me, isSignedIn } = useAuth();
  const { isMetaKeysLoaded, isSessionLoadingComplete } = useMetaKeys();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isCheckingMetaKeys, setIsCheckingMetaKeys] = useState(true);
  const lastRedirectTimeRef = useRef<number>(0);

  // Check if user needs to unlock meta keys
  useEffect(() => {
    const checkMetaKeyStatus = async () => {
      if (!me || !isSignedIn) {
        setIsCheckingMetaKeys(false);
        return;
      }

      // Wait for session loading to complete before making decisions
      if (!isSessionLoadingComplete) {
        return;
      }

      // Only check for existing users with username
      if (!me.username) {
        setIsCheckingMetaKeys(false);
        return;
      }

      // Don't redirect if we're already on the unlock or onboarding pages
      if (pathname === "/unlock" || pathname === "/onboarding") {
        setIsCheckingMetaKeys(false);
        return;
      }

      console.log("🔍 AuthGuard checking meta key status:", {
        hasUsername: !!me.username,
        isMetaKeysLoaded,
        isSessionLoadingComplete,
        hasBackendMetaKeys: me.wallets?.some((w) => w.metaKeys?.metaSpendPub),
        walletsWithMetaKeys: me.wallets?.map((w) => ({
          chain: w.chain,
          hasMetaKeys: !!w.metaKeys?.metaSpendPub,
        })),
      });

      // Check if user has meta keys in backend (this is the source of truth)
      const hasBackendMetaKeys =
        me.wallets &&
        me.wallets.length > 0 &&
        me.wallets.some((wallet) => wallet.metaKeys?.metaSpendPub);

      // User needs to unlock if:
      // 1. They have a username (existing user)
      // 2. They have meta keys registered in backend
      // 3. But meta keys are not currently loaded in memory
      // 4. And session loading is complete (to avoid false redirects)
      if (hasBackendMetaKeys && !isMetaKeysLoaded) {
        // Prevent rapid redirects (at least 2 seconds between redirects)
        const now = Date.now();
        if (now - lastRedirectTimeRef.current < 2000) {
          console.log("⚠️ Preventing rapid redirect to unlock page");
          setIsCheckingMetaKeys(false);
          return;
        }

        console.log(
          "🔐 User has backend meta keys but they're not loaded - redirecting to unlock page"
        );
        lastRedirectTimeRef.current = now;
        const params = searchParams.toString();
        router.push(params ? `/unlock?${params}` : "/unlock");
        return;
      } else if (hasBackendMetaKeys && isMetaKeysLoaded) {
        console.log("✅ Meta keys are loaded and ready");
      } else if (!hasBackendMetaKeys && me.username) {
        // New user with username but no meta keys - needs to set up PIN
        console.log(
          "🆕 User has username but no meta keys - redirecting to onboarding for PIN setup"
        );
        router.push("/onboarding");
        return;
      } else {
        console.log(
          "ℹ️ User doesn't have meta keys in backend - no unlock needed"
        );
      }

      setIsCheckingMetaKeys(false);
    };

    checkMetaKeyStatus();
  }, [
    me,
    isSignedIn,
    isMetaKeysLoaded,
    isSessionLoadingComplete,
    router,
    pathname,
    searchParams,
  ]);

  if (isCheckingMetaKeys) {
    return (
      <FullScreenLoader
        text={
          isSessionLoadingComplete
            ? "Checking your account status"
            : "Loading your session"
        }
      />
    );
  }

  return <>{children}</>;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isSignedIn, isSigningIn } = useAuth();

  useEffect(() => {
    // Only redirect if we're sure user is not signed in
    if (!isSignedIn && !isSigningIn) {
      console.log(
        "🔐 AuthGuard: User not signed in, hard redirecting to login"
      );
      const redirectUrl = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?redirectUrl=${encodeURIComponent(
        redirectUrl
      )}`;
    }
  }, [isSignedIn, isSigningIn]);

  // Show loading while checking authentication status
  if (isSigningIn) {
    return <FullScreenLoader text="Checking authentication" />;
  }

  // If user is not signed in, don't render content (redirect will happen)
  if (!isSignedIn) {
    return null;
  }

  return <AuthGuardContent>{children}</AuthGuardContent>;
}
