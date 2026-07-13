export class DroneEnemy {
  constructor(scene, x, y, minX, maxX) {
    this.scene = scene;
    this.minX = minX;
    this.maxX = maxX;
    this.health = 4;
    this.dead = false;
    this.nextShotAt = 0;
    this.hitLockedUntil = 0;

    this.sprite = scene.physics.add
      .sprite(x, y, "enemy-drone", 0)
      .setSize(38, 25)
      .setOffset(7, 7)
      .setDepth(17);

    this.sprite.setData("entity", this);
    this.sprite.setVelocityX(74);
    this.sprite.anims.play("drone-fly", true);
  }

  update(time, player) {
    if (this.dead || this.scene.isPaused || !this.sprite.active) return;

    const distance = Math.abs(player.sprite.x - this.sprite.x);
    const direction = Math.sign(player.sprite.x - this.sprite.x) || 1;

    if (distance < 340) {
      this.sprite.setVelocityX(direction * 105);
      this.sprite.setFlipX(direction < 0);

      if (time >= this.nextShotAt && distance > 120) {
        this.nextShotAt = time + 1700;
        this.scene.spawnEnemyProjectile(
          this.sprite.x + direction * 24,
          this.sprite.y,
          direction * 245,
          0,
          1,
        );
      }
    } else {
      if (this.sprite.x <= this.minX) this.sprite.setVelocityX(74);
      if (this.sprite.x >= this.maxX) this.sprite.setVelocityX(-74);
      this.sprite.setFlipX(this.sprite.body.velocity.x < 0);
    }
  }

  takeDamage(amount, direction) {
    if (this.dead || this.scene.time.now < this.hitLockedUntil) return;
    this.hitLockedUntil = this.scene.time.now + 80;
    this.health -= amount;
    this.sprite.setVelocity(direction * 215, -155);
    this.sprite.setTint(0xffffff);
    this.scene.spawnImpact(this.sprite.x, this.sprite.y, 0xa7faff);
    this.scene.time.delayedCall(95, () => this.sprite.clearTint());

    if (this.health <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.scene.onEnemyDefeated?.("drone");
    this.scene.player.addSpirit(15);
    this.scene.spawnGhostBurst(this.sprite.x, this.sprite.y, 16, 0xff7590);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 0.15,
      angle: 35,
      duration: 260,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
