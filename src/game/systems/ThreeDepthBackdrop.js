import * as THREE from "three";

const THEMES = Object.freeze({
  lab: { clear: 0x020b12, fog: 0x08212c, solid: 0x1b4b58, accent: 0x58e9ff },
  forest: { clear: 0x020d0b, fog: 0x0b281f, solid: 0x245443, accent: 0x70f0bd },
  cave: { clear: 0x080719, fog: 0x22183a, solid: 0x49316b, accent: 0xb387ff },
  future: { clear: 0x050820, fog: 0x192050, solid: 0x30427d, accent: 0x71bfff },
});

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export class ThreeDepthBackdrop {
  constructor(scene, definition, quality = "medium") {
    this.scene2d = scene;
    this.definition = definition;
    this.quality = quality;
    this.theme = THEMES[definition.theme] || THEMES.lab;
    this.frame = 0;
    this.disposables = [];
    this.random = seeded(definition.level * 65537 + definition.chapterIndex * 313);

    try {
      this.createRenderer();
      this.createScene();
      this.resize();
      this.renderer.render(this.scene, this.camera);
      this.resizeHandler = () => this.resize();
      this.scene2d.scale.on("resize", this.resizeHandler);
      this.active = true;
    } catch (error) {
      console.warn("Three.js depth layer unavailable; using the Phaser fallback.", error);
      this.destroy();
      this.active = false;
    }
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality !== "low",
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === "high" ? 1.5 : 1));
    this.renderer.domElement.className = "three-depth-canvas";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    const phaserCanvas = this.scene2d.game.canvas;
    phaserCanvas.parentNode.insertBefore(this.renderer.domElement, phaserCanvas);
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.theme.clear);
    this.scene.fog = new THREE.FogExp2(this.theme.fog, this.quality === "low" ? 0.055 : 0.042);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.camera.position.set(0, 1.2, 17);
    this.camera.lookAt(0, 0, -4);
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.scene.add(new THREE.HemisphereLight(this.theme.accent, this.theme.clear, 2.1));
    const keyLight = new THREE.PointLight(this.theme.accent, 48, 35, 2);
    keyLight.position.set(5, 4, 8);
    this.scene.add(keyLight);
    this.keyLight = keyLight;

    this.createArchitecture();
    this.createRings();
    this.createParticles();
  }

  material(color, options = {}) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0.42,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
    });
    this.disposables.push(material);
    return material;
  }

  geometry(geometry) {
    this.disposables.push(geometry);
    return geometry;
  }

  createArchitecture() {
    const count = this.quality === "low" ? 16 : this.quality === "high" ? 34 : 25;
    const geometry = this.geometry(new THREE.BoxGeometry(1, 1, 1));
    const material = this.material(this.theme.solid, {
      metalness: this.definition.theme === "forest" ? 0.1 : 0.58,
      emissive: this.theme.solid,
      emissiveIntensity: 0.18,
    });
    const structures = new THREE.InstancedMesh(geometry, material, count);
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < count; index += 1) {
      const x = (this.random() - 0.5) * 34;
      const z = -4 - this.random() * 22;
      const height = 2.5 + this.random() * 9;
      const width = 0.5 + this.random() * 1.8;
      const y = -4.4 + height / 2;
      const depth = 0.7 + this.random() * 2.4;
      matrix.compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (this.random() - 0.5) * 0.3, 0)),
        new THREE.Vector3(width, height, depth),
      );
      structures.setMatrixAt(index, matrix);
    }
    structures.instanceMatrix.needsUpdate = true;
    this.root.add(structures);

    const ground = new THREE.Mesh(
      this.geometry(new THREE.PlaneGeometry(70, 35, 1, 1)),
      this.material(this.theme.solid, { roughness: 1, metalness: 0.12 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -4.45, -8);
    this.root.add(ground);

    if (this.definition.theme === "forest") this.createForestForms();
    if (this.definition.theme === "cave") this.createCrystals();
    if (this.definition.theme === "future") this.createFloatingFragments();
  }

  createForestForms() {
    const geometry = this.geometry(new THREE.CylinderGeometry(0.25, 0.8, 8, 7));
    const material = this.material(0x17392d, { roughness: 1, metalness: 0 });
    for (let index = 0; index < 9; index += 1) {
      const trunk = new THREE.Mesh(geometry, material);
      trunk.position.set(-14 + index * 3.5, -0.6, -7 - (index % 3) * 3);
      trunk.rotation.z = (this.random() - 0.5) * 0.14;
      this.root.add(trunk);
    }
  }

  createCrystals() {
    const geometry = this.geometry(new THREE.OctahedronGeometry(0.8, 0));
    const material = this.material(this.theme.accent, { emissive: this.theme.accent, emissiveIntensity: 0.85, roughness: 0.28 });
    for (let index = 0; index < 13; index += 1) {
      const crystal = new THREE.Mesh(geometry, material);
      crystal.position.set((this.random() - 0.5) * 30, -3.4 + this.random() * 2, -5 - this.random() * 16);
      crystal.scale.set(0.35 + this.random(), 1 + this.random() * 2.8, 0.35 + this.random());
      crystal.rotation.z = (this.random() - 0.5) * 0.7;
      this.root.add(crystal);
    }
  }

  createFloatingFragments() {
    const geometry = this.geometry(new THREE.TetrahedronGeometry(0.7, 0));
    const material = this.material(this.theme.solid, { emissive: this.theme.accent, emissiveIntensity: 0.18 });
    for (let index = 0; index < 12; index += 1) {
      const fragment = new THREE.Mesh(geometry, material);
      fragment.position.set((this.random() - 0.5) * 28, -1 + this.random() * 9, -7 - this.random() * 18);
      fragment.scale.setScalar(0.4 + this.random() * 1.5);
      fragment.userData.floatPhase = this.random() * Math.PI * 2;
      fragment.userData.baseY = fragment.position.y;
      this.root.add(fragment);
    }
  }

  createRings() {
    const ringGeometry = this.geometry(new THREE.TorusGeometry(2.2, 0.08, 8, 48));
    const ringMaterial = this.material(this.theme.accent, {
      emissive: this.theme.accent,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.34,
      metalness: 0.8,
    });
    this.rings = [];
    for (let index = 0; index < 4; index += 1) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(-10 + index * 7, -0.5 + (index % 2) * 2.2, -7 - index * 3.7);
      ring.rotation.set(0.1 + index * 0.16, 0.4 + index * 0.24, 0);
      ring.scale.setScalar(0.75 + index * 0.24);
      this.root.add(ring);
      this.rings.push(ring);
    }
  }

  createParticles() {
    const count = this.quality === "low" ? 80 : 180;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (this.random() - 0.5) * 38;
      positions[index * 3 + 1] = (this.random() - 0.5) * 15;
      positions[index * 3 + 2] = -2 - this.random() * 28;
    }
    const geometry = this.geometry(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: this.theme.accent, size: 0.045, transparent: true, opacity: 0.48, depthWrite: false });
    this.disposables.push(material);
    this.particles = new THREE.Points(geometry, material);
    this.root.add(this.particles);
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.scene2d.scale.width);
    const height = Math.max(1, this.scene2d.scale.height);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setQuality(quality) {
    if (!this.active || !["low", "medium", "high"].includes(quality)) return;
    this.quality = quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.5 : 1));
    if (this.scene?.fog) this.scene.fog.density = quality === "low" ? 0.055 : 0.042;
    this.resize();
  }

  update(time, scrollX, worldWidth, paused = false) {
    if (!this.active || paused) return;
    this.frame += 1;
    if (this.quality === "low" && this.frame % 2 !== 0) return;
    const seconds = time * 0.001;
    const progress = Math.max(0, Math.min(1, scrollX / Math.max(1, worldWidth - this.scene2d.scale.width)));
    this.root.position.x = -progress * 4.5;
    this.root.rotation.y = (progress - 0.5) * 0.055;
    this.rings.forEach((ring, index) => {
      ring.rotation.z = seconds * (index % 2 ? -0.045 : 0.035) + index;
    });
    this.root.children.forEach((child) => {
      if (child.userData.floatPhase !== undefined) {
        child.rotation.y = seconds * 0.14 + child.userData.floatPhase;
        child.position.y = child.userData.baseY + Math.sin(seconds + child.userData.floatPhase) * 0.12;
      }
    });
    this.particles.rotation.y = seconds * 0.008;
    this.keyLight.intensity = 45 + Math.sin(seconds * 0.7) * 5;
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.active = false;
    this.scene2d?.scale.off("resize", this.resizeHandler);
    this.disposables?.forEach((item) => item.dispose?.());
    this.disposables = [];
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.renderer?.domElement?.remove();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}
