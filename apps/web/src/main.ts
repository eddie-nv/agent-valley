import { Application } from "pixi.js";
import { createAgentValleyClient } from "./api/agent-valley-client";
import { createOfficeWorld } from "./office-world";
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

const valleyStore = createValleyStore({
  client: createAgentValleyClient()
});

createOfficeWorld(pixi, { store: valleyStore });
void valleyStore.start();
