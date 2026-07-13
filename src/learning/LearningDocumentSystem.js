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
      const alreadyRead = this.read.has(definition.id);
      const sprite = this.scene.physics.add
        .sprite(definition.x, definition.y, "learning-terminal")
        .setDepth(24)
        .setScale(0.82)
        .setTint(alreadyRead ? 0x6f8d91 : 0xc8ffff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setData("documentId", definition.id);

      sprite.body.setAllowGravity(false);
      sprite.body.setImmovable(true);

      const ring = this.scene.add
        .ellipse(definition.x, definition.y + 20, 86, 27, 0x84efff, 0.06)
        .setStrokeStyle(2, alreadyRead ? 0x56787d : 0x9af8ff, alreadyRead ? 0.22 : 0.72)
        .setDepth(20)
        .setBlendMode(Phaser.BlendModes.ADD);

      const marker = this.scene.add
        .text(definition.x, definition.y - 72, "▼", {
          fontFamily: "Consolas, monospace",
          fontSize: "22px",
          color: alreadyRead ? "#668086" : "#e6ffff",
          stroke: "#0b6875",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(40)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(!alreadyRead);

      if (!alreadyRead && this.scene.performance?.profile?.backgroundTweens !== false) {
        this.scene.tweens.add({
          targets: sprite,
          y: definition.y - 9,
          alpha: { from: 0.72, to: 1 },
          duration: 760 + index * 90,
          yoyo: true,
          repeat: -1,
          ease: Phaser.Math.Easing.Sine.InOut,
        });

        this.scene.tweens.add({
          targets: marker,
          y: definition.y - 84,
          alpha: { from: 0.55, to: 1 },
          duration: 580,
          yoyo: true,
          repeat: -1,
          ease: Phaser.Math.Easing.Sine.InOut,
        });

        this.scene.tweens.add({
          targets: ring,
          scaleX: { from: 0.85, to: 1.17 },
          scaleY: { from: 0.85, to: 1.17 },
          alpha: { from: 0.05, to: 0.2 },
          duration: 850,
          yoyo: true,
          repeat: -1,
          ease: Phaser.Math.Easing.Sine.InOut,
        });
      }

      return { definition, sprite, ring, marker };
    });
  }

  nearest(playerSprite, maxDistance = 140) {
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

  markEntryRead(entry) {
    const { sprite, ring, marker } = entry;
    this.scene.tweens.killTweensOf(sprite);
    this.scene.tweens.killTweensOf(ring);
    this.scene.tweens.killTweensOf(marker);
    sprite.setTint(0x6f8d91).setAlpha(0.72).setScale(0.72);
    ring.setStrokeStyle(1, 0x56787d, 0.22).setAlpha(0.1).setScale(1);
    marker.setVisible(false);
  }

  open(entry) {
    if (!entry || this.isOpen) return;

    this.isOpen = true;
    this.openedAt = performance.now();
    this.scene.player.controlsLocked = true;
    this.scene.physics.world.isPaused = true;
    this.scene.hud?.setPrompt("");

    const { definition } = entry;
    const firstRead = !this.read.has(definition.id);

    if (firstRead) {
      this.read.add(definition.id);
      this.saveData.progress.docsRead = [...this.read];
      this.markEntryRead(entry);
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

    for (const entry of this.entries) {
      this.scene.tweens.killTweensOf(entry.sprite);
      this.scene.tweens.killTweensOf(entry.ring);
      this.scene.tweens.killTweensOf(entry.marker);
      entry.marker?.destroy();
      entry.ring?.destroy();
      entry.sprite?.destroy();
    }

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
