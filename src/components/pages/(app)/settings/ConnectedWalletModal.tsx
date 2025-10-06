import { useAuth } from "@/providers/AuthProvider";
import CuteModal from "@/components/common/CuteModal";
import { shortenId } from "@/utils/misc";
import { getChainLogo } from "@/utils/misc";
import Image from "next/image";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface ConnectedWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectedWalletModal({
  isOpen,
  onClose,
}: ConnectedWalletModalProps) {
  const { me } = useAuth();
  const [copyingAddress, setCopyingAddress] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const wallets = me?.wallets || [];

  const handleCopyAddress = async (address: string) => {
    if (copiedAddress === address || copyingAddress === address) return;

    setCopyingAddress(address);

    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => {
      setCopiedAddress(null);
      setCopyingAddress(null);
    }, 2000); // Reset after 2 seconds
  };

  return (
    <>
      <CuteModal
        isOpen={isOpen}
        onClose={onClose}
        title="Connected Wallets"
        size="lg"
        withHandle={true}
      >
        <div className="space-y-4">
          {wallets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No connected wallets found
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-black/10 shadow-supa-smooth"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                        <Image
                          src={getChainLogo(wallet.chain, true) || ""}
                          alt={wallet.chain}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {wallet.chain} Wallet
                      </span>
                      <button
                        onClick={() => handleCopyAddress(wallet.walletAddress)}
                        disabled={
                          copyingAddress === wallet.walletAddress ||
                          copiedAddress === wallet.walletAddress
                        }
                        className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-200 disabled:cursor-default disabled:bg-gray-100"
                      >
                        <span className="">
                          {copiedAddress === wallet.walletAddress
                            ? "Copied!"
                            : shortenId(wallet.walletAddress, 6, 4)}
                        </span>
                        {copiedAddress === wallet.walletAddress ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : copyingAddress === wallet.walletAddress ? (
                          <Check className="h-3 w-3 text-gray-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {wallets.length > 0 && (
            <div className="mt-6 text-xs text-gray-400 text-center">
              Your connected wallets are only used to cryptographically generate
              your private payment address. They are never used for
              transactions, ensuring your payment activity remains separate and
              private.
            </div>
          )}
        </div>
      </CuteModal>
    </>
  );
}
