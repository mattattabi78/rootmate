// @ts-nocheck
/* eslint-disable @typescript-eslint/no-var-requires */
// 식물 캐릭터 이미지 상수 — 모든 require()는 정적 경로 필수
export type PlantType  = 'basil' | 'tomato' | 'marigold';
export type GrowthStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Expression =
  | 'default'
  | 'tear'
  | 'sparkle'
  | 'sad'
  | 'oh'
  | 'cry'
  | 'holding_tears'
  | 'smile'
  | 'heart'
  | 'sigh'
  | 'angry'
  | 'disappointed';

// 화분 (공통)
export const VASE_IMAGE = require('../assets/images/characters/vase.png');

// 프로필 이미지
export const PROFILE_IMAGES: Record<PlantType, any> = {
  basil:  require('../assets/images/characters/bajil_profile.png'),
  tomato: require('../assets/images/characters/tom_profile.png'),
  marigold:  require('../assets/images/characters/mar_profile.png'),
};

// 성장 단계 이미지 (marigold 최대 6단계)
export const PLANT_IMAGES: Record<PlantType, Record<number, any>> = {
  basil: {
    1: require('../assets/images/characters/bajil/bajil_1.png'),
    2: require('../assets/images/characters/bajil/bajil_2.png'),
    3: require('../assets/images/characters/bajil/bajil_3.png'),
    4: require('../assets/images/characters/bajil/bajil_4.png'),
    5: require('../assets/images/characters/bajil/bajil_5.png'),
    6: require('../assets/images/characters/bajil/bajil_6.png'),
    7: require('../assets/images/characters/bajil/bajil_7.png'),
    8: require('../assets/images/characters/bajil/bajil_8.png'),
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

// 표정 이미지
export const EXPRESSION_IMAGES: Record<PlantType, Partial<Record<Expression, any>>> = {
  basil: {
    default:       require('../assets/images/characters/bajil/face_exp/bajil_default.png'),
    tear:          require('../assets/images/characters/bajil/face_exp/bajil_tear.png'),
    sparkle:       require('../assets/images/characters/bajil/face_exp/bajil_sparkle.png'),
    sad:           require('../assets/images/characters/bajil/face_exp/bajil_sad.png'),
    oh:            require('../assets/images/characters/bajil/face_exp/bajil_oh.png'),
    cry:           require('../assets/images/characters/bajil/face_exp/bajil_cry.png'),
    holding_tears: require('../assets/images/characters/bajil/face_exp/bajil_holding_tears.png'),
    smile:         require('../assets/images/characters/bajil/face_exp/bajil_smile.png'),
    heart:         require('../assets/images/characters/bajil/face_exp/bajil_heart.png'),
    sigh:          require('../assets/images/characters/bajil/face_exp/bajil_sigh.png'),
    angry:         require('../assets/images/characters/bajil/face_exp/bajil_angry.png'),
  },
  tomato: {
    default:      require('../assets/images/characters/tomato/face_exp/tomato_default.png'),
    tear:         require('../assets/images/characters/tomato/face_exp/tomato_tear.png'),
    sparkle:      require('../assets/images/characters/tomato/face_exp/tomato_sparkle.png'),
    sad:          require('../assets/images/characters/tomato/face_exp/tomato_sad.png'),
    disappointed: require('../assets/images/characters/tomato/face_exp/tomato_disappointed.png'),
    oh:           require('../assets/images/characters/tomato/face_exp/tomato_oh.png'),
    cry:          require('../assets/images/characters/tomato/face_exp/tomato_cry.png'),
    smile:        require('../assets/images/characters/tomato/face_exp/tomato_smile.png'),
    heart:        require('../assets/images/characters/tomato/face_exp/tomato_heart.png'),
    angry:        require('../assets/images/characters/tomato/face_exp/tomato_angry.png'),
  },
  marigold: {
    default:      require('../assets/images/characters/marigold/face_exp/marigold_default.png'),
    tear:         require('../assets/images/characters/marigold/face_exp/marigold_tear.png'),
    sparkle:      require('../assets/images/characters/marigold/face_exp/marigold_sparkle.png'),
    disappointed: require('../assets/images/characters/marigold/face_exp/marigold_disappointed.png'),
    oh:           require('../assets/images/characters/marigold/face_exp/marigold_oh.png'),
    heart:        require('../assets/images/characters/marigold/face_exp/marigold_heart.png'),
  },
};

// 식물별 사용 가능한 표정 목록 (dev 패널용)
export const PLANT_EXPRESSIONS: Record<PlantType, Expression[]> = {
  basil:  ['default','tear','sparkle','sad','oh','cry','holding_tears','smile','heart','sigh','angry'],
  tomato: ['default','tear','sparkle','sad','disappointed','oh','cry','smile','heart','angry'],
  marigold:  ['default','tear','sparkle','disappointed','oh','heart'],
};

// 성장 단계(최대 9개)와 캐릭터 이미지(6~8장)의 연결. 옮겨심기·순 따기처럼 두 단계로 나눈 구간은 같은 이미지를 공유한다.
//   바질 9단계 → 이미지 8장:      '15cm 이상 성장'(6)과 '순 따기'(7)가 이미지 6
//   방울토마토 9단계 → 이미지 8장: '15cm 이상 성장'(5)과 '정식 완료'(6)가 이미지 5
//   메리골드 7단계 → 이미지 6장:  '성장 중'(4)과 '옮겨심기'(5)가 이미지 4
const IMAGE_STAGE_MAP: Record<PlantType, Record<number, number>> = {
  basil:    { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 6, 8: 7, 9: 8 },
  tomato:   { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 5, 7: 6, 8: 7, 9: 8 },
  marigold: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 5, 7: 6 },
};

// 단계 이미지 getter (단계 → 이미지 번호 매핑, 범위를 넘으면 해당 식물의 마지막 이미지)
export function getPlantImage(plantType: PlantType, stage: GrowthStage): any {
  const map = IMAGE_STAGE_MAP[plantType];
  const maxImage = Math.max(...Object.keys(PLANT_IMAGES[plantType]).map(Number));
  return PLANT_IMAGES[plantType][map[stage] ?? maxImage];
}

// 표정 이미지 getter (없는 표정은 default fallback)
export function getExpressionImage(plantType: PlantType, expression: Expression): any {
  return EXPRESSION_IMAGES[plantType][expression] ?? EXPRESSION_IMAGES[plantType].default;
}

// growthStage 문자열 → 숫자 단계 변환
export function growthStageToNumber(stage: string): GrowthStage {
  switch (stage) {
    case 'seed':    return 1;
    case 'sprout':  return 2;
    case 'growing': return 5;
    case 'done':    return 8;
    default:        return 1;
  }
}
