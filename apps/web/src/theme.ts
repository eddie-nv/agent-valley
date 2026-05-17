import type { TextStyleOptions } from "pixi.js";

export const theme = {
  colors: {
    environment: {
      // Walls and structure
      wall: 0x3d2f28,
      wallDark: 0x231a18,
      trim: 0x6a5947,

      // Floors
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
      officeBackground: 0x101614,

      // Kitchen fixtures
      kitchenCounter: 0x8fb6b0,
      kitchenSink: 0xe9f3f0,
      kitchenStove: 0xd05b4e,
      kitchenAppliance: 0x505e66,
      kitchenApplianceInner: 0xcfe5e1,
      kitchenPlateOuter: 0xf8f1dc,
      kitchenFoodA: 0xffcf7a,
      kitchenFoodB: 0xd85d4f,
      kitchenUtensil: 0xaeb5aa,
      kitchenTable: 0xba8651,
      kitchenChair: 0x5f8f7e,

      // Furniture
      desk: 0x8f5b3e,
      deskTop: 0xb9794d,
      deskLeg: 0x513d2b,
      monitor: 0x22334b,
      monitorGlow: 0x9bd6ff,
      monitorStand: 0x1c2736,
      keyboard: 0x30261f,
      board: 0xe8eee6,
      boardStroke: 0x6b7a75,
      glass: 0x88c4d4,
      shadow: 0x221b16,

      // Tables
      boardroomTableBase: 0x8f5b3e,
      boardroomTableTop: 0xb9794d,
      devSyncTableBase: 0x72543d,
      devSyncTableTop: 0xa86f48,
      tableLeg: 0x4a3022,
      roundTableLeg: 0x563b2d,
      coffeeTableBase: 0x83543a,
      coffeeTableTop: 0xa66f49,
      coffeeTableLeg: 0x3d2f28,

      // Chairs
      boardroomChair: 0x46606d,
      devSyncChair: 0x755d83,
      chairLeg: 0x342820,

      // Couches
      openOfficeCouch: 0x6b9f5a,
      gameRoomCouch: 0x866cb0,
      couchLeg: 0x342820,

      // Rugs
      openOfficeRug: 0x7c5651,

      // Bookshelf
      bookshelfWood: 0x5e3c2b,
      bookshelfShelf: 0x2e211c,

      // Plants
      potBase: 0xa35e3f,
      potRim: 0xc46d49,
      leafDark: 0x4f8a4c,
      leafMedium: 0x5f9d54,
      leafLight: 0x66a85a,

      // Water cooler
      waterCoolerBody: 0xd9d7c7,
      waterCoolerSpigot: 0x5b6b72,
      waterCoolerJug: 0x9dd7e7,
      waterCoolerHighlight: 0xecffff,

      // Notice board
      noticeBoardFrame: 0x5e3c2b,
      noticeBoardCork: 0xcead75,

      // Laptop
      laptopBase: 0x1d2530,
      laptopScreen: 0x8fd1c7,
      laptopKeyboard: 0x2f3340,

      // Arcade cabinet
      arcadeScreen: 0x15252a,
      arcadeControls: 0x231a18,
      arcadeBase: 0x2c1d1b,
      arcadeCabinetRed: 0xce565c,
      arcadeCabinetBlue: 0x3f7cac,
      gameRoomTable: 0x7f5742,
    },

    ui: {
      // Shell background
      shellTileA: 0x172d46,
      shellTileB: 0x1c3852,
      shellOverlay: 0x061526,

      // Pixel panel shared
      panelOuterBorder: 0x071421,
      panelInnerBorder: 0x0d1627,

      // Chat panel
      chatPanelPaper: 0xf7e6a8,
      chatPanelShade: 0x1c3852,
      chatPanelAccent: 0x2f6fab,

      // Game panel
      gamePanelPaper: 0xf7e6a8,
      gamePanelShade: 0x1e493d,
      gamePanelAccent: 0xd4494c,

      // Game header
      gameHeaderOuter: 0x274f79,
      gameHeaderInner: 0x1a365d,
      gameViewportStrokeOuter: 0x0d1627,
      gameViewportStrokeInner: 0xf7e6a8,

      // Chat avatar area
      chatAvatarBg: 0x1a365d,
      chatAvatarFrame: 0xf7e6a8,
      chatAvatarFace: 0x24335c,
      chatAvatarEyes: 0x8ef7a6,
      chatAvatarMouth: 0xd4494c,

      // Chat subpanel
      chatSubpanelPaper: 0xfff2cf,
      chatSubpanelShade: 0x1a365d,
      chatSubpanelAccent: 0x2f6fab,

      // Tab
      tabActiveFill: 0xffd37b,
      tabEnabledFill: 0x2f6fab,
      tabDisabledFill: 0x314053,
      tabActiveStroke: 0xd4494c,
      tabEnabledStroke: 0xf7e6a8,
      tabBackground: 0x0d1627,

      // Buttons
      buttonActiveBg: 0x2f6fab,
      buttonDisabledBg: 0x314053,
      buttonActiveInner: 0x1a365d,
      buttonDisabledInner: 0x263146,
      buttonViewMore: 0xd4494c,

      // Hover popup
      hoverPopupPaper: 0xfff2cf,
      hoverPopupShade: 0x1a365d,

      // Notes panel
      notesPanelBg: 0x1a365d,

      // Mask
      maskFill: 0xffffff,

      // Mini agent shadow
      miniAgentShadow: 0x0d1627,

      // Presentation
      presentationBg: 0x111c1d,
      presentationTileA: 0x142526,
      presentationTileB: 0x172b2c,
      presentationOuterFrame: 0x203033,
      presentationInnerFrame: 0x142022,
      presentationProgressTrack: 0x2e4547,
      presentationProgressFill: 0x466e6a,
      presentationProgressGlow: 0x8fd1c7,
      presentationFileCardBg: 0x203033,
      presentationFileIconBg: 0xfff2cf,
      presentationFileIconCorner: 0xd7c89e,
      presentationFileDetailA: 0x86a49d,
      presentationFileDetailB: 0x5a706c,
      presentationBarA: 0x466e6a,
      presentationBarB: 0x6b9f5a,
    },

    accent: {
      green: 0x8ef7a6,
      red: 0xd4494c,
      blue: 0x2f6fab,
      yellow: 0xffd37b,
      gold: 0xf4c76b,
      purple: 0x8d639e,
      cyan: 0x8fd1c7,
      pink: 0xb95f89,

      // Environment accents (from the colors object)
      leaf: 0x548a4f,
      envRed: 0xc9514d,
      envBlue: 0x446ab3,
      envYellow: 0xf4c76b,

      // Whiteboard marks
      whiteboardGreen: 0x75a187,
      whiteboardRed: 0xc9514d,
    },

    text: {
      primary: 0xfff2cf,
      secondary: 0xdfe9d8,
      ink: 0x282f2c,
      info: 0xe4f6ff,
      heading: 0xffd37b,
      statusActive: 0x8ef7a6,
      statusWaiting: 0xffd37b,
      disabled: 0x92a0a8,
      presentationFileTitle: 0xfff2cf,
      presentationFileDesc: 0xc9d7ce,
      uiTitleStroke: 0x24335c,
      chiefChatStroke: 0x1a365d,
    },

    agent: {
      eye: 0x282f2c,
      shoe: 0x1d1a18,
      keyboard: 0x25222a,
      gamepad: 0x22252f,
      fork: 0xdce2dd,
      snackBowl: 0xf4c76b,
      readyClipboard: 0xfff2cf,
      meetingParticle: 0xfff2cf,

      // Bubble
      bubbleFill: 0xfff7db,
      bubbleStroke: 0x3a2a24,

      // Agent name label
      nameLabel: 0xfff2cf,
      nameLabelStroke: 0x241813,

      // Shadow (uses colors.shadow from environment)
      shadow: 0x221b16,
    },

    // Monitor glow animation colors
    monitorGlow: {
      cyanBright: 0x9bf4ff,
      cyanDim: 0x73bad4,
      greenBright: 0xc5ff9b,
      greenDim: 0x7ed47a,
      yellowBright: 0xffd37b,
      yellowDim: 0xd2a15d,
    },

    // Monitor screen highlight
    monitorScreenHighlight: 0xf6ffff,

    // Meeting notes blink
    meetingNoteCream: 0xfff2cf,
    meetingNoteGold: 0xf4c76b,

    // Game screen colors
    gameScreenYellow: 0xf4c76b,
    gameScreenCyan: 0x8fd1c7,
    gameScreenPink: 0xb95f89,
    gameScreenPixel: 0x101614,

    // Notice board cards
    noticeBoardCardCream: 0xfff2cf,
    noticeBoardCardCyan: 0x8fd1c7,
    noticeBoardCardGold: 0xf4c76b,

    // File card accent colors (used in drawPresentation)
    fileCardAccentCyan: 0x8fd1c7,
    fileCardAccentGold: 0xf4c76b,
    fileCardAccentPink: 0xb95f89,

    // Tiny file stack
    fileStackPaper: 0xfff2cf,

    // Game header blink colors
    headerBlinkA: 0xfff2cf,
    headerBlinkB: 0xffd37b,
  },

  textStyles: {
    plaque: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 11,
      fontWeight: "700",
      fill: 0xfff2cf,
      letterSpacing: 1,
    },
    smallDark: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 12,
      fontWeight: "700",
      fill: 0x282f2c,
    },
    bubble: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 10,
      fontWeight: "700",
      fill: 0x282f2c,
      wordWrap: true,
      wordWrapWidth: 128,
    },
    presentationTitle: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 34,
      fontWeight: "700",
      fill: 0xfff2cf,
    },
    presentationBody: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 18,
      fontWeight: "700",
      fill: 0xdfe9d8,
    },
    uiTiny: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 10,
      fontWeight: "700",
      fill: 0xfff2cf,
      letterSpacing: 1,
    },
    uiSmall: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 13,
      fontWeight: "700",
      fill: 0xfff2cf,
    },
    uiBody: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 15,
      fontWeight: "700",
      fill: 0xfff2cf,
      lineHeight: 23,
      wordWrap: true,
      wordWrapWidth: 260,
    },
    uiTitle: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 20,
      fontWeight: "700",
      fill: 0xfff2cf,
      stroke: { color: 0x24335c, width: 4 },
    },
    agentName: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 9,
      fontWeight: "700",
      fill: 0xfff2cf,
      stroke: { color: 0x241813, width: 3 },
    },
    boardLabel: {
      fontFamily: "\"Courier New\", monospace",
      fontSize: 9,
      fontWeight: "700",
      fill: 0x282f2c,
    },
  } as const satisfies Record<string, TextStyleOptions>,
} as const;

export type Theme = typeof theme;
