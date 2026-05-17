import type {
  AgentPoolServerLike,
  AgentPoolSnapshot,
  TaskDetail,
  TaskLogReadResult,
  TaskSummary
} from "./app";

interface DemoPoolOptions {
  completeAfterMs?: number;
  now?: () => Date;
  projectName?: string;
}

interface DemoTask extends TaskSummary {
  log: string;
}

const demoAgentIds = ["agent-00", "agent-01", "agent-02", "agent-03", "agent-04", "agent-05"] as const;
const defaultCompleteAfterMs = 45_000;

export function createDemoAgentPoolServer(options: DemoPoolOptions = {}): AgentPoolServerLike & { close(): void } {
  return new DemoAgentPoolServer(options);
}

class DemoAgentPoolServer implements AgentPoolServerLike {
  private readonly completeAfterMs: number;
  private readonly now: () => Date;
  private readonly projectName: string;
  private readonly tasks: DemoTask[] = [];
  private sequence = 0;

  constructor(options: DemoPoolOptions) {
    this.completeAfterMs = options.completeAfterMs ?? defaultCompleteAfterMs;
    this.now = options.now ?? (() => new Date());
    this.projectName = options.projectName ?? "agent-valley-demo";
  }

  async getSnapshot(): Promise<AgentPoolSnapshot> {
    this.advanceTasks();

    return {
      agents: demoAgentIds.map((agentId) => this.createAgent(agentId)),
      daemon: {
        error: "Using Agent Valley demo pool. Configure Agent Pool to run real agents.",
        running: false
      },
      generatedAt: this.now().toISOString(),
      project: {
        name: this.projectName
      },
      queue: this.createQueueSummary(),
      tasks: this.tasks.map(stripDemoTask)
    };
  }

  async createTask(input: {
    prompt: string;
    priority?: number;
    dependsOn?: string[];
    projectName?: string;
  }): Promise<TaskDetail> {
    const prompt = input.prompt.trim();
    if (!prompt) throw new Error("Task prompt is required");

    this.advanceTasks();
    this.sequence += 1;

    const claimedBy = this.nextAvailableAgent();
    const status = claimedBy ? "in_progress" : "pending";
    const task: DemoTask = {
      claimedBy,
      completedAt: null,
      createdAt: this.now().toISOString(),
      dependsOn: input.dependsOn ?? [],
      id: `demo-task-${this.sequence}`,
      log: claimedBy
        ? `${claimedBy} picked up the task.\nReading brief: ${prompt}\n`
        : `Task is waiting for an available worker.\n`,
      priority: input.priority ?? 0,
      projectName: input.projectName ?? this.projectName,
      prompt,
      result: null,
      startedAt: claimedBy ? this.now().toISOString() : null,
      status
    };

    this.tasks.push(task);
    return this.getTaskDetail({ taskId: task.id });
  }

  async cancelTask(input: { taskId: string }): Promise<TaskDetail> {
    const task = this.requireTask(input.taskId);
    task.status = "cancelled";
    task.completedAt = this.now().toISOString();
    task.log += "Task was interrupted by the user.\n";
    return this.getTaskDetail(input);
  }

  async getTaskDetail(input: { taskId: string }): Promise<TaskDetail> {
    this.advanceTasks();
    const task = this.requireTask(input.taskId);
    const snapshot = await this.getSnapshot();

    return {
      activeAgent: task.claimedBy
        ? snapshot.agents.find((agent) => agent.agentId === task.claimedBy) ?? null
        : null,
      dependencies: task.dependsOn.map((taskId) => stripDemoTask(this.requireTask(taskId))),
      logs: [
        {
          agentId: task.claimedBy ?? "dispatcher",
          logPath: `/demo/${task.id}.log`,
          taskId: task.id
        }
      ],
      task: stripDemoTask(task)
    };
  }

  async readTaskLog(input: { taskId: string; tailLines?: number }): Promise<TaskLogReadResult> {
    this.advanceTasks();
    const task = this.requireTask(input.taskId);
    const lines = task.log.split("\n");

    if (!input.tailLines || input.tailLines <= 0 || lines.length <= input.tailLines) {
      return {
        exists: true,
        path: `/demo/${task.id}.log`,
        text: task.log,
        truncated: false
      };
    }

    return {
      exists: true,
      path: `/demo/${task.id}.log`,
      text: lines.slice(-input.tailLines).join("\n"),
      truncated: true
    };
  }

  close(): void {
    // In-memory demo pool has no resources to release.
  }

  private createAgent(agentId: string): AgentPoolSnapshot["agents"][number] {
    const task = this.tasks.find((candidate) => candidate.status === "in_progress" && candidate.claimedBy === agentId);

    return {
      agentId,
      heartbeat: task
        ? {
            lastTool: this.lastToolFor(task),
            timestamp: this.now().toISOString()
          }
        : null,
      status: task ? "working" : "idle",
      task: task ? stripDemoTask(task) : null
    };
  }

  private createQueueSummary(): AgentPoolSnapshot["queue"] {
    return {
      backlogged: this.tasks.filter((task) => task.status === "backlogged").length,
      blocked: this.tasks.filter((task) => task.status === "blocked").length,
      cancelled: this.tasks.filter((task) => task.status === "cancelled").length,
      completed: this.tasks.filter((task) => task.status === "completed").length,
      inProgress: this.tasks.filter((task) => task.status === "in_progress").length,
      pending: this.tasks.filter((task) => task.status === "pending").length,
      total: this.tasks.length
    };
  }

  private advanceTasks(): void {
    const nowMs = this.now().getTime();

    for (const task of this.tasks) {
      if (task.status !== "in_progress" || !task.startedAt) {
        continue;
      }

      const startedMs = Date.parse(task.startedAt);
      if (Number.isFinite(startedMs) && nowMs - startedMs >= this.completeAfterMs) {
        task.status = "completed";
        task.completedAt = this.now().toISOString();
        task.result = `Completed demo task: ${task.prompt}`;
        task.log += "Prepared implementation summary.\nMarked task ready for review.\n";
      }
    }

    for (const task of this.tasks) {
      if (task.status !== "pending") {
        continue;
      }

      const claimedBy = this.nextAvailableAgent();
      if (!claimedBy) {
        return;
      }

      task.status = "in_progress";
      task.claimedBy = claimedBy;
      task.startedAt = this.now().toISOString();
      task.log += `${claimedBy} picked up the queued task.\n`;
    }
  }

  private nextAvailableAgent(): string | null {
    const busy = new Set(
      this.tasks
        .filter((task) => task.status === "in_progress" && task.claimedBy)
        .map((task) => task.claimedBy)
    );
    return demoAgentIds.find((agentId) => !busy.has(agentId)) ?? null;
  }

  private requireTask(taskId: string): DemoTask {
    const task = this.tasks.find((candidate) => candidate.id === taskId);
    if (!task) throw new Error(`Task '${taskId}' not found`);
    return task;
  }

  private lastToolFor(task: DemoTask): string {
    const startedMs = task.startedAt ? Date.parse(task.startedAt) : this.now().getTime();
    const elapsed = this.now().getTime() - startedMs;
    if (elapsed > this.completeAfterMs * 0.66) return "writing summary";
    if (elapsed > this.completeAfterMs * 0.33) return "editing files";
    return "reading brief";
  }
}

function stripDemoTask(task: DemoTask): TaskSummary {
  return {
    claimedBy: task.claimedBy,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    dependsOn: task.dependsOn,
    id: task.id,
    priority: task.priority,
    projectName: task.projectName,
    prompt: task.prompt,
    result: task.result,
    startedAt: task.startedAt,
    status: task.status
  };
}
