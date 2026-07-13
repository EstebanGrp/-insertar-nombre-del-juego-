import Phaser from "phaser";
import { AbilityController } from "../abilities/AbilityController.js";
import { JUMP_CONFIG } from "../abilities/JumpAbility.js";

export class GhostPlayer {
  constructor(scene, x, y, savedPlayer = {}) {
    const safeY = x < 430 && y > 570 ? 520 : y;
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, safeY, "ghost-idle", 0);
    this.sprite
      .setCollideWorldBounds(true)
      .setSize(24, 46)
      .setOffset(12, 12)
      .setAlpha(0.92)
      .setDepth(20);

    this.sprite.setData("entity", this);
    this.maxHealth = savedPlayer.maxHealth || 5;
    this.health = Phaser.Math.Clamp(savedPlayer.health || this.maxHealth, 1, this.maxHealth);
    this.maxSpirit = 100;
    this.spirit = Phaser.Math.Clamp(savedPlayer.spirit ?? this.maxSpirit, 0, this.maxSpirit);
    this.checkpoint = {
      x: savedPlayer.checkpointX || x,
      y: x < 430 && (savedPlayer.checkpointY || safeY) > 570
        ? 520
        : (savedPlayer.checkpointY || safeY),
    };

    this.controlsLocked = false;
    this.invulnerableUntil = 0;
    this.lastGroundedAt = 0;
    this.jumpBufferedAt = -Infinity;
    this.attackReadyAt = 0;
    this.attackAnimationUntil = 0;
    this.comboStep = 0;
    this.comboExpiresAt = 0;
    this.dashReadyAt = 0;
    this.isDashing = false;
    this.canAirDash = true;
    this.facing = 1;
    this.dead = false;
    this.wasGrounded = false;
    this.lastTrailAt = 0;
    this.distanceTravelled = 0;
    this.lastX = x;

    this.jumpsUsed = 0;
    this.maxJumps = 2;
    this.isWallSliding = false;
    this.wallDirection = 0;
    this.wallJumpLockUntil = 0;
    this.wallJumpChain = 0;
    this.lastWallFxAt = 0;

    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      attack: Phaser.Input.Keyboard.KeyCodes.J,
      attackAlt: Phaser.Input.Keyboard.KeyCodes.F,
      attackExtra: Phaser.Input.Keyboard.KeyCodes.K,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
    });

    this.aura = scene.add
      .ellipse(x, safeY + 7, 42, 60, 0x71efff, 0.08)
      .setDepth(19)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: this.aura,
      alpha: { from: 0.035, to: 0.13 },
      scaleX: { from: 0.92, to: 1.08 },
      scaleY: { from: 0.96, to: 1.04 },
      duration: 980,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    this.abilities = new AbilityController(this);
  }

  update(time) {
    if (!this.sprite.active || this.dead || this.scene.isPaused) return;

    const body = this.sprite.body;
    const grounded = body.blocked.down || body.touching.down;
    const wallLeft = body.blocked.left || body.touching.left;
    const wallRight = body.blocked.right || body.touching.right;
    this.wallDirection = wallLeft ? -1 : wallRight ? 1 : 0;
    this.aura.setPosition(this.sprite.x, this.sprite.y + 6);

    const moved = Math.abs(this.sprite.x - this.lastX);
    this.distanceTravelled += moved;
    this.lastX = this.sprite.x;
    if (this.distanceTravelled > 65) this.scene.achievements?.unlock("first_steps");

    if (grounded) {
      this.lastGroundedAt = time;
      this.canAirDash = true;
      this.jumpsUsed = 0;
      this.wallJumpChain = 0;
      this.spirit = Math.min(this.maxSpirit, this.spirit + 0.34);

      if (!this.wasGrounded && body.velocity.y > 150) {
        this.scene.spawnLandingEffect(this.sprite.x, this.sprite.y + 25);
      }
    } else {
      this.spirit = Math.min(this.maxSpirit, this.spirit + 0.08);
    }
    this.wasGrounded = grounded;

    if (this.controlsLocked || this.isDashing) {
      body.setAccelerationX(0);
      this.isWallSliding = false;
      this.updateAnimation(0, grounded);
      this.scene.hud?.updateSpirit(this.spirit, this.maxSpirit, time >= this.dashReadyAt);
      this.scene.hud?.updateMobility(this.jumpsUsed, this.maxJumps, false);
      return;
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.upArrow);

    if (jumpPressed) this.jumpBufferedAt = time;

    const leftDown = this.keys.left.isDown || this.keys.leftArrow.isDown;
    const rightDown = this.keys.right.isDown || this.keys.rightArrow.isDown;
    const horizontal = (rightDown ? 1 : 0) - (leftDown ? 1 : 0);
    const pressingIntoWall =
      (this.wallDirection === -1 && leftDown) ||
      (this.wallDirection === 1 && rightDown);

    const targetVelocity = horizontal * 300;
    body.setAccelerationX(0);
    body.setDragX(0);
    body.setMaxVelocity(340, 940);

    if (time >= this.wallJumpLockUntil) {
      body.setVelocityX(
        Phaser.Math.Linear(body.velocity.x, targetVelocity, horizontal ? 0.3 : 0.36),
      );
      if (horizontal === 0 && Math.abs(body.velocity.x) < 5) body.setVelocityX(0);
    }

    if (horizontal !== 0 && time >= this.wallJumpLockUntil) {
      this.facing = horizontal;
      this.sprite.setFlipX(horizontal < 0);
      if (grounded && time - this.lastTrailAt > 95) {
        this.lastTrailAt = time;
        this.scene.spawnMovementTrail(this.sprite.x - horizontal * 12, this.sprite.y + 22);
      }
    }

    const canUseJumpBuffer = time - this.jumpBufferedAt <= JUMP_CONFIG.bufferMs;
    const canUseCoyoteTime = time - this.lastGroundedAt <= JUMP_CONFIG.coyoteMs;

    if (canUseJumpBuffer && !grounded && this.wallDirection !== 0) {
      this.abilities.wallParkour.performJump(time, this.wallDirection);
    } else if (canUseJumpBuffer && canUseCoyoteTime && this.jumpsUsed === 0) {
      this.abilities.jump.perform();
    } else if (
      canUseJumpBuffer &&
      !grounded &&
      this.jumpsUsed < this.maxJumps &&
      time - this.lastGroundedAt > 90
    ) {
      this.abilities.doubleJump.perform();
    }

    const jumpHeld = this.keys.jump.isDown || this.keys.up.isDown || this.keys.upArrow.isDown;
    if (!jumpHeld && body.velocity.y < -170) body.setVelocityY(body.velocity.y * JUMP_CONFIG.shortHopMultiplier);

    const wallSliding = this.abilities.wallParkour.update({
      time,
      grounded,
      pressingIntoWall,
    });
    const gliding = !wallSliding && this.abilities.glide.update({ grounded, jumpHeld });

    if (gliding) {
      if (time - this.lastTrailAt > 85) {
        this.lastTrailAt = time;
        this.scene.spawnMovementTrail(this.sprite.x, this.sprite.y + 15, 0x9af9ff);
      }
    } else if (!wallSliding) {
      body.setGravityY(0);
      this.sprite.setAlpha(0.92);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.dash) &&
      this.abilities.dash.canUse(time, grounded)
    ) {
      this.abilities.dash.activate(time, horizontal || this.facing);
    }

    if (
      (Phaser.Input.Keyboard.JustDown(this.keys.attack) ||
        Phaser.Input.Keyboard.JustDown(this.keys.attackAlt) ||
        Phaser.Input.Keyboard.JustDown(this.keys.attackExtra)) &&
      time >= this.attackReadyAt
    ) {
      this.abilities.attack.activate(time);
    }

    this.updateAnimation(horizontal, grounded);
    this.scene.hud?.updateSpirit(this.spirit, this.maxSpirit, time >= this.dashReadyAt);
    this.scene.hud?.updateMobility(this.jumpsUsed, this.maxJumps, this.isWallSliding);
  }

  updateAnimation(horizontal, grounded) {
    if (!this.sprite?.active || !this.sprite.anims) return;

    const now = this.scene?.time?.now ?? 0;

    if (this.isDashing) {
      this.sprite.setAngle(0);
      this.sprite.anims.play("ghost-dash", true);
      return;
    }

    // Preserve the attack animation long enough to be visible.
    if (now < this.attackAnimationUntil) {
      this.sprite.setAngle(0);
      if (this.sprite.anims.currentAnim?.key !== "ghost-attack") {
        this.sprite.anims.play("ghost-attack", true);
      }
      return;
    }

    if (this.isWallSliding) {
      this.sprite.anims.play("ghost-idle", true);
      this.sprite.setAngle(this.wallDirection * -8);
      return;
    }

    this.sprite.setAngle(0);

    if (!grounded) {
      this.sprite.anims.play("ghost-idle", true);
      return;
    }

    this.sprite.anims.play(horizontal !== 0 ? "ghost-run" : "ghost-idle", true);
  }

  attack(time) {
    this.abilities.attack.activate(time);
  }

  addSpirit(amount) {
    this.spirit = Phaser.Math.Clamp(this.spirit + amount, 0, this.maxSpirit);
  }

  setCheckpoint(x, y) {
    this.checkpoint.x = x;
    this.checkpoint.y = y;
    this.health = this.maxHealth;
    this.spirit = this.maxSpirit;
    this.scene.hud?.updateHealth(this.health, this.maxHealth);
    this.scene.hud?.updateSpirit(this.spirit, this.maxSpirit, true);
  }

  takeDamage(amount, sourceX) {
    const now = this.scene.time.now;
    if (this.dead || this.isDashing || now < this.invulnerableUntil || this.health <= 0) return;

    this.invulnerableUntil = now + 900;
    this.health = Math.max(0, this.health - amount);
    const direction = this.sprite.x < sourceX ? -1 : 1;
    this.sprite.body.setVelocity(direction * 300, -285);
    this.scene.shakeCamera(110, 0.006);
    this.scene.spawnGhostBurst(this.sprite.x, this.sprite.y, 12, 0xff7c9d);
    this.scene.hud?.updateHealth(this.health, this.maxHealth);

    this.sprite.setTint(0xff7890);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.25, to: 0.92 },
      duration: 90,
      yoyo: true,
      repeat: 4,
      onComplete: () => this.sprite.clearTint(),
    });

    if (this.health <= 0) this.scene.playerDied();
  }

  serialize() {
    return {
      form: "HUMAN_GHOST",
      x: Math.round(this.sprite.x),
      y: Math.round(this.sprite.y),
      health: this.health,
      maxHealth: this.maxHealth,
      spirit: Math.round(this.spirit),
      checkpointX: Math.round(this.checkpoint.x),
      checkpointY: Math.round(this.checkpoint.y),
    };
  }
}
