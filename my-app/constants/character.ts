// @ts-nocheck
/* eslint-disable @typescript-eslint/no-var-requires */
// 식물 캐릭터 이미지 상수 — 모든 require()는 정적 경로 필수
export type PlantType  = 'basil' | 'tomato' | 'marigold';
export type GrowthStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
// 표정 = 화분 얼굴 종류. 식물에 없는 얼굴은 getFaceKind()가 대체한다 (cry → tear, 나머지 → default)
export type Expression = 'default' | 'smile' | 'neutral' | 'tear' | 'cry' | 'surprise';

// 화분 (공통)
// 레이어용(846×1254 캔버스, 식물·표정 레이어와 위치 정렬) / 원본(500×500, AI 합성 참고용)
export const POT_IMAGE = require('../assets/images/characters/pot_layer.png');
export const POT_REFERENCE_IMAGE = require('../assets/images/characters/pot.png');

// 화분 얼굴 v2 (프레임 있는 버전). 이미지는 scripts/build_faces.py 로 만든다.
//   - 얼굴 종류: default(기본) / smile(웃음, 바질) / neutral(무표정) / tear(눈물) / cry(더 슬픈 눈물, 메리골드) / surprise(놀람, 바질)
//   - 눈 상태(open·half·closed)로 깜빡이고, tear는 눈물 3프레임(t1→t2→t3)이 흐름
//   - 표정 이름(Expression)은 getFaceKind()로 얼굴 종류에 연결
export type EyeState = 'open' | 'half' | 'closed';
export type FaceKind = Expression;
export interface FaceSet {
  /** 레이어용: 846×1254 캔버스, POT_IMAGE·식물 레이어와 위치 정렬 */
  layers: Record<EyeState, any>;
  /** 오버레이용: 500×500 정사각형, 얼굴 중심이 이미지 중심 (AI 사진 캐릭터 위에 얹을 때) */
  overlays: Record<EyeState, any>;
  /** 3프레임 애니메이션 (tear: 눈물 t1→t3, surprise: 놀람 s1→s3) — layers/overlays와 같은 좌표계의 별도 레이어 */
  tears?: { layers: [any, any, any]; overlays: [any, any, any] };
  /** 애니메이션을 끈 정지 화면에서 보여줄 프레임 (0~2, 기본 1) */
  staticFrame?: number;
}
export const FACE_SETS: Record<PlantType, Partial<Record<FaceKind, FaceSet>> & { default: FaceSet }> = {
  basil: {
    default: {
      layers: {
        open: require('../assets/images/characters/face_v2/basil_open.png'),
        half: require('../assets/images/characters/face_v2/basil_half.png'),
        closed: require('../assets/images/characters/face_v2/basil_closed.png'),
      },
      overlays: {
        open: require('../assets/images/characters/face_v2/basil_overlay_open.png'),
        half: require('../assets/images/characters/face_v2/basil_overlay_half.png'),
        closed: require('../assets/images/characters/face_v2/basil_overlay_closed.png'),
      },
    },
    smile: {
      layers: { open: require('../assets/images/characters/face_v2/basil_smile_open.png'), half: require('../assets/images/characters/face_v2/basil_smile_half.png'), closed: require('../assets/images/characters/face_v2/basil_smile_closed.png') },
      overlays: { open: require('../assets/images/characters/face_v2/basil_smile_overlay_open.png'), half: require('../assets/images/characters/face_v2/basil_smile_overlay_half.png'), closed: require('../assets/images/characters/face_v2/basil_smile_overlay_closed.png') },
    },
    neutral: {
      layers: { open: require('../assets/images/characters/face_v2/basil_neutral_open.png'), half: require('../assets/images/characters/face_v2/basil_neutral_half.png'), closed: require('../assets/images/characters/face_v2/basil_neutral_closed.png') },
      overlays: { open: require('../assets/images/characters/face_v2/basil_neutral_overlay_open.png'), half: require('../assets/images/characters/face_v2/basil_neutral_overlay_half.png'), closed: require('../assets/images/characters/face_v2/basil_neutral_overlay_closed.png') },
    },
    tear: {
      layers: {
        open: require('../assets/images/characters/face_v2/basil_tear_open.png'),
        half: require('../assets/images/characters/face_v2/basil_tear_half.png'),
        closed: require('../assets/images/characters/face_v2/basil_tear_closed.png'),
      },
      overlays: {
        open: require('../assets/images/characters/face_v2/basil_tear_overlay_open.png'),
        half: require('../assets/images/characters/face_v2/basil_tear_overlay_half.png'),
        closed: require('../assets/images/characters/face_v2/basil_tear_overlay_closed.png'),
      },
      tears: {
        layers: [require('../assets/images/characters/face_v2/basil_tear_t1.png'), require('../assets/images/characters/face_v2/basil_tear_t2.png'), require('../assets/images/characters/face_v2/basil_tear_t3.png')],
        overlays: [require('../assets/images/characters/face_v2/basil_tear_overlay_t1.png'), require('../assets/images/characters/face_v2/basil_tear_overlay_t2.png'), require('../assets/images/characters/face_v2/basil_tear_overlay_t3.png')],
      },
    },
    surprise: {
      layers: { open: require('../assets/images/characters/face_v2/basil_surprise_open.png'), half: require('../assets/images/characters/face_v2/basil_surprise_open.png'), closed: require('../assets/images/characters/face_v2/basil_surprise_open.png') },
      overlays: { open: require('../assets/images/characters/face_v2/basil_surprise_overlay_open.png'), half: require('../assets/images/characters/face_v2/basil_surprise_overlay_open.png'), closed: require('../assets/images/characters/face_v2/basil_surprise_overlay_open.png') },
      tears: {
        layers: [require('../assets/images/characters/face_v2/basil_surprise_s1.png'), require('../assets/images/characters/face_v2/basil_surprise_s2.png'), require('../assets/images/characters/face_v2/basil_surprise_s3.png')],
        overlays: [require('../assets/images/characters/face_v2/basil_surprise_overlay_s1.png'), require('../assets/images/characters/face_v2/basil_surprise_overlay_s2.png'), require('../assets/images/characters/face_v2/basil_surprise_overlay_s3.png')],
      },
      staticFrame: 2,
    },
  },
  tomato: {
    default: {
      layers: {
        open: require('../assets/images/characters/face_v2/tomato_open.png'),
        half: require('../assets/images/characters/face_v2/tomato_half.png'),
        closed: require('../assets/images/characters/face_v2/tomato_closed.png'),
      },
      overlays: {
        open: require('../assets/images/characters/face_v2/tomato_overlay_open.png'),
        half: require('../assets/images/characters/face_v2/tomato_overlay_half.png'),
        closed: require('../assets/images/characters/face_v2/tomato_overlay_closed.png'),
      },
    },
    neutral: {
      layers: {
        open: require('../assets/images/characters/face_v2/tomato_neutral_open.png'),
        half: require('../assets/images/characters/face_v2/tomato_neutral_half.png'),
        closed: require('../assets/images/characters/face_v2/tomato_neutral_closed.png'),
      },
      overlays: {
        open: require('../assets/images/characters/face_v2/tomato_neutral_overlay_open.png'),
        half: require('../assets/images/characters/face_v2/tomato_neutral_overlay_half.png'),
        closed: require('../assets/images/characters/face_v2/tomato_neutral_overlay_closed.png'),
      },
    },
    tear: {
      layers: {
        open: require('../assets/images/characters/face_v2/tomato_tear_open.png'),
        half: require('../assets/images/characters/face_v2/tomato_tear_half.png'),
        closed: require('../assets/images/characters/face_v2/tomato_tear_closed.png'),
      },
      overlays: {
        open: require('../assets/images/characters/face_v2/tomato_tear_overlay_open.png'),
        half: require('../assets/images/characters/face_v2/tomato_tear_overlay_half.png'),
        closed: require('../assets/images/characters/face_v2/tomato_tear_overlay_closed.png'),
      },
      tears: {
        layers: [require('../assets/images/characters/face_v2/tomato_tear_t1.png'), require('../assets/images/characters/face_v2/tomato_tear_t2.png'), require('../assets/images/characters/face_v2/tomato_tear_t3.png')],
        overlays: [require('../assets/images/characters/face_v2/tomato_tear_overlay_t1.png'), require('../assets/images/characters/face_v2/tomato_tear_overlay_t2.png'), require('../assets/images/characters/face_v2/tomato_tear_overlay_t3.png')],
      },
    },
  },
  marigold: {
    default: {
      layers: {
        open: require('../assets/images/characters/face_v2/marigold_open.png'),
        half: require('../assets/images/characters/face_v2/marigold_half.png'),
        closed: require('../assets/images/characters/face_v2/marigold_closed.png'),
      },
      overlays: {
        open: require('../assets/images/characters/face_v2/marigold_overlay_open.png'),
        half: require('../assets/images/characters/face_v2/marigold_overlay_half.png'),
        closed: require('../assets/images/characters/face_v2/marigold_overlay_closed.png'),
      },
    },
    neutral: {
      layers: {
        open: require('../assets/images/characters/face_v2/marigold_neutral_open.png'),
        half: require('../assets/images/characters/face_v2/marigold_neutral_half.png'),
        closed: require('../assets/images/characters/face_v2/marigold_neutral_closed.png'),
      },
      overlays: {
        open: require('../assets/images/characters/face_v2/marigold_neutral_overlay_open.png'),
        half: require('../assets/images/characters/face_v2/marigold_neutral_overlay_half.png'),
        closed: require('../assets/images/characters/face_v2/marigold_neutral_overlay_closed.png'),
      },
    },
    tear: {
      layers: {
        open: require('../assets/images/characters/face_v2/marigold_tear_open.png'),
        half: require('../assets/images/characters/face_v2/marigold_tear_half.png'),
        closed: require('../assets/images/characters/face_v2/marigold_tear_closed.png'),
      },
      overlays: {
        open: require('../assets/images/characters/face_v2/marigold_tear_overlay_open.png'),
        half: require('../assets/images/characters/face_v2/marigold_tear_overlay_half.png'),
        closed: require('../assets/images/characters/face_v2/marigold_tear_overlay_closed.png'),
      },
      tears: {
        layers: [require('../assets/images/characters/face_v2/marigold_tear_t1.png'), require('../assets/images/characters/face_v2/marigold_tear_t2.png'), require('../assets/images/characters/face_v2/marigold_tear_t3.png')],
        overlays: [require('../assets/images/characters/face_v2/marigold_tear_overlay_t1.png'), require('../assets/images/characters/face_v2/marigold_tear_overlay_t2.png'), require('../assets/images/characters/face_v2/marigold_tear_overlay_t3.png')],
      },
    },
    cry: {
      layers: { open: require('../assets/images/characters/face_v2/marigold_cry_open.png'), half: require('../assets/images/characters/face_v2/marigold_cry_half.png'), closed: require('../assets/images/characters/face_v2/marigold_cry_closed.png') },
      overlays: { open: require('../assets/images/characters/face_v2/marigold_cry_overlay_open.png'), half: require('../assets/images/characters/face_v2/marigold_cry_overlay_half.png'), closed: require('../assets/images/characters/face_v2/marigold_cry_overlay_closed.png') },
      tears: {
        layers: [require('../assets/images/characters/face_v2/marigold_cry_t1.png'), require('../assets/images/characters/face_v2/marigold_cry_t2.png'), require('../assets/images/characters/face_v2/marigold_cry_t3.png')],
        overlays: [require('../assets/images/characters/face_v2/marigold_cry_overlay_t1.png'), require('../assets/images/characters/face_v2/marigold_cry_overlay_t2.png'), require('../assets/images/characters/face_v2/marigold_cry_overlay_t3.png')],
      },
    },
  },
};

/** 표정 → 얼굴 종류. 그 식물에 없는 얼굴이면 cry는 눈물, 나머지는 웃는 얼굴로 대체한다 */
export function getFaceKind(plantType: PlantType, expression?: Expression): FaceKind {
  const sets = FACE_SETS[plantType];
  const kind = expression ?? 'default';
  if (sets[kind]) return kind;
  return kind === 'cry' && sets.tear ? 'tear' : 'default';
}

/** 표정에 맞는 얼굴 이미지 묶음 (없는 종류는 웃는 얼굴로 대체) */
export function getFaceSet(plantType: PlantType, expression?: Expression): FaceSet {
  const sets = FACE_SETS[plantType];
  return sets[getFaceKind(plantType, expression)] ?? sets.default;
}

// 성장 단계 이미지 (marigold 최대 6단계)
export const PLANT_IMAGES: Record<PlantType, Record<number, any>> = {
  basil: {
    1: require('../assets/images/characters/basil/basil_1.png'),
    2: require('../assets/images/characters/basil/basil_2.png'),
    3: require('../assets/images/characters/basil/basil_3.png'),
    4: require('../assets/images/characters/basil/basil_4.png'),
    5: require('../assets/images/characters/basil/basil_5.png'),
    6: require('../assets/images/characters/basil/basil_6.png'),
    7: require('../assets/images/characters/basil/basil_7.png'),
    8: require('../assets/images/characters/basil/basil_8.png'),
  },
  tomato: {
    1: require('../assets/images/characters/tomato/tomato_1.png'),
    2: require('../assets/images/characters/tomato/tomato_2.png'),
    3: require('../assets/images/characters/tomato/tomato_3.png'),
    4: require('../assets/images/characters/tomato/tomato_4.png'),
    5: require('../assets/images/characters/tomato/tomato_5.png'),
    6: require('../assets/images/characters/tomato/tomato_6.png'),
    7: require('../assets/images/characters/tomato/tomato_7.png'),
    8: require('../assets/images/characters/tomato/tomato_8.png'),
  },
  marigold: {
    1: require('../assets/images/characters/marigold/marigold_1.png'),
    2: require('../assets/images/characters/marigold/marigold_2.png'),
    3: require('../assets/images/characters/marigold/marigold_3.png'),
    4: require('../assets/images/characters/marigold/marigold_4.png'),
    5: require('../assets/images/characters/marigold/marigold_5.png'),
    6: require('../assets/images/characters/marigold/marigold_6.png'),
  },
};

// 식물별 사용 가능한 표정 목록 (dev 패널용) — 얼굴 세트가 있는 종류
export const PLANT_EXPRESSIONS = Object.fromEntries(
  Object.entries(FACE_SETS).map(([plant, sets]) => [plant, Object.keys(sets)]),
) as Record<PlantType, Expression[]>;

// 캐릭터 이미지 단계(최대 9개)와 이미지(6~8장)의 연결. 실제 앱은 1단계 이미지만 쓰고, 나머지는 개발자 메뉴의 UI 확인과 도감(마지막 단계)에서 쓴다.
// 두 단계로 나눈 구간은 같은 이미지를 공유한다.
//   바질 9단계 → 이미지 8장:      '15cm 이상 성장'(6)과 '순 따기'(7)가 이미지 6
//   방울토마토 9단계 → 이미지 8장: '15cm 이상 성장'(5)과 '정식 완료'(6)가 이미지 5
//   메리골드 7단계 → 이미지 6장:  '성장 중'(4)과 '옮겨심기'(5)가 이미지 4
const IMAGE_STAGE_MAP: Record<PlantType, Record<number, number>> = {
  basil:    { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 6, 8: 7, 9: 8 },
  tomato:   { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 5, 7: 6, 8: 7, 9: 8 },
  marigold: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 5, 7: 6 },
};

/** 캐릭터 이미지 단계 수 (개발자 메뉴 단계 선택·도감의 마지막 단계에 사용) */
export function getMaxStage(plantType: PlantType): number {
  return Object.keys(IMAGE_STAGE_MAP[plantType]).length;
}

// 단계 이미지 getter (단계 → 이미지 번호 매핑, 범위를 넘으면 해당 식물의 마지막 이미지)
export function getPlantImage(plantType: PlantType, stage: GrowthStage): any {
  const map = IMAGE_STAGE_MAP[plantType];
  const maxImage = Math.max(...Object.keys(PLANT_IMAGES[plantType]).map(Number));
  return PLANT_IMAGES[plantType][map[stage] ?? maxImage];
}
