export const JUMP_CONFIG = Object.freeze({
  velocityY: -555,
  bufferMs: 150,
  coyoteMs: 130,
  shortHopMultiplier: 0.84,
});

export class JumpAbility {
  constructor(player) {
    this.player = player;
  }

  perform() {
    const player = this.player;
    player.sprite.body.setVelocityY(JUMP_CONFIG.velocityY);
    player.jumpsUsed = 1;
    player.jumpBufferedAt = -Infinity;
    player.lastGroundedAt = -Infinity;
    player.scene.spawnGhostBurst(player.sprite.x, player.sprite.y + 24, 7);
    player.scene.achievements?.increment("jumps");
    player.scene.achievements?.unlock("first_jump");
  }
}
