import { Assets, Rectangle, Texture } from "pixi.js";

export interface SheetGrid {
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly columns: number;
  readonly rows: number;
}

const REGEN_HINT = "Regenerate it with `bun --filter @agent-valley/web sprites:reference`.";

/**
 * An SVG sheet loaded as one nearest-filtered texture, sliced against a fixed
 * logical grid. Robust to whatever resolution Pixi rasterizes the SVG at: the
 * uniform scale is derived from the texture width, and a mismatched height
 * (e.g. a stale sheet with the wrong number of rows) fails fast.
 */
export class SlicedSheet {
  private constructor(
    private readonly texture: Texture,
    private readonly grid: SheetGrid,
    private readonly scale: number
  ) {}

  public static async load(src: string, grid: SheetGrid): Promise<SlicedSheet> {
    const texture = await Assets.load<Texture>(src);
    texture.source.scaleMode = "nearest";

    const logicalWidth = grid.cellWidth * grid.columns;
    const scale = texture.width / logicalWidth;

    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error(`Sprite sheet ${src} loaded with no width. ${REGEN_HINT}`);
    }

    const expectedHeight = grid.cellHeight * grid.rows * scale;

    if (Math.abs(texture.height - expectedHeight) > 1) {
      throw new Error(
        `Sprite sheet ${src} is ${texture.width}x${texture.height}; the ` +
          `${grid.columns}x${grid.rows} grid expects height ${expectedHeight}. ${REGEN_HINT}`
      );
    }

    return new SlicedSheet(texture, grid, scale);
  }

  public frame(column: number, row: number): Texture {
    const { cellWidth, cellHeight } = this.grid;

    return new Texture({
      source: this.texture.source,
      frame: new Rectangle(
        column * cellWidth * this.scale,
        row * cellHeight * this.scale,
        cellWidth * this.scale,
        cellHeight * this.scale
      )
    });
  }

  public rowFrames(row: number): Texture[] {
    const frames: Texture[] = [];

    for (let column = 0; column < this.grid.columns; column += 1) {
      frames.push(this.frame(column, row));
    }

    return frames;
  }
}
