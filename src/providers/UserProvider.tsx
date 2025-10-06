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
import { useAuth } from "./AuthProvider";
import {
  userService,
  type UserToken,
  type UserBalancesSummary,
  type UserActivity,
  type ChainIdOrArray,
} from "@/lib/api/user";
import {
  linksService,
  type Link,
  type CreateLinkRequest,
  type UpdateLinkRequest,
} from "@/lib/api/links";
import { EMOJI_PICKS } from "@/config/styling";
import { SupportedChain, isTestnet } from "@/config/chains";

interface EnhancedPersonalLink extends Omit<Link, "emoji" | "backgroundColor"> {
  id: string;
  linkPreview: string;
  supportedChains: string[];
  backgroundColor: string;
  emoji: string;
}

interface UserContextType {
  // Stealth balances state
  stealthBalances: UserToken[];
  stealthBalancesSummary: UserBalancesSummary | null;
  stealthBalancesLoading: boolean;
  stealthBalancesInitialLoading: boolean;
  stealthBalancesError: string | null;

  // Activities state
  activities: UserActivity[];
  activitiesLoading: boolean;
  activitiesInitialLoading: boolean;
  activitiesError: string | null;
  activitiesLoadingAll: boolean;

  // Links state
  links: Link[];
  linksLoading: boolean;
  linksError: string | null;

  // Personal link state
  personalLink: EnhancedPersonalLink;
  personalLinkLoading: boolean;
  personalLinkError: string | null;

  // UI state
  showArchivedLinks: boolean;

  // Actions
  fetchStealthBalances: (chain?: ChainIdOrArray) => Promise<void>;
  refreshStealthBalances: () => Promise<void>;
  fetchActivities: (
    chain?: ChainIdOrArray,
    isInitial?: boolean,
    limit?: number
  ) => Promise<void>;
  refreshActivities: (limit?: number) => Promise<void>;

  // Links actions
  fetchLinks: () => Promise<void>;
  refreshLinks: () => Promise<void>;
  createLink: (data: CreateLinkRequest) => Promise<Link | null>;
  updateLink: (id: string, data: UpdateLinkRequest) => Promise<Link | null>;
  archiveLink: (id: string) => Promise<Link | null>;
  unarchiveLink: (id: string) => Promise<Link | null>;
  deleteLink: (id: string) => Promise<boolean>;

  // Personal link actions
  fetchPersonalLink: () => Promise<void>;
  refetchPersonalLink: () => Promise<void>;

  // UI actions
  setShowArchivedLinks: (show: boolean) => void;

  // Available chains
  availableChains: SupportedChain[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export default function UserProvider({ children }: UserProviderProps) {
  const { backendToken, isSignedIn, me, availableChains } = useAuth();

  const chainsToFetch = useMemo<ChainIdOrArray>(
    () => (isTestnet ? ["APTOS_TESTNET"] : ["APTOS_MAINNET"]),
    []
  );

  // Default placeholder personal link (memoized to prevent unnecessary re-renders)
  const defaultPersonalLink = useMemo<EnhancedPersonalLink>(
    () => ({
      id: "placeholder",
      userId: "",
      linkPreview: "",
      supportedChains: [],
      backgroundColor: "gray",
      emoji: "🔗",
      tag: "",
      label: "",
      description: null,
      specialTheme: "default",
      type: "SIMPLE_PAYMENT",
      amountType: "FIXED",
      goalAmount: null,
      isStable: false,
      stableToken: null,
      collectInfo: false,
      collectFields: null,
      viewCount: 0,
      status: "ACTIVE",
      archivedAt: null,
      isActive: false,
      createdAt: "",
      updatedAt: "",
      file: null,
      chainConfigs: [],
      user: {
        id: "",
        username: "",
      },
      activities: [],
      files: {
        thumbnail: null,
        deliverables: [],
      },
      isPersonalLink: true,
      stats: {
        viewCount: 0,
        totalPayments: 0,
        paymentStats: [],
      },
      template: "default",
    }),
    []
  );

  // Stealth balances state
  const [stealthBalances, setStealthBalances] = useState<UserToken[]>([]);
  const [stealthBalancesSummary, setStealthBalancesSummary] =
    useState<UserBalancesSummary | null>(null);
  const [stealthBalancesLoading, setStealthBalancesLoading] = useState(false);
  const [stealthBalancesInitialLoading, setStealthBalancesInitialLoading] =
    useState(true);
  const [stealthBalancesError, setStealthBalancesError] = useState<
    string | null
  >(null);

  // Activities state
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesInitialLoading, setActivitiesInitialLoading] =
    useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [activitiesLoadingAll, setActivitiesLoadingAll] = useState(false);

  // Links state
  const [links, setLinks] = useState<Link[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);

  // Personal link state
  const [personalLink, setPersonalLink] =
    useState<EnhancedPersonalLink>(defaultPersonalLink);
  const [personalLinkLoading, setPersonalLinkLoading] = useState(false);
  const [personalLinkError, setPersonalLinkError] = useState<string | null>(
    null
  );

  // UI state
  const [showArchivedLinks, setShowArchivedLinks] = useState(false);

  // Refs to track if initial fetch has been done
  const initialFetchDone = React.useRef(false);

  // Refs to prevent double-calling APIs
  const isGettingLinks = useRef(false);
  const isGettingPersonalLink = useRef(false);
  const isGettingBalances = useRef(false);
  const isGettingActivities = useRef(false);

  // Fetch stealth balances function
  const fetchStealthBalances = useCallback(
    async (chain: ChainIdOrArray = chainsToFetch) => {
      if (!backendToken) {
        return;
      }

      setStealthBalancesLoading(true);
      setStealthBalancesError(null);

      try {
        const response = await userService.getBalances(backendToken, chain);

        if (response.error) {
          throw new Error(
            `Failed to fetch stealth balances: ${response.error}`
          );
        }

        if (response.data) {
          setStealthBalances(response.data.tokens || []);
          setStealthBalancesSummary(response.data.summary);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch stealth balances";
        console.error("Error fetching stealth balances:", error);
        setStealthBalancesError(errorMessage);
      } finally {
        setStealthBalancesLoading(false);
        setStealthBalancesInitialLoading(false);
      }
    },
    [backendToken, chainsToFetch]
  );

  // Refresh stealth balances (uses APTOS_TESTNET or APTOS_MAINNET by default)
  const refreshStealthBalances = useCallback(async () => {
    if (isGettingBalances.current) {
      return; // Skip if already fetching
    }
    isGettingBalances.current = true;
    try {
      await fetchStealthBalances();
    } finally {
      isGettingBalances.current = false;
    }
  }, [fetchStealthBalances]);

  // Fetch activities function
  const fetchActivities = useCallback(
    async (
      chain: ChainIdOrArray = chainsToFetch,
      isInitial: boolean = false,
      limit?: number
    ) => {
      if (!backendToken) {
        return;
      }

      setActivitiesLoading(true);
      if (isInitial) setActivitiesInitialLoading(true);
      setActivitiesError(null);

      try {
        const response = await userService.getActivities(
          backendToken,
          chain,
          limit
        );

        if (response.error) {
          throw new Error(`Failed to fetch activities: ${response.error}`);
        }

        // The activities are directly in response.data array
        if (response.data) {
          setActivities(response.data);

          // If this was a limited fetch, start loading all activities in the background
          if (limit) {
            setActivitiesLoadingAll(true);
            userService
              .getActivities(backendToken, chain)
              .then((fullResponse) => {
                if (fullResponse.data) {
                  setActivities(fullResponse.data);
                }
              })
              .catch((error) => {
                console.error("Error fetching all activities:", error);
              })
              .finally(() => {
                setActivitiesLoadingAll(false);
              });
          }
        } else {
          setActivities([]);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch activities";
        console.error("Error fetching activities:", error);
        setActivitiesError(errorMessage);
      } finally {
        setActivitiesLoading(false);
        if (isInitial) setActivitiesInitialLoading(false);
      }
    },
    [backendToken, chainsToFetch]
  );

  // Refresh activities (uses APTOS_TESTNET or APTOS_MAINNET by default)
  const refreshActivities = useCallback(
    async (limit?: number) => {
      if (isGettingActivities.current) {
        return; // Skip if already fetching
      }
      isGettingActivities.current = true;
      try {
        await fetchActivities(undefined, false, limit);
      } finally {
        isGettingActivities.current = false;
      }
    },
    [fetchActivities]
  );

  // Fetch links function
  const fetchLinks = useCallback(async () => {
    if (!backendToken) {
      return;
    }

    setLinksLoading(true);
    setLinksError(null);

    try {
      const response = await linksService.getLinks(backendToken);

      if (response.error) {
        throw new Error(`Failed to fetch links: ${response.error}`);
      }

      if (response.data) {
        setLinks(response.data);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch links";
      console.error("Error fetching links:", error);
      setLinksError(errorMessage);
    } finally {
      setLinksLoading(false);
    }
  }, [backendToken]);

  // Refresh links
  const refreshLinks = useCallback(async () => {
    if (isGettingLinks.current) {
      return; // Skip if already fetching
    }
    isGettingLinks.current = true;
    try {
      await fetchLinks();
    } finally {
      isGettingLinks.current = false;
    }
  }, [fetchLinks]);

  // Create link
  const createLink = useCallback(
    async (data: CreateLinkRequest): Promise<Link | null> => {
      if (!backendToken) {
        return null;
      }

      try {
        const response = await linksService.createLink(backendToken, data);
        if (response.error) {
          throw new Error(`Failed to create link: ${response.error}`);
        }

        if (response.data) {
          const newLink = response.data;
          setLinks((prevLinks: Link[]) => [...prevLinks, newLink]);
          return newLink;
        }
        return null;
      } catch (error) {
        console.error("Error creating link:", error);
        return null;
      }
    },
    [backendToken]
  );

  // Update link
  const updateLink = useCallback(
    async (id: string, data: UpdateLinkRequest): Promise<Link | null> => {
      if (!backendToken) {
        return null;
      }

      try {
        const response = await linksService.updateLink(backendToken, id, data);
        if (response.error) {
          throw new Error(`Failed to update link: ${response.error}`);
        }

        if (response.data) {
          await refreshLinks();
          return response.data;
        }
        return null;
      } catch (error) {
        console.error("Error updating link:", error);
        return null;
      }
    },
    [backendToken, refreshLinks]
  );

  // Delete link
  const deleteLink = useCallback(
    async (id: string): Promise<boolean> => {
      if (!backendToken) {
        return false;
      }

      try {
        const response = await linksService.deleteLink(backendToken, id);
        if (response.error) {
          throw new Error(`Failed to delete link: ${response.error}`);
        }

        if (response.data?.success) {
          // Refetch links to get updated data from server
          await refreshLinks();
        }
        return false;
      } catch (error) {
        console.error("Error deleting link:", error);
        return false;
      }
    },
    [backendToken, refreshLinks]
  );

  // Archive link
  const archiveLink = useCallback(
    async (id: string): Promise<Link | null> => {
      if (!backendToken) {
        return null;
      }

      try {
        const response = await linksService.archiveLink(backendToken, id);
        if (response.error) {
          throw new Error(`Failed to archive link: ${response.error}`);
        }

        if (response.data) {
          // Refetch links to get updated data from server
          await refreshLinks();
          return response.data;
        }
        return null;
      } catch (error) {
        console.error("Error archiving link:", error);
        return null;
      }
    },
    [backendToken, refreshLinks]
  );

  // Unarchive link
  const unarchiveLink = useCallback(
    async (id: string): Promise<Link | null> => {
      if (!backendToken) {
        return null;
      }

      try {
        const response = await linksService.unarchiveLink(backendToken, id);
        if (response.error) {
          throw new Error(`Failed to unarchive link: ${response.error}`);
        }

        if (response.data) {
          // Refetch links to get updated data from server
          await refreshLinks();
          return response.data;
        }
        return null;
      } catch (error) {
        console.error("Error unarchiving link:", error);
        return null;
      }
    },
    [backendToken, refreshLinks]
  );

  // Fetch personal link function
  const fetchPersonalLink = useCallback(async () => {
    if (!backendToken) {
      return;
    }

    setPersonalLinkLoading(true);
    setPersonalLinkError(null);

    try {
      const response = await linksService.getPersonalLink(backendToken);

      if (response.error) {
        throw new Error(`Failed to fetch personal link: ${response.error}`);
      }

      if (response.data) {
        const personalLinkData = response.data;

        // Get profile data from me.profileImage.data and find the corresponding emoji from EMOJI_PICKS
        const emojiId =
          personalLinkData.emoji || me?.profileImage?.data?.emoji || "link";
        const emojiData = EMOJI_PICKS.find((pick) => pick.id === emojiId);
        const displayEmoji = emojiData?.emoji || personalLinkData.emoji || "🔗";
        const displayColor =
          personalLinkData.backgroundColor ||
          me?.profileImage?.data?.backgroundColor ||
          "gray";

        const enhancedPersonalLink: EnhancedPersonalLink = {
          ...personalLinkData,
          id: personalLinkData.id,
          linkPreview: personalLinkData.linkPreview,
          supportedChains: personalLinkData.supportedChains,
          backgroundColor: displayColor,
          emoji: displayEmoji,
        };

        setPersonalLink(enhancedPersonalLink);
      } else {
        setPersonalLink(defaultPersonalLink);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch personal link";
      console.error("Error fetching personal link:", error);
      setPersonalLinkError(errorMessage);
      setPersonalLink(defaultPersonalLink);
    } finally {
      setPersonalLinkLoading(false);
    }
  }, [backendToken, me, defaultPersonalLink]);

  // Refetch personal link
  const refetchPersonalLink = useCallback(async () => {
    if (isGettingPersonalLink.current) {
      return; // Skip if already fetching
    }
    isGettingPersonalLink.current = true;
    try {
      await fetchPersonalLink();
    } finally {
      isGettingPersonalLink.current = false;
    }
  }, [fetchPersonalLink]);

  // Auto-fetch personal link when user profile changes
  const meRef = useRef(me);
  useEffect(() => {
    if (
      initialFetchDone.current &&
      meRef.current && // Check if there was a previous `me`
      JSON.stringify(me?.profileImage) !==
        JSON.stringify(meRef.current?.profileImage)
    ) {
      refetchPersonalLink();
    }
    meRef.current = me;
  }, [me, refetchPersonalLink]);

  // Auto-fetch stealth balances and activities when user is signed in
  useEffect(() => {
    if (isSignedIn && backendToken && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchStealthBalances();
      fetchActivities(undefined, true, 50); // Initial load with reasonable limit
      fetchLinks(); // Add initial links fetch
      fetchPersonalLink(); // Add initial personal link fetch
    } else if (!isSignedIn || !backendToken) {
      initialFetchDone.current = false;
      // Clear balances and activities when user signs out
      setStealthBalances([]);
      setStealthBalancesSummary(null);
      setStealthBalancesError(null);
      setStealthBalancesInitialLoading(true);
      setActivities([]);
      setActivitiesError(null);
      setActivitiesInitialLoading(true);
      setActivitiesLoadingAll(false);
      // Clear links data
      setLinks([]);
      setLinksError(null);
      // Reset personal link to default placeholder
      setPersonalLink(defaultPersonalLink);
      setPersonalLinkError(null);
    }
  }, [
    isSignedIn,
    backendToken,
    fetchStealthBalances,
    fetchActivities,
    fetchLinks,
    fetchPersonalLink,
    defaultPersonalLink,
  ]);

  // Auto-refetch stealth balances, activities, and links when user is signed in
  useEffect(() => {
    if (!isSignedIn || !backendToken || !initialFetchDone.current) {
      return;
    }

    // Refresh links and personal link every 8 seconds
    const linksInterval = setInterval(() => {
      refreshLinks();
      refetchPersonalLink();
    }, 8_000);

    // Refresh stealth balances and activities every 5 seconds
    const balancesInterval = setInterval(() => {
      refreshStealthBalances();
      refreshActivities();
    }, 5_000);

    // Cleanup intervals on unmount or when user signs out
    return () => {
      clearInterval(linksInterval);
      clearInterval(balancesInterval);
    };
  }, [
    isSignedIn,
    backendToken,
    refreshStealthBalances,
    refreshActivities,
    refreshLinks,
    refetchPersonalLink,
  ]);

  // Debug logging for stealth balances and activities state
  // useEffect(() => {
  //   console.log("User data state changed:", {
  //     balancesCount: stealthBalances?.length || 0,
  //     balancesLoading: stealthBalancesLoading,
  //     balancesError: stealthBalancesError,
  //     summary: stealthBalancesSummary,
  //     activitiesCount: activities?.length || 0,
  //     activitiesLoading: activitiesLoading,
  //     activitiesError: activitiesError,
  //   });
  // }, [stealthBalances, stealthBalancesLoading, stealthBalancesError, stealthBalancesSummary, activities, activitiesLoading, activitiesError]);

  // Debug logging for links state
  // useEffect(() => {
  //   console.log("Links state changed:", {
  //     linksCount: links?.length || 0,
  //     linksLoading,
  //     linksError,
  //   });
  // }, [links, linksLoading, linksError]);

  const value: UserContextType = {
    stealthBalances,
    stealthBalancesSummary,
    stealthBalancesLoading,
    stealthBalancesInitialLoading,
    stealthBalancesError,
    activities,
    activitiesLoading,
    activitiesInitialLoading,
    activitiesError,
    activitiesLoadingAll,
    fetchStealthBalances,
    refreshStealthBalances,
    fetchActivities,
    refreshActivities,
    links,
    linksLoading,
    linksError,
    personalLink,
    personalLinkLoading,
    personalLinkError,
    showArchivedLinks,
    fetchLinks,
    refreshLinks,
    createLink,
    updateLink,
    archiveLink,
    unarchiveLink,
    deleteLink,
    fetchPersonalLink,
    refetchPersonalLink,
    setShowArchivedLinks,
    availableChains,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
