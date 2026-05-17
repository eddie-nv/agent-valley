import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "fs";
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

  test("passes AG-UI POST requests through without buffering the stream", async () => {
    const pool = new FakeAgentPool();
    let observedMode: string | undefined;
    const api = createAgentValleyApi({
      agUiHandler: async (request) => {
        const body = await request.json() as { forwardedProps?: { agentPool?: { mode?: string } } };
        observedMode = body.forwardedProps?.agentPool?.mode;
        return new Response(`data: ${JSON.stringify({ type: "RUN_STARTED" })}\n\n`, {
          headers: { "content-type": "text/event-stream; charset=utf-8" }
        });
      },
      now,
      pool
    });

    const response = await api.fetch(agUiRequest({ forwardedProps: { agentPool: { mode: "observe" } } }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(observedMode).toBe("observe");
    expect(text).toContain("RUN_STARTED");
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

  test("smoke tests Agent Pool AG-UI through the Agent Valley route", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "agent-valley-ag-ui-"));
    cleanupFns.push(() => rmSync(dataDir, { force: true, recursive: true }));

    const agentPoolModuleName = "@agent-pool/tui/server";
    const agentPoolAgUiModuleName = "@agent-pool/tui/ag-ui";
    const { createAgentPoolServer } = (await import(agentPoolModuleName)) as {
      createAgentPoolServer(options: Record<string, unknown>): AgentPoolServerLike & { close(): void };
    };
    const { createAgentPoolAgUiHandler } = (await import(agentPoolAgUiModuleName)) as {
      createAgentPoolAgUiHandler(
        pool: AgentPoolServerLike,
        options?: { pollIntervalMs?: number }
      ): (request: Request) => Promise<Response>;
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
    const api = createAgentValleyApi({
      agUiHandler: createAgentPoolAgUiHandler(pool, { pollIntervalMs: 10 }),
      now,
      pool,
      projectName: "proj"
    });

    const observeResponse = await api.fetch(agUiRequest({ forwardedProps: { agentPool: { mode: "observe" } } }));
    expect(observeResponse.headers.get("content-type")).toContain("text/event-stream");
    const observeReader = observeResponse.body?.getReader();
    if (!observeReader) throw new Error("Observe reader missing");
    const observed = await readNextAgUiEvent(observeReader, (event) => event.type === "STATE_SNAPSHOT");
    expect(observed.snapshot.tasks).toHaveLength(0);
    await observeReader.cancel();

    const dispatchResponse = await api.fetch(agUiRequest({
      forwardedProps: { agentPool: { mode: "dispatch" } },
      messages: [{ id: "message-1", role: "user", content: "AG-UI dispatch smoke" }]
    }));
    expect(dispatchResponse.headers.get("content-type")).toContain("text/event-stream");
    const dispatchReader = dispatchResponse.body?.getReader();
    if (!dispatchReader) throw new Error("Dispatch reader missing");
    const created = await readNextAgUiEvent(
      dispatchReader,
      (event) => event.type === "CUSTOM" && event.name === "agent_pool.task_created"
    );
    const createdTaskId = String(created.value.taskId);
    expect((await pool.getTaskDetail({ taskId: createdTaskId })).task.prompt).toContain("AG-UI dispatch smoke");
    await dispatchReader.cancel();

    const active = await pool.createTask({ projectName: "proj", prompt: "active feedback task" });
    seedLockedClone(dataDir);
    markTaskStatus(dataDir, active.task.id, "in_progress", "agent-00");
    const feedbackResponse = await api.fetch(agUiRequest({
      forwardedProps: { agentPool: { mode: "feedback", taskId: active.task.id } },
      messages: [{ id: "message-2", role: "user", content: "Mailbox update" }]
    }));
    const feedbackReader = feedbackResponse.body?.getReader();
    if (!feedbackReader) throw new Error("Feedback reader missing");
    const delivered = await readNextAgUiEvent(
      feedbackReader,
      (event) => event.type === "CUSTOM" && event.name === "agent_pool.feedback_delivered"
    );
    expect(delivered.value.taskId).toBe(active.task.id);
    expect(readFileSync(join(dataDir, "proj-00", ".mailbox"), "utf-8")).toBe("Mailbox update");
    await readNextAgUiEvent(feedbackReader, (event) => event.type === "RUN_FINISHED");
    await feedbackReader.cancel();

    const reviewTask = await pool.createTask({ projectName: "proj", prompt: "review accept task" });
    markTaskStatus(dataDir, reviewTask.task.id, "review_requested", "agent-00", "Ready for review.");
    const reviewResponse = await api.fetch(agUiRequest({
      forwardedProps: { agentPool: { decision: "accept", mode: "review", taskId: reviewTask.task.id } }
    }));
    const reviewReader = reviewResponse.body?.getReader();
    if (!reviewReader) throw new Error("Review reader missing");
    await readNextAgUiEvent(reviewReader, (event) => event.type === "RUN_FINISHED");
    expect((await pool.getTaskDetail({ taskId: reviewTask.task.id })).task.status).toBe("completed");
    await reviewReader.cancel();
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

function agUiRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/ag-ui/agent-pool", {
    body: JSON.stringify({
      context: [],
      messages: [],
      runId: crypto.randomUUID(),
      state: {},
      threadId: crypto.randomUUID(),
      tools: [],
      ...body
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
}

async function readNextSnapshot(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<any> {
  return readNextAgUiEvent(reader, (event) => Boolean(event.snapshot));
}

async function readNextAgUiEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  predicate: (event: any) => boolean
): Promise<any> {
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
        const event = JSON.parse(dataLine.slice("data:".length).trim());
        if (predicate(event)) return event;
      }
    }
  }

  throw new Error("Timed out waiting for SSE event");
}

function seedDefaultProject(dataDir: string): void {
  const db = new Database(join(dataDir, "agent-pool.db"));
  db.run(
    "INSERT INTO projects (name, source, prefix, branch, setup, is_default) VALUES (?, ?, ?, ?, ?, ?)",
    ["proj", "/tmp/source", "proj", "main", null, 1]
  );
  db.close();
}

function seedLockedClone(dataDir: string): void {
  mkdirSync(join(dataDir, "proj-00"), { recursive: true });
  const db = new Database(join(dataDir, "agent-pool.db"));
  db.run(
    "INSERT OR REPLACE INTO clones (project_name, clone_index, locked, workspace_id, locked_at, branch, workspace_ref) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["proj", 0, 1, "surface:1", now().toISOString(), "main", ""]
  );
  db.close();
}

function markTaskStatus(
  dataDir: string,
  taskId: string,
  status: string,
  claimedBy: string | null,
  result: string | null = null
): void {
  const db = new Database(join(dataDir, "agent-pool.db"));
  db.run(
    "UPDATE tasks SET status = ?, claimed_by = ?, started_at = COALESCE(started_at, ?), completed_at = ?, result = COALESCE(?, result) WHERE id = ?",
    [
      status,
      claimedBy,
      now().toISOString(),
      status === "in_progress" ? null : now().toISOString(),
      result,
      taskId
    ]
  );
  db.close();
}
