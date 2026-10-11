import { PlantType } from './character';

// ─── 가이드라인 항목 ──────────────────────────────────────────────

export interface GuideItem {
  text: string;
}

// ─── 공통 가이드라인 ──────────────────────────────────────────────

export const COMMON_GUIDE_ITEMS: GuideItem[] = [
  { text: '단색 배경(흰 벽, 흰 종이 등) 앞에 화분을 놓아주세요' },
  { text: '식물 전체와 화분이 사진 안에 모두 들어오게 찍어주세요' },
  { text: '밝은 곳에서 찍을수록 더 잘 인식돼요' },
  { text: '화분 정면에서 똑바로 찍어주세요' },
];

// ─── 식물별 추가 안내 ─────────────────────────────────────────────

const PLANT_EXTRA_GUIDE: Record<PlantType, GuideItem | null> = {
  basil:  { text: '잎이 잘 펼쳐져 있는 상태에서 찍으면 더 좋아요' },
  tomato: { text: '줄기와 잎이 모두 담기도록 조금 멀리서 찍어주세요' },
  marigold: { text: '줄기와 꽃이 모두 담기도록 전체 화분을 담아주세요' },
};

// ─── 헤더 텍스트 ─────────────────────────────────────────────────

export const GUIDE_TITLE = '사진 촬영 가이드';
export const GUIDE_SUBTITLE = '아래 가이드에 맞게 찍으면\n더 예쁜 캐릭터가 만들어져요';
export const GUIDE_BTN_LABEL = '갤러리에서 사진 선택';
export const GUIDE_CAMERA_LABEL = '카메라로 바로 촬영';
export const GUIDE_EXAMPLE_OPEN = '예시';

// ─── 가이드라인 조합 함수 ─────────────────────────────────────────

export function getGuideItems(plantType: PlantType): GuideItem[] {
  const extra = PLANT_EXTRA_GUIDE[plantType];
  return extra ? [...COMMON_GUIDE_ITEMS, extra] : COMMON_GUIDE_ITEMS;
}
