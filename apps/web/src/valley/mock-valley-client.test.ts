import { afterEach, describe, expect, it } from "bun:test";
import { MockValleyClient, mockSnapshotAt } from "./mock-valley-client";

const NOW = Date.UTC(2026, 4, 16);

describe("mockSnapshotAt", () => {
  it("is in planning with only the PM at t=0", () => {
    const snap = mockSnapshotAt({ elapsedSeconds: 0, nowMs: NOW, ceoMessages: [] });

    expect(snap.tasks[0]?.status).toBe("pending");
    expect(snap.workers.map((w) => w.id)).toEqual(["pm"]);
    expect(snap.pool.queue.pending).toBe(1);
    expect(snap.reviewQueue).toHaveLength(0);
  });

  it("is executing with the worker crew mid-scenario", () => {
    const snap = mockSnapshotAt({ elapsedSeconds: 10, nowMs: NOW, ceoMessages: [] });

    expect(snap.tasks[0]?.status).toBe("in_progress");
    expect(snap.workers).toHaveLength(2);
    expect(snap.workers.some((w) => w.activity === "typing")).toBe(true);
    expect(snap.pool.queue.inProgress).toBe(1);
  });

  it("is presenting with a review packet once finished", () => {
    const snap = mockSnapshotAt({ elapsedSeconds: 25, nowMs: NOW, ceoMessages: [] });

    expect(snap.tasks[0]?.status).toBe("completed");
    expect(snap.reviewQueue).toHaveLength(1);
    expect(snap.pool.queue.completed).toBe(1);
  });

  it("threads CEO messages into the chief thread", () => {
    const snap = mockSnapshotAt({
      elapsedSeconds: 0,
      nowMs: NOW,
      ceoMessages: ["build a waitlist page"]
    });

    const chief = snap.chatThreads[0];
    expect(chief?.messages.some((m) => m.role === "user" && m.text === "build a waitlist page")).toBe(true);
  });

  it("produces a well-formed snapshot (all required collections present)", () => {
    const snap = mockSnapshotAt({ elapsedSeconds: 10, nowMs: NOW, ceoMessages: [] });

    expect(typeof snap.generatedAt).toBe("string");
    expect(Array.isArray(snap.tasks)).toBe(true);
    expect(Array.isArray(snap.chatThreads)).toBe(true);
    expect(snap.pool.projectName.length).toBeGreaterThan(0);
  });
});

describe("MockValleyClient", () => {
  let client: MockValleyClient | undefined;

  afterEach(() => {
    client?.dispose();
    client = undefined;
  });

  it("reflects elapsed time via the injected clock", () => {
    let t = NOW;
    client = new MockValleyClient({ now: () => t });

    expect(client.getSnapshot().tasks[0]?.status).toBe("pending");

    t = NOW + 25_000;
    expect(client.getSnapshot().tasks[0]?.status).toBe("completed");
  });

  it("emits to subscribers on subscribe and on sendChat", () => {
    client = new MockValleyClient({ now: () => NOW, tickMs: 10_000 });
    const seen: number[] = [];

    const unsubscribe = client.subscribe((snap) => {
      seen.push(snap.chatThreads[0]?.messages.length ?? 0);
    });

    client.sendChat("ship it");
    unsubscribe();
    client.sendChat("ignored after unsubscribe");

    expect(seen.length).toBe(2);
    expect(seen[1]).toBeGreaterThan(seen[0] ?? 0);
  });

  it("ignores blank chat input", () => {
    client = new MockValleyClient({ now: () => NOW });
    client.sendChat("   ");

    const chief = client.getSnapshot().chatThreads[0];
    expect(chief?.messages.every((m) => m.role !== "user")).toBe(true);
  });
});
