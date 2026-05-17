import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  createAgentValleyApi,
  type AgentPoolServerLike,
  type AgentPoolSnapshot,
  type TaskDetail,
  type TaskLogReadResult,
  type TaskSummary
} from "./app";

const now = () => new Date("2026-05-17T12:00:00.000Z");
const cleanupFns: Array<() => void> = [];

afterEach(() => {
  while (cleanupFns.length > 0) {
    cleanupFns.pop()?.();
  }
});

describe("Agent Valley API", () => {
  test("creates a dispatch task from chief chat", async () => {
    const pool = new FakeAgentPool();
    const api = createAgentValleyApi({ now, pool });

    const response = await api.fetch(jsonRequest("http://localhost/api/chat", { message: "Fix the failing tests" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(pool.tasks).toHaveLength(1);
    expect(pool.tasks[0]?.prompt).toBe("Fix the failing tests");
    expect(body.snapshot.chatThreads[0].messages.map((message: { text: string }) => message.text)).toContain(
      "Fix the failing tests"
    );
    api.close();
  });

  test("projects working, idle, offline, and stale workers from pool state", async () => {
    const pool = new FakeAgentPool();
    pool.tasks.push(
      fakeTask({ claimedBy: "agent-00", id: "task-working", status: "in_progress" }),
      fakeTask({ id: "task-ready", status: "completed" })
    );
    pool.agents = [
      fakeAgent({ agentId: "agent-00", status: "working", task: pool.tasks[0], lastTool: "editing files" }),
      fakeAgent({ agentId: "agent-01", status: "idle" }),
      fakeAgent({ agentId: "agent-02", status: "offline" }),
      fakeAgent({ agentId: "agent-03", status: "stale", lastTool: "old heartbeat" })
    ];
    const api = createAgentValleyApi({ now, pool });

    const response = await api.fetch(new Request("http://localhost/api/session"));
    const body = await response.json();
    const workers = body.snapshot.workers as Array<{ id: string; status: string; activity: string; thought: string }>;

    expect(workers.find((worker) => worker.id === "agent-00")?.status).toBe("working");
    expect(workers.find((worker) => worker.id === "agent-00")?.thought).toBe("editing files");
    expect(workers.find((worker) => worker.id === "agent-01")?.status).toBe("idle");
    expect(workers.find((worker) => worker.id === "agent-02")?.activity).toBe("offline");
    expect(workers.find((worker) => worker.id === "agent-03")?.status).toBe("stale");
    expect(body.snapshot.reviewQueue[0].taskId).toBe("task-ready");
    api.close();
  });

  test("records feedback locally without mutating the pool task", async () => {
    const pool = new FakeAgentPool();
    pool.tasks.push(fakeTask({ id: "task-feedback", status: "in_progress" }));
    const api = createAgentValleyApi({ now, pool });

    const response = await api.fetch(
      jsonRequest("http://localhost/api/tasks/task-feedback/feedback", { message: "Please keep the patch small" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(pool.tasks[0]?.status).toBe("in_progress");
    expect(body.thread.messages.map((message: { text: string }) => message.text)).toContain(
      "Please keep the patch small"
    );
    api.close();
  });

  test("interrupt cancels the Agent Pool task", async () => {
    const pool = new FakeAgentPool();
    pool.tasks.push(fakeTask({ id: "task-interrupt", status: "in_progress" }));
    const api = createAgentValleyApi({ now, pool });

    const response = await api.fetch(new Request("http://localhost/api/tasks/task-interrupt/interrupt", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(pool.tasks[0]?.status).toBe("cancelled");
    expect(body.task.status).toBe("cancelled");
    api.close();
  });

  test("accepts a review packet for a completed task", async () => {
    const pool = new FakeAgentPool();
    pool.tasks.push(fakeTask({ id: "task-review", result: "Implemented the backend MVP.", status: "completed" }));
    pool.logs.set("task-review", "changed api routes\nadded tests\n");
    const api = createAgentValleyApi({ now, pool });

    const response = await api.fetch(new Request("http://localhost/api/tasks/task-review/review/accept", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.review.status).toBe("accepted");
    expect(body.review.summary).toContain("Implemented the backend MVP");
    expect(body.review.files.map((file: { path: string }) => file.path)).toContain("agent.log");
    api.close();
  });

  test("streams projected snapshots over SSE", async () => {
    const pool = new FakeAgentPool();
    pool.tasks.push(fakeTask({ id: "task-sse", status: "in_progress" }));
    const api = createAgentValleyApi({ now, pool, ssePollIntervalMs: 10 });
    const response = await api.fetch(new Request("http://localhost/api/events"));
    const reader = response.body?.getReader();

    if (!reader) throw new Error("SSE reader missing");

    const initial = await readNextSnapshot(reader);
    expect(initial.snapshot.tasks[0]?.id).toBe("task-sse");

    await api.fetch(jsonRequest("http://localhost/api/tasks/task-sse/feedback", { message: "SSE update" }));
    const updated = await readNextSnapshot(reader);
    const taskThread = updated.snapshot.chatThreads.find((thread: { id: string }) => thread.id === "task:task-sse");
    expect(taskThread.messages.map((message: { text: string }) => message.text)).toContain("SSE update");

    await reader.cancel();
    api.close();
  });

  test("smoke tests against a real temporary Agent Pool data dir", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "agent-valley-pool-"));
    cleanupFns.push(() => rmSync(dataDir, { force: true, recursive: true }));

    const agentPoolModuleName = "@agent-pool/tui/server";
    const { createAgentPoolServer } = (await import(agentPoolModuleName)) as {
      createAgentPoolServer(options: Record<string, unknown>): AgentPoolServerLike & { close(): void };
    };

    const bootstrapPool = createAgentPoolServer({ daemonStatusTimeoutMs: 10, dataDir, toolDir: dataDir });
    bootstrapPool.close();
    seedDefaultProject(dataDir);

    const pool = createAgentPoolServer({
      daemonStatusTimeoutMs: 10,
      dataDir,
      projectName: "proj",
      toolDir: dataDir
    });
    cleanupFns.push(() => pool.close());
    const api = createAgentValleyApi({ now, pool, projectName: "proj" });

    const created = await api.fetch(jsonRequest("http://localhost/api/chat", { message: "Use the real pool" }));
    expect(created.status).toBe(201);

    const session = await api.fetch(new Request("http://localhost/api/session"));
    const body = await session.json();
    expect(body.snapshot.pool.projectName).toBe("proj");
    expect(body.snapshot.tasks[0].prompt).toBe("Use the real pool");
    api.close();
  });
});

class FakeAgentPool implements AgentPoolServerLike {
  public agents: AgentPoolSnapshot["agents"] = [];
  public logs = new Map<string, string>();
  public tasks: TaskSummary[] = [];
  private sequence = 0;

  async getSnapshot(): Promise<AgentPoolSnapshot> {
    return {
      agents: this.agents,
      daemon: { error: null, running: false },
      generatedAt: now().toISOString(),
      project: { name: "proj" },
      queue: queueSummary(this.tasks),
      tasks: this.tasks
    };
  }

  async createTask(input: { prompt: string; projectName?: string; dependsOn?: string[]; priority?: number }): Promise<TaskDetail> {
    this.sequence += 1;
    const task = fakeTask({
      dependsOn: input.dependsOn ?? [],
      id: `task-${this.sequence}`,
      priority: input.priority ?? 0,
      projectName: input.projectName ?? "proj",
      prompt: input.prompt,
      status: "pending"
    });
    this.tasks.push(task);
    return this.getTaskDetail({ taskId: task.id });
  }

  async cancelTask(input: { taskId: string }): Promise<TaskDetail> {
    const task = this.requireTask(input.taskId);
    task.status = "cancelled";
    return this.getTaskDetail(input);
  }

  async getTaskDetail(input: { taskId: string }): Promise<TaskDetail> {
    const task = this.requireTask(input.taskId);
    return {
      activeAgent: task.claimedBy ? this.agents.find((agent) => agent.agentId === task.claimedBy) ?? null : null,
      dependencies: task.dependsOn.map((id) => this.requireTask(id)),
      logs: [],
      task
    };
  }

  async readTaskLog(input: { taskId: string }): Promise<TaskLogReadResult> {
    const text = this.logs.get(input.taskId) ?? "";
    return {
      exists: Boolean(text),
      path: text ? `/tmp/${input.taskId}.log` : null,
      text,
      truncated: false
    };
  }

  private requireTask(taskId: string): TaskSummary {
    const task = this.tasks.find((candidate) => candidate.id === taskId);
    if (!task) throw new Error(`Task '${taskId}' not found`);
    return task;
  }
}

function fakeTask(input: Partial<TaskSummary> & { id: string; status: TaskSummary["status"] }): TaskSummary {
  return {
    claimedBy: null,
    completedAt: input.status === "completed" ? now().toISOString() : null,
    createdAt: now().toISOString(),
    dependsOn: [],
    priority: 0,
    projectName: "proj",
    prompt: "Demo task",
    result: null,
    startedAt: input.status === "in_progress" ? now().toISOString() : null,
    ...input,
    id: input.id,
    status: input.status
  };
}

function fakeAgent(input: {
  agentId: string;
  status: AgentPoolSnapshot["agents"][number]["status"];
  task?: TaskSummary;
  lastTool?: string;
}): AgentPoolSnapshot["agents"][number] {
  return {
    agentId: input.agentId,
    heartbeat: input.lastTool
      ? {
          lastTool: input.lastTool,
          timestamp: now().toISOString()
        }
      : null,
    status: input.status,
    task: input.task ?? null
  };
}

function queueSummary(tasks: TaskSummary[]): AgentPoolSnapshot["queue"] {
  return {
    backlogged: tasks.filter((task) => task.status === "backlogged").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    cancelled: tasks.filter((task) => task.status === "cancelled").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    pending: tasks.filter((task) => task.status === "pending").length,
    total: tasks.length
  };
}

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
}

async function readNextSnapshot(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<any> {
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Date.now() + 2000;

  while (Date.now() < deadline) {
    const read = await reader.read();
    if (read.done) throw new Error("SSE stream closed");
    buffer += decoder.decode(read.value, { stream: true });
    const messages = buffer.split("\n\n");
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      const dataLine = message.split("\n").find((line) => line.startsWith("data:"));
      if (dataLine) {
        return JSON.parse(dataLine.slice("data:".length).trim());
      }
    }
  }

  throw new Error("Timed out waiting for SSE snapshot");
}

function seedDefaultProject(dataDir: string): void {
  const db = new Database(join(dataDir, "agent-pool.db"));
  db.run(
    "INSERT INTO projects (name, source, prefix, branch, setup, is_default) VALUES (?, ?, ?, ?, ?, ?)",
    ["proj", "/tmp/source", "proj", "main", null, 1]
  );
  db.close();
}
