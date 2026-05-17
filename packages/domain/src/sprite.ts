import type { WorkerActivity } from "./index";

/**
 * Render-only contract. The agent/AG-UI side owns {@link WorkerActivity} and
 * {@link import("./index").ValleySnapshot}; this module maps those onto sprite
 * sheet rows for the Pixi renderer. Nothing here is consumed by the API layer.
 */

/** Direction a sprite faces. Drives directional walk animations. */
export type Facing = "down" | "left" | "right";

/** Per-agent color swap applied to the shared base sprite (render-only). */
export interface AgentPalette {
  readonly hair: number;
  readonly skin: number;
  readonly shirt: number;
  readonly pants: number;
  readonly accent: number;
}

/**
 * Sprite-sheet rows. `walking` splits into directional rows. `research` has
 * no matching {@link WorkerActivity} yet — it is kept as a forward-looking
 * asset row and flagged to the agent-layer owner to add to WorkerActivity +
 * WorkerDefinition.
 */
export const SPRITE_ROWS = [
  "walk-down",
  "walk-side",
  "typing",
  "whiteboard",
  "meeting",
  "research",
  "game",
  "kitchen",
  "ready"
] as const;

export type SpriteRow = (typeof SPRITE_ROWS)[number];

/** Resolve the sprite row to render for a worker activity + facing. */
export function spriteRowFor(activity: WorkerActivity, facing: Facing): SpriteRow {
  if (activity === "walking") {
    return facing === "down" ? "walk-down" : "walk-side";
  }

  if (activity === "offline") {
    return "ready";
  }

  return activity;
}

const ACTIVITY_LABELS: Record<WorkerActivity, string> = {
  typing: "Typing at the computer",
  whiteboard: "Working on the whiteboard",
  meeting: "Having a meeting",
  game: "Playing in the game room",
  kitchen: "Eating in the kitchen",
  walking: "Walking to the next room",
  ready: "Ready to present",
  offline: "Offline"
};

/** Human-readable description of a worker activity for chat panels / tooltips. */
export function activityLabel(activity: WorkerActivity): string {
  return ACTIVITY_LABELS[activity];
}
