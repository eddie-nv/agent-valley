import { createAgentValleyApi, type AgentPoolServerLike } from "./app";

type AgentPoolServerOptions = {
  dataDir?: string;
  projectName?: string;
  toolDir?: string;
};

type AgentPoolModule = {
  createAgentPoolServer(options?: AgentPoolServerOptions): AgentPoolServerLike;
};

const port = Number(Bun.env.PORT ?? 3001);
const projectName = Bun.env.AGENT_POOL_PROJECT?.trim() || undefined;
const agentPoolModuleName = "@agent-pool/tui/server";
const { createAgentPoolServer } = (await import(agentPoolModuleName)) as AgentPoolModule;
const pool = createAgentPoolServer({
  dataDir: Bun.env.AGENT_POOL_DATA_DIR?.trim() || undefined,
  projectName,
  toolDir: Bun.env.AGENT_POOL_TOOL_DIR?.trim() || undefined
});
const api = createAgentValleyApi({
  pool,
  projectName
});

Bun.serve({
  fetch: api.fetch,
  port
});

console.log(`Agent Valley API listening on http://localhost:${port}`);
