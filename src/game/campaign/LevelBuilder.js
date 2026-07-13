const LEVEL_WIDTH = 3800;
const FLOOR_Y = 760;

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const PATTERNS = Object.freeze([
  {
    platforms: [
      [420, 640, 260, 28], [820, 560, 250, 28], [1260, 640, 270, 28],
      [1640, 500, 230, 28], [1990, 610, 260, 28], [2420, 520, 250, 28],
      [2740, 650, 210, 28],
    ],
    walls: [[1480, 560, 32, 250], [1780, 500, 32, 310]],
  },
  {
    platforms: [
      [360, 610, 240, 28], [720, 470, 220, 28], [1050, 610, 230, 28],
      [1420, 430, 210, 28], [1790, 590, 270, 28], [2200, 460, 220, 28],
      [2580, 600, 300, 28],
    ],
    walls: [[920, 510, 32, 280], [1170, 510, 32, 280], [2370, 500, 32, 250]],
  },
  {
    platforms: [
      [340, 660, 210, 28], [620, 560, 180, 28], [920, 460, 180, 28],
      [1240, 560, 220, 28], [1550, 650, 210, 28], [1900, 530, 200, 28],
      [2220, 430, 180, 28], [2510, 560, 230, 28], [2760, 650, 180, 28],
    ],
    walls: [[1110, 520, 32, 280], [2090, 500, 32, 300]],
  },
  {
    platforms: [
      [460, 530, 300, 28], [880, 640, 250, 28], [1240, 510, 260, 28],
      [1640, 390, 220, 28], [2010, 520, 250, 28], [2370, 640, 260, 28],
      [2730, 500, 190, 28],
    ],
    walls: [[1510, 460, 32, 350], [1870, 460, 32, 350]],
  },
  {
    platforms: [
      [300, 650, 220, 28], [650, 540, 210, 28], [990, 650, 220, 28],
      [1320, 540, 200, 28], [1650, 430, 190, 28], [1960, 540, 220, 28],
      [2300, 650, 220, 28], [2630, 530, 250, 28],
    ],
    walls: [[1510, 500, 32, 300], [1810, 500, 32, 300], [2470, 520, 32, 270]],
  },
  {
    platforms: [
      [380, 600, 230, 28], [760, 500, 230, 28], [1150, 400, 210, 28],
      [1510, 520, 230, 28], [1860, 640, 240, 28], [2220, 510, 220, 28],
      [2550, 410, 210, 28], [2810, 620, 150, 28],
    ],
    walls: [[1360, 460, 32, 330], [1740, 520, 32, 270], [2440, 480, 32, 320]],
  },
]);

export function buildLevelLayout(definition) {
  const random = mulberry32(definition.level * 7919 + 17);
  const pattern = PATTERNS[(definition.level - 1) % PATTERNS.length];
  const verticalOffset = Math.min(70, Math.floor(definition.difficulty / 3) * 5);

  const platforms = [
    { x: 0, y: FLOOR_Y, width: 900, height: 96 },
    { x: 1030, y: FLOOR_Y, width: 650, height: 96 },
    { x: 1800, y: FLOOR_Y, width: 590, height: 96 },
    { x: 2510, y: FLOOR_Y, width: 430, height: 96 },
    { x: 3000, y: FLOOR_Y, width: 800, height: 96 },
  ];

  for (const [x, y, width, height] of pattern.platforms) {
    const jitter = Math.round((random() - 0.5) * Math.min(60, definition.difficulty * 3));
    platforms.push({ x, y: Math.max(330, y - verticalOffset + jitter), width, height });
  }

  const walls = pattern.walls.map(([x, y, width, height]) => ({ x, y, width, height }));
  const hazards = [];
  const hazardCandidates = [940, 970, 1705, 1735, 2415, 2445, 2950];
  for (let index = 0; index < definition.hazardCount; index += 1) {
    hazards.push({ x: hazardCandidates[index % hazardCandidates.length], y: 742 });
  }

  const signalCandidates = platforms
    .slice(5)
    .map((platform, index) => ({
      x: platform.x + platform.width / 2,
      y: platform.y - 42,
      priority: (index * 13 + definition.level * 7) % 29,
    }));

  if (definition.secretVariant === "vertical_route") {
    signalCandidates.sort((a, b) => a.y - b.y || a.x - b.x);
  } else if (definition.secretVariant === "false_floor") {
    signalCandidates.sort((a, b) => b.y - a.y || b.x - a.x);
  } else if (definition.secretVariant === "split_path") {
    signalCandidates.sort((a, b) => Math.abs(a.x - 1500) - Math.abs(b.x - 1500));
  } else if (definition.secretVariant === "memory_lock") {
    signalCandidates.sort((a, b) => b.priority - a.priority);
  } else {
    signalCandidates.sort((a, b) => a.priority - b.priority);
  }

  const signals = signalCandidates.slice(0, definition.requiredSignals);

  const enemySpawns = [];
  const patrolCandidates = [
    [560, 610, 300, 840],
    [1210, 610, 1060, 1600],
    [1970, 600, 1840, 2320],
    [2650, 600, 2520, 2900],
  ];

  for (let index = 0; index < definition.enemyCount; index += 1) {
    const candidate = patrolCandidates[index % patrolCandidates.length];
    enemySpawns.push({
      type: index % 3 === 2 && definition.level > 8 ? "wraith" : "drone",
      x: candidate[0] + (index % 2) * 85,
      y: candidate[1] - (index % 2) * 110,
      minX: candidate[2],
      maxX: candidate[3],
    });
  }

  return Object.freeze({
    width: LEVEL_WIDTH,
    height: 960,
    floorY: FLOOR_Y,
    spawn: { x: 180, y: 650 },
    platforms,
    walls,
    hazards,
    signals,
    enemySpawns,
    secretWall: { x: 3000, y: 585, width: 44, height: 350 },
    secretRoom: { x: 3000, y: 360, width: 800, height: 400 },
    document: { x: 3220, y: 650 },
    robot: { x: 3380, y: 660 },
    part: { x: 3290, y: 545 },
    portal: { x: 3600, y: 620 },
    boss: { x: 3430, y: 650 },
  });
}
