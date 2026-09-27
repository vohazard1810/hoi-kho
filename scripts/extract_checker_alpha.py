#!/usr/bin/env python3
"""Convert AI checkerboard sprite strips to real RGBA and normalize baselines.

Only border-connected, near-neutral checker pixels are removed. Character
whites (reflective tape / soles) remain protected behind the dark contour.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def extract(source: Path, target: Path, frames: int) -> None:
    rgb = np.asarray(Image.open(source).convert("RGB"))
    height, width, _ = rgb.shape
    remainder = width % frames
    if remainder:
        # Generators occasionally add 1–3 padding pixels to the whole canvas.
        # Remove only that outer padding; never resize or resample the art.
        trim_left = remainder // 2
        trim_right = remainder - trim_left
        rgb = rgb[:, trim_left:width - trim_right]
        height, width, _ = rgb.shape
    frame_width = width // frames
    out = np.zeros((height, width, 4), dtype=np.uint8)

    for index in range(frames):
        x0, x1 = index * frame_width, (index + 1) * frame_width
        cell = rgb[:, x0:x1]
        hi = cell.max(axis=2).astype(np.int16)
        lo = cell.min(axis=2).astype(np.int16)
        chroma = hi - lo
        luminance = cell.mean(axis=2)

        # The generated checker is achromatic and mid/high luminance. Dark
        # character contours are deliberately excluded from this candidate.
        candidate = (chroma <= 16) & (luminance >= 105)
        labels, _ = ndimage.label(candidate)
        border_labels = np.unique(np.concatenate((
            labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
        )))
        background = np.isin(labels, border_labels[border_labels != 0])
        foreground = ~background

        # Clear isolated background islands, while retaining small enclosed
        # highlights belonging to the character.
        island_labels, island_count = ndimage.label(candidate & foreground)
        for label_id in range(1, island_count + 1):
            island = island_labels == label_id
            if int(island.sum()) >= 900:
                foreground[island] = False

        # A generated pose can spill a shoe/hand from the neighbouring cell
        # across the atlas cut. Remove only secondary components touching a
        # vertical cell boundary; retain the largest (the intended actor).
        fg_labels, fg_count = ndimage.label(foreground)
        if fg_count:
            areas = np.bincount(fg_labels.ravel())
            actor_label = int(np.argmax(areas[1:]) + 1)
            for label_id in range(1, fg_count + 1):
                if label_id != actor_label and areas[label_id] < 100:
                    foreground[fg_labels == label_id] = False
            boundary_labels = np.unique(np.concatenate((fg_labels[:, 0], fg_labels[:, -1])))
            for label_id in boundary_labels:
                if label_id and label_id != actor_label:
                    foreground[fg_labels == label_id] = False

        ys, xs = np.nonzero(foreground)
        if not len(ys):
            raise ValueError(f"{source.name}: frame {index} has no foreground")

        # Normalize only the ground plane. Horizontal motion/pose offsets are
        # preserved so attacks and dodges retain their authored silhouettes.
        desired_bottom = height - max(16, round(height * 0.035))
        shift_y = desired_bottom - int(ys.max())
        shifted_rgb = np.zeros_like(cell)
        shifted_alpha = np.zeros((height, frame_width), dtype=np.uint8)
        src_y0 = max(0, -shift_y)
        src_y1 = min(height, height - shift_y)
        dst_y0 = max(0, shift_y)
        dst_y1 = dst_y0 + (src_y1 - src_y0)
        shifted_rgb[dst_y0:dst_y1] = cell[src_y0:src_y1]
        shifted_alpha[dst_y0:dst_y1] = foreground[src_y0:src_y1].astype(np.uint8) * 255

        out[:, x0:x1, :3] = shifted_rgb
        out[:, x0:x1, 3] = shifted_alpha

    target.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(target, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("frames", type=int)
    args = parser.parse_args()
    extract(args.source, args.target, args.frames)


if __name__ == "__main__":
    main()
