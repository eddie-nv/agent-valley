# Agent Valley

Agent Valley is a full-stack TypeScript monorepo for an agent-management app with a game-like office UI.

## Stack

- Bun workspaces for package management and scripts
- TypeScript across apps and packages
- Bun-native API in `apps/api`
- Vite + PixiJS web client in `apps/web`
- Shared domain package in `packages/domain`

## Getting Started

```bash
bun install
bun run dev
```

Development ports:

- Web: http://localhost:5173
- API: http://localhost:3001

The API defaults to `AGENT_VALLEY_POOL_MODE=auto`. In auto mode it tries to read
Agent Pool state first, then falls back to an in-memory demo pool if no Agent
Pool project is configured. The demo pool starts with six idle workers and no
tasks; submitted chat tasks are claimed by workers and eventually become review
packets.

Pool modes:

- `auto`: use Agent Pool when available, otherwise use the demo pool.
- `demo`: always use the in-memory demo pool.
- `agent-pool`: require `@agent-pool/tui/server` state to be available.

## Workspace Layout

```text
apps/
  api/     Bun API service
  web/     Vite + PixiJS client
packages/
  domain/  Shared domain types and logic
```
