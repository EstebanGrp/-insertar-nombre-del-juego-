export const WALL_PARKOUR_CONFIG = Object.freeze({
  jumpVelocityX: 390,
  jumpVelocityY: -525,
  jumpLockMs: 155,
  slideMaxVelocityY: 145,
  slideGravityCompensation: -930,
  chainAchievementCount: 3,
});

export class WallParkourAbility {
  constructor(player) {
    this.player = player;
  }

  update({ time, grounded, pressingIntoWall }) {
    const player = this.player;
    const body = player.sprite.body;
    player.isWallSliding =
      !grounded &&
      player.wallDirection !== 0 &&
      pressingIntoWall &&
      body.velocity.y > -120 &&
      time >= player.wallJumpLockUntil;

    if (!player.isWallSliding) return false;

    body.setGravityY(WALL_PARKOUR_CONFIG.slideGravityCompensation);
    body.setVelocityY(Math.min(body.velocity.y, WALL_PARKOUR_CONFIG.slideMaxVelocityY));
    player.spirit = Math.min(player.maxSpirit, player.spirit + 0.05);
    player.scene.achievements?.unlock("wall_slide");

    if (time - player.lastWallFxAt > 90) {
      player.lastWallFxAt = time;
      player.scene.spawnWallSlideEffect(player.sprite.x, player.sprite.y + 18, player.wallDirection);
    }

    return true;
  }

  performJump(time, wallDirection) {
    const player = this.player;
    const body = player.sprite.body;
    const away = -wallDirection;
    body.setGravityY(0);
    body.setVelocity(away * WALL_PARKOUR_CONFIG.jumpVelocityX, WALL_PARKOUR_CONFIG.jumpVelocityY);
    player.facing = away;
    player.sprite.setFlipX(away < 0);
    player.jumpsUsed = 1;
    player.jumpBufferedAt = -Infinity;
    player.wallJumpLockUntil = time + WALL_PARKOUR_CONFIG.jumpLockMs;
    player.wallJumpChain += 1;
    player.canAirDash = true;
    player.isWallSliding = false;
    player.scene.spawnWallJumpEffect(player.sprite.x, player.sprite.y + 8, wallDirection);
    player.scene.achievements?.increment("jumps");
    player.scene.achievements?.increment("wallJumps");
    player.scene.achievements?.unlock("wall_jump");
    if (player.wallJumpChain >= WALL_PARKOUR_CONFIG.chainAchievementCount) {
      player.scene.achievements?.unlock("parkour_chain");
    }
  }
}
