import { Application } from "pixi.js";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

const pixi = new Application();

await pixi.init({
  background: "#101614",
  resizeTo: window
});

app.append(pixi.canvas);
