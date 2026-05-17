import type { TextStyleOptions } from "pixi.js";

export const theme = {
  colors: {
    environment: {
      // Walls and structure
      wall: 0x6d6b73,
      wallDark: 0x4e4b55,
      trim: 0x8b8892,

      // Floors
      floorA: 0xe6e0cc,
      floorB: 0xd9d1b8,
      carpetA: 0xc8c0a6,
      carpetB: 0xd9d1b8,
      kitchenTileA: 0xe6e0cc,
      kitchenTileB: 0xd8d4d6,
      devSyncFloorA: 0xd9d1b8,
      devSyncFloorB: 0xc8c0a6,
      gameRoomFloorA: 0xc8c0a6,
      gameRoomFloorB: 0xb8af96,
      officeBackground: 0xb8af96,

      // Kitchen fixtures
      kitchenCounter: 0xd8d4d6,
      kitchenSink: 0xece9ea,
      kitchenStove: 0xc97b7b,
      kitchenAppliance: 0x6d6b73,
      kitchenApplianceInner: 0xece9ea,
      kitchenPlateOuter: 0xece9ea,
      kitchenFoodA: 0xd8b663,
      kitchenFoodB: 0xc97b7b,
      kitchenUtensil: 0x8b8892,
      kitchenTable: 0xc8c0a6,
      kitchenChair: 0x8b8892,

      // Furniture
      desk: 0xb8af96,
      deskTop: 0xc8c0a6,
      deskLeg: 0x4e4b55,
      monitor: 0x22334b,
      monitorGlow: 0x6d86a8,
      monitorStand: 0x4e4b55,
      keyboard: 0x4e4b55,
      board: 0xe8eee6,
      boardStroke: 0x8b8892,
      glass: 0xd8d4d6,
      shadow: 0x4e4b55,

      // Tables
      boardroomTableBase: 0xb8af96,
      boardroomTableTop: 0xc8c0a6,
      devSyncTableBase: 0xb8af96,
      devSyncTableTop: 0xc8c0a6,
      tableLeg: 0x4e4b55,
      roundTableLeg: 0x4e4b55,
      coffeeTableBase: 0xb8af96,
      coffeeTableTop: 0xc8c0a6,
      coffeeTableLeg: 0x4e4b55,

      // Chairs
      boardroomChair: 0x8b8892,
      devSyncChair: 0x8b8892,
      chairLeg: 0x4e4b55,

      // Couches
      openOfficeCouch: 0xc8c0a6,
      gameRoomCouch: 0xb8af96,
      couchLeg: 0x4e4b55,

      // Rugs
      openOfficeRug: 0xb8af96,

      // Bookshelf
      bookshelfWood: 0x8b8892,
      bookshelfShelf: 0x4e4b55,

      // Plants
      potBase: 0xb8af96,
      potRim: 0xc8c0a6,
      leafDark: 0x7fa06b,
      leafMedium: 0x7fa06b,
      leafLight: 0x7fa06b,

      // Water cooler
      waterCoolerBody: 0xd8d4d6,
      waterCoolerSpigot: 0x6d6b73,
      waterCoolerJug: 0xd8d4d6,
      waterCoolerHighlight: 0xece9ea,

      // Notice board
      noticeBoardFrame: 0x8b8892,
      noticeBoardCork: 0xd9d1b8,

      // Laptop
      laptopBase: 0x22334b,
      laptopScreen: 0x6d86a8,
      laptopKeyboard: 0x4e4b55,

      // Arcade cabinet
      arcadeScreen: 0x22334b,
      arcadeControls: 0x4e4b55,
      arcadeBase: 0x4e4b55,
      arcadeCabinetRed: 0xc97b7b,
      arcadeCabinetBlue: 0x6d86a8,
      gameRoomTable: 0xb8af96,
    },

    ui: {
      // Shell background
      shellTileA: 0xd8d4d6,
      shellTileB: 0xece9ea,
      shellOverlay: 0xd8d4d6,

      // Pixel panel shared
      panelOuterBorder: 0x4e4b55,
      panelInnerBorder: 0x8b8892,

      // Chat panel
      chatPanelPaper: 0x8b8892,
      chatPanelShade: 0xece9ea,
      chatPanelAccent: 0x8b8892,

      // Game panel
      gamePanelPaper: 0x8b8892,
      gamePanelShade: 0xece9ea,
      gamePanelAccent: 0x8b8892,

      // Game header
      gameHeaderOuter: 0xd8d4d6,
      gameHeaderInner: 0xece9ea,
      gameViewportStrokeOuter: 0x4e4b55,
      gameViewportStrokeInner: 0x8b8892,

      // Chat avatar area
      chatAvatarBg: 0xd8d4d6,
      chatAvatarFrame: 0xd8d4d6,
      chatAvatarFace: 0x8b8892,
      chatAvatarEyes: 0x7fa06b,
      chatAvatarMouth: 0xc97b7b,

      // Chat subpanel
      chatSubpanelPaper: 0x4e4b55,
      chatSubpanelShade: 0xece9ea,
      chatSubpanelAccent: 0x8b8892,

      // Tab
      tabActiveFill: 0xd8b663,
      tabEnabledFill: 0xd8d4d6,
      tabDisabledFill: 0xb8af96,
      tabActiveStroke: 0xc97b7b,
      tabEnabledStroke: 0x6d6b73,
      tabBackground: 0x4e4b55,

      // Buttons
      buttonActiveBg: 0xd8d4d6,
      buttonDisabledBg: 0xb8af96,
      buttonActiveInner: 0xece9ea,
      buttonDisabledInner: 0xd8d4d6,
      buttonViewMore: 0xc97b7b,

      // Hover popup
      hoverPopupPaper: 0x4e4b55,
      hoverPopupShade: 0xece9ea,

      // Notes panel
      notesPanelBg: 0xd8d4d6,

      // Mask
      maskFill: 0xffffff,

      // Mini agent shadow
      miniAgentShadow: 0x4e4b55,

      // Presentation
      presentationBg: 0xb8af96,
      presentationTileA: 0xc8c0a6,
      presentationTileB: 0xd9d1b8,
      presentationOuterFrame: 0x8b8892,
      presentationInnerFrame: 0xece9ea,
      presentationProgressTrack: 0xd8d4d6,
      presentationProgressFill: 0x7fa06b,
      presentationProgressGlow: 0xd8b663,
      presentationFileCardBg: 0xd8d4d6,
      presentationFileIconBg: 0xece9ea,
      presentationFileIconCorner: 0xb8af96,
      presentationFileDetailA: 0x8b8892,
      presentationFileDetailB: 0x6d6b73,
      presentationBarA: 0x7fa06b,
      presentationBarB: 0xd8b663,
    },

    accent: {
      green: 0x7fa06b,
      red: 0xc97b7b,
      blue: 0x6d86a8,
      yellow: 0xd8b663,
      gold: 0xd8b663,
      purple: 0x8b8892,
      cyan: 0x6d86a8,
      pink: 0xc97b7b,

      // Environment accents (from the colors object)
      leaf: 0x7fa06b,
      envRed: 0xc97b7b,
      envBlue: 0x6d86a8,
      envYellow: 0xd8b663,

      // Whiteboard marks
      whiteboardGreen: 0x7fa06b,
      whiteboardRed: 0xc97b7b,
    },

    text: {
      primary: 0x4e4b55,
      secondary: 0x6d6b73,
      ink: 0x4e4b55,
      info: 0x6d6b73,
      heading: 0xd8b663,
      statusActive: 0x7fa06b,
      statusWaiting: 0xd8b663,
      disabled: 0x8b8892,
      presentationFileTitle: 0x4e4b55,
      presentationFileDesc: 0x8b8892,
      uiTitleStroke: 0xece9ea,
      chiefChatStroke: 0xece9ea,
    },

    agent: {
      eye: 0x4e4b55,
      shoe: 0x4e4b55,
      keyboard: 0x4e4b55,
      gamepad: 0x4e4b55,
      fork: 0x8b8892,
      snackBowl: 0xd8b663,
      readyClipboard: 0xece9ea,
      meetingParticle: 0xece9ea,

      // Bubble
      bubbleFill: 0xece9ea,
      bubbleStroke: 0x6d6b73,

      // Agent name label
      nameLabel: 0x4e4b55,
      nameLabelStroke: 0xb8af96,

      // Shadow (uses colors.shadow from environment)
      shadow: 0x4e4b55,
    },

    // Monitor glow animation colors
    monitorGlow: {
      cyanBright: 0x6d86a8,
      cyanDim: 0x8b8892,
      greenBright: 0x7fa06b,
      greenDim: 0x8b8892,
      yellowBright: 0xd8b663,
      yellowDim: 0xb8af96,
    },

    // Monitor screen highlight
    monitorScreenHighlight: 0xece9ea,

    // Meeting notes blink
    meetingNoteCream: 0xece9ea,
    meetingNoteGold: 0xd8b663,

    // Game screen colors
    gameScreenYellow: 0xd8b663,
    gameScreenCyan: 0x6d86a8,
    gameScreenPink: 0xc97b7b,
    gameScreenPixel: 0x4e4b55,

    // Notice board cards
    noticeBoardCardCream: 0xece9ea,
    noticeBoardCardCyan: 0x6d86a8,
    noticeBoardCardGold: 0xd8b663,

    // File card accent colors (used in drawPresentation)
    fileCardAccentCyan: 0x6d86a8,
    fileCardAccentGold: 0xd8b663,
    fileCardAccentPink: 0xc97b7b,

    // Tiny file stack
    fileStackPaper: 0xece9ea,

    // Game header blink colors
    headerBlinkA: 0xd8b663,
    headerBlinkB: 0xc97b7b,
  },

  textStyles: {
    plaque: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 11,
      fontWeight: "700",
      fill: 0x4e4b55,
      letterSpacing: 1,
    },
    smallDark: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 12,
      fontWeight: "700",
      fill: 0x4e4b55,
    },
    bubble: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 10,
      fontWeight: "700",
      fill: 0x4e4b55,
      wordWrap: true,
      wordWrapWidth: 128,
    },
    presentationTitle: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 34,
      fontWeight: "700",
      fill: 0x4e4b55,
    },
    presentationBody: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 18,
      fontWeight: "700",
      fill: 0x6d6b73,
    },
    uiTiny: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 10,
      fontWeight: "700",
      fill: 0x4e4b55,
      letterSpacing: 1,
    },
    uiSmall: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 13,
      fontWeight: "700",
      fill: 0x4e4b55,
    },
    uiBody: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 15,
      fontWeight: "700",
      fill: 0x4e4b55,
      lineHeight: 23,
      wordWrap: true,
      wordWrapWidth: 260,
    },
    uiTitle: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 20,
      fontWeight: "700",
      fill: 0x4e4b55,
      stroke: { color: 0xece9ea, width: 4 },
    },
    agentName: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 9,
      fontWeight: "700",
      fill: 0x4e4b55,
      stroke: { color: 0xb8af96, width: 3 },
    },
    boardLabel: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 9,
      fontWeight: "700",
      fill: 0x4e4b55,
    },
  } as const satisfies Record<string, TextStyleOptions>,
} as const;

export type Theme = typeof theme;
