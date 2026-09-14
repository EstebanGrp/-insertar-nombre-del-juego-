const PROFILES = Object.freeze({
  low: Object.freeze({
    particleScale: 0.34,
    ambientFrequency: 520,
    afterimages: 2,
    backgroundTweens: false,
    fogAlpha: 0.25,
    backgroundOverlayAlpha: 0.58,
    enemyUpdateDistance: 900,
    farEnemyStride: 7,
    effectThrottleMs: 55,
  }),
  medium: Object.freeze({
    particleScale: 0.62,
    ambientFrequency: 300,
    afterimages: 4,
    backgroundTweens: true,
    fogAlpha: 0.46,
    backgroundOverlayAlpha: 0.68,
    enemyUpdateDistance: 1250,
    farEnemyStride: 4,
    effectThrottleMs: 30,
  }),
  high: Object.freeze({
    particleScale: 1,
    ambientFrequency: 180,
    afterimages: 6,
    backgroundTweens: true,
    fogAlpha: 0.66,
    backgroundOverlayAlpha: 0.76,
    enemyUpdateDistance: 1650,
    farEnemyStride: 2,
    effectThrottleMs: 12,
  }),
});

const SAMPLE_COUNT = 120;
const QUALITY_ORDER = Object.freeze(["low", "medium", "high"]);

function detectQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const pixels = window.innerWidth * window.innerHeight;
  if (cores <= 4 || memory <= 4 || pixels > 2_600_000) return "low";
  if (cores <= 8 || memory <= 8 || pixels > 1_700_000) return "medium";
  return "high";
}

function resolveParticleScale(setting) {
  if (setting === "low") return 0.45;
  if (setting === "medium") return 0.72;
  if (setting === "high") return 1;
  return 1;
}

export class PerformanceManager {
  constructor(settings = {}) {
    this.requestedQuality = settings.graphicsQuality || "auto";
    this.baseQuality = this.requestedQuality === "auto" ? detectQuality() : this.requestedQuality;
    if (!PROFILES[this.baseQuality]) this.baseQuality = "medium";
    this.runtimeQuality = this.baseQuality;
    this.particleSetting = settings.particleQuality || "auto";
    this.samples = new Float32Array(SAMPLE_COUNT);
    this.sampleCursor = 0;
    this.sampleSize = 0;
    this.sampleTotal = 0;
    this.frame = 0;
    this.lastEffectAt = new Map();
    this.rebuildProfile();
  }

  rebuildProfile() {
    const base = PROFILES[this.runtimeQuality];
    const particleOverride = this.particleSetting === "auto" ? 1 : resolveParticleScale(this.particleSetting);
    this.profile = Object.freeze({
      ...base,
      particleScale: Math.min(base.particleScale, particleOverride),
      quality: this.runtimeQuality,
    });
    document.documentElement.dataset.runtimeQuality = this.runtimeQuality;
  }

  update(delta, active = true) {
    this.frame += 1;
    if (!active || !Number.isFinite(delta) || delta <= 0 || delta > 250) return false;

    if (this.sampleSize === SAMPLE_COUNT) {
      this.sampleTotal -= this.samples[this.sampleCursor];
    } else {
      this.sampleSize += 1;
    }
    this.samples[this.sampleCursor] = delta;
    this.sampleTotal += delta;
    this.sampleCursor = (this.sampleCursor + 1) % SAMPLE_COUNT;

    if (
      this.sampleSize < SAMPLE_COUNT ||
      this.requestedQuality !== "auto" ||
      this.frame % 30 !== 0
    ) {
      return false;
    }

    const average = this.sampleTotal / this.sampleSize;
    if (average <= 24 || this.runtimeQuality === "low") return false;

    const currentIndex = QUALITY_ORDER.indexOf(this.runtimeQuality);
    this.runtimeQuality = QUALITY_ORDER[Math.max(0, currentIndex - 1)];
    this.sampleSize = 0;
    this.sampleTotal = 0;
    this.sampleCursor = 0;
    this.rebuildProfile();
    return true;
  }

  particleCount(baseCount, minimum = 1) {
    return Math.max(minimum, Math.round(baseCount * this.profile.particleScale));
  }

  shouldUpdateEnemy(enemyX, playerX, index = 0) {
    if (Math.abs(enemyX - playerX) <= this.profile.enemyUpdateDistance) return true;
    return (this.frame + index) % this.profile.farEnemyStride === 0;
  }

  allowEffect(key, time) {
    const previous = this.lastEffectAt.get(key) ?? -Infinity;
    if (time - previous < this.profile.effectThrottleMs) return false;
    this.lastEffectAt.set(key, time);
    return true;
  }
}
