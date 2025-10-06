"use client";

import { COLOR_PICKS } from "@/config/styling";
import { SPRING_BOUNCE_ONE } from "@/config/animation";
import ColorCard from "@/components/common/ColorCard";
import Image from "next/image";
import ConnectedBadge from "./ConnectedBadge";
import ChainSelectionTabs from "./ChainSelectionTabs";
import WalletConnectionOptions from "./WalletConnectionOptions";
import PaymentInterface from "./PaymentInterface";
import PaymentSuccess from "./PaymentSuccess";
import UsdcEvmPayment from "./UsdcEvmPayment";
import EmojiPicture from "@/components/common/EmojiPicture";
import { usePay } from "@/providers/PayProvider";
import PayProvider from "@/providers/PayProvider";
import { getFileUrl } from "@/utils/file";
import { FlickeringGrid } from "@/components/magicui/FlickeringGrid";
import TypeBadge from "./TypeBadge";
import DeliverablesList from "./DeliverablesList";
import MainButton from "@/components/common/MainButton";
import Link from "next/link";
import FullscreenLoader from "@/components/common/FullscreenLoader";
import { motion } from "motion/react";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { AddressResponse } from "@/lib/api/address";
import CCTPTransactionTracker from "./CCTPTransactionTracker";
import { useAccount } from "wagmi";

interface PayPageProps {
  username: string;
  tag: string;
  initialData: AddressResponse;
}

const GLOBAL_DELAY = 400;

// Main PayPage content component
function PayPageContent() {
  const {
    addressData,
    isInitializing,
    error,
    isUsdcMode,
    paymentSuccess,
    wallet,
    currentColor,
    amount,
    setAmount,
    setPaymentSuccess,
    usdcProcessingState,
  } = usePay();
  
  // Use shared USDC processing state from provider (persists across layout changes)
  const isProcessingUsdc = usdcProcessingState.isPaying;

  // Get EVM wallet connection status for USDC mode
  const { isConnected: isEvmConnected } = useAccount();

  // Generate metadata based on fetched data
  if (isInitializing) {
    return <FullscreenLoader text="Preparing Payment Link" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-8 bg-background py-8 ">
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <Image
            src="/assets/logo/horizontal.svg"
            width={2048}
            height={895}
            className="mx-auto w-[7rem]"
            alt="PIVY Logo"
          />
        </div>

        {/* Error Icon */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: { opacity: 0, y: 20 },
            animate: {
              opacity: 1,
              y: [0, -15, 0],
              rotate: [0, -2, 0, 2, 0],
              transition: {
                y: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                rotate: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                opacity: {
                  duration: 0.4,
                },
              },
            },
          }}
        >
          <Image
            src="/assets/cute/cloud-sad.svg"
            width={100}
            height={100}
            className="object-contain w-36"
            alt="Error Cloud"
          />
        </motion.div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Payment Link Not Found
          </h2>
          {/* <p className="text-foreground/70 text-base max-w-sm leading-relaxed">
              {error}
            </p> */}
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <Link href="/app">
            <MainButton className="px-8 rounded-2xl">
              <p className="font-semibold text-lg">Go Home</p>
            </MainButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop FloatingLoginCTA - Fixed position */}
      <div className="hidden lg:block">
        <FloatingLoginCTA />
      </div>
      <div className="min-h-screen bg-white">
        {/* Mobile Layout */}
        <div className="lg:hidden min-h-screen flex flex-col items-center px-4 md:px-0 py-8 pb-20">
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg w-full">
            <Image
              src="/assets/logo/horizontal.svg"
              width={2048}
              height={895}
              className="mx-auto w-[6rem]"
              alt="PIVY Logo"
            />
            <ColorCard
              className="w-full rounded-[1.6rem] p-2 mt-4"
              color={currentColor as any}
            >
              <div className="bg-background-600 rounded-[1.4rem]">
                <ConnectedBadge />
                <div className="p-4 flex flex-col gap-2 bg-white rounded-[1.4rem]">
                  {!isProcessingUsdc && <ChainSelectionTabs />}
                  {/* Send funds to */}
                  <div
                    className={`flex flex-col rounded-[1.6rem] p-1 bg-black/5`}
                  >
                    <div className="bg-white rounded-[1.4rem] p-3">
                      <div className="flex flex-row items-center justify-between gap-2">
                        <div className="font-bold">Send funds to</div>
                        {/* Username pill */}
                        <div className="bg-black/5 font-semibold text-sm px-2 py-1 rounded-full">
                          @{addressData?.userData.username}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Link info */}
                  <div
                    className="rounded-[1.6rem] p-1"
                    style={{
                      border: `2px solid ${
                        COLOR_PICKS.find((c) => c.id === currentColor)?.value ||
                        COLOR_PICKS[1].value
                      }`,
                      backgroundColor: `${
                        COLOR_PICKS.find((c) => c.id === currentColor)?.value ||
                        COLOR_PICKS[1].value
                      }10`,
                    }}
                  >
                    <div className="px-4 py-2">
                      <div className="flex flex-row items-center gap-2">
                        <EmojiPicture
                          emoji={addressData?.linkData?.emoji || "🔗"}
                          color={currentColor}
                          size="md"
                        />
                        <div className="font-bold">
                          {addressData?.linkData?.label || "Personal"}
                        </div>
                      </div>
                      {addressData?.linkData?.description && (
                        <div className="mt-2 text-sm text-gray-400">
                          {addressData.linkData.description}
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Display */}
                    {addressData?.linkData?.files?.thumbnail && (
                      <div className="bg-white rounded-[1.4rem] mt-2">
                        <div className="relative w-full min-h-[10rem] max-h-[20rem] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                          <Image
                            src={getFileUrl(
                              addressData.linkData.files.thumbnail.id
                            )}
                            alt={addressData?.linkData?.label || "Thumbnail"}
                            fill
                            className="object-contain rounded-[1.4rem] border-4 border-white"
                            sizes="(max-width: 768px) 100vw, 400px"
                          />
                        </div>
                      </div>
                    )}

                    {/* Payment Amount Type */}
                    <div className="rounded-[1.4rem] bg-white mt-2">
                      <TypeBadge linkData={addressData?.linkData} />
                    </div>
                  </div>

                  {/* Deliverables Section - Mobile */}
                  <DeliverablesList
                    deliverables={
                      addressData?.linkData?.files?.deliverables || []
                    }
                  />

                  {/* Payment Flow */}
                  <div className="mt-4 space-y-4">
                    {paymentSuccess ? (
                      <PaymentSuccess />
                    ) : isUsdcMode ? (
                      <UsdcEvmPayment
                        amount={amount}
                        setAmount={setAmount}
                        stealthData={addressData}
                        onSuccess={(details) => {
                          setPaymentSuccess(details);
                        }}
                      />
                    ) : (
                      <>
                        <WalletConnectionOptions />
                        <PaymentInterface />
                      </>
                    )}
                    
                    {/* CCTP Transaction Tracker - After payment buttons */}
                    {!paymentSuccess && <CCTPTransactionTracker />}
                  </div>
                </div>
              </div>
            </ColorCard>

            {/* Mobile FloatingLoginCTA - Static position below payment flow */}
            <div className="mt-6 w-full max-w-lg">
              <FloatingLoginCTA />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex lg:h-screen lg:overflow-hidden">
          {/* Left Side - Link Information */}
          <motion.div
            initial={{
              scaleX: 0,
              opacity: 0,
            }}
            animate={{
              scaleX: 1,
              opacity: 1,
            }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1], // Custom ease for smooth expansion
              opacity: { duration: 0.4 },
            }}
            className="flex-1 origin-left overflow-hidden"
          >
            <div
              className="flex-1 flex flex-col items-center justify-center p-8 relative h-full"
              style={{
                backgroundColor: `${
                  COLOR_PICKS.find((c) => c.id === currentColor)?.value ||
                  COLOR_PICKS[1].value
                }10`,
              }}
            >
              <FlickeringGrid
                className="absolute inset-0 z-0 size-full h-full"
                squareSize={2}
                gridGap={12}
                color={`${
                  COLOR_PICKS.find((c) => c.id === currentColor)?.value ||
                  COLOR_PICKS[1].value
                }`}
                maxOpacity={0.5}
                flickerChance={0.1}
              />
              <div className="max-w-lg w-full z-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: (GLOBAL_DELAY + 100) / 1000,
                    ...SPRING_BOUNCE_ONE,
                    duration: 0.5,
                  }}
                >
                  <Image
                    src="/assets/logo/horizontal.svg"
                    width={2048}
                    height={895}
                    className="w-[10rem] mb-6"
                    alt="PIVY Logo"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: (GLOBAL_DELAY + 200) / 1000,
                    ...SPRING_BOUNCE_ONE,
                    duration: 0.5,
                  }}
                >
                  <div className="bg-white p-1 shadow-2xl border border-black/5 shadow-black/5 rounded-[1.6rem]">
                    {/* Send funds to */}
                    <div className="flex flex-col rounded-[1.6rem] p-1 bg-black/5 mb-4">
                      <div className="bg-white rounded-[1.4rem] p-3">
                        <div className="flex flex-row items-center justify-between gap-2">
                          <div className="font-bold">Send funds to</div>
                          {/* Username pill */}
                          <div className="bg-black/5 font-semibold text-sm px-2 py-1 rounded-full">
                            @{addressData?.userData.username}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Link info - matching mobile structure with colored styling */}
                    <div
                      className="rounded-[1.4rem]"
                      style={{
                        border: `2px solid ${
                          COLOR_PICKS.find((c) => c.id === currentColor)
                            ?.value || COLOR_PICKS[1].value
                        }`,
                        backgroundColor: `${
                          COLOR_PICKS.find((c) => c.id === currentColor)
                            ?.value || COLOR_PICKS[1].value
                        }10`,
                      }}
                    >
                      <div className="px-5 py-4">
                        {/* Thumbnail Display */}
                        {addressData?.linkData?.files?.thumbnail && (
                          <div className="bg-white rounded-[1.4rem] mb-4 mt-2">
                            <div className="relative w-full min-h-[12rem] max-h-[20rem] rounded-[1.4rem] overflow-hidden bg-gray-100 flex items-center justify-center">
                              <Image
                                src={getFileUrl(
                                  addressData.linkData.files.thumbnail.id
                                )}
                                alt={
                                  addressData?.linkData?.label || "Thumbnail"
                                }
                                fill
                                className="object-contain rounded-[1.4rem] "
                                sizes="(max-width: 1024px) 50vw, 400px"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex flex-row items-center gap-3">
                          <EmojiPicture
                            emoji={addressData?.linkData?.emoji || "🔗"}
                            color={currentColor}
                            size="lg"
                          />
                          <div className="font-bold text-lg">
                            {addressData?.linkData?.label || "Personal"}
                          </div>
                        </div>
                        {addressData?.linkData?.description && (
                          <div className="mt-3 text-sm text-gray-400">
                            {addressData.linkData.description}
                          </div>
                        )}
                      </div>

                      {/* Payment Amount Type */}
                      <div className="rounded-[1.4rem] bg-white">
                        <TypeBadge linkData={addressData?.linkData} />
                      </div>
                    </div>

                    {/* Deliverables Section - Desktop */}
                    <DeliverablesList
                      deliverables={
                        addressData?.linkData?.files?.deliverables || []
                      }
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Payment Interface */}
          <div className="flex-1 flex h-full min-h-0 flex-col items-center justify-center bg-white overflow-y-auto">
            <div className="w-full min-h-0 flex flex-col items-center">
              <div className="py-8 max-w-lg w-full">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: (GLOBAL_DELAY + 300) / 1000,
                    ...SPRING_BOUNCE_ONE,
                    duration: 0.5,
                  }}
                >
                  <ColorCard
                    className="w-full rounded-4xl p-2"
                    color={currentColor as any}
                  >
                    <div className="bg-gray-50 rounded-3xl">
                      <ConnectedBadge />
                      <div className="p-6 flex flex-col gap-4 bg-white border-t border-black/10 rounded-[1.4rem] pb-8">
                        {paymentSuccess ? (
                          <PaymentSuccess />
                        ) : (
                          <>
                            <div className="text-center mb-4">
                              <h2 className="text-xl font-bold text-gray-900 mb-1">
                                Complete Payment
                              </h2>
                              <p className="text-gray-600 text-sm">
                                {isUsdcMode
                                  ? isEvmConnected
                                    ? "Enter amount and send USDC"
                                    : "Connect your EVM wallet to continue"
                                  : wallet.connected
                                  ? "Enter amount and send payment"
                                  : "Connect your wallet and send payment"}
                              </p>
                            </div>

                            {/* Chain Selection Section */}
                            {!isProcessingUsdc && <ChainSelectionTabs />}

                            {/* Payment Flow */}
                            <div className="space-y-4">
                              {isUsdcMode ? (
                                <UsdcEvmPayment
                                  amount={amount}
                                  setAmount={setAmount}
                                  stealthData={addressData}
                                  onSuccess={(details) => {
                                    setPaymentSuccess(details);
                                  }}
                                />
                              ) : (
                                <>
                                  <WalletConnectionOptions />
                                  <PaymentInterface />
                                </>
                              )}
                              
                              {/* CCTP Transaction Tracker - After payment buttons */}
                              <CCTPTransactionTracker />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </ColorCard>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FloatingLoginCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="lg:fixed lg:top-6 lg:left-4 z-50"
    >
      <Link
        href="/login"
        className="group block"
        aria-label="Create your PIVY"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative rounded-2xl bg-white p-1 shadow-supa-smooth border border-black/5"
        >
          <div className="relative flex items-center gap-3 rounded-xl bg-white px-4 py-3 transition-all duration-200">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-gray-900" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Create Your PIVY
              </span>
              <span className="text-xs font-medium text-gray-700">
                It&apos;s free and fast!
              </span>
            </div>
            <ArrowUpRight
              className="h-5 w-5 text-gray-400 flex-shrink-0"
              strokeWidth={2}
            />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// Main PayPage wrapper with provider
export default function UsernamePayIndex({
  username,
  tag,
  initialData,
}: PayPageProps) {
  return (
    <PayProvider username={username} tag={tag} initialData={initialData}>
      <PayPageContent />
    </PayProvider>
  );
}
