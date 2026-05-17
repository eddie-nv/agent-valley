import type {
  ChatMessage,
  ChatMessageRole,
  ChatThread,
  PoolHealth,
  ReviewFile,
  ReviewPacket,
  ValleySnapshot,
  ValleyTask,
  ValleyTaskStatus,
  Worker,
  WorkerActivity,
  WorkerStatus
} from "@agent-valley/domain";

type RetryStrategy = "same" | "augmented" | "escalate";
type AgentPoolTaskStatus = "pending" | "in_progress" | "review_requested" | "completed" | "blocked" | "backlogged" | "cancelled";
type AgentPoolAgentStatus = "working" | "idle" | "offline" | "stale";

export interface AgentPoolProject {
  name: string;
}

export interface AgentPoolQueueSummary {
  total: number;
  pending: number;
  inProgress: number;
  blocked: number;
  completed: number;
  backlogged: number;
  cancelled: number;
}

export interface TaskSummary {
  id: string;
  projectName: string;
  prompt: string;
  status: AgentPoolTaskStatus;
  claimedBy: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  priority: number;
  dependsOn: string[];
  result: string | null;
}

export interface AgentSummary {
  agentId: string;
  status: AgentPoolAgentStatus;
  task: TaskSummary | null;
  heartbeat: {
    lastTool: string;
    timestamp: string;
  } | null;
}

export interface AgentPoolSnapshot {
  generatedAt: string;
  project: AgentPoolProject;
  queue: AgentPoolQueueSummary;
  tasks: TaskSummary[];
  agents: AgentSummary[];
  daemon: {
    running: boolean;
    error: string | null;
  };
}

export interface TaskDetail {
  task: TaskSummary;
  dependencies: TaskSummary[];
  logs: unknown[];
  activeAgent: AgentSummary | null;
}

export interface TaskLogReadResult {
  path: string | null;
  exists: boolean;
  truncated: boolean;
  text: string;
}

type CreateTaskInput = {
  projectName?: string;
  prompt: string;
  priority?: number;
  dependsOn?: string[];
  timeoutMinutes?: number;
  retryMax?: number;
  retryStrategy?: RetryStrategy;
  branch?: string;
  backlog?: boolean;
};

export interface AgentPoolServerLike {
  cancelTask(input: { taskId: string }): Promise<TaskDetail>;
  createTask(input: CreateTaskInput): Promise<TaskDetail>;
  getSnapshot(input?: { projectName?: string }): Promise<AgentPoolSnapshot>;
  getTaskDetail(input: { taskId: string }): Promise<TaskDetail>;
  readTaskLog(input: { taskId: string; tailLines?: number }): Promise<TaskLogReadResult>;
}

export type AgentPoolAgUiHandler = (request: Request) => Response | Promise<Response>;

export interface CreateAgentValleyApiOptions {
  agUiHandler?: AgentPoolAgUiHandler;
  pool: AgentPoolServerLike;
  projectName?: string;
  now?: () => Date;
  ssePollIntervalMs?: number;
}

export interface AgentValleyApi {
  fetch(request: Request): Promise<Response>;
  close(): void;
}

interface WorkerDefinition {
  id: string;
  name: string;
  workingActivity: WorkerActivity;
  idleActivity: WorkerActivity;
  idleLocation: Worker["location"];
  workingLocation: Worker["location"];
  idleThought: string;
}

interface MutableState {
  messages: ChatMessage[];
  acceptedReviews: Map<string, ReviewPacket>;
  subscribers: Set<SseSubscriber>;
  messageSequence: number;
}

interface SseSubscriber {
  close: () => void;
  send: () => void;
}

interface TaskDetailResponse {
  task: ValleyTask;
  dependencies: ValleyTask[];
  activeWorker: Worker | null;
  messages: ChatMessage[];
  review: ReviewPacket | null;
  latestLog: {
    exists: boolean;
    path: string | null;
    text: string;
    truncated: boolean;
  };
}

const workerDefinitions: WorkerDefinition[] = [
  {
    id: "agent-00",
    name: "Ada",
    workingActivity: "typing",
    idleActivity: "typing",
    idleLocation: "open_desks",
    workingLocation: "open_desks",
    idleThought: "ready for a task"
  },
  {
    id: "agent-01",
    name: "Bo",
    workingActivity: "whiteboard",
    idleActivity: "walking",
    idleLocation: "open_desks",
    workingLocation: "meeting_room",
    idleThought: "sketching ideas"
  },
  {
    id: "agent-02",
    name: "Cy",
    workingActivity: "meeting",
    idleActivity: "walking",
    idleLocation: "open_desks",
    workingLocation: "meeting_room",
    idleThought: "waiting for pickup"
  },
  {
    id: "agent-03",
    name: "Dee",
    workingActivity: "typing",
    idleActivity: "game",
    idleLocation: "game_room",
    workingLocation: "open_desks",
    idleThought: "playing a round"
  },
  {
    id: "agent-04",
    name: "Eli",
    workingActivity: "typing",
    idleActivity: "kitchen",
    idleLocation: "kitchen",
    workingLocation: "open_desks",
    idleThought: "grabbing a snack"
  },
  {
    id: "agent-05",
    name: "Faye",
    workingActivity: "typing",
    idleActivity: "walking",
    idleLocation: "open_desks",
    workingLocation: "open_desks",
    idleThought: "checking the board"
  }
];

export function createAgentValleyApi(options: CreateAgentValleyApiOptions): AgentValleyApi {
  const state: MutableState = {
    acceptedReviews: new Map(),
    messageSequence: 0,
    messages: [],
    subscribers: new Set()
  };
  const now = options.now ?? (() => new Date());
  const projectName = options.projectName || process.env.AGENT_POOL_PROJECT || undefined;
  const ssePollIntervalMs = options.ssePollIntervalMs ?? 1000;

  appendMessage(state, now, {
    author: "Chief of Staff",
    role: "chief",
    taskId: null,
    text: "Hello Boss. Six workers are standing by.",
    threadId: chiefThreadId()
  });

  return {
    async fetch(request: Request): Promise<Response> {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(), status: 204 });
      }

      try {
        return await routeRequest(request, {
          agUiHandler: options.agUiHandler,
          now,
          pool: options.pool,
          projectName,
          ssePollIntervalMs,
          state
        });
      } catch (error) {
        return json({ error: errorMessage(error) }, errorStatus(error));
      }
    },
    close(): void {
      for (const subscriber of state.subscribers) {
        subscriber.close();
      }
      state.subscribers.clear();
    }
  };
}

async function routeRequest(
  request: Request,
  context: {
    agUiHandler?: AgentPoolAgUiHandler;
    now: () => Date;
    pool: AgentPoolServerLike;
    projectName?: string;
    ssePollIntervalMs: number;
    state: MutableState;
  }
): Promise<Response> {
  const url = new URL(request.url);
  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/);

  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true, service: "agent-valley-api" });
  }

  if (url.pathname === "/api/ag-ui/agent-pool") {
    if (!context.agUiHandler) {
      return json({ error: "Agent Pool AG-UI handler is not configured" }, 501);
    }

    return await context.agUiHandler(request);
  }

  if (request.method === "GET" && url.pathname === "/api/session") {
    const snapshot = await createValleySnapshot(context.pool, context.state, context.now(), context.projectName);
    return json({ snapshot });
  }

  if (request.method === "POST" && url.pathname === "/api/chat") {
    const body = await readJson(request);
    const prompt = readRequiredString(body, "message", "prompt");
    const taskDetail = await context.pool.createTask({
      backlog: readOptionalBoolean(body.backlog),
      branch: readOptionalString(body.branch),
      dependsOn: readOptionalStringArray(body.dependsOn),
      priority: readOptionalNumber(body.priority),
      projectName: context.projectName,
      prompt,
      retryMax: readOptionalNumber(body.retryMax),
      retryStrategy: readOptionalRetryStrategy(body.retryStrategy),
      timeoutMinutes: readOptionalNumber(body.timeoutMinutes)
    });
    appendMessage(context.state, context.now, {
      author: "Boss",
      role: "user",
      taskId: taskDetail.task.id,
      text: prompt,
      threadId: chiefThreadId()
    });
    appendMessage(context.state, context.now, {
      author: "Chief of Staff",
      role: "chief",
      taskId: taskDetail.task.id,
      text: `Dispatch created for ${taskDetail.task.id}.`,
      threadId: chiefThreadId()
    });
    ensureTaskIntro(context.state, context.now, taskDetail.task);
    notifySubscribers(context.state);

    const snapshot = await createValleySnapshot(context.pool, context.state, context.now(), context.projectName);
    return json({ snapshot, task: toValleyTask(taskDetail.task, taskDetail.activeAgent?.agentId ?? null, null) }, 201);
  }

  if (request.method === "GET" && taskMatch?.[1] && !taskMatch[2]) {
    const detail = await createTaskDetailResponse(
      context.pool,
      context.state,
      decodeURIComponent(taskMatch[1]),
      context.projectName,
      readTailLines(url)
    );
    return json({ detail });
  }

  if (request.method === "POST" && taskMatch?.[1] && taskMatch[2] === "feedback" && !taskMatch[3]) {
    const taskId = decodeURIComponent(taskMatch[1]);
    const body = await readJson(request);
    const message = readRequiredString(body, "message", "feedback");
    await context.pool.getTaskDetail({ taskId });
    appendMessage(context.state, context.now, {
      author: "Boss",
      role: "user",
      taskId,
      text: message,
      threadId: taskThreadId(taskId)
    });
    appendMessage(context.state, context.now, {
      author: "System",
      role: "system",
      taskId,
      text: "Feedback saved in Agent Valley. Live steering will be wired when Agent Pool exposes it.",
      threadId: taskThreadId(taskId)
    });
    notifySubscribers(context.state);

    const snapshot = await createValleySnapshot(context.pool, context.state, context.now(), context.projectName);
    return json({ snapshot, thread: toTaskThread(taskId, context.state.messages) });
  }

  if (request.method === "POST" && taskMatch?.[1] && taskMatch[2] === "interrupt" && !taskMatch[3]) {
    const taskId = decodeURIComponent(taskMatch[1]);
    const taskDetail = await context.pool.cancelTask({ taskId });
    appendMessage(context.state, context.now, {
      author: "Boss",
      role: "user",
      taskId,
      text: "Interrupt this task.",
      threadId: taskThreadId(taskId)
    });
    appendMessage(context.state, context.now, {
      author: "System",
      role: "system",
      taskId,
      text: "Task cancelled in Agent Pool.",
      threadId: taskThreadId(taskId)
    });
    notifySubscribers(context.state);

    const snapshot = await createValleySnapshot(context.pool, context.state, context.now(), context.projectName);
    return json({ snapshot, task: toValleyTask(taskDetail.task, taskDetail.activeAgent?.agentId ?? null, null) });
  }

  if (request.method === "POST" && taskMatch?.[1] && taskMatch[2] === "review" && taskMatch[3] === "accept") {
    const taskId = decodeURIComponent(taskMatch[1]);
    const review = await createReviewPacket(context.pool, taskId, "accepted", context.now());
    context.state.acceptedReviews.set(taskId, review);
    appendMessage(context.state, context.now, {
      author: "Chief of Staff",
      role: "chief",
      taskId,
      text: "Review accepted. Opening presentation packet.",
      threadId: chiefThreadId()
    });
    notifySubscribers(context.state);

    const snapshot = await createValleySnapshot(context.pool, context.state, context.now(), context.projectName);
    return json({ review, snapshot });
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    return createProjectedSseResponse(context.pool, context.state, {
      now: context.now,
      pollIntervalMs: context.ssePollIntervalMs,
      projectName: context.projectName
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function createValleySnapshot(
  pool: AgentPoolServerLike,
  state: MutableState,
  generatedAt: Date,
  projectName?: string
): Promise<ValleySnapshot> {
  const poolSnapshot = await pool.getSnapshot({ projectName });
  const acceptedReviewIds = new Set(state.acceptedReviews.keys());
  const readyReviews = await Promise.all(
    poolSnapshot.tasks
      .filter((task) => (task.status === "completed" || task.status === "review_requested") && !acceptedReviewIds.has(task.id))
      .map((task) => createReviewPacket(pool, task.id, "ready", generatedAt).catch(() => null))
  );
  const reviewQueue = [
    ...readyReviews.filter((review): review is ReviewPacket => Boolean(review)),
    ...Array.from(state.acceptedReviews.values())
  ];
  const workers = createWorkers(poolSnapshot);

  return {
    chatThreads: createChatThreads(state.messages),
    generatedAt: generatedAt.toISOString(),
    pool: createPoolHealth(poolSnapshot),
    reviewQueue,
    tasks: poolSnapshot.tasks.map((task) => {
      const agent = task.claimedBy ? poolSnapshot.agents.find((candidate) => candidate.agentId === task.claimedBy) : null;
      return toValleyTask(task, task.claimedBy, reviewQueue.find((review) => review.taskId === task.id)?.status ?? null, agent?.task ?? task);
    }),
    workers
  };
}

function createWorkers(poolSnapshot: AgentPoolSnapshot): Worker[] {
  return workerDefinitions.map((definition) => {
    const poolAgent = poolSnapshot.agents.find((agent) => agent.agentId === definition.id);
    const task = poolAgent?.task ?? null;
    const status = toWorkerStatus(poolAgent?.status, task);
    const working = status === "working" && task;
    const thought = working
      ? shortText(poolAgent?.heartbeat?.lastTool || task.prompt, 30)
      : definition.idleThought;

    return {
      activity: toWorkerActivity(definition, status),
      id: definition.id,
      lastTool: poolAgent?.heartbeat?.lastTool || null,
      location: working ? definition.workingLocation : definition.idleLocation,
      name: definition.name,
      status,
      taskId: task?.id ?? null,
      taskTitle: task ? shortText(task.prompt, 64) : null,
      thought
    };
  });
}

function toWorkerStatus(poolStatus: string | undefined, task: TaskSummary | null): WorkerStatus {
  if (poolStatus === "stale") return "stale";
  if (poolStatus === "offline") return "offline";
  if (poolStatus === "working" && task) return "working";
  return "idle";
}

function toWorkerActivity(definition: WorkerDefinition, status: WorkerStatus): WorkerActivity {
  if (status === "offline" || status === "stale") return "offline";
  if (status === "working") return definition.workingActivity;
  return definition.idleActivity;
}

async function createTaskDetailResponse(
  pool: AgentPoolServerLike,
  state: MutableState,
  taskId: string,
  projectName: string | undefined,
  tailLines: number
): Promise<TaskDetailResponse> {
  const [detail, latestLog, snapshot] = await Promise.all([
    pool.getTaskDetail({ taskId }),
    pool.readTaskLog({ taskId, tailLines }),
    pool.getSnapshot({ projectName })
  ]);
  const workers = createWorkers(snapshot);
  const activeWorker = detail.activeAgent
    ? workers.find((worker) => worker.id === detail.activeAgent?.agentId) ?? null
    : null;
  const review = detail.task.status === "completed"
    ? state.acceptedReviews.get(taskId) ?? (await createReviewPacket(pool, taskId, "ready", new Date()))
    : null;

  return {
    activeWorker,
    dependencies: detail.dependencies.map((task) => toValleyTask(task, task.claimedBy, null)),
    latestLog: {
      exists: latestLog.exists,
      path: latestLog.path,
      text: latestLog.text,
      truncated: latestLog.truncated
    },
    messages: state.messages.filter((message) => message.taskId === taskId),
    review,
    task: toValleyTask(detail.task, detail.activeAgent?.agentId ?? null, review?.status ?? null)
  };
}

async function createReviewPacket(
  pool: AgentPoolServerLike,
  taskId: string,
  status: ReviewPacket["status"],
  now: Date
): Promise<ReviewPacket> {
  const [detail, latestLog] = await Promise.all([
    pool.getTaskDetail({ taskId }),
    pool.readTaskLog({ taskId, tailLines: 80 })
  ]);
  const result = detail.task.result || null;
  const summary = result
    ? shortText(result, 280)
    : `Task ${detail.task.id} is ready to present: ${shortText(detail.task.prompt, 180)}`;

  return {
    acceptedAt: status === "accepted" ? now.toISOString() : null,
    files: createPlaceholderFiles(detail, latestLog.text),
    logExcerpt: shortText(latestLog.text, 1000),
    result,
    status,
    summary,
    taskId
  };
}

function createPlaceholderFiles(detail: TaskDetail, logText: string): ReviewFile[] {
  const files: ReviewFile[] = [
    {
      path: "summary.md",
      summary: detail.task.result ? "Agent-provided result summary." : "Generated review summary placeholder."
    }
  ];

  if (logText.trim()) {
    files.push({
      path: "agent.log",
      summary: "Latest recorded task log excerpt."
    });
  }

  return files;
}

function toValleyTask(
  task: TaskSummary,
  workerId: string | null,
  reviewStatus: ReviewPacket["status"] | null,
  fallbackTask?: TaskSummary
): ValleyTask {
  const worker = workerId ? workerDefinitions.find((definition) => definition.id === workerId) ?? null : null;
  const taskForFields = fallbackTask ?? task;

  return {
    completedAt: taskForFields.completedAt,
    createdAt: taskForFields.createdAt,
    dependsOn: taskForFields.dependsOn,
    id: taskForFields.id,
    priority: taskForFields.priority,
    projectName: taskForFields.projectName,
    prompt: taskForFields.prompt,
    result: taskForFields.result,
    reviewStatus,
    startedAt: taskForFields.startedAt,
    status: taskForFields.status as ValleyTaskStatus,
    workerId,
    workerName: worker?.name ?? null
  };
}

function createPoolHealth(snapshot: AgentPoolSnapshot): PoolHealth {
  return {
    daemonError: snapshot.daemon.error,
    daemonRunning: snapshot.daemon.running,
    projectName: snapshot.project.name,
    queue: {
      backlogged: snapshot.queue.backlogged,
      blocked: snapshot.queue.blocked,
      cancelled: snapshot.queue.cancelled,
      completed: snapshot.queue.completed,
      inProgress: snapshot.queue.inProgress,
      pending: snapshot.queue.pending,
      total: snapshot.queue.total
    }
  };
}

function createChatThreads(messages: ChatMessage[]): ChatThread[] {
  const taskIds = new Set(messages.map((message) => message.taskId).filter((taskId): taskId is string => Boolean(taskId)));

  return [
    {
      id: chiefThreadId(),
      kind: "chief",
      messages: messages.filter((message) => message.threadId === chiefThreadId()),
      taskId: null,
      title: "Chief of Staff",
      workerId: null
    },
    ...Array.from(taskIds).map((taskId) => toTaskThread(taskId, messages))
  ];
}

function toTaskThread(taskId: string, messages: ChatMessage[]): ChatThread {
  return {
    id: taskThreadId(taskId),
    kind: "task",
    messages: messages.filter((message) => message.threadId === taskThreadId(taskId)),
    taskId,
    title: `Task ${taskId}`,
    workerId: null
  };
}

function ensureTaskIntro(state: MutableState, now: () => Date, task: TaskSummary): void {
  const threadId = taskThreadId(task.id);
  if (state.messages.some((message) => message.threadId === threadId)) {
    return;
  }
  appendMessage(state, now, {
    author: "Chief of Staff",
    role: "chief",
    taskId: task.id,
    text: `Dispatch brief: ${shortText(task.prompt, 160)}`,
    threadId
  });
}

function createProjectedSseResponse(
  pool: AgentPoolServerLike,
  state: MutableState,
  options: {
    now: () => Date;
    pollIntervalMs: number;
    projectName?: string;
  }
): Response {
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let lastSignature = "";
  let subscriber: SseSubscriber | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (): void => {
        if (closed) return;
        void createValleySnapshot(pool, state, options.now(), options.projectName)
          .then((snapshot) => {
            const signature = JSON.stringify(snapshot);
            if (signature === lastSignature) return;
            lastSignature = signature;
            controller.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify({ snapshot })}\n\n`));
          })
          .catch((error) => {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage(error) })}\n\n`));
          });
      };

      subscriber = {
        close: () => {
          closed = true;
          if (interval) clearInterval(interval);
        },
        send
      };
      state.subscribers.add(subscriber);
      send();
      interval = setInterval(send, options.pollIntervalMs);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
      if (subscriber) state.subscribers.delete(subscriber);
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(),
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8"
    }
  });
}

function notifySubscribers(state: MutableState): void {
  for (const subscriber of state.subscribers) {
    subscriber.send();
  }
}

function appendMessage(
  state: MutableState,
  now: () => Date,
  input: {
    author: string;
    role: ChatMessageRole;
    taskId: string | null;
    text: string;
    threadId: string;
  }
): ChatMessage {
  state.messageSequence += 1;
  const message: ChatMessage = {
    author: input.author,
    createdAt: now().toISOString(),
    id: `msg-${state.messageSequence}`,
    role: input.role,
    taskId: input.taskId,
    text: input.text,
    threadId: input.threadId
  };
  state.messages.push(message);
  return message;
}

function chiefThreadId(): string {
  return "chief-of-staff";
}

function taskThreadId(taskId: string): string {
  return `task:${taskId}`;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function readRequiredString(body: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  throw httpError(400, `${keys.join(" or ")} is required`);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
}

function readOptionalRetryStrategy(value: unknown): CreateTaskInput["retryStrategy"] | undefined {
  if (value === "same" || value === "augmented" || value === "escalate") {
    return value;
  }
  return undefined;
}

function readTailLines(url: URL): number {
  const raw = url.searchParams.get("tailLines");
  const value = raw ? Number(raw) : 80;
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 1000) : 80;
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    headers: corsHeaders(),
    status
  });
}

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-headers": "Content-Type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": "*"
  };
}

function httpError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function errorStatus(error: unknown): number {
  if (isRecord(error) && typeof error.status === "number") {
    return error.status;
  }
  const message = errorMessage(error);
  if (message.includes("not found")) return 404;
  if (message.includes("required") || message.includes("Invalid")) return 400;
  return 500;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shortText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}
