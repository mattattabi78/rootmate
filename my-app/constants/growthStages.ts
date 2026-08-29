import { PlantType } from './character';
import { TaskId } from './plants';

// ─── 타입 ─────────────────────────────────────────────────────────
export type TriggerCondition = 'INITIAL' | 'DAYS_PASSED' | 'USER_CONFIRMED';

export interface GrowthStageConfig {
  stage: number;
  label: string;
  description?: string;
  triggerCondition: TriggerCondition;
  daysRequired?: number;      // DAYS_PASSED: 이전 단계 진입 후 경과일 / USER_CONFIRMED: 최소 경과일
  confirmQuestion?: string;   // USER_CONFIRMED: 유저에게 물어볼 질문
}

// ─── 성장 단계 데이터 ─────────────────────────────────────────────

export const BASIL_GROWTH_STAGES: GrowthStageConfig[] = [
  { stage: 1, label: '씨앗 심기',   description: '씨앗을 막 심은 상태',       triggerCondition: 'INITIAL' },
  { stage: 2, label: '발아 중',     description: '씨앗이 발아하는 중',         triggerCondition: 'DAYS_PASSED',    daysRequired: 3 },
  { stage: 3, label: '새싹',        description: '싹이 올라온 상태',           triggerCondition: 'USER_CONFIRMED', confirmQuestion: '싹이 올라왔나요?' },
  { stage: 4, label: '본잎 성장',   description: '본잎이 나오는 중',           triggerCondition: 'USER_CONFIRMED', confirmQuestion: '본잎이 2~3장 나왔나요?',   daysRequired: 7 },
  { stage: 5, label: '성장 중',     description: '빠르게 자라는 중',           triggerCondition: 'DAYS_PASSED',    daysRequired: 14 },
  { stage: 6, label: '순 따기 시기', description: '키 15~20cm, 순 따기 필요',  triggerCondition: 'USER_CONFIRMED', confirmQuestion: '키가 15cm 이상 자랐나요?' },
  { stage: 7, label: '무성한 바질', description: '풍성하게 자란 상태',         triggerCondition: 'DAYS_PASSED',    daysRequired: 7 },
  { stage: 8, label: '수확 가능',   description: '수확할 수 있는 상태',        triggerCondition: 'DAYS_PASSED',    daysRequired: 7 },
];

export const TOMATO_GROWTH_STAGES: GrowthStageConfig[] = [
  { stage: 1, label: '씨앗 심기',   triggerCondition: 'INITIAL' },
  { stage: 2, label: '발아 중',     triggerCondition: 'DAYS_PASSED',    daysRequired: 5 },
  { stage: 3, label: '새싹',        triggerCondition: 'USER_CONFIRMED', confirmQuestion: '싹이 올라왔나요?' },
  { stage: 4, label: '모종 성장',   triggerCondition: 'USER_CONFIRMED', confirmQuestion: '본잎이 2~3장 나왔나요?',          daysRequired: 7 },
  { stage: 5, label: '정식 완료',   triggerCondition: 'USER_CONFIRMED', confirmQuestion: '큰 화분으로 옮겨 심었나요?',       daysRequired: 14 },
  { stage: 6, label: '줄기 성장',   triggerCondition: 'DAYS_PASSED',    daysRequired: 14 },
  { stage: 7, label: '꽃 피는 중',  triggerCondition: 'USER_CONFIRMED', confirmQuestion: '꽃이 피기 시작했나요?' },
  { stage: 8, label: '수확 가능',   triggerCondition: 'USER_CONFIRMED', confirmQuestion: '열매가 빨갛게 익었나요?' },
];

export const TULIP_GROWTH_STAGES: GrowthStageConfig[] = [
  { stage: 1, label: '구근 심기',    triggerCondition: 'INITIAL' },
  { stage: 2, label: '냉장 처리 중', triggerCondition: 'DAYS_PASSED',    daysRequired: 3 },
  { stage: 3, label: '냉장 완료',    triggerCondition: 'DAYS_PASSED',    daysRequired: 56 },
  { stage: 4, label: '새싹',         triggerCondition: 'USER_CONFIRMED', confirmQuestion: '싹이 올라왔나요?' },
  { stage: 5, label: '꽃망울',       triggerCondition: 'USER_CONFIRMED', confirmQuestion: '꽃망울이 맺혔나요?' },
  { stage: 6, label: '개화',         triggerCondition: 'USER_CONFIRMED', confirmQuestion: '꽃이 피었나요?' },
];

// plantType별 단계 config 통합
export const GROWTH_STAGES: Record<PlantType, GrowthStageConfig[]> = {
  basil:  BASIL_GROWTH_STAGES,
  tomato: TOMATO_GROWTH_STAGES,
  tulip:  TULIP_GROWTH_STAGES,
};

// ─── 단계별 활성 Task 매핑 ─────────────────────────────────────────

export const BASIL_STAGE_TASKS: Record<number, TaskId[]> = {
  1: ['water', 'sunlight', 'photo'],
  2: ['water', 'sunlight', 'photo'],
  3: ['water', 'sunlight', 'photo'],
  4: ['water', 'sunlight', 'fertilize', 'photo'],
  5: ['water', 'sunlight', 'fertilize', 'photo'],
  6: ['water', 'sunlight', 'fertilize', 'pruning', 'flower_remove', 'photo'],
  7: ['water', 'sunlight', 'fertilize', 'pruning', 'flower_remove', 'photo'],
  8: ['water', 'sunlight', 'fertilize', 'harvest', 'photo'],
};

export const TOMATO_STAGE_TASKS: Record<number, TaskId[]> = {
  1: ['water', 'sunlight', 'photo'],
  2: ['water', 'sunlight', 'photo'],
  3: ['water', 'sunlight', 'photo'],
  4: ['water', 'sunlight', 'photo'],
  5: ['water', 'sunlight', 'fertilize', 'side_shoot', 'photo'],
  6: ['water', 'sunlight', 'fertilize', 'side_shoot', 'support_stake', 'photo'],
  7: ['water', 'sunlight', 'fertilize', 'side_shoot', 'pollinate', 'photo'],
  8: ['water', 'sunlight', 'fertilize', 'harvest', 'photo'],
};

export const TULIP_STAGE_TASKS: Record<number, TaskId[]> = {
  1: ['water', 'sunlight', 'photo'],
  2: ['water', 'sunlight', 'photo'],
  3: ['water', 'sunlight', 'photo'],
  4: ['water', 'sunlight', 'photo'],
  5: ['water', 'sunlight', 'photo'],
  6: ['water', 'sunlight', 'photo'],
};

export const STAGE_TASKS: Record<PlantType, Record<number, TaskId[]>> = {
  basil:  BASIL_STAGE_TASKS,
  tomato: TOMATO_STAGE_TASKS,
  tulip:  TULIP_STAGE_TASKS,
};

// ─── DAYS_PASSED 자동 진행 시 채팅 메시지 ─────────────────────────
export const AUTO_ADVANCE_MESSAGES: Record<PlantType, Partial<Record<number, string>>> = {
  basil: {
    2: '슬슬 발아하고 있을 것 같아. 따뜻하게 유지해줘 🌡️',
    5: '많이 자랐지? 이제 쑥쑥 클 시간이야 🌿',
    7: '이제 꽤 무성해졌어. 잘 키워줘서 고마워 💚',
    8: '드디어 수확할 수 있을 것 같아! 기대돼? 🌿',
  },
  tomato: {
    2: '발아 중이야. 따뜻하고 촉촉하게 유지해줘 🌡️',
    6: '줄기가 많이 자랐어. 지지대 준비해줘 💪',
  },
  tulip: {
    2: '냉장 처리 중이야. 8주 동안 잘 부탁해 ❄️',
    3: '냉장 처리 끝났어! 이제 밝은 곳으로 꺼내줘 ☀️',
  },
};

export const STAGE_CONFIRM_MESSAGES: Record<PlantType, { confirmed: string; notConfirmed: string }> = {
  basil: {
    confirmed: '그래, 새로운 단계로 넘어갔네. 잘 자라고 있어. 계속 이렇게만 해줘 🌿',
    notConfirmed: '알겠어. 아직 조금 더 기다리자. 준비되면 다시 물어볼게.',
  },
  tomato: {
    confirmed: '와~ 새로운 단계다! 나 잘 크고 있지? 앞으로도 잘 부탁해 🍅',
    notConfirmed: '아직이구나~ 괜찮아! 조금만 더 기다리면 분명 잘 자랄 거야 🌱',
  },
  tulip: {
    confirmed: '새로운 단계로 접어들었군요. 정성껏 돌봐주셔서 잘 자라고 있어요 🌷',
    notConfirmed: '알겠어요. 아직은 조금 더 기다려볼게요. 준비가 되면 다시 여쭤볼게요.',
  },
};

// ─── 헬퍼 함수 ───────────────────────────────────────────────────

/** 특정 식물의 특정 단계 config 반환 */
export function getStageConfig(
  plantType: PlantType,
  stage: number,
): GrowthStageConfig | undefined {
  return GROWTH_STAGES[plantType]?.find(s => s.stage === stage);
}

/** 현재 단계의 다음 단계 config 반환 */
export function getNextStageConfig(
  plantType: PlantType,
  currentStage: number,
): GrowthStageConfig | undefined {
  return GROWTH_STAGES[plantType]?.find(s => s.stage === currentStage + 1);
}

/** 현재 단계에서 활성화할 taskId 배열 반환 */
export function getActiveTaskIds(plantType: PlantType, stage: number): TaskId[] {
  return STAGE_TASKS[plantType]?.[stage] ?? [];
}

/** 최대 단계 수 반환 */
export function getMaxStage(plantType: PlantType): number {
  return GROWTH_STAGES[plantType]?.length ?? 1;
}
