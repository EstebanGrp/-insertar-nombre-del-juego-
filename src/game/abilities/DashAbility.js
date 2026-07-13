export const DASH_CONFIG = Object.freeze({
  spiritCost: 25,
  cooldownMs: 720,
  invulnerabilityMs: 210,
  speed: 630,
  durationMs: 175,
  exitSpeed: 270,
});

export class DashAbility {
  constructor(player) {
    this.player = player;
  }

  canUse(time, grounded) {
    const player = this.player;
    return (
      time >= player.dashReadyAt &&
      player.spirit >= DASH_CONFIG.spiritCost &&
      (grounded || player.canAirDash)
    );
  }

  activate(time, direction) {
    const player = this.player;
    const body = player.sprite.body;
    player.isDashing = true;
    player.isWallSliding = false;
    player.canAirDash = false;
    player.dashReadyAt = time + DASH_CONFIG.cooldownMs;
    player.invulnerableUntil = Math.max(player.invulnerableUntil, time + DASH_CONFIG.invulnerabilityMs);
    player.spirit = Math.max(0, player.spirit - DASH_CONFIG.spiritCost);
    player.scene.achievements?.increment("dashes");
    player.scene.achievements?.unlock("first_dash");

    body.setAcceleration(0, 0);
    body.setDragX(0);
    body.setAllowGravity(false);
    body.setVelocity(direction * DASH_CONFIG.speed, 0);
    player.sprite.setAngle(0);
    player.sprite.anims.play("ghost-dash", true);

    const afterimageCount = player.scene.performance?.profile.afterimages ?? 4;
    let afterimageTimer = null;
    if (afterimageCount > 0) {
      afterimageTimer = player.scene.time.addEvent({
        delay: Math.max(32, Math.floor(DASH_CONFIG.durationMs / afterimageCount)),
        repeat: afterimageCount - 1,
        callback: () => player.scene.spawnAfterimage(player.sprite),
      });
    }

    player.scene.time.delayedCall(DASH_CONFIG.durationMs, () => {
      if (!player.sprite.active) return;
      afterimageTimer?.remove(false);
      body.setAllowGravity(true);
      body.setVelocityX(direction * DASH_CONFIG.exitSpeed);
      player.isDashing = false;
    });
  }
}
