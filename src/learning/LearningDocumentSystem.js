import Phaser from "phaser";
import { i18n } from "../i18n/I18n.js";

export class LearningDocumentSystem {
  constructor(scene, saveData, definitions, onRead = null, overallTotal = null) {
    this.scene = scene;
    this.saveData = saveData;
    this.definitions = definitions;
    this.onRead = onRead;
    this.overallTotal = overallTotal || definitions.length;
    this.entries = [];
    this.overlay = null;
    this.isOpen = false;
    this.openedAt = 0;
    this.boundKeyHandler = (event) => this.handleOverlayKey(event);

    this.saveData.progress.docsRead ??= [];
    this.read = new Set(this.saveData.progress.docsRead);
    this.createEntries();
  }

  createEntries() {
    this.entries = this.definitions.map((definition, index) => {
      const sprite = this.scene.physics.add
        .sprite(definition.x, definition.y, "learning-terminal")
        .setDepth(17)
        .setScale(0.58)
        .setTint(this.read.has(definition.id) ? 0x6f8d91 : 0x9df8ff)
        .setBlendMode(Phaser.BlendModes.ADD);

      sprite.body.setAllowGravity(false);
      sprite.body.setImmovable(true);
      sprite.setData("documentId", definition.id);

      if (this.scene.performance?.profile?.backgroundTweens !== false) {
        this.scene.tweens.add({
          targets: sprite,
          y: definition.y - 9,
          alpha: { from: 0.62, to: 1 },
          duration: 850 + index * 90,
          yoyo: true,
          repeat: -1,
          ease: Phaser.Math.Easing.Sine.InOut,
        });
      }

      return { definition, sprite };
    });
  }

  nearest(playerSprite, maxDistance = 105) {
    let nearest = null;
    let distance = maxDistance;

    for (const entry of this.entries) {
      if (!entry.sprite?.active) continue;
      const current = Phaser.Math.Distance.Between(
        playerSprite.x,
        playerSprite.y,
        entry.sprite.x,
        entry.sprite.y,
      );
      if (current < distance) {
        nearest = entry;
        distance = current;
      }
    }

    return nearest;
  }

  hasRead(id) {
    return this.read.has(id);
  }

  count() {
    return this.read.size;
  }

  total() {
    return this.overallTotal;
  }

  open(entry) {
    if (!entry || this.isOpen) return;

    this.isOpen = true;
    this.openedAt = performance.now();
    this.scene.player.controlsLocked = true;
    this.scene.physics.world.isPaused = true;
    this.scene.hud?.setPrompt("");

    const { definition, sprite } = entry;
    const firstRead = !this.read.has(definition.id);

    if (firstRead) {
      this.read.add(definition.id);
      this.saveData.progress.docsRead = [...this.read];
      sprite.setTint(0x6f8d91);
      this.onRead?.(definition.id);
    }

    const overlay = document.createElement("section");
    overlay.className = "learning-doc-overlay";
    overlay.innerHTML = `
      <article class="learning-doc-card" role="dialog" aria-modal="true">
        <header class="learning-doc-header">
          <div>
            <small>${i18n.t("doc.archive")}</small>
            <h2>${i18n.t(definition.titleKey)}</h2>
          </div>
          <span class="learning-language">${definition.language}</span>
        </header>
        <p class="learning-doc-body">${i18n.t(definition.bodyKey)}</p>
        <pre class="learning-code"><code>${this.escapeHtml(definition.code)}</code></pre>
        <section class="learning-hint">
          <b>${i18n.t("doc.advance")}</b>
          <span>${i18n.t(definition.hintKey)}</span>
        </section>
        <footer>
          <span>${i18n.t("doc.progress", { current: this.count(), total: this.total() })}</span>
          <button type="button" class="learning-close">${i18n.t("button.close")}</button>
        </footer>
      </article>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    overlay.querySelector(".learning-close")?.addEventListener("click", () => this.close());
    document.addEventListener("keydown", this.boundKeyHandler);
  }

  handleOverlayKey(event) {
    if (!this.isOpen || performance.now() - this.openedAt < 260 || event.repeat) return;
    if (["Escape", "Enter", "e", "E", " "].includes(event.key)) {
      event.preventDefault();
      this.close();
    }
  }

  close() {
    if (!this.isOpen) return;
    document.removeEventListener("keydown", this.boundKeyHandler);
    this.overlay?.remove();
    this.overlay = null;
    this.isOpen = false;
    this.scene.physics.world.isPaused = this.scene.isPaused;
    this.scene.player.controlsLocked = false;
    this.scene.game.canvas?.focus();
    this.scene.updateLearningHud?.();
    this.scene.updateObjective?.();
    this.scene.save?.();
  }

  destroy() {
    document.removeEventListener("keydown", this.boundKeyHandler);
    this.overlay?.remove();
    this.overlay = null;
    this.entries.length = 0;
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
