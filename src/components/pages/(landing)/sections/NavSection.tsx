"use client";

import { EASE_OUT_QUART } from "@/config/animation";
import { LINKS } from "@/config/links";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { FaXTwitter } from "react-icons/fa6";
import { ArrowUpRight, BookOpen } from "lucide-react";

export default function NavSection() {
  return (
    <nav className="w-full flex justify-center md:py-8 py-4 px-4">
      <div className="w-full max-w-5xl flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "tween",
            duration: 0.65,
            ease: EASE_OUT_QUART,
          }}
          className="w-20 md:w-[100px]"
        >
          <Image
            src="/assets/logo/horizontal-1024.png"
            alt="PIVY"
            width={200}
            height={200}
            className="w-full h-auto object-contain"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "tween",
            duration: 0.65,
            ease: EASE_OUT_QUART,
            delay: 0.05,
          }}
          className="flex items-center gap-3"
        >
          <Link
            href="/login"
            className="cursor-pointer rounded-full bg-gray-950 hover:bg-gray-900 transition px-5 py-3 text-sm text-white font-medium flex items-center gap-1"
          >
            App{" "}
            <span className="inline-block">
              <ArrowUpRight className="size-4" />
            </span>
          </Link>
        </motion.div>
      </div>
    </nav>
  );
}
