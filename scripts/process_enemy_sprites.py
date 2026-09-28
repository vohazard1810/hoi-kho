import os
from PIL import Image
import numpy as np
from collections import deque

def remove_white_background(src_path: str, dst_paths: list[str], crop_box=None):
    print(f"Processing {src_path}...")
    img = Image.open(src_path).convert("RGBA")
    if crop_box:
        img = img.crop(crop_box)
    
    arr = np.array(img)
    h, w, _ = arr.shape

    # Criteria for near-white background
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    chroma = max_c - min_c
    is_white_candidate = (min_c >= 235) & (chroma <= 20)

    # Breadth-first search / flood fill starting from outer borders
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    for x in range(w):
        if is_white_candidate[0, x]:
            visited[0, x] = True
            queue.append((0, x))
        if is_white_candidate[h - 1, x]:
            visited[h - 1, x] = True
            queue.append((h - 1, x))

    for y in range(h):
        if is_white_candidate[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            queue.append((y, 0))
        if is_white_candidate[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            queue.append((y, w - 1))

    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_white_candidate[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    alpha = arr[:, :, 3].copy()
    alpha[visited] = 0

    # Fringe anti-aliasing
    fringe = (~visited) & (min_c >= 215) & (chroma <= 30)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if fringe[y, x]:
                bg_neighbors = visited[y-1:y+2, x-1:x+2].sum()
                if bg_neighbors > 0:
                    alpha[y, x] = int(255 * (1.0 - (bg_neighbors / 9.0) * 0.85))

    arr[:, :, 3] = alpha
    out_img = Image.fromarray(arr, "RGBA")
    
    bbox = out_img.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        x0 = max(0, x0 - 8)
        y0 = max(0, y0 - 8)
        x1 = min(w, x1 + 8)
        y1 = min(h, y1 + 8)
        out_img = out_img.crop((x0, y0, x1, y1))

    for dst in dst_paths:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        out_img.save(dst, "PNG")
        print(f"Saved {dst} ({out_img.width}x{out_img.height})")

if __name__ == "__main__":
    art_dir = r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\34d4c7cc-8bc3-4fd3-ad26-ddbc94d6aa88"
    
    # 1. Loan Shark Enforcer (Giang Hồ F89)
    remove_white_background(
        os.path.join(art_dir, "loan_shark_thug_1790565287273.jpg"),
        [
            r"public\assets\enemies\enforcer\enforcer_idle.png",
            os.path.join(art_dir, "enemy_enforcer_preview.png")
        ]
    )

    # 2. Alley Guard (Bác Dân Phòng / Bảo Vệ Khiên)
    remove_white_background(
        os.path.join(art_dir, "alley_guard_1790565325382.jpg"),
        [
            r"public\assets\enemies\guard\guard_idle.png",
            os.path.join(art_dir, "enemy_guard_preview.png")
        ]
    )

    # 3. Saboteur Shipper (Shipper Gian Thương)
    remove_white_background(
        os.path.join(art_dir, "saboteur_rival_1790565375185.jpg"),
        [
            r"public\assets\enemies\saboteur\saboteur_idle.png",
            os.path.join(art_dir, "enemy_saboteur_preview.png")
        ]
    )

    # 4. Alley Rat (Chuột Cống - crop the main dynamic stalking rat on top-middle)
    # The sheet is 3:2, rat top-left is (0, 0, 520, 520), top-middle is (480, 0, 1050, 520)
    rat_src = os.path.join(art_dir, "alley_rat_1790565417887.jpg")
    img_rat = Image.open(rat_src)
    rw, rh = img_rat.size
    # Crop the top-middle menacing rat
    crop_rat = (int(rw * 0.28), 0, int(rw * 0.68), int(rh * 0.52))
    remove_white_background(
        rat_src,
        [
            r"public\assets\enemies\rat\rat_idle.png",
            os.path.join(art_dir, "enemy_rat_preview.png")
        ],
        crop_box=crop_rat
    )
