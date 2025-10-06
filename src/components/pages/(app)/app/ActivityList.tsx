"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useUser } from "@/providers/UserProvider";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { formatDateGroup, getDateKey } from "@/utils/time";
import { ActivityItem } from "../activities/ActivityItem";
import { cnm } from "@/utils/style";
import MainButton from "@/components/common/MainButton";

const ENABLE_MOCK_DATA = false;

// Mock activities data
const mockActivities = [
  {
    id: "mock-1",
    type: "PAYMENT" as const,
    timestamp: Date.now() / 1000 - 3600, // 1 hour ago
    amount: "500000000", // 5 APT in smallest unit (8 decimals)
    uiAmount: 5.0,
    usdValue: 75.25,
    from: "mock-sender-address-1",
    isAnnounce: false,
    chain: "APTOS_TESTNET" as const,
    token: {
      symbol: "APT",
      name: "Aptos",
      decimals: 8,
      imageUrl: "/assets/tokens/apt.png",
      mintAddress: "0x1::aptos_coin::AptosCoin",
      priceUsd: 150.5,
    },
    link: {
      label: "Coffee Shop",
      emoji: "☕",
      backgroundColor: "blue",
      tag: "payment",
      type: "fixed",
      amountType: "crypto",
    },
  },
  {
    id: "mock-2",
    type: "WITHDRAWAL" as const,
    timestamp: Date.now() / 1000 - 86400, // 1 day ago
    amount: "25000000", // 25 USDC in smallest unit (6 decimals for USDC)
    uiAmount: 25.0,
    usdValue: 25.0,
    from: "mock-recipient-address-2",
    isAnnounce: false,
    chain: "APTOS_MAINNET" as const,
    token: {
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      imageUrl: "/assets/tokens/usdc.png",
      mintAddress: "0x1::usdc::USDC",
      priceUsd: 1.0,
    },
    link: {
      label: "Freelance Work",
      emoji: "💼",
      backgroundColor: "green",
      tag: "withdrawal",
      type: "fixed",
      amountType: "fiat",
    },
  },
  {
    id: "mock-3",
    type: "PAYMENT" as const,
    timestamp: Date.now() / 1000 - 172800, // 2 days ago
    amount: "1000000000", // 10 APT in smallest unit (8 decimals)
    uiAmount: 10.0,
    usdValue: 8.5,
    from: "mock-sender-address-3",
    isAnnounce: false,
    chain: "APTOS_TESTNET" as const,
    token: {
      symbol: "APT",
      name: "Aptos",
      decimals: 8,
      imageUrl: "/assets/tokens/apt.png",
      mintAddress: "0x1::aptos_coin::AptosCoin",
      priceUsd: 0.85,
    },
    link: {
      label: "Art Sale",
      emoji: "🎨",
      backgroundColor: "purple",
      tag: "payment",
      type: "fixed",
      amountType: "crypto",
    },
  },
];

const TYPE_TABS = [
  {
    id: "all",
    label: "All",
  },
  {
    id: "incoming",
    label: "Incoming",
  },
  {
    id: "outgoing",
    label: "Outgoing",
  },
];

interface ActivityListProps {
  limit?: number;
  dateGrouping?: boolean;
  isShowSeeAll?: boolean;
}

// Custom Tabs Component
interface CustomTabsProps {
  selectedTab: string;
  onTabChange: (tabId: string) => void;
  tabs: typeof TYPE_TABS;
}

function CustomTabs({ selectedTab, onTabChange, tabs }: CustomTabsProps) {
  return (
    <div className="relative">
      <div className="flex space-x-1 bg-gray-50 p-1 rounded-full">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-4 py-2 text-sm font-medium rounded-full cursor-pointer`}
          >
            {/* The active background */}
            {selectedTab === tab.id && (
              <motion.div className="absolute inset-0 bg-gray-950 rounded-full z-0" />
            )}
            {/* The text, ensure it has a higher z-index */}
            <p
              className={cnm(
                "relative transition-all duration-200 ease-out z-10",
                selectedTab === tab.id ? "text-gray-100" : "text-gray-400"
              )}
            >
              {tab.label}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ActivityList({
  limit,
  dateGrouping = false,
  isShowSeeAll = false,
}: ActivityListProps) {
  const {
    activities,
    activitiesError,
    activitiesInitialLoading,
    activitiesLoadingAll,
    fetchActivities,
  } = useUser();
  const [selectedType, setSelectedType] = useState<string>(TYPE_TABS[0].id);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const previousActivitiesRef = useRef<typeof activities>(null);
  const isInitialLoadRef = useRef(true);

  // Track new activities for animation
  useEffect(() => {
    if (!activities || activitiesInitialLoading) return;

    // Skip animation detection on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      previousActivitiesRef.current = activities;
      return;
    }

    // Detect new activities
    const previousActivities = previousActivitiesRef.current;
    if (previousActivities && activities.length > previousActivities.length) {
      const previousIds = new Set(previousActivities.map((a) => a.id));
      const newIds = activities
        .filter((activity) => !previousIds.has(activity.id))
        .map((a) => a.id);

      if (newIds.length > 0) {
        setNewActivityIds(new Set(newIds));

        // Clear new activity IDs after animation completes
        setTimeout(() => {
          setNewActivityIds(new Set());
        }, 800); // Match animation duration
      }
    }

    previousActivitiesRef.current = activities;
  }, [activities, activitiesInitialLoading]);

  const handleTypeChange = (tabId: string) => {
    setSelectedType(tabId);
  };

  // Filter activities based on selected tab and limit if specified
  const filteredActivities = useMemo(() => {
    // Use real activities if available, otherwise use mock data if enabled
    const activitiesData =
      activities && activities.length > 0
        ? activities
        : ENABLE_MOCK_DATA
        ? mockActivities
        : [];

    let filtered = activitiesData;
    switch (selectedType) {
      case "incoming":
        filtered = activitiesData.filter(
          (activity) => activity.type === "PAYMENT"
        );
        break;
      case "outgoing":
        filtered = activitiesData.filter(
          (activity) => activity.type === "WITHDRAWAL"
        );
        break;
    }

    // Apply limit only if specified and we're on the home page
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [activities, selectedType, limit]);

  // Group activities by date if dateGrouping is enabled
  const groupedActivities = useMemo(() => {
    if (!dateGrouping || !filteredActivities.length) {
      return null;
    }

    const groups: { [key: string]: typeof filteredActivities } = {};

    filteredActivities.forEach((activity) => {
      const dateKey = getDateKey(activity.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity as any);
    });

    // Convert to array and sort by date (most recent first)
    return Object.entries(groups)
      .sort(
        ([dateA], [dateB]) =>
          new Date(dateB).getTime() - new Date(dateA).getTime()
      )
      .map(([dateKey, activities]) => ({
        dateKey,
        dateLabel: formatDateGroup(activities[0].timestamp),
        activities: activities.sort((a, b) => b.timestamp - a.timestamp),
      }));
  }, [filteredActivities, dateGrouping]);

  // Loading state - only show if no mock data and actually loading
  if (
    activitiesInitialLoading &&
    (!ENABLE_MOCK_DATA || (activities && activities.length > 0))
  ) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
          <div className="loading loading-spinner size-5" />
          <p className="text-gray-500 text-sm">Loading your activities...</p>
        </div>
      </div>
    );
  }

  // Error state - only show if there's an error and no mock data or real activities
  if (
    activitiesError &&
    (!ENABLE_MOCK_DATA || (activities && activities.length === 0))
  ) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-50 font-medium">
            Recent Activities
          </div>
          <CustomTabs
            selectedTab={selectedType}
            onTabChange={handleTypeChange}
            tabs={TYPE_TABS}
          />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
          <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-danger-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Something went wrong
            </h3>
            <p className="text-gray-500 text-sm max-w-xs">
              We couldn&apos;t load your activities. Please try again.
            </p>
          </div>
          <MainButton
            onClick={() =>
              fetchActivities(["APTOS_TESTNET"], true, limit)
            }
            className="px-6"
          >
            Try Again
          </MainButton>
        </div>
      </div>
    );
  }

  // Determine if we have any activities to show (real or mock)
  const hasActivities =
    (activities && activities.length > 0) ||
    (ENABLE_MOCK_DATA && mockActivities.length > 0);

  return (
    <div className="space-y-4">
      {hasActivities && (
        <div className="flex items-center justify-between">
          <CustomTabs
            selectedTab={selectedType}
            onTabChange={handleTypeChange}
            tabs={TYPE_TABS}
          />
        </div>
      )}
      <div className="space-y-4">
        <AnimatePresence mode="wait" initial={false}>
          {filteredActivities && filteredActivities.length > 0 ? (
            <motion.div
              key={`${selectedType}-activities`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex flex-col gap-1"
            >
              {dateGrouping && groupedActivities ? (
                // Render grouped activities
                <div className="space-y-6">
                  {groupedActivities.map((group) => (
                    <div key={group.dateKey} className="space-y-2">
                      <div className="px-2 py-1">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          {group.dateLabel}
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {group.activities.map((activity, index) => (
                          <ActivityItem
                            key={`${activity.id}`}
                            activity={activity}
                            isNewActivity={newActivityIds.has(activity.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Render ungrouped activities
                filteredActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    isNewActivity={newActivityIds.has(activity.id)}
                  />
                ))
              )}
              {activitiesLoadingAll && limit && (
                <div className="flex items-center justify-center py-4">
                  <div className="loading loading-spinner" />
                  <span className="ml-2 text-sm text-gray-500">
                    Loading more activities...
                  </span>
                </div>
              )}
              {isShowSeeAll && (
                <div className="flex justify-center mt-6">
                  <Link href="/app/activities">
                    <MainButton className="px-8 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-sm md:text-base h-10">
                      <p>See all activities</p>
                    </MainButton>
                  </Link>
                </div>
              )}
            </motion.div>
          ) : (
            // Only show empty state if there's no mock data or if mock data is disabled and no real activities
            (!ENABLE_MOCK_DATA || (activities && activities.length > 0)) && (
              <motion.div
                key={`${selectedType}-empty`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex flex-col items-center justify-center min-h-[300px] space-y-6"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedType === "all" && "No activities yet"}
                    {selectedType === "incoming" && "No incoming payments"}
                    {selectedType === "outgoing" && "No outgoing payments"}
                  </h3>
                  <p className="text-gray-500 text-sm max-w-xs">
                    {selectedType === "all" &&
                      "Your payment history will appear here once you start making transactions."}
                    {selectedType === "incoming" &&
                      "You haven't received any payments yet. Share your payment links to get started!"}
                    {selectedType === "outgoing" &&
                      "You haven't made any payments yet. Your outgoing transactions will appear here."}
                  </p>
                </div>
                {selectedType === "incoming" && (
                  <Link href="/app/links">
                    <MainButton className="px-6 rounded-xl">
                      Create Payment Link
                    </MainButton>
                  </Link>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ActivityList;
