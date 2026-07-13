export const TOTAL_LEVELS = 100;
export const LEVELS_PER_CHAPTER = 10;

export const CHAPTERS = Object.freeze([
  { id: "awakening", nameKey: "chapter.awakening", theme: "lab", accent: 0x72efff },
  { id: "rootbound", nameKey: "chapter.rootbound", theme: "forest", accent: 0x83ffc7 },
  { id: "crystal", nameKey: "chapter.crystal", theme: "cave", accent: 0xc99cff },
  { id: "catacombs", nameKey: "chapter.catacombs", theme: "lab", accent: 0x6dd9ff },
  { id: "brokenCity", nameKey: "chapter.brokenCity", theme: "future", accent: 0x86bfff },
  { id: "nullOcean", nameKey: "chapter.nullOcean", theme: "cave", accent: 0x6af6ff },
  { id: "warMemory", nameKey: "chapter.warMemory", theme: "future", accent: 0xff8a98 },
  { id: "exodus", nameKey: "chapter.exodus", theme: "forest", accent: 0xf0c781 },
  { id: "realityEngine", nameKey: "chapter.realityEngine", theme: "lab", accent: 0xd38cff },
  { id: "originCollapse", nameKey: "chapter.originCollapse", theme: "future", accent: 0xff6f8f },
]);

export const LESSON_TEMPLATES = Object.freeze([
  {
    key: "html",
    language: "HTML",
    titleKey: "doc.labNote.title",
    bodyKey: "doc.labNote.body",
    hintKey: "doc.labNote.hint",
    code: `<section id="secret-room">
  <h1>Recovery Chamber</h1>
  <p>Find the signal. Read the archive.</p>
</section>`,
  },
  {
    key: "conditions",
    language: "JavaScript",
    titleKey: "doc.conditions.title",
    bodyKey: "doc.conditions.body",
    hintKey: "doc.conditions.hint",
    code: `const roomOpen = signalsFound === signalsRequired;

if (roomOpen) {
  revealSecretRoom();
}`,
  },
  {
    key: "css",
    language: "CSS",
    titleKey: "doc.signals.title",
    bodyKey: "doc.signals.body",
    hintKey: "doc.signals.hint",
    code: `.secret-wall {
  opacity: 1;
  transition: opacity 400ms ease;
}

.secret-wall.open {
  opacity: 0;
}`,
  },
  {
    key: "loops",
    language: "JavaScript",
    titleKey: "doc.loops.title",
    bodyKey: "doc.loops.body",
    hintKey: "doc.loops.hint",
    code: `for (const signal of hiddenSignals) {
  if (signal.active) {
    recovered += 1;
  }
}`,
  },
  {
    key: "cpp",
    language: "C++",
    titleKey: "doc.memory.title",
    bodyKey: "doc.memory.body",
    hintKey: "doc.memory.hint",
    code: `struct RobotPart {
  std::string id;
  bool installed = false;
};

RobotPart memoryCore{"memory_core"};`,
  },
  {
    key: "java",
    language: "Java",
    titleKey: "doc.objects.title",
    bodyKey: "doc.objects.body",
    hintKey: "doc.objects.hint",
    code: `class Robot {
  private boolean navigationOnline;

  void install(MapCore core) {
    navigationOnline = core.isValid();
  }
}`,
  },
]);

const PART_MILESTONES = Object.freeze({
  2: "servo",
  3: "optic",
  4: "memory",
  5: "power_core",
  6: "map_alpha",
  7: "map_beta",
  8: "map_gamma",
  9: "map_delta",
});

const SECRET_VARIANTS = Object.freeze([
  "echo_nodes",
  "vertical_route",
  "false_floor",
  "split_path",
  "memory_lock",
]);

export function clampLevel(level) {
  const numeric = Number(level) || 1;
  return Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(numeric)));
}

export function chapterIndexForLevel(level) {
  return Math.floor((clampLevel(level) - 1) / LEVELS_PER_CHAPTER);
}

export function getChapter(level) {
  return CHAPTERS[chapterIndexForLevel(level)];
}

export function getLevelDefinition(level) {
  const safeLevel = clampLevel(level);
  const chapterIndex = chapterIndexForLevel(safeLevel);
  const chapter = CHAPTERS[chapterIndex];
  const levelInChapter = ((safeLevel - 1) % LEVELS_PER_CHAPTER) + 1;
  const isBoss = levelInChapter === LEVELS_PER_CHAPTER;
  const difficulty = 1 + Math.floor((safeLevel - 1) / 5);
  const requiredSignals = Math.min(5, 1 + Math.floor((safeLevel - 1) / 20) + (isBoss ? 1 : 0));
  const lesson = LESSON_TEMPLATES[(safeLevel - 1) % LESSON_TEMPLATES.length];

  return Object.freeze({
    level: safeLevel,
    chapterIndex,
    chapterNumber: chapterIndex + 1,
    chapter,
    levelInChapter,
    theme: chapter.theme,
    accent: chapter.accent,
    difficulty,
    isBoss,
    requiredSignals,
    secretVariant: SECRET_VARIANTS[(safeLevel - 1) % SECRET_VARIANTS.length],
    lesson,
    partId: PART_MILESTONES[safeLevel] ?? null,
    enemyCount: Math.min(9, 2 + Math.floor(safeLevel / 8)),
    wraithCount: Math.min(5, Math.floor((safeLevel + 4) / 18)),
    hazardCount: Math.min(10, 1 + Math.floor(safeLevel / 7)),
    nameKey: "campaign.levelName",
  });
}

export function getCampaignProgress(currentLevel, completedLevels = []) {
  const current = clampLevel(currentLevel);
  const completed = new Set(completedLevels || []);
  const highestCompleted = Math.max(0, ...completed);
  return {
    current,
    completed: completed.size,
    highestCompleted,
    percent: Math.round((completed.size / TOTAL_LEVELS) * 100),
  };
}
