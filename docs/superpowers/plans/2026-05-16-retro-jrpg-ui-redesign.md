# Retro JRPG UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retheme Agent Valley's entire visual layer to a muted, light, retro GBA/DS-era JRPG aesthetic — warm cream environment, cool gray UI chrome, RPG menu borders — while keeping all behavior identical.

**Architecture:** Two-phase approach. Phase 1 extracts all color/style values from `office-world.ts` into a new `theme.ts` (pure refactor, zero visual change). Phase 2 swaps the theme values to the new palette and updates `drawPixelPanel` to the RPG menu border structure. Additional files `styles.css` and `main.ts` get background color updates.

**Tech Stack:** TypeScript, PixiJS v8, Vite

**Spec:** `docs/superpowers/specs/2026-05-16-retro-jrpg-ui-redesign-design.md`

---

### Task 1: Create theme.ts with current values (Phase 1 extraction)

**Files:**
- Create: `apps/web/src/theme.ts`

This task creates the theme file populated with the CURRENT color values — no new palette yet. Every hex literal in `office-world.ts` must map to a named theme property.

- [ ] **Step 1: Create `apps/web/src/theme.ts` with the full theme object**

```typescript
import type { TextStyleOptions } from "pixi.js";

export const theme = {
  colors: {
    environment: {
      void: 0x101614,
      wall: 0x3d2f28,
      wallDark: 0x231a18,
      trim: 0x6a5947,
      floorA: 0xb78b5b,
      floorB: 0xc69a67,
      carpetA: 0x617c63,
      carpetB: 0x78916d,
      kitchenTileA: 0xd8d3bd,
      kitchenTileB: 0xcfc6aa,
      devSyncFloorA: 0x7c786b,
      devSyncFloorB: 0x898377,
      gameRoomFloorA: 0x695e86,
      gameRoomFloorB: 0x746797,
      desk: 0x8f5b3e,
      deskTop: 0xb9794d,
      deskLeg: 0x513d2b,
      monitor: 0x22334b,
      monitorGlow: 0x9bd6ff,
      monitorStand: 0x1c2736,
      keyboard: 0x30261f,
      board: 0xe8eee6,
      boardStroke: 0x6b7a75,
      boardMarkGreen: 0x75a187,
      boardMarkRed: 0xc9514d,
      glass: 0x88c4d4,
      shadow: 0x221b16,
      leaf: 0x548a4f,
      leafMid: 0x66a85a,
      leafDark: 0x4f8a4c,
      leafLight: 0x5f9d54,
      pot: 0xa35e3f,
      potLight: 0xc46d49,
      tableLeg: 0x4a3022,
      roundTableLeg: 0x563b2d,
      chairLeg: 0x342820,
      bookshelfFrame: 0x5e3c2b,
      bookshelfShelf: 0x2e211c,
      coffeeTableBase: 0x83543a,
      coffeeTableTop: 0xa66f49,
      coffeeTableLeg: 0x3d2f28,
      waterCoolerBody: 0xd9d7c7,
      waterCoolerSpigot: 0x5b6b72,
      waterCoolerJug: 0x9dd7e7,
      waterCoolerHighlight: 0xecffff,
      noticeBoardCork: 0xcead75,
      rugBase: 0x7c5651,
      couchGreen: 0x6b9f5a,
      couchPurple: 0x866cb0,
      arcadeScreenDark: 0x15252a,
      arcadeControlPanel: 0x231a18,
      arcadeBase: 0x2c1d1b,
      laptopBody: 0x1d2530,
      laptopScreen: 0x8fd1c7,
      laptopBase: 0x2f3340,
      kitchenCounter: 0x8fb6b0,
      kitchenSink: 0xe9f3f0,
      kitchenAppliance: 0xd05b4e,
      kitchenOvenBody: 0x505e66,
      kitchenOvenWindow: 0xcfe5e1,
      kitchenRoundTable: 0xba8651,
      kitchenPlate: 0xf8f1dc,
      kitchenFoodA: 0xffcf7a,
      kitchenFoodB: 0xd85d4f,
      kitchenUtensil: 0xaeb5aa,
      boardroomChair: 0x46606d,
      devSyncChair: 0x755d83,
      kitchenChair: 0x5f8f7e,
      gameRoomRoundTable: 0x7f5742,
      meetingNoteA: 0xfff2cf,
      meetingNoteB: 0xf4c76b,
      gameScreenColors: [0xf4c76b, 0x8fd1c7, 0xb95f89] as readonly number[],
      gameScreenDot: 0x101614,
      fileStackPaper: 0xfff2cf,
      noticePaperA: 0xfff2cf,
      noticePaperB: 0x8fd1c7,
      noticePaperC: 0xf4c76b,
      pottedBooksShelf: 0x5e3c2b,
    },
    ui: {
      panelBg: 0x1a365d,
      panelSecondary: 0x0d1627,
      panelOuterBorder: 0x071421,
      borderPaper: 0xf7e6a8,
      borderShade: 0x1c3852,
      borderAccentChat: 0x2f6fab,
      borderAccentGame: 0xd4494c,
      borderAccentGameShade: 0x1e493d,
      shellA: 0x172d46,
      shellB: 0x1c3852,
      shellOverlay: 0x061526,
      gameHeaderOuter: 0x274f79,
      gameHeaderInner: 0x1a365d,
      gameViewportStroke: 0x0d1627,
      gameViewportStrokeAccent: 0xf7e6a8,
      chiefAvatarBg: 0xf7e6a8,
      chiefAvatarFace: 0x24335c,
      chiefAvatarEyes: 0x8ef7a6,
      chiefAvatarMouth: 0xd4494c,
      tabBgOuter: 0x0d1627,
      tabActiveFill: 0xffd37b,
      tabEnabledFill: 0x2f6fab,
      tabDisabledFill: 0x314053,
      tabActiveStroke: 0xd4494c,
      tabStroke: 0xf7e6a8,
      statusBarActiveBg: 0x2f6fab,
      statusBarInactiveBg: 0x314053,
      statusBarActiveInner: 0x1a365d,
      statusBarInactiveInner: 0x263146,
      noteCardBg: 0x1a365d,
      buttonFill: 0xd4494c,
      buttonStroke: 0xfff2cf,
      miniAgentShadow: 0x0d1627,
      blinkA: 0xfff2cf,
      blinkB: 0xffd37b,
      monitorGlowBlueOn: 0x9bf4ff,
      monitorGlowBlueOff: 0x73bad4,
      monitorGlowGreenOn: 0xc5ff9b,
      monitorGlowGreenOff: 0x7ed47a,
      monitorGlowGoldOn: 0xffd37b,
      monitorGlowGoldOff: 0xd2a15d,
      presentationBg: 0x111c1d,
      presentationTileA: 0x142526,
      presentationTileB: 0x172b2c,
      presentationPanelOuter: 0x203033,
      presentationPanelInner: 0x142022,
      presentationProgressBg: 0x2e4547,
      presentationProgressFill: 0x466e6a,
      presentationProgressShine: 0x8fd1c7,
      presentationBarA: 0x466e6a,
      presentationBarB: 0x6b9f5a,
      fileCardBg: 0x203033,
      fileCardPaper: 0xfff2cf,
      fileCardFold: 0xd7c89e,
      fileCardBarA: 0x86a49d,
      fileCardBarB: 0x5a706c,
    },
    accent: {
      green: 0x8ef7a6,
      red: 0xd4494c,
      blue: 0x446ab3,
      yellow: 0xf4c76b,
      purple: 0x8d639e,
      gold: 0xffd37b,
      cyan: 0x8fd1c7,
    },
    text: {
      primary: 0xfff2cf,
      secondary: 0xe4f6ff,
      ink: 0x282f2c,
      statusActive: 0x8ef7a6,
      statusWaiting: 0xffd37b,
      disabled: 0x92a0a8,
      presentationTitle: 0xfff2cf,
      presentationBody: 0xdfe9d8,
      fileCardTitle: 0xfff2cf,
      fileCardDesc: 0xc9d7ce,
    },
    agent: {
      eye: 0x282f2c,
      shoe: 0x1d1a18,
      shadow: 0x221b16,
      shadowAlpha: 0.28,
      nameStroke: 0x241813,
      keyboard: 0x25222a,
      gameController: 0x22252f,
      utensil: 0xdce2dd,
      snack: 0xf4c76b,
      readyPaper: 0xfff2cf,
      speechBubble: 0xfff2cf,
      bubbleFill: 0xfff7db,
      bubbleStroke: 0x3a2a24,
      bubbleTail: 0x3a2a24,
    },
  },
  textStyles: {
    plaque: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 11,
      fontWeight: "700" as const,
      fill: 0xfff2cf,
      letterSpacing: 1,
    },
    smallDark: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 12,
      fontWeight: "700" as const,
      fill: 0x282f2c,
    },
    bubble: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 10,
      fontWeight: "700" as const,
      fill: 0x282f2c,
      wordWrap: true,
      wordWrapWidth: 128,
    },
    presentationTitle: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 34,
      fontWeight: "700" as const,
      fill: 0xfff2cf,
    },
    presentationBody: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 18,
      fontWeight: "700" as const,
      fill: 0xdfe9d8,
    },
    uiTiny: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 10,
      fontWeight: "700" as const,
      fill: 0xfff2cf,
      letterSpacing: 1,
    },
    uiSmall: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 13,
      fontWeight: "700" as const,
      fill: 0xfff2cf,
    },
    uiBody: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 15,
      fontWeight: "700" as const,
      fill: 0xfff2cf,
      lineHeight: 23,
      wordWrap: true,
      wordWrapWidth: 260,
    },
    uiTitle: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 20,
      fontWeight: "700" as const,
      fill: 0xfff2cf,
      stroke: { color: 0x24335c, width: 4 },
    },
    agentName: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 9,
      fontWeight: "700" as const,
      fill: 0xfff2cf,
      stroke: { color: 0x241813, width: 3 },
    },
    boardLabel: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 9,
      fontWeight: "700" as const,
      fill: 0x282f2c,
    },
  } satisfies Record<string, TextStyleOptions>,
} as const;

export type Theme = typeof theme;
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley && npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/theme.ts
git commit -m "feat: extract theme object with current color values"
```

---

### Task 2: Wire theme into office-world.ts (Phase 1 — pure refactor)

**Files:**
- Modify: `apps/web/src/office-world.ts`

Replace the `colors` object, `textStyles` object, and ALL inline hex literals with references to the theme. After this task the app must look pixel-identical to before.

- [ ] **Step 1: Replace the imports and remove local `colors`/`textStyles`**

At the top of `office-world.ts`, add the import and remove the two local objects:

```typescript
import { Application, Container, Graphics, Rectangle, Text, type TextStyleOptions, type Ticker } from "pixi.js";
import { theme } from "./theme";

const t = theme;
```

Delete the entire `const colors = { ... };` block (lines 58-83) and the entire `const textStyles = { ... } as const;` block (lines 148-211).

- [ ] **Step 2: Replace all `colors.X` references with `t.colors.environment.X` or `t.colors.agent.X`**

Systematic replacements in the standalone drawing functions:

| Old | New |
|-----|-----|
| `colors.wallDark` | `t.colors.environment.wallDark` |
| `colors.wall` | `t.colors.environment.wall` |
| `colors.trim` | `t.colors.environment.trim` |
| `colors.carpetA` | `t.colors.environment.carpetA` |
| `colors.kitchenTileA` | `t.colors.environment.kitchenTileA` |
| `colors.kitchenTileB` | `t.colors.environment.kitchenTileB` |
| `colors.floorA` | `t.colors.environment.floorA` |
| `colors.floorB` | `t.colors.environment.floorB` |
| `colors.desk` | `t.colors.environment.desk` |
| `colors.deskTop` | `t.colors.environment.deskTop` |
| `colors.monitor` | `t.colors.environment.monitor` |
| `colors.monitorGlow` | `t.colors.environment.monitorGlow` |
| `colors.board` | `t.colors.environment.board` |
| `colors.boardStroke` | `t.colors.environment.boardStroke` |
| `colors.shadow` | `t.colors.environment.shadow` |
| `colors.ink` | `t.colors.text.ink` |
| `colors.cream` | `t.colors.text.primary` |
| `colors.leaf` | `t.colors.environment.leaf` |
| `colors.red` | `t.colors.accent.red` |
| `colors.blue` | `t.colors.accent.blue` |
| `colors.yellow` | `t.colors.accent.yellow` |
| `colors.purple` | `t.colors.accent.purple` |

- [ ] **Step 3: Replace all `textStyles.X` references with `t.textStyles.X`**

Global find-and-replace:

| Old | New |
|-----|-----|
| `textStyles.plaque` | `t.textStyles.plaque` |
| `textStyles.smallDark` | `t.textStyles.smallDark` |
| `textStyles.bubble` | `t.textStyles.bubble` |
| `textStyles.presentationTitle` | `t.textStyles.presentationTitle` |
| `textStyles.presentationBody` | `t.textStyles.presentationBody` |
| `textStyles.uiTiny` | `t.textStyles.uiTiny` |
| `textStyles.uiSmall` | `t.textStyles.uiSmall` |
| `textStyles.uiBody` | `t.textStyles.uiBody` |
| `textStyles.uiTitle` | `t.textStyles.uiTitle` |

Also update the `AgentView` constructor name text style to use `t.textStyles.agentName`, and the whiteboard label style in `drawWhiteboard` to use `t.textStyles.boardLabel`.

- [ ] **Step 4: Replace all inline hex literals in shell/UI methods**

These are the scattered hex values inside `drawShell`, `drawChat`, `drawChiefChat`, `drawAgentChat`, `drawTab`, `drawHoverPopup`, `drawPresentation`, and `drawPixelPanel`. Every `0x______` that isn't already a theme reference must become one.

Key replacements by method:

**`drawShell`** (line ~372):
```typescript
drawTileFloor(shell, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, t.colors.ui.shellA, t.colors.ui.shellB);
shell.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: t.colors.ui.shellOverlay, alpha: 0.34 });
drawPixelPanel(shell, CHAT_X, CHAT_Y, CHAT_WIDTH, CHAT_HEIGHT, t.colors.ui.borderPaper, t.colors.ui.borderShade, t.colors.ui.borderAccentChat);
drawPixelPanel(game, GAME_X, GAME_Y, GAME_WIDTH, GAME_HEIGHT, t.colors.ui.borderPaper, t.colors.ui.borderAccentGameShade, t.colors.ui.borderAccentGame);
game.rect(GAME_X + 14, GAME_Y + 14, GAME_WIDTH - 28, 42).fill({ color: t.colors.ui.gameHeaderOuter });
game.rect(GAME_X + 18, GAME_Y + 18, GAME_WIDTH - 36, 34).fill({ color: t.colors.ui.gameHeaderInner });
// status text fill: this.isTaskRunning(time) ? t.colors.text.statusActive : t.colors.text.statusWaiting
const blink = Math.floor(time * 2) % 2 === 0 ? t.colors.ui.blinkA : t.colors.ui.blinkB;
// viewport stroke: t.colors.ui.gameViewportStroke then t.colors.ui.gameViewportStrokeAccent
```

**`drawChat`** (line ~402):
```typescript
panel.rect(CHAT_X + 16, CHAT_Y + 16, CHAT_WIDTH - 32, 74).fill({ color: t.colors.ui.panelBg });
panel.rect(CHAT_X + 24, CHAT_Y + 24, 58, 58).fill({ color: t.colors.ui.chiefAvatarBg });
panel.rect(CHAT_X + 32, CHAT_Y + 34, 42, 28).fill({ color: t.colors.ui.chiefAvatarFace });
panel.rect(CHAT_X + 40, CHAT_Y + 42, 8, 8).fill({ color: t.colors.ui.chiefAvatarEyes });
panel.rect(CHAT_X + 58, CHAT_Y + 42, 8, 8).fill({ color: t.colors.ui.chiefAvatarEyes });
panel.rect(CHAT_X + 42, CHAT_Y + 64, 22, 4).fill({ color: t.colors.ui.buttonFill });
// chief status text fill: taskRunning ? t.colors.text.statusActive : t.colors.text.statusWaiting
drawPixelPanel(panel, CHAT_X + 18, CHAT_Y + 290, CHAT_WIDTH - 36, 392, t.colors.text.primary, t.colors.ui.panelBg, t.colors.ui.borderAccentChat);
```

**`drawTab`** (line ~447):
```typescript
const fill = active ? t.colors.ui.tabActiveFill : enabled ? t.colors.ui.tabEnabledFill : t.colors.ui.tabDisabledFill;
const stroke = active ? t.colors.ui.tabActiveStroke : t.colors.ui.tabStroke;
g.rect(x, y, width, 30).fill({ color: t.colors.ui.tabBgOuter });
// text fill: enabled ? t.colors.text.primary : t.colors.text.disabled
```

**`drawChiefChat`** (line ~479):
```typescript
// title fill: t.colors.text.statusWaiting, stroke color: t.colors.ui.panelBg
// body fill: t.colors.text.primary
// detail fill: t.colors.text.secondary
// status bar: taskRunning ? t.colors.ui.statusBarActiveBg : t.colors.ui.statusBarInactiveBg
// inner: taskRunning ? t.colors.ui.statusBarActiveInner : t.colors.ui.statusBarInactiveInner
// status fill: taskRunning ? t.colors.text.statusActive : t.colors.text.statusWaiting
// cursor: t.colors.text.primary
```

**`drawAgentChat`** (line ~510):
```typescript
// title fill: t.colors.text.statusWaiting, stroke color: t.colors.ui.panelBg
// "Doing" fill: t.colors.text.primary
// "Thinking" fill: t.colors.text.secondary
// note card bg: t.colors.ui.noteCardBg
```

**`drawHoverPopup`** (line ~537):
```typescript
drawPixelPanel(g, x, y, 224, 132, t.colors.text.primary, t.colors.ui.panelBg, status.agent.palette.shirt);
// name fill: t.colors.text.statusWaiting
// activity fill: t.colors.text.statusActive
// thought fill: t.colors.text.primary
// button: t.colors.ui.buttonFill, stroke: t.colors.ui.buttonStroke
```

**`drawPresentation`** (line ~769):
```typescript
g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: t.colors.ui.presentationBg });
drawTileFloor(g, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, t.colors.ui.presentationTileA, t.colors.ui.presentationTileB);
g.rect(74, 60, 1132, 600).fill({ color: t.colors.ui.presentationPanelOuter });
g.rect(82, 68, 1116, 584).fill({ color: t.colors.ui.presentationPanelInner });
g.rect(108, 96, 1064, 64).fill({ color: t.colors.ui.presentationProgressBg });
g.rect(112, 100, /*...*/).fill({ color: t.colors.ui.presentationProgressFill });
g.rect(112, 100, 1056, 4).fill({ color: t.colors.ui.presentationProgressShine, alpha: ... });
// bars: t.colors.ui.presentationBarA / t.colors.ui.presentationBarB
```

- [ ] **Step 5: Replace inline hex literals in environment drawing functions**

**`drawStaticOffice`** (line ~656):
```typescript
g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: t.colors.environment.void });
drawRoom(g, 32, 36, 340, 238, t.colors.environment.carpetA, "BOARDROOM");
drawRoom(g, 404, 36, 330, 238, t.colors.environment.devSyncFloorA, "DEV SYNC");
drawRoom(g, 764, 36, 220, 238, t.colors.environment.kitchenTileA, "KITCHEN");
drawRoom(g, 1018, 36, 230, 238, t.colors.environment.gameRoomFloorA, "GAME ROOM");
drawRoom(g, 32, 304, 1216, 372, t.colors.environment.floorA, "OPEN DESKS");
```

**`drawOpenOffice`**: desk positions stay, but color args become theme refs:
```typescript
drawRug(g, 444, 394, 134, 92, t.colors.environment.rugBase);
drawCouch(g, 1018, 520, 138, 42, t.colors.environment.couchGreen);
```

**`drawBoardroom`**:
```typescript
drawLongTable(g, 106, 108, 194, 78, t.colors.environment.desk, t.colors.environment.deskTop);
drawChair(g, 92, 138, t.colors.environment.boardroomChair);
// (same for other chairs)
```

**`drawDevSyncRoom`**:
```typescript
drawTileFloor(g, 414, 46, 310, 218, t.colors.environment.devSyncFloorA, t.colors.environment.devSyncFloorB);
drawLongTable(g, 442, 144, 142, 64, 0x72543d, 0xa86f48);  // → theme table colors (see note below)
drawChair(g, 424, 154, t.colors.environment.devSyncChair);
```

Note: The Dev Sync table uses unique wood tones (`0x72543d`, `0xa86f48`). Add these to theme as `environment.tableAltBase` (0x72543d) and `environment.tableAltTop` (0xa86f48).

**`drawKitchen`**: all inline kitchen hex values → theme refs:
```typescript
g.rect(782, 62, 176, 34).fill({ color: t.colors.environment.kitchenCounter });
g.rect(790, 68, 46, 22).fill({ color: t.colors.environment.kitchenSink });
g.rect(846, 68, 42, 22).fill({ color: t.colors.environment.kitchenAppliance });
g.rect(904, 64, 42, 30).fill({ color: t.colors.environment.kitchenOvenBody });
g.rect(910, 70, 30, 16).fill({ color: t.colors.environment.kitchenOvenWindow });
drawRoundTable(g, 838, 170, 54, t.colors.environment.kitchenRoundTable);
drawChair(g, 792, 176, t.colors.environment.kitchenChair);
drawChair(g, 914, 176, t.colors.environment.kitchenChair);
```

**`drawGameRoom`**:
```typescript
drawTileFloor(g, 1028, 46, 210, 218, t.colors.environment.gameRoomFloorA, t.colors.environment.gameRoomFloorB);
drawArcadeCabinet(g, 1050, 82, t.colors.accent.red);     // 0xce565c — close enough to add as accent.arcadeRed
drawArcadeCabinet(g, 1114, 82, t.colors.accent.blue);    // 0x3f7cac — close enough, or add environment.arcadeBlue
drawCouch(g, 1052, 202, 124, 36, t.colors.environment.couchPurple);
drawRoundTable(g, 1190, 166, 32, t.colors.environment.gameRoomRoundTable);
```

Note: Arcade cabinet colors (`0xce565c`, `0x3f7cac`) don't exactly match any existing accent. Add to theme as `environment.arcadeRed` (0xce565c) and `environment.arcadeBlue` (0x3f7cac).

- [ ] **Step 6: Replace inline hex literals in standalone drawing functions**

**`drawPixelPanel`**: all `0x071421`, `0x0d1627` → theme refs
**`drawDesk`**: `0x513d2b`, `0x1c2736`, `0x30261f` → theme refs
**`drawMonitorGlow`**: `0xf6ffff` → `t.colors.environment.waterCoolerHighlight` (reuse, similar white flash)
**`drawLongTable`**: `0x4a3022` → `t.colors.environment.tableLeg`
**`drawRoundTable`**: `0x563b2d` → `t.colors.environment.roundTableLeg`
**`drawChair`**: `0x342820` → `t.colors.environment.chairLeg`
**`drawWhiteboard`**: `0x75a187`, `0xc9514d` → theme refs
**`drawArcadeCabinet`**: `0x15252a`, `0x231a18`, `0x2c1d1b` → theme refs
**`drawCouch`**: `0x342820` → `t.colors.environment.chairLeg`
**`drawCoffeeTable`**: all inline → theme refs
**`drawBookshelf`**: `0x5e3c2b`, `0x2e211c` → theme refs, book colors → accent array
**`drawPlant`**: pot/leaf colors → theme refs
**`drawWaterCooler`**: all inline → theme refs
**`drawNoticeBoard`**: all inline → theme refs
**`drawPottedBooks`**: `0x5e3c2b` → theme ref
**`drawRug`**: no inline hex (uses `color` param + `lighten`)
**`drawLaptopOnTable`**: `0x1d2530`, `0x8fd1c7`, `0x2f3340` → theme refs
**`drawTinyFileStack`**: `0xfff2cf` → theme ref
**`drawFileCard`**: all inline → theme refs

- [ ] **Step 7: Replace inline hex literals in agent drawing functions**

**`drawAgentSprite`**: 
```typescript
// Eyes
g.rect(-6, localY - 1, 3, 3).fill({ color: t.colors.agent.eye });
g.rect(5, localY - 1, 3, 3).fill({ color: t.colors.agent.eye });
// Shoes
g.rect(-9, localY + 51, 10, 5).fill({ color: t.colors.agent.shoe });
g.rect(5, localY + 51, 10, 5).fill({ color: t.colors.agent.shoe });
// Typing keyboard
g.rect(-20, localY + 30, 40, 6).fill({ color: t.colors.agent.keyboard });
// Game controller
g.rect(-14, localY + 30, 28, 8).fill({ color: t.colors.agent.gameController });
// Meeting speech dots
g.circle(...).fill({ color: t.colors.agent.speechBubble, alpha: 0.7 });
// Kitchen utensil
g.rect(22, localY + 14 - bite * 12, 3, 12).fill({ color: t.colors.agent.utensil });
// Kitchen snack
g.circle(-1, localY + 33, 5).fill({ color: t.colors.agent.snack });
// Ready paper
g.rect(17, localY + 11, 18, 24).fill({ color: t.colors.agent.readyPaper });
```

**`drawAgentShadow`**:
```typescript
g.ellipse(0, 0, width, 9).fill({ color: t.colors.environment.shadow, alpha: t.colors.agent.shadowAlpha });
```

**`AgentView` bubble**:
```typescript
.fill({ color: t.colors.agent.bubbleFill })
.stroke({ color: t.colors.agent.bubbleStroke, width: 3 });
// tail fill: t.colors.agent.bubbleFill
// tail stroke: t.colors.agent.bubbleTail
```

**`drawDynamicProps`** monitor glows:
```typescript
drawMonitorGlow(g, 162, 430, blink ? t.colors.ui.monitorGlowBlueOn : t.colors.ui.monitorGlowBlueOff);
drawMonitorGlow(g, 342, 430, blink ? t.colors.ui.monitorGlowGreenOn : t.colors.ui.monitorGlowGreenOff);
// etc for all 6 monitors
```

**`drawWhiteboardMarks`**: 
```typescript
g.rect(x, y, 22, 4).fill({ color: i % 2 ? t.colors.accent.red : t.colors.environment.leaf });
```

**`drawGameScreen`**:
```typescript
const colorsByFrame = t.colors.environment.gameScreenColors;
// dot color: t.colors.environment.gameScreenDot
```

**`drawKitchenBites`**:
```typescript
g.circle(838, 170, 14).fill({ color: t.colors.environment.kitchenPlate });
g.circle(838, 170, 9).fill({ color: bite ? t.colors.environment.kitchenFoodA : t.colors.environment.kitchenFoodB });
g.rect(868, 160, 22, 5).fill({ color: t.colors.environment.kitchenUtensil });
g.rect(882, 156 + bite * 3, 4, 13).fill({ color: t.colors.environment.kitchenUtensil });
```

**`drawMeetingNotes`**:
```typescript
g.rect(510, 166, 32, 18).fill({ color: blink ? t.colors.environment.meetingNoteA : t.colors.environment.meetingNoteB });
```

- [ ] **Step 8: Add any missing theme properties discovered during wiring**

During Steps 2-7, you may find hex values not yet in the theme. Add them to `theme.ts` before referencing. Known additions from analysis:

- `environment.tableAltBase`: 0x72543d (Dev Sync table base)
- `environment.tableAltTop`: 0xa86f48 (Dev Sync table top)
- `environment.arcadeRed`: 0xce565c (red arcade cabinet)
- `environment.arcadeBlue`: 0x3f7cac (blue arcade cabinet)
- `environment.monitorGlowHighlight`: 0xf6ffff (monitor flash line)

- [ ] **Step 9: Verify compilation**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley && npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 10: Visual verification — Phase 1 must be pixel-identical**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley/apps/web && npx vite --open`

Check:
- All 5 rooms render with correct original colors
- Agents animate through the 62s loop
- Chat panel tabs work
- Hover popups appear
- Presentation screen (press 'p') renders correctly
- No visual difference from before the refactor

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/office-world.ts apps/web/src/theme.ts
git commit -m "refactor: wire theme object into office-world, replacing all inline hex values"
```

---

### Task 3: Apply new palette — environment colors (Phase 2)

**Files:**
- Modify: `apps/web/src/theme.ts`

Swap the environment section of the theme to the new warm cream palette. Only environment colors change in this task.

- [ ] **Step 1: Update environment colors in theme.ts**

Replace the `colors.environment` section:

```typescript
environment: {
  void: 0xb8af96,         // was 0x101614
  wall: 0x6d6b73,         // was 0x3d2f28
  wallDark: 0x4e4b55,     // was 0x231a18
  trim: 0x8b8892,         // was 0x6a5947
  floorA: 0xe6e0cc,       // was 0xb78b5b
  floorB: 0xd9d1b8,       // was 0xc69a67
  carpetA: 0xc8c0a6,      // was 0x617c63
  carpetB: 0xd9d1b8,      // was 0x78916d
  kitchenTileA: 0xe6e0cc, // was 0xd8d3bd
  kitchenTileB: 0xd8d4d6, // was 0xcfc6aa
  devSyncFloorA: 0xd9d1b8, // was 0x7c786b
  devSyncFloorB: 0xc8c0a6, // was 0x898377
  gameRoomFloorA: 0xc8c0a6, // was 0x695e86
  gameRoomFloorB: 0xb8af96, // was 0x746797
  desk: 0xb8af96,          // was 0x8f5b3e
  deskTop: 0xc8c0a6,       // was 0xb9794d
  deskLeg: 0x4e4b55,       // was 0x513d2b
  monitor: 0x22334b,       // UNCHANGED — dark screens are deliberate contrast
  monitorGlow: 0x6d86a8,   // was 0x9bd6ff — dusty blue
  monitorStand: 0x4e4b55,  // was 0x1c2736
  keyboard: 0x4e4b55,      // was 0x30261f
  board: 0xe8eee6,         // UNCHANGED — already light
  boardStroke: 0x8b8892,   // was 0x6b7a75
  boardMarkGreen: 0x7fa06b, // was 0x75a187
  boardMarkRed: 0xc97b7b,   // was 0xc9514d
  glass: 0xd8d4d6,         // was 0x88c4d4
  shadow: 0x4e4b55,        // was 0x221b16
  leaf: 0x7fa06b,          // was 0x548a4f
  leafMid: 0x7fa06b,       // was 0x66a85a
  leafDark: 0x7fa06b,      // was 0x4f8a4c
  leafLight: 0x7fa06b,     // was 0x5f9d54
  pot: 0xb8af96,           // was 0xa35e3f
  potLight: 0xc8c0a6,      // was 0xc46d49
  tableLeg: 0x4e4b55,      // was 0x4a3022
  roundTableLeg: 0x4e4b55, // was 0x563b2d
  chairLeg: 0x4e4b55,      // was 0x342820
  bookshelfFrame: 0x8b8892, // was 0x5e3c2b
  bookshelfShelf: 0x4e4b55, // was 0x2e211c
  coffeeTableBase: 0xb8af96, // was 0x83543a
  coffeeTableTop: 0xc8c0a6,  // was 0xa66f49
  coffeeTableLeg: 0x4e4b55,  // was 0x3d2f28
  waterCoolerBody: 0xd8d4d6, // was 0xd9d7c7
  waterCoolerSpigot: 0x6d6b73, // was 0x5b6b72
  waterCoolerJug: 0xd8d4d6,   // was 0x9dd7e7
  waterCoolerHighlight: 0xece9ea, // was 0xecffff
  noticeBoardCork: 0xd9d1b8,  // was 0xcead75
  rugBase: 0xb8af96,         // was 0x7c5651
  couchGreen: 0xc8c0a6,      // was 0x6b9f5a
  couchPurple: 0xb8af96,     // was 0x866cb0
  arcadeScreenDark: 0x22334b, // was 0x15252a — keep dark for screens
  arcadeControlPanel: 0x4e4b55, // was 0x231a18
  arcadeBase: 0x4e4b55,      // was 0x2c1d1b
  laptopBody: 0x22334b,      // was 0x1d2530 — keep dark for screens
  laptopScreen: 0x6d86a8,    // was 0x8fd1c7 — dusty blue
  laptopBase: 0x4e4b55,      // was 0x2f3340
  kitchenCounter: 0xd8d4d6,  // was 0x8fb6b0
  kitchenSink: 0xece9ea,     // was 0xe9f3f0
  kitchenAppliance: 0xc97b7b, // was 0xd05b4e — soft red
  kitchenOvenBody: 0x6d6b73, // was 0x505e66
  kitchenOvenWindow: 0xece9ea, // was 0xcfe5e1
  kitchenRoundTable: 0xc8c0a6, // was 0xba8651
  kitchenPlate: 0xece9ea,    // was 0xf8f1dc
  kitchenFoodA: 0xd8b663,    // was 0xffcf7a — warm gold
  kitchenFoodB: 0xc97b7b,    // was 0xd85d4f — soft red
  kitchenUtensil: 0x8b8892,  // was 0xaeb5aa
  boardroomChair: 0x8b8892,  // was 0x46606d
  devSyncChair: 0x8b8892,    // was 0x755d83
  kitchenChair: 0x8b8892,    // was 0x5f8f7e
  gameRoomRoundTable: 0xb8af96, // was 0x7f5742
  meetingNoteA: 0xece9ea,    // was 0xfff2cf
  meetingNoteB: 0xd8b663,    // was 0xf4c76b
  gameScreenColors: [0xd8b663, 0x6d86a8, 0xc97b7b] as readonly number[], // was yellow/cyan/pink
  gameScreenDot: 0x4e4b55,   // was 0x101614
  fileStackPaper: 0xece9ea,  // was 0xfff2cf
  noticePaperA: 0xece9ea,    // was 0xfff2cf
  noticePaperB: 0x6d86a8,    // was 0x8fd1c7
  noticePaperC: 0xd8b663,    // was 0xf4c76b
  pottedBooksShelf: 0x8b8892, // was 0x5e3c2b
  tableAltBase: 0xb8af96,    // was 0x72543d
  tableAltTop: 0xc8c0a6,     // was 0xa86f48
  arcadeRed: 0xc97b7b,       // was 0xce565c
  arcadeBlue: 0x6d86a8,      // was 0x3f7cac
  monitorGlowHighlight: 0xece9ea, // was 0xf6ffff
},
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley && npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 3: Visual spot-check — environment should be warm cream**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley/apps/web && npx vite --open`

Check:
- Floors are light cream/beige checkerboard
- Walls are subtle gray borders around rooms
- Void between rooms is muted sand
- Furniture reads as muted neutral blocks
- Plants are muted green
- Agents are now the most saturated elements (they pop against light backgrounds)
- Monitors still dark (deliberate contrast)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/theme.ts
git commit -m "feat: apply warm cream environment palette"
```

---

### Task 4: Apply new palette — UI chrome colors and drawPixelPanel rework

**Files:**
- Modify: `apps/web/src/theme.ts`
- Modify: `apps/web/src/office-world.ts` (drawPixelPanel signature change)

Swap UI chrome colors and rework the panel border structure from accent-stripe style to RPG menu style.

- [ ] **Step 1: Update UI colors in theme.ts**

Replace the `colors.ui` section:

```typescript
ui: {
  panelBg: 0xece9ea,         // was 0x1a365d
  panelSecondary: 0xd8d4d6,  // was 0x0d1627
  panelOuterBorder: 0x4e4b55, // was 0x071421 — deep outline
  borderPaper: 0x8b8892,     // was 0xf7e6a8 — now inner border tone
  borderShade: 0xece9ea,     // was 0x1c3852 — now panel bg fill
  borderAccentChat: 0x8b8892, // was 0x2f6fab — same as inner border (no accent stripe)
  borderAccentGame: 0x8b8892, // was 0xd4494c
  borderAccentGameShade: 0xece9ea, // was 0x1e493d
  shellA: 0xd8d4d6,          // was 0x172d46
  shellB: 0xece9ea,          // was 0x1c3852
  shellOverlay: 0xd8d4d6,    // was 0x061526
  gameHeaderOuter: 0xd8d4d6, // was 0x274f79
  gameHeaderInner: 0xece9ea, // was 0x1a365d
  gameViewportStroke: 0x4e4b55, // was 0x0d1627
  gameViewportStrokeAccent: 0x8b8892, // was 0xf7e6a8
  chiefAvatarBg: 0xd8d4d6,   // was 0xf7e6a8
  chiefAvatarFace: 0x8b8892,  // was 0x24335c
  chiefAvatarEyes: 0x7fa06b,  // was 0x8ef7a6 — muted green
  chiefAvatarMouth: 0xc97b7b, // was 0xd4494c — soft red
  tabBgOuter: 0x4e4b55,      // was 0x0d1627
  tabActiveFill: 0xd8b663,   // was 0xffd37b — warm gold
  tabEnabledFill: 0xd8d4d6,  // was 0x2f6fab
  tabDisabledFill: 0xb8af96, // was 0x314053
  tabActiveStroke: 0xc97b7b, // was 0xd4494c — soft red
  tabStroke: 0x6d6b73,       // was 0xf7e6a8
  statusBarActiveBg: 0xd8d4d6, // was 0x2f6fab
  statusBarInactiveBg: 0xb8af96, // was 0x314053
  statusBarActiveInner: 0xece9ea, // was 0x1a365d
  statusBarInactiveInner: 0xd8d4d6, // was 0x263146
  noteCardBg: 0xd8d4d6,       // was 0x1a365d
  buttonFill: 0xc97b7b,       // was 0xd4494c — soft red
  buttonStroke: 0x4e4b55,     // was 0xfff2cf — dark outline on light
  miniAgentShadow: 0x4e4b55,  // was 0x0d1627
  blinkA: 0xd8b663,           // was 0xfff2cf — warm gold
  blinkB: 0xc97b7b,           // was 0xffd37b — soft red (alternating)
  monitorGlowBlueOn: 0x6d86a8,  // was 0x9bf4ff — dusty blue
  monitorGlowBlueOff: 0x8b8892, // was 0x73bad4
  monitorGlowGreenOn: 0x7fa06b, // was 0xc5ff9b — muted green
  monitorGlowGreenOff: 0x8b8892, // was 0x7ed47a
  monitorGlowGoldOn: 0xd8b663,  // was 0xffd37b — warm gold
  monitorGlowGoldOff: 0xb8af96, // was 0xd2a15d
  presentationBg: 0xb8af96,     // was 0x111c1d
  presentationTileA: 0xc8c0a6,  // was 0x142526
  presentationTileB: 0xd9d1b8,  // was 0x172b2c
  presentationPanelOuter: 0x8b8892, // was 0x203033
  presentationPanelInner: 0xece9ea, // was 0x142022
  presentationProgressBg: 0xd8d4d6, // was 0x2e4547
  presentationProgressFill: 0x7fa06b, // was 0x466e6a — muted green
  presentationProgressShine: 0xd8b663, // was 0x8fd1c7 — warm gold
  presentationBarA: 0x7fa06b,  // was 0x466e6a
  presentationBarB: 0xd8b663,  // was 0x6b9f5a
  fileCardBg: 0xd8d4d6,       // was 0x203033
  fileCardPaper: 0xece9ea,     // was 0xfff2cf
  fileCardFold: 0xb8af96,     // was 0xd7c89e
  fileCardBarA: 0x8b8892,     // was 0x86a49d
  fileCardBarB: 0x6d6b73,     // was 0x5a706c
},
```

- [ ] **Step 2: Update accent colors in theme.ts**

```typescript
accent: {
  green: 0x7fa06b,   // was 0x8ef7a6
  red: 0xc97b7b,     // was 0xd4494c
  blue: 0x6d86a8,    // was 0x446ab3
  yellow: 0xd8b663,  // was 0xf4c76b
  purple: 0x8b8892,  // was 0x8d639e — desaturated
  gold: 0xd8b663,    // was 0xffd37b
  cyan: 0x6d86a8,    // was 0x8fd1c7
},
```

- [ ] **Step 3: Rework drawPixelPanel in office-world.ts**

The new structure is: dark outer border → medium inner border → light panel fill. No accent stripes.

Change the `drawPixelPanel` function. The old signature is `(g, x, y, width, height, paper, shade, accent)`. The new implementation ignores the `paper`/`shade`/`accent` params and uses theme directly:

```typescript
function drawPixelPanel(
  g: Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  // Outer border (deep outline)
  g.rect(x, y, width, height).fill({ color: t.colors.ui.panelOuterBorder });
  // Inner border
  g.rect(x + 4, y + 4, width - 8, height - 8).fill({ color: t.colors.ui.borderPaper });
  // Panel fill
  g.rect(x + 8, y + 8, width - 16, height - 16).fill({ color: t.colors.ui.panelBg });
}
```

Update all call sites to remove the extra args:
- `drawPixelPanel(shell, CHAT_X, CHAT_Y, CHAT_WIDTH, CHAT_HEIGHT)` (was 8 args)
- `drawPixelPanel(game, GAME_X, GAME_Y, GAME_WIDTH, GAME_HEIGHT)` (was 8 args)
- `drawPixelPanel(panel, CHAT_X + 18, CHAT_Y + 290, CHAT_WIDTH - 36, 392)` (was 8 args)
- `drawPixelPanel(g, x, y, 224, 132)` in drawHoverPopup (was 8 args)

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley && npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 5: Visual spot-check — UI chrome should be light gray with dark borders**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley/apps/web && npx vite --open`

Check:
- Shell background is light gray tiled
- Chat panel has dark outer border, medium inner, light fill
- Game frame has same RPG menu border style
- Game header is light, text should still be visible (may need text color fix in next task)
- Tabs render with warm gold active, gray inactive
- Hover popup has RPG menu borders
- Presentation screen is light sand background

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/theme.ts apps/web/src/office-world.ts
git commit -m "feat: apply cool gray UI chrome palette and RPG menu panel borders"
```

---

### Task 5: Apply new palette — text colors and agent details

**Files:**
- Modify: `apps/web/src/theme.ts`

Flip text from light-on-dark to dark-on-light, update agent detail colors, and update bubble colors.

- [ ] **Step 1: Update text colors in theme.ts**

```typescript
text: {
  primary: 0x4e4b55,       // was 0xfff2cf — dark text on light panels
  secondary: 0x6d6b73,     // was 0xe4f6ff — medium tone
  ink: 0x4e4b55,           // was 0x282f2c — unified with deep outline
  statusActive: 0x7fa06b,  // was 0x8ef7a6 — muted green
  statusWaiting: 0xd8b663, // was 0xffd37b — warm gold
  disabled: 0x8b8892,      // was 0x92a0a8
  presentationTitle: 0x4e4b55,  // was 0xfff2cf — dark on light
  presentationBody: 0x6d6b73,   // was 0xdfe9d8
  fileCardTitle: 0x4e4b55,      // was 0xfff2cf
  fileCardDesc: 0x8b8892,       // was 0xc9d7ce
},
```

- [ ] **Step 2: Update agent detail colors in theme.ts**

```typescript
agent: {
  eye: 0x4e4b55,           // was 0x282f2c
  shoe: 0x4e4b55,          // was 0x1d1a18
  shadow: 0x4e4b55,        // was 0x221b16
  shadowAlpha: 0.20,       // was 0.28 — softer on light floors
  nameStroke: 0xb8af96,    // was 0x241813 — blends with environment
  keyboard: 0x4e4b55,      // was 0x25222a
  gameController: 0x4e4b55, // was 0x22252f
  utensil: 0x8b8892,       // was 0xdce2dd
  snack: 0xd8b663,         // was 0xf4c76b — warm gold
  readyPaper: 0xece9ea,    // was 0xfff2cf
  speechBubble: 0xece9ea,  // was 0xfff2cf
  bubbleFill: 0xece9ea,    // was 0xfff7db
  bubbleStroke: 0x6d6b73,  // was 0x3a2a24
  bubbleTail: 0x6d6b73,    // was 0x3a2a24
},
```

- [ ] **Step 3: Update textStyles in theme.ts to reference new colors**

```typescript
textStyles: {
  plaque: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 11,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0xfff2cf — dark on light room plaques
    letterSpacing: 1,
  },
  smallDark: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 12,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0x282f2c — unified
  },
  bubble: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 10,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0x282f2c — unified
    wordWrap: true,
    wordWrapWidth: 128,
  },
  presentationTitle: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 34,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0xfff2cf — dark on light
  },
  presentationBody: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 18,
    fontWeight: "700" as const,
    fill: 0x6d6b73,         // was 0xdfe9d8
  },
  uiTiny: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 10,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0xfff2cf — dark on light
    letterSpacing: 1,
  },
  uiSmall: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 13,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0xfff2cf
  },
  uiBody: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 15,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0xfff2cf
    lineHeight: 23,
    wordWrap: true,
    wordWrapWidth: 260,
  },
  uiTitle: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 20,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0xfff2cf
    stroke: { color: 0xece9ea, width: 4 }, // was 0x24335c — light stroke on light bg for legibility
  },
  agentName: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 9,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0xfff2cf — dark text
    stroke: { color: 0xb8af96, width: 3 }, // was 0x241813 — blends with environment
  },
  boardLabel: {
    fontFamily: "\"Courier New\", monospace",
    fontSize: 9,
    fontWeight: "700" as const,
    fill: 0x4e4b55,         // was 0x282f2c — unified
  },
},
```

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley && npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 5: Visual verification — full theme should now be applied**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley/apps/web && npx vite --open`

Check:
- All text is dark on light backgrounds — readable and clear
- Agent name labels are dark with environment-colored stroke
- Thought bubbles have gray border on light fill
- Status text uses muted green (active) and warm gold (waiting)
- Presentation screen text is dark on sand background
- Room plaques are dark text on light walls
- Tab labels are readable in all states (active, enabled, disabled)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/theme.ts
git commit -m "feat: flip text to dark-on-light, update agent details and bubble colors"
```

---

### Task 6: Update styles.css and main.ts background colors

**Files:**
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/main.ts`

The HTML/CSS background and PixiJS app background must match the new shell tone.

- [ ] **Step 1: Update styles.css**

Change the `:root` background and color:

```css
:root {
  background: #d8d4d6;
  color: #4e4b55;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
```

- [ ] **Step 2: Update main.ts background**

Change the PixiJS init background:

```typescript
await pixi.init({
  antialias: false,
  autoDensity: true,
  background: "#d8d4d6",
  resolution: window.devicePixelRatio || 1,
  resizeTo: window
});
```

- [ ] **Step 3: Update shell overlay alpha in drawShell**

The shell overlay (`0x061526` at 0.34 alpha) was used to darken the dark background. On the new light background, we either remove it or make it very subtle. In `office-world.ts`, in the `drawShell` method, change the overlay:

```typescript
shell.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: t.colors.ui.shellOverlay, alpha: 0.08 });
```

This gives a very subtle darkening to the shell tile area, distinguishing it from the panel interiors.

- [ ] **Step 4: Visual verification**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley/apps/web && npx vite --open`

Check:
- Page background is light gray (no dark flash on load)
- Shell area behind panels is subtly tinted
- Overall composition reads as light, warm, calm

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/styles.css apps/web/src/main.ts apps/web/src/office-world.ts
git commit -m "feat: update HTML/CSS and PixiJS background to light gray shell tone"
```

---

### Task 7: Full visual walkthrough and polish

**Files:**
- Possibly modify: `apps/web/src/theme.ts` (any final tweaks)

Run through the entire 62-second animation loop and fix any visual issues.

- [ ] **Step 1: Start dev server and watch the full loop**

Run: `cd /Users/esmenava/Desktop/evilness/agent-valley/apps/web && npx vite --open`

Watch the entire 62-second loop. Check each phase:

**0-4s (walk in):**
- Agents walk from spawn to stations
- Agents are clearly visible against light floors
- Shadows are subtle but present

**4-26s (at stations):**
- All 5 rooms visible with correct light tile floors
- Typing agents: keyboards, monitors visible
- Whiteboard agent: marks animate in muted green/red
- Meeting agents: meeting notes blink in gold
- Kitchen agent: food colors are warm gold / soft red
- Game agent: arcade screens animate with accent colors
- Thought bubbles appear with gray borders, readable text
- Monitor glows blink in dusty blue / muted green / warm gold

**26-38s (walk to boardroom):**
- Agents walk across the open office floor
- Light floor, agents pop with color

**38-52s (presentation — press 'p'):**
- Sand background with warm cream tiles
- Dark text on light panels
- Progress bar uses muted green fill, gold shine
- File cards are light with dark text
- Summary text is readable

**52-62s (return to stations):**
- Same as walk phase, just reversed

**Chat panel (always):**
- Chief of staff section readable
- Tab states visually distinct (gold active, gray enabled, darker disabled)
- Agent detail view: text readable, mini agent visible
- Status bar at bottom: green text for active, gold for waiting

**Hover popups:**
- RPG menu borders (dark outer, medium inner, light fill)
- Text readable
- VIEW MORE button in soft red with dark border

- [ ] **Step 2: Fix any contrast or readability issues**

If any text is hard to read or elements blend into backgrounds, adjust the specific theme values. Common fixes:
- If room plaques are invisible: darken plaque text or add a subtle background
- If agent names blend with floor: increase stroke width or darken text
- If tabs look too similar: increase contrast between active gold and enabled gray
- If buttons are too subtle: darken button fill or increase border weight

- [ ] **Step 3: Commit any fixes**

```bash
git add apps/web/src/theme.ts
git commit -m "fix: polish theme values after visual walkthrough"
```

(Skip this step if no fixes were needed.)

- [ ] **Step 4: Final verification**

Run through the loop one more time to confirm all fixes look correct. Verify:
- No remaining neon/bright colors (except agent palettes)
- No dark backgrounds on UI panels
- Overall feel: calm, warm, light, retro RPG

- [ ] **Step 5: Commit all changes if not already committed**

Ensure all files are committed and the working tree is clean:

```bash
git status
```

Expected: `nothing to commit, working tree clean`
