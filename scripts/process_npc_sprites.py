import os
import sys
from PIL import Image
import numpy as np
from collections import deque

def remove_white_background(src_path: str, dst_path: str):
    print(f"Processing {src_path} -> {dst_path}...")
    img = Image.open(src_path).convert("RGBA")
    arr = np.array(img)
    h, w, _ = arr.shape

    # Criteria for near-white background
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    chroma = max_c - min_c
    is_white_candidate = (min_c >= 235) & (chroma <= 18)

    # Breadth-first search / flood fill starting from outer borders
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # Seed top and bottom borders
    for x in range(w):
        if is_white_candidate[0, x]:
            visited[0, x] = True
            queue.append((0, x))
        if is_white_candidate[h - 1, x]:
            visited[h - 1, x] = True
            queue.append((h - 1, x))

    # Seed left and right borders
    for y in range(h):
        if is_white_candidate[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            queue.append((y, 0))
        if is_white_candidate[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            queue.append((y, w - 1))

    # 4-connectivity flood fill
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_white_candidate[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    # visited contains only the connected outer background
    # Set alpha of background to 0
    alpha = arr[:, :, 3].copy()
    alpha[visited] = 0

    # Smooth the border transition (anti-aliasing)
    # Find pixels adjacent to background that are very light (fringe pixels)
    fringe = (~visited) & (min_c >= 220) & (chroma <= 25)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if fringe[y, x]:
                # count background neighbors
                bg_neighbors = visited[y-1:y+2, x-1:x+2].sum()
                if bg_neighbors > 0:
                    alpha[y, x] = int(255 * (1.0 - (bg_neighbors / 9.0) * 0.85))

    arr[:, :, 3] = alpha
    out_img = Image.fromarray(arr, "RGBA")
    
    # Auto-crop unnecessary outer transparent padding while keeping a small 10px margin
    bbox = out_img.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        x0 = max(0, x0 - 8)
        y0 = max(0, y0 - 8)
        x1 = min(w, x1 + 8)
        y1 = min(h, y1 + 8)
        out_img = out_img.crop((x0, y0, x1, y1))

    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    out_img.save(dst_path, "PNG")
    print(f"Saved {dst_path} ({out_img.width}x{out_img.height})")

if __name__ == "__main__":
    tasks = [
        (
            r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\34d4c7cc-8bc3-4fd3-ad26-ddbc94d6aa88\chiba_vendor_1790519280174.jpg",
            r"public\assets\npc\chiba\chiba_idle.png"
        ),
        (
            r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\34d4c7cc-8bc3-4fd3-ad26-ddbc94d6aa88\chubay_mechanic_1790519303385.jpg",
            r"public\assets\npc\chubay\chubay_idle.png"
        ),
        (
            r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\34d4c7cc-8bc3-4fd3-ad26-ddbc94d6aa88\banam_balcony_1790519321426.jpg",
            r"public\assets\npc\banam\banam_idle.png"
        ),
        (
            r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\34d4c7cc-8bc3-4fd3-ad26-ddbc94d6aa88\be_bo_brat_1790519409735.jpg",
            r"public\assets\npc\brat\brat_idle.png"
        ),
    ]

    for src, dst in tasks:
        if os.path.exists(src):
            remove_white_background(src, dst)
        else:
            print(f"Missing source: {src}")
