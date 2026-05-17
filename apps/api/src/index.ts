import { createAgentValleyApi, type AgentPoolServerLike } from "./app";
import { createDemoAgentPoolServer } from "./demo-pool";

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
const poolMode = Bun.env.AGENT_VALLEY_POOL_MODE?.trim() || "auto";
const agentPoolModuleName = "@agent-pool/tui/server";
const { createAgentPoolServer } = (await import(agentPoolModuleName)) as AgentPoolModule;
const realPool = createAgentPoolServer({
  dataDir: Bun.env.AGENT_POOL_DATA_DIR?.trim() || undefined,
  projectName,
  toolDir: Bun.env.AGENT_POOL_TOOL_DIR?.trim() || undefined
});
const pool = await selectPool(realPool, {
  mode: poolMode,
  projectName
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

async function selectPool(
  realPool: AgentPoolServerLike,
  options: {
    mode: string;
    projectName?: string;
  }
): Promise<AgentPoolServerLike> {
  if (options.mode === "agent-pool") {
    return realPool;
  }

  if (options.mode === "demo") {
    closePool(realPool);
    console.log("Agent Valley API using demo pool.");
    return createDemoAgentPoolServer({ projectName: options.projectName });
  }

  try {
    await realPool.getSnapshot({ projectName: options.projectName });
    return realPool;
  } catch (error) {
    closePool(realPool);
    console.log(`Agent Valley API using demo pool: ${errorMessage(error)}`);
    return createDemoAgentPoolServer({ projectName: options.projectName });
  }
}

function closePool(pool: AgentPoolServerLike): void {
  const close = (pool as { close?: () => void }).close;
  close?.call(pool);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
