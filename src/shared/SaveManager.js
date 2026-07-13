import { i18n } from "../i18n/I18n.js";
import { TOTAL_LEVELS, clampLevel, getChapter } from "../game/campaign/LevelCatalog.js";

const PREFIX = "untitled_ghost_beta_world_";
const LEGACY_PREFIX = "untitled_beta_world_";
const LAST_SLOT = "untitled_ghost_beta_last_slot";
const LEGACY_LAST_SLOT = "untitled_beta_last_slot";
const SETTINGS = "untitled_ghost_beta_settings";
export const MAX_WORLDS = 5;

function safeParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function defaultStats() {
  return {
    enemiesDefeated: 0,
    jumps: 0,
    doubleJumps: 0,
    wallJumps: 0,
    dashes: 0,
    attacks: 0,
    secretsFound: 0,
    levelsCompleted: 0,
  };
}

function defaultWorld(slotNumber, name = i18n.t("world.default", { slot: slotNumber })) {
  const now = Date.now();
  const fallbackName = i18n.t("world.default", { slot: slotNumber });

  return {
    version: 8,
    slot: slotNumber,
    name: (name.trim() || fallbackName).slice(0, 20).toUpperCase(),
    createdAt: now,
    lastPlayedAt: now,
    playTimeSeconds: 0,
    zone: "THE SILENT LABORATORY",
    zoneKey: "lab",
    player: {
      form: "HUMAN_GHOST",
      x: 180,
      y: 650,
      health: 5,
      maxHealth: 5,
      spirit: 100,
      checkpointX: 180,
      checkpointY: 650,
    },
    robot: {
      discovered: false,
      active: false,
      coreInstalled: false,
      memory: 2,
    },
    progress: {
      introSeen: false,
      currentLevel: 1,
      highestUnlockedLevel: 1,
      completedLevels: [],
      secretRooms: [],
      levelSignals: {},
      levelBosses: [],
      docsRead: [],
      campaignParts: [],
      achievements: [],
      tutorials: {},
      campaignComplete: false,
      stats: defaultStats(),
    },
  };
}

function uniqueNumbers(values = []) {
  return [...new Set(values.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
}

function uniqueStrings(values = []) {
  return [...new Set(values.map(String))];
}

export class SaveManager {
  normalizeWorld(data, slotNumber) {
    const sourceVersion = Number(data?.version || 0);
    const base = defaultWorld(slotNumber, data?.name || i18n.t("world.default", { slot: slotNumber }));
    const oldProgress = data?.progress || {};
    const normalized = {
      ...base,
      ...data,
      version: 8,
      slot: slotNumber,
      player: { ...base.player, ...(data?.player || {}) },
      robot: { ...base.robot, ...(data?.robot || {}) },
      progress: { ...base.progress, ...oldProgress },
    };

    normalized.player.form = "HUMAN_GHOST";
    normalized.player.maxHealth = Math.max(1, normalized.player.maxHealth || 5);
    normalized.player.health = Math.max(1, Math.min(normalized.player.maxHealth, normalized.player.health || normalized.player.maxHealth));
    normalized.player.spirit = Math.max(0, Math.min(100, normalized.player.spirit ?? 100));

    const migratedLevel = oldProgress.bossDefeated
      ? 10
      : oldProgress.currentLevel
        ? Number(oldProgress.currentLevel)
        : 1;

    normalized.progress.currentLevel = clampLevel(migratedLevel);
    normalized.progress.completedLevels = uniqueNumbers(oldProgress.completedLevels || []);
    normalized.progress.secretRooms = uniqueNumbers(oldProgress.secretRooms || []);
    normalized.progress.levelBosses = uniqueNumbers(oldProgress.levelBosses || []);
    normalized.progress.docsRead = uniqueStrings(oldProgress.docsRead || []);
    normalized.progress.campaignParts = uniqueStrings([
      ...(oldProgress.campaignParts || []),
      ...(oldProgress.repairParts || []),
    ]);
    normalized.progress.achievements = uniqueStrings(oldProgress.achievements || []);
    normalized.progress.levelSignals = oldProgress.levelSignals && typeof oldProgress.levelSignals === "object"
      ? oldProgress.levelSignals
      : {};
    normalized.progress.tutorials = oldProgress.tutorials && typeof oldProgress.tutorials === "object"
      ? oldProgress.tutorials
      : {};
    normalized.progress.stats = { ...defaultStats(), ...(oldProgress.stats || {}) };
    normalized.progress.highestUnlockedLevel = clampLevel(Math.max(
      normalized.progress.currentLevel,
      Number(oldProgress.highestUnlockedLevel || 1),
      Math.max(0, ...normalized.progress.completedLevels) + 1,
    ));
    normalized.progress.campaignComplete = Boolean(
      oldProgress.campaignComplete || normalized.progress.completedLevels.includes(TOTAL_LEVELS),
    );

    normalized.robot.discovered = Boolean(
      normalized.robot.discovered ||
      oldProgress.hiddenLabFound ||
      normalized.progress.currentLevel > 1,
    );
    normalized.robot.active = Boolean(
      normalized.robot.active ||
      normalized.robot.coreInstalled ||
      normalized.progress.campaignParts.includes("power_core") ||
      normalized.progress.currentLevel > 5,
    );
    normalized.robot.coreInstalled = normalized.robot.active;
    normalized.robot.memory = Math.max(
      2,
      Number(normalized.robot.memory || 2),
      Math.min(100, 2 + normalized.progress.completedLevels.length),
    );

    // Migrate old giant-map coordinates once. Current campaign saves keep their checkpoint.
    const invalidPosition = normalized.player.x < 40 || normalized.player.x > 3740 || normalized.player.y < 100 || normalized.player.y > 880;
    if (sourceVersion < 8 || invalidPosition) {
      normalized.player.x = 180;
      normalized.player.y = 650;
      normalized.player.checkpointX = 180;
      normalized.player.checkpointY = 650;
    }

    const chapter = getChapter(normalized.progress.currentLevel);
    normalized.zoneKey = chapter.theme;
    normalized.zone = i18n.t(chapter.nameKey);

    return normalized;
  }

  getSlots() {
    return Array.from({ length: MAX_WORLDS }, (_, index) => {
      const slotNumber = index + 1;
      const current = localStorage.getItem(PREFIX + slotNumber);
      const legacy = localStorage.getItem(LEGACY_PREFIX + slotNumber);
      const parsed = current ? safeParse(current) : legacy ? safeParse(legacy) : null;
      if (!parsed) return null;
      const normalized = this.normalizeWorld(parsed, slotNumber);
      if (!current || parsed.version !== normalized.version) {
        localStorage.setItem(PREFIX + slotNumber, JSON.stringify(normalized));
      }
      return normalized;
    });
  }

  getSlot(slotNumber) {
    return this.getSlots()[slotNumber - 1] ?? null;
  }

  createWorld(slotNumber, name) {
    if (slotNumber < 1 || slotNumber > MAX_WORLDS) throw new Error(i18n.t("error.invalidSlot"));
    if (this.getSlot(slotNumber)) throw new Error(i18n.t("error.slotOccupied"));
    const data = defaultWorld(slotNumber, name);
    this.saveWorld(slotNumber, data);
    return data;
  }

  saveWorld(slotNumber, data) {
    const normalized = this.normalizeWorld(data, slotNumber);
    normalized.lastPlayedAt = Date.now();
    localStorage.setItem(PREFIX + slotNumber, JSON.stringify(normalized));
    localStorage.setItem(LAST_SLOT, String(slotNumber));
    return normalized;
  }

  deleteWorld(slotNumber) {
    localStorage.removeItem(PREFIX + slotNumber);
    localStorage.removeItem(LEGACY_PREFIX + slotNumber);
    if (localStorage.getItem(LAST_SLOT) === String(slotNumber)) localStorage.removeItem(LAST_SLOT);
  }

  renameWorld(slotNumber, name) {
    const data = this.getSlot(slotNumber);
    if (!data) return null;
    data.name = (name.trim() || data.name).slice(0, 20).toUpperCase();
    return this.saveWorld(slotNumber, data);
  }

  getLastSlot() {
    const current = Number(localStorage.getItem(LAST_SLOT));
    if (Number.isInteger(current) && this.getSlot(current)) return current;
    const legacy = Number(localStorage.getItem(LEGACY_LAST_SLOT));
    if (Number.isInteger(legacy) && this.getSlot(legacy)) {
      localStorage.setItem(LAST_SLOT, String(legacy));
      return legacy;
    }
    return null;
  }

  applySettingsToDocument(settings) {
    document.documentElement.dataset.graphicsQuality = settings.graphicsQuality || "auto";
    document.documentElement.dataset.particleQuality = settings.particleQuality || "auto";
    document.documentElement.classList.toggle("reduce-motion", settings.motion === false);
  }

  getSettings() {
    const stored = safeParse(localStorage.getItem(SETTINGS), {});
    const settings = {
      language: i18n.language,
      sound: true,
      motion: true,
      scanlines: true,
      screenShake: true,
      graphicsQuality: "auto",
      particleQuality: "auto",
      ...stored,
    };
    if (settings.language !== i18n.language) i18n.setLanguage(settings.language);
    this.applySettingsToDocument(settings);
    return settings;
  }

  saveSettings(settings) {
    const normalized = {
      language: settings.language || i18n.language,
      sound: settings.sound !== false,
      motion: settings.motion !== false,
      scanlines: settings.scanlines !== false,
      screenShake: settings.screenShake !== false,
      graphicsQuality: ["auto", "low", "medium", "high"].includes(settings.graphicsQuality)
        ? settings.graphicsQuality
        : "auto",
      particleQuality: ["auto", "low", "medium", "high"].includes(settings.particleQuality)
        ? settings.particleQuality
        : "auto",
    };
    localStorage.setItem(SETTINGS, JSON.stringify(normalized));
    i18n.setLanguage(normalized.language);
    this.applySettingsToDocument(normalized);
    return normalized;
  }

  displayZone(world) {
    const level = clampLevel(world?.progress?.currentLevel || 1);
    return i18n.t(getChapter(level).nameKey);
  }
}
