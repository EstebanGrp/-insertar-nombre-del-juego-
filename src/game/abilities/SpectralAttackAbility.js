import Phaser from "phaser";

export const ATTACK_CONFIG = Object.freeze({
  comboWindowMs: 540,
  normalCooldownMs: 245,
  finisherCooldownMs: 370,
  normalReach: 65,
  finisherReach: 82,
  normalDamage: 1,
  finisherDamage: 2,
});

export class SpectralAttackAbility {
  constructor(player) {
    this.player = player;
  }

  activate(time) {
    const player = this.player;
    const scene = player.scene;
    scene.achievements?.increment("attacks");
    scene.achievements?.unlock("first_strike");

    if (time > player.comboExpiresAt) player.comboStep = 0;
    player.comboStep = (player.comboStep % 3) + 1;
    player.comboExpiresAt = time + ATTACK_CONFIG.comboWindowMs;
    player.attackReadyAt = time + (player.comboStep === 3 ? ATTACK_CONFIG.finisherCooldownMs : ATTACK_CONFIG.normalCooldownMs);

    const reach = player.comboStep === 3 ? ATTACK_CONFIG.finisherReach : ATTACK_CONFIG.normalReach;
    const damage = player.comboStep === 3 ? ATTACK_CONFIG.finisherDamage : ATTACK_CONFIG.normalDamage;
    const x = player.sprite.x + player.facing * (reach * 0.55);
    const zone = scene.add.zone(x, player.sprite.y - 2, reach, 46);
    scene.physics.add.existing(zone);
    zone.body.setAllowGravity(false);
    zone.body.moves = false;

    player.attackAnimationUntil = time + (player.comboStep === 3 ? 330 : 245);
    player.sprite.setAngle(0);
    player.sprite.anims.play("ghost-attack", true);
    player.sprite.body.setVelocityX(player.facing * (78 + player.comboStep * 20));

    const slash = scene.add
      .sprite(player.sprite.x + player.facing * 40, player.sprite.y - 3, "spirit-slash")
      .setDepth(25)
      .setFlipX(player.facing < 0)
      .setAlpha(0.95)
      .play("spirit-slash");

    if (player.comboStep === 3) slash.setTint(0xd7ffff).setScale(1.22);
    scene.resolvePlayerAttack(zone, player.facing, damage);
    scene.spawnGhostBurst(x, player.sprite.y, 5 + player.comboStep);
    scene.shakeCamera(player.comboStep === 3 ? 95 : 45, player.comboStep === 3 ? 0.003 : 0.0012);

    scene.time.delayedCall(130, () => zone.destroy());
    slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());
  }
}
