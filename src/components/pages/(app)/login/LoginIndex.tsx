"use client";

import Image from "next/image";
import { useAuth } from "@/providers/AuthProvider";
import { useState } from "react";
import WalletConnectModal from "@/components/pages/(app)/login/WalletConnectModal";
import { motion } from "motion/react";
import AnimateComponent from "@/components/common/AnimateComponent";
import PivyLogo from "@/components/icons/PivyLogo";
import { EASE_OUT_QUART } from "@/config/animation";
import { useIsMounted } from "@/hooks/use-is-mounted";
import MainButton from "@/components/common/MainButton";
import InfoBadge from "@/components/common/InfoBadge";
import { IS_APTOS_ENABLED } from "@/config/app";

export default function LoginIndex() {
  const { disconnect, isSignedIn, isSigningIn } = useAuth();

  if (isSigningIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="loading loading-dots w-12 text-gray-600"></div>
          <div className="text-center text-gray-400  font-medium">
            Signing In...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-dvh overflow-y-auto bg-white">
      <div className="block md:hidden h-full">
        <MobileLayout isSignedIn={isSignedIn} disconnect={disconnect} />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block h-full">
        <DesktopLayout isSignedIn={isSignedIn} disconnect={disconnect} />
      </div>
    </div>
  );
}
function MobileLayout({
  isSignedIn,
  disconnect,
}: {
  isSignedIn: boolean;
  disconnect: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        id="mobile-welcome"
        className="flex flex-col items-center w-full h-full"
      >
        <div className="flex items-center gap-2 mt-[2rem]">
          <AnimateComponent className="w-[6rem] h-auto" delay={200}>
            <Image
              src="/assets/logo/horizontal-1024.png"
              alt="PIVY Logo"
              width={1024}
              height={448}
              className="w-full"
            />
          </AnimateComponent>
          {IS_APTOS_ENABLED && (
            <AnimateComponent delay={250}>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 rounded-md border border-black/5 inline-flex items-center gap-1">
                <Image
                  src="/assets/logo/aptos-logo.svg"
                  alt="Aptos"
                  width={12}
                  height={12}
                  className="w-3 h-3"
                />
                APTOS
              </span>
            </AnimateComponent>
          )}
        </div>

        <div className="w-full flex-1 flex flex-col items-center justify-center pt-20">
          <LoginGhosts />
        </div>

        {/* White Container with Rounded Top Corners */}

        <motion.div
          initial={{
            y: 40,
          }}
          animate={{
            y: 0,
          }}
          transition={{
            type: "spring",
            duration: 0.6,
            bounce: 0.3,
          }}
          className="w-full bg-white rounded-t-[40px] px-6 pt-10 pb-8"
        >
          <div className="flex flex-col items-center gap-8 w-full max-w-sm mx-auto">
            {/* Header & Subheader */}
            <div className="flex flex-col gap-5">
              <motion.h1
                initial={{
                  y: 10,
                  opacity: 0,
                }}
                animate={{
                  y: 0,
                  opacity: 1,
                }}
                transition={{
                  type: "spring",
                  duration: 0.6,
                  bounce: 0.2,
                  delay: 0.05,
                }}
                className="text-4xl md:text-5xl font-extrabold text-center text-black"
              >
                Get Paid
                <br />
                Stay Private
              </motion.h1>

              <motion.p
                initial={{
                  y: 10,
                  opacity: 0,
                }}
                animate={{
                  y: 0,
                  opacity: 1,
                }}
                transition={{
                  type: "spring",
                  duration: 0.6,
                  bounce: 0.2,
                  delay: 0.1,
                }}
                className="text-center text-sm md:text-base text-pretty opacity-60 max-w-[20rem] mx-auto text-black"
              >
                Payment toolkit that keeps your real wallet private using
                Stealth Addresses.
              </motion.p>
            </div>

            {/* Login/Logout Buttons */}
            <motion.div
              initial={{
                y: 10,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              transition={{
                type: "spring",
                duration: 0.6,
                bounce: 0.2,
                delay: 0.15,
              }}
              className="w-full"
            >
              {isSignedIn ? (
                <MainButton
                  onClick={() => disconnect()}
                  className="w-full h-16"
                >
                  Logout
                </MainButton>
              ) : (
                <MainButton
                  onClick={() => setIsModalOpen(true)}
                  className="w-full h-16"
                >
                  Connect Wallet
                </MainButton>
              )}
            </motion.div>

            {IS_APTOS_ENABLED && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  duration: 0.6,
                  bounce: 0.2,
                  delay: 0.18,
                }}
                className="w-full"
              >
                <InfoBadge
                  title={
                    <span className="inline-flex items-center gap-2">
                      <Image
                        src="/assets/logo/aptos-logo.svg"
                        alt="Aptos"
                        width={14}
                        height={14}
                        className="w-3.5 h-3.5"
                      />
                      Live on Aptos Testnet
                    </span>
                  }
                  variant="neutral"
                  className="w-full"
                >
                  <div className="text-sm text-center text-gray-600">
                    Don&apos;t forget to set your wallet to testnet.
                  </div>
                </InfoBadge>
              </motion.div>
            )}

            {/* TODO: implementTerms & Conditions and Privacy Policy */}
            {/* <motion.div
            initial={{
              y: 10,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              duration: 0.6,
              bounce: 0.2,
              delay: 0.2,
            }}
            className="text-xs md:text-sm text-center mt-4"
          >
            <span className="opacity-60 text-black">
              By continuing, you accept our <br />
            </span>
            <Link href="/terms" className="font-semibold text-black">
              Terms & Conditions
            </Link>{" "}
            <span className="opacity-60 text-black">and </span>
            <Link href="/privacy" className="font-semibold text-black">
              Privacy Policy
            </Link>
          </motion.div> */}
          </div>
        </motion.div>
      </div>
      <WalletConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

// Desktop Component
function DesktopLayout({
  isSignedIn,
  disconnect,
}: {
  isSignedIn: boolean;
  disconnect: () => void;
}) {
  const isMounted = useIsMounted();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center w-full min-h-screen bg-white overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto px-8">
            {/* Logo, Title, and CTA */}
            <motion.div
              initial={!isMounted ? { opacity: 0, y: 10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                type: "tween",
                ease: EASE_OUT_QUART,
              }}
              className="mb-4 relative"
            >
              <PivyLogo />
              {IS_APTOS_ENABLED && (
                <motion.span
                  initial={!isMounted ? { opacity: 0, scale: 0.8 } : {}}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    type: "spring",
                    bounce: 0.3,
                    delay: 0.15,
                  }}
                  className="absolute -top-3 -right-3 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 rounded-md border border-black/5 shadow-sm inline-flex items-center gap-1"
                >
                  APTOS
                </motion.span>
              )}
            </motion.div>
            <motion.h1
              initial={!isMounted ? { y: 10, opacity: 0 } : {}}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.05,
                duration: 0.5,
                type: "tween",
                ease: EASE_OUT_QUART,
              }}
              className="text-2xl font-bold text-center text-gray-900 mb-2 font-sans"
            >
              Welcome to PIVY
            </motion.h1>
            <motion.p
              initial={!isMounted ? { y: 10, opacity: 0 } : {}}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.1,
                duration: 0.5,
                type: "tween",
                ease: EASE_OUT_QUART,
              }}
              className="text-center text-gray-500 mb-6 max-w-sm "
            >
              Get paid while staying private with our secure payment toolkit
              using Stealth Addresses.
            </motion.p>

            <motion.div
              initial={!isMounted ? { y: 10, opacity: 0 } : {}}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.15,
                duration: 0.5,
                type: "tween",
                ease: EASE_OUT_QUART,
              }}
              className="w-full"
            >
              {isSignedIn ? (
                <MainButton
                  onClick={() => disconnect()}
                  className="h-14 rounded-2xl w-full"
                >
                  Logout
                </MainButton>
              ) : (
                <MainButton
                  onClick={() => setIsModalOpen(true)}
                  className="h-14 rounded-2xl w-full"
                >
                  Connect Wallet
                </MainButton>
              )}
            </motion.div>
            {IS_APTOS_ENABLED && (
              <motion.div
                initial={!isMounted ? { y: 10, opacity: 0 } : {}}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.2,
                  duration: 0.5,
                  type: "tween",
                  ease: EASE_OUT_QUART,
                }}
                className="w-full mt-8"
              >
                <InfoBadge
                  title={
                    <span className="inline-flex items-center gap-0.5">
                      Live on&nbsp;
                      <span className="inline-flex items-center gap-0.5 bg-neutral-950 rounded-full px-1.5 py-0.5 text-white">
                        <Image
                          src="/assets/logo/aptos-logo-white.svg"
                          alt="Aptos"
                          width={14}
                          height={14}
                          className="w-3.5 h-3.5"
                        />
                        Aptos
                      </span>
                      &nbsp;Testnet
                    </span>
                  }
                  variant="neutral"
                  className="w-full"
                >
                  <div className="text-sm text-center text-gray-600">
                    Don&apos;t forget to set your wallet to testnet.
                  </div>
                </InfoBadge>
              </motion.div>
            )}
          </div>
        </div>

        {/* TODO: implement Terms Section */}
        {/* <div className="py-8">
        <motion.div
          initial={!isMounted ? { y: 10, opacity: 0 } : {}}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.2,
            duration: 0.5,
            type: "tween",
            ease: EASE_OUT_QUART,
          }}
          className="text-xs text-center text-gray-500 "
        >
          <span>By continuing, you accept our </span>
          <br />
          <Link
            href="/terms"
            className="font-semibold text-gray-900 hover:underline"
          >
            Terms & Conditions
          </Link>
          <span> and </span>
          <Link
            href="/privacy"
            className="font-semibold text-gray-900 hover:underline"
          >
            Privacy Policy
          </Link>
        </motion.div>
      </div> */}
      </div>
      <WalletConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

const DELAY = 0.24;

const LoginGhosts = () => {
  const cloudVariants = {
    hidden: (direction: string) => {
      const directions = {
        tl: { x: -20, y: -20, opacity: 0, scale: 0.8, rotate: -20 },
        tr: { x: 20, y: -20, opacity: 0, scale: 0.8, rotate: 20 },
        bl: { x: -20, y: 20, opacity: 0, scale: 0.8, rotate: 20 },
        br: { x: 20, y: 20, opacity: 0, scale: 0.8, rotate: -20 },
      };
      return directions[direction as keyof typeof directions];
    },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.2,
        duration: 0.35, // 20% faster
      },
    },
  };

  // Animation variant for center ghost
  const centerGhostVariants = {
    hidden: {
      scale: 0,
      opacity: 0,
      rotate: -45,
      y: 50,
    },
    visible: {
      scale: 1,
      opacity: 1,
      rotate: -6,
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 0.5, // 20% faster
      },
    },
  };

  // Container animation for staggering
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12, // 20% faster (was 0.15)
        delayChildren: DELAY + 0.04, // 20% faster (was 0.05)
      },
    },
  };

  return (
    <motion.div
      className="max-w-[26rem] h-full w-full relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Left Cloud */}
      <motion.div
        variants={cloudVariants}
        custom="tl"
        className="absolute top-[0rem] left-[0rem] w-[34%]"
      >
        <motion.div
          animate={{
            y: [0, -8, 0],
            x: [0, 3, 0],
            rotate: [0, 2, 0],
          }}
          transition={{
            duration: 4.8, // 20% faster
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2, // 20% faster
          }}
        >
          <Image
            src="/assets/cute/login-cloud-tl.svg"
            alt=""
            width={100}
            height={100}
            className="w-full h-auto"
          />
        </motion.div>
      </motion.div>

      {/* Top Right Cloud */}
      <motion.div
        variants={cloudVariants}
        custom="tr"
        className="absolute top-[0rem] right-[1rem] w-[30%]"
      >
        <motion.div
          animate={{
            y: [0, -6, 0],
            x: [0, -4, 0],
            rotate: [0, -1.5, 0],
          }}
          transition={{
            duration: 5.6, // 20% faster
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.6, // 20% faster
          }}
        >
          <Image
            src="/assets/cute/login-cloud-tr.svg"
            alt=""
            width={100}
            height={100}
            className="w-full h-auto"
          />
        </motion.div>
      </motion.div>

      {/* Bottom Left Cloud */}
      <motion.div
        variants={cloudVariants}
        custom="bl"
        className="absolute bottom-[0rem] left-[0.5rem] w-[30%]"
      >
        <motion.div
          animate={{
            y: [0, 7, 0],
            x: [0, 2, 0],
            rotate: [0, 1, 0],
          }}
          transition={{
            duration: 6.4, // 20% faster
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2.0, // 20% faster
          }}
        >
          <Image
            src="/assets/cute/login-cloud-bl.svg"
            alt=""
            width={100}
            height={100}
            className="w-full h-auto"
          />
        </motion.div>
      </motion.div>

      {/* Bottom Right Cloud */}
      <motion.div
        variants={cloudVariants}
        custom="br"
        className="absolute bottom-[0rem] right-[1rem] w-[35%]"
      >
        <motion.div
          animate={{
            y: [0, -5, 0],
            x: [0, -3, 0],
            rotate: [0, -2, 0],
          }}
          transition={{
            duration: 4.4, // 20% faster
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2.4, // 20% faster
          }}
        >
          <Image
            src="/assets/cute/login-cloud-br.svg"
            alt=""
            width={100}
            height={100}
            className="w-full h-auto"
          />
        </motion.div>
      </motion.div>

      {/* Center Ghost with Phone */}
      <motion.div
        variants={centerGhostVariants}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%]"
      >
        <motion.div
          animate={{
            rotate: [-6, -4, -8, -6],
            y: [0, -5, 0],
            x: [0, 2, 0],
          }}
          transition={{
            duration: 3.2, // 20% faster
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay: 0.8, // 20% faster
          }}
        >
          <Image
            src="/assets/cute/login-ghost-with-phone.png"
            width={200}
            height={200}
            alt=""
            className="w-full h-auto"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
