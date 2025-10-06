export const USDC_CONTRACT_ADDRESS = {
  MAINNET: {
    // Ethereum Mainnet
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    // Base Mainnet
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    // Polygon Mainnet
    137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    // Arbitrum One
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    // Avalanche Mainnet
    43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    // Optimism Mainnet
    10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
  },
  DEVNET: {
    // Ethereum Sepolia
    11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    // Base Sepolia
    84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    // Polygon Amoy
    80002: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    // Arbitrum Sepolia
    421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    // Avalanche Fuji
    43113: "0x5425890298aed601595a70AB815c96711a31Bc65",
    // Optimism Sepolia
    11155420: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7"
  }
}

export const CCTP_CONTRACTS = {
  TOKEN_MESSENGER: {
    1: {
      domain: 0,
      address: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155" // Ethereum
    },
    43114: {
      domain: 1,
      address: "0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982" // Avalanche
    },
    10: {
      domain: 2,
      address: "0x2B4069517957735bE00ceE0fadAE88a26365528f" // Optimism
    },
    42161: {
      domain: 3,
      address: "0x19330d10D9Cc8751218eaf51E8885D058642E08A" // Arbitrum
    },
    8453: {
      domain: 6,
      address: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962" // Base
    },
    137: {
      domain: 7,
      address: "0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE" // Polygon PoS
    },
    11155111: {
      domain: 0,
      address: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" // Ethereum Sepolia
    },
    43113: {
      domain: 1,
      address: "0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0" // Avalanche Fuji
    },
    11155420: {
      domain: 2,
      address: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" // OP Sepolia
    },
    421614: {
      domain: 3,
      address: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" // Arbitrum Sepolia
    },
    84532: {
      domain: 6,
      address: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" // Base Sepolia
    },
    80002: {
      domain: 7,
      address: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" // Polygon Amoy
    }
  },

  TOKEN_TRANSMITTER_PROGRAM: {
    MAINNET: {
      domain: 5,
      address: "CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd"
    },
    DEVNET: {
      domain: 5,
      address: "CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd"
    }
  },

  TOKEN_MESSENGER_MINTER_PROGRAM: {
    MAINNET: {
      domain: 5,
      address: "CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3"
    },
    DEVNET: {
      domain: 5,
      address: "CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3"
    }
  },

  // Aptos CCTP V1 Configuration
  APTOS: {
    MAINNET: {
      domain: 9,
      usdcAddress: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
      messageTransmitterPackageId: "0x177e17751820e4b4371873ca8c30279be63bdea63b88ed0f2239c2eea10f1772",
      messageTransmitterObjectId: "0x45bf7f71e44750f2b2a7a1fea21fc44b4a83ba5d68ab10c7a3935f6d8cbdbc75",
      tokenMessengerMinterPackageId: "0x9bce6734f7b63e835108e3bd8c36743d4709fe435f44791918801d0989640a9d",
      tokenMessengerMinterObjectId: "0x9e6702a472080ea3caaf6ba9dfaa6effad2290a9ba9adaacd5af5c618e42782d",
      aptosExtensionsPackageId: "0x98bce69c31ee2cf91ac50a3f38db7b422e3df7cdde9fe672ee1d03538a6aeae0"
    },
    TESTNET: {
      domain: 9,
      usdcAddress: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
      messageTransmitterPackageId: "0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9",
      messageTransmitterObjectId: "0xcbb70e4f5d89b4a37e850c22d7c994e32c31e9cf693e9633784e482e9a879e0c",
      tokenMessengerMinterPackageId: "0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9",
      tokenMessengerMinterObjectId: "0x1fbf4458a00a842a4774f441fac7a41f2da0488dd93a43880e76d58789144e17",
      aptosExtensionsPackageId: "0xb75a74c6f8fddb93fdc00194e2295d8d5c3f6a721e79a2b86884394dcc554f8f"
    }
  }
}

// USDC ABI - Essential functions for CCTP operations
export const USDC_ABI = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "type": "function"
  }
] as const

// Chain configurations for CCTP
export interface ChainConfig {
  getChain: () => any;
  preparePayment: (params: any) => Promise<any>;
  getRecipientBytes32: (prepareData: any) => string;
  formatCctpData: (prepareData: any, txData: any, attestation: any, stealthData: any, chain: any, usdcAddress: string) => any;
  getChainParam: () => string;
}

// Helper function to check if current environment is testnet
export const isTestnetEnvironment = (chain?: { testnet: boolean }) => {
  if (chain) {
    return chain.testnet;
  }
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENVIRONMENT === "testnet" ||
    process.env.VITE_IS_TESTNET === "true" ||
    (typeof window !== "undefined" &&
      window.location.hostname.includes("localhost"))
  );
};

// Get the correct USDC contract address based on environment and chain
export const getUsdcAddress = (chainId: number, isTestnet: boolean): string => {
  const addresses = isTestnet
    ? USDC_CONTRACT_ADDRESS.DEVNET
    : USDC_CONTRACT_ADDRESS.MAINNET;
  return addresses[chainId as keyof typeof addresses] || "";
};

// Get the correct Token Messenger contract info based on environment and chain
export const getTokenMessengerInfo = (chainId: number) => {
  return CCTP_CONTRACTS.TOKEN_MESSENGER[
    chainId as keyof typeof CCTP_CONTRACTS.TOKEN_MESSENGER
  ];
};