import { Application } from "pixi.js";
import { createAgentValleyClient } from "./api/agent-valley-client";
import { createOfficeWorld } from "./office-world";
import { createSpriteScene } from "./sprite-scene/sprite-scene";
import { createValleyStore } from "./state/valley-store";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

const pixi = new Application();

await pixi.init({
  antialias: false,
  autoDensity: true,
  background: "#d8d4d6",
  resolution: window.devicePixelRatio || 1,
  resizeTo: window
});

app.append(pixi.canvas);

// `?scene=office` shows the procedural store-backed office; default is the sprite scene.
const scene = new URLSearchParams(window.location.search).get("scene");

if (scene === "office") {
  const valleyStore = createValleyStore({ client: createAgentValleyClient() });
  createOfficeWorld(pixi, { store: valleyStore });
  void valleyStore.start();
} else {
  await createSpriteScene(pixi);
}
