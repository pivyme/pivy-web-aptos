import Image from "next/image";
import { usePay } from "@/providers/PayProvider";
import CuteTabs from "@/components/common/CuteTabs";
import { isTestnet } from "@/config/chains";

export default function ChainSelectionTabs() {
  const { availableChains, selectedChain, setSelectedChain } = usePay();

  // Convert network-specific chains to wallet chains
  const getWalletChain = (chain: string): string => {
    if (
      chain === "APTOS_TESTNET" ||
      chain === "APTOS" ||
      chain === "APTOS_MAINNET"
    ) {
      return "APTOS";
    }
    return chain;
  };

  // Get chain display info
  const getChainDisplayInfo = (chain: string) => {
    switch (chain) {
      case "APTOS":
        return {
          name: isTestnet ? "Aptos Testnet" : "Aptos",
          icon: "/assets/chains/aptos.svg",
        };

      default:
        return {
          name: chain,
          icon: null,
        };
    }
  };

  // Get unique wallet chains (remove duplicates)
  let walletChains = Array.from(new Set(availableChains.map(getWalletChain)));

  // Prioritize APTOS, then others
  if (walletChains.includes("APTOS")) {
    walletChains = [
      "APTOS",
      ...walletChains.filter((chain) => chain !== "APTOS"),
    ];
  }

  // If only one wallet chain, show a nice chain indicator instead of tabs
  if (walletChains.length === 1) {
    const chainInfo = getChainDisplayInfo(walletChains[0]);
    return (
      <div className="flex items-center justify-between p-3 bg-black/5 rounded-[1.4rem] mb-4">
        <span className="text-sm text-gray-600">Pay on:</span>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-black/10">
          {chainInfo.icon && (
            <Image
              src={chainInfo.icon}
              alt={chainInfo.name}
              width={16}
              height={16}
              className="w-4 h-4"
            />
          )}
          <span className="font-semibold text-sm">{chainInfo.name}</span>
        </div>
      </div>
    );
  }

  // If no chains available, don't show anything
  if (walletChains.length === 0) return null;

  // Create tab items for each wallet chain
  const chainTabs = walletChains.map((chain) => {
    const displayInfo = getChainDisplayInfo(chain);
    return {
      id: chain,
      title: displayInfo.name,
      content: null,
    };
  });

  const handleTabChange = (key: any) => {
    const walletChain = String(key);
    // Find the corresponding API chain from the list of available chains
    const apiChain = availableChains.find(
      (chain) => getWalletChain(chain) === walletChain
    );
    if (apiChain) {
      setSelectedChain(apiChain);
    }
  };

  // Get the wallet chain equivalent of the selected chain
  const selectedWalletChain = selectedChain
    ? getWalletChain(selectedChain)
    : chainTabs[0]?.id;

  return (
    <CuteTabs
      items={chainTabs}
      selectedKey={selectedWalletChain}
      onSelectionChange={handleTabChange}
      size="lg"
      radius="full"
      fullWidth
      className="w-full"
    />
  );
}
