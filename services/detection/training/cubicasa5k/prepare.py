"""Convert CubiCasa5K SVG annotations to YOLOv8-seg training format.

CubiCasa5K layout:

    <dataset_root>/
        colorful/<plan_id>/{model.svg, F1_original.png, F1_scaled.png}
        high_quality/<plan_id>/...
        high_quality_architectural/<plan_id>/...
        train.txt  val.txt  test.txt   # each line is "/<category>/<plan_id>/"

We rasterise each annotated polygon into YOLO-seg txt format:
`<class_idx> x1 y1 x2 y2 ...` (normalised 0..1 to image dims).

Usage:
    python -m training.cubicasa5k.prepare \
        --input services/detection/data/cubicasa5k \
        --output services/detection/data/cubicasa5k_yolo

Then train:
    yolo segment train model=yolov8m-seg.pt \
        data=services/detection/training/cubicasa5k/cubicasa5k.yaml \
        epochs=150 imgsz=1024
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image

# Allow running as a script (python prepare.py) as well as a module
# (python -m training.cubicasa5k.prepare). `app.classes` lives two levels up.
_THIS = Path(__file__).resolve()
_SERVICE_ROOT = _THIS.parents[2]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

from app.classes import FLOORPLAN_CLASSES  # noqa: E402

CLASS_LIST = list(FLOORPLAN_CLASSES.keys())
CLASS_INDEX = {name: i for i, name in enumerate(CLASS_LIST)}

SPACE_TOKEN_TO_OURS: dict[str, str] = {
    "LivingRoom": "living_room",
    "Kitchen": "kitchen",
    "Bath": "bathroom",
    "Bathroom": "bathroom",
    "BathShower": "bathroom",
    "Toilet": "wc",
    "WC": "wc",
    "Bedroom": "bedroom",
    "MasterBedroom": "bedroom",
    "Hall": "hallway",
    "Hallway": "hallway",
    "Corridor": "hallway",
    "EntryLobby": "hallway",
    "DraughtLobby": "hallway",
    "Stairs": "stairs",
    "Staircase": "stairs",
    "Elevator": "lift",
    "Lift": "lift",
}


def _classify_svg_class(cls: str) -> str | None:
    """Map a CubiCasa SVG class attribute to our label set.

    CubiCasa classes are space-separated compound tokens. Rooms are
    `Space <RoomType>` (optionally multi-token like `Space Bath Shower`), doors
    are `Doors` or `Door Swing ...`, windows are `Window Regular`.
    """
    tokens = cls.split()
    if not tokens:
        return None
    head = tokens[0]
    if head == "Space":
        joined = "".join(tokens[1:])  # e.g. "Bath Shower" -> "BathShower"
        if joined in SPACE_TOKEN_TO_OURS:
            return SPACE_TOKEN_TO_OURS[joined]
        for tok in tokens[1:]:
            if tok in SPACE_TOKEN_TO_OURS:
                return SPACE_TOKEN_TO_OURS[tok]
        return None
    if head in ("Door", "Doors"):
        return "door"
    if head == "Window":
        return "window"
    if head == "Stairs" or head == "Staircase":
        return "stairs"
    return None

SPLIT_FILES = {"train": "train.txt", "val": "val.txt", "test": "test.txt"}


def _points_from_attr(points_attr: str) -> list[tuple[float, float]]:
    tokens = re.split(r"[ ,]+", points_attr.strip())
    nums = [float(t) for t in tokens if t]
    return list(zip(nums[0::2], nums[1::2]))


def convert_plan(svg_path: Path, image_path: Path, out_dir: Path) -> bool:
    try:
        image = Image.open(image_path)
        W, H = image.size
    except Exception as e:
        print(f"  skip {image_path}: {e}")
        return False
    try:
        tree = ET.parse(svg_path)
    except ET.ParseError as e:
        print(f"  skip {svg_path}: {e}")
        return False
    root = tree.getroot()
    lines: list[str] = []
    # CubiCasa groups each labelled shape as <g class="Space Kitchen"> with a direct
    # <polygon> child holding the boundary. We iterate groups with recognised classes
    # and pull the first direct-child polygon with >=3 points.
    for el in root.iter():
        cls = el.attrib.get("class")
        if not cls:
            continue
        our = _classify_svg_class(cls)
        if not our or our not in CLASS_INDEX:
            continue
        polygon = None
        for child in list(el):
            tag = child.tag.rsplit("}", 1)[-1]
            if tag == "polygon" and "points" in child.attrib:
                polygon = child
                break
        if polygon is None:
            continue
        pts = _points_from_attr(polygon.attrib["points"])
        if len(pts) < 3:
            continue
        norm = " ".join(f"{x/W:.6f} {y/H:.6f}" for x, y in pts)
        lines.append(f"{CLASS_INDEX[our]} {norm}")

    if not lines:
        return False

    # Use category-prefixed filename to avoid collisions across the three categories.
    # Expected plan_dir structure: <dataset_root>/<category>/<plan_id>/
    plan_id = image_path.parent.name
    category = image_path.parent.parent.name
    stem = f"{category}_{plan_id}"

    out_img = out_dir / "images" / f"{stem}.png"
    out_lbl = out_dir / "labels" / f"{stem}.txt"
    out_img.parent.mkdir(parents=True, exist_ok=True)
    out_lbl.parent.mkdir(parents=True, exist_ok=True)
    if not out_img.exists():
        image.save(out_img)
    out_lbl.write_text("\n".join(lines))
    return True


def _iter_split(root: Path, split_file: Path):
    """Yield (svg_path, image_path) for each valid plan in a split file."""
    for raw in split_file.read_text().splitlines():
        rel = raw.strip().strip("/")
        if not rel:
            continue
        plan_dir = root / rel
        svg = plan_dir / "model.svg"
        img = plan_dir / "F1_scaled.png"
        if not img.exists():
            img = plan_dir / "F1_original.png"
        if svg.exists() and img.exists():
            yield svg, img


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, help="CubiCasa5K dataset root")
    p.add_argument("--output", required=True, help="YOLO output dir")
    p.add_argument(
        "--splits",
        default="train,val",
        help="Comma-separated splits to process (train,val,test)",
    )
    p.add_argument("--limit", type=int, default=0, help="Limit plans per split (0=all)")
    args = p.parse_args()

    root = Path(args.input).resolve()
    out_root = Path(args.output).resolve()
    splits = [s.strip() for s in args.splits.split(",") if s.strip()]

    for split in splits:
        split_name = SPLIT_FILES.get(split)
        if not split_name:
            print(f"unknown split: {split}")
            continue
        split_file = root / split_name
        if not split_file.exists():
            print(f"missing split file: {split_file}")
            continue
        out_dir = out_root / split
        n_ok = n_total = 0
        for svg, img in _iter_split(root, split_file):
            n_total += 1
            if args.limit and n_total > args.limit:
                break
            if convert_plan(svg, img, out_dir):
                n_ok += 1
            if n_total % 100 == 0:
                print(f"  {split}: {n_ok}/{n_total}")
        print(f"[{split}] wrote {n_ok} plans (of {n_total} tried) -> {out_dir}")


if __name__ == "__main__":
    main()
