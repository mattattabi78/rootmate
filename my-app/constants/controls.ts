import { FONT_SIZE } from './typography';

// ─── 버튼·입력창 공통 크기 ─────────────────────────────────────────
// 화면마다 따로 정하지 않고 여기 값을 쓴다. (DESIGN.md 5.4 참고)
export const BTN_H = 54;          // 버튼 높이: 큰 버튼, 채팅 선택지, 팝업 버튼, 연속 관리 하단 버튼
export const BTN_FONT = FONT_SIZE.label;       // 버튼 글자 크기 (Bold, fs()와 함께 사용)
export const INPUT_H = 48;        // 입력창 높이 (채팅은 최소 높이, 설정)
export const INPUT_H_LARGE = 52;  // 온보딩 입력창 높이 (화면의 중심이라 조금 크게)
export const INPUT_FONT = FONT_SIZE.bodyL;     // 입력창 글자 크기 (Medium, 채팅·설정. 온보딩 입력창은 큰 입력이라 20 Bold로 따로)
export const INPUT_LH = 23;       // 입력창 줄 높이
