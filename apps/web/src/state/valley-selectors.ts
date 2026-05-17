import type { ChatThread, ReviewPacket, ValleyTask, Worker } from "@agent-valley/domain";
import type { ValleyClientState } from "./valley-store";

export function selectWorkers(state: ValleyClientState): Worker[] {
  return state.snapshot?.workers ?? [];
}

export function selectWorker(state: ValleyClientState, workerId: string | null): Worker | null {
  if (!workerId) return null;
  return state.snapshot?.workers.find((worker) => worker.id === workerId) ?? null;
}

export function selectSelectedWorker(state: ValleyClientState): Worker | null {
  return selectWorker(state, state.ui.selectedWorkerId);
}

export function selectTasks(state: ValleyClientState): ValleyTask[] {
  return state.snapshot?.tasks ?? [];
}

export function selectTask(state: ValleyClientState, taskId: string | null): ValleyTask | null {
  if (!taskId) return null;
  return state.snapshot?.tasks.find((task) => task.id === taskId) ?? null;
}

export function selectSelectedTask(state: ValleyClientState): ValleyTask | null {
  return selectTask(state, state.ui.selectedTaskId);
}

export function selectThreads(state: ValleyClientState): ChatThread[] {
  return state.snapshot?.chatThreads ?? [];
}

export function selectActiveThread(state: ValleyClientState): ChatThread | null {
  return state.snapshot?.chatThreads.find((thread) => thread.id === state.ui.activeThreadId) ?? null;
}

export function selectTaskThread(state: ValleyClientState, taskId: string): ChatThread | null {
  return state.snapshot?.chatThreads.find((thread) => thread.id === `task:${taskId}`) ?? null;
}

export function selectReadyReviews(state: ValleyClientState): ReviewPacket[] {
  return state.snapshot?.reviewQueue.filter((review) => review.status === "ready") ?? [];
}

export function selectHasActiveWork(state: ValleyClientState): boolean {
  return Boolean(
    state.snapshot?.tasks.some((task) => task.status === "pending" || task.status === "in_progress")
  );
}
