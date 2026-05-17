export type WorkerStatus = "working" | "idle" | "offline" | "stale";

export type WorkerActivity =
  | "typing"
  | "whiteboard"
  | "meeting"
  | "game"
  | "kitchen"
  | "walking"
  | "ready"
  | "offline";

export type ChatMessageRole = "user" | "chief" | "worker" | "system";
export type ChatThreadKind = "chief" | "task";
export type ReviewStatus = "ready" | "accepted";
export type ValleyTaskStatus = "pending" | "in_progress" | "completed" | "blocked" | "backlogged" | "cancelled";

export interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  activity: WorkerActivity;
  location: "open_desks" | "boardroom" | "meeting_room" | "kitchen" | "game_room";
  taskId: string | null;
  taskTitle: string | null;
  thought: string;
  lastTool: string | null;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: ChatMessageRole;
  author: string;
  text: string;
  createdAt: string;
  taskId: string | null;
}

export interface ChatThread {
  id: string;
  kind: ChatThreadKind;
  title: string;
  taskId: string | null;
  workerId: string | null;
  messages: ChatMessage[];
}

export interface ValleyTask {
  id: string;
  projectName: string;
  prompt: string;
  status: ValleyTaskStatus;
  workerId: string | null;
  workerName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  priority: number;
  dependsOn: string[];
  result: string | null;
  reviewStatus: ReviewStatus | null;
}

export interface ReviewFile {
  path: string;
  summary: string;
}

export interface ReviewPacket {
  taskId: string;
  status: ReviewStatus;
  summary: string;
  result: string | null;
  logExcerpt: string;
  files: ReviewFile[];
  acceptedAt: string | null;
}

export interface PoolHealth {
  projectName: string;
  daemonRunning: boolean;
  daemonError: string | null;
  queue: {
    total: number;
    pending: number;
    inProgress: number;
    blocked: number;
    completed: number;
    backlogged: number;
    cancelled: number;
  };
}

export interface ValleySnapshot {
  generatedAt: string;
  workers: Worker[];
  tasks: ValleyTask[];
  chatThreads: ChatThread[];
  reviewQueue: ReviewPacket[];
  pool: PoolHealth;
}
