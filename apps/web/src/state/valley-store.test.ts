import { describe, expect, test } from "bun:test";
import type { ReviewPacket, ValleySnapshot } from "@agent-valley/domain";
import type {
  AgentValleyClient,
  CreateChatTaskInput,
  CreateChatTaskResult,
  FeedbackResult,
  InterruptResult,
  TaskDetailResult
} from "../api/agent-valley-client";
import { createValleyStore } from "./valley-store";

describe("Valley store", () => {
  test("starts from the backend session and accepts live snapshots", async () => {
    const client = new FakeClient(snapshotFixture());
    const store = createValleyStore({ client });

    await store.start();

    expect(store.getState().connection.status).toBe("connected");
    expect(store.getState().snapshot?.workers[0]?.status).toBe("idle");

    client.emitSnapshot(snapshotFixture({ working: true }));

    expect(store.getState().snapshot?.workers[0]?.status).toBe("working");
    expect(store.getState().snapshot?.tasks[0]?.status).toBe("in_progress");

    store.stop();
    expect(store.getState().connection.status).toBe("closed");
  });

  test("submits chat and selects the created task thread", async () => {
    const client = new FakeClient(snapshotFixture());
    const store = createValleyStore({ client });

    const result = await store.submitChat("Build the API hooks");
    const state = store.getState();

    expect(result.task.id).toBe("task-1");
    expect(client.createdMessages).toEqual(["Build the API hooks"]);
    expect(state.snapshot?.tasks[0]?.prompt).toBe("Build the API hooks");
    expect(state.ui.selectedTaskId).toBe("task-1");
    expect(state.ui.activeThreadId).toBe("task:task-1");
    expect(state.pending.submitChat).toBe(false);
  });

  test("accepts reviews into local presentation state", async () => {
    const review: ReviewPacket = {
      acceptedAt: "2026-05-17T12:00:00.000Z",
      files: [{ path: "summary.md", summary: "Work summary" }],
      logExcerpt: "done",
      result: "Done",
      status: "accepted",
      summary: "Ready to present",
      taskId: "task-1"
    };
    const client = new FakeClient(snapshotFixture({ review }));
    const store = createValleyStore({ client });

    await store.acceptReview("task-1");

    expect(store.getState().ui.presentation?.summary).toBe("Ready to present");
    expect(store.getState().ui.selectedTaskId).toBe("task-1");
    expect(store.getState().pending.acceptReviewTaskIds).toEqual([]);
  });
});

class FakeClient implements AgentValleyClient {
  public createdMessages: string[] = [];
  private handlers: Array<(snapshot: ValleySnapshot) => void> = [];

  public constructor(private snapshot: ValleySnapshot) {}

  async getSession(): Promise<ValleySnapshot> {
    return this.snapshot;
  }

  async createChatTask(input: CreateChatTaskInput): Promise<CreateChatTaskResult> {
    this.createdMessages.push(input.message);
    this.snapshot = snapshotFixture({ message: input.message, working: true });
    return {
      snapshot: this.snapshot,
      task: this.snapshot.tasks[0]!
    };
  }

  async getTaskDetail(_taskId: string): Promise<TaskDetailResult> {
    return {
      detail: {
        activeWorker: this.snapshot.workers[0] ?? null,
        dependencies: [],
        latestLog: {
          exists: true,
          path: "/tmp/task.log",
          text: "done",
          truncated: false
        },
        messages: [],
        review: null,
        task: this.snapshot.tasks[0]!
      }
    };
  }

  async sendFeedback(taskId: string, message: string): Promise<FeedbackResult> {
    return {
      snapshot: this.snapshot,
      thread: {
        id: `task:${taskId}`,
        kind: "task",
        messages: [
          {
            author: "Boss",
            createdAt: "2026-05-17T12:00:00.000Z",
            id: "msg-1",
            role: "user",
            taskId,
            text: message,
            threadId: `task:${taskId}`
          }
        ],
        taskId,
        title: `Task ${taskId}`,
        workerId: null
      }
    };
  }

  async interruptTask(taskId: string): Promise<InterruptResult> {
    this.snapshot = snapshotFixture({ status: "cancelled" });
    return {
      snapshot: this.snapshot,
      task: { ...this.snapshot.tasks[0]!, id: taskId }
    };
  }

  async acceptReview(taskId: string): Promise<{ snapshot: ValleySnapshot; review: ReviewPacket }> {
    const review: ReviewPacket = {
      acceptedAt: "2026-05-17T12:00:00.000Z",
      files: [{ path: "summary.md", summary: "Work summary" }],
      logExcerpt: "done",
      result: "Done",
      status: "accepted",
      summary: "Ready to present",
      taskId
    };
    this.snapshot = snapshotFixture({ review, status: "completed" });
    return { review, snapshot: this.snapshot };
  }

  async requestReviewChanges(taskId: string, feedback: string): Promise<{ snapshot: ValleySnapshot; review: ReviewPacket }> {
    const review: ReviewPacket = {
      acceptedAt: null,
      files: [{ path: "summary.md", summary: feedback }],
      logExcerpt: "changes requested",
      result: feedback,
      status: "ready",
      summary: feedback,
      taskId
    };
    this.snapshot = snapshotFixture({ status: "pending" });
    return { review, snapshot: this.snapshot };
  }

  subscribeToSnapshots(handlers: { onSnapshot: (snapshot: ValleySnapshot) => void }): () => void {
    this.handlers.push(handlers.onSnapshot);
    return () => {
      this.handlers = this.handlers.filter((handler) => handler !== handlers.onSnapshot);
    };
  }

  emitSnapshot(snapshot: ValleySnapshot): void {
    this.snapshot = snapshot;
    for (const handler of this.handlers) {
      handler(snapshot);
    }
  }
}

function snapshotFixture(options: {
  message?: string;
  review?: ReviewPacket;
  status?: ValleySnapshot["tasks"][number]["status"];
  working?: boolean;
} = {}): ValleySnapshot {
  const status = options.status ?? (options.working ? "in_progress" : "pending");
  return {
    chatThreads: [
      {
        id: "chief-of-staff",
        kind: "chief",
        messages: [],
        taskId: null,
        title: "Chief of Staff",
        workerId: null
      },
      {
        id: "task:task-1",
        kind: "task",
        messages: [],
        taskId: "task-1",
        title: "Task task-1",
        workerId: null
      }
    ],
    generatedAt: "2026-05-17T12:00:00.000Z",
    pool: {
      daemonError: null,
      daemonRunning: false,
      projectName: "demo",
      queue: {
        backlogged: 0,
        blocked: 0,
        cancelled: status === "cancelled" ? 1 : 0,
        completed: status === "completed" ? 1 : 0,
        inProgress: status === "in_progress" ? 1 : 0,
        pending: status === "pending" ? 1 : 0,
        total: 1
      }
    },
    reviewQueue: options.review ? [options.review] : [],
    tasks: [
      {
        completedAt: status === "completed" ? "2026-05-17T12:00:00.000Z" : null,
        createdAt: "2026-05-17T12:00:00.000Z",
        dependsOn: [],
        id: "task-1",
        priority: 0,
        projectName: "demo",
        prompt: options.message ?? "Build the API hooks",
        result: status === "completed" ? "Done" : null,
        reviewStatus: options.review?.status ?? null,
        startedAt: options.working ? "2026-05-17T12:00:00.000Z" : null,
        status,
        workerId: options.working ? "agent-00" : null,
        workerName: options.working ? "Ada" : null
      }
    ],
    workers: [
      {
        activity: options.working ? "typing" : "kitchen",
        id: "agent-00",
        lastTool: options.working ? "editing files" : null,
        location: options.working ? "open_desks" : "kitchen",
        name: "Ada",
        status: options.working ? "working" : "idle",
        taskId: options.working ? "task-1" : null,
        taskTitle: options.working ? "Build the API hooks" : null,
        thought: options.working ? "editing files" : "ready"
      }
    ]
  };
}
