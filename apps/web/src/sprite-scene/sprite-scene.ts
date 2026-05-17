import { Application, Container, Graphics, Text } from "pixi.js";
import { spriteRowFor, type SpriteRow, type ValleySnapshot, type Worker } from "@agent-valley/domain";
import { theme } from "../theme";
import { MockValleyClient } from "../valley/mock-valley-client";
import type { ValleyClient } from "../valley/valley-client";
import { AgentSheet } from "./agent-sheet";
import { PropSheet, type PropName } from "./prop-sheet";
import {
  OFFICE_HEIGHT,
  OFFICE_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createShell,
  officeFit,
  type Shell
} from "./shell";

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Room {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly floor: number;
}

interface PlacedProp {
  readonly name: PropName;
  readonly at: Point;
}

const env = theme.colors.environment;

const BOTTOM_ROOM_Y = 268;
const BOTTOM_ROOM_HEIGHT = OFFICE_HEIGHT - BOTTOM_ROOM_Y - 24;

const ROOMS: readonly Room[] = [
  { label: "BOARDROOM", x: 24, y: 24, width: 300, height: 220, floor: env.carpetA },
  { label: "MEETING ROOM", x: 348, y: 24, width: 270, height: 220, floor: env.devSyncFloorA },
  { label: "KITCHEN", x: 642, y: 24, width: 294, height: 220, floor: env.kitchenTileA },
  { label: "OPEN DESKS", x: 24, y: BOTTOM_ROOM_Y, width: 600, height: BOTTOM_ROOM_HEIGHT, floor: env.floorA },
  { label: "GAME ROOM", x: 648, y: BOTTOM_ROOM_Y, width: 288, height: BOTTOM_ROOM_HEIGHT, floor: env.gameRoomFloorA }
];

const PROPS: readonly PlacedProp[] = [
  { name: "conference-table", at: { x: 174, y: 150 } },
  { name: "whiteboard", at: { x: 90, y: 70 } },
  { name: "file-stack", at: { x: 264, y: 150 } },
  { name: "round-table", at: { x: 483, y: 150 } },
  { name: "laptop", at: { x: 483, y: 140 } },
  { name: "kitchen-counter", at: { x: 720, y: 78 } },
  { name: "coffee-table", at: { x: 840, y: 170 } },
  { name: "desk", at: { x: 110, y: 360 } },
  { name: "desk", at: { x: 250, y: 360 } },
  { name: "desk", at: { x: 110, y: 470 } },
  { name: "desk", at: { x: 250, y: 470 } },
  { name: "chair", at: { x: 400, y: 420 } },
  { name: "bookshelf", at: { x: 560, y: 360 } },
  { name: "plant", at: { x: 590, y: 470 } },
  { name: "arcade", at: { x: 710, y: 360 } },
  { name: "couch", at: { x: 850, y: 470 } },
  { name: "notice-board", at: { x: 470, y: 300 } },
  { name: "water-cooler", at: { x: 610, y: 250 } }
];

const LOCATION_ANCHORS: Record<Worker["location"], Point> = {
  boardroom: { x: 174, y: 210 },
  meeting_room: { x: 483, y: 210 },
  kitchen: { x: 800, y: 210 },
  open_desks: { x: 180, y: 500 },
  game_room: { x: 792, y: 500 }
};

function workerSlot(anchor: Point, index: number): Point {
  const perRow = 3;
  const column = index % perRow;
  const row = Math.floor(index / perRow);
  return { x: anchor.x + (column - 1) * 70, y: anchor.y + row * 16 };
}

function drawOffice(): Container {
  const layer = new Container();
  const g = new Graphics();
  layer.addChild(g);

  g.rect(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT).fill({ color: env.officeBackground });

  for (const room of ROOMS) {
    g.rect(room.x - 6, room.y - 6, room.width + 12, room.height + 12).fill({ color: env.wallDark });
    g.rect(room.x, room.y, room.width, room.height).fill({ color: room.floor });

    const plaque = new Text({
      text: room.label,
      style: theme.textStyles.plaque,
      textureStyle: { scaleMode: "nearest" }
    });
    plaque.position.set(room.x + 10, room.y + 8);
    layer.addChild(plaque);
  }

  return layer;
}

function isRunning(snapshot: ValleySnapshot): boolean {
  return (
    snapshot.pool.queue.inProgress > 0 ||
    snapshot.tasks.some((task) => task.status === "in_progress")
  );
}

class SpriteScene {
  private readonly root = new Container();
  private readonly officeRoot = new Container();
  private readonly propLayer = new Container();
  private readonly agentLayer = new Container();
  private readonly workerSprites = new Map<string, ReturnType<AgentSheet["createSprite"]>>();
  private readonly workerRows = new Map<string, SpriteRow>();
  private unsubscribe: (() => void) | undefined;

  public constructor(
    private readonly app: Application,
    private readonly agentSheet: AgentSheet,
    private readonly propSheet: PropSheet,
    private readonly client: ValleyClient,
    private readonly shell: Shell
  ) {}

  public mount(): void {
    this.agentLayer.sortableChildren = true;

    const fit = officeFit();
    this.officeRoot.scale.set(fit.scale);
    this.officeRoot.position.set(fit.x, fit.y);
    this.officeRoot.addChild(drawOffice(), this.propLayer, this.agentLayer);

    this.root.addChild(this.shell.container, this.officeRoot);
    this.app.stage.addChild(this.root);

    for (const prop of PROPS) {
      const sprite = this.propSheet.createSprite(prop.name);
      sprite.position.set(prop.at.x, prop.at.y);
      this.propLayer.addChild(sprite);
    }

    this.resize();
    this.app.renderer.on("resize", () => this.resize());
    this.unsubscribe = this.client.subscribe((snapshot) => this.render(snapshot));
  }

  public dispose(): void {
    this.unsubscribe?.();
    this.client.dispose();
  }

  private render(snapshot: ValleySnapshot): void {
    this.renderWorkers(snapshot.workers);
    this.renderSidebar(snapshot);
    this.shell.setStatus(isRunning(snapshot));
  }

  private renderWorkers(workers: readonly Worker[]): void {
    const seen = new Set<string>();
    const indexByLocation = new Map<Worker["location"], number>();

    for (const worker of workers) {
      seen.add(worker.id);
      const locationIndex = indexByLocation.get(worker.location) ?? 0;
      indexByLocation.set(worker.location, locationIndex + 1);

      const row = spriteRowFor(worker.activity, "down");
      let sprite = this.workerSprites.get(worker.id);

      if (sprite === undefined) {
        sprite = this.agentSheet.createSprite(row);
        this.workerSprites.set(worker.id, sprite);
        this.workerRows.set(worker.id, row);
        this.agentLayer.addChild(sprite);
      } else if (this.workerRows.get(worker.id) !== row) {
        this.agentSheet.applyRow(sprite, row);
        this.workerRows.set(worker.id, row);
      }

      const slot = workerSlot(LOCATION_ANCHORS[worker.location], locationIndex);
      sprite.position.set(slot.x, slot.y);
      sprite.zIndex = Math.round(slot.y);
    }

    for (const [id, sprite] of this.workerSprites) {
      if (!seen.has(id)) {
        sprite.destroy();
        this.workerSprites.delete(id);
        this.workerRows.delete(id);
      }
    }
  }

  private renderSidebar(snapshot: ValleySnapshot): void {
    this.shell.sidebarBody.removeChildren();

    const chief = snapshot.chatThreads.find((thread) => thread.kind === "chief");
    const messages = chief?.messages.slice(-7) ?? [];
    let y = 0;

    for (const message of messages) {
      const line = new Text({
        text: `${message.author}: ${message.text}`,
        style: {
          ...theme.textStyles.uiBody,
          fontSize: 13,
          wordWrapWidth: this.shell.sidebarWidth
        },
        textureStyle: { scaleMode: "nearest" }
      });
      line.position.set(0, y);
      this.shell.sidebarBody.addChild(line);
      y += line.height + 12;
    }
  }

  private resize(): void {
    const scale = Math.min(
      this.app.renderer.width / WORLD_WIDTH,
      this.app.renderer.height / WORLD_HEIGHT
    );
    this.root.scale.set(scale);
    this.root.position.set(
      Math.floor((this.app.renderer.width - WORLD_WIDTH * scale) / 2),
      Math.floor((this.app.renderer.height - WORLD_HEIGHT * scale) / 2)
    );
  }
}

/**
 * Sprite-driven preview scene: the generated sheets rendered inside the same
 * shell (sidebar + framed game panel) as the procedural office, with
 * characters animated from the {@link MockValleyClient} scenario.
 */
export async function createSpriteScene(app: Application): Promise<void> {
  const [agentSheet, propSheet] = await Promise.all([AgentSheet.load(), PropSheet.load()]);
  const scene = new SpriteScene(app, agentSheet, propSheet, new MockValleyClient(), createShell());
  scene.mount();
}
