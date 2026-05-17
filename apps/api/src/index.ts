import { createAgentValleyApi, type AgentPoolServerLike } from "./app";
import { createDemoAgentPoolServer } from "./demo-pool";

type AgentPoolServerOptions = {
  dataDir?: string;
  projectName?: string;
  toolDir?: string;
};

type AgentPoolModule = {
  createAgentPoolServer(options?: AgentPoolServerOptions): AgentPoolServerLike & { close(): void };
};

type AgentPoolAgUiModule = {
  createAgentPoolAgUiHandler(pool: AgentPoolServerLike): (request: Request) => Promise<Response>;
};

const port = Number(Bun.env.PORT ?? 3001);
const projectName = Bun.env.AGENT_POOL_PROJECT?.trim() || undefined;
const poolMode = Bun.env.AGENT_VALLEY_POOL_MODE?.trim() || "auto";
const agentPoolModuleName = "@agent-pool/tui/server";
const agentPoolAgUiModuleName = "@agent-pool/tui/ag-ui";
const { createAgentPoolServer } = (await import(agentPoolModuleName)) as AgentPoolModule;
const { createAgentPoolAgUiHandler } = (await import(agentPoolAgUiModuleName)) as AgentPoolAgUiModule;
const realPool = createAgentPoolServer({
  dataDir: Bun.env.AGENT_POOL_DATA_DIR?.trim() || undefined,
  projectName,
  toolDir: Bun.env.AGENT_POOL_TOOL_DIR?.trim() || undefined
});
const agUiHandler = createAgentPoolAgUiHandler(realPool);
const pool = await selectPool(realPool, {
  mode: poolMode,
  projectName
});
const api = createAgentValleyApi({
  agUiHandler,
  pool,
  projectName
});

const server = Bun.serve({
  fetch: api.fetch,
  port
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    api.close();
    closePool(pool);
    if (pool !== realPool) closePool(realPool);
    server.stop(true);
    process.exit(0);
  });
}

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
    console.log("Agent Valley API using demo pool.");
    return createDemoAgentPoolServer({ projectName: options.projectName });
  }

  try {
    await realPool.getSnapshot({ projectName: options.projectName });
    return realPool;
  } catch (error) {
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
