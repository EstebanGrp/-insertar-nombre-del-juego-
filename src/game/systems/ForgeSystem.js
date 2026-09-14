import Phaser from "phaser";

const BLOCK_SIZE = 48;
const MAX_FRAGMENTS = 12;

export class ForgeSystem {
  constructor(scene, definition, layout, saveData) {
    this.scene = scene;
    this.definition = definition;
    this.layout = layout;
    this.saveData = saveData;
    this.levelKey = String(definition.level);
    this.saveData.world ??= {};
    this.saveData.world.fragments = Phaser.Math.Clamp(Number(this.saveData.world.fragments ?? 3), 0, MAX_FRAGMENTS);
    this.saveData.world.destroyedBlocks ??= {};
    this.saveData.world.placedBlocks ??= {};
    this.destroyed = new Set(this.saveData.world.destroyedBlocks[this.levelKey] || []);
    this.placed = [...(this.saveData.world.placedBlocks[this.levelKey] || [])];
    this.blocks = new Map();
    this.group = scene.physics.add.staticGroup();
    this.keys = scene.input.keyboard.addKeys({
      mine: Phaser.Input.Keyboard.KeyCodes.Q,
      place: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.createNaturalBlocks();
    this.placed.forEach((position, index) => this.createBlock(`placed-${index}`, position.x, position.y, true));
    scene.physics.add.collider(scene.player.sprite, this.group);
    scene.hud?.updateForge(this.fragments());
  }

  createNaturalBlocks() {
    const anchors = [
      { x: 700, y: this.layout.floorY - BLOCK_SIZE / 2 },
      { x: 760, y: this.layout.floorY - BLOCK_SIZE / 2 },
      { x: 1450, y: this.layout.floorY - BLOCK_SIZE / 2 },
      { x: 2200, y: this.layout.floorY - BLOCK_SIZE / 2 },
      { x: 2680, y: this.layout.floorY - BLOCK_SIZE / 2 },
    ];
    anchors.forEach((position, index) => {
      const id = `natural-${index}`;
      if (!this.destroyed.has(id)) this.createBlock(id, position.x, position.y, false);
    });
  }

  createBlock(id, x, y, placed) {
    const sprite = this.group
      .create(x, y, "forge-block")
      .setDepth(9)
      .setTint(this.definition.accent)
      .setAlpha(placed ? 0.88 : 1)
      .setData({ forgeId: id, placed });
    sprite.refreshBody();
    this.blocks.set(id, sprite);
    return sprite;
  }

  fragments() {
    return this.saveData.world.fragments;
  }

  nearest(maxDistance = 105) {
    let result = null;
    let best = maxDistance;
    for (const [id, sprite] of this.blocks) {
      if (!sprite?.active) continue;
      const distance = Phaser.Math.Distance.Between(
        this.scene.player.sprite.x,
        this.scene.player.sprite.y,
        sprite.x,
        sprite.y,
      );
      if (distance < best) {
        best = distance;
        result = { id, sprite };
      }
    }
    return result;
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.mine)) return this.mine();
    if (Phaser.Input.Keyboard.JustDown(this.keys.place)) return this.place();
    return false;
  }

  mine() {
    const target = this.nearest();
    if (!target || this.fragments() >= MAX_FRAGMENTS) return false;
    const { id, sprite } = target;
    this.scene.spawnGhostBurst(sprite.x, sprite.y, 16, this.definition.accent);
    this.blocks.delete(id);
    sprite.destroy();
    this.saveData.world.fragments += 1;

    if (id.startsWith("natural-")) this.destroyed.add(id);
    else {
      const index = Number(id.split("-")[1]);
      if (Number.isInteger(index)) this.placed[index] = null;
    }
    this.persist();
    return true;
  }

  place() {
    if (this.fragments() <= 0) return false;
    const player = this.scene.player;
    const targetX = Phaser.Math.Snap.To(player.sprite.x + player.facing * 58, BLOCK_SIZE);
    const surfaceRow = Math.round((this.layout.floorY - player.sprite.body.bottom) / BLOCK_SIZE);
    const targetY = this.layout.floorY - surfaceRow * BLOCK_SIZE - BLOCK_SIZE / 2;
    if (targetX < 90 || targetX > this.layout.width - 90 || targetY < 300 || targetY > this.layout.floorY - 24) return false;
    if ([...this.blocks.values()].some((block) => Math.abs(block.x - targetX) < 42 && Math.abs(block.y - targetY) < 42)) return false;
    const occupied = this.scene.physics.overlapRect(targetX - 20, targetY - 20, 40, 40, true, true)
      .some((body) => body.gameObject !== player.sprite && body.gameObject?.active);
    if (occupied) return false;

    const index = this.placed.length;
    this.placed.push({ x: targetX, y: targetY });
    const block = this.createBlock(`placed-${index}`, targetX, targetY, true);
    this.saveData.world.fragments -= 1;
    this.scene.spawnGhostBurst(block.x, block.y, 12, this.definition.accent);
    this.persist();
    return true;
  }

  persist() {
    this.saveData.world.destroyedBlocks[this.levelKey] = [...this.destroyed];
    this.saveData.world.placedBlocks[this.levelKey] = this.placed.filter(Boolean);
    this.scene.hud?.updateForge(this.fragments());
    this.scene.save();
  }

  destroy() {
    this.blocks.clear();
  }
}
