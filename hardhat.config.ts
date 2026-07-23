import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    arcTestnet: {
      url: process.env.RPC_URL || "https://rpc.testnet.arc.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 5042002,
      timeout: 30000,
    },
  },
  etherscan: {
    apiKey: { arcTestnet: "unused" },
    customChains: [{
      network: "arcTestnet",
      chainId: 5042002,
      urls: {
        apiURL:     "https://testnet.arcscan.app/api",
        browserURL: "https://testnet.arcscan.app",
      },
    }],
  },
};

export default config;
