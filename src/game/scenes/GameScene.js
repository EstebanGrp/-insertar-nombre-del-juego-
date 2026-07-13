import Phaser from "phaser";
import { GhostPlayer } from "../entities/GhostPlayer.js";
import { RobotCompanion } from "../entities/RobotCompanion.js";
import { DroneEnemy } from "../entities/DroneEnemy.js";
import { WraithEnemy } from "../entities/WraithEnemy.js";
import { WardenBoss } from "../entities/WardenBoss.js";
import { Hud } from "../ui/Hud.js";
import { AchievementManager } from "../systems/AchievementManager.js";
import { PerformanceManager } from "../systems/PerformanceManager.js";
import { SecretRoomSystem } from "../systems/SecretRoomSystem.js";
import { LearningDocumentSystem } from "../../learning/LearningDocumentSystem.js";
import { i18n } from "../../i18n/I18n.js";
import { TOTAL_LEVELS, getLevelDefinition } from "../campaign/LevelCatalog.js";
import { buildLevelLayout } from "../campaign/LevelBuilder.js";

const THEME_ASSETS = Object.freeze({
  lab: {
    background: "story-bg-lab",
    tile: "detail-lab-tile",
    wall: "detail-lab-wall",
    tint: 0x9eefff,
  },
  forest: {
    background: "story-bg-forest",
    tile: "detail-forest-tile",
    wall: "detail-forest-wall",
    tint: 0xa5ffcf,
  },
  cave: {
    background: "story-bg-cave",
    tile: "detail-cave-tile",
    wall: "detail-cave-wall",
    tint: 0xc6a2ff,
  },
  future: {
    background: "story-bg-future",
    tile: "detail-future-tile",
    wall: "detail-future-wall",
    tint: 0x8bc4ff,
  },
});

const PART_LABEL_KEYS = Object.freeze({
  servo: "part.servo",
  optic: "part.optic",
  memory: "part.memory",
  power_core: "part.powerCore",
  map_alpha: "part.mapAlpha",
  map_beta: "part.mapBeta",
  map_gamma: "part.mapGamma",
  map_delta: "part.mapDelta",
});

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.on("loaderror", (file) => {
      console.error("ASSET LOAD ERROR:", file?.key, file?.src);
      window.__showGameError?.(i18n.t("error.assetLoad", { asset: file?.key || i18n.t("status.unknown") }));
    });

    this.load.image("lab-bg-far", "assets/game/lab-background-far.png");
    this.load.image("lab-bg-mid", "assets/game/lab-background-mid.png");
    this.load.image("lab-fog", "assets/game/lab-fog.png");
    this.load.image("story-bg-lab", "assets/game/story-bg-lab.png");
    this.load.image("story-bg-forest", "assets/game/story-bg-forest.png");
    this.load.image("story-bg-cave", "assets/game/story-bg-cave.png");
    this.load.image("story-bg-future", "assets/game/story-bg-future.png");
    this.load.image("detail-lab-tile", "assets/game/detail-lab-tile.png");
    this.load.image("detail-lab-wall", "assets/game/detail-lab-wall.png");
    this.load.image("detail-forest-tile", "assets/game/detail-forest-tile.png");
    this.load.image("detail-forest-wall", "assets/game/detail-forest-wall.png");
    this.load.image("detail-cave-tile", "assets/game/detail-cave-tile.png");
    this.load.image("detail-cave-wall", "assets/game/detail-cave-wall.png");
    this.load.image("detail-future-tile", "assets/game/detail-future-tile.png");
    this.load.image("detail-future-wall", "assets/game/detail-future-wall.png");
    this.load.image("parkour-wall", "assets/game/parkour-wall.png");
    this.load.image("spike", "assets/game/spike.png");
    this.load.image("checkpoint", "assets/game/checkpoint.png");
    this.load.image("human-capsule", "assets/game/human-capsule.png");
    this.load.image("robot-damaged", "assets/game/robot-damaged.png");
    this.load.image("projectile", "assets/game/projectile.png");
    this.load.image("shockwave", "assets/game/shockwave.png");
    this.load.image("holo-core", "assets/game/holo-core.png");
    this.load.image("holo-portal", "assets/game/holo-portal.png");
    this.load.image("holo-alert", "assets/game/holo-alert.png");

    this.load.spritesheet("ghost-idle", "assets/game/ghost-idle.png", {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet("ghost-run", "assets/game/ghost-run.png", {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet("ghost-attack", "assets/game/ghost-attack.png", {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet("ghost-dash", "assets/game/ghost-dash.png", {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet("spirit-slash", "assets/game/spirit-slash.png", {
      frameWidth: 80,
      frameHeight: 64,
    });
    this.load.spritesheet("robot-active", "assets/game/robot-active.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("enemy-drone", "assets/game/enemy-drone.png", {
      frameWidth: 52,
      frameHeight: 38,
    });
    this.load.spritesheet("enemy-wraith", "assets/game/enemy-wraith.png", {
      frameWidth: 48,
      frameHeight: 54,
    });
    this.load.spritesheet("boss-warden", "assets/game/boss-warden.png", {
      frameWidth: 112,
      frameHeight: 96,
    });
  }

  create(data) {
    this.slot = data.slot;
    this.saveManager = this.game.registry.get("saveManager");
    this.returnToMenu = this.game.registry.get("returnToMenu");
    this.saveData = this.saveManager.normalizeWorld(data.save, this.slot);
    this.settings = this.saveManager.getSettings();
    this.performance = new PerformanceManager(this.settings);
    this.levelNumber = this.saveData.progress.currentLevel || 1;
    this.definition = getLevelDefinition(this.levelNumber);
    this.layout = buildLevelLayout(this.definition);
    this.theme = THEME_ASSETS[this.definition.theme] || THEME_ASSETS.lab;
    this.isPaused = false;
    this.cutsceneActive = false;
    this.roomEntered = false;
    this.levelTransitioning = false;
    this.boss = null;
    this.bossStarted = false;
    this.levelBossDefeated = this.saveData.progress.levelBosses.includes(this.levelNumber);

    this.createAnimations();
    this.createGeneratedTextures();
    this.createWorldVisuals();
    this.createLevelGeometry();
    this.createDecorations();

    this.hud = new Hud(this);
    this.achievements = new AchievementManager(this, this.saveData);
    this.player = new GhostPlayer(
      this,
      this.layout.spawn.x,
      this.layout.spawn.y,
      this.saveData.player,
    );
    this.player.setCheckpoint(this.layout.spawn.x, this.layout.spawn.y);

    this.physics.add.collider(this.player.sprite, this.platforms);
    this.physics.add.overlap(
      this.player.sprite,
      this.hazards,
      (_player, hazard) => this.player.takeDamage(1, hazard.x),
    );

    this.secretRoom = new SecretRoomSystem(this, this.definition, this.layout, this.saveData);
    this.createLearningDocument();
    this.createRobotAndCampaignPart();
    this.createPortal();
    this.createEnemies();
    this.createProjectileSystems();

    this.cameras.main.setBounds(0, 0, this.layout.width, this.layout.height);
    this.cameras.main.setBackgroundColor("#020a0f");
    this.cameras.main.startFollow(this.player.sprite, true, 0.095, 0.095);
    this.cameras.main.setZoom(1.08);

    this.keys = this.input.keyboard.addKeys({
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      menu: Phaser.Input.Keyboard.KeyCodes.M,
      skip: Phaser.Input.Keyboard.KeyCodes.SPACE,
      skipAlt: Phaser.Input.Keyboard.KeyCodes.ENTER,
      debug: Phaser.Input.Keyboard.KeyCodes.F3,
    });

    this.input.on("pointerdown", (pointer) => {
      if (pointer.leftButtonDown() && !this.isPaused && !this.cutsceneActive && !this.learningDocs?.isOpen) {
        if (this.time.now >= this.player.attackReadyAt) this.player.attack(this.time.now);
      }
    });

    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.focus();
    this.pauseContainer = null;
    this.debugOverlay = null;

    this.refreshCampaignHud();
    this.updateObjective();
    this.hud.updateHealth(this.player.health, this.player.maxHealth);
    this.hud.updateSpirit(this.player.spirit, this.player.maxSpirit, true);

    if (this.levelNumber === 1 && !this.saveData.progress.introSeen) {
      this.playIntroCutscene();
    } else {
      this.cameras.main.fadeIn(350, 2, 9, 13);
      this.showLevelTitle();
    }

    this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        if (!this.isPaused && !this.cutsceneActive && !this.learningDocs?.isOpen) this.save();
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  createAnimations() {
    const ensure = (key, config) => {
      if (!this.anims.exists(key)) this.anims.create({ key, ...config });
    };

    ensure("ghost-idle", {
      frames: this.anims.generateFrameNumbers("ghost-idle", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
    ensure("ghost-run", {
      frames: this.anims.generateFrameNumbers("ghost-run", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1,
    });
    ensure("ghost-attack", {
      frames: this.anims.generateFrameNumbers("ghost-attack", { start: 0, end: 4 }),
      frameRate: 18,
      repeat: 0,
    });
    ensure("ghost-dash", {
      frames: this.anims.generateFrameNumbers("ghost-dash", { start: 0, end: 3 }),
      frameRate: 18,
      repeat: -1,
    });
    ensure("spirit-slash", {
      frames: this.anims.generateFrameNumbers("spirit-slash", { start: 0, end: 3 }),
      frameRate: 22,
      repeat: 0,
    });
    ensure("robot-active", {
      frames: this.anims.generateFrameNumbers("robot-active", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
    ensure("drone-fly", {
      frames: this.anims.generateFrameNumbers("enemy-drone", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });
    ensure("wraith-float", {
      frames: this.anims.generateFrameNumbers("enemy-wraith", { start: 0, end: 3 }),
      frameRate: 7,
      repeat: -1,
    });
    ensure("warden-idle", {
      frames: this.anims.generateFrameNumbers("boss-warden", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  createGeneratedTextures() {
    const makeTexture = (key, width, height, draw) => {
      if (this.textures.exists(key)) return;
      const graphics = this.add.graphics();
      draw(graphics, width, height);
      graphics.generateTexture(key, width, height);
      graphics.destroy();
    };

    makeTexture("secret-signal", 48, 64, (graphics) => {
      graphics.fillStyle(0x06151b, 0.96);
      graphics.fillRoundedRect(6, 8, 36, 48, 8);
      graphics.lineStyle(2, 0x9cf9ff, 0.94);
      graphics.strokeRoundedRect(6, 8, 36, 48, 8);
      graphics.lineStyle(2, 0x6cecff, 0.72);
      graphics.strokeCircle(24, 30, 12);
      graphics.strokeCircle(24, 30, 6);
      graphics.fillStyle(0xd9ffff, 0.95);
      graphics.fillCircle(24, 30, 3);
      graphics.lineBetween(24, 42, 24, 50);
    });

    makeTexture("learning-terminal", 58, 72, (graphics) => {
      graphics.fillStyle(0x06151b, 0.98);
      graphics.fillRoundedRect(4, 4, 50, 64, 8);
      graphics.lineStyle(2, 0x8df7ff, 0.92);
      graphics.strokeRoundedRect(5, 5, 48, 62, 7);
      graphics.fillStyle(0x0a3540, 0.94);
      graphics.fillRoundedRect(11, 11, 36, 38, 4);
      graphics.lineStyle(2, 0xbaffff, 0.82);
      graphics.lineBetween(16, 20, 39, 20);
      graphics.lineBetween(16, 28, 42, 28);
      graphics.lineBetween(16, 36, 35, 36);
      graphics.fillStyle(0xf2cf72, 0.9);
      graphics.fillCircle(29, 58, 4);
    });

    makeTexture("campaign-part", 52, 52, (graphics) => {
      graphics.fillStyle(0x07141a, 0.94);
      graphics.fillRoundedRect(3, 3, 46, 46, 10);
      graphics.lineStyle(3, 0xffcf73, 0.96);
      graphics.strokeRoundedRect(4, 4, 44, 44, 9);
      graphics.fillStyle(0xffcf73, 0.18);
      graphics.fillCircle(26, 26, 15);
      graphics.lineStyle(3, 0xeaffff, 0.88);
      graphics.strokeCircle(26, 26, 9);
      graphics.lineBetween(26, 10, 26, 17);
      graphics.lineBetween(26, 35, 26, 42);
      graphics.lineBetween(10, 26, 17, 26);
      graphics.lineBetween(35, 26, 42, 26);
    });

    if (!this.textures.exists("spirit-particle")) {
      makeTexture("spirit-particle", 6, 6, (graphics) => {
        graphics.fillStyle(0xa9fbff, 1);
        graphics.fillCircle(3, 3, 3);
      });
    }
  }

  createWorldVisuals() {
    this.physics.world.setBounds(0, 0, this.layout.width, this.layout.height);

    this.backgroundPanels = [630, 1900, 3170].map((x, index) =>
      this.add
        .image(x, this.layout.height / 2, this.theme.background)
        .setDisplaySize(1380, this.layout.height)
        .setDepth(-34)
        .setTint(this.theme.tint)
        .setFlipX(index === 1)
        .setAlpha(0.76 * this.performance.profile.backgroundOverlayAlpha),
    );

    this.bgFar = this.add
      .tileSprite(0, 0, this.layout.width, this.layout.height, "lab-bg-far")
      .setOrigin(0)
      .setScrollFactor(0.08)
      .setAlpha(0.1)
      .setDepth(-31);
    this.bgMid = this.add
      .tileSprite(0, 0, this.layout.width, this.layout.height, "lab-bg-mid")
      .setOrigin(0)
      .setScrollFactor(0.2)
      .setAlpha(0.12)
      .setDepth(-29);
    this.bgFog = this.add
      .tileSprite(0, 0, this.layout.width, this.layout.height, "lab-fog")
      .setOrigin(0)
      .setScrollFactor(0.38)
      .setAlpha(this.performance.profile.fogAlpha)
      .setDepth(-18);

    this.add
      .rectangle(this.layout.width / 2, this.layout.height / 2, this.layout.width, this.layout.height, 0x02060a, 0.14)
      .setDepth(-33);

    this.ambientParticles = this.add.particles(0, 0, "spirit-particle", {
      x: { min: 0, max: this.layout.width },
      y: { min: 120, max: 820 },
      lifespan: { min: 4800, max: 8200 },
      speedY: { min: -14, max: -3 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.42, end: 0 },
      alpha: { start: 0.16, end: 0 },
      frequency: this.performance.profile.ambientFrequency,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(-12);
  }

  createLevelGeometry() {
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    for (const platform of this.layout.platforms) {
      this.addStaticSurface(platform, this.theme.tile, 3);
    }
    for (const wall of this.layout.walls) {
      this.addStaticSurface(wall, this.theme.wall, 4);
    }

    this.layout.hazards.forEach((hazard) => {
      const spike = this.hazards.create(hazard.x, hazard.y, "spike").setDepth(8);
      spike.refreshBody();
    });

    this.addStaticSurface({ x: 0, y: 0, width: 30, height: this.layout.height }, this.theme.wall, 4);
    this.addStaticSurface({ x: this.layout.width - 30, y: 0, width: 30, height: this.layout.height }, this.theme.wall, 4);
  }

  addStaticSurface(rect, texture, depth = 3) {
    const visual = this.add
      .tileSprite(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, texture)
      .setDepth(depth);
    const body = this.add.rectangle(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
      0xffffff,
      0,
    );
    this.physics.add.existing(body, true);
    this.platforms.add(body);
    return { visual, body };
  }

  createDecorations() {
    const levelText = `${i18n.t("hud.levelValue", { level: String(this.levelNumber).padStart(3, "0") })} · ${i18n.t(this.definition.chapter.nameKey)}`;
    this.add
      .text(170, 170, levelText, {
        fontFamily: "Consolas",
        fontSize: "18px",
        color: "#7cb9c1",
        letterSpacing: 3,
      })
      .setAlpha(0.55)
      .setDepth(1);

    this.add
      .text(3150, 420, i18n.t("secret.wallClue"), {
        fontFamily: "Consolas",
        fontSize: "14px",
        color: "#83eaf2",
        letterSpacing: 2,
      })
      .setAlpha(0.3)
      .setDepth(10);

    for (let x = 420; x < 2960; x += 430) {
      const color = this.definition.accent;
      const light = this.add.rectangle(x, 245, 150, 7, color, 0.13).setDepth(-2);
      if (this.performance.profile.backgroundTweens && this.settings.motion !== false) {
        this.tweens.add({
          targets: light,
          alpha: { from: 0.04, to: 0.2 },
          duration: Phaser.Math.Between(1300, 2400),
          yoyo: true,
          repeat: -1,
        });
      }
    }

    if (this.levelNumber === 1) {
      this.add.image(250, 660, "human-capsule").setDepth(5).setAlpha(0.78);
    }
  }

  createLearningDocument() {
    const lesson = this.definition.lesson;
    const definition = {
      id: `lesson_${this.levelNumber}`,
      x: this.layout.document.x,
      y: this.layout.document.y,
      titleKey: lesson.titleKey,
      bodyKey: lesson.bodyKey,
      hintKey: lesson.hintKey,
      language: lesson.language,
      code: lesson.code,
    };

    this.learningDocs = new LearningDocumentSystem(
      this,
      this.saveData,
      [definition],
      () => {
        this.achievements.unlock("first_doc");
        if (this.saveData.progress.docsRead.length >= TOTAL_LEVELS) this.achievements.unlock("all_docs");
        this.refreshCampaignHud();
        this.updatePortalState();
        this.save();
      },
      TOTAL_LEVELS,
    );
  }

  createRobotAndCampaignPart() {
    this.robot = null;
    if (this.levelNumber === 1) {
      this.robot = new RobotCompanion(this, this.layout.robot.x, this.layout.robot.y, {
        discovered: this.saveData.robot.discovered,
        active: false,
        memory: this.saveData.robot.memory,
      });
    } else if (this.saveData.robot.active) {
      this.robot = new RobotCompanion(this, 110, 610, this.saveData.robot);
    }

    this.partSprite = null;
    if (this.definition.partId && !this.saveData.progress.campaignParts.includes(this.definition.partId)) {
      this.partSprite = this.physics.add
        .sprite(this.layout.part.x, this.layout.part.y, "campaign-part")
        .setDepth(20)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setData("partId", this.definition.partId);
      this.partSprite.body.setAllowGravity(false);
      this.tweens.add({
        targets: this.partSprite,
        y: this.layout.part.y - 12,
        angle: 360,
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Sine.InOut,
      });
      this.physics.add.overlap(this.player.sprite, this.partSprite, () => this.collectCampaignPart());
    }
  }

  collectCampaignPart() {
    if (!this.partSprite?.active || !this.definition.partId) return;
    const partId = this.definition.partId;
    if (!this.saveData.progress.campaignParts.includes(partId)) {
      this.saveData.progress.campaignParts.push(partId);
    }
    const label = i18n.t(PART_LABEL_KEYS[partId] || "part.unknown");
    this.spawnGhostBurst(this.partSprite.x, this.partSprite.y, 24, 0xffd37e);
    this.hud.setObjective(i18n.t("objective.partRecovered", { part: label }), i18n.t("label.repair"));
    this.partSprite.destroy();
    this.partSprite = null;

    if (["servo", "optic", "memory", "power_core"].every((part) => this.saveData.progress.campaignParts.includes(part))) {
      this.saveData.robot.active = true;
      this.saveData.robot.coreInstalled = true;
      this.saveData.robot.discovered = true;
      this.saveData.robot.memory = Math.max(12, this.saveData.robot.memory);
      if (this.robot && !this.robot.active) this.robot.activate();
    }

    if (["map_alpha", "map_beta", "map_gamma", "map_delta"].every((part) => this.saveData.progress.campaignParts.includes(part))) {
      this.saveData.robot.memory = Math.max(20, this.saveData.robot.memory);
    }

    this.refreshCampaignHud();
    this.updatePortalState();
    this.save();
  }

  createPortal() {
    this.portal = this.add
      .image(this.layout.portal.x, this.layout.portal.y, "holo-portal")
      .setDepth(17)
      .setScale(1.85)
      .setAlpha(0.18)
      .setTint(0x667c82)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.portalRing = this.add.graphics().setDepth(16);
    this.portalRing.lineStyle(3, this.definition.accent, 0.5);
    this.portalRing.strokeEllipse(this.layout.portal.x, this.layout.portal.y, 120, 190);
    this.portalRing.setAlpha(0.25);

    if (this.performance.profile.backgroundTweens && this.settings.motion !== false) {
      this.tweens.add({
        targets: [this.portal, this.portalRing],
        alpha: { from: 0.15, to: 0.55 },
        duration: 1100,
        yoyo: true,
        repeat: -1,
      });
    }
    this.updatePortalState();
  }

  createEnemies() {
    this.enemies = [];
    this.enemyGroup = this.physics.add.group();

    for (const spawn of this.layout.enemySpawns) {
      let enemy;
      if (spawn.type === "wraith") {
        enemy = new WraithEnemy(this, spawn.x, spawn.y, spawn.x);
      } else {
        enemy = new DroneEnemy(this, spawn.x, spawn.y, spawn.minX, spawn.maxX);
        this.physics.add.collider(enemy.sprite, this.platforms);
      }
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy.sprite);
    }

    this.physics.add.overlap(
      this.player.sprite,
      this.enemyGroup,
      (_player, sprite) => this.player.takeDamage(1, sprite.x),
    );
  }

  createProjectileSystems() {
    this.enemyProjectiles = this.physics.add.group();
    this.shockwaves = this.physics.add.group();
    this.physics.add.overlap(
      this.player.sprite,
      this.enemyProjectiles,
      (_player, projectile) => {
        this.player.takeDamage(projectile.getData("damage") || 1, projectile.x);
        projectile.destroy();
      },
    );
    this.physics.add.overlap(
      this.player.sprite,
      this.shockwaves,
      (_player, wave) => {
        this.player.takeDamage(1, wave.x);
        wave.destroy();
      },
    );
  }

  playIntroCutscene() {
    this.cutsceneActive = true;
    this.player.controlsLocked = true;
    this.player.sprite.setAlpha(0);
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(250, 640);
    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.hud.setPrompt(i18n.t("prompt.skipIntro"));
    this.spawnGhostBurst(250, 620, 32);

    const finish = () => {
      if (!this.cutsceneActive) return;
      this.cutsceneActive = false;
      this.player.controlsLocked = false;
      this.player.sprite.setAlpha(0.92);
      this.cameras.main.startFollow(this.player.sprite, true, 0.095, 0.095);
      this.hud.setPrompt("");
      this.saveData.progress.introSeen = true;
      this.achievements.unlock("awakening");
      this.showLevelTitle();
      this.updateObjective();
      this.save();
    };

    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0.92,
      y: 620,
      duration: 900,
      ease: Phaser.Math.Easing.Sine.Out,
    });
    this.time.delayedCall(1900, finish);
    this.input.keyboard.once("keydown-SPACE", finish);
    this.input.keyboard.once("keydown-ENTER", finish);
  }

  showLevelTitle() {
    this.hud.showArea(
      i18n.t(this.definition.chapter.nameKey),
      2600,
      this.levelNumber,
      i18n.t("campaign.chapterNumber", { chapter: this.definition.chapterNumber }),
    );
  }

  update(time, delta) {
    if (!this.player) return;
    this.performance.update(delta);
    this.bgFar.tilePositionX = this.cameras.main.scrollX * 0.12;
    this.bgMid.tilePositionX = this.cameras.main.scrollX * 0.2;
    this.bgFog.tilePositionX = this.cameras.main.scrollX * 0.34 + time * 0.005;

    if (Phaser.Input.Keyboard.JustDown(this.keys.pause) && !this.cutsceneActive && !this.learningDocs?.isOpen) {
      this.togglePause();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.debug)) this.toggleDebug();

    if (this.isPaused) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.menu)) this.exitToMenu();
      return;
    }
    if (this.learningDocs?.isOpen || this.levelTransitioning) return;

    this.player.update(time);
    this.robot?.update(this.player);

    this.enemies.forEach((enemy, index) => {
      if (this.performance.shouldUpdateEnemy(enemy.sprite.x, this.player.sprite.x, index)) {
        enemy.update(time, this.player);
      }
    });
    this.boss?.update(time, this.player);

    this.updateInteractions();
    this.checkSecretRoomEntry();
    this.maybeStartBoss();

    if (this.player.sprite.y > 930) this.playerDied();
    this.updateDebug();
  }

  updateInteractions() {
    const playerSprite = this.player.sprite;
    const signal = this.secretRoom.nearest(playerSprite);
    if (signal) {
      this.hud.setPrompt(i18n.t("prompt.activateSignal"));
      if (Phaser.Input.Keyboard.JustDown(this.player.keys.interact)) {
        this.secretRoom.activate(signal);
        this.save();
      }
      return;
    }

    const documentEntry = this.learningDocs.nearest(playerSprite, 115);
    if (documentEntry) {
      this.hud.setPrompt(i18n.t("prompt.readDoc"));
      if (Phaser.Input.Keyboard.JustDown(this.player.keys.interact)) this.learningDocs.open(documentEntry);
      return;
    }

    if (this.levelNumber === 1 && this.robot) {
      const robotDistance = Phaser.Math.Distance.Between(
        playerSprite.x,
        playerSprite.y,
        this.robot.sprite.x,
        this.robot.sprite.y,
      );
      if (robotDistance < 115) {
        this.hud.setPrompt(i18n.t("prompt.inspectRobot"));
        if (Phaser.Input.Keyboard.JustDown(this.player.keys.interact)) this.inspectRobot();
        return;
      }
    }

    const portalDistance = Phaser.Math.Distance.Between(
      playerSprite.x,
      playerSprite.y,
      this.layout.portal.x,
      this.layout.portal.y,
    );
    if (portalDistance < 125) {
      if (this.isPortalReady()) {
        this.hud.setPrompt(i18n.t("prompt.enterPortal"));
        if (Phaser.Input.Keyboard.JustDown(this.player.keys.interact)) this.completeLevel();
      } else {
        this.hud.setPrompt(this.portalLockMessage());
      }
      return;
    }

    this.hud.setPrompt("");
  }

  inspectRobot() {
    if (!this.robot) return;
    this.robot.discovered = true;
    this.saveData.robot.discovered = true;
    this.robot.gesture("core", 1500);
    this.achievements.unlock("robot_found");
    this.spawnGhostBurst(this.robot.sprite.x, this.robot.sprite.y, 12);
    this.updatePortalState();
    this.updateObjective();
    this.save();
  }

  checkSecretRoomEntry() {
    if (this.roomEntered || !this.secretRoom.opened || this.player.sprite.x < 3060) return;
    this.roomEntered = true;
    this.hud.showSecretRoom();
    if (this.levelNumber === 1) this.achievements.unlock("hidden_lab");
    this.saveData.progress.stats.secretsFound = this.saveData.progress.secretRooms.length;
    this.updateObjective();
    this.save();
  }

  maybeStartBoss() {
    if (!this.definition.isBoss || !this.secretRoom.opened || this.levelBossDefeated || this.bossStarted) return;
    if (this.player.sprite.x < 3140) return;

    this.bossStarted = true;
    this.boss = new WardenBoss(this, this.layout.boss.x, this.layout.boss.y);
    this.physics.add.collider(this.boss.sprite, this.platforms);
    this.physics.add.overlap(
      this.player.sprite,
      this.boss.sprite,
      (_player, boss) => this.player.takeDamage(1, boss.x),
    );
    this.hud.showBoss();
    this.hud.updateBoss(this.boss.health, this.boss.maxHealth, 1);
    this.hud.setObjective(i18n.t("objective.defeatWarden"), i18n.t("label.threat"));
    this.shakeCamera(300, 0.005);
  }

  onBossDefeated() {
    this.levelBossDefeated = true;
    if (!this.saveData.progress.levelBosses.includes(this.levelNumber)) {
      this.saveData.progress.levelBosses.push(this.levelNumber);
    }
    this.achievements.unlock("warden_defeated");
    this.updatePortalState();
    this.updateObjective();
    this.save();
  }

  onSecretSignalActivated(current, total) {
    this.hud.setObjective(
      i18n.t("objective.signalRecovered", { current, total }),
      i18n.t("label.signal"),
    );
    this.refreshCampaignHud();
  }

  onSecretRoomOpened() {
    this.hud.setObjective(i18n.t("objective.enterSecretRoom"), i18n.t("label.memory"));
    this.refreshCampaignHud();
    this.save();
  }

  isPortalReady() {
    if (!this.secretRoom.opened) return false;
    const docRead = this.learningDocs.hasRead(`lesson_${this.levelNumber}`);
    if (!docRead) return false;
    if (this.levelNumber === 1 && !this.saveData.robot.discovered) return false;
    if (this.definition.partId && !this.saveData.progress.campaignParts.includes(this.definition.partId)) return false;
    if (this.definition.isBoss && !this.levelBossDefeated) return false;
    return true;
  }

  portalLockMessage() {
    if (!this.secretRoom.opened) return i18n.t("prompt.findSignals");
    if (!this.learningDocs.hasRead(`lesson_${this.levelNumber}`)) return i18n.t("prompt.readArchiveFirst");
    if (this.levelNumber === 1 && !this.saveData.robot.discovered) return i18n.t("prompt.inspectRobotFirst");
    if (this.definition.partId && !this.saveData.progress.campaignParts.includes(this.definition.partId)) {
      return i18n.t("prompt.collectPartFirst");
    }
    if (this.definition.isBoss && !this.levelBossDefeated) return i18n.t("prompt.defeatBossFirst");
    return i18n.t("prompt.portalLocked");
  }

  updatePortalState() {
    if (!this.portal) return;
    const ready = this.isPortalReady();
    this.portal.setAlpha(ready ? 0.95 : 0.18);
    this.portal.setTint(ready ? 0xbaffff : 0x667c82);
    this.portalRing?.setAlpha(ready ? 0.8 : 0.25);
  }

  updateObjective() {
    if (!this.secretRoom.allActive()) {
      this.hud.setObjective(
        i18n.t("objective.findSignals", {
          current: this.secretRoom.count(),
          total: this.secretRoom.total(),
        }),
        i18n.t("label.signal"),
      );
      return;
    }

    if (!this.roomEntered) {
      this.hud.setObjective(i18n.t("objective.enterSecretRoom"), i18n.t("label.memory"));
      return;
    }

    if (!this.learningDocs.hasRead(`lesson_${this.levelNumber}`)) {
      this.hud.setObjective(i18n.t("objective.readArchive"), i18n.t("label.document"));
      return;
    }

    if (this.levelNumber === 1 && !this.saveData.robot.discovered) {
      this.hud.setObjective(i18n.t("objective.inspectRobot"), i18n.t("label.repair"));
      return;
    }

    if (this.definition.partId && !this.saveData.progress.campaignParts.includes(this.definition.partId)) {
      this.hud.setObjective(i18n.t("objective.collectCampaignPart"), i18n.t("label.repair"));
      return;
    }

    if (this.definition.isBoss && !this.levelBossDefeated) {
      this.hud.setObjective(i18n.t("objective.defeatWarden"), i18n.t("label.threat"));
      return;
    }

    this.hud.setObjective(i18n.t("objective.enterNextLevel"), i18n.t("label.memory"));
  }

  completeLevel() {
    if (!this.isPortalReady() || this.levelTransitioning) return;
    this.levelTransitioning = true;
    this.player.controlsLocked = true;
    this.spawnGhostBurst(this.layout.portal.x, this.layout.portal.y, 35, this.definition.accent);

    if (!this.saveData.progress.completedLevels.includes(this.levelNumber)) {
      this.saveData.progress.completedLevels.push(this.levelNumber);
    }
    this.saveData.progress.stats.levelsCompleted = this.saveData.progress.completedLevels.length;
    this.saveData.robot.memory = Math.min(100, Math.max(this.saveData.robot.memory, 2 + this.saveData.progress.completedLevels.length));

    if (this.levelNumber >= TOTAL_LEVELS) {
      this.saveData.progress.campaignComplete = true;
      this.achievements.unlock("zone_complete");
      this.save();
      this.showCampaignComplete();
      return;
    }

    const nextLevel = this.levelNumber + 1;
    this.saveData.progress.currentLevel = nextLevel;
    this.saveData.progress.highestUnlockedLevel = Math.max(this.saveData.progress.highestUnlockedLevel, nextLevel);
    this.saveData.player = {
      ...this.player.serialize(),
      x: 180,
      y: 650,
      checkpointX: 180,
      checkpointY: 650,
      health: this.player.maxHealth,
      spirit: 100,
    };
    this.save(nextLevel);

    this.cameras.main.fadeOut(420, 0, 0, 0);
    this.time.delayedCall(480, () => {
      this.scene.restart({ slot: this.slot, save: this.saveData });
    });
  }

  showCampaignComplete() {
    this.physics.world.isPaused = true;
    const overlay = document.createElement("section");
    overlay.className = "campaign-complete-overlay";
    overlay.innerHTML = `
      <article class="campaign-complete-card">
        <small>${i18n.t("campaign.completeLabel")}</small>
        <h1>${i18n.t("campaign.completeTitle")}</h1>
        <p>${i18n.t("campaign.completeBody")}</p>
        <div class="campaign-complete-stats">
          <span>${i18n.t("hud.level")}</span><b>${TOTAL_LEVELS} / ${TOTAL_LEVELS}</b>
          <span>${i18n.t("hud.documents")}</span><b>${this.saveData.progress.docsRead.length} / ${TOTAL_LEVELS}</b>
          <span>${i18n.t("hud.secretSignals")}</span><b>${this.saveData.progress.secretRooms.length} / ${TOTAL_LEVELS}</b>
        </div>
        <button type="button" id="campaign-return">${i18n.t("pause.menu")}</button>
      </article>`;
    document.body.appendChild(overlay);
    this.completeOverlay = overlay;
    overlay.querySelector("#campaign-return").addEventListener("click", () => this.exitToMenu());
  }

  refreshCampaignHud() {
    this.hud?.updateCampaign({
      level: this.levelNumber,
      chapter: this.definition.chapterNumber,
      signals: this.secretRoom?.count() ?? 0,
      signalTotal: this.secretRoom?.total() ?? this.definition.requiredSignals,
      documents: this.saveData.progress.docsRead.length,
      achievements: this.achievements?.count() ?? 0,
      achievementTotal: this.achievements?.total() ?? 25,
      robotActive: Boolean(this.saveData.robot.active),
    });
  }

  resolvePlayerAttack(zone, direction, damage) {
    this.physics.overlap(zone, this.enemyGroup, (_zone, sprite) => {
      sprite.getData("entity")?.takeDamage(damage, direction);
    });
    if (this.boss?.sprite?.active) {
      this.physics.overlap(zone, this.boss.sprite, () => this.boss.takeDamage(damage, direction));
    }
  }

  onEnemyDefeated() {
    const total = this.achievements.increment("enemiesDefeated");
    if (total === 1) this.achievements.unlock("first_enemy");
  }

  spawnEnemyProjectile(x, y, velocityX, velocityY, damage = 1) {
    const projectile = this.physics.add
      .sprite(x, y, "projectile")
      .setDepth(22)
      .setBlendMode(Phaser.BlendModes.ADD);
    projectile.body.setAllowGravity(false);
    projectile.setVelocity(velocityX, velocityY);
    projectile.setData("damage", damage);
    this.enemyProjectiles.add(projectile);
    this.time.delayedCall(4200, () => projectile?.destroy());
  }

  spawnShockwaves(x, y, phase = 1) {
    const count = phase >= 3 ? 3 : 2;
    for (const direction of [-1, 1]) {
      for (let index = 0; index < count; index += 1) {
        this.time.delayedCall(index * 130, () => {
          const wave = this.physics.add
            .sprite(x + direction * 40, y, "shockwave")
            .setDepth(21)
            .setFlipX(direction < 0);
          wave.body.setAllowGravity(false);
          wave.setVelocityX(direction * (250 + index * 35));
          this.shockwaves.add(wave);
          this.time.delayedCall(2200, () => wave?.destroy());
        });
      }
    }
  }

  shakeCamera(duration, intensity) {
    if (this.settings?.screenShake === false) return;
    const multiplier = this.performance.profile.quality === "low" ? 0.55 : 1;
    this.cameras.main.shake(duration * multiplier, intensity * multiplier);
  }

  spawnMovementTrail(x, y, color = 0x8ff4ff) {
    if (!this.performance.allowEffect("movementTrail", this.time.now)) return;
    const particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.32)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: particle,
      y: y - Phaser.Math.Between(8, 22),
      x: x + Phaser.Math.Between(-8, 8),
      alpha: 0,
      scale: 0,
      duration: Phaser.Math.Between(260, 480),
      onComplete: () => particle.destroy(),
    });
  }

  spawnLandingEffect(x, y) {
    const motesPerSide = this.performance.particleCount(4, 1);
    for (const direction of [-1, 1]) {
      for (let index = 0; index < motesPerSide; index += 1) {
        const mote = this.add.circle(x, y, 3, 0xa8f9ff, 0.45).setDepth(19);
        this.tweens.add({
          targets: mote,
          x: x + direction * Phaser.Math.Between(18, 52),
          y: y - Phaser.Math.Between(4, 18),
          alpha: 0,
          scaleX: 1.8,
          scaleY: 0.35,
          duration: Phaser.Math.Between(240, 390),
          onComplete: () => mote.destroy(),
        });
      }
    }
  }

  spawnDoubleJumpEffect(x, y) {
    const ring = this.add.ellipse(x, y, 36, 12, 0x9cffff, 0.08)
      .setStrokeStyle(2, 0xbfffff, 0.9)
      .setDepth(24)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: ring,
      scaleX: 3.2,
      scaleY: 2.1,
      alpha: 0,
      duration: 330,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => ring.destroy(),
    });
    this.spawnGhostBurst(x, y, this.performance.particleCount(16, 5), 0xc8ffff);
    this.shakeCamera(55, 0.0018);
  }

  spawnWallSlideEffect(x, y, wallDirection) {
    if (!this.performance.allowEffect("wallSlide", this.time.now)) return;
    const dot = this.add.circle(x + wallDirection * 13, y, Phaser.Math.Between(1, 3), 0x9efcff, 0.65)
      .setDepth(23)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: dot,
      x: dot.x - wallDirection * Phaser.Math.Between(8, 18),
      y: y + Phaser.Math.Between(12, 30),
      alpha: 0,
      duration: 240,
      onComplete: () => dot.destroy(),
    });
  }

  spawnWallJumpEffect(x, y, wallDirection) {
    const particleCount = this.performance.particleCount(12, 4);
    for (let index = 0; index < particleCount; index += 1) {
      const dot = this.add.circle(x + wallDirection * 12, y, Phaser.Math.Between(1, 3), 0xbaffff, 0.8)
        .setDepth(24)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: dot,
        x: dot.x + wallDirection * Phaser.Math.Between(12, 34),
        y: dot.y + Phaser.Math.Between(-22, 24),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(180, 360),
        onComplete: () => dot.destroy(),
      });
    }
    this.shakeCamera(70, 0.0022);
  }

  spawnImpact(x, y, color = 0xa7faff) {
    const count = this.performance.particleCount(7, 3);
    for (let index = 0; index < count; index += 1) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.8).setDepth(30);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-35, 35),
        y: y + Phaser.Math.Between(-35, 35),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(160, 280),
        onComplete: () => dot.destroy(),
      });
    }
  }

  spawnGhostBurst(x, y, count = 10, color = 0xa7faff) {
    const particleCount = this.performance.particleCount(count, Math.min(3, count));
    for (let index = 0; index < particleCount; index += 1) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(1, 4), color, Phaser.Math.FloatBetween(0.25, 0.9))
        .setDepth(28)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-75, 75),
        y: y + Phaser.Math.Between(-70, 45),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(280, 700),
        ease: Phaser.Math.Easing.Quadratic.Out,
        onComplete: () => dot.destroy(),
      });
    }
  }

  spawnAfterimage(sprite) {
    if (this.performance.profile.afterimages <= 0) return;
    const afterimage = this.add.image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setFlipX(sprite.flipX)
      .setAlpha(0.28)
      .setTint(0x96f5ff)
      .setDepth(19);
    this.tweens.add({
      targets: afterimage,
      alpha: 0,
      scale: 1.18,
      duration: 220,
      onComplete: () => afterimage.destroy(),
    });
  }

  save(levelOverride = this.levelNumber) {
    if (!this.player?.sprite?.active) return;
    this.refreshCampaignHud();
    this.saveData.player = this.player.serialize();
    if (this.robot) this.saveData.robot = this.robot.serialize();
    this.saveData.progress.currentLevel = levelOverride;
    this.saveData.zoneKey = this.definition.theme;
    this.saveData.zone = i18n.t(this.definition.chapter.nameKey);
    this.saveData = this.saveManager.saveWorld(this.slot, this.saveData);
  }

  playerDied() {
    if (this.player.dead) return;
    this.player.dead = true;
    this.player.controlsLocked = true;
    this.player.sprite.body.enable = false;
    this.spawnGhostBurst(this.player.sprite.x, this.player.sprite.y, 30, 0xff8aa5);
    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0,
      scale: 1.7,
      duration: 450,
      onComplete: () => {
        this.cameras.main.fadeOut(220, 0, 0, 0);
        this.time.delayedCall(260, () => {
          this.player.health = this.player.maxHealth;
          this.player.spirit = this.player.maxSpirit;
          this.player.sprite
            .setPosition(this.player.checkpoint.x, this.player.checkpoint.y)
            .setVelocity(0, 0)
            .setScale(1)
            .setAlpha(0.92);
          this.player.sprite.body.enable = true;
          this.player.dead = false;
          this.player.controlsLocked = false;
          this.hud.updateHealth(this.player.health, this.player.maxHealth);
          this.hud.updateSpirit(this.player.spirit, this.player.maxSpirit, true);
          this.cameras.main.fadeIn(300, 0, 0, 0);
        });
      },
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.physics.world.isPaused = this.isPaused;
    if (this.isPaused) this.showPause();
    else this.hidePause();
  }

  showPause() {
    const container = document.createElement("div");
    container.className = "pause-overlay";
    container.innerHTML = `
      <div class="pause-panel pause-panel-large">
        <small>${i18n.t("pause.signal")}</small>
        <h2>${i18n.t("pause.title")}</h2>
        <div class="pause-level-data">
          <span>${i18n.t("hud.level")}</span><b>${String(this.levelNumber).padStart(3, "0")} / ${TOTAL_LEVELS}</b>
          <span>${i18n.t("hud.chapter")}</span><b>${i18n.t(this.definition.chapter.nameKey)}</b>
          <span>${i18n.t("hud.secretSignals")}</span><b>${this.secretRoom.count()} / ${this.secretRoom.total()}</b>
        </div>
        <p>${i18n.t("pause.continue")}</p>
        <p>${i18n.t("pause.menu")}</p>
      </div>`;
    document.body.appendChild(container);
    this.pauseContainer = container;
  }

  hidePause() {
    this.pauseContainer?.remove();
    this.pauseContainer = null;
  }

  toggleDebug() {
    if (this.debugOverlay) {
      this.debugOverlay.remove();
      this.debugOverlay = null;
      return;
    }
    this.debugOverlay = document.createElement("pre");
    this.debugOverlay.className = "debug-overlay";
    document.body.appendChild(this.debugOverlay);
    this.updateDebug();
  }

  updateDebug() {
    if (!this.debugOverlay || !this.player?.sprite?.body) return;
    const body = this.player.sprite.body;
    this.debugOverlay.textContent = [
      `LEVEL: ${this.levelNumber}/${TOTAL_LEVELS}`,
      `X: ${this.player.sprite.x.toFixed(1)} Y: ${this.player.sprite.y.toFixed(1)}`,
      `VX: ${body.velocity.x.toFixed(1)} VY: ${body.velocity.y.toFixed(1)}`,
      `GROUND: ${body.blocked.down || body.touching.down}`,
      `LOCKED: ${this.player.controlsLocked}`,
      `SECRET: ${this.secretRoom.count()}/${this.secretRoom.total()}`,
      `PORTAL: ${this.isPortalReady()}`,
    ].join("\n");
  }

  exitToMenu() {
    this.save();
    this.returnToMenu();
  }

  cleanup() {
    this.hidePause();
    this.learningDocs?.destroy();
    this.secretRoom?.destroy();
    this.completeOverlay?.remove();
    this.debugOverlay?.remove();
    this.player?.aura?.destroy();
    this.hud?.destroy();
  }
}
