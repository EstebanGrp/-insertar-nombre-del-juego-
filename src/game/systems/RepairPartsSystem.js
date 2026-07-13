import Phaser from "phaser";
import { i18n } from "../../i18n/I18n.js";

export const REPAIR_PARTS = Object.freeze([
  { id: "servo", x: 1980, y: 610, texture: "part-servo", nameKey: "part.servo" },
  { id: "optic", x: 3140, y: 435, texture: "part-optic", nameKey: "part.optic" },
  { id: "memory", x: 4560, y: 510, texture: "part-memory", nameKey: "part.memory" },
  { id: "map", x: 5660, y: 385, texture: "part-map", nameKey: "part.map" },
]);

export class RepairPartsSystem {
  constructor(scene, saveData, onCollect = null) {
    this.scene = scene;
    this.saveData = saveData;
    this.onCollect = onCollect;
    this.saveData.progress.repairParts ??= [];
    this.collected = new Set(this.saveData.progress.repairParts);
    this.group = this.scene.physics.add.group({ allowGravity: false, immovable: true });
    this.createParts();
  }

  createParts() {
    REPAIR_PARTS.forEach((part, index) => {
      if (this.collected.has(part.id)) return;

      const sprite = this.group
        .create(part.x, part.y, part.texture)
        .setDepth(18)
        .setScale(0.82)
        .setBlendMode(Phaser.BlendModes.ADD);
      sprite.body.setAllowGravity(false);
      sprite.setData("part", part);

      this.scene.tweens.add({
        targets: sprite,
        y: part.y - 12,
        angle: { from: -4, to: 4 },
        duration: 900 + index * 130,
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Sine.InOut,
      });
    });

    this.scene.physics.add.overlap(this.scene.player.sprite, this.group, (_player, sprite) => {
      this.collect(sprite);
    });
  }

  collect(sprite) {
    if (!sprite?.active) return;
    const part = sprite.getData("part");
    if (!part || this.collected.has(part.id)) return;

    this.collected.add(part.id);
    this.saveData.progress.repairParts = [...this.collected];
    sprite.disableBody(true, true);
    this.scene.spawnGhostBurst(sprite.x, sprite.y, 18, 0xffe28a);
    this.scene.cameras.main.flash(90, 255, 220, 110, false);
    this.scene.hud?.setObjective(
      i18n.t("objective.partCollected", {
        part: i18n.t(part.nameKey),
        current: this.count(),
        total: this.total(),
      }),
      i18n.t("label.repair"),
    );
    this.onCollect?.(part);
  }

  has(id) {
    return this.collected.has(id);
  }

  count() {
    return this.collected.size;
  }

  total() {
    return REPAIR_PARTS.length;
  }

  allCollected() {
    return this.count() >= this.total();
  }
}
