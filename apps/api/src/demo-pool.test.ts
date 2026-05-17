import { describe, expect, test } from "bun:test";
import { createAgentValleyApi } from "./app";
import { createDemoAgentPoolServer } from "./demo-pool";

describe("demo Agent Pool", () => {
  test("starts from a runnable six-worker state", async () => {
    const clock = new DemoClock();
    const pool = createDemoAgentPoolServer({ now: clock.now });
    const api = createAgentValleyApi({ now: clock.now, pool });

    const response = await api.fetch(new Request("http://localhost/api/session"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.pool.projectName).toBe("agent-valley-demo");
    expect(body.snapshot.pool.daemonRunning).toBe(false);
    expect(body.snapshot.pool.daemonError).toContain("demo pool");
    expect(body.snapshot.tasks).toHaveLength(0);
    expect(body.snapshot.workers).toHaveLength(6);
    expect(body.snapshot.workers.map((worker: { status: string }) => worker.status)).toEqual([
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle"
    ]);

    api.close();
  });

  test("claims submitted tasks and evolves them into review packets", async () => {
    const clock = new DemoClock();
    const pool = createDemoAgentPoolServer({ completeAfterMs: 1000, now: clock.now });
    const api = createAgentValleyApi({ now: clock.now, pool });

    const created = await api.fetch(jsonRequest("http://localhost/api/chat", { message: "Build a tiny backend route" }));
    const createdBody = await created.json();

    expect(created.status).toBe(201);
    expect(createdBody.task.id).toBe("demo-task-1");
    expect(createdBody.task.status).toBe("in_progress");
    expect(createdBody.task.workerId).toBe("agent-00");
    expect(createdBody.snapshot.workers.find((worker: { id: string }) => worker.id === "agent-00")?.status).toBe(
      "working"
    );

    clock.advance(1500);

    const session = await api.fetch(new Request("http://localhost/api/session"));
    const sessionBody = await session.json();

    expect(sessionBody.snapshot.tasks[0].status).toBe("completed");
    expect(sessionBody.snapshot.tasks[0].reviewStatus).toBe("ready");
    expect(sessionBody.snapshot.reviewQueue[0].taskId).toBe("demo-task-1");
    expect(sessionBody.snapshot.reviewQueue[0].summary).toContain("Completed demo task");

    const accepted = await api.fetch(new Request("http://localhost/api/tasks/demo-task-1/review/accept", { method: "POST" }));
    const acceptedBody = await accepted.json();

    expect(accepted.status).toBe(200);
    expect(acceptedBody.review.status).toBe("accepted");
    expect(acceptedBody.review.files.map((file: { path: string }) => file.path)).toContain("agent.log");

    api.close();
  });

  test("keeps extra tasks pending until a worker is available", async () => {
    const clock = new DemoClock();
    const pool = createDemoAgentPoolServer({ completeAfterMs: 1000, now: clock.now });

    for (let index = 0; index < 7; index += 1) {
      await pool.createTask({ prompt: `Demo task ${index + 1}` });
    }

    const busySnapshot = await pool.getSnapshot();
    expect(busySnapshot.queue.inProgress).toBe(6);
    expect(busySnapshot.queue.pending).toBe(1);
    expect(busySnapshot.tasks.at(-1)?.status).toBe("pending");

    clock.advance(1500);

    const evolvedSnapshot = await pool.getSnapshot();
    expect(evolvedSnapshot.queue.completed).toBe(6);
    expect(evolvedSnapshot.queue.inProgress).toBe(1);
    expect(evolvedSnapshot.tasks.at(-1)?.status).toBe("in_progress");
    expect(evolvedSnapshot.tasks.at(-1)?.claimedBy).toBe("agent-00");

    pool.close();
  });
});

class DemoClock {
  private current = new Date("2026-05-17T12:00:00.000Z");

  public now = (): Date => new Date(this.current);

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
}
