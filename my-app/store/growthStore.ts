import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '../utils/date';
import { PlantType } from '../constants/character';
import { getDevAdjustedDate } from '../utils/devOverrides';

const GROWTH_STATE_KEY     = '@rootmate/growth_state';
const LAST_STAGE_CHECK_KEY = '@rootmate/last_stage_check';

// ─── 타입 ─────────────────────────────────────────────────────────
export interface StageHistoryEntry {
  stage: number;
  enteredAt: string; // 'YYYY-MM-DD'
}

export interface TaskCompletionEntry {
  taskId: string;
  completedAt: string; // 'YYYY-MM-DD'
}

export interface GrowthState {
  plantType: PlantType;
  currentStage: number;
  plantedAt: string;
  stageHistory: StageHistoryEntry[];
  completedTasks: TaskCompletionEntry[];
  pendingConfirmQuestion?: string;
}

// ─── 날짜 유틸 ───────────────────────────────────────────────────
function today(): string {
  return getLocalDateString(getDevAdjustedDate());
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

// ─── 저장 / 불러오기 ──────────────────────────────────────────────

export async function saveGrowthState(state: GrowthState): Promise<void> {
  await AsyncStorage.setItem(GROWTH_STATE_KEY, JSON.stringify(state));
}

export async function loadGrowthState(): Promise<GrowthState | null> {
  const raw = await AsyncStorage.getItem(GROWTH_STATE_KEY);
  return raw ? (JSON.parse(raw) as GrowthState) : null;
}

/** GrowthState가 없으면 plantData 기반으로 초기 상태 생성 */
export async function getOrInitGrowthState(
  plantType: PlantType,
  plantedAt: string,
): Promise<GrowthState> {
  const existing = await loadGrowthState();
  if (existing) return existing;
  const initial: GrowthState = {
    plantType,
    currentStage: 1,
    plantedAt,
    stageHistory: [{ stage: 1, enteredAt: today() }],
    completedTasks: [],
  };
  await saveGrowthState(initial);
  return initial;
}

// ─── Task 완료 기록 ───────────────────────────────────────────────

export async function recordTaskCompletion(taskId: string): Promise<void> {
  const state = await loadGrowthState();
  if (!state) return;
  state.completedTasks.push({ taskId, completedAt: today() });
  await saveGrowthState(state);
}

export async function isTaskCompletedToday(taskId: string): Promise<boolean> {
  const state = await loadGrowthState();
  if (!state) return false;
  const t = today();
  return state.completedTasks.some(e => e.taskId === taskId && e.completedAt === t);
}

/** 오늘 완료한 taskId 배열 반환 */
export async function getTodayCompletedTaskIds(): Promise<string[]> {
  const state = await loadGrowthState();
  if (!state) return [];
  const t = today();
  return state.completedTasks.filter(e => e.completedAt === t).map(e => e.taskId);
}

/** 오늘 task 완료 기록 전체 초기화 (테스트용) */
export async function clearTodayTaskCompletions(): Promise<void> {
  const state = await loadGrowthState();
  if (!state) return;
  const t = today();
  state.completedTasks = state.completedTasks.filter(e => e.completedAt !== t);
  await saveGrowthState(state);
}

/**
 * 오늘 세션 완전 초기화 (개발자 메뉴용)
 * - 오늘 task 완료 기록 삭제
 * - 성장 단계 체크 날짜 초기화 (오늘 다시 체크 가능)
 * - pendingConfirmQuestion 초기화
 */
export async function clearTodaySession(): Promise<void> {
  const state = await loadGrowthState();
  if (state) {
    const t = today();
    state.completedTasks = state.completedTasks.filter(e => e.completedAt !== t);
    state.pendingConfirmQuestion = undefined;
    await saveGrowthState(state);
  }
  await AsyncStorage.removeItem(LAST_STAGE_CHECK_KEY);
}

// ─── 단계 진입 기록 ───────────────────────────────────────────────

export async function recordStageEntry(stage: number): Promise<void> {
  const state = await loadGrowthState();
  if (!state) return;
  state.currentStage = stage;
  // 이미 기록 있으면 덮어쓰기
  const idx = state.stageHistory.findIndex(h => h.stage === stage);
  if (idx >= 0) {
    state.stageHistory[idx].enteredAt = today();
  } else {
    state.stageHistory.push({ stage, enteredAt: today() });
  }
  await saveGrowthState(state);
}

/** 특정 단계 진입 후 오늘까지 경과일 계산 */
export async function getDaysSinceStageEntry(stage: number): Promise<number> {
  const state = await loadGrowthState();
  if (!state) return 0;
  const entry = state.stageHistory.find(h => h.stage === stage);
  if (!entry) return 0;
  return daysBetween(entry.enteredAt, today());
}

// ─── pendingConfirmQuestion 관리 ─────────────────────────────────

export async function setPendingConfirmQuestion(question: string | undefined): Promise<void> {
  const state = await loadGrowthState();
  if (!state) return;
  state.pendingConfirmQuestion = question;
  await saveGrowthState(state);
}

// ─── 마지막 단계 체크 날짜 (하루 1회 제한) ───────────────────────

export async function getLastStageCheckDate(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_STAGE_CHECK_KEY);
}

export async function setLastStageCheckDate(date: string): Promise<void> {
  await AsyncStorage.setItem(LAST_STAGE_CHECK_KEY, date);
}

export async function wasStageCheckedToday(): Promise<boolean> {
  const last = await getLastStageCheckDate();
  return last === today();
}
