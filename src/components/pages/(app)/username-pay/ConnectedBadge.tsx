import { AnimatePresence, motion } from "motion/react";
import { usePay } from "@/providers/PayProvider";
import CuteButton from "@/components/common/CuteButton";
import MainButton from "@/components/common/MainButton";
import { EASE_SNAPPY_OUT } from "@/config/animation";
import { useAccount, useDisconnect } from "wagmi";

export default function ConnectedBadge() {
  const { wallet, isUsdcMode } = usePay();
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();

  // Determine which wallet to show based on mode
  const showWallet = isUsdcMode ? isEvmConnected : wallet.connected;
  const walletAddress = isUsdcMode ? evmAddress : wallet.publicKey;
  const handleDisconnect = isUsdcMode ? disconnectEvm : wallet.disconnect;

  return (
    <AnimatePresence>
      {showWallet && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: {
              height: {
                duration: 0.4,
                ease: EASE_SNAPPY_OUT,
              },
              opacity: {
                duration: 0.2,
                delay: 0.1,
              },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: {
                duration: 0.2,
                ease: EASE_SNAPPY_OUT,
              },
              opacity: {
                duration: 0.1,
              },
            },
          }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.4,
                ease: EASE_SNAPPY_OUT,
                delay: 0.1,
              },
            }}
            exit={{
              y: 20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: EASE_SNAPPY_OUT,
              },
            }}
            className="px-4 py-3"
          >
            <div className="flex flex-row items-center justify-between">
              <div className="text-sm text-gray-500 flex items-center gap-2 font-medium">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{
                    scale: 1,
                    transition: {
                      duration: 0.4,
                      ease: EASE_SNAPPY_OUT,
                      delay: 0.2,
                    },
                  }}
                  className="w-2 h-2 rounded-full bg-green-500"
                />
                <span>Connected:</span>
                <span className="font-mono">
                  {walletAddress?.slice(0, 4)}...
                  {walletAddress?.slice(-4)}
                </span>
              </div>
              <button
                className="cursor-pointer text-sm font-medium text-red-500 hover:bg-red-100 px-3 py-1 rounded-lg"
                onClick={() => handleDisconnect()}
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
