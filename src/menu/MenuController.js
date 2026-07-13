import { MAX_WORLDS } from "../shared/SaveManager.js";
import { i18n, LANGUAGE_ORDER } from "../i18n/I18n.js";
import { CHAPTERS, TOTAL_LEVELS, getChapter } from "../game/campaign/LevelCatalog.js";

const TEAM = [
  ["EstebanGrp_", "credits.programming"],
  ["AngryWolfX", "credits.gameplay"],
  ["Xx_lilit_xXx", "credits.pixelArt"],
  ["xXx_Yukiji_xXx", "credits.creative"],
  ["ItzImperio", "credits.testing"],
];

const QUALITY_ORDER = ["auto", "low", "medium", "high"];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nextValue(current, values) {
  const index = values.indexOf(current);
  return values[(Math.max(0, index) + 1) % values.length];
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export class MenuController {
  constructor({ root, saveManager, startWorld }) {
    this.root = root;
    this.saveManager = saveManager;
    this.startWorld = startWorld;
    this.selected = 0;
    this.items = [];
    this.view = "main";
    this.settings = saveManager.getSettings();
    this.audioContext = null;
    this.resizeFrame = 0;
    this.onKey = this.onKey.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  init() {
    document.addEventListener("keydown", this.onKey);
    window.addEventListener("resize", this.onResize, { passive: true });
    window.visualViewport?.addEventListener("resize", this.onResize, { passive: true });
    this.renderMain();
  }

  show() {
    this.settings = this.saveManager.getSettings();
    this.root.classList.remove("hidden");
    this.renderMain();
  }

  hide() {
    this.root.classList.add("hidden");
  }

  beep(freq = 480, duration = 0.04) {
    if (!this.settings.sound) return;
    try {
      this.audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.02, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch {}
  }

  shell(content) {
    const slots = this.saveManager.getSlots();
    const memory = Math.max(2, ...slots.map((slot) => slot?.robot?.memory ?? 2));
    const motionClass = this.settings.motion ? "" : "reduced-motion";
    const layoutClass = this.view === "main" ? "menu-main-layout" : "menu-sub-layout";
    this.root.innerHTML = `
      <section class="menu-shell ${motionClass} ${layoutClass} menu-fit-v5">
        <div class="menu-bg"></div><div class="menu-shadow"></div>
        <div class="core-glow"></div><div class="core-ring r1"></div><div class="core-ring r2"></div>
        ${this.settings.scanlines ? '<div class="scanlines"></div>' : ""}
        <div class="menu-build">${i18n.t("app.build")}</div>
        <div class="menu-left-stack">
          <aside class="status-panel">
            <div class="status-head">&gt; ${i18n.t("status.header")}</div>
            <div class="status-row"><span>${i18n.t("status.signal")}</span><b class="online">${i18n.t("status.online")}</b></div>
            <div class="status-row"><span>${i18n.t("status.memory")}</span><b>${String(memory).padStart(2, "0")}%</b></div>
            <div class="status-row"><span>${i18n.t("status.voice")}</span><b>${i18n.t("status.offline")}</b></div>
            <div class="status-row"><span>${i18n.t("status.host")}</span><b>${i18n.t("status.humanEcho")}</b></div>
            <div class="status-row"><span>${i18n.t("status.reality")}</span><b>${i18n.t("status.locked")}</b></div>
            <div class="status-row"><span>${i18n.t("status.origin")}</span><b>${i18n.t("status.unknown")}</b></div>
          </aside>
          <main class="menu-view">${content}</main>
        </div>
        <aside id="world-preview" class="world-preview"></aside>
        <div class="menu-hint">${i18n.t("nav.hint")}</div>
      </section>`;

    if (this.view === "main") {
      this.fitMainMenu();
      requestAnimationFrame(() => this.fitMainMenu());
    }
  }

  renderMain() {
    this.view = "main";
    this.selected = 0;
    const last = this.saveManager.getLastSlot();
    const slots = this.saveManager.getSlots();
    this.items = [];
    if (last) this.items.push({ label: i18n.t("menu.continue"), icon: "▶", action: () => this.loadWorld(last) });
    this.items.push({ label: i18n.t("menu.newGame"), icon: "◇", action: () => this.renderNewGame() });
    if (slots.some(Boolean)) {
      this.items.push({ label: i18n.t("menu.savedWorlds"), icon: "▣", action: () => this.renderSavedWorlds() });
      this.items.push({ label: i18n.t("menu.campaign"), icon: "◈", action: () => this.renderCampaignAtlas() });
    }
    this.items.push({ label: i18n.t("menu.multiplayer"), icon: "⇄", action: () => this.renderMultiplayerPreview() });
    this.items.push(
      { label: i18n.t("menu.settings"), icon: "⚙", action: () => this.renderSettings() },
      { label: i18n.t("menu.credits"), icon: "◎", action: () => this.renderCredits() },
      { label: i18n.t("menu.exit"), icon: "◯", action: () => this.renderShutdown() },
    );
    this.shell(`<div class="menu-options">${this.items.map((item, index) => this.option(item, index)).join("")}</div>`);
    this.bindOptions();
    this.updateSelection(false);
    requestAnimationFrame(() => this.fitMainMenu());
  }

  onResize() {
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => this.fitMainMenu());
  }

  fitMainMenu() {
    if (this.view !== "main" || this.root.classList.contains("hidden")) return;

    const shell = this.root.querySelector(".menu-shell");
    const stack = shell?.querySelector(".menu-left-stack");
    const statusPanel = stack?.querySelector(".status-panel");
    const statusHead = statusPanel?.querySelector(".status-head");
    const statusRows = [...(statusPanel?.querySelectorAll(".status-row") || [])];
    const menuView = stack?.querySelector(".menu-view");
    const menuOptions = stack?.querySelector(".menu-options");
    const buttons = [...(menuOptions?.querySelectorAll(".menu-option") || [])];

    if (
      !shell ||
      !stack ||
      !statusPanel ||
      !menuView ||
      !menuOptions ||
      buttons.length === 0
    ) {
      return;
    }

    const visualViewport = window.visualViewport;
    const viewportWidth = Math.max(
      320,
      Math.round(visualViewport?.width || window.innerWidth || shell.clientWidth),
    );
    const viewportHeight = Math.max(
      420,
      Math.round(visualViewport?.height || window.innerHeight || shell.clientHeight),
    );

    const itemCount = buttons.length;
    const compactScreen = viewportHeight < 760;
    const veryCompactScreen = viewportHeight < 620;

    const outerTop = veryCompactScreen ? 12 : compactScreen ? 16 : 22;
    const outerBottom = veryCompactScreen ? 22 : 30;
    const panelGap = veryCompactScreen ? 10 : compactScreen ? 14 : 18;

    const menuWidth =
      viewportWidth <= 720
        ? Math.max(280, viewportWidth - 28)
        : clamp(viewportWidth * 0.31, 350, 430);

    // El panel superior también se compacta. Así no roba altura al menú.
    const panelFont = veryCompactScreen ? 9 : compactScreen ? 10 : 11;
    const panelPaddingY = veryCompactScreen ? 7 : compactScreen ? 9 : 11;
    const panelPaddingX = veryCompactScreen ? 11 : 14;
    const rowPadding = veryCompactScreen ? 0 : 1;

    shell.classList.add("menu-layout-ready");

    stack.style.setProperty("position", "absolute", "important");
    stack.style.setProperty("left", "clamp(16px, 4vw, 54px)", "important");
    stack.style.setProperty("top", `${outerTop}px`, "important");
    stack.style.setProperty("bottom", `${outerBottom}px`, "important");
    stack.style.setProperty("width", `${Math.round(menuWidth)}px`, "important");
    stack.style.setProperty("height", "auto", "important");
    stack.style.setProperty("max-height", "none", "important");
    stack.style.setProperty("display", "grid", "important");
    stack.style.setProperty(
      "grid-template-rows",
      "auto minmax(0, 1fr)",
      "important",
    );
    stack.style.setProperty("align-content", "start", "important");
    stack.style.setProperty("gap", `${panelGap}px`, "important");
    stack.style.setProperty("overflow", "hidden", "important");

    statusPanel.style.setProperty("position", "relative", "important");
    statusPanel.style.setProperty("inset", "auto", "important");
    statusPanel.style.setProperty("width", "100%", "important");
    statusPanel.style.setProperty(
      "padding",
      `${panelPaddingY}px ${panelPaddingX}px`,
      "important",
    );
    statusPanel.style.setProperty("margin", "0", "important");
    statusPanel.style.setProperty("font-size", `${panelFont}px`, "important");
    statusPanel.style.setProperty("line-height", "1.15", "important");

    if (statusHead) {
      statusHead.style.setProperty(
        "margin-bottom",
        veryCompactScreen ? "4px" : "6px",
        "important",
      );
      statusHead.style.setProperty(
        "padding-bottom",
        veryCompactScreen ? "5px" : "7px",
        "important",
      );
    }

    statusRows.forEach((row) => {
      row.style.setProperty(
        "padding",
        `${rowPadding}px 0`,
        "important",
      );
      row.style.setProperty("min-height", "0", "important");
    });

    const stackHeight = Math.max(
      260,
      viewportHeight - outerTop - outerBottom,
    );
    const panelHeight = Math.ceil(statusPanel.getBoundingClientRect().height);
    const availableMenuHeight = Math.max(
      150,
      stackHeight - panelHeight - panelGap,
    );

    const buttonGap = veryCompactScreen ? 2 : compactScreen ? 3 : 4;
    const maximumButtonHeight = veryCompactScreen ? 27 : compactScreen ? 30 : 33;
    const minimumButtonHeight = veryCompactScreen ? 23 : 25;

    const calculatedButtonHeight = Math.floor(
      (availableMenuHeight - buttonGap * Math.max(0, itemCount - 1)) /
        itemCount,
    );

    const buttonHeight = clamp(
      calculatedButtonHeight,
      minimumButtonHeight,
      maximumButtonHeight,
    );

    const totalMenuHeight =
      itemCount * buttonHeight +
      Math.max(0, itemCount - 1) * buttonGap;

    menuView.style.setProperty("position", "relative", "important");
    menuView.style.setProperty("inset", "auto", "important");
    menuView.style.setProperty("width", "100%", "important");
    menuView.style.setProperty("height", "100%", "important");
    menuView.style.setProperty("min-height", "0", "important");
    menuView.style.setProperty("max-height", "100%", "important");
    menuView.style.setProperty("margin", "0", "important");
    menuView.style.setProperty("padding", "0", "important");
    menuView.style.setProperty(
      "overflow-y",
      totalMenuHeight > availableMenuHeight ? "auto" : "hidden",
      "important",
    );
    menuView.style.setProperty("overflow-x", "hidden", "important");
    menuView.style.setProperty("scrollbar-width", "thin", "important");

    menuOptions.style.setProperty("display", "grid", "important");
    menuOptions.style.setProperty(
      "grid-template-rows",
      `repeat(${itemCount}, ${buttonHeight}px)`,
      "important",
    );
    menuOptions.style.setProperty("grid-auto-rows", "unset", "important");
    menuOptions.style.setProperty("gap", `${buttonGap}px`, "important");
    menuOptions.style.setProperty("width", "100%", "important");
    menuOptions.style.setProperty("height", `${totalMenuHeight}px`, "important");
    menuOptions.style.setProperty("min-height", "0", "important");
    menuOptions.style.setProperty("padding", "0 5px 0 0", "important");
    menuOptions.style.setProperty("margin", "0", "important");
    menuOptions.style.setProperty("align-content", "start", "important");
    menuOptions.style.setProperty("overflow", "visible", "important");

    const longestLabel = Math.max(
      ...buttons.map((button) => button.textContent.trim().length),
    );

    let fontSize =
      buttonHeight <= 24
        ? 11
        : buttonHeight <= 27
          ? 12
          : buttonHeight <= 30
            ? 13
            : 14;

    if (longestLabel > 20) fontSize -= 1;
    if (viewportWidth < 700) fontSize -= 0.5;
    fontSize = Math.max(10.5, fontSize);

    const leftPadding = buttonHeight <= 27 ? 43 : 48;
    const markerLeft = buttonHeight <= 27 ? 12 : 14;
    const markerWidth = buttonHeight <= 27 ? 21 : 23;

    buttons.forEach((button) => {
      button.style.setProperty("box-sizing", "border-box", "important");
      button.style.setProperty("position", "relative", "important");
      button.style.setProperty("display", "flex", "important");
      button.style.setProperty("align-items", "center", "important");
      button.style.setProperty("width", "100%", "important");
      button.style.setProperty("height", `${buttonHeight}px`, "important");
      button.style.setProperty("min-height", `${buttonHeight}px`, "important");
      button.style.setProperty("max-height", `${buttonHeight}px`, "important");
      button.style.setProperty(
        "padding",
        `0 10px 0 ${leftPadding}px`,
        "important",
      );
      button.style.setProperty("margin", "0", "important");
      button.style.setProperty("font-size", `${fontSize}px`, "important");
      button.style.setProperty("line-height", "1", "important");
      button.style.setProperty("letter-spacing", ".085em", "important");
      button.style.setProperty("white-space", "nowrap", "important");
      button.style.setProperty("transform-origin", "left center", "important");

      button.querySelectorAll(".marker, .icon").forEach((element) => {
        element.style.setProperty("left", `${markerLeft}px`, "important");
        element.style.setProperty("width", `${markerWidth}px`, "important");
        element.style.setProperty("font-size", ".72em", "important");
      });
    });
  }

  option(item, index) {
    return `<button class="menu-option" data-index="${index}"><span class="icon">${item.icon}</span><span class="marker">&gt;&gt;</span>${escapeHtml(item.label)}</button>`;
  }

  bindOptions() {
    this.root.querySelectorAll("[data-index]").forEach((element) => {
      element.addEventListener("pointerenter", () => {
        this.selected = Number(element.dataset.index);
        this.updateSelection();
      });
      element.addEventListener("click", () => {
        this.selected = Number(element.dataset.index);
        this.activate();
      });
    });
  }

  updateSelection(sound = true) {
    const elements = [...this.root.querySelectorAll("[data-index]")];
    elements.forEach((element, index) => element.classList.toggle("selected", index === this.selected));
    if (this.view === "saved") this.showPreview(this.saveManager.getSlots()[this.selected]);
    if (sound) this.beep(430);
  }

  move(direction) {
    if (!this.items.length) return;
    let next = this.selected;
    for (let attempt = 0; attempt < this.items.length; attempt += 1) {
      next = (next + direction + this.items.length) % this.items.length;
      if (!this.items[next]?.disabled) {
        this.selected = next;
        this.updateSelection();
        return;
      }
    }
  }

  activate() {
    const item = this.items[this.selected];
    if (!item || item.disabled) {
      this.beep(160, 0.08);
      return;
    }
    this.beep(720, 0.07);
    item.action();
  }

  onKey(event) {
    if (this.root.classList.contains("hidden")) return;
    if (event.target instanceof HTMLInputElement) {
      if (event.key === "Escape") event.target.closest(".modal")?.remove();
      return;
    }
    if (["ArrowDown", "s", "S"].includes(event.key)) {
      event.preventDefault();
      this.move(1);
    }
    if (["ArrowUp", "w", "W"].includes(event.key)) {
      event.preventDefault();
      this.move(-1);
    }
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      this.activate();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.back();
    }
  }

  back() {
    if (this.view !== "main") this.renderMain();
  }

  renderNewGame() {
    this.view = "new";
    const slots = this.saveManager.getSlots();
    this.items = slots.map((slot, index) => ({
      label: slot?.name ?? i18n.t("new.emptySlot"),
      disabled: Boolean(slot),
      action: () => this.promptNewWorld(index + 1),
    }));
    this.selected = Math.max(0, slots.findIndex((slot) => !slot));
    this.shell(`<section class="menu-subview"><h1 class="menu-title">&gt;&gt; ${i18n.t("new.title")}</h1><p class="menu-note">${i18n.t("new.note", { max: MAX_WORLDS })}</p><div class="slot-list">${slots.map((slot, index) => this.slotRow(slot, index, true)).join("")}</div></section>`);
    this.bindSlots();
    this.updateSelection(false);
  }

  renderSavedWorlds() {
    this.view = "saved";
    const slots = this.saveManager.getSlots();
    this.items = slots.map((slot, index) => ({
      label: slot?.name ?? i18n.t("saved.empty"),
      disabled: !slot,
      action: () => this.worldActions(index + 1),
    }));
    this.selected = Math.max(0, slots.findIndex(Boolean));
    this.shell(`<section class="menu-subview"><h1 class="menu-title">&gt;&gt; ${i18n.t("saved.title")}</h1><p class="menu-note">${i18n.t("saved.note")}</p><div class="slot-list">${slots.map((slot, index) => this.slotRow(slot, index, false)).join("")}</div></section>`);
    this.bindSlots();
    this.updateSelection(false);
    this.showPreview(slots[this.selected]);
  }

  slotRow(slot, index, newMode) {
    const disabled = newMode ? Boolean(slot) : !slot;
    const zone = slot ? this.saveManager.displayZone(slot) : "";
    const level = slot?.progress?.currentLevel || 1;
    return `<div class="slot ${!slot ? "empty" : ""}" data-index="${index}" data-disabled="${disabled}"><span class="slot-index">${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(slot?.name ?? i18n.t("new.emptySlot"))}</span><span class="slot-meta">${slot ? `${escapeHtml(zone)}<br>${i18n.t("preview.level")} ${String(level).padStart(3, "0")} / ${TOTAL_LEVELS}` : i18n.t("new.available")}</span></div>`;
  }

  bindSlots() {
    this.root.querySelectorAll(".slot").forEach((element) => {
      element.addEventListener("pointerenter", () => {
        this.selected = Number(element.dataset.index);
        this.updateSelection();
      });
      element.addEventListener("click", () => {
        this.selected = Number(element.dataset.index);
        if (element.dataset.disabled !== "true") this.activate();
        else this.beep(160, 0.08);
      });
    });
  }

  appendModal(html) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = html;
    this.root.querySelector(".menu-shell").appendChild(modal);
    return modal;
  }

  promptNewWorld(slot) {
    const modal = this.appendModal(`<div class="modal-card"><h2>&gt;&gt; ${i18n.t("modal.initialize")}</h2><p class="menu-note">${i18n.t("modal.saveSlot", { slot: String(slot).padStart(2, "0") })}</p><label class="input-row"><span>&gt;</span><input id="world-name" maxlength="20" value="${escapeHtml(i18n.t("modal.defaultWorld", { slot }))}"></label><div class="button-row"><button class="ui-btn" id="create">${i18n.t("button.create")}</button><button class="ui-btn" id="cancel">${i18n.t("button.cancel")}</button></div></div>`);
    const input = modal.querySelector("input");
    input.focus();
    input.select();
    const create = () => {
      this.saveManager.createWorld(slot, input.value);
      modal.remove();
      this.loadWorld(slot, true);
    };
    modal.querySelector("#create").onclick = create;
    modal.querySelector("#cancel").onclick = () => modal.remove();
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") create();
    });
  }

  worldActions(slot) {
    const world = this.saveManager.getSlot(slot);
    if (!world) return;
    const modal = this.appendModal(`<div class="modal-card"><h2>${escapeHtml(world.name)}</h2><p class="menu-note">${escapeHtml(this.saveManager.displayZone(world))} · ${i18n.t("status.memory")} ${world.robot.memory}%</p><div class="button-row"><button class="ui-btn" id="load">${i18n.t("button.load")}</button><button class="ui-btn" id="rename">${i18n.t("button.rename")}</button><button class="ui-btn danger" id="delete">${i18n.t("button.delete")}</button><button class="ui-btn" id="cancel">${i18n.t("button.cancel")}</button></div></div>`);
    modal.querySelector("#load").onclick = () => this.loadWorld(slot);
    modal.querySelector("#rename").onclick = () => {
      modal.remove();
      this.renameWorldModal(slot, world);
    };
    modal.querySelector("#delete").onclick = () => {
      modal.remove();
      this.deleteWorldModal(slot, world);
    };
    modal.querySelector("#cancel").onclick = () => modal.remove();
  }

  renameWorldModal(slot, world) {
    const modal = this.appendModal(`<div class="modal-card"><h2>${i18n.t("button.rename")}</h2><p class="menu-note">${i18n.t("dialog.newWorldName")}</p><label class="input-row"><span>&gt;</span><input id="rename-world" maxlength="20" value="${escapeHtml(world.name)}"></label><div class="button-row"><button class="ui-btn" id="save-name">${i18n.t("button.rename")}</button><button class="ui-btn" id="cancel-name">${i18n.t("button.cancel")}</button></div></div>`);
    const input = modal.querySelector("input");
    input.focus();
    input.select();
    const save = () => {
      this.saveManager.renameWorld(slot, input.value);
      modal.remove();
      this.renderSavedWorlds();
    };
    modal.querySelector("#save-name").onclick = save;
    modal.querySelector("#cancel-name").onclick = () => modal.remove();
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") save();
    });
  }

  deleteWorldModal(slot, world) {
    const modal = this.appendModal(`<div class="modal-card"><h2>${i18n.t("button.delete")}</h2><p class="menu-note">${escapeHtml(i18n.t("dialog.deleteWorld", { name: world.name }))}</p><div class="button-row"><button class="ui-btn danger" id="confirm-delete">${i18n.t("button.delete")}</button><button class="ui-btn" id="cancel-delete">${i18n.t("button.cancel")}</button></div></div>`);
    modal.querySelector("#confirm-delete").onclick = () => {
      this.saveManager.deleteWorld(slot);
      modal.remove();
      this.renderSavedWorlds();
    };
    modal.querySelector("#cancel-delete").onclick = () => modal.remove();
  }

  showPreview(world) {
    const element = this.root.querySelector("#world-preview");
    if (!element) return;
    if (!world) {
      element.classList.remove("visible");
      return;
    }
    const level = world.progress.currentLevel || 1;
    const chapter = getChapter(level);
    const secrets = world.progress.secretRooms?.length || 0;
    element.innerHTML = `<div class="preview-head">&gt; ${i18n.t("preview.title")}</div><div class="preview-grid"><div><span>${i18n.t("preview.name")}</span><b>${escapeHtml(world.name)}</b></div><div><span>${i18n.t("preview.level")}</span><b>${String(level).padStart(3, "0")} / ${TOTAL_LEVELS}</b></div><div><span>${i18n.t("preview.chapter")}</span><b>${escapeHtml(i18n.t(chapter.nameKey))}</b></div><div><span>${i18n.t("preview.secrets")}</span><b>${secrets} / ${TOTAL_LEVELS}</b></div><div><span>${i18n.t("preview.memory")}</span><b>${world.robot.memory}%</b></div><div><span>${i18n.t("preview.progress")}</span><b>${world.progress.campaignComplete ? i18n.t("preview.complete") : i18n.t("preview.inProgress")}</b></div></div>`;
    element.classList.add("visible");
  }

  renderCampaignAtlas() {
    this.view = "campaign";
    this.items = [];
    const lastSlot = this.saveManager.getLastSlot();
    const world = lastSlot ? this.saveManager.getSlot(lastSlot) : null;
    const currentLevel = world?.progress?.currentLevel || 1;
    const highest = world?.progress?.highestUnlockedLevel || currentLevel;
    const cards = CHAPTERS.map((chapter, index) => {
      const start = index * 10 + 1;
      const end = start + 9;
      const unlocked = highest >= start;
      const current = currentLevel >= start && currentLevel <= end;
      return `<article class="campaign-chapter-card ${unlocked ? "unlocked" : "locked"} ${current ? "current" : ""}">
        <header><span>${String(index + 1).padStart(2, "0")}</span><b>${escapeHtml(i18n.t(chapter.nameKey))}</b></header>
        <p>${i18n.t("campaign.levelRange", { start: String(start).padStart(3, "0"), end: String(end).padStart(3, "0") })}</p>
        <small>${current ? i18n.t("campaign.current", { level: String(currentLevel).padStart(3, "0") }) : i18n.t(unlocked ? "campaign.unlocked" : "campaign.locked")}</small>
      </article>`;
    }).join("");
    this.shell(`<section class="menu-subview campaign-atlas"><h1 class="menu-title">&gt;&gt; ${i18n.t("campaign.title")}</h1><p class="menu-note">${i18n.t("campaign.note")}</p><div class="campaign-chapter-grid">${cards}</div><div class="button-row"><button class="ui-btn" id="campaign-back">${i18n.t("button.back")}</button></div></section>`);
    this.root.querySelector("#campaign-back").onclick = () => this.renderMain();
  }

  renderMultiplayerPreview() {
    this.view = "multiplayer";
    this.items = [];
    this.shell(`<section class="menu-subview"><h1 class="menu-title">&gt;&gt; ${i18n.t("multiplayer.title")}</h1><p class="menu-note">${i18n.t("multiplayer.line1")}<br><br>${i18n.t("multiplayer.line2")}</p><div class="button-row"><button class="ui-btn" id="multiplayer-back">${i18n.t("button.back")}</button></div></section>`);
    this.root.querySelector("#multiplayer-back").onclick = () => this.renderMain();
  }

  renderSettings(selected = 0) {
    this.view = "settings";
    this.selected = selected;
    const toggle = (key, index) => {
      this.settings[key] = !this.settings[key];
      this.saveSettingsAndRender(index);
    };
    const cycleQuality = (key, index) => {
      this.settings[key] = nextValue(this.settings[key], QUALITY_ORDER);
      this.saveSettingsAndRender(index);
    };
    this.items = [
      {
        label: i18n.t("settings.language"),
        value: i18n.languageName(),
        action: () => {
          const current = LANGUAGE_ORDER.indexOf(this.settings.language || i18n.language);
          this.settings.language = LANGUAGE_ORDER[(current + 1) % LANGUAGE_ORDER.length];
          this.saveSettingsAndRender(0);
        },
      },
      { label: i18n.t("settings.graphics"), value: i18n.t(`value.${this.settings.graphicsQuality}`), action: () => cycleQuality("graphicsQuality", 1) },
      { label: i18n.t("settings.particles"), value: i18n.t(`value.${this.settings.particleQuality}`), action: () => cycleQuality("particleQuality", 2) },
      { label: i18n.t("settings.uiSound"), value: i18n.t(this.settings.sound ? "value.on" : "value.off"), action: () => toggle("sound", 3) },
      { label: i18n.t("settings.backgroundMotion"), value: i18n.t(this.settings.motion ? "value.on" : "value.off"), action: () => toggle("motion", 4) },
      { label: i18n.t("settings.scanlines"), value: i18n.t(this.settings.scanlines ? "value.on" : "value.off"), action: () => toggle("scanlines", 5) },
      { label: i18n.t("settings.screenShake"), value: i18n.t(this.settings.screenShake ? "value.on" : "value.off"), action: () => toggle("screenShake", 6) },
      { label: i18n.t("button.back"), value: "", action: () => this.renderMain() },
    ];
    this.shell(`<section class="menu-subview"><h1 class="menu-title">&gt;&gt; ${i18n.t("settings.title")}</h1><div class="slot-list">${this.items.map((item, index) => `<div class="settings-row" data-index="${index}"><span>${escapeHtml(item.label)}</span><span>${escapeHtml(item.value)}</span></div>`).join("")}</div></section>`);
    this.bindOptions();
    this.updateSelection(false);
  }

  saveSettingsAndRender(index) {
    this.settings = this.saveManager.saveSettings(this.settings);
    this.renderSettings(index);
  }

  renderCredits() {
    this.view = "credits";
    this.items = [];
    this.shell(`<section class="menu-subview"><h1 class="menu-title">&gt;&gt; ${i18n.t("credits.title")}</h1><div class="credits">${TEAM.map(([name, role]) => `<div><b>${escapeHtml(name)}</b><br>${escapeHtml(i18n.t(role))}</div>`).join("")}</div><div class="button-row"><button class="ui-btn" id="back">${i18n.t("button.back")}</button></div></section>`);
    this.root.querySelector("#back").onclick = () => this.renderMain();
  }

  renderShutdown() {
    this.view = "shutdown";
    this.items = [];
    this.shell(`<section class="menu-subview"><h1 class="menu-title">${i18n.t("shutdown.title")}</h1><p class="menu-note">${i18n.t("shutdown.note")}</p><div class="button-row"><button class="ui-btn" id="restart">${i18n.t("button.restart")}</button></div></section>`);
    this.root.querySelector("#restart").onclick = () => this.renderMain();
  }

  async loadWorld(slot, newlyCreated = false) {
    const world = this.saveManager.getSlot(slot);
    if (!world) return;
    await this.loading(newlyCreated ? i18n.t("loading.initializing") : i18n.t("loading.restoring"));
    this.hide();
    this.startWorld(slot, world);
  }

  loading(title) {
    const overlay = document.querySelector("#loading-overlay");
    const fill = document.querySelector("#loading-fill");
    const value = document.querySelector("#loading-value");
    const message = document.querySelector("#loading-message");
    document.querySelector("#loading-title").textContent = title;
    overlay.classList.remove("hidden");
    fill.style.width = "0%";
    value.textContent = "00%";

    return new Promise((resolve) => {
      let progress = 0;
      const timer = setInterval(() => {
        progress = Math.min(100, progress + Math.floor(Math.random() * 9) + 5);
        fill.style.width = `${progress}%`;
        value.textContent = `${String(progress).padStart(2, "0")}%`;
        message.textContent = progress < 35
          ? i18n.t("loading.reading")
          : progress < 70
            ? i18n.t("loading.calibrating")
            : i18n.t("loading.linking");
        if (progress >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            overlay.classList.add("hidden");
            resolve();
          }, 250);
        }
      }, 70);
    });
  }
}
