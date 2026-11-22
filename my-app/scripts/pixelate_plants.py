"""식물 성장 단계 이미지를 10단위 칸(도트) 이미지로 바꾸는 스크립트.

고해상도로 그려진 식물 이미지(characters/_source/{식물}/성장단계_원본/*_고해상도.png)를
화분·얼굴과 같은 격자(500×500 공간의 10단위 = 846×1254 캔버스에서 약 14.9px)에 맞춘 칸 그림으로 바꿔 characters/{식물}/{식물}_N.png 로 저장한다.
  - 칸마다 불투명한 픽셀의 평균색을 구하고, 식물별로 정한 색 수(k-means, Lab 색 공간)로 줄인다
  - 이웃과 색이 다른 고립된 잡티 칸은 이웃 색으로 정리하고, 이웃이 없는 외톨이 칸은 지운다
  python3 scripts/pixelate_plants.py [저장 폴더]   (Pillow, scikit-image, scikit-learn 필요. 저장 폴더를 주면 거기에 미리 만들어 봄)
식물별 색 수(PLANTS)를 바꾸면 느낌이 달라진다. 사람이 그린 메리골드(11색)가 기준.
"""
import os
import numpy as np
from collections import Counter
from PIL import Image
from skimage.color import rgb2lab, lab2rgb
from sklearn.cluster import KMeans

S = 641 / 430
OFFX, OFFY = 110 - 30 * S, 659 - 60 * S
CELL = 10 * S

def cells(a, thr):
    """캔버스를 500공간 10단위 칸으로 나눠 칸마다 (불투명 비율, 평균 Lab 색) 계산"""
    H, W = a.shape[:2]
    i0 = int(np.floor((0 - OFFX) / CELL)) - 1; i1 = int(np.ceil((W - OFFX) / CELL)) + 1
    j0 = int(np.floor((0 - OFFY) / CELL)) - 1; j1 = int(np.ceil((H - OFFY) / CELL)) + 1
    xs = [round(OFFX + CELL * i) for i in range(i0, i1 + 1)]
    ys = [round(OFFY + CELL * j) for j in range(j0, j1 + 1)]
    lab = rgb2lab(a[:, :, :3] / 255.0)
    out = {}
    for ji in range(len(ys) - 1):
        for ii in range(len(xs) - 1):
            x0, x1, y0, y1 = max(xs[ii], 0), min(xs[ii + 1], W), max(ys[ji], 0), min(ys[ji + 1], H)
            if x1 <= x0 or y1 <= y0: continue
            op = a[y0:y1, x0:x1, 3] > 128
            if op.mean() < thr: continue
            L = lab[y0:y1, x0:x1][op]
            out[(i0 + ii, j0 + ji)] = L.mean(axis=0)     # 칸 안 불투명 픽셀의 평균색
    return out, (i0, j0, xs, ys), (W, H)

def smooth(grid, rounds=1):
    """고립된 잡티 정리: 이웃 8칸 중 같은 색이 1개 이하이고, 이웃에서 한 색이 4칸 이상이면 그 색으로"""
    for _ in range(rounds):
        new = dict(grid)
        for (i, j), c in grid.items():
            nb = [grid.get((i + di, j + dj)) for di in (-1, 0, 1) for dj in (-1, 0, 1) if (di or dj)]
            nb = [n for n in nb if n is not None]
            same = sum(n == c for n in nb)
            if same <= 1 and nb:
                m, cnt = Counter(nb).most_common(1)[0]
                if cnt >= 4: new[(i, j)] = m
        grid = new
    return grid

EXTRA_DIST = 20      # 기준 팔레트와 이만큼(Lab 거리) 이상 다른 색은 그 단계 전용 색으로 따로 뽑음 (씨앗 갈색, 노란 꽃, 풋토마토 등)
EXTRA_MAX = 3        # 단계마다 따로 뽑는 전용 색 최대 개수

def build(src, colors, thr=0.5, min_nb=1, seed=0, pal_lab=None):
    """pal_lab가 있으면 그 팔레트(Lab)를 기본으로 쓰고(기준 단계의 색), 기준 팔레트에 없는 색만 단계 전용으로 몇 개 더 뽑는다.
    없으면 이 이미지에서 colors개를 새로 뽑는다(기준 단계)"""
    a = np.array(Image.open(src).convert('RGBA'))
    cl, meta, size = cells(a, thr)
    keys = list(cl); X = np.array([cl[k] for k in keys])
    if pal_lab is None:
        km = KMeans(n_clusters=colors, n_init=10, random_state=seed).fit(X)
        pal_lab = km.cluster_centers_
        labels = km.labels_
    else:
        d = np.sqrt(((X[:, None, :] - pal_lab[None, :, :]) ** 2).sum(2))
        labels = d.argmin(1)
        far = d.min(1) > EXTRA_DIST
        if far.sum() >= 3:
            ke = min(EXTRA_MAX, int(far.sum()))
            kme = KMeans(n_clusters=ke, n_init=10, random_state=seed).fit(X[far])
            labels = labels.copy(); labels[far] = len(pal_lab) + kme.labels_
            pal_lab = np.vstack([pal_lab, kme.cluster_centers_])
    pal = (np.clip(lab2rgb(pal_lab.reshape(1, -1, 3)), 0, 1).reshape(-1, 3) * 255).round().astype(np.uint8)
    grid = {k: int(l) for k, l in zip(keys, labels)}
    grid = smooth(grid, 2)
    keep = {}
    for (i, j), c in grid.items():
        if sum((i + di, j + dj) in grid for di, dj in ((1,0),(-1,0),(0,1),(0,-1))) >= min_nb: keep[(i, j)] = c
    return keep, pal, meta, size, pal_lab

def render(grid, pal, meta, size):
    i0, j0, xs, ys = meta; W, H = size
    out = np.zeros((H, W, 4), np.uint8)
    for (i, j), c in grid.items():
        x0, x1, y0, y1 = xs[i - i0], xs[i - i0 + 1], ys[j - j0], ys[j - j0 + 1]
        x0, x1, y0, y1 = max(x0, 0), min(x1, W), max(y0, 0), min(y1, H)
        out[y0:y1, x0:x1, :3] = pal[c]; out[y0:y1, x0:x1, 3] = 255
    return Image.fromarray(out)


ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images', 'characters')
# (식물, 원본 폴더, 기준 단계, 색 수(None = 기준 단계 그림의 색을 그대로 팔레트로 씀), 바꿀 단계 목록)
# 모든 단계가 같은 팔레트를 쓰도록, 기준 단계(마지막 단계)의 색으로 나머지 단계도 칠한다.
# 메리골드는 사람이 직접 그린 6단계의 11색을 팔레트로 쓰고, 6단계는 그대로 둔다(1~3단계만 변환).
# 4·5단계는 아래 marigold_flower_stages()가 따로 만든다
PLANTS = [
    ('basil',    '바질',   8, 10,   range(1, 9)),
    ('tomato',   '토마토', 8, 9,    range(1, 9)),
    ('marigold', '메리골드', 6, None, range(1, 4)),
]

def exact_palette_lab(path):
    """이미 칸 그림인 이미지의 색(불투명한 색 전부)을 Lab 팔레트로"""
    a = np.array(Image.open(path).convert('RGBA'))
    cols = np.unique(a[a[:, :, 3] > 128][:, :3], axis=0)
    return rgb2lab(cols.reshape(1, -1, 3) / 255.0).reshape(-1, 3)

# 메리골드 4·5단계 꽃: 원본은 바로 윗단계 꽃을 그대로 줄여 붙여서 도트가 칸(10단위)보다 작았다.
# 사람이 그린 6단계 꽃(25×24칸)의 칸 그림을 5단계 꽃(17×16칸)으로, 그 5단계 꽃을 4단계 꽃(11×10칸)으로 줄여 다시 만든 것.
# 줄여서 칸 색을 정할 때는 바깥 밝은 고리·안쪽 어두운 중심의 구조가 남도록 겹친 면적이 가장 큰 색을 골랐다.
# 숫자는 6단계 그림의 색 번호 (아래 M_COLORS). 가운데 열이 줄기 위, 맨 아래 줄이 꽃받침.
M_COLORS = {'0': (53, 105, 1), '1': (135, 141, 28), '2': (155, 191, 14), '3': (204, 57, 1), '4': (232, 75, 1),
            '5': (251, 96, 1), '6': (252, 109, 1), '7': (254, 130, 1), '8': (254, 157, 2), '9': (254, 173, 1)}
M5_FLOWER = [
    '.......666.......',
    '....655699956....',
    '...57957888595...',
    '..6799875558896..',
    '.699976577557794.',
    '.598644999994744.',
    '.4575768889944455',
    '68443987445683454',
    '69753384334633444',
    '58755433333344544',
    '.877754433345568.',
    '.459888455567778.',
    '.359899557778883.',
    '..3333339893333..',
    '....343399933....',
    '.......333.......',
]
M4_FLOWER = [
    '....669....',
    '..5958855..',
    '.699875579.',
    '.9844999444',
    '64498456445',
    '67533333344',
    '87754334568',
    '.598855778.',
    '.333399333.',
    '....339....',
]
M_CENTER_COL = 24      # 줄기 가운데 칸 번호 (4~6단계 공통)
M_BOTTOM_ROW = -4      # 맨 아래 줄(꽃받침) 칸 번호. 이보다 아래(잎·줄기)는 원본 그대로 둔다
M_FLOWERS = {4: M4_FLOWER, 5: M5_FLOWER}

def marigold_flower_stages(out_root=None):
    for n, flower in M_FLOWERS.items():
        src = os.path.join(ROOT, '_source', '메리골드', '성장단계_원본', f'marigold_{n}_고해상도.png')
        img = Image.open(src).convert('RGBA')
        cut = round(OFFY + CELL * (M_BOTTOM_ROW + 1))               # 꽃받침 아래 칸 경계(캔버스 y)
        arr = np.array(img); arr[:cut] = 0; img = Image.fromarray(arr)   # 옛 꽃 지우기 (잎·줄기는 이미 칸 그림이라 유지)
        ox = M_CENTER_COL - len(flower[0]) // 2
        oy = M_BOTTOM_ROW - (len(flower) - 1)
        for ty, row in enumerate(flower):
            for tx, ch in enumerate(row):
                if ch == '.': continue
                i, j = ox + tx, oy + ty
                x0, x1 = round(OFFX + CELL * i), round(OFFX + CELL * (i + 1))
                y0, y1 = round(OFFY + CELL * j), round(OFFY + CELL * (j + 1))
                img.paste(Image.new('RGBA', (x1 - x0, y1 - y0), M_COLORS[ch] + (255,)), (x0, y0))
        dst = os.path.join(out_root or ROOT, 'marigold', f'marigold_{n}.png')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        img.save(dst)
        print('saved', f'marigold/marigold_{n}.png', '(윗단계 꽃을 칸 그림으로 줄여 다시 만듦)')

def run(out_root=None):
    for plant, folder, ref, k, stages in PLANTS:
        def src(n): return os.path.join(ROOT, '_source', folder, '성장단계_원본', f'{plant}_{n}_고해상도.png')
        if k is None:
            pal_lab = exact_palette_lab(os.path.join(ROOT, plant, f'{plant}_{ref}.png'))
        else:
            _, _, _, _, pal_lab = build(src(ref), k)          # 기준 단계에서 팔레트만 뽑음
        for n in stages:
            g, pal, meta, size, _ = build(src(n), k or len(pal_lab), pal_lab=pal_lab)
            dst = os.path.join(out_root or ROOT, plant, f'{plant}_{n}.png')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            render(g, pal, meta, size).save(dst)
            print('saved', f'{plant}/{plant}_{n}.png', len(g), 'cells')

if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else None
    run(out)
    marigold_flower_stages(out)
