import Phaser from "phaser";
import "./style.css";
import { i18n } from "./i18n/I18n.js";
import { SaveManager } from "./shared/SaveManager.js";
import { MenuController } from "./menu/MenuController.js";
import { GameScene } from "./game/scenes/GameScene.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showRuntimeError(message, details = "") {
  if (document.querySelector(".runtime-error")) return;
  const panel = document.createElement("section");
  panel.className = "runtime-error";
  panel.innerHTML = `
    <div class="runtime-error-card">
      <h2>${i18n.t("error.title")}</h2>
      <p>${escapeHtml(message)}</p>
      <pre>${escapeHtml(details || i18n.t("error.noDetails"))}</pre>
      <button type="button" id="runtime-reload">${i18n.t("error.reload")}</button>
    </div>`;
  document.body.appendChild(panel);
  panel.querySelector("#runtime-reload").addEventListener("click", () => location.reload());
}

window.__showGameError = showRuntimeError;
window.addEventListener("error", (event) => showRuntimeError(event.message, event.error?.stack));
window.addEventListener("unhandledrejection", (event) =>
  showRuntimeError(i18n.t("error.unhandled"), event.reason?.stack || event.reason),
);

const saveManager = new SaveManager();
const settings = saveManager.getSettings();
const gameRoot = document.getElementById("game-root");
const menuRoot = document.getElementById("menu-root");

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  width: window.innerWidth,
  height: window.innerHeight,
  resolution: 1,
  backgroundColor: "#020a0f",
  pixelArt: false,
  antialias: false,
  roundPixels: true,
  disableContextMenu: true,
  render: {
    antialias: false,
    antialiasGL: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
    batchSize: 2048,
  },
  fps: {
    target: 60,
    min: 30,
    smoothStep: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1450 },
      debug: false,
      fps: 60,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [],
});

window.__game = game;
game.scene.add("GameScene", GameScene, false);

let menu;

function returnToMenu() {
  game.scene.stop("GameScene");
  gameRoot.classList.remove("active");
  menu.show();
}

game.registry.set("saveManager", saveManager);
game.registry.set("returnToMenu", returnToMenu);
game.registry.set("i18n", i18n);
game.registry.set("startupSettings", settings);

menu = new MenuController({
  root: menuRoot,
  saveManager,
  startWorld(slot, save) {
    gameRoot.classList.add("active");
    game.scene.start("GameScene", { slot, save });
  },
});

function runBoot() {
  const overlay = document.getElementById("boot-overlay");
  const lines = document.getElementById("boot-lines");
  const fill = document.getElementById("boot-fill");
  const value = document.getElementById("boot-value");
  const loadingTitle = document.getElementById("loading-title");
  const loadingMessage = document.getElementById("loading-message");
  const messages = [
    i18n.t("boot.signal"),
    i18n.t("boot.echo"),
    i18n.t("boot.memory"),
    i18n.t("boot.slots"),
    i18n.t("boot.robot"),
    i18n.t("boot.interface"),
  ];

  loadingTitle.textContent = i18n.t("loading.restoring");
  loadingMessage.textContent = i18n.t("loading.sync");
  lines.innerHTML = messages.map((message) => `<div>${escapeHtml(message)}</div>`).join("");
  let progress = 0;

  const timer = setInterval(() => {
    progress = Math.min(100, progress + Math.floor(Math.random() * 10) + 7);
    fill.style.width = `${progress}%`;
    value.textContent = `${String(progress).padStart(2, "0")}%`;

    if (progress >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        overlay.classList.add("hidden");
        menu.init();
      }, 220);
    }
  }, 65);
}

runBoot();
