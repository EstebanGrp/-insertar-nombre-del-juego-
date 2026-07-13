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
      .setDepth(18)
      .setSize(42, 48)
      .setOffset(11, 12);

    this.sprite.body.setAllowGravity(false);
    this.sprite.setImmovable(true);

    if (this.active) {
      this.sprite.anims.play("robot-active", true);
      this.startHover();
    } else {
      scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.45, to: 0.9 },
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }

  startHover() {
    this.scene.tweens.killTweensOf(this.sprite);
  }

  activate() {
    if (this.active) return;
    this.active = true;
    this.discovered = true;
    this.memory = Math.max(this.memory, 7);
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setTexture("robot-active", 0);
    this.sprite.anims.play("robot-active", true);
    this.sprite.setAlpha(1);
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
      ease: "Back.Out",
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
}
