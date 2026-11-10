import { useCallback, useEffect, useRef, useState } from 'react';
import { PlantType } from '../constants/character';
import { isSupportedTask, isTaskDueFor, isObservationDue, PlantTask, PLANT_TASKS } from '../constants/plants';
import {
  GrowthState,
  getOrInitGrowthState, saveGrowthState,
  getTodayCompletedTaskIds, clearTodaySession,
} from '../store/growthStore';
import { getKstDayOfWeek } from '../utils/devOverrides';

// ─── 오늘의 task 계산 ─────────────────────────────────────────────
// 식물의 task 중 오늘 due인 항목을 표시
function computeTodayTasks(state: GrowthState, completedTodayIds: string[]): PlantTask[] {
  const { plantType, completedTasks } = state;
  const allTasks  = PLANT_TASKS[plantType] ?? [];
  const kstDow = getKstDayOfWeek();
  const observationDue = isObservationDue(plantType, state.plantedAt, completedTasks);
  const observationDay = observationDue || completedTodayIds.includes('observe');

  return allTasks.filter(task => {
    if (!isSupportedTask(task.id)) return false;
    if (task.id === 'sunlight' && observationDay) return false;
    if (task.id === 'observe' && !observationDue) return false;

    // 요일 제한
    if (task.daysOfWeek && !task.daysOfWeek.includes(kstDow)) return false;

    if (
      (task.id === 'water' || task.id === 'sunlight' || task.id === 'observe') &&
      !isTaskDueFor(plantType, task, state.plantedAt, completedTasks)
    ) return false;

    // 1회성: 한 번이라도 완료했으면 제외
    if (task.oneTime || task.intervalDays === 0) {
      return !completedTasks.some(e => e.taskId === task.id);
    }

    // 일반 반복 task: 오늘 완료했으면 제외, 아니면 항상 노출
    return !completedTodayIds.includes(task.id);
  });
}

// ─── 훅 ──────────────────────────────────────────────────────────
export function useGrowthManager(plantType: PlantType, plantedAt: string) {
  const [todayTasks, setTodayTasks]             = useState<PlantTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  const prevPlantTypeRef = useRef<PlantType | null>(null);

  const reload = useCallback(async () => {
    let state = await getOrInitGrowthState(plantType, plantedAt);

    // plantType 불일치 수정 (초기 기본값으로 잘못 생성된 경우)
    if (state.plantType !== plantType) {
      state = { ...state, plantType, plantedAt };
      await saveGrowthState(state);
    }

    const todayIds = await getTodayCompletedTaskIds();
    setCompletedTaskIds(todayIds);
    setTodayTasks(computeTodayTasks(state, todayIds));
  }, [plantType, plantedAt]);

  // 최초 로드
  useEffect(() => {
    reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // plantType 변경 시 재로드 (useFocusEffect로 실제 데이터 세팅 후)
  useEffect(() => {
    if (prevPlantTypeRef.current !== null && prevPlantTypeRef.current !== plantType) {
      reload();
    }
    prevPlantTypeRef.current = plantType;
  }, [plantType, reload]);

  // 개발자 메뉴: 오늘 task 완료 기록 초기화
  const clearTodayTasks = useCallback(async (): Promise<void> => {
    await clearTodaySession();
    await reload();
  }, [reload]);

  return {
    todayTasks,
    completedTaskIds,
    reload,
    clearTodayTasks,
  };
}
