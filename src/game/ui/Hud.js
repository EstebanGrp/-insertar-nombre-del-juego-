import { i18n } from "../../i18n/I18n.js";
import { TOTAL_LEVELS } from "../campaign/LevelCatalog.js";

export class Hud {
  constructor(scene) {
    this.scene = scene;
    this.achievementQueue = [];
    this.achievementVisible = false;
    this.root = document.createElement("div");
    this.root.className = "game-hud campaign-hud";
    document.body.appendChild(this.root);

    this.root.innerHTML = `
      <section class="hud-status hud-panel-large">
        <header class="hud-panel-header">
          <span>${i18n.t("hud.humanEcho")}</span>
          <b id="hud-level-code">L001</b>
        </header>
        <div id="hud-health" class="hud-health"></div>
        <div class="hud-spirit-row">
          <span>${i18n.t("hud.spirit")}</span>
          <div class="hud-spirit-track"><i id="hud-spirit-fill"></i></div>
          <span id="hud-dash-state" class="hud-dash-state">${i18n.t("hud.dashReady")}</span>
        </div>
        <div class="hud-campaign-grid">
          <div><span>${i18n.t("hud.level")}</span><b id="hud-level">001 / ${TOTAL_LEVELS}</b></div>
          <div><span>${i18n.t("hud.chapter")}</span><b id="hud-chapter">01 / 10</b></div>
          <div><span>${i18n.t("hud.secretSignals")}</span><b id="hud-signals">0 / 1</b></div>
          <div><span>${i18n.t("hud.documents")}</span><b id="hud-docs">0 / ${TOTAL_LEVELS}</b></div>
          <div><span>${i18n.t("hud.achievements")}</span><b id="hud-achievements">0 / 25</b></div>
          <div><span>${i18n.t("hud.robot")}</span><b id="hud-robot">${i18n.t("status.offline")}</b></div>
        </div>
        <div class="hud-mobility">
          <span id="hud-double-jump">${i18n.t("hud.doubleReady")}</span>
          <span id="hud-wall-state">${i18n.t("hud.wallReady")}</span>
        </div>
      </section>

      <section id="hud-objective" class="hud-objective hud-objective-large">
        <span class="hud-objective-label">${i18n.t("label.signal")}</span>
        <b>${i18n.t("objective.follow")}</b>
      </section>

      <section id="hud-prompt" class="hud-prompt hidden"></section>

      <section id="hud-area" class="hud-area hidden">
        <small>${i18n.t("hud.levelValue", { level: "001" })}</small>
        <strong>${i18n.t("zone.lab")}</strong>
        <em id="hud-area-chapter"></em>
      </section>

      <section id="secret-banner" class="secret-banner hidden">
        <small>${i18n.t("secret.discovered")}</small>
        <strong>${i18n.t("secret.room")}</strong>
      </section>

      <section id="boss-ui" class="boss-ui hidden">
        <div class="boss-title">
          <span>${i18n.t("hud.warden")}</span>
          <b id="boss-phase">${i18n.t("hud.phase", { phase: "I" })}</b>
        </div>
        <div class="boss-track"><i id="boss-fill"></i></div>
      </section>

      <section id="achievement-toast" class="achievement-toast hidden">
        <div class="achievement-icon">◆</div>
        <div><small>${i18n.t("hud.achievementUnlocked")}</small><strong></strong><p></p></div>
      </section>

      <section class="hud-controls">${i18n.t("hud.controls")}</section>
    `;

    this.updateHealth(5, 5);
    this.updateSpirit(100, 100, true);
  }

  updateHealth(value, max) {
    const element = this.root.querySelector("#hud-health");
    element.innerHTML = Array.from(
      { length: max },
      (_, index) => `<i class="hud-soul ${index >= value ? "empty" : ""}"></i>`,
    ).join("");
  }

  updateSpirit(value, max, dashReady) {
    const fill = this.root.querySelector("#hud-spirit-fill");
    const dash = this.root.querySelector("#hud-dash-state");
    fill.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
    const ready = dashReady && value >= 25;
    dash.textContent = ready ? i18n.t("hud.dashReady") : i18n.t("hud.recharging");
    dash.classList.toggle("ready", ready);
  }

  updateMobility(jumpsUsed, maxJumps, wallSliding) {
    const jump = this.root.querySelector("#hud-double-jump");
    const wall = this.root.querySelector("#hud-wall-state");
    const doubleReady = jumpsUsed < maxJumps;
    jump.textContent = doubleReady ? i18n.t("hud.doubleReady") : i18n.t("hud.doubleUsed");
    jump.classList.toggle("ready", doubleReady);
    wall.textContent = wallSliding ? i18n.t("hud.wallActive") : i18n.t("hud.wallReady");
    wall.classList.toggle("active", wallSliding);
  }

  updateCampaign({ level, chapter, signals, signalTotal, documents, achievements, achievementTotal, robotActive }) {
    this.root.querySelector("#hud-level-code").textContent = `L${String(level).padStart(3, "0")}`;
    this.root.querySelector("#hud-level").textContent = `${String(level).padStart(3, "0")} / ${TOTAL_LEVELS}`;
    this.root.querySelector("#hud-chapter").textContent = `${String(chapter).padStart(2, "0")} / 10`;
    this.root.querySelector("#hud-signals").textContent = `${signals} / ${signalTotal}`;
    this.root.querySelector("#hud-docs").textContent = `${documents} / ${TOTAL_LEVELS}`;
    this.root.querySelector("#hud-achievements").textContent = `${achievements} / ${achievementTotal}`;
    this.root.querySelector("#hud-robot").textContent = robotActive ? i18n.t("status.online") : i18n.t("status.offline");
    this.root.querySelector("#hud-robot").classList.toggle("online", robotActive);
  }

  updateProgress(_shards, _totalShards, achievements, totalAchievements) {
    const element = this.root.querySelector("#hud-achievements");
    if (element) element.textContent = `${achievements} / ${totalAchievements}`;
  }

  updateLearning(documents) {
    const element = this.root.querySelector("#hud-docs");
    if (element) element.textContent = `${documents} / ${TOTAL_LEVELS}`;
  }

  setObjective(text, label = i18n.t("label.signal")) {
    const element = this.root.querySelector("#hud-objective");
    element.querySelector(".hud-objective-label").textContent = label;
    element.querySelector("b").textContent = text;
    element.classList.remove("pulse");
    void element.offsetWidth;
    element.classList.add("pulse");
  }

  setPrompt(text = "") {
    const element = this.root.querySelector("#hud-prompt");
    element.textContent = text;
    element.classList.toggle("hidden", !text);
  }

  showArea(name, duration = 2600, level = null, chapterName = "") {
    const element = this.root.querySelector("#hud-area");
    element.querySelector("small").textContent = i18n.t("hud.levelValue", {
      level: String(level ?? "").padStart(3, "0"),
    });
    element.querySelector("strong").textContent = name;
    element.querySelector("#hud-area-chapter").textContent = chapterName;
    element.classList.remove("hidden");
    element.classList.add("show");

    this.scene.time.delayedCall(duration, () => {
      element.classList.remove("show");
      this.scene.time.delayedCall(350, () => element.classList.add("hidden"));
    });
  }

  showSecretRoom() {
    const element = this.root.querySelector("#secret-banner");
    element.classList.remove("hidden");
    void element.offsetWidth;
    element.classList.add("show");
    this.scene.time.delayedCall(2500, () => {
      element.classList.remove("show");
      this.scene.time.delayedCall(350, () => element.classList.add("hidden"));
    });
  }

  showAchievement(data) {
    this.achievementQueue.push(data);
    if (!this.achievementVisible) this.showNextAchievement();
  }

  showNextAchievement() {
    const data = this.achievementQueue.shift();
    if (!data) {
      this.achievementVisible = false;
      return;
    }
    this.achievementVisible = true;
    const toast = this.root.querySelector("#achievement-toast");
    toast.querySelector("strong").textContent = data.title;
    toast.querySelector("p").textContent = data.description;
    toast.classList.remove("hidden", "show");
    void toast.offsetWidth;
    toast.classList.add("show");
    this.scene.time.delayedCall(2900, () => {
      toast.classList.remove("show");
      this.scene.time.delayedCall(350, () => {
        toast.classList.add("hidden");
        this.showNextAchievement();
      });
    });
  }

  showBoss() {
    this.root.querySelector("#boss-ui").classList.remove("hidden");
  }

  updateBoss(value, max, phase = 1) {
    this.showBoss();
    this.root.querySelector("#boss-fill").style.width = `${Math.max(0, (value / max) * 100)}%`;
    const roman = ["I", "II", "III"][phase - 1] || String(phase);
    this.root.querySelector("#boss-phase").textContent = i18n.t("hud.phase", { phase: roman });
  }

  hideBoss() {
    this.root.querySelector("#boss-ui").classList.add("hidden");
  }

  destroy() {
    this.root.remove();
  }
}
