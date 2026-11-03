// ─── 물주기 주기 계산 (계절 · 성장 단계 보정 + 촉촉 시 재확인) ─────────────────────
// 식물 가이드 공통 결론: "날짜가 아니라 흙 상태를 보고 준다". 주기는 계절·환경에 따라 달라지므로
// 고정 주기 대신 계절표를 쓰고, "아직 흙이 촉촉해"를 고르면 다음 날 다시 확인한다.
//
// 완료 기록(completedTasks)에서 쓰는 id
//   'water'       : 실제로 물을 준 날
//   'water_moist' : 확인했지만 흙이 촉촉해서 주지 않은 날 (물 준 날로 치지 않음)

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 계절별 기본 주기(일). 굵은 근거는 plantGuide/기획 자료, 나머지는 추정값이므로 확인 후 조정 */
export const WATER_INTERVALS: Record<string, Record<Season, number>> = {
  basil:    { spring: 2, summer: 1, autumn: 2, winter: 3 },
  tomato:   { spring: 3, summer: 2, autumn: 3, winter: 5 },
  marigold: { spring: 2, summer: 1, autumn: 3, winter: 4 },
};
const DEFAULT_INTERVALS: Record<Season, number> = { spring: 2, summer: 1, autumn: 2, winter: 3 };

const MIN_INTERVAL = 1;
const MARIGOLD_SPROUT_LAST_STAGE = 3;   // 새싹·어린 모종 (1~3단계): 건조에 예민 → 주기 −1일
const TOMATO_RIPENING_STAGE = 9;        // 열매가 익는 마지막 단계: 살짝 건조하게 → 주기 +1일

/** 'YYYY-MM-DD' → 계절 (봄 3~5, 여름 6~8, 가을 9~11, 겨울 12~2) */
export function getSeason(dateStr: string): Season {
  const month = parseInt(dateStr.split('-')[1], 10);
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** 오늘의 물주기 주기(일): 계절표 + 성장 단계 보정 */
export function getWaterInterval(plantType: string, stage: number, dateStr: string): number {
  const table = WATER_INTERVALS[plantType] ?? DEFAULT_INTERVALS;
  let interval = table[getSeason(dateStr)];
  if (plantType === 'marigold' && stage <= MARIGOLD_SPROUT_LAST_STAGE) interval -= 1;
  if (plantType === 'tomato' && stage >= TOMATO_RIPENING_STAGE) interval += 1;
  return Math.max(MIN_INTERVAL, interval);
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * 오늘이 물주기 확인 날인지 판단
 * - 가장 최근 기록이 '촉촉해'(물 준 날 이후)면 → 그 다음 날 다시 확인
 * - 아니면 → 마지막으로 물 준 날 + 오늘의 계절 주기
 * - 물 준 기록이 없으면 → 처음부터 확인 대상
 */
export function isWaterDue(
  plantType: string,
  stage: number,
  completedTasks: { taskId: string; completedAt: string }[],
  today: string,
): boolean {
  const latest = (id: string) =>
    completedTasks
      .filter(e => e.taskId === id)
      .reduce<string | undefined>((acc, e) => (!acc || e.completedAt > acc ? e.completedAt : acc), undefined);

  const lastWatered = latest('water');
  const lastMoist = latest('water_moist');

  let dueDate: Date;
  if (lastMoist && (!lastWatered || lastMoist >= lastWatered)) {
    dueDate = addDays(lastMoist, 1);
  } else if (lastWatered) {
    dueDate = addDays(lastWatered, getWaterInterval(plantType, stage, today));
  } else {
    return true;
  }
  return new Date(`${today}T00:00:00`) >= dueDate;
}
