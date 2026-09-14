import Phaser from "phaser";

const PALETTES = Object.freeze({
  lab: { sky: 0x02090f, glow: 0x0b5364, far: 0x092a35, mid: 0x0b3540, near: 0x0a222a, light: 0x5cecff },
  forest: { sky: 0x020b0c, glow: 0x154a3c, far: 0x0b2b25, mid: 0x12382d, near: 0x0a241e, light: 0x69f2bd },
  cave: { sky: 0x070815, glow: 0x39235d, far: 0x19152e, mid: 0x2a1d42, near: 0x161124, light: 0xb687ff },
  future: { sky: 0x050817, glow: 0x24265b, far: 0x121938, mid: 0x1b2550, near: 0x10162f, light: 0x68caff },
});

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export class ProceduralBackdrop {
  constructor(scene, definition, worldWidth) {
    this.scene = scene;
    this.definition = definition;
    this.worldWidth = worldWidth;
    this.palette = PALETTES[definition.theme] || PALETTES.lab;
    this.layers = [];
    this.resizeHandler = () => this.rebuild();
    this.rebuild();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
  }

  rebuild() {
    this.layers.forEach((layer) => layer.destroy());
    this.layers.length = 0;
    const width = Math.max(960, this.scene.scale.width);
    const height = Math.max(540, this.scene.scale.height);
    this.drawSky(width, height);
    this.drawLayer(width, height, 0.04, this.palette.far, 0.45, 11);
    this.drawLayer(width, height, 0.12, this.palette.mid, 0.66, 37);
    this.drawLayer(width, height, 0.24, this.palette.near, 0.88, 71);
    this.drawAtmosphere(width, height);
  }

  addLayer(depth, scrollFactor = 0) {
    const graphics = this.scene.add.graphics().setDepth(depth).setScrollFactor(scrollFactor);
    this.layers.push(graphics);
    return graphics;
  }

  drawSky(width, height) {
    const sky = this.addLayer(-40, 0);
    const hybridAlpha = this.scene.depthBackdrop?.active ? 0.26 : 1;
    sky.fillGradientStyle(this.palette.sky, this.palette.sky, this.palette.glow, this.palette.glow, hybridAlpha, hybridAlpha, hybridAlpha * 0.82, hybridAlpha * 0.82);
    sky.fillRect(0, 0, width, height);

    const glow = this.addLayer(-39, 0);
    const maxRadius = Math.max(width, height) * 0.42;
    for (let step = 8; step >= 1; step -= 1) {
      glow.fillStyle(this.palette.light, 0.006 + (8 - step) * 0.0015);
      glow.fillCircle(width * 0.72, height * 0.38, maxRadius * (step / 8));
    }
    glow.fillStyle(0x000000, 0.36);
    glow.fillRect(0, height * 0.72, width, height * 0.28);
  }

  drawLayer(viewWidth, height, factor, color, alpha, salt) {
    const graphics = this.addLayer(-38 + Math.round(factor * 20), factor);
    const random = seeded(this.definition.level * 997 + salt);
    const width = viewWidth + this.worldWidth * factor + 240;
    const baseY = height * (0.68 + factor * 0.42);
    graphics.fillStyle(color, alpha);

    if (this.definition.theme === "forest") this.drawForest(graphics, random, width, height, baseY, factor);
    else if (this.definition.theme === "cave") this.drawCave(graphics, random, width, height, baseY, factor);
    else if (this.definition.theme === "future") this.drawFuture(graphics, random, width, height, baseY, factor);
    else this.drawLab(graphics, random, width, height, baseY, factor);
  }

  drawLab(g, random, width, height, baseY, factor) {
    for (let x = -80; x < width; x += 70 + random() * 100) {
      const towerWidth = 28 + random() * 74;
      const towerHeight = height * (0.12 + random() * (0.35 + factor * 0.2));
      g.fillRect(x, baseY - towerHeight, towerWidth, towerHeight);
      g.fillStyle(this.palette.light, 0.08 + factor * 0.08);
      for (let y = baseY - towerHeight + 22; y < baseY - 16; y += 34) g.fillRect(x + towerWidth * 0.25, y, towerWidth * 0.5, 3);
      g.fillStyle(factor > 0.2 ? this.palette.near : factor > 0.08 ? this.palette.mid : this.palette.far, factor + 0.35);
    }
    g.lineStyle(Math.max(1, factor * 12), this.palette.light, 0.025 + factor * 0.045);
    for (let y = height * 0.28; y < baseY; y += 150 + random() * 110) g.lineBetween(0, y, width, y + (random() - 0.5) * 35);
    g.fillRect(0, baseY, width, height - baseY);
  }

  drawForest(g, random, width, height, baseY, factor) {
    for (let x = -100; x < width; x += 65 + random() * 110) {
      const trunkWidth = 24 + random() * 46;
      const trunkHeight = height * (0.22 + random() * 0.5);
      g.fillRect(x, baseY - trunkHeight, trunkWidth, trunkHeight);
      g.fillCircle(x + trunkWidth / 2, baseY - trunkHeight, 55 + random() * 90);
      g.fillCircle(x - 22, baseY - trunkHeight + 28, 38 + random() * 60);
      g.fillCircle(x + trunkWidth + 24, baseY - trunkHeight + 18, 42 + random() * 68);
    }
    g.fillRect(0, baseY, width, height - baseY);
    g.lineStyle(2 + factor * 7, this.palette.light, 0.035 + factor * 0.07);
    for (let x = 20; x < width; x += 100 + random() * 170) g.lineBetween(x, 0, x + (random() - 0.5) * 45, height * (0.28 + random() * 0.38));
  }

  drawCave(g, random, width, height, baseY, factor) {
    g.beginPath();
    g.moveTo(0, 0);
    for (let x = 0; x <= width; x += 55) g.lineTo(x, height * (0.08 + random() * 0.28));
    g.lineTo(width, 0);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(0, height);
    for (let x = 0; x <= width; x += 60) g.lineTo(x, baseY - random() * height * 0.18);
    g.lineTo(width, height);
    g.closePath();
    g.fillPath();
    g.fillStyle(this.palette.light, 0.045 + factor * 0.08);
    for (let x = 60; x < width; x += 120 + random() * 180) {
      const crystalHeight = 25 + random() * 100;
      g.fillTriangle(x, baseY, x + 16 + random() * 22, baseY, x + 10, baseY - crystalHeight);
    }
  }

  drawFuture(g, random, width, height, baseY, factor) {
    for (let x = -60; x < width; x += 45 + random() * 85) {
      const buildingWidth = 30 + random() * 65;
      const buildingHeight = height * (0.1 + random() * 0.48);
      g.fillRect(x, baseY - buildingHeight, buildingWidth, buildingHeight);
      g.fillStyle(this.palette.light, 0.06 + factor * 0.1);
      g.fillRect(x + buildingWidth * 0.46, baseY - buildingHeight - 20 - random() * 50, 3, buildingHeight + 30);
      g.fillStyle(factor > 0.2 ? this.palette.near : factor > 0.08 ? this.palette.mid : this.palette.far, factor + 0.35);
    }
    g.lineStyle(3 + factor * 6, this.palette.light, 0.055 + factor * 0.08);
    for (let x = 180; x < width; x += 430 + random() * 260) {
      const radius = 55 + random() * 105;
      g.strokeCircle(x, baseY - height * (0.28 + random() * 0.28), radius);
    }
    g.fillRect(0, baseY, width, height - baseY);
  }

  drawAtmosphere(width, height) {
    const mist = this.addLayer(-13, 0);
    mist.fillStyle(this.palette.light, 0.025);
    for (let index = 0; index < 7; index += 1) {
      mist.fillEllipse((index / 6) * width, height * (0.62 + (index % 2) * 0.07), width * 0.32, height * 0.18);
    }
    if (this.scene.settings?.motion !== false && this.scene.performance?.profile?.backgroundTweens) {
      this.scene.tweens.add({ targets: mist, x: { from: -18, to: 18 }, alpha: { from: 0.6, to: 1 }, duration: 9000, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    }
  }

  destroy() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.layers.forEach((layer) => layer.destroy());
    this.layers.length = 0;
  }
}
