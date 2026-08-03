# BuildFi

**Autonomous programmable treasury platform for construction finance built on Arc.**

![Arc](https://img.shields.io/badge/Arc-Testnet-blue)
![Circle](https://img.shields.io/badge/Circle-Developer%20Wallets-green)
![CCTP](https://img.shields.io/badge/CCTP-V2-purple)
![ERC8004](https://img.shields.io/badge/ERC--8004-Agent%20Identity-orange)
![License](https://img.shields.io/badge/License-MIT-success)

BuildFi combines AI agents, Circle Developer-Controlled Wallets, ERC-8004 agent identities, and CCTP V2 to automate milestone verification, treasury risk evaluation, and USDC settlement without manual intervention.

![BuildFi Dashboard](https://raw.githubusercontent.com/abdulsaminu/BuildFi/main/docs/dashboard.png)
*(Note: Replace this URL with your actual hosted Vercel screenshot URL once deployed)*

---

## 🏛 Why BuildFi?

Construction payments are still largely manual, relying on inspectors, finance teams, and project managers to verify milestones before releasing funds. This process introduces delays, administrative overhead, and opportunities for disputes.

BuildFi replaces this manual workflow with autonomous AI agents that verify milestones, evaluate treasury risk, and execute programmable USDC payments on Arc. By removing humans from the payment loop, BuildFi eliminates bottlenecks and ensures contractors are paid the instant their work is verified.

## ⚡ Why Arc?

BuildFi leverages Arc's stablecoin-native architecture to simplify treasury operations. Because USDC is the native gas token on Arc, autonomous treasury agents can execute payments without requiring users to manage a separate gas asset. This drastically reduces operational complexity for construction finance and makes true 1:1 USDC settlements possible.

---

## 🧱 Foundations

BuildFi extends the foundational work of ConstructOS, a modular construction finance platform developed by the same author. BuildFi reuses proven components such as milestone verification, escrow logic, and agent identity, while introducing new autonomous treasury capabilities, Circle Developer-Controlled Wallet integration, and CCTP V2 cross-chain settlement.

BuildFi builds upon foundational components developed as part of the ConstructOS project, including:
- Construction milestone verification
- ERC-8183 escrow workflows
- ERC-8004 agent identity integration

For this hackathon, BuildFi introduces:
- Autonomous Treasury Agent
- Circle Developer-Controlled Wallet integration
- Risk-based settlement engine
- CCTP V2 cross-chain settlement
- Enterprise treasury dashboard

---

## 🛠 Technology Stack

### Blockchain
- Arc Testnet
- Solidity
- ERC-8004 Agent Identity
- ERC-8183 Escrow

### Circle
- Developer-Controlled Wallets
- CCTP V2

### Backend
- Node.js
- TypeScript
- Express
- Viem
- Hardhat

### Frontend
- React
- Vite
- CSS

### Infrastructure
- Vercel
- Railway

---

## ✨ Features

- ✅ **Autonomous Inspector Agent:** Verifies real-world construction milestones via oracle data.
- ✅ **Autonomous Treasury Agent:** Evaluates risk and executes settlements independently.
- ✅ **ERC-8004 Agent Identity:** Both agents possess distinct, registered on-chain identities.
- ✅ **Circle Developer-Controlled Wallets:** The Treasury Agent holds its own secure USDC wallet.
- ✅ **Live USDC Settlement:** Real-time, on-chain payment execution on Arc Testnet.
- ✅ **Risk Engine:** Autonomous evaluation of treasury balance and budget limits before payout.
- ✅ **CCTP V2 Cross-Chain Settlement:** Optional burning of USDC on Arc to mint on Sepolia.
- ✅ **Premium Dashboard:** Enterprise-grade UI for monitoring live agent activity.
- ✅ **Public Treasury Wallet:** Transparent demo wallet that anyone can replenish.

---

## 🔄 Architecture

### High-Level Workflow
\`\`\`text
Project Owner
    ↓
Inspector Agent
    ↓
Milestone Verified
    ↓
Treasury Agent
    ↓
Risk Check
    ↓
Circle Wallet
    ↓
USDC Settlement
    ↓
Arc Testnet
\`\`\`

### Detailed Execution Flow
\`\`\`mermaid
graph TD
    subgraph ConstructOS
        A[Inspector Agent] -->|1. Verifies Milestone| B(ConstructionEscrow)
        A -->|2. Notifies Webhook| C(Treasury Agent API)
    end

    subgraph BuildFi Treasury
        C -->|3. Fetches Live Balance| D[(Circle Wallet API)]
        C -->|4. Runs Risk Check| E{Decision Engine}
        E -->|SETTLE| F[Circle Settlement Adapter]
        E -->|HOLD| G[Flag for Review]
        F -->|5. Transfers USDC| H[Contractor Wallet]
        F -.->|Optional: CCTP V2 Burn| I[Arc Testnet]
        I -.->|Attestation| J[Sepolia Testnet]
    end
\`\`\`

---

## 🔗 Circle Integrations

BuildFi deeply integrates with Circle's developer stack to ensure secure, autonomous custody and settlement.

| Tool | Status |
|---|---|
| Developer-Controlled Wallets | ✅ Implemented |
| CCTP V2 | ✅ Implemented |
| Smart Contracts | ✅ Arc Integration |
| Paymaster | ❌ Not currently supported on Arc |
| Gateway | 🛠 Planned |
| Nano Payments | 🛠 Planned |

---

## 📊 Verified On-Chain Evidence

BuildFi's autonomous flow and cross-chain capabilities have been fully verified on-chain. 

**Arc Testnet:**
- **Inspector Agent Registration:** [https://testnet.arcscan.app/tx/0x6aa9222e28e66307fb5a99154e0738587c69b2c679f0a6bfa3cc85b7257bc2c7](https://testnet.arcscan.app/tx/0x6aa9222e28e66307fb5a99154e0738587c69b2c679f0a6bfa3cc85b7257bc2c7)
- **Treasury Agent Registration:** [https://testnet.arcscan.app/tx/0x6fd008c97c2699044e10a42f8d9091ebc46a825c33cdc5fc75e252e1323e4d30](https://testnet.arcscan.app/tx/0x6fd008c97c2699044e10a42f8d9091ebc46a825c33cdc5fc75e252e1323e4d30)
- **Autonomous Settlement TX:** [https://testnet.arcscan.app/tx/0x416269d3e670c187c2d6d0a4db244c455eef8a1b0b0cd4de8c6d491d4bc9277e](https://testnet.arcscan.app/tx/0x416269d3e670c187c2d6d0a4db244c455eef8a1b0b0cd4de8c6d491d4bc9277e)
- **Cross-Chain Burn (Arc):** [https://testnet.arcscan.app/tx/0x416269d3e670c187c2d6d0a4db244c455eef8a1b0b0cd4de8c6d491d4bc9277e](https://testnet.arcscan.app/tx/0x416269d3e670c187c2d6d0a4db244c455eef8a1b0b0cd4de8c6d491d4bc9277e)

**Ethereum Sepolia:**
- **Cross-Chain Mint (Sepolia):** [https://sepolia.etherscan.io/tx/0xbcff54a51eaddb908b6300b061a3631b0e3336aecd6dced10a28ea7abaeb87d7](https://sepolia.etherscan.io/tx/0xbcff54a51eaddb908b6300b061a3631b0e3336aecd6dced10a28ea7abaeb87d7)

---

## 💰 Public Treasury Wallet

BuildFi uses a public Circle Developer-Controlled Wallet for live demonstrations on Arc Testnet.

**Address:** \`0xa3f963861dad702fb8bb1c533c0a5e406dfb76cb\`

The treasury wallet is intentionally public for demonstration purposes during the hackathon evaluation period. Community members or judges with Arc Testnet USDC may replenish it if required.

---

## 🚀 Live Demo

BuildFi is fully self-demonstrable. Judges do not need to run any local code to experience the autonomous settlement flow.

- **Frontend (Vercel):** [https://buildfi-avk6pi55q-abdulsaminu-s-projects10.vercel.app/](https://buildfi-avk6pi55q-abdulsaminu-s-projects10.vercel.app/)
- **Backend API:** [https://buildfi-production.up.railway.app/health](https://buildfi-production.up.railway.app/health)
- **Demo Video:** Coming after submission
- **Presentation Deck:** Coming after submission

### Self-Service Demo Mode
Because the Inspector Agent runs locally during the hackathon, BuildFi includes a \`/demo/verify\` endpoint on the backend. 

1. Click **"▶ Run Live Demo"** on the dashboard.
2. The frontend sends a simulated webhook to the public Treasury Agent.
3. The Treasury Agent executes the **real** risk evaluation and **real** Circle Wallet settlement on Arc Testnet.
4. The dashboard streams the live events and displays the final, clickable Arc Testnet transaction hash.

If the treasury wallet runs low during evaluation, judges can use the **"Fund Treasury"** modal to send Arc Testnet USDC to the agent and continue testing.

---

## 📁 Project Structure

\`\`\`text
BuildFi/
├── agent/                   # Treasury Agent backend
│   ├── treasuryAgent.ts     # Express server & webhook listener
│   ├── circleSettle.ts      # Circle Wallet USDC transfer logic
│   ├── cctp.ts              # CCTP V2 burn/mint cross-chain logic
│   ├── riskCheck.ts         # Autonomous risk evaluation engine
│   └── treasuryStore.ts     # Local JSON state for budgets/burn rate
├── frontend/                # Premium React/Vite dashboard
│   ├── src/
│   │   ├── App.tsx          # Main dashboard UI & modal components
│   │   └── App.css          # Enterprise dark-mode styling
│   └── public/              # Logos and SVGs
├── scripts/                 # Utility & testing scripts
│   ├── registerAgents.ts    # ERC-8004 identity registration
│   ├── create-sepolia-wallet.ts
│   ├── test-cctp-burn.ts    # Isolated CCTP burn testing
│   └── test-cctp-mint.ts    # Isolated CCTP mint testing
├── metadata/                # ERC-8004 Agent identity JSONs
├── hardhat.config.ts        # Arc Testnet configuration
└── package.json
\`\`\`

---

## ⚙️ Setup & Local Development

### Prerequisites
*   Node.js (v18+)
*   A Circle Developer account with an API Key and Entity Secret.
*   Arc Testnet ETH and USDC.

### 1. Environment Variables
Create a \`.env\` file in the root directory:
\`\`\`env
# Arc Network
RPC_URL=https://rpc.testnet.arc.network
PRIVATE_KEY=your_deployer_private_key
CONTRACT_ESCROW=0x1D4dB36a97aFf39e93071C45A1944864d6A8E70D
CONTRACT_IDENTITY=0x3EC9Cd867B9Eaf94380bc8a20EEcC27E02AC2812

# Circle Integration
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_WALLET_SET_ID=your_wallet_set_id
TREASURY_WALLET_ID=your_treasury_wallet_id
TREASURY_WALLET_ADDRESS=0xa3f963861dad702fb8bb1c533c0a5e406dfb76cb
USDC_TOKEN_ID=your_usdc_token_id

# Agent Config
INSPECTOR_AGENT_ADDRESS=0x...
TREASURY_AGENT_ADDRESS=0xa3f963861dad702fb8bb1c533c0a5e406dfb76cb
INSPECTOR_METADATA_URI=https://raw.githubusercontent.com/abdulsaminu/BuildFi/main/metadata/inspector-agent.json
TREASURY_METADATA_URI=https://raw.githubusercontent.com/abdulsaminu/BuildFi/main/metadata/treasury-agent.json

# Server
TREASURY_AGENT_PORT=4001
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
cd frontend && npm install
\`\`\`

### 3. Run the Treasury Agent
\`\`\`bash
npx tsx agent/treasuryAgent.ts
\`\`\`

### 4. Run the Frontend
In a separate terminal:
\`\`\`bash
cd frontend
npm run dev
\`\`\`

---

## 🏆 Hackathon Submission

- **Hackathon:** Programmable Money Hackathon
- **Network:** Arc
- **Track:** Agentic Economy Track
- **Primary Innovation:** Autonomous agent-to-agent treasury execution for construction finance using programmable USDC.

---

## 🗺 Roadmap & Future Work

- **Multi-Project Treasury Pools:** Extend the Treasury Agent to manage isolated sub-pools for multiple construction projects simultaneously.
- **Role-Based Dashboards:** Introduce specific views for contractors, inspectors, and project owners.
- **Production Mainnet:** Migrate from Arc Testnet to Arc Mainnet.
- **Gateway Integration:** Incorporate Circle's Gateway API for fiat on/off-ramping.
- **Circle Paymaster:** Implement Paymaster support if/when Arc supports it.

---

## 🙏 Acknowledgements

BuildFi was built using:
- Arc Network
- Circle Developer Platform
- Encode Club
- ConstructOS (foundational research and engineering components)

---

## ⚠️ Disclaimer

BuildFi is a prototype developed for the Programmable Money Hackathon. It demonstrates autonomous treasury execution using Circle Developer-Controlled Wallets and Arc Testnet. It has not been audited and should not be used in production without further security review.

---

## 📄 License

Distributed under the MIT License. See \`LICENSE\` for more information.

---

BuildFi demonstrates how autonomous agents can transform construction finance by combining milestone verification, programmable treasury management, and stablecoin settlement into a single, transparent workflow on Arc.
