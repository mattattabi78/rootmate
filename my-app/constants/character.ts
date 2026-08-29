// @ts-nocheck
/* eslint-disable @typescript-eslint/no-var-requires */
// 식물 캐릭터 이미지 상수 — 모든 require()는 정적 경로 필수
export type PlantType  = 'basil' | 'tomato' | 'tulip';
export type GrowthStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
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
  tulip:  require('../assets/images/characters/tul_profile.png'),
};

// 성장 단계 이미지 (tulip 최대 6단계)
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
  tulip: {
    1: require('../assets/images/characters/tulip/tulip_1.png'),
    2: require('../assets/images/characters/tulip/tulip_2.png'),
    3: require('../assets/images/characters/tulip/tulip_3.png'),
    4: require('../assets/images/characters/tulip/tulip_4.png'),
    5: require('../assets/images/characters/tulip/tulip_5.png'),
    6: require('../assets/images/characters/tulip/tulip_6.png'),
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
  tulip: {
    default:      require('../assets/images/characters/tulip/face_exp/tulip_default.png'),
    tear:         require('../assets/images/characters/tulip/face_exp/tulip_tear.png'),
    sparkle:      require('../assets/images/characters/tulip/face_exp/tulip_sparkle.png'),
    disappointed: require('../assets/images/characters/tulip/face_exp/tulip_disappointed.png'),
    oh:           require('../assets/images/characters/tulip/face_exp/tulip_oh.png'),
    heart:        require('../assets/images/characters/tulip/face_exp/tulip_heart.png'),
  },
};

// 식물별 사용 가능한 표정 목록 (dev 패널용)
export const PLANT_EXPRESSIONS: Record<PlantType, Expression[]> = {
  basil:  ['default','tear','sparkle','sad','oh','cry','holding_tears','smile','heart','sigh','angry'],
  tomato: ['default','tear','sparkle','sad','disappointed','oh','cry','smile','heart','angry'],
  tulip:  ['default','tear','sparkle','disappointed','oh','heart'],
};

// 단계 이미지 getter (tulip clamp to 6)
export function getPlantImage(plantType: PlantType, stage: GrowthStage): any {
  const max  = plantType === 'tulip' ? 6 : 8;
  const safe = Math.min(stage, max) as GrowthStage;
  return PLANT_IMAGES[plantType][safe];
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
