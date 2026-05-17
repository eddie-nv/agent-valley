import type { ValleySnapshot } from "@agent-valley/domain";

export type ValleySnapshotListener = (snapshot: ValleySnapshot) => void;

/**
 * The renderer's single source of truth. The Pixi office reads `ValleySnapshot`
 * frames from a {@link ValleyClient} and never touches AG-UI / SSE directly.
 *
 * Implementations:
 * - {@link import("./mock-valley-client").MockValleyClient} — scripted, offline.
 * - (later) an SSE client against `GET /api/events`.
 */
export interface ValleyClient {
  /** Latest snapshot. Always defined so the renderer can draw a first frame. */
  getSnapshot(): ValleySnapshot;
  /** Subscribe to snapshot updates. Returns an unsubscribe function. */
  subscribe(listener: ValleySnapshotListener): () => void;
  /** CEO → chief-of-staff message (maps to `POST /api/chat`). */
  sendChat(text: string): void;
  /** Stop timers / connections. */
  dispose(): void;
}
