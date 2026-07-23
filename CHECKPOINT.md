# Mid-Hackathon Checkpoint

## What's working now
- [x] Inspector Agent — confirmed live from prior project (construct-os-v2), links added
- [x] Correction found: original deploy.ts never called registerAgent() on AgentIdentity — INSPECTOR_AGENT_ADDRESS was an address convention only, not a real registration
- [x] scripts/registerAgents.ts written — real registerAgent() calls for both Inspector + Treasury agents against existing AgentIdentity registry (0x3EC9...C2812)
- [ ] Treasury Agent identity (ERC-8004) actually registered on-chain (run script, capture tx hashes)
- [ ] Treasury Agent wallet reachable under new repo config (entity secret / wallet set carried over)
- [ ] Agent decision loop: verified signal -> risk check -> autonomous settlement call
- [ ] End-to-end test: one real Inspector -> Treasury -> on-chain USDC settlement, tx hash captured

## Reused infrastructure (see README for full table)
- ConstructOS Inspector Agent (oracle verification, ERC-8004, ERC-8183)
- ConstructOS Finance / CFEL (treasury engine, CircleSettlementAdapter)

## New for BuildFi
- Treasury Agent's own on-chain identity
- Agent decision loop (forked from circlefin/agent-stack-starter-kits, kits/claude-agent-sdk)
- Unified dashboard

## Remaining before final submission
- (fill in after checkpoint)

## Links
- Repo: (add once pushed)
- Presentation: (add)
- Demo tx / explorer link: (add once Phase 3 test passes)
