import { getLocalDateString } from '../utils/date';
import { getDevAdjustedDate } from '../utils/devOverrides';

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
  return taskId === 'water' || taskId === 'sunlight' || taskId === 'observe';
}

// ─── 도감 정보 타입 ───────────────────────────────────────────────
export interface GrowthStep {
  step: number;
  title: string;
  content: string;
}

export interface CareGuideItem {
  icon: string;
  label: string;
  value: string;
}

export interface PlantInfo {
  name: string;
  emoji: string;
  tagline: string;
  totalPeriod: string;
  intro: string;
  growthSteps: GrowthStep[];
  careGuide: CareGuideItem[];
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
  tulip: {
    id: 'tulip',
    name: '튤립',
    scientificName: 'Tulipa',
    description: '안녕하세요☺️\n저를 선택해주셔서 감사합니다.\n잘 부탁드려요.',
    care: {
      water: '흙이 마르면 적당히',
      sunlight: '하루 4시간 이상',
      temperature: '10~20도',
      caution: '과습 주의, 서늘한 환경 선호',
    },
    growthDays: { sprout: 14, growing: 40, done: 70 },
    waterInterval: 3,
    nicknameHint: '튤리, 빨강이, 봄이...',
  },
};

export const PLANT_CODES: Record<string, string> = {
  'BAS-001': 'basil',
  'TOM-001': 'tomato',
  'TUL-001': 'tulip',
};

// ─── Task 스케줄 ──────────────────────────────────────────────────
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
  ],
  tulip: [
    {
      id: 'water',
      label: '물주기',
      description: '흙이 마를 때만 줘요. 과습 주의!',
      startWeek: 0,
      intervalDays: 3,
      notificationTime: '19:00',
      notifications: [
        '흙이 아직 촉촉하면 괜찮아요. 과습하면 구근이 썩거든요.',
        '흙이 너무 마르진 않았나요? 저에게 물 줄 시간이에요',
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
        '누구든 주기적으로 햇빛을 보는게 중요해요.',
        '오늘 날씨가 정말 좋아요. 밝은 곳에서 보고싶네요.',
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
  tulip: { photo: '사진 찍기' },
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
    growthSteps: [
      { step: 1, title: '씨앗 심기', content: '씨앗 3~5알을 한 화분에 0.5cm 이하 깊이로 얕게 심어 주세요. 씨앗 간 간격은 1~2cm 정도가 적당하며, 파종 시기는 4~6월이 가장 좋아요.' },
      { step: 2, title: '씨앗 발아', content: '랩이나 투명 덮개로 화분을 덮어 습도를 유지하고, 20~25°C 환경에서 키우면 5~10일 안에 싹이 올라와요.\n\n★ 키친타월 발아법\n키친타월 위에 씨앗을 올린 뒤 충분히 물을 분무해 주세요. 마르지 않도록 수시로 물을 뿌려주면 약 2일 내에 발아가 시작돼요. 뿌리가 0.5~1cm 정도 자라면 흙에 옮겨 심어 주세요.' },
      { step: 3, title: '성장', content: '발아 후에는 하루 6시간 이상 햇빛을 받을 수 있는 곳으로 옮겨 주세요. 본잎이 2~3장 나오면 가장 건강한 개체만 1~2그루 남기고 솎아내 주세요.' },
      { step: 4, title: '성장 관리', content: '2주에 한 번씩 액체 비료를 주고, 통풍이 잘되는 환경을 유지해 주세요.' },
      { step: 5, title: '바질 순 따기', content: '키가 15~20cm 정도 자라면 줄기 끝의 2~3마디를 잘라 주세요. 꽃대가 올라오면 바로 제거해야 해요. 꽃이 피기 시작하면 잎의 향이 약해지고 성장이 둔해질 수 있어요.' },
      { step: 6, title: '바질 수확', content: '파종 후 6~8주부터 수확할 수 있어요. 잎만 떼어내기보다 줄기를 마디 바로 위에서 잘라주면 새로운 순이 자라 더욱 풍성해져요. 향이 가장 진한 아침에 수확하는 것을 추천해요. 한 번에 전체 잎의 1/3 이상은 수확하지 않는 것이 좋아요.' },
    ],
    careGuide: [
      { icon: '☀️', label: '햇빛', value: '하루 6시간 이상, 남향 창가 최적' },
      { icon: '💧', label: '물', value: '흙 1cm를 찔렀을 때 건조하면 주기. 과습 주의' },
      { icon: '🌡️', label: '온도', value: '15°C 이하면 성장 멈춤. 에어컨 바람 피하기' },
      { icon: '🪴', label: '화분', value: '지름 15cm 이상, 배수구 필수' },
    ],
  },
  tomato: {
    name: '방울토마토',
    emoji: '🍅',
    tagline: '노력이 결실을 맺는 식물',
    totalPeriod: '약 90~120일',
    intro: '빨갛게 익기까지는 시간이 걸리지만,\n기다린 만큼 달콤한 열매를 선물해 주는 식물이에요.\n수확량이 많아 키우는 재미와 성취감을 함께 느낄 수 있어요.',
    growthSteps: [
      { step: 1, title: '씨앗 심기', content: '파종 시기는 3~4월이 좋아요. 씨앗을 하루 정도 물에 불려두면 발아율을 높일 수 있어요. 작은 화분에 씨앗 2~3알씩, 0.5~1cm 깊이로 심어 주세요.' },
      { step: 2, title: '씨앗 발아', content: '20~25°C의 따뜻한 환경을 유지하고, 랩이나 투명 덮개로 덮어 습도를 유지해 주세요. 보통 7~14일 안에 싹이 올라와요.' },
      { step: 3, title: '모종 관리', content: '싹이 나오면 덮개를 제거하고 햇빛이 잘 드는 곳으로 옮겨 주세요. 방울토마토는 하루 8시간 이상 햇빛이 필요해요. 본잎이 2~3장 나오면 가장 건강한 모종 1그루만 남기고 솎아 주세요.' },
      { step: 4, title: '성장', content: '모종의 키가 15~20cm 정도 되고 본잎이 5~6장 나오면 큰 화분으로 옮겨 심어요. 화분은 최소 15L 이상을 추천해요. 옮겨 심기 2~3일 전부터 바깥 환경에 조금씩 적응시키면 스트레스를 줄일 수 있어요.' },
      { step: 5, title: '성장 관리', content: '키가 자라기 시작하면 지지대를 세워 줄기를 묶어 주세요. 2주에 한 번씩 토마토용 액체 비료를 주면 건강하게 자랄 수 있어요.' },
      { step: 6, title: '곁순 제거', content: '줄기와 잎 사이에서 자라는 곁순은 어릴 때 제거해 주세요. 곁순이 너무 많아지면 영양분이 분산되어 열매가 작아질 수 있어요.' },
      { step: 7, title: '수분 돕기', content: '꽃이 피면 줄기나 꽃송이를 가볍게 흔들어 주세요. 실내에서는 벌과 같은 곤충이 부족하기 때문에 직접 수분을 도와주면 열매가 더 잘 맺혀요.' },
      { step: 8, title: '토마토 수확', content: '파종 후 약 90~120일이 지나고 열매가 전체적으로 붉게 익으면 수확할 수 있어요. 꼭지 위 줄기를 함께 잘라 수확해 주세요. 냉장 보관보다는 서늘한 실온에 보관하는 것이 풍미를 유지하는 데 도움이 돼요.' },
    ],
    careGuide: [
      { icon: '☀️', label: '햇빛', value: '하루 8시간 이상 필수.\n빛 부족 시 웃자람, 열매 불량' },
      { icon: '💧', label: '물', value: '흙 표면 2~3cm가 마르면 듬뿍.\n불규칙하면 배꼽썩음병 발생' },
      { icon: '🌡️', label: '온도', value: '낮 20~28°C, 밤 15°C 이상.\n10°C 이하면 성장 멈춤' },
      { icon: '🪴', label: '화분', value: '클수록 좋음. 배수구 필수' },
    ],
  },
  tulip: {
    name: '튤립',
    emoji: '🌷',
    tagline: '행복은 천천히 피어난다',
    totalPeriod: '이듬해 3~4월 개화',
    intro: '추운 겨울을 견디고 봄이 되면 꽃을 피우는 식물.\n보이지 않는 시간에도 묵묵히 준비하며,\n기다림 끝에 행복을 선물해요.',
    growthSteps: [
      { step: 1, title: '구근 준비', content: '심는 시기는 10~11월이 좋아요. 심기 전 하루 정도 서늘한 곳에 두어 환경에 적응시켜 주세요.' },
      { step: 2, title: '심기', content: '구근의 뾰족한 부분이 위를 향하도록 심어 주세요. 깊이는 구근 높이의 2~3배 정도(보통 10~15cm)가 적당해요. 구근 사이 간격은 10~15cm 정도 두고, 배수가 잘되는 흙을 사용해 주세요.' },
      { step: 3, title: '냉장 처리 (실내 재배 시 필수)', content: '튤립은 추운 겨울을 지나야 꽃을 피울 수 있어요. 실외에서 키운다면 자연스럽게 해결되지만, 실내에서 키운다면 구근을 심은 상태로 냉장고(4~5°C)에 8~10주 정도 보관해 주세요. 이 과정을 거치지 않으면 꽃이 피지 않을 수 있어요.\n※ 현재 앱에서는 이 단계가 완료된 상태에서 시작해요.' },
      { step: 4, title: '발아 후 관리', content: '냉장 처리가 끝난 후 햇빛이 드는 곳으로 옮기면 싹이 올라오기 시작해요. 하루 6시간 이상 햇빛을 받을 수 있는 환경이 좋아요. 물은 흙이 마른 뒤에만 주고, 과습하지 않도록 주의해 주세요.' },
      { step: 5, title: '개화', content: '충분히 자란 튤립은 보통 이듬해 3~4월에 꽃을 피워요. 조금 느려 보여도 괜찮아요. 튤립은 자신만의 속도로 봄을 준비한답니다.' },
      { step: 6, title: '꽃이 진 후 관리', content: '꽃이 졌다고 해서 잎을 바로 자르지 마세요. 잎이 완전히 노랗게 마를 때까지 기다려야 구근에 충분한 영양이 저장돼요. 잎이 모두 마르면 구근을 캐내어 서늘하고 건조한 곳에 보관한 뒤, 다음 가을에 다시 심어 주세요.' },
    ],
    careGuide: [
      { icon: '☀️', label: '햇빛', value: '하루 6시간 이상' },
      { icon: '💧', label: '물', value: '흙이 마를 때만. 과습주의! (구근 썩음의 원인)' },
      { icon: '🌡️', label: '온도', value: '냉장 처리 필수 (4~5°C, 8~10주). 이후 서늘한 실온' },
      { icon: '🪴', label: '화분', value: '깊은 화분 필요. 최소 깊이 20cm 이상' },
    ],
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
): boolean {
  const tasks = PLANT_TASKS[plantType] ?? [];
  const observationTask = tasks.find(item => item.id === 'observe');
  const sunlightTask = tasks.find(item => item.id === 'sunlight');
  const waterTask = tasks.find(item => item.id === 'water');
  const waterCompletedToday = completedTasks.some(
    entry => entry.taskId === 'water' && entry.completedAt === today,
  );

  if (!observationTask || !sunlightTask || !waterTask || waterCompletedToday) return false;
  if (!isTaskDue(sunlightTask, plantedAt, completedTasks, today)) return false;
  if (isTaskDue(waterTask, plantedAt, completedTasks, today)) return false;
  return isTaskDue(observationTask, plantedAt, completedTasks, today);
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
): PlantTask[] {
  const tasks = PLANT_TASKS[plantType] ?? [];
  const observationDue = isObservationDue(plantType, plantedAt, completedTasks);
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
      return isTaskDue(task, plantedAt, completedTasks);
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
