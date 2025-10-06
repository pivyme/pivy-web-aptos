import { UserProfile } from "@/lib/api";

/**
 * Helper function to determine where to redirect user based on profile completeness
 * Used by AuthProvider - returns null when profile is complete (no redirect needed)
 */
export function determineRedirectPath(userProfile: UserProfile): string | null {
  // Check if username is missing - redirect to onboarding step 1
  if (!userProfile.username) {
    console.log("🔄 Username missing, redirecting to onboarding step 1");
    return "/onboarding";
  }

  // Check if profile image is missing - redirect to onboarding step 2
  if (!userProfile.profileImage) {
    console.log("🔄 Profile image missing, redirecting to onboarding step 2");
    return "/onboarding";
  }

  // Check if meta keys are missing - redirect to onboarding step 3 (PIN step)
  const hasMetaKeys = userProfile.wallets?.some(wallet =>
    wallet.hasMetaKeys && wallet.metaKeys?.metaSpendPub
  );

  if (!hasMetaKeys) {
    console.log("🔄 Meta keys missing, redirecting to onboarding step 3 (PIN step)");
    return "/onboarding";
  }

  // All profile data complete - no redirect needed (let normal app flow handle it)
  console.log("✅ Profile complete, no redirect needed");
  return null;
}

/**
 * Helper function for LoginGuard to determine where to redirect authenticated users
 * Returns "/app" when profile is complete, unlike determineRedirectPath
 */
export function determineLoginRedirectPath(userProfile: UserProfile): string {
  // Check if username is missing - redirect to onboarding step 1
  if (!userProfile.username) {
    console.log("🔄 Username missing, redirecting to onboarding step 1");
    return "/onboarding";
  }

  // Check if profile image is missing - redirect to onboarding step 2
  if (!userProfile.profileImage) {
    console.log("🔄 Profile image missing, redirecting to onboarding step 2");
    return "/onboarding";
  }

  // Check if meta keys are missing - redirect to onboarding step 3 (PIN step)
  const hasMetaKeys = userProfile.wallets?.some(wallet =>
    wallet.hasMetaKeys && wallet.metaKeys?.metaSpendPub
  );

  if (!hasMetaKeys) {
    console.log("🔄 Meta keys missing, redirecting to onboarding step 3 (PIN step)");
    return "/onboarding";
  }

  // All profile data complete - redirect to app
  console.log("✅ Profile complete, redirecting to app");
  return "/app";
}