import assert from "node:assert/strict";
import test from "node:test";

globalThis.document = {
  documentElement: { dataset: {} },
};

const { PerformanceManager } = await import("../src/game/systems/PerformanceManager.js");

test("automatic quality drops one tier after sustained slow frames", () => {
  const performance = new PerformanceManager({
    graphicsQuality: "high",
    particleQuality: "auto",
  });
  performance.requestedQuality = "auto";

  let changed = false;
  for (let frame = 0; frame < 120; frame += 1) {
    changed = performance.update(30) || changed;
  }

  assert.equal(changed, true);
  assert.equal(performance.runtimeQuality, "medium");
  assert.equal(performance.profile.quality, "medium");
});

test("explicit quality never changes automatically", () => {
  const performance = new PerformanceManager({
    graphicsQuality: "high",
    particleQuality: "auto",
  });

  for (let frame = 0; frame < 300; frame += 1) performance.update(40);

  assert.equal(performance.runtimeQuality, "high");
});

test("paused, hidden, and invalid frames do not affect adaptation", () => {
  const performance = new PerformanceManager({
    graphicsQuality: "high",
    particleQuality: "auto",
  });
  performance.requestedQuality = "auto";

  for (let frame = 0; frame < 200; frame += 1) performance.update(40, false);
  performance.update(Number.NaN);
  performance.update(300);

  assert.equal(performance.runtimeQuality, "high");
  assert.equal(performance.sampleSize, 0);
});
