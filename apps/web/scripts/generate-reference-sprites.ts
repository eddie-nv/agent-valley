import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Palette = {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
  accent: string;
};

type Activity =
  | "walk-down"
  | "walk-side"
  | "typing"
  | "whiteboard"
  | "meeting"
  | "game"
  | "kitchen"
  | "ready";

type PropName =
  | "desk"
  | "chair"
  | "whiteboard"
  | "conference-table"
  | "kitchen-counter"
  | "round-table"
  | "arcade"
  | "bookshelf"
  | "plant"
  | "water-cooler"
  | "couch"
  | "coffee-table"
  | "laptop"
  | "file-stack"
  | "notice-board"
  | "rug";

const outDir = new URL("../public/sprites/reference/", import.meta.url);

const agentCell = { width: 48, height: 64 };
const environmentCell = { width: 64, height: 64 };

const basePalette: Palette = {
  hair: "#2d1b14",
  skin: "#c88b63",
  shirt: "#3f7cac",
  pants: "#263a56",
  accent: "#f2c14e"
};

const agentPalettes: Array<{ name: string; colors: Palette }> = [
  { name: "Ada", colors: basePalette },
  { name: "Bo", colors: { hair: "#5a3825", skin: "#d6a06f", shirt: "#6b9f5a", pants: "#2e4a3b", accent: "#f0ede0" } },
  { name: "Cy", colors: { hair: "#1d1b25", skin: "#b87155", shirt: "#b95f89", pants: "#40334f", accent: "#8fd1c7" } },
  { name: "Dee", colors: { hair: "#403022", skin: "#e0ad7b", shirt: "#d47a3d", pants: "#63432d", accent: "#75b7f0" } },
  { name: "Eli", colors: { hair: "#212222", skin: "#986b55", shirt: "#7b6ec8", pants: "#2d2c44", accent: "#ffd37b" } },
  { name: "Faye", colors: { hair: "#7a3f2c", skin: "#dfb08c", shirt: "#5d9fb2", pants: "#253e4b", accent: "#f6edf8" } }
];

const agentRows: Array<{ label: string; activity: Activity }> = [
  { label: "Walk down", activity: "walk-down" },
  { label: "Walk side", activity: "walk-side" },
  { label: "Typing", activity: "typing" },
  { label: "Whiteboard", activity: "whiteboard" },
  { label: "Meeting", activity: "meeting" },
  { label: "Game room idle", activity: "game" },
  { label: "Kitchen idle", activity: "kitchen" },
  { label: "Ready/present", activity: "ready" }
];

const propOrder: Array<{ label: string; name: PropName }> = [
  { label: "Desk + monitor", name: "desk" },
  { label: "Office chair", name: "chair" },
  { label: "Whiteboard", name: "whiteboard" },
  { label: "Conf table", name: "conference-table" },
  { label: "Kitchen run", name: "kitchen-counter" },
  { label: "Cafe table", name: "round-table" },
  { label: "Arcade cab", name: "arcade" },
  { label: "Bookshelf", name: "bookshelf" },
  { label: "Plant", name: "plant" },
  { label: "Water cooler", name: "water-cooler" },
  { label: "Couch", name: "couch" },
  { label: "Coffee table", name: "coffee-table" },
  { label: "Laptop", name: "laptop" },
  { label: "File stack", name: "file-stack" },
  { label: "Notice board", name: "notice-board" },
  { label: "Rug", name: "rug" }
];

const tileSwatches = [
  { name: "open floor A", color: "#b78b5b" },
  { name: "open floor B", color: "#c69a67" },
  { name: "board carpet A", color: "#617c63" },
  { name: "board carpet B", color: "#78916d" },
  { name: "kitchen tile A", color: "#d8d3bd" },
  { name: "kitchen tile B", color: "#cfc6aa" },
  { name: "game floor A", color: "#695e86" },
  { name: "game floor B", color: "#746797" },
  { name: "wall", color: "#3d2f28" },
  { name: "wall shadow", color: "#231a18" },
  { name: "trim", color: "#6a5947" },
  { name: "ui cream", color: "#fff2cf" }
];

function rect(x: number, y: number, width: number, height: number, fill: string, opacity?: number): string {
  const alpha = opacity === undefined ? "" : ` opacity="${opacity}"`;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"${alpha}/>`;
}

function circle(cx: number, cy: number, radius: number, fill: string, opacity?: number): string {
  const alpha = opacity === undefined ? "" : ` opacity="${opacity}"`;
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}"${alpha}/>`;
}

function label(text: string, x: number, y: number, size = 9, fill = "#fff2cf"): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="'Courier New', monospace" font-size="${size}" font-weight="700">${escapeXml(text)}</text>`;
}

function svg(width: number, height: number, body: string, background?: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
    "<defs>",
    "<style>text{dominant-baseline:hanging}.muted{opacity:.7}</style>",
    "</defs>",
    background ? rect(0, 0, width, height, background) : "",
    body,
    "</svg>"
  ].join("\n");
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function drawAgent(x: number, y: number, activity: Activity, frame: number, palette: Palette): string {
  const step = frame % 4;
  const swing = step === 1 ? -2 : step === 3 ? 2 : 0;
  const bob = step === 1 || step === 3 ? -1 : 0;
  const side = activity === "walk-side" || activity === "whiteboard" ? 1 : 0;
  const bodyX = x + 24;
  const bodyY = y + 18 + bob;
  const parts: string[] = [];

  parts.push(circle(bodyX, y + 56, 15, "#221b16", 0.28));
  parts.push(rect(bodyX - 11, bodyY + 28, 8, 16 + (activity.includes("walk") ? swing : 0), palette.pants));
  parts.push(rect(bodyX + 3, bodyY + 28, 8, 16 - (activity.includes("walk") ? swing : 0), palette.pants));
  parts.push(rect(bodyX - 14, bodyY + 12, 28, 23, palette.shirt));
  parts.push(rect(bodyX - 9, bodyY + 6, 18, 8, palette.skin));
  parts.push(rect(bodyX - 12, bodyY - 10, 24, 23, palette.skin));
  parts.push(rect(bodyX - 14, bodyY - 13, 28, 9, palette.hair));
  parts.push(rect(bodyX - 15, bodyY - 5, 6, 16, palette.hair));
  parts.push(rect(bodyX + 9, bodyY - 5, 6, 16, palette.hair));
  parts.push(rect(bodyX - 5 + side, bodyY - 1, 3, 3, "#282f2c"));
  parts.push(rect(bodyX + 5 + side, bodyY - 1, 3, 3, "#282f2c"));

  if (activity === "typing") {
    parts.push(rect(bodyX - 19, bodyY + 21 + (step % 2), 14, 5, palette.skin));
    parts.push(rect(bodyX + 5, bodyY + 21 + ((step + 1) % 2), 14, 5, palette.skin));
    parts.push(rect(bodyX - 19, bodyY + 30, 38, 5, "#25222a"));
    parts.push(rect(bodyX - 14, bodyY + 35, 28, 4, "#3d2f28"));
  } else if (activity === "whiteboard") {
    parts.push(rect(bodyX + 7, bodyY + 5 + swing * 2, 21, 5, palette.skin));
    parts.push(rect(bodyX + 27, bodyY + 3 + swing * 2, 5, 5, palette.accent));
    parts.push(rect(bodyX - 21, bodyY + 19, 10, 5, palette.skin));
  } else if (activity === "meeting") {
    parts.push(rect(bodyX - 22, bodyY + 19 + (step % 2), 12, 6, palette.skin));
    parts.push(rect(bodyX + 10, bodyY + 19 - (step % 2), 12, 6, palette.skin));
    parts.push(circle(bodyX + 24, bodyY - 18, 3, "#fff2cf", 0.75));
    parts.push(circle(bodyX + 33, bodyY - 23 + (step % 2), 2, "#fff2cf", 0.75));
  } else if (activity === "game") {
    parts.push(rect(bodyX - 22, bodyY + 21 + swing, 14, 5, palette.skin));
    parts.push(rect(bodyX + 8, bodyY + 21 - swing, 14, 5, palette.skin));
    parts.push(rect(bodyX - 13, bodyY + 30, 26, 7, "#22252f"));
    parts.push(circle(bodyX - 5, bodyY + 33, 2, "#c9514d"));
    parts.push(circle(bodyX + 7, bodyY + 33, 2, "#446ab3"));
  } else if (activity === "kitchen") {
    parts.push(rect(bodyX - 22, bodyY + 21, 13, 5, palette.skin));
    parts.push(rect(bodyX + 8, bodyY + 21 - Math.max(0, swing * 3), 14, 5, palette.skin));
    parts.push(rect(bodyX + 20, bodyY + 14 - Math.max(0, swing * 3), 3, 11, "#dce2dd"));
    parts.push(circle(bodyX, bodyY + 33, 5, "#f4c76b"));
  } else if (activity === "ready") {
    parts.push(rect(bodyX - 24, bodyY + 18, 12, 5, palette.skin));
    parts.push(rect(bodyX + 12, bodyY + 18, 12, 5, palette.skin));
    parts.push(rect(bodyX + 15, bodyY + 11, 17, 23, "#fff2cf"));
    parts.push(rect(bodyX + 19, bodyY + 17, 10, 2, "#282f2c"));
    parts.push(rect(bodyX - 4, bodyY - 27 + (step % 2), 8, 8, palette.accent));
  } else {
    parts.push(rect(bodyX - 22, bodyY + 18 + swing, 12, 5, palette.skin));
    parts.push(rect(bodyX + 10, bodyY + 18 - swing, 12, 5, palette.skin));
  }

  parts.push(rect(bodyX - 9, bodyY + 44, 10, 5, "#1d1a18"));
  parts.push(rect(bodyX + 5, bodyY + 44, 10, 5, "#1d1a18"));
  return parts.join("\n");
}

function drawAgentSheet(): string {
  const width = agentCell.width * 4;
  const height = agentCell.height * agentRows.length;
  const body: string[] = [];

  agentRows.forEach((row, rowIndex) => {
    for (let frame = 0; frame < 4; frame += 1) {
      body.push(drawAgent(frame * agentCell.width, rowIndex * agentCell.height, row.activity, frame, basePalette));
    }
  });

  return svg(width, height, body.join("\n"));
}

function drawAgentContactSheet(): string {
  const labelWidth = 152;
  const frameScale = 2;
  const frameWidth = agentCell.width * frameScale;
  const frameHeight = agentCell.height * frameScale;
  const headerHeight = 96;
  const rowGap = 16;
  const width = labelWidth + frameWidth * 4 + 48;
  const height = headerHeight + agentRows.length * (frameHeight + rowGap) + 116;
  const body: string[] = [];

  body.push(label("Agent character animation reference", 24, 20, 18, "#fff2cf"));
  body.push(label("48 x 64 cells, 4 frames per row, transparent production sheet available separately", 24, 50, 11, "#d8edff"));

  agentRows.forEach((row, rowIndex) => {
    const y = headerHeight + rowIndex * (frameHeight + rowGap);
    body.push(label(row.label, 24, y + 42, 12, "#ffd37b"));

    for (let frame = 0; frame < 4; frame += 1) {
      const x = labelWidth + frame * frameWidth;
      body.push(rect(x, y, frameWidth, frameHeight, frame % 2 === 0 ? "#1a365d" : "#203d66"));
      body.push(`<g transform="translate(${x},${y}) scale(${frameScale})">${drawAgent(0, 0, row.activity, frame, basePalette)}</g>`);
      body.push(rect(x, y, frameWidth, frameHeight, "none").replace("/>", ` stroke="#fff2cf" stroke-width="2"/>`));
    }
  });

  const paletteY = height - 86;
  body.push(label("Worker palette swaps", 24, paletteY, 13, "#ffd37b"));
  agentPalettes.forEach((entry, index) => {
    const x = 24 + index * 92;
    body.push(label(entry.name, x, paletteY + 22, 9, "#fff2cf"));
    body.push(rect(x, paletteY + 42, 12, 18, entry.colors.hair));
    body.push(rect(x + 14, paletteY + 42, 12, 18, entry.colors.skin));
    body.push(rect(x + 28, paletteY + 42, 12, 18, entry.colors.shirt));
    body.push(rect(x + 42, paletteY + 42, 12, 18, entry.colors.pants));
    body.push(rect(x + 56, paletteY + 42, 12, 18, entry.colors.accent));
  });

  return svg(width, height, body.join("\n"), "#10233d");
}

function drawProp(x: number, y: number, name: PropName): string {
  const p: string[] = [];
  const cx = x + environmentCell.width / 2;

  p.push(circle(cx, y + 54, 22, "#221b16", 0.22));

  switch (name) {
    case "desk":
      p.push(rect(x + 8, y + 24, 48, 24, "#8f5b3e"));
      p.push(rect(x + 11, y + 27, 42, 15, "#b9794d"));
      p.push(rect(x + 22, y + 14, 22, 17, "#22334b"));
      p.push(rect(x + 26, y + 18, 14, 7, "#9bd6ff"));
      p.push(rect(x + 29, y + 31, 6, 8, "#1c2736"));
      p.push(rect(x + 17, y + 46, 7, 12, "#513d2b"));
      p.push(rect(x + 42, y + 46, 7, 12, "#513d2b"));
      break;
    case "chair":
      p.push(rect(x + 20, y + 24, 24, 23, "#46606d"));
      p.push(rect(x + 23, y + 18, 18, 8, "#617986"));
      p.push(rect(x + 22, y + 46, 5, 12, "#342820"));
      p.push(rect(x + 37, y + 46, 5, 12, "#342820"));
      break;
    case "whiteboard":
      p.push(rect(x + 6, y + 14, 52, 30, "#6b7a75"));
      p.push(rect(x + 9, y + 17, 46, 24, "#e8eee6"));
      p.push(rect(x + 14, y + 24, 32, 3, "#75a187"));
      p.push(rect(x + 14, y + 31, 25, 3, "#c9514d"));
      p.push(rect(x + 40, y + 36, 9, 2, "#282f2c"));
      break;
    case "conference-table":
      p.push(rect(x + 10, y + 24, 44, 26, "#8f5b3e"));
      p.push(rect(x + 14, y + 18, 36, 24, "#b9794d"));
      p.push(rect(x + 20, y + 49, 7, 10, "#4a3022"));
      p.push(rect(x + 38, y + 49, 7, 10, "#4a3022"));
      break;
    case "kitchen-counter":
      p.push(rect(x + 8, y + 18, 48, 20, "#8fb6b0"));
      p.push(rect(x + 12, y + 22, 16, 12, "#e9f3f0"));
      p.push(rect(x + 32, y + 22, 14, 12, "#d05b4e"));
      p.push(rect(x + 48, y + 16, 8, 23, "#505e66"));
      break;
    case "round-table":
      p.push(circle(cx, y + 32, 22, "#ba8651"));
      p.push(circle(cx, y + 32, 15, "#cca06a"));
      p.push(rect(cx - 5, y + 52, 10, 10, "#563b2d"));
      break;
    case "arcade":
      p.push(rect(x + 17, y + 8, 30, 48, "#ce565c"));
      p.push(rect(x + 21, y + 14, 22, 19, "#15252a"));
      p.push(rect(x + 25, y + 21, 5, 5, "#ffd37b"));
      p.push(rect(x + 35, y + 21, 5, 5, "#8fd1c7"));
      p.push(rect(x + 24, y + 38, 16, 5, "#231a18"));
      p.push(circle(x + 27, y + 49, 3, "#f4c76b"));
      p.push(circle(x + 37, y + 49, 3, "#446ab3"));
      break;
    case "bookshelf":
      p.push(rect(x + 11, y + 7, 42, 52, "#5e3c2b"));
      [15, 31, 47].forEach((shelfY, row) => {
        p.push(rect(x + 15, y + shelfY, 34, 10, "#2e211c"));
        ["#c9514d", "#446ab3", "#f4c76b", "#548a4f", "#8d639e"].forEach((color, col) => {
          p.push(rect(x + 18 + col * 6, y + shelfY + 2, 3, 7 + ((row + col) % 2), color));
        });
      });
      break;
    case "plant":
      p.push(rect(cx - 11, y + 42, 22, 15, "#a35e3f"));
      p.push(rect(cx - 7, y + 46, 14, 6, "#c46d49"));
      p.push(circle(cx - 10, y + 32, 9, "#4f8a4c"));
      p.push(circle(cx + 8, y + 29, 10, "#66a85a"));
      p.push(circle(cx, y + 20, 9, "#5f9d54"));
      break;
    case "water-cooler":
      p.push(rect(cx - 11, y + 27, 22, 30, "#d9d7c7"));
      p.push(rect(cx - 6, y + 41, 12, 4, "#5b6b72"));
      p.push(circle(cx, y + 18, 14, "#9dd7e7", 0.9));
      p.push(circle(cx - 5, y + 13, 4, "#ecffff", 0.7));
      break;
    case "couch":
      p.push(rect(x + 8, y + 32, 48, 18, "#6b9f5a"));
      p.push(rect(x + 13, y + 22, 38, 18, "#7fb56c"));
      p.push(rect(x + 13, y + 50, 6, 8, "#342820"));
      p.push(rect(x + 45, y + 50, 6, 8, "#342820"));
      break;
    case "coffee-table":
      p.push(rect(x + 13, y + 30, 38, 18, "#83543a"));
      p.push(rect(x + 18, y + 34, 28, 7, "#a66f49"));
      p.push(rect(x + 22, y + 48, 5, 9, "#3d2f28"));
      p.push(rect(x + 39, y + 48, 5, 9, "#3d2f28"));
      break;
    case "laptop":
      p.push(rect(x + 15, y + 20, 34, 22, "#1d2530"));
      p.push(rect(x + 20, y + 24, 24, 11, "#8fd1c7"));
      p.push(rect(x + 10, y + 42, 44, 5, "#2f3340"));
      break;
    case "file-stack":
      p.push(rect(x + 17, y + 22, 30, 22, "#fff2cf"));
      p.push(rect(x + 21, y + 27, 21, 2, "#282f2c", 0.5));
      p.push(rect(x + 21, y + 34, 16, 2, "#282f2c", 0.5));
      p.push(rect(x + 20, y + 18, 30, 5, "#ffd37b"));
      break;
    case "notice-board":
      p.push(rect(x + 7, y + 17, 50, 32, "#5e3c2b"));
      p.push(rect(x + 12, y + 22, 40, 22, "#cead75"));
      p.push(rect(x + 16, y + 26, 12, 14, "#fff2cf"));
      p.push(rect(x + 31, y + 26, 8, 14, "#8fd1c7"));
      p.push(rect(x + 42, y + 26, 8, 14, "#f4c76b"));
      break;
    case "rug":
      p.push(rect(x + 8, y + 17, 48, 34, "#7c5651"));
      p.push(rect(x + 14, y + 23, 36, 22, "#8e6862"));
      p.push(rect(x + 22, y + 31, 20, 8, "#7c5651"));
      break;
  }

  return p.join("\n");
}

function drawEnvironmentSheet(): string {
  const cols = 4;
  const width = environmentCell.width * cols;
  const height = environmentCell.height * Math.ceil(propOrder.length / cols);
  const body: string[] = [];

  propOrder.forEach((prop, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    body.push(drawProp(col * environmentCell.width, row * environmentCell.height, prop.name));
  });

  return svg(width, height, body.join("\n"));
}

function drawEnvironmentReference(): string {
  const cols = 4;
  const cellScale = 2;
  const propWidth = environmentCell.width * cellScale;
  const propHeight = environmentCell.height * cellScale;
  const headerHeight = 88;
  const labelHeight = 34;
  const propsHeight = Math.ceil(propOrder.length / cols) * (propHeight + labelHeight);
  const width = 740;
  const height = headerHeight + propsHeight + 214;
  const body: string[] = [];

  body.push(label("Office environment spritesheet reference", 24, 20, 18, "#fff2cf"));
  body.push(label("64 x 64 prop cells, plus 16 x 16 room tile palette", 24, 50, 11, "#d8edff"));

  propOrder.forEach((prop, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 24 + col * 176;
    const y = headerHeight + row * (propHeight + labelHeight);
    body.push(rect(x, y, propWidth, propHeight, index % 2 === 0 ? "#1a365d" : "#203d66"));
    body.push(`<g transform="translate(${x},${y}) scale(${cellScale})">${drawProp(0, 0, prop.name)}</g>`);
    body.push(rect(x, y, propWidth, propHeight, "none").replace("/>", ` stroke="#fff2cf" stroke-width="2"/>`));
    body.push(label(prop.label, x, y + propHeight + 8, 10, "#ffd37b"));
  });

  const tileY = headerHeight + propsHeight + 28;
  body.push(label("Tile and UI palette", 24, tileY, 13, "#ffd37b"));
  tileSwatches.forEach((tile, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 24 + col * 176;
    const y = tileY + 32 + row * 42;
    body.push(rect(x, y, 28, 28, tile.color));
    body.push(label(tile.name, x + 38, y + 7, 9, "#fff2cf"));
  });

  return svg(width, height, body.join("\n"), "#10233d");
}

function drawIndexHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Valley Sprite Reference</title>
    <style>
      :root {
        background: #0b1628;
        color: #fff2cf;
        font-family: "Courier New", monospace;
      }
      body {
        margin: 0;
        padding: 24px;
      }
      main {
        max-width: 1160px;
        margin: 0 auto;
      }
      h1,
      h2,
      p {
        margin: 0;
      }
      h1 {
        font-size: 24px;
      }
      p {
        color: #d8edff;
        line-height: 1.6;
        margin-top: 8px;
      }
      section {
        border: 4px solid #fff2cf;
        background: #1a365d;
        box-shadow: 0 0 0 4px #071421;
        margin-top: 28px;
        padding: 18px;
      }
      img {
        display: block;
        max-width: 100%;
        height: auto;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        margin-top: 16px;
      }
      code {
        color: #ffd37b;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Agent Valley Sprite Reference</h1>
      <p>Base visual reference for the retro office game UI. Production sheets are transparent SVG grids; contact sheets include labels, palettes, and frame names.</p>

      <section>
        <h2>Agent animations</h2>
        <p><code>agent-animations-sheet.svg</code>: 48 x 64 cells, 4 frames per row.</p>
        <img src="./agent-animations-contact-sheet.svg" alt="Agent animation contact sheet" />
      </section>

      <section>
        <h2>Environment props and tiles</h2>
        <p><code>environment-props-sheet.svg</code>: 64 x 64 prop cells. Tile palette is listed below the prop contact sheet.</p>
        <img src="./environment-reference.svg" alt="Environment sprite contact sheet" />
      </section>
    </main>
  </body>
</html>
`;
}

function drawReadme(): string {
  return `# Agent Valley Sprite Reference

This folder contains deterministic base-reference sprite sheets for the current Pixi prototype.

## Files

- \`agent-animations-sheet.svg\`: transparent production-style character sheet.
- \`agent-animations-contact-sheet.svg\`: labeled character animation reference.
- \`environment-props-sheet.svg\`: transparent production-style environment prop sheet.
- \`environment-reference.svg\`: labeled environment prop and tile reference.
- \`index.html\`: browser preview page served by Vite at \`/sprites/reference/\`.

## Character Sheet

- Cell size: \`48 x 64\`
- Columns: 4 animation frames
- Rows:
  1. walk down
  2. walk side
  3. typing at computer
  4. working on whiteboard
  5. having a meeting
  6. playing in game room
  7. eating in kitchen
  8. ready / presenting

## Environment Sheet

- Prop cell size: \`64 x 64\`
- Tile palette target: \`16 x 16\` tiles
- Current prop set: desks, chairs, whiteboards, conference table, kitchen counter, cafe table, arcade cabinet, bookshelf, plant, water cooler, couch, coffee table, laptop, file stack, notice board, rug.

Regenerate with:

\`\`\`bash
bun --filter @agent-valley/web sprites:reference
\`\`\`
`;
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });

  const files = new Map<string, string>([
    ["agent-animations-sheet.svg", drawAgentSheet()],
    ["agent-animations-contact-sheet.svg", drawAgentContactSheet()],
    ["environment-props-sheet.svg", drawEnvironmentSheet()],
    ["environment-reference.svg", drawEnvironmentReference()],
    ["index.html", drawIndexHtml()],
    ["README.md", drawReadme()]
  ]);

  await Promise.all(
    [...files].map(([filename, contents]) => writeFile(join(outDir.pathname, filename), contents, "utf8"))
  );
}

await main();
