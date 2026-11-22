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

// 읽기 → 수정 → 쓰기를 한 번에 하나씩만 실행한다.
// 채팅에서 물주기·햇빛을 한꺼번에 체크하면 recordTaskCompletion이 거의 동시에 불리는데,
// 줄을 세우지 않으면 둘 다 같은 옛 상태를 읽고 마지막에 쓴 쪽이 다른 쪽의 기록을 덮어써서 task가 하나 사라진다.
let writeQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => undefined);
  return run;
}

export async function saveGrowthState(state: GrowthState): Promise<void> {
  await AsyncStorage.setItem(GROWTH_STATE_KEY, JSON.stringify(state));
}

export async function loadGrowthState(): Promise<GrowthState | null> {
  const raw = await AsyncStorage.getItem(GROWTH_STATE_KEY);
  return raw ? (JSON.parse(raw) as GrowthState) : null;
}

/** GrowthState가 없으면 plantData 기반으로 초기 상태 생성 */
export function getOrInitGrowthState(
  plantType: PlantType,
  plantedAt: string,
): Promise<GrowthState> {
  return serialized(async () => {
    const existing = await loadGrowthState();
    if (existing) return existing;
    const initial: GrowthState = {
      plantType,
      plantedAt,
      completedTasks: [],
    };
    await saveGrowthState(initial);
    return initial;
  });
}

// ─── Task 완료 기록 ───────────────────────────────────────────────

export function recordTaskCompletion(taskId: string): Promise<void> {
  return serialized(async () => {
    const state = await loadGrowthState();
    if (!state) return;
    state.completedTasks.push({ taskId, completedAt: today() });
    await saveGrowthState(state);
  });
}

/** 오늘 완료한 taskId 배열 반환 */
export function getTodayCompletedTaskIds(): Promise<string[]> {
  // 아직 쓰는 중인 기록이 있으면 끝난 뒤에 읽는다
  return serialized(async () => {
    const state = await loadGrowthState();
    if (!state) return [];
    const t = today();
    return state.completedTasks.filter(e => e.completedAt === t).map(e => e.taskId);
  });
}

/** 오늘 task 완료 기록 초기화 (개발자 메뉴용) */
export function clearTodaySession(): Promise<void> {
  return serialized(async () => {
    const state = await loadGrowthState();
    if (!state) return;
    const t = today();
    state.completedTasks = state.completedTasks.filter(e => e.completedAt !== t);
    await saveGrowthState(state);
  });
}
