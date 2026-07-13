import Phaser from "phaser";

export class WraithEnemy {
  constructor(scene, x, y, homeX = x) {
    this.scene = scene;
    this.homeX = homeX;
    this.health = 3;
    this.dead = false;
    this.nextDashAt = 0;
    this.dashingUntil = 0;

    this.sprite = scene.physics.add
      .sprite(x, y, "enemy-wraith", 0)
      .setSize(28, 39)
      .setOffset(10, 8)
      .setDepth(16)
      .setAlpha(0.88);

    this.sprite.body.setAllowGravity(false);
    this.sprite.setData("entity", this);
    this.sprite.anims.play("wraith-float", true);
  }

  update(time, player) {
    if (this.dead || this.scene.isPaused || !this.sprite.active) return;

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      player.sprite.x,
      player.sprite.y,
    );

    if (time < this.dashingUntil) return;

    if (distance < 300) {
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        player.sprite.x,
        player.sprite.y,
      );

      if (time >= this.nextDashAt && distance < 220) {
        this.nextDashAt = time + 1900;
        this.dashingUntil = time + 300;
        this.sprite.setTint(0xf4bdff);
        this.scene.time.delayedCall(150, () => {
          if (!this.sprite.active) return;
          this.sprite.clearTint();
          this.sprite.setVelocity(Math.cos(angle) * 330, Math.sin(angle) * 330);
        });
      } else {
        this.sprite.setVelocity(Math.cos(angle) * 78, Math.sin(angle) * 78);
      }
    } else {
      const targetX = this.homeX + Math.sin(time / 900) * 90;
      this.sprite.setVelocity((targetX - this.sprite.x) * 0.5, Math.sin(time / 500) * 25);
    }

    this.sprite.setFlipX(player.sprite.x < this.sprite.x);
  }

  takeDamage(amount, direction) {
    if (this.dead) return;
    this.health -= amount;
    this.sprite.setVelocity(direction * 190, -100);
    this.sprite.setTint(0xffffff);
    this.scene.spawnImpact(this.sprite.x, this.sprite.y, 0xd894ff);
    this.scene.time.delayedCall(100, () => this.sprite.clearTint());

    if (this.health <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.scene.onEnemyDefeated?.("wraith");
    this.scene.player.addSpirit(18);
    this.scene.spawnGhostBurst(this.sprite.x, this.sprite.y, 18, 0xc275ff);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      y: this.sprite.y - 40,
      scale: 1.5,
      duration: 320,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
