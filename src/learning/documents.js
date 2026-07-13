export const LEARNING_DOCUMENTS = Object.freeze([
  {
    id: "lab_note",
    x: 895,
    y: 640,
    titleKey: "doc.labNote.title",
    bodyKey: "doc.labNote.body",
    hintKey: "doc.labNote.hint",
    language: "HTML",
    code: `<section id="hidden-lab">
  <h1>Robot Recovery Unit</h1>
  <p>Read the note. Inspect the robot.</p>
</section>`,
  },
  {
    id: "conditions",
    x: 1740,
    y: 650,
    titleKey: "doc.conditions.title",
    bodyKey: "doc.conditions.body",
    hintKey: "doc.conditions.hint",
    language: "JavaScript",
    code: `const routeUnlocked = noteRead && robotFound;

if (routeUnlocked) {
  openRoute("LEVEL_2");
}`,
  },
  {
    id: "signals",
    x: 2860,
    y: 430,
    titleKey: "doc.signals.title",
    bodyKey: "doc.signals.body",
    hintKey: "doc.signals.hint",
    language: "CSS",
    code: `.phase-wall {
  opacity: 0.35;
  border: 2px solid cyan;
}

.phase-wall.unlocked {
  transform: translateY(-100%);
}`,
  },
  {
    id: "loops",
    x: 4160,
    y: 525,
    titleKey: "doc.loops.title",
    bodyKey: "doc.loops.body",
    hintKey: "doc.loops.hint",
    language: "JavaScript",
    code: `const parts = ["servo", "optic", "memory", "map"];

for (const part of parts) {
  scanFor(part);
}`,
  },
  {
    id: "memory",
    x: 5350,
    y: 410,
    titleKey: "doc.memory.title",
    bodyKey: "doc.memory.body",
    hintKey: "doc.memory.hint",
    language: "C++",
    code: `struct RobotModule {
  std::string id;
  bool installed = false;
};

RobotModule mapCore{"map_core"};`,
  },
  {
    id: "objects",
    x: 6900,
    y: 525,
    titleKey: "doc.objects.title",
    bodyKey: "doc.objects.body",
    hintKey: "doc.objects.hint",
    language: "Java",
    code: `class Robot {
  private boolean navigationOnline;

  void install(MapCore core) {
    navigationOnline = core.isValid();
  }
}`,
  },
]);
