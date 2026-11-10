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
/** 그래픽·간격용: 단순 비례 */
export const ui = (n: number): number => n * UI_SCALE;

// 폰트 패밀리 — app/_layout.tsx 의 useFonts 키와 동일해야 함
export const FONTS = {
  regular: 'SUITE-Regular',
  medium:  'SUITE-Medium',
  bold:    'SUITE-Bold',
  heavy:   'SUITE-Heavy',
} as const;
