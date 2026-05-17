import { Sprite, Texture } from "pixi.js";
import { SlicedSheet, type SheetGrid } from "./sheet-loader";

const PROP_SHEET_URL = "/sprites/reference/environment-props-sheet.svg";

/**
 * Mirrors `propOrder` in `apps/web/scripts/generate-reference-sprites.ts`.
 * Drift risk: keep in sync until the prop list is hoisted into the domain.
 */
export const PROP_NAMES = [
  "desk",
  "chair",
  "whiteboard",
  "conference-table",
  "kitchen-counter",
  "round-table",
  "arcade",
  "bookshelf",
  "plant",
  "water-cooler",
  "couch",
  "coffee-table",
  "laptop",
  "file-stack",
  "notice-board",
  "rug"
] as const;

export type PropName = (typeof PROP_NAMES)[number];

const PROP_COLUMNS = 4;

/** 64x64 prop cells, 4 per row. */
export const PROP_GRID: SheetGrid = {
  cellWidth: 64,
  cellHeight: 64,
  columns: PROP_COLUMNS,
  rows: Math.ceil(PROP_NAMES.length / PROP_COLUMNS)
};

export class PropSheet {
  private constructor(private readonly textures: ReadonlyMap<PropName, Texture>) {}

  public static async load(): Promise<PropSheet> {
    const sheet = await SlicedSheet.load(PROP_SHEET_URL, PROP_GRID);

    const textures = new Map<PropName, Texture>();
    PROP_NAMES.forEach((name, index) => {
      const column = index % PROP_COLUMNS;
      const row = Math.floor(index / PROP_COLUMNS);
      textures.set(name, sheet.frame(column, row));
    });

    return new PropSheet(textures);
  }

  public textureFor(name: PropName): Texture {
    return this.textures.get(name) ?? Texture.EMPTY;
  }

  /** Create a prop sprite anchored at its bottom-centre (floor contact point). */
  public createSprite(name: PropName): Sprite {
    const sprite = new Sprite(this.textureFor(name));
    sprite.anchor.set(0.5, 1);
    return sprite;
  }
}
