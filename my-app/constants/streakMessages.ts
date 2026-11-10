// 연속 관리 화면 하단 버튼 문구 — 화면이 열릴 때마다 무작위로 하나가 나온다 (누르면 홈으로 이동)
export const STREAK_CTA_MESSAGES = [
  '앞으로도 함께하자!',
  '내일 또 만나자!',
  '앞으로도 나를 잘 키워줘!',
  '오늘도 고마워!',
  '내일도 잘 부탁해!',
  '같이 쑥쑥 자라자!',
  '너와 함께라서 좋아!',
] as const;

export function pickStreakCtaMessage(): string {
  return STREAK_CTA_MESSAGES[Math.floor(Math.random() * STREAK_CTA_MESSAGES.length)];
}
