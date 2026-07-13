import Phaser from "phaser";

export class WardenBoss {
  constructor(scene, x, y) {
    this.scene = scene;
    this.maxHealth = 26;
    this.health = this.maxHealth;
    this.dead = false;
    this.nextAttackAt = scene.time.now + 900;
    this.attackLockedUntil = 0;
    this.chargingUntil = 0;
    this.hitLockedUntil = 0;

    this.sprite = scene.physics.add
      .sprite(x, y, "boss-warden", 0)
      .setSize(78, 70)
      .setOffset(17, 18)
      .setDepth(19);

    this.sprite.setData("entity", this);
    this.sprite.anims.play("warden-idle", true);
  }

  get phase() {
    if (this.health <= 8) return 3;
    if (this.health <= 17) return 2;
    return 1;
  }

  update(time, player) {
    if (this.dead || this.scene.isPaused || !this.sprite.active) return;

    if (time < this.chargingUntil) return;
    if (time < this.attackLockedUntil) {
      this.sprite.setVelocityX(0);
      return;
    }

    const direction = Math.sign(player.sprite.x - this.sprite.x) || 1;
    const distance = Math.abs(player.sprite.x - this.sprite.x);
    this.sprite.setFlipX(direction < 0);

    if (time >= this.nextAttackAt) {
      this.chooseAttack(time, player, direction, distance);
      return;
    }

    const speed = this.phase === 3 ? 130 : this.phase === 2 ? 102 : 78;
    if (distance > 175) this.sprite.setVelocityX(direction * speed);
    else this.sprite.setVelocityX(0);
  }

  chooseAttack(time, player, direction, distance) {
    const roll = Phaser.Math.Between(0, 99);

    if (this.phase >= 2 && distance < 260 && roll < 38) {
      this.slam(time);
      return;
    }

    if (this.phase === 3 && distance > 240 && roll < 72) {
      this.charge(time, direction);
      return;
    }

    this.volley(time, direction);
  }

  telegraph(color, duration, callback) {
    this.attackLockedUntil = this.scene.time.now + duration;
    this.sprite.setTint(color);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.08,
      scaleY: 0.94,
      duration: 90,
      yoyo: true,
      repeat: 2,
    });

    this.scene.time.delayedCall(duration, () => {
      if (!this.sprite.active || this.dead) return;
      this.sprite.clearTint();
      callback();
    });
  }

  volley(time, direction) {
    const shots = this.phase === 1 ? 2 : this.phase === 2 ? 4 : 5;
    this.nextAttackAt = time + (this.phase === 3 ? 1050 : 1450);

    this.telegraph(0xff6079, 320, () => {
      for (let index = 0; index < shots; index += 1) {
        const spread = (index - (shots - 1) / 2) * 56;
        this.scene.time.delayedCall(index * 70, () => {
          if (!this.sprite.active) return;
          this.scene.spawnEnemyProjectile(
            this.sprite.x + direction * 55,
            this.sprite.y - 18,
            direction * (285 + this.phase * 16),
            spread,
            1,
          );
        });
      }
    });
  }

  slam(time) {
    this.nextAttackAt = time + 1500;
    this.telegraph(0xffa048, 420, () => {
      this.sprite.setVelocityY(-310);
      this.scene.time.delayedCall(420, () => {
        if (!this.sprite.active) return;
        this.sprite.setVelocityY(580);
        this.scene.time.delayedCall(260, () => {
          if (!this.sprite.active) return;
          this.scene.cameras.main.shake(230, 0.009);
          this.scene.spawnShockwaves(this.sprite.x, this.sprite.y + 35, this.phase);
        });
      });
    });
  }

  charge(time, direction) {
    this.nextAttackAt = time + 1450;
    this.telegraph(0xf5dd75, 370, () => {
      this.chargingUntil = this.scene.time.now + 650;
      this.sprite.setVelocityX(direction * 480);
      this.scene.time.delayedCall(650, () => {
        if (!this.sprite.active) return;
        this.sprite.setVelocityX(0);
        this.scene.cameras.main.shake(100, 0.004);
      });
    });
  }

  takeDamage(amount, direction) {
    if (
      this.dead ||
      this.scene.time.now < this.hitLockedUntil ||
      this.scene.time.now < this.chargingUntil
    ) {
      return;
    }

    this.hitLockedUntil = this.scene.time.now + 75;
    this.health = Math.max(0, this.health - amount);
    this.sprite.setVelocity(direction * 105, -70);
    this.sprite.setTint(0xffffff);
    this.scene.spawnImpact(this.sprite.x, this.sprite.y, 0xffffff);
    this.scene.hud.updateBoss(this.health, this.maxHealth, this.phase);
    this.scene.time.delayedCall(90, () => this.sprite.clearTint());

    if (this.health <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.sprite.body.enable = false;
    this.scene.hud.hideBoss();
    this.scene.onBossDefeated();
    this.scene.spawnGhostBurst(this.sprite.x, this.sprite.y, 55, 0xff6d89);

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      y: this.sprite.y - 80,
      angle: 18,
      scale: 0.2,
      duration: 900,
      ease: "Cubic.In",
      onComplete: () => this.sprite.destroy(),
    });
  }
}
