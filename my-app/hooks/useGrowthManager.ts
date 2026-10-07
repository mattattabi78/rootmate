import { useCallback, useEffect, useRef, useState } from 'react';
import { PlantType } from '../constants/character';
import { isSupportedTask, isTaskDue, isObservationDue, PlantTask, PLANT_TASKS } from '../constants/plants';
import {
  AUTO_ADVANCE_MESSAGES,
  getNextStageConfig, getActiveTaskIds, getMaxStage,
} from '../constants/growthStages';
import {
  GrowthState,
  getOrInitGrowthState, saveGrowthState, loadGrowthState,
  recordTaskCompletion, getTodayCompletedTaskIds, clearTodaySession,
  getDaysSinceStageEntry,
  setPendingConfirmQuestion,
  wasStageCheckedToday, setLastStageCheckDate,
} from '../store/growthStore';
import { getLocalDateString } from '../utils/date';
import { getDevAdjustedDate, getKstDayOfWeek } from '../utils/devOverrides';

export interface StageProgressionResult {
  shouldAskQuestion: boolean;
  question?: string;
  autoAdvanced?: boolean;
  newStage?: number;
  autoMessage?: string;
}

// ─── 오늘의 task 계산 ─────────────────────────────────────────────
// 현재 단계의 활성 task 중 오늘 due인 항목을 표시
function computeTodayTasks(state: GrowthState, completedTodayIds: string[]): PlantTask[] {
  const { plantType, currentStage, completedTasks } = state;
  const activeIds = getActiveTaskIds(plantType, currentStage);
  const allTasks  = PLANT_TASKS[plantType] ?? [];
  const kstDow = getKstDayOfWeek();
  const observationDue = isObservationDue(plantType, state.plantedAt, completedTasks);
  const observationDay = observationDue || completedTodayIds.includes('observe');

  return allTasks.filter(task => {
    if (!isSupportedTask(task.id)) return false;
    if (!activeIds.includes(task.id as any)) return false;
    if (task.id === 'sunlight' && observationDay) return false;
    if (task.id === 'observe' && !observationDue) return false;

    // 요일 제한
    if (task.daysOfWeek && !task.daysOfWeek.includes(kstDow)) return false;

    if (
      (task.id === 'water' || task.id === 'sunlight' || task.id === 'observe') &&
      !isTaskDue(task, state.plantedAt, completedTasks)
    ) return false;

    // 1회성: 한 번이라도 완료했으면 제외
    if (task.oneTime || task.intervalDays === 0) {
      return !completedTasks.some(e => e.taskId === task.id);
    }

    // 일반 반복 task: 오늘 완료했으면 제외, 아니면 항상 노출
    return !completedTodayIds.includes(task.id);
  });
}

// ─── 단계 강제 설정 헬퍼 (state 보장 포함) ───────────────────────
async function setStageInStorage(
  stage: number,
  plantType: PlantType,
  plantedAt: string,
): Promise<void> {
  // getOrInitGrowthState로 반드시 state가 있는 상태에서 조작
  const state = await getOrInitGrowthState(plantType, plantedAt);
  state.currentStage = stage;
  const today = getLocalDateString(getDevAdjustedDate());
  const idx = state.stageHistory.findIndex(h => h.stage === stage);
  if (idx >= 0) {
    state.stageHistory[idx].enteredAt = today;
  } else {
    state.stageHistory.push({ stage, enteredAt: today });
  }
  await saveGrowthState(state);
}

// ─── 훅 ──────────────────────────────────────────────────────────
export function useGrowthManager(plantType: PlantType, plantedAt: string) {
  const [growthState, setGrowthState]           = useState<GrowthState | null>(null);
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
    setGrowthState(state);
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

  // ── 단계 진행 체크 ──────────────────────────────────────────────
  const checkStageProgression = useCallback(async (): Promise<StageProgressionResult> => {
    if (await wasStageCheckedToday()) {
      const state = await loadGrowthState();
      if (state?.pendingConfirmQuestion) {
        return { shouldAskQuestion: true, question: state.pendingConfirmQuestion };
      }
      return { shouldAskQuestion: false };
    }

    const state = await getOrInitGrowthState(plantType, plantedAt);
    const maxStage = getMaxStage(plantType);

    if (state.currentStage >= maxStage) {
      await setLastStageCheckDate(getLocalDateString(getDevAdjustedDate()));
      return { shouldAskQuestion: false };
    }

    const nextConfig = getNextStageConfig(plantType, state.currentStage);
    if (!nextConfig) {
      await setLastStageCheckDate(getLocalDateString(getDevAdjustedDate()));
      return { shouldAskQuestion: false };
    }

    if (nextConfig.triggerCondition === 'DAYS_PASSED') {
      const days = await getDaysSinceStageEntry(state.currentStage);
      if (days >= (nextConfig.daysRequired ?? 0)) {
        await setStageInStorage(nextConfig.stage, plantType, plantedAt);
        const autoMsg = AUTO_ADVANCE_MESSAGES[plantType]?.[nextConfig.stage];
        await reload();
        await setLastStageCheckDate(getLocalDateString(getDevAdjustedDate()));
        return { shouldAskQuestion: false, autoAdvanced: true, newStage: nextConfig.stage, autoMessage: autoMsg };
      }
    }

    if (nextConfig.triggerCondition === 'USER_CONFIRMED') {
      if (nextConfig.daysRequired) {
        const days = await getDaysSinceStageEntry(state.currentStage);
        if (days < nextConfig.daysRequired) {
          await setLastStageCheckDate(getLocalDateString(getDevAdjustedDate()));
          return { shouldAskQuestion: false };
        }
      }
      if (!state.pendingConfirmQuestion) {
        await setPendingConfirmQuestion(nextConfig.confirmQuestion);
      }
      await setLastStageCheckDate(getLocalDateString(getDevAdjustedDate()));
      return { shouldAskQuestion: true, question: nextConfig.confirmQuestion };
    }

    await setLastStageCheckDate(getLocalDateString(getDevAdjustedDate()));
    return { shouldAskQuestion: false };
  }, [plantType, plantedAt, reload]);

  // ── 유저 확인 답변 처리 ─────────────────────────────────────────
  const handleStageConfirmation = useCallback(async (confirmed: boolean): Promise<void> => {
    const state = await getOrInitGrowthState(plantType, plantedAt);
    if (confirmed) {
      const nextConfig = getNextStageConfig(plantType, state.currentStage);
      if (nextConfig) await setStageInStorage(nextConfig.stage, plantType, plantedAt);
    }
    await setPendingConfirmQuestion(undefined);
    await reload();
  }, [plantType, plantedAt, reload]);

  // ── task 완료 ───────────────────────────────────────────────────
  const completeTask = useCallback(async (taskId: string): Promise<void> => {
    await recordTaskCompletion(taskId);
    await reload();
  }, [reload]);

  // ── 개발자 강제 제어 (state 보장) ────────────────────────────────
  const forceStage = useCallback(async (stage: number): Promise<void> => {
    await setStageInStorage(stage, plantType, plantedAt);
    await reload();
  }, [plantType, plantedAt, reload]);

  const forceNextStage = useCallback(async (): Promise<void> => {
    const state = await getOrInitGrowthState(plantType, plantedAt);
    const next = Math.min(state.currentStage + 1, getMaxStage(plantType));
    await setStageInStorage(next, plantType, plantedAt);
    await reload();
  }, [plantType, plantedAt, reload]);

  const forcePrevStage = useCallback(async (): Promise<void> => {
    const state = await getOrInitGrowthState(plantType, plantedAt);
    const prev = Math.max(state.currentStage - 1, 1);
    await setStageInStorage(prev, plantType, plantedAt);
    await reload();
  }, [plantType, plantedAt, reload]);

  const clearTodayTasks = useCallback(async (): Promise<void> => {
    await clearTodaySession();
    await reload();
  }, [reload]);

  return {
    currentStage: growthState?.currentStage ?? 1,
    growthState,
    todayTasks,
    completedTaskIds,
    completeTask,
    checkStageProgression,
    handleStageConfirmation,
    reload,
    forceStage,
    forceNextStage,
    forcePrevStage,
    clearTodayTasks,
  };
}
