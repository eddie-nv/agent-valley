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

## Workspace Layout

```text
apps/
  api/     Bun API service
  web/     Vite + PixiJS client
packages/
  domain/  Shared domain types and logic
```
