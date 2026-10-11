import { getLocalDateString } from '../utils/date';
import { getDevAdjustedDate } from '../utils/devOverrides';
import { isWaterDue } from './watering';

// ─── 기존 인터페이스 ──────────────────────────────────────────────
export interface PlantCare {
  water: string;
  sunlight: string;
  temperature: string;
  caution: string;
}

export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  care: PlantCare;
  growthDays: { sprout: number; growing: number; done: number };
  waterInterval: number;
  nicknameHint: string;
}

export interface PlantData {
  id: string;
  code?: string;
  adoptedAt: string;
  nickname: string;
  growthStage: 'seed' | 'sprout' | 'growing' | 'done';
  photoUri?: string;
}

// ─── Task 타입 ────────────────────────────────────────────────────
export type TaskId =
  | 'water'
  | 'sunlight'
  | 'observe'
  | 'pruning'
  | 'flower_remove'
  | 'fertilize'
  | 'harvest'
  | 'side_shoot'
  | 'pollinate'
  | 'support_stake'
  | 'photo';

export interface PlantTask {
  id: TaskId;
  label: string;
  description: string;
  startWeek: number;
  intervalDays: number;
  notificationTime: string;
  oneTime?: boolean;
  daysOfWeek?: number[]; // 특정 요일에만 표시 (0=일, 3=수, 6=토)
  notifications: string[];
}

export function isSupportedTask(taskId: TaskId): boolean {
  return taskId === 'water' || taskId === 'sunlight' || taskId === 'observe' || taskId === 'photo';
}

/** 사진 찍는 요일 (0=일 … 6=토): 수·토. 이 날에는 관찰하기를 생략한다 */
export const PHOTO_DAYS = [3, 6];

// ─── 도감 정보 타입 (상세 탭 본문은 constants/plantGuide.ts) ───────────────────────────────────────────────
export interface PlantInfo {
  name: string;
  emoji: string;
  tagline: string;
  totalPeriod: string;
  intro: string;
  /** 도감 카드용 짧은 소개 (줄바꿈 포함, Figma 문구) */
  cardIntro?: string;
}

// ─── 기존 식물 데이터 ─────────────────────────────────────────────
export const PLANTS: Record<string, Plant> = {
  basil: {
    id: 'basil',
    name: '바질',
    scientificName: 'Ocimum basilicum',
    description: '안녕 ⩌ㅅ⩌\n 날 키운다니 좋은 선택이야.\n기대할게',
    care: {
      water: '흙 표면이 마르면 충분히',
      sunlight: '하루 4시간 이상',
      temperature: '18~30도',
      caution: '과습 주의, 뿌리 썩음 조심',
    },
    growthDays: { sprout: 7, growing: 30, done: 60 },
    waterInterval: 2,
    nicknameHint: '바질이, 초록이, 버질...',
  },
  tomato: {
    id: 'tomato',
    name: '방울토마토',
    scientificName: 'Solanum lycopersicum var. cerasiforme',
    description: '안녕! 난 멋쟁이 토마토야 (๑>ᴗ<๑)\n 내가 무럭무럭 자랄 수 있게 해줘\n잘 부탁해!',
    care: {
      water: '겉흙이 마르면 듬뿍',
      sunlight: '하루 6시간 이상',
      temperature: '20~30도',
      caution: '직사광선 필요, 통풍 중요',
    },
    growthDays: { sprout: 10, growing: 45, done: 90 },
    waterInterval: 2,
    nicknameHint: '토마링, 토토, 방울이...',
  },
  marigold: {
    id: 'marigold',
    name: '메리골드',
    scientificName: 'Tagetes',
    description: '안녕. 날 키운다니 좋은 선택이야.\n햇빛만 충분하면 금방 꽃 피울 수 있어.\n기대할게',
    care: {
      water: '겉흙이 마르면 흠뻑',
      sunlight: '하루 4~6시간 이상 직사광선',
      temperature: '15~30도',
      caution: '과습 주의, 뿌리 썩음 조심',
    },
    growthDays: { sprout: 7, growing: 30, done: 40 },
    waterInterval: 3,
    nicknameHint: '메리, 골드, 노랑이...',
  },
};

export const PLANT_CODES: Record<string, string> = {
  'BAS-001': 'basil',
  'TOM-001': 'tomato',
  'MAR-001': 'marigold',
};

// ─── Task 스케줄 ──────────────────────────────────────────────────
// 물주기의 실제 주기는 constants/watering.ts(계절·성장 단계 보정). 아래 water.intervalDays는 참고용 기본값.
export const PLANT_TASKS: Record<string, PlantTask[]> = {
  basil: [
    {
      id: 'water',
      label: '물주기',
      description: '흙이 말랐는지 확인하고 물을 줘요',
      startWeek: 0,
      intervalDays: 2,
      notificationTime: '19:00',
      notifications: [
        '흙 한번 찔러봐. 말랐으면 물 좀 줘.',
        '목말라. 흙 말랐음 물 좀 줘.',
      ],
    },
    {
      id: 'sunlight',
      label: '햇빛 확인',
      description: '하루 6시간 이상 햇빛이 필요해요',
      startWeek: 0,
      intervalDays: 1,
      notificationTime: '19:00',
      notifications: [
        '햇빛 좀 받아야겠어. 창가로 데려가.',
        '빛 부족하면 나 맛없어져. 참고해.',
      ],
    },
    {
      id: 'observe',
      label: '관찰하기',
      description: '지금 내 모습이 어떤지 이야기해요',
      startWeek: 0,
      intervalDays: 3,
      notificationTime: '19:00',
      notifications: ['지금 내 모습 어때?'],
    },
    {
      id: 'photo',
      label: '사진 찍기',
      description: '식물 사진을 찍으면 캐릭터가 업데이트돼요 (수·토)',
      startWeek: 0,
      intervalDays: 1,
      daysOfWeek: PHOTO_DAYS,
      notificationTime: '19:00',
      notifications: ['오늘은 사진 찍는 날이야. 내 모습 남겨줘!', '내 사진 찍어줄래? 나 많이 컸을걸.'],
    },
  ],
  tomato: [
    {
      id: 'water',
      label: '물주기',
      description: '흙 표면 2~3cm가 마르면 듬뿍 줘요',
      startWeek: 0,
      intervalDays: 2,
      notificationTime: '19:00',
      notifications: [
        '나 물 줄 때가 된 것 같은데~!',
        '잘 지내고 있지? 나 목말라~',
      ],
    },
    {
      id: 'sunlight',
      label: '햇빛 확인',
      description: '하루 8시간 이상 햇빛이 필요해요',
      startWeek: 0,
      intervalDays: 1,
      notificationTime: '19:00',
      notifications: [
        '오늘 날씨 진짜 좋다던데! 나도 햇빛이 보고싶어 ㅜ',
        '빛 부족하면 열매가 안 열릴걸? 햇빛 확인해줘~',
      ],
    },
    {
      id: 'observe',
      label: '관찰하기',
      description: '지금 내 모습이 어떤지 이야기해요',
      startWeek: 0,
      intervalDays: 3,
      notificationTime: '19:00',
      notifications: ['지금 내 모습 어때?'],
    },
    {
      id: 'photo',
      label: '사진 찍기',
      description: '식물 사진을 찍으면 캐릭터가 업데이트돼요 (수·토)',
      startWeek: 0,
      intervalDays: 1,
      daysOfWeek: PHOTO_DAYS,
      notificationTime: '19:00',
      notifications: ['오늘은 사진 찍는 날이야. 내 모습 남겨줘!', '내 사진 찍어줄래? 나 많이 컸을걸.'],
    },
  ],
  marigold: [
    {
      id: 'water',
      label: '물주기',
      description: '겉흙이 마르면 흠뻑 줘요',
      startWeek: 0,
      intervalDays: 3,
      notificationTime: '19:00',
      notifications: [
        '목말라. 흙이 말랐는지 확인해 줘.',
        '흙 한번 만져봐. 말랐으면 물 좀 줘.',
        '흙이 바삭해 보이는데? 물 한 잔 부탁할게.',
      ],
    },
    {
      id: 'sunlight',
      label: '햇빛 확인',
      description: '하루 4~6시간 이상 직사광선이 필요해요',
      startWeek: 0,
      intervalDays: 1,
      notificationTime: '19:00',
      notifications: [
        '햇빛 좀 받아야겠어. 창가로 데려가줘.',
        '빛이 부족하면 꽃이 안 필지도 몰라..',
        '햇빛이 부족하면 잎이 약해질 수 있어.',
      ],
    },
    {
      id: 'observe',
      label: '관찰하기',
      description: '지금 내 모습이 어떤지 이야기해요',
      startWeek: 0,
      intervalDays: 3,
      notificationTime: '19:00',
      notifications: ['지금 내 모습 어때?'],
    },
    {
      id: 'photo',
      label: '사진 찍기',
      description: '식물 사진을 찍으면 캐릭터가 업데이트돼요 (수·토)',
      startWeek: 0,
      intervalDays: 1,
      daysOfWeek: PHOTO_DAYS,
      notificationTime: '19:00',
      notifications: ['오늘은 사진 찍는 날이야. 내 모습 남겨줘!', '내 사진 찍어줄래? 나 많이 컸을걸.'],
    },
  ],
};

const LEGACY_TASK_LABELS: Record<string, Record<string, string>> = {
  basil: {
    fertilize: '비료 주기',
    pruning: '순 따기',
    flower_remove: '꽃대 제거',
    harvest: '수확',
    photo: '사진 찍기',
  },
  tomato: {
    side_shoot: '곁순 제거',
    fertilize: '비료 주기',
    support_stake: '지지대 세우기',
    pollinate: '수분 돕기',
    harvest: '수확',
    photo: '사진 찍기',
  },
  marigold: {
    pruning: '순 자르기',
    fertilize: '비료 주기',
    photo: '사진 찍기',
  },
};

export function getTaskLabel(plantType: string | undefined, taskId: string): string {
  const activeTasks = plantType ? PLANT_TASKS[plantType] : Object.values(PLANT_TASKS).flat();
  const activeLabel = activeTasks?.find(task => task.id === taskId)?.label;
  const legacyLabel = plantType
    ? LEGACY_TASK_LABELS[plantType]?.[taskId]
    : Object.values(LEGACY_TASK_LABELS).map(labels => labels[taskId]).find(Boolean);
  return activeLabel ?? legacyLabel ?? taskId;
}

// ─── 도감 정보 데이터 ─────────────────────────────────────────────
export const PLANT_INFO: Record<string, PlantInfo> = {
  basil: {
    name: '바질',
    emoji: '🌿',
    tagline: '작은 희망을 품은 허브',
    totalPeriod: '약 6~8주',
    intro: '열대 아시아가 원산지인 향긋한 허브예요.\n민트 향과 은은한 정향 향이 어우러져 다양한 요리에 활용되며,\n발아가 쉬워 초보자도 부담 없이 키울 수 있어요.',
    cardIntro: '열대 아시아 원산의 향긋한 허브로,\n민트향과 은은한 정향이 어우러져\n요리에 잘 어울려요.\n발아가 잘 돼서 초보자도 키우기 쉬워요!',
  },
  tomato: {
    name: '방울토마토',
    emoji: '🍅',
    tagline: '노력이 결실을 맺는 식물',
    totalPeriod: '약 90~120일',
    intro: '빨갛게 익기까지는 시간이 걸리지만,\n기다린 만큼 달콤한 열매를 선물해줘요.\n수확량이 많아 키우는 재미가 있어요!',
  },
  marigold: {
    name: '메리골드',
    emoji: '🌼',
    tagline: '반드시 오고야 말 행복',
    totalPeriod: '파종 후 약 30~40일 개화',
    intro: '노란빛, 주황빛 꽃을 오래 피우는 튼튼한 꽃이에요.\n햇빛만 충분하면 초보자도 쉽게 키울 수 있고,\n시든 꽃을 정리해 주면 새 꽃이 계속 피어나요.',
    cardIntro: '노란빛, 주황빛 꽃을 오래 피우는\n튼튼한 꽃이에요.\n햇빛만 충분하면 초보자도\n쉽게 키울 수 있어요!',
  },
};

// ─── 헬퍼 함수 ───────────────────────────────────────────────────

/** 완료 후 주기가 지났거나 아직 완료하지 않아 밀린 task인지 확인 */
export function isTaskDue(
  task: PlantTask,
  plantedAt: string,
  completedTasks: { taskId: string; completedAt: string }[],
  today = getLocalDateString(getDevAdjustedDate()),
): boolean {
  if (task.oneTime || task.intervalDays <= 0) return true;

  const lastCompletedDate = completedTasks
    .filter(entry => entry.taskId === task.id)
    .reduce<string | undefined>(
      (latest, entry) => !latest || entry.completedAt > latest ? entry.completedAt : latest,
      undefined,
    );

  const dueDate = lastCompletedDate
    ? new Date(`${lastCompletedDate}T00:00:00`)
    : new Date(plantedAt);

  if (!lastCompletedDate) {
    dueDate.setHours(0, 0, 0, 0);
    dueDate.setDate(dueDate.getDate() + task.startWeek * 7);
  } else {
    dueDate.setDate(dueDate.getDate() + task.intervalDays);
  }

  return new Date(`${today}T00:00:00`) >= dueDate;
}

export function isObservationDue(
  plantType: string,
  plantedAt: string,
  completedTasks: { taskId: string; completedAt: string }[],
  today = getLocalDateString(getDevAdjustedDate()),
  stage = 1,
): boolean {
  const tasks = PLANT_TASKS[plantType] ?? [];
  const observationTask = tasks.find(item => item.id === 'observe');
  const sunlightTask = tasks.find(item => item.id === 'sunlight');
  const waterTask = tasks.find(item => item.id === 'water');
  const waterCompletedToday = completedTasks.some(
    entry => (entry.taskId === 'water' || entry.taskId === 'water_moist') && entry.completedAt === today,
  );

  if (!observationTask || !sunlightTask || !waterTask || waterCompletedToday) return false;
  // 사진 찍는 날(수·토)에는 관찰하기 생략 — 사진 찍기 자체가 관찰
  if (PHOTO_DAYS.includes(new Date(`${today}T00:00:00`).getDay())) return false;
  if (!isTaskDue(sunlightTask, plantedAt, completedTasks, today)) return false;
  if (isWaterDue(plantType, stage, completedTasks, today)) return false;
  return isTaskDue(observationTask, plantedAt, completedTasks, today);
}

/** task 종류별 '오늘 해야 하는 날인지' 판단 — 물주기는 계절·성장 단계 보정(constants/watering.ts) */
export function isTaskDueFor(
  plantType: string,
  stage: number,
  task: PlantTask,
  plantedAt: string,
  completedTasks: { taskId: string; completedAt: string }[],
  today = getLocalDateString(getDevAdjustedDate()),
): boolean {
  if (task.id === 'water') return isWaterDue(plantType, stage, completedTasks, today);
  return isTaskDue(task, plantedAt, completedTasks, today);
}

/** 파종일 기준 현재 주차 계산 */
export function getCurrentWeek(plantedAt: string): number {
  const planted = new Date(plantedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/** 오늘 해야 할 task 목록 반환 */
export function getTodayTasks(
  plantType: string,
  plantedAt: string,
  completedTaskIds: string[],
  completedTasks: { taskId: string; completedAt: string }[] = [],
  stage = 1,
): PlantTask[] {
  const tasks = PLANT_TASKS[plantType] ?? [];
  const observationDue = isObservationDue(plantType, plantedAt, completedTasks, undefined, stage);
  const observationDay = observationDue || completedTaskIds.includes('observe');
  const currentWeek = getCurrentWeek(plantedAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planted = new Date(plantedAt);
  planted.setHours(0, 0, 0, 0);
  const daysSincePlanted = Math.floor((today.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));

  return tasks.filter(task => {
    if (!isSupportedTask(task.id)) return false;
    if (currentWeek < task.startWeek) return false;
    if (task.id === 'sunlight' && observationDay) return false;
    if (task.id === 'observe' && !observationDue) return false;

    if (task.oneTime) {
      return !completedTasks.some(entry => entry.taskId === task.id);
    }

    if (task.intervalDays === 0) return !completedTaskIds.includes(task.id);
    if (task.id === 'water' || task.id === 'sunlight' || task.id === 'observe') {
      return isTaskDueFor(plantType, stage, task, plantedAt, completedTasks);
    }

    const daysFromStart = daysSincePlanted - task.startWeek * 7;
    if (daysFromStart < 0) return false;
    return daysFromStart % task.intervalDays === 0;
  });
}

/** 특정 task의 다음 실행 예정일 계산 */
export function getNextTaskDate(
  task: PlantTask,
  plantedAt: string,
  lastCompletedDate?: string,
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (task.oneTime || task.intervalDays === 0) return today;

  if (lastCompletedDate) {
    const last = new Date(lastCompletedDate);
    last.setHours(0, 0, 0, 0);
    const next = new Date(last);
    next.setDate(next.getDate() + task.intervalDays);
    return next;
  }

  const planted = new Date(plantedAt);
  planted.setHours(0, 0, 0, 0);
  const startDate = new Date(planted);
  startDate.setDate(startDate.getDate() + task.startWeek * 7);

  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceStart < 0) return startDate;

  const periodsPassed = Math.floor(daysSinceStart / task.intervalDays);
  const next = new Date(startDate);
  next.setDate(next.getDate() + (periodsPassed + 1) * task.intervalDays);
  return next;
}

/** task 알림 메시지를 랜덤으로 하나 선택 */
export function getRandomNotification(task: PlantTask): string {
  const { notifications } = task;
  return notifications[Math.floor(Math.random() * notifications.length)];
}

/** growthStage 문자열을 현재 성장 단계 번호로 변환 */
export function growthStageToStep(stage: string, totalSteps: number): number {
  switch (stage) {
    case 'seed':    return 1;
    case 'sprout':  return 2;
    case 'growing': return Math.max(3, Math.floor(totalSteps * 0.5));
    case 'done':    return totalSteps;
    default:        return 1;
  }
}
