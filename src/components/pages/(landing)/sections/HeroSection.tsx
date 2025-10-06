"use client";

import Image from "next/image";
import mockPhoneImage from "@/assets/images/pivy-demo.webp";
import { AnimatePresence, motion, useAnimation } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { EASE_OUT_QUART } from "@/config/animation";
import Link from "next/link";
import { useIsMounted } from "@/hooks/use-is-mounted";

interface Profile {
  fullText: string;
  emoji: string;
  bgColor: string;
}

const getBackgroundColor = (bgColor: string): string => {
  const colorMap: Record<string, string> = {
    "bg-red": "#fee2e2",
    "bg-blue": "#dbeafe",
    "bg-green": "#dcfce7",
    "bg-purple": "#f3e8ff",
    "bg-yellow": "#fef3c7",
    "bg-pink": "#fce7f3",
  };
  return colorMap[bgColor] || "#fee2e2";
};

const profiles: Profile[] = [
  {
    fullText: "james / freelance-designer",
    emoji: "🎨",
    bgColor: "bg-red",
  },
  { fullText: "sarah / web-developer", emoji: "💻", bgColor: "bg-blue" },
  { fullText: "alex / photographer", emoji: "📸", bgColor: "bg-green" },
  {
    fullText: "maria / content-creator",
    emoji: "✨",
    bgColor: "bg-purple",
  },
  { fullText: "david / consultant", emoji: "💼", bgColor: "bg-yellow" },
  { fullText: "emma / digital-artist", emoji: "🖌️", bgColor: "bg-pink" },
];

export default function HeroSection() {
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [canStartMarquee, setCanStartMarquee] = useState(false);
  const [isInitialRun, setIsInitialRun] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState<string | null>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const controls = useAnimation();
  const phoneControls = useAnimation();
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!isMounted) return;
    const sequence = async () => {
      // Phase 1: Launch upward from bottom
      await phoneControls.start({
        opacity: 1,
        y: -20, // Launch up above neutral position
        scale: 1,
        rotate: 0,
        transition: {
          type: "tween",
          duration: 0.8,
          ease: EASE_OUT_QUART,
          delay: 0.3,
        },
      });

      // Phase 2: Hold position for 300ms
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Phase 3: Start floating animation from top position, going down first
      phoneControls.start({
        y: [-20, 0, -20], // Start from top, go to bottom, back to top
        transition: {
          duration: 4,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        },
      });
    };
    sequence();
  }, [phoneControls, isMounted]);

  useEffect(() => {
    const textElement = textRef.current;
    if (!isMounted) return;
    if (!textElement) return;

    const measureAndAnimate = async () => {
      const width = textElement.scrollWidth;

      if (isInitialRun) {
        controls.set({ width });
        if (canStartMarquee) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await controls.start({
            width: 0,
            transition: { duration: 0.8, ease: EASE_OUT_QUART },
          });
          setCurrentProfileIndex((prev) => (prev + 1) % profiles.length);
          setIsInitialRun(false);
        }
      } else {
        await controls.start({
          width: width,
          transition: { duration: 1, ease: EASE_OUT_QUART },
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await controls.start({
          width: 0,
          transition: { duration: 0.7, ease: EASE_OUT_QUART },
        });
        setCurrentProfileIndex((prev) => (prev + 1) % profiles.length);
      }
    };

    if (canStartMarquee) {
      measureAndAnimate();
    } else {
      if (textRef.current) {
        controls.set({ width: textRef.current.scrollWidth });
      }
    }
  }, [currentProfileIndex, canStartMarquee, controls, isInitialRun, isMounted]);

  return (
    <>
      {/* Video Modal */}
      <AnimatePresence>
        {videoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVideoModalOpen(null)}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              layoutId={`video-${videoModalOpen}`}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl rounded-2xl overflow-hidden relative"
            >
              <div className="relative aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${videoModalOpen}?autoplay=1`}
                  title="PIVY Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </motion.div>

            <button
              onClick={() => setVideoModalOpen(null)}
              className="absolute top-6 right-6 bg-white/90 hover:bg-white rounded-full p-3 transition-colors group"
            >
              <svg
                className="w-6 h-6 text-gray-900"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="w-full flex flex-col py-12 md:py-20 items-center px-5 md:px-12 overflow-x-hidden">
        <div className="w-full flex flex-col items-center max-w-5xl">
          <div className="w-full flex flex-col lg:flex-row items-center justify-between">
            <div className="flex flex-col items-start flex-1">
              <div className="mb-6" style={{ perspective: "1200px" }}>
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -14,
                    scale: 0.97,
                    rotateX: 0,
                    rotateY: 0,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    rotateX: 0,
                    rotateY: 0,
                  }}
                  transition={{
                    type: "tween",
                    duration: 0.6,
                    ease: EASE_OUT_QUART,
                    delay: 0.15,
                  }}
                  whileHover={{ scale: 1.02, rotateX: -2, rotateY: 3 }}
                  whileTap={{ scale: 0.99, rotateX: 0, rotateY: 0 }}
                  className="group relative inline-flex items-center gap-2 font-mono overflow-visible rounded-full bg-white px-5 py-2 text-[10px] md:text-sm font-semibold text-gray-900 shadow-[0_6px_30px_rgba(44,82,130,0.08)] border-animated-gradient"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <span className="relative z-10 text-gray-500 font-mono">
                    Submission for
                  </span>
                  <span className="relative z-10 flex items-center gap-1 text-gray-900">
                    Aptos CTRL
                    <span className="inline-block text-blue-500">+</span>M
                    <motion.span
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        ease: EASE_OUT_QUART,
                        delay: 0.28,
                      }}
                      className="flex h-4 w-4 items-center justify-center"
                    >
                      <Image
                        src="/assets/logo/aptos-logo.svg"
                        alt="Aptos logo"
                        width={16}
                        height={16}
                        className="h-full w-full object-contain"
                      />
                    </motion.span>
                    VE 2025 Hackathon
                  </span>
                </motion.div>
              </div>
              <h1 className="font-bold text-5xl md:text-7xl leading-tight md:leading-[70px]">
                <span className="inline-block overflow-hidden leading-none tracking-tight">
                  <motion.span
                    initial={{ y: "100%", scale: 0.98 }}
                    animate={{ y: 0, scale: 1 }}
                    transition={{
                      type: "tween",
                      duration: 0.65,
                      ease: EASE_OUT_QUART,
                    }}
                    className="inline-block"
                  >
                    Get
                  </motion.span>{" "}
                  <motion.span
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{
                      type: "tween",
                      duration: 0.65,
                      ease: EASE_OUT_QUART,
                      delay: 0.1,
                    }}
                    className="inline-block"
                  >
                    Paid
                  </motion.span>
                </span>
                <br />
                <span className="text-primary-600 inline-block overflow-hidden leading-none py-1.5 tracking-tight">
                  <motion.span
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{
                      type: "tween",
                      duration: 0.65,
                      ease: EASE_OUT_QUART,
                      delay: 0.2,
                    }}
                    className="inline-block"
                  >
                    Stay
                  </motion.span>{" "}
                  <motion.span
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{
                      type: "tween",
                      duration: 0.65,
                      ease: EASE_OUT_QUART,
                      delay: 0.3,
                    }}
                    className="inline-block"
                  >
                    Private
                  </motion.span>
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "tween",
                  duration: 0.65,
                  ease: EASE_OUT_QUART,
                  delay: 0.4,
                }}
                className="mt-5 text-gray-500 text-pretty md:text-lg max-w-md  font-medium"
              >
                Everything you need to receive payments easily, without exposing
                your wallet.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "tween",
                  duration: 0.65,
                  ease: EASE_OUT_QUART,
                  delay: 0.5,
                }}
                onAnimationComplete={() => {
                  setTimeout(() => {
                    setCanStartMarquee(true);
                  }, 500);
                }}
                id="marquee-container"
                className="mt-5 w-full max-w-xl flex flex-col items-start"
              >
                <div className="bg-gray-50 pr-6 pl-4 py-2 md:py-3 rounded-full flex items-center gap-3">
                  <motion.div
                    className="rounded-full size-7 md:size-9 flex items-center text-sm justify-center"
                    animate={{
                      backgroundColor: getBackgroundColor(
                        profiles[currentProfileIndex].bgColor
                      ),
                    }}
                    transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
                  >
                    <motion.span
                      key={currentProfileIndex}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
                      className="text-xs md:text-sm"
                    >
                      {profiles[currentProfileIndex].emoji}
                    </motion.span>
                  </motion.div>
                  <div className="text-gray-500 font-medium text-sm md:text-base whitespace-nowrap">
                    pivy.me /{" "}
                    <span className="inline-flex items-center align-bottom">
                      <motion.span
                        className="inline-block overflow-hidden"
                        animate={controls}
                      >
                        <span
                          ref={textRef}
                          className="inline-block whitespace-nowrap"
                        >
                          {profiles[currentProfileIndex].fullText}
                        </span>
                      </motion.span>
                      <div className="w-[2px]">
                        <AnimatePresence>
                          {canStartMarquee && (
                            <motion.span
                              initial={{
                                opacity: 0,
                              }}
                              animate={{
                                opacity: 1,
                              }}
                              className="inline-block"
                            >
                              <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{
                                  duration: 0.8,
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                }}
                                className="inline-block"
                              >
                                |
                              </motion.span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </span>
                  </div>
                </div>
              </motion.div>

              <Link href="/login" className="mt-5">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "tween",
                    duration: 0.65,
                    ease: EASE_OUT_QUART,
                    delay: 0.6,
                  }}
                >
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="cursor-pointer px-6 h-14 bg-primary rounded-2xl text-black hover:bg-primary-400 transition-colors"
                  >
                    <p className="md:text-lg font-semibold">Create Your Link</p>
                  </motion.button>
                </motion.div>
              </Link>

              {/* Resource Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "tween",
                  duration: 0.5,
                  ease: EASE_OUT_QUART,
                  delay: 0.7,
                }}
                className="mt-12 w-full max-w-md flex flex-col gap-2"
              >
                {/* Github Card */}
                <a
                  href="https://github.com/pivyme/pivy-aptos-stealth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="bg-gray-100 hover:bg-gray-200 rounded-xl p-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="bg-gray-900 rounded-lg p-2 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900">
                          View on GitHub
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          pivyme/pivy-aptos-stealth
                        </p>
                      </div>
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </div>
                  </motion.div>
                </a>

                {/* Video Cards Row */}
                <div className="grid grid-cols-2 gap-2">
                  {/* PIVY Musical Card */}
                  <div
                    onClick={() => setVideoModalOpen("0AJ1YwPXyNA")}
                    className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-red-200 transition-all cursor-pointer group"
                  >
                    <motion.div
                      layoutId="video-0AJ1YwPXyNA"
                      className="relative aspect-video"
                    >
                      <Image
                        src="/assets/landing/pivy-musical-thumbnail.webp"
                        alt="PIVY Musical"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg">
                        <svg
                          className="w-4 h-4 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </motion.div>
                    <div className="p-2.5 bg-white">
                      <h3 className="font-semibold text-xs text-gray-900 text-center">
                        Musical 🎵
                      </h3>
                    </div>
                  </div>

                  {/* PIVY Walkthrough Card */}
                  <div
                    onClick={() => setVideoModalOpen("L3iWuaMuGbY")}
                    className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <motion.div
                      layoutId="video-L3iWuaMuGbY"
                      className="relative aspect-video"
                    >
                      <Image
                        src="/assets/landing/pivy-walkthrough-thumbnail.webp"
                        alt="PIVY Walkthrough"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-white rounded-full p-2 shadow-sm">
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </motion.div>
                    <div className="p-2.5 bg-white">
                      <h3 className="font-semibold text-xs text-gray-900 text-center">
                        Walkthrough 🚀
                      </h3>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 80, rotate: -3 }}
              animate={phoneControls}
              className="mt-12 md:mt-0 overflow-hidden w-[250px] md:w-[300px] origin-bottom-left"
            >
              <Image
                className="object-contain"
                alt=""
                width={400}
                height={1000}
                src={mockPhoneImage}
              />
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
