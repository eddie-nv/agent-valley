import type { ReviewPacket, ValleySnapshot } from "@agent-valley/domain";
import type {
  AgentValleyClient,
  CreateChatTaskInput,
  CreateChatTaskResult,
  FeedbackResult,
  InterruptResult,
  TaskDetailView,
  TaskDetailResult
} from "../api/agent-valley-client";
import { selectTask as selectTaskFromState, selectWorker as selectWorkerFromState } from "./valley-selectors";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error" | "closed";

export interface ValleyClientState {
  snapshot: ValleySnapshot | null;
  connection: {
    status: ConnectionStatus;
    error: string | null;
  };
  pending: {
    detailTaskIds: string[];
    refresh: boolean;
    submitChat: boolean;
    feedbackTaskIds: string[];
    interruptTaskIds: string[];
    acceptReviewTaskIds: string[];
  };
  taskDetails: Record<string, TaskDetailView>;
  ui: {
    activeThreadId: string;
    chatDraft: string;
    presentation: ReviewPacket | null;
    selectedTaskId: string | null;
    selectedWorkerId: string | null;
  };
}

export interface ValleyStore {
  getState(): ValleyClientState;
  subscribe(listener: ValleyStoreListener): () => void;
  start(): Promise<void>;
  stop(): void;
  refresh(): Promise<ValleySnapshot>;
  submitChat(input: string | CreateChatTaskInput): Promise<CreateChatTaskResult>;
  loadTaskDetail(taskId: string, options?: { tailLines?: number }): Promise<TaskDetailResult>;
  sendFeedback(taskId: string, message: string): Promise<FeedbackResult>;
  interruptTask(taskId: string): Promise<InterruptResult>;
  acceptReview(taskId: string): Promise<ReviewPacket>;
  requestReviewChanges(taskId: string, feedback: string): Promise<ReviewPacket>;
  selectThread(threadId: string): void;
  selectTask(taskId: string | null): void;
  selectWorker(workerId: string | null): void;
  setChatDraft(value: string): void;
  closePresentation(): void;
}

export type ValleyStoreListener = (state: ValleyClientState, previousState: ValleyClientState) => void;

export interface ValleyStoreOptions {
  client: AgentValleyClient;
}

const chiefThreadId = "chief-of-staff";

export function createValleyStore(options: ValleyStoreOptions): ValleyStore {
  let state = createInitialState();
  const listeners = new Set<ValleyStoreListener>();
  let unsubscribeEvents: (() => void) | null = null;

  const setState = (updater: (current: ValleyClientState) => ValleyClientState): void => {
    const previous = state;
    state = updater(state);
    if (previous === state) return;

    for (const listener of listeners) {
      listener(state, previous);
    }
  };

  const setSnapshot = (snapshot: ValleySnapshot): void => {
    setState((current) => ({
      ...current,
      connection: { error: null, status: "connected" },
      snapshot,
      ui: reconcileUi(current.ui, snapshot)
    }));
  };

  const setConnectionError = (error: unknown): void => {
    setState((current) => ({
      ...current,
      connection: {
        error: errorMessage(error),
        status: current.snapshot ? "reconnecting" : "error"
      }
    }));
  };

  const store: ValleyStore = {
    getState(): ValleyClientState {
      return state;
    },

    subscribe(listener: ValleyStoreListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async start(): Promise<void> {
      if (unsubscribeEvents) {
        await store.refresh();
        return;
      }

      setState((current) => ({
        ...current,
        connection: { error: null, status: "connecting" }
      }));

      try {
        await store.refresh();
      } catch (error) {
        setConnectionError(error);
      }

      unsubscribeEvents = options.client.subscribeToSnapshots({
        onError: setConnectionError,
        onSnapshot: setSnapshot
      });
    },

    stop(): void {
      unsubscribeEvents?.();
      unsubscribeEvents = null;
      setState((current) => ({
        ...current,
        connection: { error: null, status: "closed" }
      }));
    },

    async refresh(): Promise<ValleySnapshot> {
      setState((current) => ({
        ...current,
        pending: { ...current.pending, refresh: true }
      }));

      try {
        const snapshot = await options.client.getSession();
        setSnapshot(snapshot);
        return snapshot;
      } catch (error) {
        setConnectionError(error);
        throw error;
      } finally {
        setState((current) => ({
          ...current,
          pending: { ...current.pending, refresh: false }
        }));
      }
    },

    async submitChat(input: string | CreateChatTaskInput): Promise<CreateChatTaskResult> {
      const payload = typeof input === "string" ? { message: input } : input;
      setState((current) => ({
        ...current,
        pending: { ...current.pending, submitChat: true }
      }));

      try {
        const result = await options.client.createChatTask(payload);
        setSnapshot(result.snapshot);
        store.selectTask(result.task.id);
        store.selectThread(`task:${result.task.id}`);
        return result;
      } catch (error) {
        setConnectionError(error);
        throw error;
      } finally {
        setState((current) => ({
          ...current,
          pending: { ...current.pending, submitChat: false }
        }));
      }
    },

    async loadTaskDetail(taskId: string, detailOptions: { tailLines?: number } = {}): Promise<TaskDetailResult> {
      setTaskPending("detailTaskIds", taskId, true);

      try {
        const result = await options.client.getTaskDetail(taskId, detailOptions);
        setState((current) => ({
          ...current,
          taskDetails: {
            ...current.taskDetails,
            [taskId]: result.detail
          }
        }));
        return result;
      } catch (error) {
        setConnectionError(error);
        throw error;
      } finally {
        setTaskPending("detailTaskIds", taskId, false);
      }
    },

    async sendFeedback(taskId: string, message: string): Promise<FeedbackResult> {
      setTaskPending("feedbackTaskIds", taskId, true);

      try {
        const result = await options.client.sendFeedback(taskId, message);
        setSnapshot(result.snapshot);
        store.selectThread(`task:${taskId}`);
        return result;
      } catch (error) {
        setConnectionError(error);
        throw error;
      } finally {
        setTaskPending("feedbackTaskIds", taskId, false);
      }
    },

    async interruptTask(taskId: string): Promise<InterruptResult> {
      setTaskPending("interruptTaskIds", taskId, true);

      try {
        const result = await options.client.interruptTask(taskId);
        setSnapshot(result.snapshot);
        store.selectTask(taskId);
        return result;
      } catch (error) {
        setConnectionError(error);
        throw error;
      } finally {
        setTaskPending("interruptTaskIds", taskId, false);
      }
    },

    async acceptReview(taskId: string): Promise<ReviewPacket> {
      setTaskPending("acceptReviewTaskIds", taskId, true);

      try {
        const result = await options.client.acceptReview(taskId);
        setSnapshot(result.snapshot);
        setState((current) => ({
          ...current,
          ui: {
            ...current.ui,
            presentation: result.review,
            selectedTaskId: taskId
          }
        }));
        return result.review;
      } catch (error) {
        setConnectionError(error);
        throw error;
      } finally {
        setTaskPending("acceptReviewTaskIds", taskId, false);
      }
    },

    async requestReviewChanges(taskId: string, feedback: string): Promise<ReviewPacket> {
      setTaskPending("acceptReviewTaskIds", taskId, true);

      try {
        const result = await options.client.requestReviewChanges(taskId, feedback);
        setSnapshot(result.snapshot);
        setState((current) => ({
          ...current,
          ui: {
            ...current.ui,
            presentation: null,
            selectedTaskId: taskId
          }
        }));
        return result.review;
      } catch (error) {
        setConnectionError(error);
        throw error;
      } finally {
        setTaskPending("acceptReviewTaskIds", taskId, false);
      }
    },

    selectThread(threadId: string): void {
      setState((current) => ({
        ...current,
        ui: {
          ...current.ui,
          activeThreadId: threadId
        }
      }));
    },

    selectTask(taskId: string | null): void {
      setState((current) => {
        const task = selectTaskFromState(current, taskId);
        return {
          ...current,
          ui: {
            ...current.ui,
            activeThreadId: task ? `task:${task.id}` : current.ui.activeThreadId,
            selectedTaskId: task?.id ?? null,
            selectedWorkerId: task?.workerId ?? current.ui.selectedWorkerId
          }
        };
      });
    },

    selectWorker(workerId: string | null): void {
      setState((current) => {
        const worker = selectWorkerFromState(current, workerId);
        return {
          ...current,
          ui: {
            ...current.ui,
            activeThreadId: worker?.taskId ? `task:${worker.taskId}` : current.ui.activeThreadId,
            selectedTaskId: worker?.taskId ?? current.ui.selectedTaskId,
            selectedWorkerId: worker?.id ?? null
          }
        };
      });
    },

    setChatDraft(value: string): void {
      setState((current) => ({
        ...current,
        ui: {
          ...current.ui,
          chatDraft: value
        }
      }));
    },

    closePresentation(): void {
      setState((current) => ({
        ...current,
        ui: {
          ...current.ui,
          presentation: null
        }
      }));
    }
  };

  function setTaskPending(
    key: keyof Pick<
      ValleyClientState["pending"],
      "detailTaskIds" | "feedbackTaskIds" | "interruptTaskIds" | "acceptReviewTaskIds"
    >,
    taskId: string,
    pending: boolean
  ): void {
    setState((current) => ({
      ...current,
      pending: {
        ...current.pending,
        [key]: toggleValue(current.pending[key], taskId, pending)
      }
    }));
  }

  return store;
}

function createInitialState(): ValleyClientState {
  return {
    connection: {
      error: null,
      status: "idle"
    },
    pending: {
      acceptReviewTaskIds: [],
      detailTaskIds: [],
      feedbackTaskIds: [],
      interruptTaskIds: [],
      refresh: false,
      submitChat: false
    },
    snapshot: null,
    taskDetails: {},
    ui: {
      activeThreadId: chiefThreadId,
      chatDraft: "",
      presentation: null,
      selectedTaskId: null,
      selectedWorkerId: null
    }
  };
}

function reconcileUi(ui: ValleyClientState["ui"], snapshot: ValleySnapshot): ValleyClientState["ui"] {
  const activeThread = snapshot.chatThreads.find((thread) => thread.id === ui.activeThreadId);
  const selectedTask = ui.selectedTaskId ? snapshot.tasks.find((task) => task.id === ui.selectedTaskId) : null;
  const selectedWorker = ui.selectedWorkerId ? snapshot.workers.find((worker) => worker.id === ui.selectedWorkerId) : null;
  const readyReview = snapshot.reviewQueue.find((review) => review.status === "ready") ?? null;
  const presentation = ui.presentation ?? readyReview;

  return {
    ...ui,
    activeThreadId: activeThread?.id ?? chiefThreadId,
    presentation,
    selectedTaskId: selectedTask?.id ?? presentation?.taskId ?? null,
    selectedWorkerId: selectedWorker?.id ?? null
  };
}

function toggleValue(values: string[], value: string, enabled: boolean): string[] {
  const exists = values.includes(value);
  if (enabled && !exists) return [...values, value];
  if (!enabled && exists) return values.filter((candidate) => candidate !== value);
  return values;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
