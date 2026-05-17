import type {
  ChatMessage,
  ChatThread,
  PoolHealth,
  ReviewPacket,
  ValleySnapshot,
  ValleyTask,
  Worker
} from "@agent-valley/domain";
import type { ValleyClient, ValleySnapshotListener } from "./valley-client";

const PROJECT_NAME = "Waitlist Landing Page";
const TASK_ID = "task-1";

/** Scenario phase boundaries, in seconds. */
const PLANNING_UNTIL = 4;
const EXECUTING_UNTIL = 20;

interface ScenarioInput {
  /** Seconds since the scenario started. */
  readonly elapsedSeconds: number;
  /** Wall clock for `generatedAt` / message timestamps (epoch ms). */
  readonly nowMs: number;
  /** Extra CEO chat lines, oldest first. */
  readonly ceoMessages: readonly string[];
}

type Phase = "planning" | "executing" | "presenting";

function phaseFor(elapsedSeconds: number): Phase {
  if (elapsedSeconds < PLANNING_UNTIL) {
    return "planning";
  }

  if (elapsedSeconds < EXECUTING_UNTIL) {
    return "executing";
  }

  return "presenting";
}

function buildPool(phase: Phase): PoolHealth {
  const completed = phase === "presenting" ? 1 : 0;
  const inProgress = phase === "executing" ? 1 : 0;
  const pending = phase === "planning" ? 1 : 0;

  return {
    projectName: PROJECT_NAME,
    daemonRunning: true,
    daemonError: null,
    queue: {
      total: 1,
      pending,
      inProgress,
      blocked: 0,
      completed,
      backlogged: 0,
      cancelled: 0
    }
  };
}

function buildWorkers(phase: Phase): Worker[] {
  if (phase === "planning") {
    return [
      {
        id: "pm",
        name: "Pat",
        status: "working",
        activity: "whiteboard",
        location: "boardroom",
        taskId: TASK_ID,
        taskTitle: PROJECT_NAME,
        thought: "scoping the waitlist page",
        lastTool: null
      }
    ];
  }

  if (phase === "executing") {
    return [
      {
        id: "w-fe",
        name: "Faye",
        status: "working",
        activity: "typing",
        location: "open_desks",
        taskId: TASK_ID,
        taskTitle: PROJECT_NAME,
        thought: "building the hero + form",
        lastTool: "edit_file"
      },
      {
        id: "w-research",
        name: "Cy",
        status: "working",
        activity: "meeting",
        location: "meeting_room",
        taskId: TASK_ID,
        taskTitle: PROJECT_NAME,
        thought: "comparing waitlist providers",
        lastTool: "web_search"
      }
    ];
  }

  return [
    {
      id: "w-fe",
      name: "Faye",
      status: "idle",
      activity: "ready",
      location: "boardroom",
      taskId: TASK_ID,
      taskTitle: PROJECT_NAME,
      thought: "ready to present",
      lastTool: "edit_file"
    }
  ];
}

function buildTask(phase: Phase, nowIso: string): ValleyTask {
  const status =
    phase === "planning" ? "pending" : phase === "executing" ? "in_progress" : "completed";

  return {
    id: TASK_ID,
    projectName: PROJECT_NAME,
    prompt: "Build a landing page that lets users join a waitlist.",
    status,
    workerId: phase === "executing" ? "w-fe" : null,
    workerName: phase === "executing" ? "Faye" : null,
    createdAt: nowIso,
    startedAt: phase === "planning" ? null : nowIso,
    completedAt: phase === "presenting" ? nowIso : null,
    priority: 1,
    dependsOn: [],
    result: phase === "presenting" ? "Landing page shipped with waitlist form." : null,
    reviewStatus: phase === "presenting" ? "ready" : null
  };
}

function buildChatThreads(
  phase: Phase,
  nowIso: string,
  ceoMessages: readonly string[]
): ChatThread[] {
  const messages: ChatMessage[] = [
    {
      id: "m-0",
      threadId: "chief",
      role: "chief",
      author: "Chief of Staff",
      text: "Hello Boss. What should the crew build?",
      createdAt: nowIso,
      taskId: null
    },
    ...ceoMessages.map<ChatMessage>((text, index) => ({
      id: `m-ceo-${index}`,
      threadId: "chief",
      role: "user",
      author: "CEO",
      text,
      createdAt: nowIso,
      taskId: null
    }))
  ];

  if (phase !== "planning") {
    messages.push({
      id: "m-plan",
      threadId: "chief",
      role: "chief",
      author: "Chief of Staff",
      text: "Plan approved. Crew is executing.",
      createdAt: nowIso,
      taskId: TASK_ID
    });
  }

  return [
    {
      id: "chief",
      kind: "chief",
      title: "Chief of Staff",
      taskId: null,
      workerId: null,
      messages
    }
  ];
}

function buildReviewQueue(phase: Phase, nowIso: string): ReviewPacket[] {
  if (phase !== "presenting") {
    return [];
  }

  return [
    {
      taskId: TASK_ID,
      status: "ready",
      summary: "Waitlist landing page complete.",
      result: "Landing page shipped with waitlist form.",
      logExcerpt: "build ok\ntests ok",
      files: [
        { path: "apps/web/src/landing.tsx", summary: "Hero + waitlist form" },
        { path: "apps/web/src/landing.css", summary: "Pixel styling" }
      ],
      acceptedAt: null
    }
  ];
}

/** Pure, deterministic scenario snapshot. Exposed for testing. */
export function mockSnapshotAt(input: ScenarioInput): ValleySnapshot {
  const phase = phaseFor(input.elapsedSeconds);
  const nowIso = new Date(input.nowMs).toISOString();

  return {
    generatedAt: nowIso,
    workers: buildWorkers(phase),
    tasks: [buildTask(phase, nowIso)],
    chatThreads: buildChatThreads(phase, nowIso, input.ceoMessages),
    reviewQueue: buildReviewQueue(phase, nowIso),
    pool: buildPool(phase)
  };
}

export interface MockValleyClientOptions {
  /** Snapshot cadence in ms. Default 500. */
  readonly tickMs?: number;
  /** Injectable clock for tests. Default `Date.now`. */
  readonly now?: () => number;
}

/**
 * Scripted offline {@link ValleyClient}. Advances planning → executing →
 * presenting on a timer so the renderer can be built without the agent pool.
 */
export class MockValleyClient implements ValleyClient {
  private readonly listeners = new Set<ValleySnapshotListener>();
  private readonly ceoMessages: string[] = [];
  private readonly now: () => number;
  private readonly tickMs: number;
  private readonly startedMs: number;
  private timer: ReturnType<typeof setInterval> | undefined;

  public constructor(options: MockValleyClientOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.tickMs = options.tickMs ?? 500;
    this.startedMs = this.now();
  }

  public getSnapshot(): ValleySnapshot {
    return mockSnapshotAt({
      elapsedSeconds: (this.now() - this.startedMs) / 1000,
      nowMs: this.now(),
      ceoMessages: [...this.ceoMessages]
    });
  }

  public subscribe(listener: ValleySnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    if (this.timer === undefined) {
      this.timer = setInterval(() => this.emit(), this.tickMs);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  public sendChat(text: string): void {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return;
    }

    this.ceoMessages.push(trimmed);
    this.emit();
  }

  public dispose(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    this.listeners.clear();
  }

  private emit(): void {
    const snapshot = this.getSnapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
