"""화분 얼굴 이미지(face_v2) 생성 스크립트.

원본(assets/images/characters/_source/{바질v2,토마토v2,메리골드}) 레이어를 식물별로 위치·크기를 조정해 합성한다.
  python3 scripts/build_faces.py            (Pillow 필요: pip install pillow)

얼굴 종류(kind)
  default : 기본 표정             (모든 식물)
  neutral : 무표정               (모든 식물. 바질은 우는 입·눈썹 + 기본 눈)
  tear    : 눈물 (눈물 3프레임은 별도 레이어 t1~t3)  (모든 식물)
  cry     : 더 슬픈 눈물 (감은 눈 + 눈물 3프레임, 메리골드)
  surprise: 놀람 (입 고정 + 커진 눈, 눈 깜빡임은 기본과 같은 타이머)  (바질)
  ※ 바질의 웃는 얼굴이 곧 기본(default)이라 바질 smile 종류는 따로 만들지 않는다 (smile 표정은 기본 얼굴로 대체)

식물별 조정값 (ADJUST):
  dy  : 얼굴 전체(눈썹·볼·입·눈·눈물)를 아래로 내리는 양 (원본 500×500 기준 px, +아래)
  eye : 눈 크기 배율 (1 = 원본). 눈과 눈물은 눈 뜬 이미지의 중심을 기준으로 키우고 줄인다.
        (원본 눈 블록이 10px이라 1.2·0.8처럼 블록이 딱 떨어지는 값이 깔끔함)

출력 (face_v2/)
  레이어용(846×1254, pot_layer와 정렬):  {plant}_[{kind}_]{open|half|closed}.png, {plant}_tear_t{1,2,3}.png
  오버레이용(500×500, 얼굴 중심 정렬):   {plant}_[{kind}_]overlay_{open|half|closed}.png, {plant}_tear_overlay_t{1,2,3}.png
  (default 종류는 이름에 kind를 붙이지 않는다)
"""
import glob, os, unicodedata
from PIL import Image

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
    'basil':    {'default': '바질v2/바질_기본_v3', 'neutral': '바질v2/바질_기본_v3_무표정', 'tear': '바질v2/바질_기본_v3_눈물', 'surprise': '바질v2/바질_기본_v3_놀람'},
    'tomato':   {'default': '토마토v2', 'neutral': '토마토v2/토마토v2_무표정', 'tear': '토마토v2/토마토v2_눈물'},
    'marigold': {'default': '메리골드', 'neutral': '메리골드/메리골드_기본_무표정', 'tear': '메리골드/메리골드_눈물V2', 'cry': '메리골드/메리골드_눈물v1'},
}

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
    if kind == 'default':
        d = D['default']
        return load(d, '02'), {'closed': load(d, '03'), 'half': load(d, '04'), 'open': load(d, '05')}, None
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
        c.save(os.path.join(OUT, f'{name}.png'))

    def save_overlay(img500, name, center):
        o = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
        o.paste(img500, (250 - center[0], 250 - center[1]), img500)
        o.save(os.path.join(OUT, f'{name}.png'))

    default_center = None
    for kind in DIRS[plant]:
        base, eyes, tears = spec(plant, kind)
        shifted = Image.new('RGBA', (500, 500), (0, 0, 0, 0))
        shifted.alpha_composite(base, (0, dy))
        faces = {st: Image.alpha_composite(shifted, eye_layer(eyes[st])) for st in STATES}
        bb = faces['open'].getchannel('A').getbbox()
        center = ((bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2)
        if kind == 'default':
            default_center = center
        elif kind == 'surprise':
            center = default_center   # 놀람은 기본 얼굴 기준점을 쓴다 (종류가 바뀌어도 위치 유지)
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


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for p in DIRS:
        build(p)
        print('built', p)
