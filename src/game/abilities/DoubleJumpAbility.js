export const DOUBLE_JUMP_CONFIG = Object.freeze({
  velocityY: -515,
  horizontalMomentum: 1.03,
});

export class DoubleJumpAbility {
  constructor(player) {
    this.player = player;
  }

  perform() {
    const player = this.player;
    const body = player.sprite.body;
    body.setVelocityY(DOUBLE_JUMP_CONFIG.velocityY);
    body.setVelocityX(body.velocity.x * DOUBLE_JUMP_CONFIG.horizontalMomentum);
    player.jumpsUsed = player.maxJumps;
    player.jumpBufferedAt = -Infinity;
    player.canAirDash = true;
    player.scene.spawnDoubleJumpEffect(player.sprite.x, player.sprite.y + 18);
    player.scene.achievements?.increment("jumps");
    player.scene.achievements?.increment("doubleJumps");
    player.scene.achievements?.unlock("double_jump");
  }
}
