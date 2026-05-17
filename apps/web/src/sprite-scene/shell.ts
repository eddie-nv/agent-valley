import { Container, Graphics, Text, type TextStyleOptions } from "pixi.js";
import { theme } from "../theme";

/** Mirrors the procedural office shell layout so both scenes match. */
export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

const TILE = 24;
const CHAT_X = 18;
const CHAT_Y = 18;
const CHAT_WIDTH = 326;
const CHAT_HEIGHT = 684;
const GAME_X = 366;
const GAME_Y = 24;
const GAME_WIDTH = 888;
const GAME_HEIGHT = 672;
const GAME_HEADER_HEIGHT = 62;
const GAME_INSET = 18;

/**
 * Internal coordinate space the sprite office is designed in. Height is
 * derived so the space matches the viewport aspect ratio exactly — a single
 * uniform scale then fills the framed panel with no letterboxing.
 */
export const OFFICE_WIDTH = 960;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface OfficeFit {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/** The framed area inside the game panel the office is rendered into. */
export const VIEWPORT: Rect = {
  x: GAME_X + GAME_INSET,
  y: GAME_Y + GAME_HEADER_HEIGHT + GAME_INSET,
  width: GAME_WIDTH - GAME_INSET * 2,
  height: GAME_HEIGHT - GAME_HEADER_HEIGHT - GAME_INSET * 2
};

export const OFFICE_HEIGHT = Math.round((OFFICE_WIDTH * VIEWPORT.height) / VIEWPORT.width);

/** Uniform scale + origin so the office space exactly covers {@link VIEWPORT}. */
export function officeFit(): OfficeFit {
  return {
    scale: VIEWPORT.width / OFFICE_WIDTH,
    x: VIEWPORT.x,
    y: VIEWPORT.y
  };
}

function text(parent: Container, value: string, x: number, y: number, style: TextStyleOptions): Text {
  const label = new Text({ text: value, style, textureStyle: { scaleMode: "nearest" } });
  label.position.set(x, y);
  parent.addChild(label);
  return label;
}

function drawPixelPanel(g: Graphics, x: number, y: number, width: number, height: number): void {
  g.rect(x, y, width, height).fill({ color: theme.colors.ui.panelOuterBorder });
  g.rect(x + 4, y + 4, width - 8, height - 8).fill({ color: theme.colors.ui.panelInnerBorder });
  g.rect(x + 8, y + 8, width - 16, height - 16).fill({ color: theme.colors.ui.chatPanelShade });
}

function drawTileFloor(g: Graphics, width: number, height: number): void {
  for (let row = 0; row < Math.ceil(height / TILE); row += 1) {
    for (let col = 0; col < Math.ceil(width / TILE); col += 1) {
      const color = (row + col) % 2 === 0 ? theme.colors.ui.shellTileA : theme.colors.ui.shellTileB;
      g.rect(col * TILE, row * TILE, TILE, TILE).fill({ color });
    }
  }
}

export interface Shell {
  readonly container: Container;
  /** Dynamic chat content (chief thread) is rendered into this container. */
  readonly sidebarBody: Container;
  readonly sidebarWidth: number;
  setStatus(running: boolean): void;
}

/** Build the static shell chrome: sidebar + framed game panel + header. */
export function createShell(): Shell {
  const container = new Container();
  const g = new Graphics();
  container.addChild(g);

  drawTileFloor(g, WORLD_WIDTH, WORLD_HEIGHT);
  g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: theme.colors.ui.shellOverlay, alpha: 0.08 });

  drawPixelPanel(g, CHAT_X, CHAT_Y, CHAT_WIDTH, CHAT_HEIGHT);
  drawPixelPanel(g, GAME_X, GAME_Y, GAME_WIDTH, GAME_HEIGHT);

  g.rect(GAME_X + 14, GAME_Y + 14, GAME_WIDTH - 28, 42).fill({ color: theme.colors.ui.gameHeaderOuter });
  g.rect(GAME_X + 18, GAME_Y + 18, GAME_WIDTH - 36, 34).fill({ color: theme.colors.ui.gameHeaderInner });
  text(container, "AGENT VALLEY OFFICE", GAME_X + 34, GAME_Y + 24, theme.textStyles.uiTitle);

  g.rect(VIEWPORT.x, VIEWPORT.y, VIEWPORT.width, VIEWPORT.height)
    .stroke({ color: theme.colors.ui.gameViewportStrokeOuter, width: 5 })
    .stroke({ color: theme.colors.ui.gameViewportStrokeInner, width: 2 });

  g.rect(CHAT_X + 16, CHAT_Y + 16, CHAT_WIDTH - 32, 74).fill({ color: theme.colors.ui.chatAvatarBg });
  g.rect(CHAT_X + 24, CHAT_Y + 24, 58, 58).fill({ color: theme.colors.ui.chatAvatarFrame });
  g.rect(CHAT_X + 32, CHAT_Y + 34, 42, 28).fill({ color: theme.colors.ui.chatAvatarFace });
  g.rect(CHAT_X + 40, CHAT_Y + 42, 8, 8).fill({ color: theme.colors.ui.chatAvatarEyes });
  g.rect(CHAT_X + 58, CHAT_Y + 42, 8, 8).fill({ color: theme.colors.ui.chatAvatarEyes });
  g.rect(CHAT_X + 42, CHAT_Y + 64, 22, 4).fill({ color: theme.colors.ui.chatAvatarMouth });
  text(container, "CHIEF OF STAFF", CHAT_X + 96, CHAT_Y + 28, theme.textStyles.uiSmall);

  const status = text(container, "Awaiting a task.", CHAT_X + 96, CHAT_Y + 53, {
    ...theme.textStyles.uiTiny,
    fill: theme.colors.text.statusWaiting
  });

  drawPixelPanel(g, CHAT_X + 18, CHAT_Y + 108, CHAT_WIDTH - 36, CHAT_HEIGHT - 126);

  const sidebarBody = new Container();
  sidebarBody.position.set(CHAT_X + 34, CHAT_Y + 128);
  container.addChild(sidebarBody);

  return {
    container,
    sidebarBody,
    sidebarWidth: CHAT_WIDTH - 68,
    setStatus(running: boolean): void {
      status.text = running ? "Crew is executing." : "Awaiting a task.";
      status.style.fill = running ? theme.colors.text.statusActive : theme.colors.text.statusWaiting;
    }
  };
}
