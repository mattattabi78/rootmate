import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '../utils/date';
import { PlantType } from '../constants/character';
import { getDevAdjustedDate } from '../utils/devOverrides';

const GROWTH_STATE_KEY = '@rootmate/growth_state';   // task 완료 기록 저장소 (성장 단계는 더 이상 쓰지 않음)

// ─── 타입 ─────────────────────────────────────────────────────────
export interface TaskCompletionEntry {
  taskId: string;
  completedAt: string; // 'YYYY-MM-DD'
}

export interface GrowthState {
  plantType: PlantType;
  plantedAt: string;
  completedTasks: TaskCompletionEntry[];
}

// ─── 날짜 유틸 ───────────────────────────────────────────────────
function today(): string {
  return getLocalDateString(getDevAdjustedDate());
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
    plantedAt,
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

/** 오늘 완료한 taskId 배열 반환 */
export async function getTodayCompletedTaskIds(): Promise<string[]> {
  const state = await loadGrowthState();
  if (!state) return [];
  const t = today();
  return state.completedTasks.filter(e => e.completedAt === t).map(e => e.taskId);
}

/** 오늘 task 완료 기록 초기화 (개발자 메뉴용) */
export async function clearTodaySession(): Promise<void> {
  const state = await loadGrowthState();
  if (!state) return;
  const t = today();
  state.completedTasks = state.completedTasks.filter(e => e.completedAt !== t);
  await saveGrowthState(state);
}
