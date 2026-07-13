import { i18n } from "../../i18n/I18n.js";

const IDS = Object.freeze([
  "awakening",
  "first_steps",
  "first_jump",
  "double_jump",
  "wall_slide",
  "wall_jump",
  "parkour_chain",
  "first_dash",
  "first_strike",
  "first_enemy",
  "robot_found",
  "core_recovered",
  "robot_repaired",
  "hidden_lab",
  "first_doc",
  "all_docs",
  "repair_part",
  "robot_mapper",
  "level3_access",
  "checkpoint",
  "shard_one",
  "shard_four",
  "shard_all",
  "warden_defeated",
  "zone_complete",
]);

export class AchievementManager {
  constructor(scene, saveData) {
    this.scene = scene;
    this.saveData = saveData;
    this.saveData.progress.achievements ??= [];
    this.saveData.progress.stats ??= {
      enemiesDefeated: 0,
      shardsCollected: 0,
      jumps: 0,
      doubleJumps: 0,
      wallJumps: 0,
      dashes: 0,
      attacks: 0,
    };
    this.unlocked = new Set(this.saveData.progress.achievements);
  }

  definition(id) {
    return {
      id,
      title: i18n.t(`achievement.${id}.title`),
      description: i18n.t(`achievement.${id}.description`),
    };
  }

  unlock(id) {
    if (!IDS.includes(id) || this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    this.saveData.progress.achievements = [...this.unlocked];
    this.scene.hud?.showAchievement(this.definition(id));
    this.scene.time.delayedCall(150, () => this.scene.save?.());
    return true;
  }

  increment(stat, amount = 1) {
    const stats = this.saveData.progress.stats;
    stats[stat] = (stats[stat] || 0) + amount;
    return stats[stat];
  }

  has(id) {
    return this.unlocked.has(id);
  }

  count() {
    return this.unlocked.size;
  }

  total() {
    return IDS.length;
  }
}
