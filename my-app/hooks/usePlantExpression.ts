import { useCallback, useEffect, useRef, useState } from 'react';
import { Expression, PlantType } from '../constants/character';
import { PlantSituation, getExpressionForSituation } from '../constants/expressions';
import { storage } from '../store/storage';
import { getLocalDateString } from '../utils/date';
import { getDevAdjustedDate } from '../utils/devOverrides';

// 우선순위 순으로 상황 평가
async function computeSituation(): Promise<PlantSituation> {
  const today = getDevAdjustedDate();
  const todayStr = getLocalDateString(today);
  const hour = today.getHours();

  // 오늘 기록 확인
  const todayRecord = await storage.getDailyRecord(todayStr);

  // 마음건강 질문까지 완료
  if (todayRecord?.answer && todayRecord.answer !== '') {
    return 'task_completed';
  }

  // 오늘 물 줬지만 질문 미완료
  if (todayRecord?.waterDone) {
    return 'water_done_today';
  }

  // 최근 7일에서 마지막 물 준 날 스캔
  let daysSinceWater = 999;
  for (let i = 0; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const record = await storage.getDailyRecord(dateStr);
    if (record?.waterDone) {
      daysSinceWater = i;
      break;
    }
  }

  // 물 주기 초과 판단 (우선순위: 3일+ > 2일 > 1일 > 당일)
  if (daysSinceWater >= 3) return 'no_water_3days_plus';
  if (daysSinceWater === 2) return 'no_water_2days';
  if (daysSinceWater === 1) return 'no_water_1day';
  if (daysSinceWater === 0) return 'water_due_today';

  // 시간대 기반
  if (hour >= 6 && hour < 12) return 'morning_before_task';
  if (hour >= 20 && hour < 22) return 'evening_check';

  return 'idle';
}

export function usePlantExpression(plantType: PlantType): {
  expression: Expression;
  situation: PlantSituation;
  setTemporaryExpression: (exp: Expression, durationMs?: number) => void;
  refresh: () => Promise<void>;
} {
  const [situation, setSituation] = useState<PlantSituation>('idle');
  const [expression, setExpression] = useState<Expression>('default');

  // 임시 표정 복귀용 기준값 & 타이머
  const baseExprRef = useRef<Expression>('default');
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 상황 재계산 후 표정 업데이트
  const refresh = useCallback(async () => {
    const sit = await computeSituation();
    const exp = getExpressionForSituation(plantType, sit);
    setSituation(sit);
    setExpression(exp);
    baseExprRef.current = exp;
  }, [plantType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 일시적 표정 변경 — durationMs 후 상황 기반 표정으로 자동 복귀
  const setTemporaryExpression = useCallback(
    (exp: Expression, durationMs = 3000) => {
      // 중복 타이머 방지
      if (timerRef.current) clearTimeout(timerRef.current);
      setExpression(exp);
      timerRef.current = setTimeout(async () => {
        // 복귀 시 상황 재계산
        const sit = await computeSituation();
        const base = getExpressionForSituation(plantType, sit);
        setSituation(sit);
        setExpression(base);
        baseExprRef.current = base;
        timerRef.current = null;
      }, durationMs);
    },
    [plantType],
  );

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { expression, situation, setTemporaryExpression, refresh };
}
