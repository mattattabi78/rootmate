import { PlantType } from './character';
import { TaskId } from './plants';

// ─── 타입 ─────────────────────────────────────────────────────────
export type TriggerCondition = 'INITIAL' | 'DAYS_PASSED' | 'USER_CONFIRMED';

export interface GrowthStageConfig {
  stage: number;
  label: string;
  description?: string;
  triggerCondition: TriggerCondition;
  // 이 단계로 넘어가기 위한 최소 경과일 = '바로 앞 단계에 진입한 날'부터 센 일수
  // (DAYS_PASSED: 이 일수가 지나면 자동 진행 / USER_CONFIRMED: 이 일수가 지난 뒤부터 확인 질문을 함)
  // 1단계의 진입일은 앱에서 성장 상태가 처음 만들어진 날
  daysRequired?: number;
  confirmQuestion?: string;   // USER_CONFIRMED: 유저에게 물어볼 질문
  confirmedMessage?: string;  // USER_CONFIRMED: 유저가 '네'라고 했을 때 식물이 하는 말 (없으면 식물 공통 문구)
}

// ─── 성장 단계 데이터 ─────────────────────────────────────────────

export const BASIL_GROWTH_STAGES: GrowthStageConfig[] = [
  { stage: 1, label: '씨앗 심기',   description: '씨앗을 막 심은 상태',       triggerCondition: 'INITIAL' },
  { stage: 2, label: '발아 중',     description: '씨앗이 발아하는 중',         triggerCondition: 'DAYS_PASSED',    daysRequired: 3 },
  { stage: 3, label: '새싹',        description: '싹이 올라온 상태',           triggerCondition: 'USER_CONFIRMED', confirmQuestion: '싹이 올라왔나요?' },
  { stage: 4, label: '본잎 성장',   description: '본잎이 나오는 중',           triggerCondition: 'USER_CONFIRMED', confirmQuestion: '본잎이 2~3장 나왔나요?',   daysRequired: 7 },
  { stage: 5, label: '성장 중',     description: '빠르게 자라는 중',           triggerCondition: 'DAYS_PASSED',    daysRequired: 14 },
  // 순 따기도 두 단계로 나눔: ① 15cm 이상 자랐는지 → 순 따기를 먼저 안내 ② 다음 날부터 "순 따기를 했나요?" 확인
  { stage: 6, label: '15cm 이상 성장', description: '키 15~20cm, 순 따기 시기가 가까움', triggerCondition: 'USER_CONFIRMED', confirmQuestion: '키가 15cm 이상 자랐나요?',
    confirmedMessage: '꽤 컸네. 이제 줄기 끝을 잘라 주는 순 따기를 할 때야. 순을 따 주면 곁가지가 나와서 더 풍성해져. 꽃대가 올라오기 전에 하는 게 좋아. 서두르지 않아도 돼, 내일부터 어떻게 됐는지 물어볼게.' },
  { stage: 7, label: '순 따기',      description: '줄기 끝 2~3마디를 잘라 준 상태', triggerCondition: 'USER_CONFIRMED', confirmQuestion: '순 따기를 했나요?', daysRequired: 1,
    confirmedMessage: '잘했어. 이제 새 순이 올라올 거야. 기대해.' },
  { stage: 8, label: '무성한 바질', description: '풍성하게 자란 상태',         triggerCondition: 'DAYS_PASSED',    daysRequired: 7 },
  { stage: 9, label: '수확 가능',   description: '수확할 수 있는 상태',        triggerCondition: 'DAYS_PASSED',    daysRequired: 7 },
];

export const TOMATO_GROWTH_STAGES: GrowthStageConfig[] = [
  { stage: 1, label: '씨앗 심기',   triggerCondition: 'INITIAL' },
  { stage: 2, label: '발아 중',     triggerCondition: 'DAYS_PASSED',    daysRequired: 5 },
  { stage: 3, label: '새싹',        triggerCondition: 'USER_CONFIRMED', confirmQuestion: '싹이 올라왔나요?' },
  { stage: 4, label: '모종 성장',   triggerCondition: 'USER_CONFIRMED', confirmQuestion: '본잎이 2~3장 나왔나요?',          daysRequired: 7 },
  // 화분 옮겨심기도 두 단계로 나눔: ① 15cm 이상 자랐는지 → 큰 화분을 먼저 안내 ② 다음 날부터 "큰 화분으로 옮겨 심었나요?" 확인
  { stage: 5, label: '15cm 이상 성장', triggerCondition: 'USER_CONFIRMED', confirmQuestion: '키가 15cm 이상 자랐나요?', daysRequired: 14,
    confirmedMessage: '많이 컸어! 15cm가 넘으면 큰 화분으로 옮겨 줘야 해. 뿌리가 넉넉해야 열매도 잘 열린대! 15L 이상 화분이 좋아. 준비되면 옮겨 심어줘~ 내일부터 어떻게 됐는지 물어볼게!' },
  { stage: 6, label: '정식 완료',   triggerCondition: 'USER_CONFIRMED', confirmQuestion: '큰 화분으로 옮겨 심었나요?', daysRequired: 1,
    confirmedMessage: '와~ 새 집이다! 이제 쑥쑥 자랄게. 고마워! (๑>ᴗ<๑)' },
  { stage: 7, label: '줄기 성장',   triggerCondition: 'DAYS_PASSED',    daysRequired: 14 },
  { stage: 8, label: '꽃 피는 중',  triggerCondition: 'USER_CONFIRMED', confirmQuestion: '꽃이 피기 시작했나요?' },
  { stage: 9, label: '수확 가능',   triggerCondition: 'USER_CONFIRMED', confirmQuestion: '열매가 빨갛게 익었나요?' },
];

export const MARIGOLD_GROWTH_STAGES: GrowthStageConfig[] = [
  { stage: 1, label: '씨앗 심기',    triggerCondition: 'INITIAL' },
  { stage: 2, label: '발아 중',      triggerCondition: 'DAYS_PASSED',    daysRequired: 5 },
  { stage: 3, label: '새싹',         triggerCondition: 'USER_CONFIRMED', confirmQuestion: '싹이 올라왔나요?' },
  // 처음 키우는 유저가 당황하지 않도록 두 단계로 나눔: ① 15cm 이상 자랐는지 → 큰 화분이 좋다고 먼저 안내
  //                                                   ② 다음 날부터 "큰 화분으로 옮겨 심었나요?" 확인
  { stage: 4, label: '성장 중',      triggerCondition: 'USER_CONFIRMED', confirmQuestion: '키가 15cm 이상 자랐나요?', daysRequired: 14,
    confirmedMessage: '많이 컸네! 15cm가 넘으면 지금 화분은 좀 좁아. 큰 화분으로 옮겨 심으면 더 잘 자라. 서두르지 말고, 준비되면 옮겨 심어줘. 내일부터 어떻게 됐는지 물어볼게.' },
  { stage: 5, label: '옮겨심기',     triggerCondition: 'USER_CONFIRMED', confirmQuestion: '큰 화분으로 옮겨 심었나요?', daysRequired: 1,
    confirmedMessage: '좋아, 새 화분에서 더 쑥쑥 자랄 거야. 고마워.' },
  { stage: 6, label: '꽃망울',       triggerCondition: 'USER_CONFIRMED', confirmQuestion: '꽃망울이 맺혔나요?', daysRequired: 7 },
  { stage: 7, label: '개화',         triggerCondition: 'USER_CONFIRMED', confirmQuestion: '꽃이 피었나요?', daysRequired: 5 },
];

// plantType별 단계 config 통합
export const GROWTH_STAGES: Record<PlantType, GrowthStageConfig[]> = {
  basil:  BASIL_GROWTH_STAGES,
  tomato: TOMATO_GROWTH_STAGES,
  marigold: MARIGOLD_GROWTH_STAGES,
};

// ─── 단계별 활성 Task 매핑 ─────────────────────────────────────────

export const BASIL_STAGE_TASKS: Record<number, TaskId[]> = {
  1: ['water', 'sunlight', 'observe', 'photo'],
  2: ['water', 'sunlight', 'observe', 'photo'],
  3: ['water', 'sunlight', 'observe', 'photo'],
  4: ['water', 'sunlight', 'observe', 'photo'],
  5: ['water', 'sunlight', 'observe', 'photo'],
  6: ['water', 'sunlight', 'observe', 'photo'],
  7: ['water', 'sunlight', 'observe', 'photo'],
  8: ['water', 'sunlight', 'observe', 'photo'],
  9: ['water', 'sunlight', 'observe', 'photo'],
};

export const TOMATO_STAGE_TASKS: Record<number, TaskId[]> = {
  1: ['water', 'sunlight', 'observe', 'photo'],
  2: ['water', 'sunlight', 'observe', 'photo'],
  3: ['water', 'sunlight', 'observe', 'photo'],
  4: ['water', 'sunlight', 'observe', 'photo'],
  5: ['water', 'sunlight', 'observe', 'photo'],
  6: ['water', 'sunlight', 'observe', 'photo'],
  7: ['water', 'sunlight', 'observe', 'photo'],
  8: ['water', 'sunlight', 'observe', 'photo'],
  9: ['water', 'sunlight', 'observe', 'photo'],
};

export const MARIGOLD_STAGE_TASKS: Record<number, TaskId[]> = {
  1: ['water', 'sunlight', 'observe', 'photo'],
  2: ['water', 'sunlight', 'observe', 'photo'],
  3: ['water', 'sunlight', 'observe', 'photo'],
  4: ['water', 'sunlight', 'observe', 'photo'],
  5: ['water', 'sunlight', 'observe', 'photo'],
  6: ['water', 'sunlight', 'observe', 'photo'],
  7: ['water', 'sunlight', 'observe', 'photo'],
};

export const STAGE_TASKS: Record<PlantType, Record<number, TaskId[]>> = {
  basil:  BASIL_STAGE_TASKS,
  tomato: TOMATO_STAGE_TASKS,
  marigold: MARIGOLD_STAGE_TASKS,
};

// ─── DAYS_PASSED 자동 진행 시 채팅 메시지 ─────────────────────────
export const AUTO_ADVANCE_MESSAGES: Record<PlantType, Partial<Record<number, string>>> = {
  basil: {
    2: '슬슬 발아하고 있을 것 같아. 따뜻하게 유지해줘 🌡️',
    5: '많이 자랐지? 이제 쑥쑥 클 시간이야 🌿',
    8: '이제 꽤 무성해졌어. 잘 키워줘서 고마워 💚',
    9: '드디어 수확할 수 있을 것 같아! 기대돼? 🌿',
  },
  tomato: {
    2: '발아 중이야. 따뜻하고 촉촉하게 유지해줘 🌡️',
    7: '줄기가 많이 자랐어. 지지대 준비해줘 💪',
  },
  marigold: {
    2: '슬슬 싹이 올라올 것 같아. 햇볕이 드는 곳에서 촉촉하게 유지해줘.',
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
  marigold: {
    confirmed: '좋아, 새로운 단계로 넘어갔네. 잘 크고 있어. 계속 이렇게만 해줘 🌼',
    notConfirmed: '알겠어. 아직 조금 더 기다리자. 준비되면 다시 물어볼게.',
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
