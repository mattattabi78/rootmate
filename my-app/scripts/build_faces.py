"""화분 얼굴 이미지(face_v2) 생성 스크립트.

원본(assets/images/characters/_source/{바질,토마토,메리골드}/{표정 폴더}) 레이어를 식물별로 위치·크기를 조정해 합성한다.
  python3 scripts/build_faces.py            (Pillow 필요: pip install pillow)

얼굴 종류(kind)
  default : 기본 표정             (모든 식물)
  neutral : 무표정               (모든 식물. 바질은 우는 입·눈썹 + 기본 눈)
  tear    : 눈물 (눈물 3프레임은 별도 레이어 t1~t3)  (모든 식물)
  cry     : 더 슬픈 눈물 (감은 눈 + 눈물 3프레임, 메리골드)
  surprise: 놀람 (입 고정 + 커진 눈, 눈 깜빡임은 기본과 같은 타이머)  (바질)
  sleep   : 자는 얼굴 (기분 좋음(happy)의 웃는 눈 ^^을 위아래로 뒤집은 감은 눈 ∪∪, 깜빡임 없음)  (모든 식물, 밤 12시~새벽 6시)
  ※ 바질의 웃는 얼굴이 곧 기본(default)이라 바질 smile 종류는 따로 만들지 않는다 (smile 표정은 기본 얼굴로 대체)

식물별 조정값 (ADJUST):
  dy  : 얼굴 전체(눈썹·볼·입·눈·눈물)를 아래로 내리는 양 (원본 500×500 기준 px, +아래)
  eye : 눈 크기 배율 (1 = 원본). 눈과 눈물은 눈 뜬 이미지의 중심을 기준으로 키우고 줄인다.
        (원본 눈 블록이 10px이라 1.2·0.8처럼 블록이 딱 떨어지는 값이 깔끔함)

출력 (face_v2/, 식물별 폴더 + 효과 폴더)
  face_v2/{plant}/layers/     레이어용(846×1254, pot_layer와 정렬): {plant}_[{kind}_]{open|half|closed}.png, {plant}_tear_t{1,2,3}.png
  face_v2/{plant}/overlays/   오버레이용(500×500, 얼굴 중심 정렬):  {plant}_[{kind}_]overlay_{open|half|closed}.png, {plant}_tear_overlay_t{1,2,3}.png
  face_v2/fx/                 효과(하트·음표·물방울·Z): fx_{plant}_heart_{1,2,3}.png, fx_{plant}_note_{1,2,3}.png, fx_drop_{1,2,3}.png, fx_z_{1,2,3}.png
  (default 종류는 이름에 kind를 붙이지 않는다. 파일 이름에는 식물 이름을 그대로 둬서 검색하기 쉽게 함)
"""
import glob, os, unicodedata
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images', 'characters')
SRC = os.path.join(ROOT, '_source')   # 원본 표정 레이어
OUT = os.path.join(ROOT, 'face_v2')
STATES = ['open', 'half', 'closed']

ADJUST = {
    'basil':    {'dy': 0,  'eye': 1.0},
    'tomato':   {'dy': 30, 'eye': 1.0},
    'marigold': {'dy': 0,  'eye': 1.0},
}

# 원본 폴더 (식물 → 종류 → 폴더)
DIRS = {
    'basil':    {'default': '바질/기본', 'neutral': '바질/무표정', 'tear': '바질/눈물', 'surprise': '바질/놀람',
                 'wink': '바질/윙크하트', 'happy': '바질/음표'},
    'tomato':   {'default': '토마토/기본', 'neutral': '토마토/무표정', 'tear': '토마토/눈물',
                 'wink': '토마토/윙크하트', 'happy': '토마토/음표'},
    'marigold': {'default': '메리골드/기본', 'neutral': '메리골드/무표정', 'tear': '메리골드/눈물', 'cry': '메리골드/오열',
                 'wink': '메리골드/윙크하트', 'happy': '메리골드/음표'},
}
# 얼굴과 따로 움직이는 효과 이미지(하트·음표·물방울) 원본 폴더 (물방울은 식물 공통)
DROP_DIR = '공통/물방울'

# pot.png(500×500)의 화분 영역(30,60,460,440) → 846×1254 캔버스의 화분 영역(110,659) 로 옮기는 변환 (pot_layer.png와 동일)
S = 641 / 430
OFF = (110 - 30 * S, 659 - 60 * S)
SZ = round(500 * S)


def load(d, prefix):
    # 파일명은 '02_바질_...png' 또는 메리골드의 '02.png' 형태
    hits = sorted(glob.glob(os.path.join(SRC, d, f'{prefix}_*.png')) + glob.glob(os.path.join(SRC, d, f'{prefix}.png')))
    return Image.open(hits[0]).convert('RGBA')


def load_named(d, name):
    """이름에 name이 들어 있는 파일 (바질_웃음 폴더용). 100×100으로 그려져 있어 5배(NEAREST)로 키워 500×500에 맞춘다."""
    hits = [h for h in sorted(glob.glob(os.path.join(SRC, d, '*.png')))
            if name in unicodedata.normalize('NFC', os.path.basename(h))]
    img = Image.open(hits[0]).convert('RGBA')
    return img.resize((500, 500), Image.NEAREST) if img.size != (500, 500) else img


def spec(plant, kind):
    """(base 이미지, {상태: 눈 이미지}, [눈물 또는 놀람 3프레임] 또는 None)"""
    D = DIRS[plant]
    if kind == 'wink':
        # 윙크(터치 반응): 02 = 눈썹·볼·입, 03 = 왼쪽 눈(고정), 04 = 오른쪽 눈 뜸, 05 = 반쯤, 06 = 오른쪽 윙크 → open / half / closed(윙크)
        d = D['wink']; left = load(d, '03')
        return load(d, '02'), {'open': Image.alpha_composite(left, load(d, '04')), 'half': Image.alpha_composite(left, load(d, '05')),
                               'closed': Image.alpha_composite(left, load(d, '06'))}, None
    if kind == 'happy':
        # 기분 좋음(쓰다듬기): 02 = 눈썹·볼·입, 04 = 웃는 눈(^^). 깜빡이지 않고 세 상태 모두 같은 얼굴
        d = D['happy']; eyes = load(d, '04')
        return load(d, '02'), {s: eyes for s in STATES}, None
    if kind == 'sleep':
        # 자는 얼굴(밤 12시~새벽 6시): 기분 좋음(happy)의 얼굴에서 웃는 눈(^^)만 위아래로 뒤집어 감은 눈(∪∪)으로 만든다.
        #   눈썹·볼·입은 happy와 같고, 깜빡이지 않아 세 눈 상태가 모두 같은 얼굴
        base, eyes, _ = spec(plant, 'happy')
        e = eyes['open']
        bb = e.getchannel('A').getbbox()
        flipped = e.copy()
        flipped.paste(Image.new('RGBA', (bb[2] - bb[0], bb[3] - bb[1]), (0, 0, 0, 0)), (bb[0], bb[1]))
        flipped.alpha_composite(ImageOps.flip(e.crop(bb)), (bb[0], bb[1]))
        return base, {s: flipped for s in STATES}, None
    if kind == 'default':
        d = D['default']
        # 눈은 기본 폴더 그대로. 입(볼·입 이미지)은 바질·메리골드는 새 표정 세트(윙크하트)의 것을 쓰고,
        # 토마토는 기본 폴더의 02(볼은 그대로, 입만 새 입으로 교체해 둔 것)를 쓴다
        base = load(d, '02') if plant == 'tomato' else load(D['wink'], '02')
        return base, {'closed': load(d, '03'), 'half': load(d, '04'), 'open': load(d, '05')}, None
    if kind == 'neutral':
        d = D['neutral']
        return load(d, '02'), {'closed': load(d, '03'), 'half': load(d, '04'), 'open': load(d, '05')}, None
    if kind == 'surprise':
        # 놀람(바질): 입은 고정, 눈만 커진 채로 공용 깜빡임 타이머(비정기)에 따라 깜빡인다.
        #   베이스 = 볼(02) + 입(04 = 놀람 2단계의 입, y 330 이하 제외)
        #   open   = 놀람 3단계의 눈썹·큰 눈(y < 330)
        #   half/closed = 놀람 3단계의 눈썹(y < 250) + 기본 눈 반쯤/감음 (큰 눈을 감는 그림이 따로 없어서 기본 눈을 쓴다)
        d = D['surprise']; dd = D['default']
        def rows(img, y0, y1):
            out = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
            out.paste(img.crop((0, y0, 500, y1)), (0, y0))
            return out
        wide = load(d, '05')
        mouth = rows(load(d, '04'), 330, 500)
        base = Image.alpha_composite(load(d, '02'), mouth)
        brows = rows(wide, 0, 250)
        return base, {'open': rows(wide, 0, 330),
                      'half': Image.alpha_composite(brows, load(dd, '04')),
                      'closed': Image.alpha_composite(brows, load(dd, '03'))}, None
    # tear / cry
    d = D[kind]
    if plant == 'basil':
        # v3: 02 = 눈썹·볼·우는 입, 03 = 우는 눈(감음), 04 = 우는 눈(뜸), 05~07 = 눈물 1~3단계
        return load(d, '02'), {'closed': load(d, '03'), 'half': load(d, '04'), 'open': load(d, '04')}, [load(d, '05'), load(d, '06'), load(d, '07')]
    if plant == 'marigold':
        # 눈썹·볼·우는 입(02) + 우는 눈(03) 고정, 눈물 04~06
        # (눈물v1은 03번 파일명이 '03_눈.png' 이지만 load()가 접두사로 찾는다)
        cry = load(d, '03')
        return load(d, '02'), {s: cry for s in STATES}, [load(d, '04'), load(d, '05'), load(d, '06')]
    # 토마토·메리골드: 무표정 입 + 눈물 폴더의 눈 + 눈물 06~08
    base = load(D['neutral'], '02')
    eyes = {'closed': load(d, '03'), 'half': load(d, '04'), 'open': load(d, '05')}
    return base, eyes, [load(d, '06'), load(d, '07'), load(d, '08')]


def scaled(img, k, pivot):
    n = round(500 * k)
    return img.resize((n, n), Image.NEAREST), (pivot[0] * k, pivot[1] * k)


def build(plant):
    adj = ADJUST[plant]
    dy, e = adj['dy'], adj['eye']
    pb = spec(plant, 'default')[1]['open'].getchannel('A').getbbox()
    pivot = ((pb[0] + pb[2]) / 2, (pb[1] + pb[3]) / 2)

    def eye_layer(img):
        """눈·눈물 레이어: pivot 기준 e배, 아래로 dy (500×500 공간)"""
        big, p = scaled(img, e, pivot)
        layer = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
        layer.paste(big, (round(pivot[0] - p[0]), round(pivot[1] + dy - p[1])), big)
        return layer

    def save(img500, name, center):
        r = img500.resize((SZ, SZ), Image.NEAREST)
        c = Image.new('RGBA', (846, 1254), (0, 0, 0, 0))
        c.paste(r, (round(OFF[0]), round(OFF[1])), r)
        out_path(plant, 'layers', name, c)

    def save_overlay(img500, name, center):
        o = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
        o.paste(img500, (250 - center[0], 250 - center[1]), img500)
        out_path(plant, 'overlays', name, o)

    default_center = None
    for kind in list(DIRS[plant]) + ['sleep']:
        base, eyes, tears = spec(plant, kind)
        shifted = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
        shifted.alpha_composite(base, (0, dy))
        faces = {st: Image.alpha_composite(shifted, eye_layer(eyes[st])) for st in STATES}
        bb = faces['open'].getchannel('A').getbbox()
        center = ((bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2)
        if kind == 'default':
            default_center = center
        elif kind in ('surprise', 'wink', 'happy', 'sleep'):
            center = default_center   # 놀람·윙크·기분 좋음·자는 얼굴은 기본 얼굴 기준점을 쓴다 (종류가 바뀌어도 위치 유지)
        pre = plant if kind == 'default' else f'{plant}_{kind}'
        for st, face in faces.items():
            save(face, f'{pre}_{st}', center)
            save_overlay(face, f'{plant}_overlay_{st}' if kind == 'default' else f'{pre}_overlay_{st}', center)
        if tears:
            tag = 's' if kind == 'surprise' else 't'
            for i, t in enumerate(tears, 1):
                tl = eye_layer(t)
                save(tl, f'{plant}_{kind}_{tag}{i}', center)
                save_overlay(tl, f'{plant}_{kind}_overlay_{tag}{i}', center)


def out_path(top, sub, name, img):
    """face_v2/{식물}/{layers|overlays}/{이름}.png, 효과는 face_v2/fx/{이름}.png 로 저장"""
    d = os.path.join(OUT, top, sub) if sub else os.path.join(OUT, top)
    os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, f'{name}.png'))


def save_canvas(img500, name):
    """효과 이미지(500×500)를 846×1254 레이어 캔버스에 맞춰 저장 (얼굴과 달리 dy를 적용하지 않음 — 화분 옆·위 고정 위치)"""
    r = img500.resize((SZ, SZ), Image.NEAREST)
    c = Image.new('RGBA', (846, 1254), (0, 0, 0, 0))
    c.paste(r, (round(OFF[0]), round(OFF[1])), r)
    out_path('fx', None, name, c)


# 자는 얼굴의 Z 효과: 10단위 칸으로 그린 Z 글자가 화분 오른쪽 위로 점점 커지며 올라간다 (식물 공통)
Z_COLOR = (25, 28, 27, 255)   # 앱의 검정에 가까운 글자색 COLORS.textInk #191c1b
Z_FRAMES = [   # 프레임마다 [(칸 크기, 왼쪽 위 x, y)] (500×500 공간, 10의 배수)
    [(4, 440, 270)],
    [(4, 450, 220), (5, 420, 140)],
    [(5, 440, 130), (6, 410, 30)],
]


def draw_z(img, n, x, y):
    """n×n칸 Z: 윗줄 · 대각선(오른쪽 위 → 왼쪽 아래) · 아랫줄. 한 칸 = 10px"""
    cells = {(c, 0) for c in range(n)} | {(c, n - 1) for c in range(n)} | {(n - 1 - r, r) for r in range(n)}
    for (c, r) in cells:
        img.paste(Z_COLOR, (x + c * 10, y + r * 10, x + c * 10 + 10, y + r * 10 + 10))


def build_fx():
    """효과 레이어: fx_{식물}_heart_{1,2,3} (윙크 하트), fx_{식물}_note_{1,2,3} (음표 2~4단계), fx_drop_{1,2,3} (물방울, 식물 공통)"""
    for plant, D in DIRS.items():
        for i, pre in enumerate(['07', '08', '09'], 1):
            save_canvas(load(D['wink'], pre), f'fx_{plant}_heart_{i}')
        for i, pre in enumerate(['05', '06', '07'], 1):
            save_canvas(load(D['happy'], pre), f'fx_{plant}_note_{i}')
    for i, pre in enumerate(['01', '02', '03'], 1):
        save_canvas(load(DROP_DIR, pre), f'fx_drop_{i}')
    for i, zs in enumerate(Z_FRAMES, 1):
        img = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
        for n, x, y in zs:
            draw_z(img, n, x, y)
        save_canvas(img, f'fx_z_{i}')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for p in DIRS:
        build(p)
        print('built', p)
    build_fx()
    print('built fx')
