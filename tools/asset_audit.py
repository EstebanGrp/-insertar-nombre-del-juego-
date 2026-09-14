from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = ROOT / "src"
MAX_PUBLIC_BYTES = 4 * 1024 * 1024


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as file:
        header = file.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Invalid PNG: {path}")
    return struct.unpack(">II", header[16:24])


def main() -> None:
    files = [path for path in PUBLIC.rglob("*") if path.is_file()]
    total_bytes = sum(path.stat().st_size for path in files)
    if total_bytes > MAX_PUBLIC_BYTES:
        raise SystemExit(f"Public asset budget exceeded: {total_bytes / 1024 / 1024:.2f} MB")

    pngs = [path for path in files if path.suffix.lower() == ".png"]
    for path in pngs:
        width, height = png_size(path)
        if width > 2048 or height > 2048:
            raise SystemExit(f"Oversized texture: {path.relative_to(ROOT)} ({width}x{height})")

    missing: set[str] = set()
    asset_pattern = re.compile(r'["\'(](/?assets/[^"\')]+)')
    source_files = [
        path for path in SOURCE.rglob("*")
        if path.is_file() and path.suffix.lower() in {".js", ".css"}
    ]
    for source_file in source_files:
        for relative in asset_pattern.findall(source_file.read_text(encoding="utf-8")):
            normalized = relative.lstrip("/")
            if not (PUBLIC / normalized).is_file():
                missing.add(normalized)
    if missing:
        raise SystemExit("Missing referenced assets: " + ", ".join(sorted(missing)))

    backdrop = (SOURCE / "game/systems/ProceduralBackdrop.js").read_text(encoding="utf-8")
    if "drawLab" not in backdrop or "drawForest" not in backdrop or "drawCave" not in backdrop:
        raise SystemExit("Procedural biome renderer is incomplete")

    print(f"Assets valid: {len(files)} files, {len(pngs)} PNGs, {total_bytes / 1024 / 1024:.2f} MB.")


if __name__ == "__main__":
    main()
