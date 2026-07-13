import Phaser from "phaser";

export class RobotCompanion {
  constructor(scene, x, y, savedRobot = {}) {
    this.scene = scene;
    this.active = Boolean(savedRobot.active || savedRobot.coreInstalled);
    this.discovered = Boolean(savedRobot.discovered);
    this.memory = savedRobot.memory || 2;
    this.gestureBusy = false;
    this.baseY = y;

    this.sprite = scene.physics.add
      .sprite(x, y, this.active ? "robot-active" : "robot-damaged")
      .setDepth(22)
      .setSize(42, 48)
      .setOffset(11, 12)
      .setData("entityType", "robot");

    this.sprite.body.setAllowGravity(false);
    this.sprite.setImmovable(true);

    this.createVisibilityGuide(x, y);

    if (this.active) {
      this.sprite.anims.play("robot-active", true);
      this.sprite.setScale(1.08);
      this.startHover();
      this.hideDiscoveryGuide();
    } else {
      this.sprite.setScale(1.22).setTint(0xbfefff);
      scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.72, to: 1 },
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Sine.InOut,
      });

      if (this.discovered) this.hideDiscoveryGuide();
    }
  }

  createVisibilityGuide(x, y) {
    this.discoveryRing = this.scene.add
      .ellipse(x, y + 18, 92, 30, 0x7beeff, 0.08)
      .setStrokeStyle(2, 0x8df7ff, 0.62)
      .setDepth(19)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.discoveryMarker = this.scene.add
      .text(x, y - 86, "▼", {
        fontFamily: "Consolas, monospace",
        fontSize: "25px",
        color: "#d9ffff",
        stroke: "#096b78",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (!this.active && !this.discovered && this.scene.settings?.motion !== false) {
      this.scene.tweens.add({
        targets: this.discoveryMarker,
        y: y - 98,
        alpha: { from: 0.55, to: 1 },
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Sine.InOut,
      });

      this.scene.tweens.add({
        targets: this.discoveryRing,
        scaleX: { from: 0.85, to: 1.18 },
        scaleY: { from: 0.85, to: 1.18 },
        alpha: { from: 0.05, to: 0.22 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Sine.InOut,
      });
    }
  }

  hideDiscoveryGuide() {
    this.scene.tweens.killTweensOf(this.discoveryMarker);
    this.scene.tweens.killTweensOf(this.discoveryRing);
    this.discoveryMarker?.setVisible(false);
    this.discoveryRing?.setVisible(false);
  }

  markDiscovered() {
    this.discovered = true;
    this.hideDiscoveryGuide();
    this.sprite.clearTint().setTint(0xd8fbff).setAlpha(1);
  }

  startHover() {
    this.scene.tweens.killTweensOf(this.sprite);
  }

  activate() {
    if (this.active) return;
    this.active = true;
    this.discovered = true;
    this.memory = Math.max(this.memory, 7);
    this.hideDiscoveryGuide();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setTexture("robot-active", 0);
    this.sprite.anims.play("robot-active", true);
    this.sprite.setAlpha(1).setScale(1.08).clearTint();
    this.scene.spawnGhostBurst(this.sprite.x, this.sprite.y, 24);
    this.startHover();
    this.gesture("portal", 1900);
  }

  update(player) {
    if (!this.active || !this.sprite.active || this.scene.isPaused) return;

    const desiredX = player.sprite.x - player.facing * 74;
    const desiredY = player.sprite.y - 58 + Math.sin(this.scene.time.now / 310) * 6;
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      desiredX,
      desiredY,
    );

    if (distance > 430) {
      this.sprite.setPosition(desiredX, desiredY);
      this.scene.spawnGhostBurst(this.sprite.x, this.sprite.y, 10);
      return;
    }

    this.sprite.x = Phaser.Math.Linear(this.sprite.x, desiredX, 0.045);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, desiredY, 0.045);
    this.sprite.setFlipX(player.facing < 0);
  }

  gesture(type, duration = 1500) {
    if (this.gestureBusy || !this.sprite.active) return;
    this.gestureBusy = true;

    const texture = {
      core: "holo-core",
      portal: "holo-portal",
      alert: "holo-alert",
    }[type] || "holo-alert";

    const hologram = this.scene.add
      .image(this.sprite.x, this.sprite.y - 75, texture)
      .setDepth(40)
      .setAlpha(0)
      .setScale(0.55)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: hologram,
      alpha: 0.9,
      scale: 0.85,
      y: hologram.y - 8,
      duration: 240,
      ease: Phaser.Math.Easing.Back.Out,
      yoyo: true,
      hold: Math.max(200, duration - 480),
      onComplete: () => {
        hologram.destroy();
        this.gestureBusy = false;
      },
    });

    this.scene.tweens.add({
      targets: this.sprite,
      angle: { from: -4, to: 4 },
      duration: 90,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.sprite.setAngle(0),
    });
  }

  serialize() {
    return {
      discovered: this.discovered,
      active: this.active,
      coreInstalled: this.active,
      memory: this.memory,
    };
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.discoveryMarker);
    this.scene.tweens.killTweensOf(this.discoveryRing);
    this.discoveryMarker?.destroy();
    this.discoveryRing?.destroy();
    this.sprite?.destroy();
  }
}
