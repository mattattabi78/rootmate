// src/utils/koreaDate.ts

// 함께하기 시작한 날 (KST 기준)
const START_DATE = '2026-05-24';

/**
 * 한국 시각 기준 "2026년 5월 31일 (토)" 형태의 날짜 문자열
 */
export function getKoreaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

/**
 * 한국 시각 기준 "오후 3:42" 형태의 시간 문자열
 */
export function getKoreaTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * 시작일로부터 한국 기준 며칠째 함께했는지 (시작일을 1일째로 셈)
 */
export function getDaysTogether(date: Date = new Date()): number {
  // 한국 기준 'YYYY-MM-DD'만 뽑아 자정 기준으로 일수 차이 계산
  const todayKST = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date); // 'en-CA'는 'YYYY-MM-DD' 형태로 반환

  const start = new Date(`${START_DATE}T00:00:00Z`);
  const today = new Date(`${todayKST}T00:00:00Z`);

  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  return diffDays + 1; // 시작일을 1일째로
}