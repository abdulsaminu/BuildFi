import { ethers } from "hardhat";

/**
 * Registers both agents' on-chain identities against the existing,
 * already-deployed AgentIdentity (ERC-8004) registry from ConstructOS:
 *   0x3EC9Cd867B9Eaf94380bc8a20EEcC27E02AC2812
 *
 * NOTE: the original construct-os-v2 deploy.ts deployed AgentIdentity
 * but never actually called registerAgent() — INSPECTOR_AGENT_ADDRESS
 * was just an address convention, not a real registration. This script
 * performs the real registerAgent() call for both agents, so BuildFi's
 * two agents each have a genuine on-chain identity record (metadata URI
 * + initialized reputation), not just an address people call "the agent".
 *
 * Required env vars:
 *   RPC_URL, PRIVATE_KEY              - deployer/registrant wallet
 *   CONTRACT_IDENTITY                 - AgentIdentity registry address
 *   INSPECTOR_AGENT_ADDRESS           - Inspector Agent's wallet address
 *   TREASURY_AGENT_ADDRESS            - Treasury Agent's wallet address
 *                                       (Circle Developer-Controlled Wallet)
 *   INSPECTOR_METADATA_URI            - e.g. raw GitHub URL to
 *                                       metadata/inspector-agent.json
 *   TREASURY_METADATA_URI             - e.g. raw GitHub URL to
 *                                       metadata/treasury-agent.json
 */

const AGENT_IDENTITY_ABI = [
  "function registerAgent(address agent, string calldata metadataURI) external",
  "function getReputation(address agent) external view returns (uint8)",
  "function metadata(address agent) external view returns (string)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Registering from:", signer.address);

  const identityAddress = process.env.CONTRACT_IDENTITY;
  if (!identityAddress) throw new Error("Missing CONTRACT_IDENTITY in .env");

  const identity = new ethers.Contract(identityAddress, AGENT_IDENTITY_ABI, signer);

  const agents: Array<{ label: string; envAddr: string; envUri: string }> = [
    {
      label: "Inspector Agent",
      envAddr: "INSPECTOR_AGENT_ADDRESS",
      envUri: "INSPECTOR_METADATA_URI",
    },
    {
      label: "Treasury Agent",
      envAddr: "TREASURY_AGENT_ADDRESS",
      envUri: "TREASURY_METADATA_URI",
    },
  ];

  for (const agent of agents) {
    const address = process.env[agent.envAddr];
    const metadataURI = process.env[agent.envUri];

    if (!address || !metadataURI) {
      console.log(`Skipping ${agent.label}: missing ${agent.envAddr} or ${agent.envUri}`);
      continue;
    }

    console.log(`\nRegistering ${agent.label} (${address})`);
    console.log(`  metadataURI: ${metadataURI}`);

    const tx = await identity.registerAgent(address, metadataURI);
    console.log(`  tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`  confirmed in block ${receipt?.blockNumber}`);

    const reputation = await identity.getReputation(address);
    console.log(`  reputation: ${reputation}`);
  }

  console.log("\nDone. Verify on explorer: https://testnet.arcscan.app/address/" + identityAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
