import { Application, Container, Graphics, Rectangle, Text, type TextStyleOptions, type Ticker } from "pixi.js";
import { theme } from "./theme";

const t = theme;

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;
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
const PRESENTATION_START = 38;
const PRESENTATION_END = 52;
const LOOP_SECONDS = 62;

type Activity = "typing" | "whiteboard" | "meeting" | "game" | "kitchen" | "walking" | "ready";

interface Point {
  x: number;
  y: number;
}

interface AgentPalette {
  hair: number;
  skin: number;
  shirt: number;
  pants: number;
  accent: number;
}

interface AgentDefinition {
  name: string;
  palette: AgentPalette;
  spawn: Point;
  station: Point;
  boardroom: Point;
  activity: Exclude<Activity, "walking" | "ready">;
  laneOffset: number;
  thoughts: string[];
}

interface AgentFrame {
  activity: Activity;
  facing: "left" | "right" | "down";
  position: Point;
  bubble?: string;
}

interface AgentStatus {
  agent: AgentDefinition;
  frame: AgentFrame;
}

const agents: AgentDefinition[] = [
  {
    name: "Ada",
    palette: { hair: 0x2d1b14, skin: 0xc88b63, shirt: 0x3f7cac, pants: 0x263a56, accent: 0xf2c14e },
    spawn: { x: 130, y: 640 },
    station: { x: 260, y: 530 },
    boardroom: { x: 120, y: 235 },
    activity: "typing",
    laneOffset: -24,
    thoughts: ["fixing flaky test", "ship the patch", "check logs"]
  },
  {
    name: "Bo",
    palette: { hair: 0x5a3825, skin: 0xd6a06f, shirt: 0x6b9f5a, pants: 0x2e4a3b, accent: 0xf0ede0 },
    spawn: { x: 220, y: 640 },
    station: { x: 565, y: 205 },
    boardroom: { x: 205, y: 235 },
    activity: "whiteboard",
    laneOffset: -8,
    thoughts: ["mapping states", "simpler flow", "draw the edge"]
  },
  {
    name: "Cy",
    palette: { hair: 0x1d1b25, skin: 0xb87155, shirt: 0xb95f89, pants: 0x40334f, accent: 0x8fd1c7 },
    spawn: { x: 310, y: 640 },
    station: { x: 475, y: 216 },
    boardroom: { x: 290, y: 235 },
    activity: "meeting",
    laneOffset: 8,
    thoughts: ["align contract", "note the risk", "ask for scope"]
  },
  {
    name: "Dee",
    palette: { hair: 0x403022, skin: 0xe0ad7b, shirt: 0xd47a3d, pants: 0x63432d, accent: 0x75b7f0 },
    spawn: { x: 400, y: 640 },
    station: { x: 1108, y: 210 },
    boardroom: { x: 120, y: 145 },
    activity: "game",
    laneOffset: 24,
    thoughts: ["short break", "high score?", "one more round"]
  },
  {
    name: "Eli",
    palette: { hair: 0x212222, skin: 0x986b55, shirt: 0x7b6ec8, pants: 0x2d2c44, accent: 0xffd37b },
    spawn: { x: 490, y: 640 },
    station: { x: 858, y: 214 },
    boardroom: { x: 205, y: 145 },
    activity: "kitchen",
    laneOffset: 40,
    thoughts: ["snack deploy", "more coffee", "tiny sandwich"]
  },
  {
    name: "Faye",
    palette: { hair: 0x7a3f2c, skin: 0xdfb08c, shirt: 0x5d9fb2, pants: 0x253e4b, accent: 0xf6edf8 },
    spawn: { x: 580, y: 640 },
    station: { x: 770, y: 548 },
    boardroom: { x: 290, y: 145 },
    activity: "typing",
    laneOffset: 56,
    thoughts: ["update readme", "clean diff", "small PR"]
  }
];

export function createOfficeWorld(app: Application): void {
  const world = new OfficeWorld(app);
  world.mount();
}

class OfficeWorld {
  private readonly root = new Container();
  private readonly shellLayer = new Container();
  private readonly chatLayer = new Container();
  private readonly gameFrameLayer = new Container();
  private readonly officeViewport = new Container();
  private readonly officeRoot = new Container();
  private readonly staticLayer = new Container();
  private readonly dynamicLayer = new Container();
  private readonly agentLayer = new Container();
  private readonly hoverLayer = new Container();
  private readonly presentationLayer = new Container();
  private readonly officeMask = new Graphics();
  private readonly agentViews: AgentView[];
  private readonly agentStatuses = new Map<string, AgentStatus>();
  private elapsed = 0;
  private officeScale = 1;
  private officeX = 0;
  private officeY = 0;
  private activeTab = "chief";
  private hoveredAgent?: string;
  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (key === "b") {
      this.elapsed = 35;
    }

    if (key === "p") {
      this.elapsed = PRESENTATION_START;
    }
  };

  public constructor(private readonly app: Application) {
    this.agentViews = agents.map((agent) => {
      const view = new AgentView(agent);
      view.container.eventMode = "dynamic";
      view.container.cursor = "pointer";
      view.container.hitArea = new Rectangle(-28, -82, 56, 92);
      view.container.on("pointerover", () => {
        this.hoveredAgent = agent.name;
      });
      view.container.on("pointerout", () => {
        if (this.hoveredAgent === agent.name) {
          this.hoveredAgent = undefined;
        }
      });
      view.container.on("pointertap", () => {
        this.selectAgent(agent.name);
      });
      return view;
    });
  }

  public mount(): void {
    this.agentLayer.sortableChildren = true;
    this.officeMask.renderable = false;
    this.officeRoot.addChild(this.staticLayer, this.dynamicLayer, this.agentLayer);
    this.officeViewport.addChild(this.officeRoot);
    this.officeViewport.mask = this.officeMask;
    this.root.addChild(
      this.shellLayer,
      this.gameFrameLayer,
      this.officeViewport,
      this.officeMask,
      this.chatLayer,
      this.hoverLayer,
      this.presentationLayer
    );
    this.app.stage.addChild(this.root);

    this.drawStaticOffice();
    this.agentViews.forEach((agent) => this.agentLayer.addChild(agent.container));
    this.layoutOfficeViewport();
    this.resize();
    this.app.renderer.on("resize", () => this.resize());
    window.addEventListener("keydown", this.handleKeyDown);
    this.app.ticker.add((ticker: Ticker) => this.update(ticker));
  }

  private resize(): void {
    const scale = Math.min(this.app.renderer.width / WORLD_WIDTH, this.app.renderer.height / WORLD_HEIGHT);
    this.root.scale.set(scale);
    this.root.position.set(
      Math.floor((this.app.renderer.width - WORLD_WIDTH * scale) / 2),
      Math.floor((this.app.renderer.height - WORLD_HEIGHT * scale) / 2)
    );
  }

  private layoutOfficeViewport(): void {
    const contentWidth = GAME_WIDTH - GAME_INSET * 2;
    const contentHeight = GAME_HEIGHT - GAME_HEADER_HEIGHT - GAME_INSET * 2;
    this.officeScale = Math.min(contentWidth / WORLD_WIDTH, contentHeight / WORLD_HEIGHT);
    this.officeX = GAME_X + GAME_INSET;
    this.officeY = GAME_Y + GAME_HEADER_HEIGHT + GAME_INSET + Math.floor((contentHeight - WORLD_HEIGHT * this.officeScale) / 2);

    this.officeRoot.scale.set(this.officeScale);
    this.officeRoot.position.set(this.officeX, this.officeY);
    this.officeMask
      .clear()
      .rect(GAME_X + GAME_INSET, GAME_Y + GAME_HEADER_HEIGHT + GAME_INSET, contentWidth, contentHeight)
      .fill({ color: 0xffffff });
  }

  private isTaskRunning(time: number): boolean {
    return (time >= 4 && time < PRESENTATION_START) || time >= PRESENTATION_END;
  }

  private selectAgent(agentName: string): void {
    if (this.isTaskRunning(this.elapsed)) {
      this.activeTab = agentName;
    }
  }

  private update(ticker: Ticker): void {
    const deltaSeconds = Math.min(ticker.deltaMS / 1000, 0.05);
    this.elapsed = (this.elapsed + deltaSeconds) % LOOP_SECONDS;
    const time = this.elapsed;
    const presenting = time >= PRESENTATION_START && time < PRESENTATION_END;

    this.shellLayer.visible = !presenting;
    this.gameFrameLayer.visible = !presenting;
    this.officeViewport.visible = !presenting;
    this.chatLayer.visible = !presenting;
    this.hoverLayer.visible = !presenting;
    this.presentationLayer.visible = presenting;

    if (presenting) {
      this.drawPresentation(time - PRESENTATION_START);
      return;
    }

    this.drawShell(time);
    this.drawDynamicProps(time);

    const activeBubbleIndex = time >= 5 && time < 26 ? Math.floor((time - 5) / 3.2) % agents.length : -1;
    this.agentStatuses.clear();

    this.agentViews.forEach((agentView, index) => {
      const frame = this.getAgentFrame(agentView.definition, index, time, activeBubbleIndex);
      agentView.update(frame, time);
      agentView.container.zIndex = Math.floor(frame.position.y);
      this.agentStatuses.set(agentView.definition.name, {
        agent: agentView.definition,
        frame
      });
    });
    if (!this.isTaskRunning(time) && this.activeTab !== "chief") {
      this.activeTab = "chief";
    }
    this.drawChat(time);
    this.drawHoverPopup(time);
  }

  private drawShell(time: number): void {
    this.shellLayer.removeChildren();
    this.gameFrameLayer.removeChildren();

    const shell = new Graphics();
    const game = new Graphics();
    this.shellLayer.addChild(shell);
    this.gameFrameLayer.addChild(game);

    drawTileFloor(shell, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, t.colors.ui.shellTileA, t.colors.ui.shellTileB);
    shell.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: t.colors.ui.shellOverlay, alpha: 0.08 });

    drawPixelPanel(shell, CHAT_X, CHAT_Y, CHAT_WIDTH, CHAT_HEIGHT);
    drawPixelPanel(game, GAME_X, GAME_Y, GAME_WIDTH, GAME_HEIGHT);

    game.rect(GAME_X + 14, GAME_Y + 14, GAME_WIDTH - 28, 42).fill({ color: t.colors.ui.gameHeaderOuter });
    game.rect(GAME_X + 18, GAME_Y + 18, GAME_WIDTH - 36, 34).fill({ color: t.colors.ui.gameHeaderInner });
    addText(game, "AGENT VALLEY OFFICE", GAME_X + 34, GAME_Y + 24, t.textStyles.uiTitle);
    addText(game, this.isTaskRunning(time) ? "TASK RUNNING" : "WAITING FOR ORDERS", GAME_X + GAME_WIDTH - 214, GAME_Y + 30, {
      ...t.textStyles.uiTiny,
      fill: this.isTaskRunning(time) ? t.colors.text.statusActive : t.colors.text.statusWaiting
    });

    const blink = Math.floor(time * 2) % 2 === 0 ? t.colors.headerBlinkA : t.colors.headerBlinkB;
    game.rect(GAME_X + GAME_WIDTH - 40, GAME_Y + 28, 12, 12).fill({ color: blink });
    game.rect(GAME_X + GAME_INSET, GAME_Y + GAME_HEADER_HEIGHT + GAME_INSET, GAME_WIDTH - GAME_INSET * 2, GAME_HEIGHT - GAME_HEADER_HEIGHT - GAME_INSET * 2)
      .stroke({ color: t.colors.ui.gameViewportStrokeOuter, width: 5 })
      .stroke({ color: t.colors.ui.gameViewportStrokeInner, width: 2 });
  }

  private drawChat(time: number): void {
    this.chatLayer.removeChildren();
    const panel = new Graphics();
    this.chatLayer.addChild(panel);

    const taskRunning = this.isTaskRunning(time);
    panel.rect(CHAT_X + 16, CHAT_Y + 16, CHAT_WIDTH - 32, 74).fill({ color: t.colors.ui.chatAvatarBg });
    panel.rect(CHAT_X + 24, CHAT_Y + 24, 58, 58).fill({ color: t.colors.ui.chatAvatarFrame });
    panel.rect(CHAT_X + 32, CHAT_Y + 34, 42, 28).fill({ color: t.colors.ui.chatAvatarFace });
    panel.rect(CHAT_X + 40, CHAT_Y + 42, 8, 8).fill({ color: t.colors.ui.chatAvatarEyes });
    panel.rect(CHAT_X + 58, CHAT_Y + 42, 8, 8).fill({ color: t.colors.ui.chatAvatarEyes });
    panel.rect(CHAT_X + 42, CHAT_Y + 64, 22, 4).fill({ color: t.colors.ui.chatAvatarMouth });
    addText(panel, "CHIEF OF STAFF", CHAT_X + 96, CHAT_Y + 28, t.textStyles.uiSmall);
    addText(panel, taskRunning ? "Crew is executing." : "Awaiting a task.", CHAT_X + 96, CHAT_Y + 53, {
      ...t.textStyles.uiTiny,
      fill: taskRunning ? t.colors.text.statusActive : t.colors.text.statusWaiting
    });

    this.drawTab(panel, "chief", "CHIEF", CHAT_X + 18, CHAT_Y + 108, CHAT_WIDTH - 36, this.activeTab === "chief", true);

    agents.forEach((agent, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.drawTab(
        panel,
        agent.name,
        agent.name.toUpperCase(),
        CHAT_X + 18 + column * 146,
        CHAT_Y + 154 + row * 42,
        136,
        this.activeTab === agent.name,
        taskRunning
      );
    });

    drawPixelPanel(panel, CHAT_X + 18, CHAT_Y + 290, CHAT_WIDTH - 36, 392);
    const status = this.agentStatuses.get(this.activeTab);

    if (this.activeTab !== "chief" && status && taskRunning) {
      this.drawAgentChat(panel, status, time);
    } else {
      this.drawChiefChat(panel, time, taskRunning);
    }
  }

  private drawTab(
    panel: Graphics,
    id: string,
    label: string,
    x: number,
    y: number,
    width: number,
    active: boolean,
    enabled: boolean
  ): void {
    const fill = active ? t.colors.ui.tabActiveFill : enabled ? t.colors.ui.tabEnabledFill : t.colors.ui.tabDisabledFill;
    const stroke = active ? t.colors.ui.tabActiveStroke : t.colors.ui.tabEnabledStroke;
    const tab = new Container();
    const g = new Graphics();
    tab.addChild(g);
    g.rect(x, y, width, 30).fill({ color: t.colors.ui.tabBackground });
    g.rect(x + 4, y + 4, width - 8, 22).fill({ color: fill }).stroke({ color: stroke, width: 2 });
    addText(tab, enabled ? label : `${label} LOCK`, x + 12, y + 10, {
      ...t.textStyles.uiTiny,
      fill: enabled ? t.colors.text.primary : t.colors.text.disabled
    });
    if (enabled) {
      tab.eventMode = "static";
      tab.cursor = "pointer";
      tab.hitArea = new Rectangle(x, y, width, 30);
      tab.on("pointertap", () => {
        this.activeTab = id;
      });
    }
    panel.addChild(tab);
  }

  private drawChiefChat(panel: Graphics, time: number, taskRunning: boolean): void {
    addText(panel, "Hello Boss.", CHAT_X + 42, CHAT_Y + 320, {
      ...t.textStyles.uiTitle,
      fill: t.colors.text.heading,
      stroke: { color: t.colors.text.chiefChatStroke, width: 4 }
    });
    addText(panel, "Six workers. Hey, how you doing?", CHAT_X + 42, CHAT_Y + 358, {
      ...t.textStyles.uiBody,
      wordWrapWidth: 242
    });

    const message = taskRunning
      ? "I gave the crew a task. Hover a worker in the office to read their pop-up, then pick View More."
      : "When I assign a task, worker tabs unlock and the office comes alive.";
    addText(panel, message, CHAT_X + 42, CHAT_Y + 434, {
      ...t.textStyles.uiBody,
      fill: t.colors.text.info,
      wordWrapWidth: 242
    });

    panel.rect(CHAT_X + 42, CHAT_Y + 604, 236, 38).fill({ color: taskRunning ? t.colors.ui.buttonActiveBg : t.colors.ui.buttonDisabledBg });
    panel.rect(CHAT_X + 48, CHAT_Y + 610, 224, 26).fill({ color: taskRunning ? t.colors.ui.buttonActiveInner : t.colors.ui.buttonDisabledInner });
    addText(panel, taskRunning ? "AGENTS ARE WORKING" : "TASK QUEUED SOON", CHAT_X + 64, CHAT_Y + 617, {
      ...t.textStyles.uiTiny,
      fill: taskRunning ? t.colors.text.statusActive : t.colors.text.statusWaiting
    });

    const cursorX = CHAT_X + 50 + Math.floor(Math.sin(time * 5) * 3);
    panel.rect(cursorX, CHAT_Y + 654, 12, 10).fill({ color: t.colors.text.primary });
  }

  private drawAgentChat(panel: Graphics, status: AgentStatus, time: number): void {
    const agent = status.agent;
    addText(panel, `${agent.name}'S TAB`, CHAT_X + 42, CHAT_Y + 320, {
      ...t.textStyles.uiTitle,
      fill: t.colors.text.heading,
      stroke: { color: t.colors.text.chiefChatStroke, width: 4 }
    });
    drawMiniAgent(panel, CHAT_X + 78, CHAT_Y + 404, agent.palette, time);
    addText(panel, `Doing: ${activityLabel(status.frame.activity)}`, CHAT_X + 122, CHAT_Y + 374, {
      ...t.textStyles.uiBody,
      wordWrapWidth: 160
    });
    addText(panel, `Thinking: ${thoughtFor(agent, time)}`, CHAT_X + 122, CHAT_Y + 438, {
      ...t.textStyles.uiBody,
      fill: t.colors.text.info,
      wordWrapWidth: 150
    });
    panel.rect(CHAT_X + 42, CHAT_Y + 546, 236, 72).fill({ color: t.colors.ui.notesPanelBg });
    addText(panel, "Current note", CHAT_X + 58, CHAT_Y + 562, t.textStyles.uiTiny);
    addText(panel, "Keep the work moving and report back in the boardroom.", CHAT_X + 58, CHAT_Y + 584, {
      ...t.textStyles.uiSmall,
      fontSize: 12,
      wordWrap: true,
      wordWrapWidth: 202
    });
  }

  private drawHoverPopup(time: number): void {
    this.hoverLayer.removeChildren();

    if (!this.hoveredAgent || !this.isTaskRunning(time)) {
      return;
    }

    const status = this.agentStatuses.get(this.hoveredAgent);
    if (!status) {
      return;
    }

    const popup = new Container();
    const g = new Graphics();
    popup.addChild(g);
    this.hoverLayer.addChild(popup);

    const anchorX = this.officeX + status.frame.position.x * this.officeScale;
    const anchorY = this.officeY + status.frame.position.y * this.officeScale;
    const x = clamp(anchorX - 88, GAME_X + 16, GAME_X + GAME_WIDTH - 240);
    const y = clamp(anchorY - 152, GAME_Y + 76, GAME_Y + GAME_HEIGHT - 166);

    drawPixelPanel(g, x, y, 224, 132);
    addText(popup, status.agent.name.toUpperCase(), x + 18, y + 18, {
      ...t.textStyles.uiSmall,
      fill: t.colors.text.heading
    });
    addText(popup, activityLabel(status.frame.activity), x + 18, y + 44, {
      ...t.textStyles.uiTiny,
      fill: t.colors.text.statusActive
    });
    addText(popup, thoughtFor(status.agent, time), x + 18, y + 66, {
      ...t.textStyles.uiTiny,
      fill: t.colors.text.primary,
      wordWrap: true,
      wordWrapWidth: 184
    });

    const button = new Container();
    const bg = new Graphics();
    button.addChild(bg);
    bg.rect(x + 116, y + 92, 86, 24).fill({ color: t.colors.ui.buttonViewMore }).stroke({ color: t.colors.text.primary, width: 2 });
    addText(button, "VIEW MORE", x + 128, y + 99, {
      ...t.textStyles.uiTiny,
      fontSize: 9
    });
    button.eventMode = "static";
    button.cursor = "pointer";
    button.hitArea = new Rectangle(x + 116, y + 92, 86, 24);
    button.on("pointertap", () => this.selectAgent(status.agent.name));
    popup.addChild(button);
  }

  private getAgentFrame(
    agent: AgentDefinition,
    index: number,
    time: number,
    activeBubbleIndex: number
  ): AgentFrame {
    const stationPoint = floatPoint(agent.station, time, agent.activity, index);
    const boardroomPoint = floatPoint(agent.boardroom, time, "ready", index);

    if (time < 4) {
      return {
        activity: "walking",
        facing: "down",
        position: walkPath(agent.spawn, agent.station, time / 4, agent.laneOffset)
      };
    }

    if (time < 26) {
      const thought = activeBubbleIndex === index ? thoughtFor(agent, time) : undefined;

      return {
        activity: agent.activity,
        facing: facingFor(agent.activity, index),
        position: stationPoint,
        bubble: thought
      };
    }

    const leaveDelay = index * 0.75;

    if (time < 33 + leaveDelay) {
      const progress = clamp((time - 26 - leaveDelay) / 5, 0, 1);

      return {
        activity: progress >= 1 ? "ready" : "walking",
        facing: "left",
        position: progress >= 1 ? boardroomPoint : walkPath(agent.station, agent.boardroom, easeInOut(progress), agent.laneOffset)
      };
    }

    if (time < PRESENTATION_START) {
      return {
        activity: "ready",
        facing: "down",
        position: boardroomPoint,
        bubble: index === 0 && time > 35 ? "ready to present" : undefined
      };
    }

    if (time >= PRESENTATION_END && time < 58) {
      const progress = clamp((time - PRESENTATION_END - index * 0.35) / 4.5, 0, 1);

      return {
        activity: progress >= 1 ? agent.activity : "walking",
        facing: "right",
        position: walkPath(agent.boardroom, agent.station, easeInOut(progress), agent.laneOffset)
      };
    }

    return {
      activity: agent.activity,
      facing: facingFor(agent.activity, index),
      position: stationPoint
    };
  }

  private drawStaticOffice(): void {
    const g = new Graphics();
    this.staticLayer.addChild(g);

    g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: t.colors.environment.officeBackground });
    drawRoom(g, 32, 36, 340, 238, t.colors.environment.carpetA, "BOARDROOM");
    drawRoom(g, 404, 36, 330, 238, t.colors.environment.devSyncFloorA, "DEV SYNC");
    drawRoom(g, 764, 36, 220, 238, t.colors.environment.kitchenTileA, "KITCHEN");
    drawRoom(g, 1018, 36, 230, 238, t.colors.environment.gameRoomFloorA, "GAME ROOM");
    drawRoom(g, 32, 304, 1216, 372, t.colors.environment.floorA, "OPEN DESKS");

    this.drawOpenOffice(g);
    this.drawBoardroom(g);
    this.drawDevSyncRoom(g);
    this.drawKitchen(g);
    this.drawGameRoom(g);
    this.drawDecor(g);
  }

  private drawOpenOffice(g: Graphics): void {
    drawTileFloor(g, 42, 314, 1196, 352, t.colors.environment.floorA, t.colors.environment.floorB);

    const deskPositions = [
      { x: 138, y: 424 },
      { x: 318, y: 424 },
      { x: 644, y: 442 },
      { x: 824, y: 442 },
      { x: 224, y: 562 },
      { x: 720, y: 562 }
    ];

    deskPositions.forEach((desk, index) => {
      drawDesk(g, desk.x, desk.y, index % 2 === 0 ? "left" : "right");
    });

    drawRug(g, 444, 394, 134, 92, t.colors.environment.openOfficeRug);
    drawCouch(g, 1018, 520, 138, 42, t.colors.environment.openOfficeCouch);
    drawCoffeeTable(g, 1060, 590);
    drawBookshelf(g, 1124, 338);
    drawPlant(g, 86, 342, 1.1);
    drawPlant(g, 1188, 620, 0.9);
  }

  private drawBoardroom(g: Graphics): void {
    drawTileFloor(g, 42, 46, 320, 218, t.colors.environment.carpetA, t.colors.environment.carpetB);
    drawLongTable(g, 106, 108, 194, 78, t.colors.environment.boardroomTableBase, t.colors.environment.boardroomTableTop);
    drawWhiteboard(g, 76, 58, 230, 34, "ROADMAP");
    drawChair(g, 92, 138, t.colors.environment.boardroomChair);
    drawChair(g, 316, 138, t.colors.environment.boardroomChair);
    drawChair(g, 132, 204, t.colors.environment.boardroomChair);
    drawChair(g, 252, 204, t.colors.environment.boardroomChair);
    drawTinyFileStack(g, 184, 132);
  }

  private drawDevSyncRoom(g: Graphics): void {
    drawTileFloor(g, 414, 46, 310, 218, t.colors.environment.devSyncFloorA, t.colors.environment.devSyncFloorB);
    drawLongTable(g, 442, 144, 142, 64, t.colors.environment.devSyncTableBase, t.colors.environment.devSyncTableTop);
    drawWhiteboard(g, 508, 58, 164, 56, "ARCHITECTURE");
    drawChair(g, 424, 154, t.colors.environment.devSyncChair);
    drawChair(g, 596, 154, t.colors.environment.devSyncChair);
    drawChair(g, 500, 218, t.colors.environment.devSyncChair);
    drawLaptopOnTable(g, 494, 160);
  }

  private drawKitchen(g: Graphics): void {
    drawTileFloor(g, 774, 46, 200, 218, t.colors.environment.kitchenTileA, t.colors.environment.kitchenTileB);
    g.rect(782, 62, 176, 34).fill({ color: t.colors.environment.kitchenCounter });
    g.rect(790, 68, 46, 22).fill({ color: t.colors.environment.kitchenSink });
    g.rect(846, 68, 42, 22).fill({ color: t.colors.environment.kitchenStove });
    g.rect(904, 64, 42, 30).fill({ color: t.colors.environment.kitchenAppliance });
    g.rect(910, 70, 30, 16).fill({ color: t.colors.environment.kitchenApplianceInner });
    drawRoundTable(g, 838, 170, 54, t.colors.environment.kitchenTable);
    drawChair(g, 792, 176, t.colors.environment.kitchenChair);
    drawChair(g, 914, 176, t.colors.environment.kitchenChair);
    drawPlant(g, 954, 240, 0.75);
  }

  private drawGameRoom(g: Graphics): void {
    drawTileFloor(g, 1028, 46, 210, 218, t.colors.environment.gameRoomFloorA, t.colors.environment.gameRoomFloorB);
    drawArcadeCabinet(g, 1050, 82, t.colors.environment.arcadeCabinetRed);
    drawArcadeCabinet(g, 1114, 82, t.colors.environment.arcadeCabinetBlue);
    drawCouch(g, 1052, 202, 124, 36, t.colors.environment.gameRoomCouch);
    drawRoundTable(g, 1190, 166, 32, t.colors.environment.gameRoomTable);
    drawBookshelf(g, 1206, 86);
  }

  private drawDecor(g: Graphics): void {
    drawPlant(g, 390, 288, 0.8);
    drawPlant(g, 750, 288, 0.8);
    drawWaterCooler(g, 948, 310);
    drawNoticeBoard(g, 52, 690);
    drawPottedBooks(g, 590, 336);
  }

  private drawDynamicProps(time: number): void {
    this.dynamicLayer.removeChildren();
    const g = new Graphics();
    this.dynamicLayer.addChild(g);

    const blink = Math.floor(time * 3) % 2;
    drawMonitorGlow(g, 162, 430, blink ? t.colors.monitorGlow.cyanBright : t.colors.monitorGlow.cyanDim);
    drawMonitorGlow(g, 342, 430, blink ? t.colors.monitorGlow.greenBright : t.colors.monitorGlow.greenDim);
    drawMonitorGlow(g, 668, 448, blink ? t.colors.monitorGlow.cyanBright : t.colors.monitorGlow.cyanDim);
    drawMonitorGlow(g, 848, 448, blink ? t.colors.monitorGlow.yellowBright : t.colors.monitorGlow.yellowDim);
    drawMonitorGlow(g, 248, 568, blink ? t.colors.monitorGlow.greenBright : t.colors.monitorGlow.greenDim);
    drawMonitorGlow(g, 744, 568, blink ? t.colors.monitorGlow.cyanBright : t.colors.monitorGlow.cyanDim);

    drawWhiteboardMarks(g, time);
    drawGameScreen(g, time);
    drawKitchenBites(g, time);
    drawMeetingNotes(g, time);
  }

  private drawPresentation(time: number): void {
    this.presentationLayer.removeChildren();
    const g = new Graphics();
    this.presentationLayer.addChild(g);

    const pulse = 0.5 + Math.sin(time * 3) * 0.5;

    g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: t.colors.ui.presentationBg });
    drawTileFloor(g, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, t.colors.ui.presentationTileA, t.colors.ui.presentationTileB);
    g.rect(74, 60, 1132, 600).fill({ color: t.colors.ui.presentationOuterFrame });
    g.rect(82, 68, 1116, 584).fill({ color: t.colors.ui.presentationInnerFrame });
    g.rect(108, 96, 1064, 64).fill({ color: t.colors.ui.presentationProgressTrack });
    g.rect(112, 100, 1056 * clamp(time / 4, 0, 1), 56).fill({ color: t.colors.ui.presentationProgressFill });
    g.rect(112, 100, 1056, 4).fill({ color: t.colors.ui.presentationProgressGlow, alpha: 0.4 + pulse * 0.35 });

    const title = new Text({
      text: "Agent session complete",
      style: t.textStyles.presentationTitle,
      textureStyle: { scaleMode: "nearest" }
    });
    title.position.set(132, 108);
    this.presentationLayer.addChild(title);

    const summary = new Text({
      text: "Summary\n- Implemented office task loop\n- Generated activity visuals\n- Prepared review packet",
      style: { ...t.textStyles.presentationBody, lineHeight: 31 },
      textureStyle: { scaleMode: "nearest" }
    });
    summary.position.set(132, 218);
    this.presentationLayer.addChild(summary);

    drawFileCard(g, 574, 214, "src/office-world.ts", "Pixi office scene", t.colors.fileCardAccentCyan);
    drawFileCard(g, 574, 330, "src/main.ts", "Canvas bootstrap", t.colors.fileCardAccentGold);
    drawFileCard(g, 574, 446, "src/styles.css", "Pixel rendering", t.colors.fileCardAccentPink);

    for (let index = 0; index < 5; index += 1) {
      const y = 542 + index * 18;
      const width = 300 + Math.sin(time * 2 + index) * 22;
      g.rect(132, y, width, 8).fill({ color: index % 2 ? t.colors.ui.presentationBarA : t.colors.ui.presentationBarB });
    }
  }
}

class AgentView {
  public readonly container = new Container();
  private readonly shadow = new Graphics();
  private readonly body = new Graphics();
  private readonly bubble = new Container();
  private readonly bubbleBackground = new Graphics();
  private readonly bubbleText = new Text({
    text: "",
    style: t.textStyles.bubble,
    textureStyle: { scaleMode: "nearest" }
  });
  private readonly nameText: Text;

  public constructor(public readonly definition: AgentDefinition) {
    this.nameText = new Text({
      text: definition.name,
      style: t.textStyles.agentName,
      textureStyle: { scaleMode: "nearest" }
    });
    this.nameText.anchor.set(0.5, 0);
    this.nameText.position.set(0, 4);

    this.bubble.addChild(this.bubbleBackground, this.bubbleText);
    this.bubble.visible = false;
    this.container.addChild(this.shadow, this.body, this.nameText, this.bubble);
  }

  public update(frame: AgentFrame, time: number): void {
    this.container.position.set(Math.round(frame.position.x), Math.round(frame.position.y));
    drawAgentSprite(this.body, this.definition.palette, frame.activity, frame.facing, time);
    drawAgentShadow(this.shadow, frame.activity, time);
    this.updateBubble(frame.bubble);
  }

  private updateBubble(thought?: string): void {
    if (!thought) {
      this.bubble.visible = false;
      return;
    }

    const message = thought.length > 30 ? `${thought.slice(0, 27)}...` : thought;
    this.bubble.visible = true;
    this.bubbleText.text = message;
    this.bubbleText.position.set(-58, -76);
    this.bubbleBackground.clear();
    this.bubbleBackground
      .roundRect(-66, -84, 132, 28, 7)
      .fill({ color: t.colors.agent.bubbleFill })
      .stroke({ color: t.colors.agent.bubbleStroke, width: 3 });
    this.bubbleBackground.rect(-10, -58, 14, 10).fill({ color: t.colors.agent.bubbleFill });
    this.bubbleBackground.rect(-7, -55, 8, 4).fill({ color: t.colors.agent.bubbleStroke });
  }
}

function addText(parent: Container, text: string, x: number, y: number, style: TextStyleOptions): Text {
  const label = new Text({
    text,
    style,
    textureStyle: { scaleMode: "nearest" }
  });
  label.position.set(x, y);
  parent.addChild(label);
  return label;
}

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
  g.rect(x + 4, y + 4, width - 8, height - 8).fill({ color: t.colors.ui.panelInnerBorder });
  // Panel fill
  g.rect(x + 8, y + 8, width - 16, height - 16).fill({ color: t.colors.ui.chatPanelShade });
}

function drawMiniAgent(g: Graphics, x: number, y: number, palette: AgentPalette, time: number): void {
  g.rect(x - 24, y + 22, 48, 14).fill({ color: t.colors.ui.miniAgentShadow, alpha: 0.36 });
  const mini = new Graphics();
  drawAgentSprite(mini, palette, "typing", "down", time);
  mini.scale.set(1.35);
  mini.position.set(x, y);
  g.addChild(mini);
}

function activityLabel(activity: Activity): string {
  const labels: Record<Activity, string> = {
    game: "Playing in the game room",
    kitchen: "Eating in the kitchen",
    meeting: "Having a meeting",
    ready: "Ready to present",
    typing: "Typing at the computer",
    walking: "Walking to the next room",
    whiteboard: "Working on the whiteboard"
  };

  return labels[activity];
}

function drawRoom(g: Graphics, x: number, y: number, width: number, height: number, floor: number, label: string): void {
  g.rect(x - 8, y - 8, width + 16, height + 16).fill({ color: t.colors.environment.wallDark });
  g.rect(x, y, width, height).fill({ color: floor });
  g.rect(x, y, width, 8).fill({ color: t.colors.environment.trim });
  g.rect(x, y + height - 8, width, 8).fill({ color: t.colors.environment.wall });
  g.rect(x, y, 8, height).fill({ color: t.colors.environment.wall });
  g.rect(x + width - 8, y, 8, height).fill({ color: t.colors.environment.wallDark });

  const plaque = new Text({
    text: label,
    style: t.textStyles.plaque,
    textureStyle: { scaleMode: "nearest" }
  });
  plaque.position.set(x + 14, y + 12);
  g.addChild(plaque);
}

function drawTileFloor(g: Graphics, x: number, y: number, width: number, height: number, a: number, b: number): void {
  for (let row = 0; row < Math.ceil(height / TILE); row += 1) {
    for (let col = 0; col < Math.ceil(width / TILE); col += 1) {
      const color = (row + col) % 2 === 0 ? a : b;
      g.rect(x + col * TILE, y + row * TILE, TILE, TILE).fill({ color });
    }
  }
}

function drawDesk(g: Graphics, x: number, y: number, facing: "left" | "right"): void {
  g.rect(x, y, 122, 54).fill({ color: t.colors.environment.desk });
  g.rect(x + 5, y + 5, 112, 36).fill({ color: t.colors.environment.deskTop });
  g.rect(x + 14, y + 44, 16, 24).fill({ color: t.colors.environment.deskLeg });
  g.rect(x + 92, y + 44, 16, 24).fill({ color: t.colors.environment.deskLeg });
  const monitorX = facing === "left" ? x + 22 : x + 66;
  g.rect(monitorX, y + 8, 36, 24).fill({ color: t.colors.environment.monitor });
  g.rect(monitorX + 5, y + 13, 26, 12).fill({ color: t.colors.environment.monitorGlow });
  g.rect(monitorX + 14, y + 32, 8, 10).fill({ color: t.colors.environment.monitorStand });
  g.rect(monitorX + 5, y + 40, 26, 5).fill({ color: t.colors.environment.monitorStand });
  g.rect(x + 48, y + 36, 28, 7).fill({ color: t.colors.environment.keyboard });
}

function drawMonitorGlow(g: Graphics, x: number, y: number, color: number): void {
  g.rect(x, y, 26, 12).fill({ color, alpha: 0.88 });
  g.rect(x + 4, y + 4, 18, 2).fill({ color: t.colors.monitorScreenHighlight, alpha: 0.55 });
}

function drawLongTable(g: Graphics, x: number, y: number, width: number, height: number, base: number, top: number): void {
  g.rect(x, y + 10, width, height).fill({ color: base });
  g.rect(x + 7, y, width - 14, height - 4).fill({ color: top });
  g.rect(x + 20, y + height, 18, 22).fill({ color: t.colors.environment.tableLeg });
  g.rect(x + width - 38, y + height, 18, 22).fill({ color: t.colors.environment.tableLeg });
}

function drawRoundTable(g: Graphics, x: number, y: number, radius: number, color: number): void {
  g.circle(x, y, radius).fill({ color });
  g.circle(x, y, radius - 8).fill({ color: lighten(color, 18) });
  g.rect(x - 10, y + radius - 4, 20, 22).fill({ color: t.colors.environment.roundTableLeg });
}

function drawChair(g: Graphics, x: number, y: number, color: number): void {
  g.rect(x - 14, y - 12, 28, 26).fill({ color });
  g.rect(x - 10, y - 18, 20, 8).fill({ color: lighten(color, 20) });
  g.rect(x - 10, y + 12, 6, 12).fill({ color: t.colors.environment.chairLeg });
  g.rect(x + 4, y + 12, 6, 12).fill({ color: t.colors.environment.chairLeg });
}

function drawWhiteboard(g: Graphics, x: number, y: number, width: number, height: number, label: string): void {
  g.rect(x - 3, y - 3, width + 6, height + 6).fill({ color: t.colors.environment.boardStroke });
  g.rect(x, y, width, height).fill({ color: t.colors.environment.board });
  g.rect(x + 12, y + 12, Math.max(24, width - 42), 4).fill({ color: t.colors.accent.whiteboardGreen });
  g.rect(x + 12, y + 24, Math.max(18, width - 70), 4).fill({ color: t.colors.accent.whiteboardRed });
  const boardLabel = new Text({
    text: label,
    style: t.textStyles.boardLabel,
    textureStyle: { scaleMode: "nearest" }
  });
  boardLabel.position.set(x + 10, y + height - 17);
  g.addChild(boardLabel);
}

function drawWhiteboardMarks(g: Graphics, time: number): void {
  const count = 2 + (Math.floor(time * 2) % 4);
  for (let i = 0; i < count; i += 1) {
    const x = 526 + i * 26;
    const y = 84 + Math.sin(time * 4 + i) * 8;
    g.rect(x, y, 22, 4).fill({ color: i % 2 ? t.colors.accent.envRed : t.colors.accent.leaf });
    g.rect(x + 6, y + 8, 12, 3).fill({ color: t.colors.text.ink, alpha: 0.35 });
  }
}

function drawGameScreen(g: Graphics, time: number): void {
  const frame = Math.floor(time * 5) % 3;
  const colorsByFrame = [t.colors.gameScreenYellow, t.colors.gameScreenCyan, t.colors.gameScreenPink];
  g.rect(1062, 100, 28, 20).fill({ color: colorsByFrame[frame] ?? t.colors.gameScreenYellow });
  g.rect(1126, 100, 28, 20).fill({ color: colorsByFrame[(frame + 1) % 3] ?? t.colors.gameScreenCyan });
  g.rect(1070 + frame * 5, 112, 5, 5).fill({ color: t.colors.gameScreenPixel });
  g.rect(1134 + frame * 4, 108, 5, 5).fill({ color: t.colors.gameScreenPixel });
}

function drawKitchenBites(g: Graphics, time: number): void {
  const bite = Math.floor(time * 2) % 2;
  g.circle(838, 170, 14).fill({ color: t.colors.environment.kitchenPlateOuter });
  g.circle(838, 170, 9).fill({ color: bite ? t.colors.environment.kitchenFoodA : t.colors.environment.kitchenFoodB });
  g.rect(868, 160, 22, 5).fill({ color: t.colors.environment.kitchenUtensil });
  g.rect(882, 156 + bite * 3, 4, 13).fill({ color: t.colors.environment.kitchenUtensil });
}

function drawMeetingNotes(g: Graphics, time: number): void {
  const blink = Math.floor(time * 2) % 2;
  g.rect(510, 166, 32, 18).fill({ color: blink ? t.colors.meetingNoteCream : t.colors.meetingNoteGold });
  g.rect(515, 171, 22, 2).fill({ color: t.colors.text.ink, alpha: 0.55 });
  g.rect(515, 176, 15, 2).fill({ color: t.colors.text.ink, alpha: 0.55 });
}

function drawArcadeCabinet(g: Graphics, x: number, y: number, color: number): void {
  g.rect(x, y, 44, 82).fill({ color });
  g.rect(x + 6, y + 8, 32, 28).fill({ color: t.colors.environment.arcadeScreen });
  g.rect(x + 10, y + 46, 24, 7).fill({ color: t.colors.environment.arcadeControls });
  g.circle(x + 14, y + 62, 4).fill({ color: t.colors.accent.envYellow });
  g.circle(x + 28, y + 62, 4).fill({ color: t.colors.accent.envBlue });
  g.rect(x + 5, y + 78, 34, 8).fill({ color: t.colors.environment.arcadeBase });
}

function drawCouch(g: Graphics, x: number, y: number, width: number, height: number, color: number): void {
  g.rect(x, y + 14, width, height).fill({ color });
  g.rect(x + 8, y, width - 16, height - 8).fill({ color: lighten(color, 18) });
  g.rect(x + 8, y + height + 10, 12, 12).fill({ color: t.colors.environment.couchLeg });
  g.rect(x + width - 20, y + height + 10, 12, 12).fill({ color: t.colors.environment.couchLeg });
}

function drawCoffeeTable(g: Graphics, x: number, y: number): void {
  g.rect(x, y, 70, 28).fill({ color: t.colors.environment.coffeeTableBase });
  g.rect(x + 8, y + 6, 54, 10).fill({ color: t.colors.environment.coffeeTableTop });
  g.rect(x + 18, y + 26, 8, 14).fill({ color: t.colors.environment.coffeeTableLeg });
  g.rect(x + 46, y + 26, 8, 14).fill({ color: t.colors.environment.coffeeTableLeg });
}

function drawBookshelf(g: Graphics, x: number, y: number): void {
  g.rect(x, y, 76, 104).fill({ color: t.colors.environment.bookshelfWood });
  g.rect(x + 6, y + 8, 64, 22).fill({ color: t.colors.environment.bookshelfShelf });
  g.rect(x + 6, y + 38, 64, 22).fill({ color: t.colors.environment.bookshelfShelf });
  g.rect(x + 6, y + 68, 64, 22).fill({ color: t.colors.environment.bookshelfShelf });
  const bookColors = [t.colors.accent.envRed, t.colors.accent.envBlue, t.colors.accent.envYellow, t.colors.accent.leaf, t.colors.accent.purple];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      g.rect(x + 11 + col * 8, y + 11 + row * 30, 5, 17).fill({ color: bookColors[(row + col) % bookColors.length] ?? t.colors.accent.envRed });
    }
  }
}

function drawPlant(g: Graphics, x: number, y: number, scale: number): void {
  const potW = 26 * scale;
  g.rect(x - potW / 2, y, potW, 20 * scale).fill({ color: t.colors.environment.potBase });
  g.rect(x - potW / 2 + 4 * scale, y + 5 * scale, potW - 8 * scale, 8 * scale).fill({ color: t.colors.environment.potRim });
  g.circle(x - 12 * scale, y - 10 * scale, 12 * scale).fill({ color: t.colors.environment.leafDark });
  g.circle(x + 10 * scale, y - 14 * scale, 13 * scale).fill({ color: t.colors.environment.leafLight });
  g.circle(x, y - 24 * scale, 11 * scale).fill({ color: t.colors.environment.leafMedium });
}

function drawWaterCooler(g: Graphics, x: number, y: number): void {
  g.rect(x, y + 22, 34, 52).fill({ color: t.colors.environment.waterCoolerBody });
  g.rect(x + 8, y + 46, 18, 6).fill({ color: t.colors.environment.waterCoolerSpigot });
  g.circle(x + 17, y + 14, 20).fill({ color: t.colors.environment.waterCoolerJug, alpha: 0.9 });
  g.circle(x + 10, y + 8, 5).fill({ color: t.colors.environment.waterCoolerHighlight, alpha: 0.7 });
}

function drawNoticeBoard(g: Graphics, x: number, y: number): void {
  g.rect(x, y - 52, 144, 48).fill({ color: t.colors.environment.noticeBoardFrame });
  g.rect(x + 8, y - 44, 128, 32).fill({ color: t.colors.environment.noticeBoardCork });
  g.rect(x + 16, y - 38, 34, 22).fill({ color: t.colors.noticeBoardCardCream });
  g.rect(x + 62, y - 38, 24, 22).fill({ color: t.colors.noticeBoardCardCyan });
  g.rect(x + 96, y - 38, 28, 22).fill({ color: t.colors.noticeBoardCardGold });
}

function drawPottedBooks(g: Graphics, x: number, y: number): void {
  g.rect(x, y, 118, 32).fill({ color: t.colors.environment.bookshelfWood });
  g.rect(x + 10, y - 20, 10, 20).fill({ color: t.colors.accent.envRed });
  g.rect(x + 24, y - 24, 10, 24).fill({ color: t.colors.accent.envBlue });
  g.rect(x + 38, y - 16, 10, 16).fill({ color: t.colors.accent.envYellow });
  drawPlant(g, x + 94, y - 18, 0.6);
}

function drawRug(g: Graphics, x: number, y: number, width: number, height: number, color: number): void {
  g.rect(x, y, width, height).fill({ color });
  g.rect(x + 12, y + 12, width - 24, height - 24).fill({ color: lighten(color, 18) });
  g.rect(x + 24, y + 24, width - 48, height - 48).fill({ color });
}

function drawLaptopOnTable(g: Graphics, x: number, y: number): void {
  g.rect(x, y, 42, 28).fill({ color: t.colors.environment.laptopBase });
  g.rect(x + 6, y + 5, 30, 14).fill({ color: t.colors.environment.laptopScreen });
  g.rect(x - 5, y + 26, 52, 5).fill({ color: t.colors.environment.laptopKeyboard });
}

function drawTinyFileStack(g: Graphics, x: number, y: number): void {
  g.rect(x, y, 34, 22).fill({ color: t.colors.fileStackPaper });
  g.rect(x + 5, y + 5, 24, 2).fill({ color: t.colors.text.ink, alpha: 0.5 });
  g.rect(x + 5, y + 11, 18, 2).fill({ color: t.colors.text.ink, alpha: 0.5 });
}

function drawFileCard(g: Graphics, x: number, y: number, filename: string, description: string, accent: number): void {
  g.rect(x, y, 500, 84).fill({ color: t.colors.ui.presentationFileCardBg });
  g.rect(x + 12, y + 12, 52, 60).fill({ color: t.colors.ui.presentationFileIconBg });
  g.rect(x + 44, y + 12, 20, 20).fill({ color: t.colors.ui.presentationFileIconCorner });
  g.rect(x + 76, y + 20, 300, 12).fill({ color: accent });
  g.rect(x + 76, y + 46, 386, 9).fill({ color: t.colors.ui.presentationFileDetailA });
  g.rect(x + 76, y + 62, 226, 7).fill({ color: t.colors.ui.presentationFileDetailB });

  const fileText = new Text({
    text: filename,
    style: { ...t.textStyles.presentationBody, fontSize: 15, fill: t.colors.text.presentationFileTitle },
    textureStyle: { scaleMode: "nearest" }
  });
  fileText.position.set(x + 82, y + 14);
  g.addChild(fileText);

  const descText = new Text({
    text: description,
    style: { ...t.textStyles.presentationBody, fontSize: 13, fill: t.colors.text.presentationFileDesc },
    textureStyle: { scaleMode: "nearest" }
  });
  descText.position.set(x + 82, y + 38);
  g.addChild(descText);
}

function drawAgentShadow(g: Graphics, activity: Activity, time: number): void {
  g.clear();
  const width = activity === "walking" ? 28 + Math.sin(time * 10) * 2 : 30;
  g.ellipse(0, 0, width, 9).fill({ color: t.colors.agent.shadow, alpha: 0.28 });
}

function drawAgentSprite(
  g: Graphics,
  palette: AgentPalette,
  activity: Activity,
  facing: "left" | "right" | "down",
  time: number
): void {
  g.clear();
  const bob = activity === "walking" ? Math.sin(time * 12) * 3 : Math.sin(time * 4) * 1.2;
  const localY = -42 + bob;
  const legSwing = Math.sin(time * 12);
  const armSwing = Math.sin(time * 10);
  const side = facing === "left" ? -1 : 1;

  g.rect(-12, localY + 34, 9, 17 + (activity === "walking" ? legSwing * 2 : 0)).fill({ color: palette.pants });
  g.rect(3, localY + 34, 9, 17 - (activity === "walking" ? legSwing * 2 : 0)).fill({ color: palette.pants });
  g.rect(-15, localY + 15, 30, 24).fill({ color: palette.shirt });
  g.rect(-10, localY + 9, 20, 10).fill({ color: palette.skin });
  g.rect(-13, localY - 11, 26, 24).fill({ color: palette.skin });
  g.rect(-15, localY - 14, 30, 10).fill({ color: palette.hair });
  g.rect(-16, localY - 6, 7, 17).fill({ color: palette.hair });
  g.rect(9, localY - 6, 7, 17).fill({ color: palette.hair });
  g.rect(-6, localY - 1, 3, 3).fill({ color: t.colors.agent.eye });
  g.rect(5, localY - 1, 3, 3).fill({ color: t.colors.agent.eye });

  if (activity === "typing") {
    g.rect(-23, localY + 22 + Math.max(0, armSwing) * 2, 16, 6).fill({ color: palette.skin });
    g.rect(7, localY + 22 + Math.max(0, -armSwing) * 2, 16, 6).fill({ color: palette.skin });
    g.rect(-20, localY + 30, 40, 6).fill({ color: t.colors.agent.keyboard });
  } else if (activity === "whiteboard") {
    const armY = localY + 5 + Math.sin(time * 5) * 10;
    g.rect(8 * side, armY, 23 * side, 6).fill({ color: palette.skin });
    g.rect(30 * side, armY - 2, 6 * side, 5).fill({ color: palette.accent });
    g.rect(-21, localY + 19, 10, 6).fill({ color: palette.skin });
  } else if (activity === "meeting") {
    g.rect(-24, localY + 20, 12, 7).fill({ color: palette.skin });
    g.rect(12, localY + 20, 12, 7).fill({ color: palette.skin });
    g.circle(24 + Math.sin(time * 5) * 2, localY - 18, 3).fill({ color: t.colors.agent.meetingParticle, alpha: 0.7 });
    g.circle(34 + Math.sin(time * 5 + 1) * 2, localY - 22, 3).fill({ color: t.colors.agent.meetingParticle, alpha: 0.7 });
  } else if (activity === "game") {
    g.rect(-24, localY + 22 + Math.sin(time * 9) * 2, 15, 6).fill({ color: palette.skin });
    g.rect(9, localY + 22 - Math.sin(time * 9) * 2, 15, 6).fill({ color: palette.skin });
    g.rect(-14, localY + 30, 28, 8).fill({ color: t.colors.agent.gamepad });
    g.circle(-6, localY + 34, 2).fill({ color: t.colors.accent.envRed });
    g.circle(7, localY + 34, 2).fill({ color: t.colors.accent.envBlue });
  } else if (activity === "kitchen") {
    const bite = Math.max(0, Math.sin(time * 4));
    g.rect(-24, localY + 22, 14, 6).fill({ color: palette.skin });
    g.rect(9, localY + 22 - bite * 12, 15, 6).fill({ color: palette.skin });
    g.rect(22, localY + 14 - bite * 12, 3, 12).fill({ color: t.colors.agent.fork });
    g.circle(-1, localY + 33, 5).fill({ color: t.colors.agent.snackBowl });
  } else if (activity === "ready") {
    g.rect(-25, localY + 18, 13, 6).fill({ color: palette.skin });
    g.rect(12, localY + 18, 13, 6).fill({ color: palette.skin });
    g.rect(17, localY + 11, 18, 24).fill({ color: t.colors.agent.readyClipboard });
    g.rect(21, localY + 17, 10, 2).fill({ color: t.colors.text.ink, alpha: 0.5 });
    g.rect(-4, localY - 28 - Math.sin(time * 5) * 2, 8, 8).fill({ color: palette.accent });
  } else {
    g.rect(-24, localY + 19 + armSwing * 3, 13, 6).fill({ color: palette.skin });
    g.rect(11, localY + 19 - armSwing * 3, 13, 6).fill({ color: palette.skin });
  }

  g.rect(-9, localY + 51, 10, 5).fill({ color: t.colors.agent.shoe });
  g.rect(5, localY + 51, 10, 5).fill({ color: t.colors.agent.shoe });
}

function thoughtFor(agent: AgentDefinition, time: number): string {
  const thoughtIndex = Math.floor(time / 6 + agent.name.charCodeAt(0)) % agent.thoughts.length;
  return agent.thoughts[thoughtIndex] ?? agent.thoughts[0] ?? "thinking";
}

function facingFor(activity: Activity, index: number): "left" | "right" | "down" {
  if (activity === "whiteboard") {
    return "right";
  }

  if (activity === "typing") {
    return index % 2 === 0 ? "left" : "right";
  }

  return "down";
}

function floatPoint(point: Point, time: number, activity: Activity, index: number): Point {
  const amount = activity === "typing" || activity === "whiteboard" || activity === "meeting" ? 1.2 : 0.7;

  return {
    x: point.x + Math.sin(time * 1.8 + index) * amount,
    y: point.y + Math.cos(time * 1.6 + index) * amount
  };
}

function walkPath(from: Point, to: Point, progress: number, laneOffset: number): Point {
  const p = clamp(progress, 0, 1);
  const hallY = 292 + laneOffset;

  if (p < 0.34) {
    const segment = p / 0.34;
    return { x: from.x, y: lerp(from.y, hallY, segment) };
  }

  if (p < 0.72) {
    const segment = (p - 0.34) / 0.38;
    return { x: lerp(from.x, to.x, segment), y: hallY };
  }

  const segment = (p - 0.72) / 0.28;
  return { x: to.x, y: lerp(hallY, to.y, segment) };
}

function easeInOut(value: number): number {
  const p = clamp(value, 0, 1);
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lighten(color: number, amount: number): number {
  const r = clamp(((color >> 16) & 0xff) + amount, 0, 255);
  const g = clamp(((color >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((color & 0xff) + amount, 0, 255);
  return (r << 16) | (g << 8) | b;
}
