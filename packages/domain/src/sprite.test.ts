import { describe, expect, it } from "bun:test";
import type { WorkerActivity } from "./index";
import { SPRITE_ROWS, activityLabel, spriteRowFor } from "./sprite";

const ALL_ACTIVITIES: WorkerActivity[] = [
  "typing",
  "whiteboard",
  "meeting",
  "game",
  "kitchen",
  "walking",
  "ready",
  "offline"
];

describe("spriteRowFor", () => {
  it("splits walking into directional rows by facing", () => {
    expect(spriteRowFor("walking", "down")).toBe("walk-down");
    expect(spriteRowFor("walking", "left")).toBe("walk-side");
    expect(spriteRowFor("walking", "right")).toBe("walk-side");
  });

  it("maps offline onto the neutral ready pose", () => {
    expect(spriteRowFor("offline", "down")).toBe("ready");
  });

  it("maps every worker activity onto a real sprite row", () => {
    for (const activity of ALL_ACTIVITIES) {
      expect(SPRITE_ROWS).toContain(spriteRowFor(activity, "down"));
    }
  });
});

describe("activityLabel", () => {
  it("returns a non-empty label for every worker activity", () => {
    for (const activity of ALL_ACTIVITIES) {
      expect(activityLabel(activity).length).toBeGreaterThan(0);
    }
  });
});

describe("sprite rows", () => {
  it("keeps a forward-looking research row not yet in WorkerActivity", () => {
    expect(SPRITE_ROWS).toContain("research");
  });
});
