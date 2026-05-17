import { Application } from "pixi.js";
import { createOfficeWorld } from "./office-world";
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

createOfficeWorld(pixi);
