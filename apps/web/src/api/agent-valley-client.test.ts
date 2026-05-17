import { afterEach, describe, expect, test } from "bun:test";
import { HttpAgent } from "@ag-ui/client";
import type { ValleySnapshot } from "@agent-valley/domain";
import { createAgentValleyClient } from "./agent-valley-client";

const servers: Array<{ stop(force?: boolean): void }> = [];

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.stop(true);
  }
});

describe("Agent Valley client", () => {
  test("loads the session snapshot through observe mode", async () => {
    const requests: unknown[] = [];
    const server = createAgUiServer(requests, () => [
      stateSnapshot(agentValleyStateFixture())
    ]);
    const client = createAgentValleyClient({
      agent: new HttpAgent({ url: server.url })
    });

    const snapshot = await client.getSession();

    expect(snapshot.pool.projectName).toBe("demo");
    expect(readAgentPoolMode(requests[0])).toBe("observe");
  });

  test("dispatches chat tasks through AG-UI", async () => {
    const requests: unknown[] = [];
    const server = createAgUiServer(requests, () => [
      stateSnapshot(agentValleyStateFixture({ prompt: "Wire the canvas", taskStatus: "pending" })),
      {
        name: "agent_pool.task_created",
        type: "CUSTOM",
        value: {
          projectName: "demo",
          taskId: "task-1"
        }
      }
    ]);
    const client = createAgentValleyClient({
      agent: new HttpAgent({ url: server.url })
    });

    const result = await client.createChatTask({ message: "Wire the canvas" });

    expect(result.task.id).toBe("task-1");
    expect(result.task.prompt).toBe("Wire the canvas");
    expect(readAgentPoolMode(requests[0])).toBe("dispatch");
    expect(readLatestUserMessage(requests[0])).toBe("Wire the canvas");
  });

  test("subscribes to AG-UI state snapshots", async () => {
    const requests: unknown[] = [];
    const server = createAgUiServer(requests, () => [
      stateSnapshot(agentValleyStateFixture({ working: true }))
    ]);
    const snapshots: ValleySnapshot[] = [];
    const client = createAgentValleyClient({
      agent: new HttpAgent({ url: server.url })
    });

    const unsubscribe = client.subscribeToSnapshots({
      onSnapshot: (snapshot) => snapshots.push(snapshot)
    });
    await waitFor(() => snapshots.length === 1);
    unsubscribe();

    expect(readAgentPoolMode(requests[0])).toBe("observe");
    expect(snapshots[0]?.workers[0]?.name).toBe("Ada");
    expect(snapshots[0]?.workers[0]?.location).toBe("computer");
  });
});

function createAgUiServer(
  requests: unknown[],
  eventsForRequest: (requestBody: unknown) => unknown[]
): { url: string; stop(force?: boolean): void } {
  const server = Bun.serve({
    fetch: async (request) => {
      const body = await request.json();
      requests.push(body);
      return sseResponse(eventsForRequest(body));
    },
    port: 0
  });
  servers.push(server);
  return {
    stop: (force?: boolean) => server.stop(force),
    url: `http://127.0.0.1:${server.port}/api/ag-ui/agent-pool`
  };
}

function sseResponse(events: unknown[]): Response {
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream; charset=utf-8" }
  });
}

function stateSnapshot(snapshot: unknown): unknown {
  return {
    snapshot,
    type: "STATE_SNAPSHOT"
  };
}

function readAgentPoolMode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const forwardedProps = (body as { forwardedProps?: { agentPool?: { mode?: string } } }).forwardedProps;
  return forwardedProps?.agentPool?.mode;
}

function readLatestUserMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const messages = (body as { messages?: Array<{ content?: string; role?: string }> }).messages ?? [];
  return [...messages].reverse().find((message) => message.role === "user")?.content;
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for condition");
}

function agentValleyStateFixture(options: {
  prompt?: string;
  taskStatus?: "pending" | "in_progress" | "review_requested" | "completed";
  working?: boolean;
} = {}): unknown {
  const prompt = options.prompt ?? "Wire the canvas";
  const status = options.taskStatus ?? (options.working ? "in_progress" : "pending");
  return {
    agents: [
      {
        activity: options.working ? "Using edit" : "Waiting for work",
        agentId: "agent-00",
        currentTaskId: options.working ? "task-1" : null,
        heartbeatAgeMs: options.working ? 50 : null,
        lastTool: options.working ? "edit" : null,
        location: options.working ? "computer" : "kitchen",
        status: options.working ? "working" : "idle"
      }
    ],
    daemon: {
      error: null,
      running: false
    },
    project: {
      name: "demo"
    },
    queue: {
      backlogged: 0,
      blocked: 0,
      cancelled: 0,
      completed: status === "completed" ? 1 : 0,
      inProgress: status === "in_progress" ? 1 : 0,
      pending: status === "pending" ? 1 : 0,
      total: 1
    },
    reviews: [],
    tasks: [
      {
        agentId: options.working ? "agent-00" : null,
        completedAt: status === "completed" ? "2026-05-17T12:00:00.000Z" : null,
        createdAt: "2026-05-17T12:00:00.000Z",
        dependsOn: [],
        promptPreview: prompt,
        startedAt: options.working ? "2026-05-17T12:00:00.000Z" : null,
        status,
        taskId: "task-1"
      }
    ],
    version: 1
  };
}
