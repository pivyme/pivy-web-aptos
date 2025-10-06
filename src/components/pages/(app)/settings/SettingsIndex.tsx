"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useUser } from "@/providers/UserProvider";
import EmojiPicture from "@/components/common/EmojiPicture";
import { SETTINGS } from "@/config/settings";
import SettingItem from "./SettingItem";
import AppearanceModal from "./AppearanceModal";
import CurrencyModal from "./CurrencyModal";
import ConnectedWalletModal from "./ConnectedWalletModal";
import UpdateProfileModal from "../update-profile/UpdateProfileModal";
import MainButton from "@/components/common/MainButton";
import { shortenId } from "@/utils/misc";
import Image from "next/image";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import AptosModal from "../AptosModal";
import { IS_APTOS_ENABLED } from "@/config/app";
import { motion } from "motion/react";
import { EASE_OUT_QUART } from "@/config/animation";
import { LINKS } from "@/config/links";
import Link from "next/link";

export default function SettingsIndex() {
  const { disconnect } = useAuth();
  const [appearanceModalOpen, setAppearanceModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [connectedWalletModalOpen, setConnectedWalletModalOpen] =
    useState(false);
  const [updateProfileModalOpen, setUpdateProfileModalOpen] = useState(false);
  const [aptosModalOpen, setAptosModalOpen] = useState(false);

  const handleSettingClick = (settingId: string) => {
    const setting = SETTINGS.flatMap((section) => section.items).find(
      (item) => item.id === settingId
    );

    if (setting && setting.type === "modal") {
      if (settingId === "appearance") {
        setAppearanceModalOpen(true);
      } else if (settingId === "currency") {
        setCurrencyModalOpen(true);
      } else if (settingId === "connected-wallets") {
        setConnectedWalletModalOpen(true);
      }
    } else if (setting && setting.type === "action") {
      if (settingId === "logout") {
        disconnect();
      }
    }
    // Handle redirect type in the future if needed
  };

  const handleAppearanceModalClose = () => {
    setAppearanceModalOpen(false);
  };

  const handleCurrencyModalClose = () => {
    setCurrencyModalOpen(false);
  };

  const handleConnectedWalletModalClose = () => {
    setConnectedWalletModalOpen(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto relative md:py-3 pb-32 md:pb-0 pt-5">
      <div>
        {/* Profile Box */}
        <div className="mb-4">
          <ProfileLoginBox
            onEditProfile={() => setUpdateProfileModalOpen(true)}
          />
        </div>

        {IS_APTOS_ENABLED && (
          <div className="md:hidden mt-8">
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

        {/* Dynamic Settings Sections */}
        {SETTINGS.map((section) => (
          <div key={section.title} className="mt-8">
            <h2 className="text-sm opacity-50 font-medium mb-3">
              {section.title}
            </h2>
            {section.items.length > 1 ? (
              // Group multiple items into one card
              <div className="bg-white rounded-3xl overflow-hidden border border-black/5 shadow-supa-smooth transition-shadow">
                <div className="divide-y divide-black/5">
                  {section.items.map((setting) => (
                    <SettingItem
                      key={setting.id}
                      setting={setting}
                      onClick={handleSettingClick}
                      isGrouped={true}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Single items remain as individual cards
              <div className="space-y-2">
                {section.items.map((setting) => (
                  <SettingItem
                    key={setting.id}
                    setting={setting}
                    onClick={handleSettingClick}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Beta Banner - Mobile Only */}

        {/* Settings Modals */}
        <AppearanceModal
          isOpen={appearanceModalOpen}
          onClose={handleAppearanceModalClose}
          currentValue="Light"
        />

        <CurrencyModal
          isOpen={currencyModalOpen}
          onClose={handleCurrencyModalClose}
          currentValue="USD"
        />

        <ConnectedWalletModal
          isOpen={connectedWalletModalOpen}
          onClose={handleConnectedWalletModalClose}
        />

        <UpdateProfileModal
          isOpen={updateProfileModalOpen}
          onClose={() => setUpdateProfileModalOpen(false)}
        />

        {IS_APTOS_ENABLED && (
          <AptosModal
            isOpen={aptosModalOpen}
            onClose={() => setAptosModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

const ProfileLoginBox = ({ onEditProfile }: { onEditProfile: () => void }) => {
  const { me } = useAuth();
  const { personalLink } = useUser();

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-black/5 shadow-supa-smooth">
      <div className="px-4.5 py-4">
        <div className="flex flex-row items-center gap-2 justify-between">
          <div className="flex flex-row items-center gap-3">
            <EmojiPicture
              color={personalLink?.backgroundColor}
              emoji={personalLink?.emoji}
              size="lg"
            />
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold">@{me?.username}</h1>
              {me?.wallets && me.wallets.length > 0 && (
                <p className="text-xs text-black/50">
                  {shortenId(me.wallets[0].walletAddress, 5, 4)}
                </p>
              )}
            </div>
          </div>

          <MainButton
            onClick={onEditProfile}
            className="bg-gray-100 text-gray-900 hover:bg-gray-200 w-full text-sm h-auto py-2 rounded-full px-4"
          >
            Edit
          </MainButton>
        </div>
      </div>
    </div>
  );
};
