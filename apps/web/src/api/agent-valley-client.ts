import {
  HttpAgent,
  type ActivitySnapshotEvent,
  type BaseEvent,
  type CustomEvent,
  type Message,
  type RunErrorEvent,
  type RunFinishedEvent,
  type StateSnapshotEvent
} from "@ag-ui/client";
import type {
  ChatMessage,
  ChatThread,
  PoolHealth,
  ReviewPacket,
  ValleySnapshot,
  ValleyTask,
  ValleyTaskStatus,
  Worker,
  WorkerActivity,
  WorkerStatus
} from "@agent-valley/domain";

export const agentPoolAgent = new HttpAgent({
  url: "/api/ag-ui/agent-pool"
});

export interface TaskDetailView {
  task: ValleyTask;
  dependencies: ValleyTask[];
  activeWorker: Worker | null;
  messages: ChatThread["messages"];
  review: ReviewPacket | null;
  latestLog: {
    exists: boolean;
    path: string | null;
    text: string;
    truncated: boolean;
  };
}

export interface CreateChatTaskInput {
  message: string;
  priority?: number;
  dependsOn?: string[];
  timeoutMinutes?: number;
  retryMax?: number;
  retryStrategy?: "same" | "augmented" | "escalate";
  branch?: string;
  backlog?: boolean;
}

export interface CreateChatTaskResult {
  snapshot: ValleySnapshot;
  task: ValleyTask;
}

export interface FeedbackResult {
  snapshot: ValleySnapshot;
  thread: ChatThread;
}

export interface InterruptResult {
  snapshot: ValleySnapshot;
  task: ValleyTask;
}

export interface AcceptReviewResult {
  snapshot: ValleySnapshot;
  review: ReviewPacket;
}

export interface TaskDetailResult {
  detail: TaskDetailView;
}

export interface AgentValleyClient {
  getSession(): Promise<ValleySnapshot>;
  createChatTask(input: CreateChatTaskInput): Promise<CreateChatTaskResult>;
  getTaskDetail(taskId: string, options?: { tailLines?: number }): Promise<TaskDetailResult>;
  sendFeedback(taskId: string, message: string): Promise<FeedbackResult>;
  interruptTask(taskId: string): Promise<InterruptResult>;
  acceptReview(taskId: string): Promise<AcceptReviewResult>;
  requestReviewChanges(taskId: string, feedback: string): Promise<AcceptReviewResult>;
  subscribeToSnapshots(handlers: SnapshotEventHandlers): () => void;
}

export interface SnapshotEventHandlers {
  onSnapshot: (snapshot: ValleySnapshot) => void;
  onError?: (error: Error) => void;
}

export interface AgentValleyClientOptions {
  agent?: HttpAgent;
}

export type AgentPoolMode = "dispatch" | "observe" | "feedback" | "review";
export type ReviewDecision = "accept" | "request_changes";

export interface AgentPoolRunHandlers {
  onActivity?: (event: ActivitySnapshotEvent) => void;
  onCustom?: (event: CustomEvent) => void;
  onError?: (error: Error) => void;
  onFinished?: (event: RunFinishedEvent, snapshot: ValleySnapshot | null) => void;
  onRawEvent?: (event: BaseEvent) => void;
  onSnapshot?: (snapshot: ValleySnapshot, state: AgentValleyState) => void;
}

export interface DispatchRun {
  created: Promise<CreateChatTaskResult>;
  finished: Promise<RunFinishedEvent>;
  stop(): void;
}

interface AgentPoolForwardedProps {
  agentPool: {
    branch?: string;
    decision?: ReviewDecision;
    dependsOn?: string[];
    feedback?: string;
    message?: string;
    mode: AgentPoolMode;
    priority?: number;
    retryMax?: number;
    retryStrategy?: "same" | "augmented" | "escalate";
    taskId?: string;
    timeoutMinutes?: number;
  };
}

interface AgentValleyState {
  version: 1;
  project: {
    name: string;
  };
  queue: AgentPoolQueue;
  daemon: {
    running: boolean;
    error: string | null;
  };
  agents: AgentValleyAgent[];
  tasks: AgentValleyTask[];
  reviews: AgentValleyReview[];
}

interface AgentPoolQueue {
  total: number;
  pending: number;
  inProgress: number;
  blocked: number;
  reviewRequested?: number;
  completed: number;
  backlogged: number;
  cancelled: number;
}

interface AgentValleyAgent {
  agentId: string;
  status: WorkerStatus;
  location: "computer" | "whiteboard" | "kitchen" | "game_room" | "offscreen" | "needs_attention";
  activity: string;
  currentTaskId: string | null;
  lastTool: string | null;
  heartbeatAgeMs: number | null;
}

interface AgentValleyTask {
  taskId: string;
  promptPreview: string;
  status: ValleyTaskStatus;
  agentId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  dependsOn: string[];
}

interface AgentValleyReview {
  taskId: string;
  agentId: string | null;
  summaryMarkdown: string;
  artifacts: Array<{
    kind?: string;
    title?: string;
    path?: string;
    url?: string;
    text?: string;
  }>;
  changedFiles: string[];
  diffSummary: string;
}

interface ClientMemory {
  acceptedReviews: Map<string, ReviewPacket>;
  lastSnapshot: ValleySnapshot | null;
  lastState: AgentValleyState | null;
  messages: ChatMessage[];
  messageSequence: number;
}

interface RunStreamResult {
  finished: Promise<RunFinishedEvent>;
  stop(): void;
}

const chiefThreadId = "chief-of-staff";
const workerNames = ["Ada", "Bo", "Cy", "Dee", "Eli", "Faye"];
const defaultMemory = createClientMemory();

export function createAgentValleyClient(options: AgentValleyClientOptions = {}): AgentValleyClient {
  const memory = createClientMemory();
  const snapshotListeners = new Set<(snapshot: ValleySnapshot) => void>();
  const sourceAgent = options.agent ?? agentPoolAgent;

  const publishSnapshot = (snapshot: ValleySnapshot): void => {
    for (const listener of snapshotListeners) {
      listener(snapshot);
    }
  };

  const runHandlers = (handlers: AgentPoolRunHandlers = {}): AgentPoolRunHandlers => ({
    ...handlers,
    onSnapshot: (snapshot, state) => {
      handlers.onSnapshot?.(snapshot, state);
      publishSnapshot(snapshot);
    }
  });

  return {
    async getSession(): Promise<ValleySnapshot> {
      return firstObservedSnapshot(sourceAgent, memory);
    },

    async createChatTask(input: CreateChatTaskInput): Promise<CreateChatTaskResult> {
      const prompt = input.message.trim();
      if (!prompt) throw new Error("message is required");

      appendMessage(memory, {
        author: "Boss",
        role: "user",
        taskId: null,
        text: prompt,
        threadId: chiefThreadId
      });

      const run = dispatch(prompt, {
        agent: sourceAgent,
        branch: input.branch,
        dependsOn: input.dependsOn,
        handlers: runHandlers(),
        memory,
        priority: input.priority,
        retryMax: input.retryMax,
        retryStrategy: input.retryStrategy,
        timeoutMinutes: input.timeoutMinutes
      });
      void run.finished.catch((error) => {
        publishSnapshot(memory.lastSnapshot ?? emptySnapshot());
        console.error(error);
      });
      return run.created;
    },

    async getTaskDetail(taskId: string): Promise<TaskDetailResult> {
      const snapshot = memory.lastSnapshot ?? await firstObservedSnapshot(sourceAgent, memory);
      const task = snapshot.tasks.find((candidate) => candidate.id === taskId);
      if (!task) throw new Error(`Task '${taskId}' not found`);

      return {
        detail: {
          activeWorker: task.workerId ? snapshot.workers.find((worker) => worker.id === task.workerId) ?? null : null,
          dependencies: task.dependsOn
            .map((id) => snapshot.tasks.find((candidate) => candidate.id === id))
            .filter((candidate): candidate is ValleyTask => Boolean(candidate)),
          latestLog: {
            exists: false,
            path: null,
            text: "",
            truncated: false
          },
          messages: taskThread(taskId, memory.messages).messages,
          review: snapshot.reviewQueue.find((review) => review.taskId === taskId) ?? null,
          task
        }
      };
    },

    async sendFeedback(taskId: string, message: string): Promise<FeedbackResult> {
      const snapshot = await feedback(taskId, message, {
        agent: sourceAgent,
        handlers: runHandlers(),
        memory
      });
      appendMessage(memory, {
        author: "Boss",
        role: "user",
        taskId,
        text: message,
        threadId: taskThreadId(taskId)
      });
      const snapshotWithThread = withThreads(snapshot, memory);
      memory.lastSnapshot = snapshotWithThread;
      return {
        snapshot: snapshotWithThread,
        thread: taskThread(taskId, memory.messages)
      };
    },

    async interruptTask(taskId: string): Promise<InterruptResult> {
      throw new Error(`Interrupt is not available through Agent Pool AG-UI for task '${taskId}'.`);
    },

    async acceptReview(taskId: string): Promise<AcceptReviewResult> {
      return review(taskId, "accept", undefined, {
        agent: sourceAgent,
        handlers: runHandlers(),
        memory
      });
    },

    async requestReviewChanges(taskId: string, feedbackMessage: string): Promise<AcceptReviewResult> {
      return review(taskId, "request_changes", feedbackMessage, {
        agent: sourceAgent,
        handlers: runHandlers(),
        memory
      });
    },

    subscribeToSnapshots(handlers: SnapshotEventHandlers): () => void {
      snapshotListeners.add(handlers.onSnapshot);
      const stop = observe({
        agent: sourceAgent,
        handlers: {
          onError: handlers.onError,
          onSnapshot: (snapshot) => {
            handlers.onSnapshot(snapshot);
          }
        },
        memory
      });

      return () => {
        snapshotListeners.delete(handlers.onSnapshot);
        stop();
      };
    }
  };
}

export function dispatch(
  prompt: string,
  options: {
    agent?: HttpAgent;
    branch?: string;
    dependsOn?: string[];
    handlers?: AgentPoolRunHandlers;
    memory?: ClientMemory;
    priority?: number;
    retryMax?: number;
    retryStrategy?: "same" | "augmented" | "escalate";
    timeoutMinutes?: number;
  } = {}
): DispatchRun {
  const memory = options.memory ?? defaultMemory;
  let createdTaskId: string | null = null;
  let resolveCreated: (result: CreateChatTaskResult) => void = () => undefined;
  let rejectCreated: (error: Error) => void = () => undefined;
  const created = new Promise<CreateChatTaskResult>((resolve, reject) => {
    resolveCreated = resolve;
    rejectCreated = reject;
  });
  const stream = runAgUiStream(
    options.agent,
    {
      messages: [userMessage(prompt)],
      forwardedProps: {
        agentPool: {
          branch: options.branch,
          dependsOn: options.dependsOn,
          mode: "dispatch",
          priority: options.priority,
          retryMax: options.retryMax,
          retryStrategy: options.retryStrategy,
          timeoutMinutes: options.timeoutMinutes
        }
      }
    },
    memory,
    {
      ...options.handlers,
      onCustom: (event) => {
        options.handlers?.onCustom?.(event);
        if (event.name !== "agent_pool.task_created") return;

        createdTaskId = readTaskId(event.value);
        const snapshot = memory.lastSnapshot;
        const task = snapshot?.tasks.find((candidate) => candidate.id === createdTaskId);
        if (!createdTaskId || !snapshot || !task) return;

        appendMessage(memory, {
          author: "Chief of Staff",
          role: "chief",
          taskId: createdTaskId,
          text: `Dispatch created for ${createdTaskId}.`,
          threadId: chiefThreadId
        });
        ensureTaskIntro(memory, task);
        resolveCreated({ snapshot: withThreads(snapshot, memory), task });
      },
      onError: (error) => {
        options.handlers?.onError?.(error);
        rejectCreated(error);
      },
      onFinished: (event, snapshot) => {
        options.handlers?.onFinished?.(event, snapshot);
        const result = event.result as { outcome?: { reason?: string }; taskId?: string } | undefined;
        if (result?.outcome?.reason === "agent_pool:review_required") {
          const review = snapshot?.reviewQueue.find((candidate) => candidate.taskId === result.taskId);
          if (review) {
            memory.acceptedReviews.delete(review.taskId);
          }
        }
      }
    }
  );

  void stream.finished.catch((error) => {
    rejectCreated(error);
  });

  return {
    created,
    finished: stream.finished,
    stop: stream.stop
  };
}

export function observe(options: {
  agent?: HttpAgent;
  handlers?: AgentPoolRunHandlers;
  memory?: ClientMemory;
} = {}): () => void {
  return runAgUiStream(
    options.agent,
    {
      messages: [],
      forwardedProps: { agentPool: { mode: "observe" } }
    },
    options.memory ?? defaultMemory,
    options.handlers
  ).stop;
}

export async function feedback(
  taskId: string,
  message: string,
  options: {
    agent?: HttpAgent;
    handlers?: AgentPoolRunHandlers;
    memory?: ClientMemory;
  } = {}
): Promise<ValleySnapshot> {
  const memory = options.memory ?? defaultMemory;
  const stream = runAgUiStream(
    options.agent,
    {
      messages: [userMessage(message)],
      forwardedProps: {
        agentPool: {
          mode: "feedback",
          taskId
        }
      }
    },
    memory,
    options.handlers
  );
  await stream.finished;
  return memory.lastSnapshot ?? emptySnapshot();
}

export async function review(
  taskId: string,
  decision: ReviewDecision,
  feedbackMessage?: string,
  options: {
    agent?: HttpAgent;
    handlers?: AgentPoolRunHandlers;
    memory?: ClientMemory;
  } = {}
): Promise<AcceptReviewResult> {
  const memory = options.memory ?? defaultMemory;
  const existingReview = memory.lastSnapshot?.reviewQueue.find((candidate) => candidate.taskId === taskId)
    ?? memory.acceptedReviews.get(taskId)
    ?? synthesizeReview(taskId, memory.lastSnapshot);
  const stream = runAgUiStream(
    options.agent,
    {
      messages: feedbackMessage ? [userMessage(feedbackMessage)] : [],
      forwardedProps: {
        agentPool: {
          decision,
          feedback: feedbackMessage,
          mode: "review",
          taskId
        }
      }
    },
    memory,
    options.handlers
  );
  await stream.finished;

  const snapshot = memory.lastSnapshot ?? emptySnapshot();
  const returnedReview: ReviewPacket = {
    ...existingReview,
    acceptedAt: decision === "accept" ? new Date().toISOString() : null,
    status: decision === "accept" ? "accepted" : "ready"
  };
  if (decision === "accept") {
    memory.acceptedReviews.set(taskId, returnedReview);
  }

  return {
    review: returnedReview,
    snapshot: withThreads(snapshot, memory)
  };
}

function runAgUiStream(
  sourceAgent: HttpAgent | undefined,
  input: {
    forwardedProps: AgentPoolForwardedProps;
    messages: Message[];
  },
  memory: ClientMemory,
  handlers: AgentPoolRunHandlers = {}
): RunStreamResult {
  const agent = (sourceAgent ?? agentPoolAgent).clone();
  let resolveFinished: (event: RunFinishedEvent) => void = () => undefined;
  let rejectFinished: (error: Error) => void = () => undefined;
  const finished = new Promise<RunFinishedEvent>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  const subscription = agent.run({
    context: [],
    forwardedProps: input.forwardedProps,
    messages: input.messages,
    runId: crypto.randomUUID(),
    state: {},
    threadId: crypto.randomUUID(),
    tools: []
  }).subscribe({
    complete: () => undefined,
    error: (error: unknown) => {
      const normalized = toError(error);
      handlers.onError?.(normalized);
      rejectFinished(normalized);
    },
    next: (event: BaseEvent) => {
      handlers.onRawEvent?.(event);

      if (event.type === "STATE_SNAPSHOT") {
        const state = (event as StateSnapshotEvent).snapshot as AgentValleyState;
        const snapshot = mapAgentValleyState(state, memory);
        memory.lastState = state;
        memory.lastSnapshot = snapshot;
        handlers.onSnapshot?.(snapshot, state);
        return;
      }

      if (event.type === "ACTIVITY_SNAPSHOT") {
        handlers.onActivity?.(event as ActivitySnapshotEvent);
        return;
      }

      if (event.type === "CUSTOM") {
        handlers.onCustom?.(event as CustomEvent);
        return;
      }

      if (event.type === "RUN_ERROR") {
        const error = new Error((event as RunErrorEvent).message);
        handlers.onError?.(error);
        rejectFinished(error);
        return;
      }

      if (event.type === "RUN_FINISHED") {
        const finishedEvent = event as RunFinishedEvent;
        handlers.onFinished?.(finishedEvent, memory.lastSnapshot);
        resolveFinished(finishedEvent);
      }
    }
  });

  return {
    finished,
    stop: () => {
      subscription.unsubscribe();
      agent.abortRun();
    }
  };
}

function firstObservedSnapshot(agent: HttpAgent, memory: ClientMemory): Promise<ValleySnapshot> {
  return new Promise((resolve, reject) => {
    let stop = (): void => undefined;
    stop = observe({
      agent,
      handlers: {
        onError: (error) => {
          stop();
          reject(error);
        },
        onSnapshot: (snapshot) => {
          stop();
          resolve(snapshot);
        }
      },
      memory
    });
  });
}

function mapAgentValleyState(state: AgentValleyState, memory: ClientMemory): ValleySnapshot {
  const tasks = state.tasks.map((task) => toValleyTask(task, state.project.name));
  const reviews = [
    ...state.reviews.map(toReviewPacket),
    ...Array.from(memory.acceptedReviews.values())
  ];

  for (const task of tasks) {
    ensureTaskIntro(memory, task);
  }

  return {
    chatThreads: createChatThreads(memory.messages),
    generatedAt: new Date().toISOString(),
    pool: toPoolHealth(state),
    reviewQueue: reviews,
    tasks: tasks.map((task) => ({
      ...task,
      reviewStatus: reviews.find((reviewPacket) => reviewPacket.taskId === task.id)?.status ?? null
    })),
    workers: state.agents.map((agent, index) => toWorker(agent, index, tasks))
  };
}

function toWorker(agent: AgentValleyAgent, index: number, tasks: ValleyTask[]): Worker {
  const task = agent.currentTaskId ? tasks.find((candidate) => candidate.id === agent.currentTaskId) ?? null : null;
  const name = workerNames[index] ?? agent.agentId;

  return {
    activity: workerActivity(agent),
    id: agent.agentId,
    lastTool: agent.lastTool,
    location: agent.location,
    name,
    status: agent.status,
    taskId: agent.currentTaskId,
    taskTitle: task?.prompt ?? null,
    thought: agent.lastTool ?? agent.activity
  };
}

function workerActivity(agent: AgentValleyAgent): WorkerActivity {
  if (agent.status === "offline" || agent.status === "stale") return "offline";
  if (agent.location === "whiteboard" || agent.location === "needs_attention") return "whiteboard";
  if (agent.location === "kitchen") return "kitchen";
  if (agent.location === "game_room") return "game";
  return "typing";
}

function toValleyTask(task: AgentValleyTask, projectName: string): ValleyTask {
  return {
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    dependsOn: task.dependsOn,
    id: task.taskId,
    priority: 0,
    projectName,
    prompt: task.promptPreview,
    result: null,
    reviewStatus: null,
    startedAt: task.startedAt,
    status: task.status,
    workerId: task.agentId,
    workerName: task.agentId
  };
}

function toPoolHealth(state: AgentValleyState): PoolHealth {
  return {
    daemonError: state.daemon.error,
    daemonRunning: state.daemon.running,
    projectName: state.project.name,
    queue: {
      backlogged: state.queue.backlogged,
      blocked: state.queue.blocked,
      cancelled: state.queue.cancelled,
      completed: state.queue.completed,
      inProgress: state.queue.inProgress,
      pending: state.queue.pending,
      total: state.queue.total
    }
  };
}

function toReviewPacket(reviewState: AgentValleyReview): ReviewPacket {
  return {
    acceptedAt: null,
    files: reviewState.changedFiles.map((path) => ({ path, summary: "Changed by the agent." })),
    logExcerpt: reviewState.diffSummary,
    result: reviewState.summaryMarkdown,
    status: "ready",
    summary: reviewState.summaryMarkdown,
    taskId: reviewState.taskId
  };
}

function createClientMemory(): ClientMemory {
  const memory: ClientMemory = {
    acceptedReviews: new Map(),
    lastSnapshot: null,
    lastState: null,
    messageSequence: 0,
    messages: []
  };
  appendMessage(memory, {
    author: "Chief of Staff",
    role: "chief",
    taskId: null,
    text: "Hello Boss. Agent Pool is connected.",
    threadId: chiefThreadId
  });
  return memory;
}

function appendMessage(
  memory: ClientMemory,
  input: {
    author: string;
    role: ChatMessage["role"];
    taskId: string | null;
    text: string;
    threadId: string;
  }
): ChatMessage {
  memory.messageSequence += 1;
  const message: ChatMessage = {
    author: input.author,
    createdAt: new Date().toISOString(),
    id: `msg-${memory.messageSequence}`,
    role: input.role,
    taskId: input.taskId,
    text: input.text,
    threadId: input.threadId
  };
  memory.messages.push(message);
  return message;
}

function ensureTaskIntro(memory: ClientMemory, task: ValleyTask): void {
  const threadId = taskThreadId(task.id);
  if (memory.messages.some((message) => message.threadId === threadId)) return;
  appendMessage(memory, {
    author: "Chief of Staff",
    role: "chief",
    taskId: task.id,
    text: `Dispatch brief: ${task.prompt}`,
    threadId
  });
}

function createChatThreads(messages: ChatMessage[]): ChatThread[] {
  const taskIds = new Set(messages.map((message) => message.taskId).filter((taskId): taskId is string => Boolean(taskId)));

  return [
    {
      id: chiefThreadId,
      kind: "chief",
      messages: messages.filter((message) => message.threadId === chiefThreadId),
      taskId: null,
      title: "Chief of Staff",
      workerId: null
    },
    ...Array.from(taskIds).map((taskId) => taskThread(taskId, messages))
  ];
}

function taskThread(taskId: string, messages: ChatMessage[]): ChatThread {
  return {
    id: taskThreadId(taskId),
    kind: "task",
    messages: messages.filter((message) => message.threadId === taskThreadId(taskId)),
    taskId,
    title: `Task ${taskId}`,
    workerId: null
  };
}

function taskThreadId(taskId: string): string {
  return `task:${taskId}`;
}

function withThreads(snapshot: ValleySnapshot, memory: ClientMemory): ValleySnapshot {
  return {
    ...snapshot,
    chatThreads: createChatThreads(memory.messages)
  };
}

function synthesizeReview(taskId: string, snapshot: ValleySnapshot | null): ReviewPacket {
  const task = snapshot?.tasks.find((candidate) => candidate.id === taskId);
  return {
    acceptedAt: null,
    files: [],
    logExcerpt: "",
    result: task?.result ?? null,
    status: "ready",
    summary: task ? `Task ${task.id} is ready for review.` : `Task ${taskId} is ready for review.`,
    taskId
  };
}

function userMessage(content: string): Message {
  return {
    content,
    id: crypto.randomUUID(),
    role: "user"
  };
}

function readTaskId(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("taskId" in value)) return null;
  const taskId = (value as { taskId?: unknown }).taskId;
  return typeof taskId === "string" ? taskId : null;
}

function emptySnapshot(): ValleySnapshot {
  return {
    chatThreads: createChatThreads(defaultMemory.messages),
    generatedAt: new Date().toISOString(),
    pool: {
      daemonError: null,
      daemonRunning: false,
      projectName: "unknown",
      queue: {
        backlogged: 0,
        blocked: 0,
        cancelled: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        total: 0
      }
    },
    reviewQueue: [],
    tasks: [],
    workers: []
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
