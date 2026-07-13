export const GLIDE_CONFIG = Object.freeze({
  minimumFallSpeed: 80,
  maxFallSpeed: 270,
  gravityCompensation: -850,
  spiritDrainPerFrame: 0.42,
});

export class GlideAbility {
  constructor(player) {
    this.player = player;
  }

  update({ grounded, jumpHeld }) {
    const player = this.player;
    const body = player.sprite.body;
    const active =
      !grounded &&
      !player.isWallSliding &&
      body.velocity.y > GLIDE_CONFIG.minimumFallSpeed &&
      jumpHeld &&
      player.spirit > 0;

    if (!active) return false;

    body.setGravityY(GLIDE_CONFIG.gravityCompensation);
    body.setVelocityY(Math.min(body.velocity.y, GLIDE_CONFIG.maxFallSpeed));
    player.spirit = Math.max(0, player.spirit - GLIDE_CONFIG.spiritDrainPerFrame);
    player.sprite.setAlpha(0.78);
    return true;
  }
}
