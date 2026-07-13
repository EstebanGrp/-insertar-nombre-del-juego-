import Phaser from "phaser";

export class SecretRoomSystem {
  constructor(scene, definition, layout, saveData) {
    this.scene = scene;
    this.definition = definition;
    this.layout = layout;
    this.saveData = saveData;
    this.levelKey = String(definition.level);
    this.saveData.progress.levelSignals ??= {};
    this.saveData.progress.secretRooms ??= [];
    this.activated = new Set(this.saveData.progress.levelSignals[this.levelKey] || []);
    this.nodes = [];
    this.opened = false;

    this.createSignals();
    this.createSecretWall();

    if (this.activated.size >= this.definition.requiredSignals) {
      this.openWall(true);
    }
  }

  createSignals() {
    this.layout.signals.forEach((position, index) => {
      const sprite = this.scene.physics.add
        .sprite(position.x, position.y, "secret-signal")
        .setDepth(18)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setData("signalIndex", index);
      sprite.body.setAllowGravity(false);
      sprite.body.setImmovable(true);
      if (this.activated.has(index)) {
        sprite.setTint(0x7bffbd).setAlpha(0.45);
      } else if (this.scene.performance?.profile?.backgroundTweens !== false) {
        this.scene.tweens.add({
          targets: sprite,
          alpha: { from: 0.45, to: 1 },
          scale: { from: 0.92, to: 1.08 },
          duration: 850 + index * 120,
          yoyo: true,
          repeat: -1,
          ease: Phaser.Math.Easing.Sine.InOut,
        });
      }
      this.nodes.push({ index, sprite });
    });
  }

  createSecretWall() {
    const wall = this.layout.secretWall;
    this.wallVisual = this.scene.add
      .tileSprite(wall.x + wall.width / 2, wall.y + wall.height / 2, wall.width, wall.height, "parkour-wall")
      .setDepth(12)
      .setTint(this.definition.accent)
      .setAlpha(0.92);

    this.wallBody = this.scene.add.rectangle(
      wall.x + wall.width / 2,
      wall.y + wall.height / 2,
      wall.width,
      wall.height,
      0xffffff,
      0,
    );
    this.scene.physics.add.existing(this.wallBody, true);
    this.scene.physics.add.collider(this.scene.player.sprite, this.wallBody);

    this.clue = this.scene.add
      .ellipse(wall.x - 26, wall.y + 95, 16, 84, this.definition.accent, 0.08)
      .setDepth(13)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (this.scene.performance?.profile?.backgroundTweens !== false) {
      this.scene.tweens.add({
        targets: this.clue,
        alpha: { from: 0.035, to: 0.18 },
        scaleY: { from: 0.85, to: 1.16 },
        duration: 980,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  nearest(playerSprite, maxDistance = 100) {
    let nearest = null;
    let nearestDistance = maxDistance;
    for (const node of this.nodes) {
      if (this.activated.has(node.index) || !node.sprite?.active) continue;
      const distance = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, node.sprite.x, node.sprite.y);
      if (distance < nearestDistance) {
        nearest = node;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  activate(node) {
    if (!node || this.activated.has(node.index)) return false;
    this.activated.add(node.index);
    this.saveData.progress.levelSignals[this.levelKey] = [...this.activated];
    node.sprite.setTint(0x7bffbd);
    this.scene.spawnGhostBurst(node.sprite.x, node.sprite.y, 18, 0x7bffbd);
    this.scene.tweens.killTweensOf(node.sprite);
    this.scene.tweens.add({
      targets: node.sprite,
      scale: 1.45,
      alpha: 0.45,
      duration: 260,
      yoyo: true,
      onComplete: () => node.sprite.setScale(1).setAlpha(0.45),
    });
    this.scene.onSecretSignalActivated?.(this.count(), this.total());

    if (this.count() >= this.total()) this.openWall(false);
    return true;
  }

  count() {
    return this.activated.size;
  }

  total() {
    return this.definition.requiredSignals;
  }

  allActive() {
    return this.count() >= this.total();
  }

  openWall(immediate = false) {
    if (this.opened) return;
    this.opened = true;
    if (!this.saveData.progress.secretRooms.includes(this.definition.level)) {
      this.saveData.progress.secretRooms.push(this.definition.level);
    }
    if (this.wallBody?.body) this.wallBody.body.enable = false;
    this.clue?.destroy();

    if (immediate) {
      this.wallVisual.setVisible(false);
      return;
    }

    this.scene.shakeCamera(260, 0.004);
    this.scene.tweens.add({
      targets: this.wallVisual,
      y: this.wallVisual.y - 210,
      alpha: 0,
      duration: 650,
      ease: Phaser.Math.Easing.Cubic.InOut,
      onComplete: () => this.wallVisual.setVisible(false),
    });
    this.scene.onSecretRoomOpened?.();
  }

  destroy() {
    this.nodes.length = 0;
  }
}
