"use client";

import { cnm } from "@/utils/style";
import {
  ArrowUpRightIcon,
  Cog6ToothIcon,
  LinkIcon,
  QueueListIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AptosModal from "./AptosModal";
import { IS_APTOS_ENABLED } from "@/config/app";
import { motion } from "motion/react";
import { EASE_OUT_QUART } from "@/config/animation";

const MENUS = [
  {
    path: "/app",
    title: "Dashboard",
    icon: Squares2X2Icon,
  },
  {
    path: "/app/links",
    title: "Links",
    icon: LinkIcon,
  },
  {
    path: "/app/activities",
    title: "Activities",
    icon: QueueListIcon,
  },

  {
    path: "/app/settings",
    title: "Settings",
    icon: Cog6ToothIcon,
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const [aptosModalOpen, setAptosModalOpen] = useState(false);

  return (
    <div className="hidden md:flex w-64 h-full flex-shrink-0 border-r border-black/5 flex-col">
      <div className="flex-1">
        {/* Header */}
        <div className="px-5 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-20 relative">
              <Image
                src="/assets/logo/horizontal-1024.png"
                alt=""
                height={200}
                width={300}
                className="object-contain"
              />
            </div>
            {IS_APTOS_ENABLED && (
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 rounded-md border border-black/5">
                APTOS
              </span>
            )}
          </div>
        </div>

        {/* Menus */}
        <nav className="mt-4 px-3 font-sans">
          <div className="flex flex-col gap-1">
            {MENUS.map((item, idx) => (
              <Link
                key={idx}
                href={item.path}
                className={cnm(
                  "group flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition duration-100",
                  "hover:bg-gray-50 hover:text-gray-900",
                  item.path === pathname
                    ? "bg-gray-50 text-gray-900 font-medium"
                    : "text-gray-400 hover:bg-gray-50"
                )}
              >
                <div className="size-5.5 flex items-center justify-center flex-shrink-0">
                  <item.icon className="size-5.5 stroke-2" />
                </div>

                <span className="font-medium">{item.title}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Beta Banner */}
      {IS_APTOS_ENABLED && (
        <div className="px-3 pb-4">
          <motion.div
            onClick={() => setAptosModalOpen(true)}
            className="block rounded-2xl overflow-hidden cursor-pointer"
            whileHover="hover"
            initial="initial"
          >
            {/* Illustration */}
            <div className="relative h-28 flex items-center justify-center bg-white overflow-hidden">
              <motion.div
                className="size-full"
                variants={{
                  initial: { scale: 1 },
                  hover: { scale: 1.05 },
                }}
                transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
              >
                <Image
                  src="/assets/pivy-ctrl.jpg"
                  alt=""
                  width={200}
                  height={100}
                  className="object-cover size-full"
                />
              </motion.div>
            </div>

            {/* Text Content */}
            <div className="px-4 py-3 flex items-center justify-between gap-2 bg-gray-100">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 leading-snug">
                  Aptos CTRL+Move 2025
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Click to learn more
                </p>
              </div>
              <motion.div
                variants={{
                  initial: { x: 0, y: 0 },
                  hover: { x: 2, y: -2 },
                }}
                transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
              >
                <ArrowUpRightIcon className="size-4 text-gray-400 flex-shrink-0 stroke-2" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer Links */}

      {/* Beta Modal */}
      {IS_APTOS_ENABLED && (
        <AptosModal
          isOpen={aptosModalOpen}
          onClose={() => setAptosModalOpen(false)}
        />
      )}
    </div>
  );
}
