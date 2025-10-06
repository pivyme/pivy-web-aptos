export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const shortenId = (
  id: string | undefined | null,
  start: number = 5,
  end: number = 4
) => {
  if (!id) return "";
  return `${id.slice(0, start)}...${id.slice(-end)}`;
};

type AptosChain = "TESTNET" | "MAINNET";
export type ExplorerChain = "APTOS_TESTNET" | "APTOS_MAINNET";

export const getAptosExplorerTxLink = (
  txHash: string,
  chain: AptosChain = "TESTNET"
): string => {
  if (chain === "TESTNET") {
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`;
  }
  return `https://explorer.aptoslabs.com/txn/${txHash}?network=mainnet`;
};

export const getExplorerTxLink = (
  txHash: string,
  chain: ExplorerChain
): string => {
  // Handle Aptos chain
  if (chain === "APTOS_TESTNET" || chain === "APTOS_MAINNET") {
    return getAptosExplorerTxLink(
      txHash,
      chain === "APTOS_TESTNET" ? "TESTNET" : "MAINNET"
    );
  }

  throw new Error(`Unsupported chain: ${chain}`);
};

export const getAptosExplorerAccountLink = (
  address: string,
  chain: AptosChain = "TESTNET"
): string => {
  if (chain === "TESTNET") {
    return `https://explorer.aptoslabs.com/account/${address}?network=testnet`;
  }
  return `https://explorer.aptoslabs.com/account/${address}?network=mainnet`;
};

export const getExplorerAccountLink = (
  address: string,
  chain: ExplorerChain
): string => {
  // Handle Aptos chain
  if (chain === "APTOS_TESTNET" || chain === "APTOS_MAINNET") {
    return getAptosExplorerAccountLink(
      address,
      chain === "APTOS_TESTNET" ? "TESTNET" : "MAINNET"
    );
  }

  throw new Error(`Unsupported chain: ${chain}`);
};

export const getChainLogo = (chain: string, isFilled?: boolean): string | null => {
  let logoName: string | null = null;

  // Only Aptos is supported
  if (chain.includes("APTOS")) {
    logoName = "aptos";
  }

  if (!logoName) return null;

  return `/assets/chains/${logoName}${isFilled ? "_filled" : ""}.svg`;
};
