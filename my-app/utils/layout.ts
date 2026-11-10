// 기준 기기(Figma 402×874 = iPhone 16 계열)에서의 본문 높이: 874 − 상단 안전 영역 62 − 헤더 69 − 탭바 80 − 하단 안전 영역 34.
// 본문이 이 높이 이상이면 Figma 설계 그대로 두고, 이보다 짧을 때만 여백·일러스트를 줄인다.
export const REF_BODY_H = 629;

// 화면 높이에 따른 레이아웃 압축 계수.
// 짧은 화면(예: iPhone SE)에서는 글자·버튼 크기는 그대로 두고, 여백과 일러스트만 줄여서 한 번에 보이게 한다.
//   h        : 실제 사용할 수 있는 높이(px)
//   fixed    : 줄이지 않는 부분(글자·버튼 등)의 높이 합
//   flexible : 줄일 수 있는 부분(여백·일러스트)의 높이 합 (기본 디자인 기준)
//   min      : 줄이는 한계(0~1). 이보다 더 짧은 화면은 호출하는 쪽에서 FitToScreen으로 통째로 줄인다
// 반환값 1 = 기본 디자인 그대로, 작을수록 여백·일러스트가 줄어듦
export function compactFactor(h: number, fixed: number, flexible: number, min = 0.5): number {
  if (h <= 0 || h >= REF_BODY_H) return 1;   // 기준 기기 이상이면 Figma 그대로
  return Math.max(min, Math.min(1, (h - fixed) / flexible));
}
