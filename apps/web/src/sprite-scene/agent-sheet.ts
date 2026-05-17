import { AnimatedSprite, Texture } from "pixi.js";
import { SPRITE_ROWS, type SpriteRow } from "@agent-valley/domain";
import { SlicedSheet, type SheetGrid } from "./sheet-loader";

const AGENT_SHEET_URL = "/sprites/reference/agent-animations-sheet.svg";

/** 48x64 cells, 4 animation frames per row, one row per SpriteRow. */
export const AGENT_GRID: SheetGrid = {
  cellWidth: 48,
  cellHeight: 64,
  columns: 4,
  rows: SPRITE_ROWS.length
};

/** Sliced agent sheet: every {@link SpriteRow} mapped to its 4 frame textures. */
export class AgentSheet {
  private constructor(private readonly framesByRow: ReadonlyMap<SpriteRow, Texture[]>) {}

  public static async load(): Promise<AgentSheet> {
    const sheet = await SlicedSheet.load(AGENT_SHEET_URL, AGENT_GRID);

    const framesByRow = new Map<SpriteRow, Texture[]>();
    SPRITE_ROWS.forEach((row, index) => {
      framesByRow.set(row, sheet.rowFrames(index));
    });

    return new AgentSheet(framesByRow);
  }

  public framesFor(row: SpriteRow): Texture[] {
    const frames = this.framesByRow.get(row);
    return frames && frames.length > 0 ? frames : [Texture.EMPTY];
  }

  public createSprite(row: SpriteRow): AnimatedSprite {
    const sprite = new AnimatedSprite(this.framesFor(row));
    sprite.anchor.set(0.5, 1);
    sprite.animationSpeed = 0.12;
    sprite.play();
    return sprite;
  }

  /**
   * Swap an existing sprite onto a different animation row. Callers must
   * guard against redundant calls (it restarts playback).
   */
  public applyRow(sprite: AnimatedSprite, row: SpriteRow): void {
    sprite.textures = this.framesFor(row);
    sprite.play();
  }
}
