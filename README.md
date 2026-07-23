# BuildFi

**Programmable finance infrastructure for construction, powered by autonomous agents transacting on Arc.**

Submission for the Programmable Money Hackathon (Build on Arc) — Autonomous Agents track.

## What BuildFi does

BuildFi connects two autonomous agents, each with their own on-chain identity, to remove humans from the construction payment loop:

1. **Inspector Agent** verifies real-world milestone completion (vision/GPS/drone oracle data) and emits a verified signal on-chain.
2. **Treasury Agent** holds its own USDC wallet, watches for that signal, evaluates risk (budget/burn-rate), and **autonomously decides to settle payment** — no manual approval step.

This is agent-to-agent settlement: verification and payment are two independent on-chain identities transacting with each other, not a backend script moving money.

## What's reused vs. what's new

BuildFi is not built from zero — it unifies two existing, working systems into one autonomous flow for this track.

| Component | Status | Source |
|---|---|---|
| Inspector Agent (oracle verification pipeline) | **Reused, already live on Arc Testnet** | [ConstructOS Inspector](#) |
| `ConstructionEscrow` (ERC-8183) | **Reused, deployed** | ConstructOS Inspector |
| `AgentIdentity` (ERC-8004) — Inspector Agent | **Reused, deployed** | ConstructOS Inspector |
| CFEL treasury engine (event-sourced ledger, sub-pools) | **Reused** | [ConstructOS Finance](#) |
| `CircleSettlementAdapter` (USDC settlement via Circle Developer-Controlled Wallets) | **Reused, verified on-chain** | ConstructOS Finance |
| `AgentIdentity` (ERC-8004) — Treasury Agent | **New** | BuildFi |
| Agent decision loop (Claude Agent SDK, wraps settlement call in autonomous trigger + risk check) | **New** | BuildFi, forked from [circlefin/agent-stack-starter-kits](https://github.com/circlefin/agent-stack-starter-kits) |
| Unified dashboard | **New** | BuildFi |

## Architecture

```
Inspector Agent (ERC-8004)          Treasury Agent (ERC-8004)
   |  detects ProofSubmitted           |  holds Circle Agent Wallet
   |  runs oracle verification         |  watches for verified signal
   |  emits verified milestone   --->  |  runs risk check (CFEL)
   |                                   |  autonomously calls
   |                                   |  CircleSettlementAdapter
   v                                   v
ConstructionEscrow (ERC-8183)     USDC settled on Arc Testnet
```

## Status

🚧 Mid-hackathon checkpoint — in progress. See [CHECKPOINT.md](./CHECKPOINT.md) for current state.

## Stack

Arc Testnet · USDC · Circle Developer-Controlled Wallets (Agent Wallets) · Claude Agent SDK · ERC-8004 (Agent Identity) · ERC-8183 (Construction Escrow)
