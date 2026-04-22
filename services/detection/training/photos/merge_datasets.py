"""Merge public photo datasets into a unified YOLO-format training set.

Sources (download separately and pass their paths):
  - Open Images V7       (labels: Toilet, Bathtub, Sink, Tap, Stairs)
  - ADE20K               (semantic masks: toilet, bathtub, shower, handrail, stairs)
  - Roboflow Universe    (grab_rail, handrail, stairlift, ramp — licence-varying)

Usage:
    python -m training.photos.merge_datasets \
        --open-images /data/openimages \
        --ade20k /data/ade20k \
        --roboflow /data/roboflow_fixtures \
        --output /data/homingo_photos_yolo

Stairlift and through-floor lift are rare — expect to supplement with ~100-200
internally labelled images. Keep those in /data/internal and pass via --extra.
"""
from __future__ import annotations

import argparse

# Skeleton only — a full implementation maps each source's class vocabulary to
# our PHOTO_CLASSES and writes YOLO-format txt labels. Fill in when the datasets
# are downloaded.


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--open-images", required=False)
    p.add_argument("--ade20k", required=False)
    p.add_argument("--roboflow", required=False)
    p.add_argument("--extra", required=False)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    raise NotImplementedError(
        "Dataset conversion is left as training-time work; see README.md § Training."
    )


if __name__ == "__main__":
    main()
