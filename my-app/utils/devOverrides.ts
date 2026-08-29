// 개발자 메뉴용 인메모리 override (앱 재시작 시 초기화)

// ── 날짜 오프셋 ───────────────────────────────────────────────────
let _devDateOffsetDays: number = 0;

export function advanceDevDay(): void {
  _devDateOffsetDays += 1;
}

export function resetDevDateOffset(): void {
  _devDateOffsetDays = 0;
}

export function getDevDateOffsetDays(): number {
  return _devDateOffsetDays;
}

/** 개발 오프셋이 적용된 "오늘" Date 객체 반환 */
export function getDevAdjustedDate(): Date {
  const d = new Date();
  if (_devDateOffsetDays !== 0) d.setDate(d.getDate() + _devDateOffsetDays);
  return d;
}

// ── 요일 override ────────────────────────────────────────────────
let _devDayOfWeek: number | null = null;

export function setDevDayOfWeek(day: number | null): void {
  _devDayOfWeek = day;
}

/** KST 기준 요일 (0=일 ~ 6=토). 개발자 override가 있으면 그 값을 반환 */
export function getKstDayOfWeek(): number {
  if (_devDayOfWeek !== null) return _devDayOfWeek;
  const offsetMs = _devDateOffsetDays * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetMs).getUTCDay();
}

// ── 채팅 라운드 수 ────────────────────────────────────────────────
let _devChatRounds: number | null = null;

export function setDevChatRounds(rounds: number): void {
  _devChatRounds = Math.max(1, rounds);
}

export function getDevChatRounds(): number {
  if (_devChatRounds !== null) return _devChatRounds;
  return Math.floor(Math.random() * 3) + 2;
}
