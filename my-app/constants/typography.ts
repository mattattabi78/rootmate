import { Dimensions } from 'react-native';

// ─── 화면 크기에 따른 UI 배율 ──────────────────────────────────────
// 기준 프레임은 402×874. 그보다 작은 기기(예: iPhone SE, mini)에서는 모든 글자와 일부 그래픽을 같은 비율로 줄여서
// 글자 위계(제목 > 본문 > 보조)의 비율은 그대로 두고 화면이 커 보이지 않게 한다.
//   - 일반적인 큰 화면(배율 0.96 이상)은 1로 두어 그대로 보인다.
//   - 가장 많이 줄어도 0.85까지만 줄인다.
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const RAW_SCALE = Math.min(0.55 + 0.45 * (SCREEN_H / 874), 0.55 + 0.45 * (SCREEN_W / 402));
export const UI_SCALE = RAW_SCALE >= 0.96 ? 1 : Math.max(0.85, RAW_SCALE);

/** 글자 크기·줄 높이용: 0.5 단위로 반올림, 10 이하의 작은 글자는 더 줄이지 않음 */
export const fs = (n: number): number =>
  UI_SCALE === 1 ? n : Math.max(Math.min(n, 10), Math.round(n * UI_SCALE * 2) / 2);
/**
 * 글자 크기 7단계. 새 글자 스타일은 `fontSize: fs(FONT_SIZE.body)`처럼 이 단계에서만 고른다.
 * 예외(단계에 넣지 않음): 도감 카드 안 글자(10·11·12·13, fs() 미사용), 헤더 로고와 홈 대사·기록 제목·온보딩 입력창의 20.
 */
export const FONT_SIZE = {
  caption: 12,   // 보조 설명
  body:    13,   // 본문, 라벨
  bodyL:   15,   // 말풍선, 날짜, 부제
  label:   16,   // 버튼, 강조 라벨
  title:   18,   // 팝업·시트 제목, 이름
  heading: 22,   // 탭, 상세 이름, 월 제목
  display: 28,   // 온보딩·연속 관리 큰 제목
} as const;

/**
 * 글자 크기별 기본 줄 높이 (글자 크기의 약 1.5배, 한 줄 제목은 이보다 작아도 되지만 글자 크기보다 작게는 두지 않는다).
 * 새 글자 스타일에서 lineHeight를 따로 정하지 않을 때 `lineHeight: lh(15)`처럼 쓴다.
 */
export const LINE_HEIGHT: Record<number, number> = {
  10: 14, 11: 16, 12: 18, 13: 20, 14: 21, 15: 23, 16: 24, 17: 25, 18: 27, 20: 30, 22: 33, 24: 36, 28: 42,
};
export const lh = (size: number): number => fs(LINE_HEIGHT[size] ?? Math.round(size * 1.5));
/** 그래픽·간격용: 단순 비례 */
export const ui = (n: number): number => n * UI_SCALE;

// 폰트 패밀리 — app/_layout.tsx 의 useFonts 키와 동일해야 함
export const FONTS = {
  regular: 'SUITE-Regular',
  medium:  'SUITE-Medium',
  bold:    'SUITE-Bold',
  heavy:   'SUITE-Heavy',
} as const;
