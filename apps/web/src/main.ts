import { Application } from "pixi.js";
import { createOfficeWorld } from "./office-world";
import { createSpriteScene } from "./sprite-scene/sprite-scene";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

const pixi = new Application();

await pixi.init({
  antialias: false,
  autoDensity: true,
  background: "#101614",
  resolution: window.devicePixelRatio || 1,
  resizeTo: window
});

app.append(pixi.canvas);

// `?scene=office` shows the procedural prototype; default is the sprite scene.
const scene = new URLSearchParams(window.location.search).get("scene");

if (scene === "office") {
  createOfficeWorld(pixi);
} else {
  await createSpriteScene(pixi);
}
