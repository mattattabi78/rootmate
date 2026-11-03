import { PlantType } from './character';

export interface PlantChatMessages {
  greeting: (plantNickname: string) => string;
  longBreakGreeting: (plantNickname: string) => string;
  /** task 확인 질문 — task 종류별 문구, 모든 식물 공통(바질 말투) */
  taskAsk: (taskId: string, taskLabel: string) => string;
  taskDone: () => string;
  taskSkip: (taskLabel: string) => string;
  taskRetry: (taskLabel: string) => string;
  reminderYes: () => string;
  reminderNo: () => string;
  waterMoist: () => string;
  sunlightCloudy: () => string;
  photoAsk: string;
  photoLater: () => string;
  photoUploaded: () => string;
  alreadyDone: () => string;
  transitionToQuestion: () => string;
}

function randomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

// task 확인 질문은 매일 받으므로 식물과 관계없이 담백한 바질 말투로 통일
const taskAskCommon = (taskId: string, label: string): string => {
  if (taskId === 'water') return '오늘 물 줬어?';
  if (taskId === 'sunlight') return '오늘 햇빛은 봤어?';
  return `오늘 ${label} 했어?`;
};

const MESSAGES: Record<PlantType, PlantChatMessages> = {
  basil: {
    greeting: (n) => `왔어? 오늘 ${n} 상태 확인하러 왔지? 🌿`,
    longBreakGreeting: (n) => randomMessage([
      `오랜만이네... ${n} 보고 싶었어. 잘 지냈지? 🌿`,
      `${n} 오랜만인데, 계속 잘 지내고 있었어?`,
      `7일이나 안 보였네. ${n} 지금까지 잘 있었어? 🌱`,
    ]),
    taskAsk: taskAskCommon,
    taskDone: () => randomMessage(['오케이. 잘했어 👍', '좋아. 오늘도 잘 챙겨줬네 🌿', '고마워. 덕분에 힘이 나!']),
    taskSkip: (label) => `${label} 못 했구나. 2시간 뒤에 알림 줄까?`,
    taskRetry: (label) => `그래서, 지금은 ${label} 했어?`,
    reminderYes: () => randomMessage(['알림 맞춰뒀어. 잊지 말고.', '좋아, 2시간 뒤에 알려줄게.', '알림 설정했어. 그때 꼭 해줘.']),
    reminderNo: () => randomMessage(['알겠어. 오늘은 그냥 넘어가자.', '괜찮아. 시간 될 때 해줘.', '좋아, 다음에 잊지 않도록 하자.']),
    waterMoist: () => randomMessage(['흙이 촉촉하면 안 줘도 돼. 확인해줬네.', '아직 물을 안 줘도 괜찮아. 잘 살펴봤어!', '촉촉한 상태구나. 오늘은 물을 쉬어도 돼.']),
    sunlightCloudy: () => randomMessage(['날씨가 흐렸구나. 그럼 어쩔 수 없지.', '햇빛이 없던 날도 있는 거지. 괜찮아.', '그래, 내일은 볕이 들었으면 좋겠다.']),
    photoAsk: '지금 내 사진 찍어줄 수 있어? 📸',
    photoLater: () => randomMessage(['그래, 나중에 꼭 찍어줘.', '알겠어. 시간 날 때 보여줘', '좋아, 다음에 사진 기다리고 있을게.']),
    photoUploaded: () => randomMessage(['받았어. 잘 찍혔다. 🌿', '사진 확인했어. 정말 잘 찍어줬구나', '고마워. 내 모습이 잘 보이네 🌿']),
    alreadyDone: () => randomMessage(['오늘 이미 다 했어. 수고했어.', '오늘 할 일은 모두 끝났어. 고마워!', '오늘도 빠짐없이 챙겨줬네. 정말 수고했어.']),
    transitionToQuestion: () => randomMessage(['나 챙겨줘서 고마워.', '오늘도 돌봐줘서 고마워.', '덕분에 오늘도 든든했어.']),
  },
  tomato: {
    greeting: (n) => `안녕! 나야 ${n}! 오늘도 같이하자~ (๑>ᴗ<๑) 🍅`,
    longBreakGreeting: (n) => randomMessage([
      `드디어 왔어! ${n} 보고 싶었어... 7일이나 지나버렸네 >< 🍅`,
      `오랜만이야! ${n} 진짜 보고 싶었어 >_<`,
      `${n} 아직 살아 있었어? 7일 동안 너무 기다렸잖아...`,
    ]),
    taskAsk: taskAskCommon,
    taskDone: () => randomMessage(['와~ 잘 했어! 역시 최고야! 🎉', '최고다~ 오늘도 완벽해! 🎉', '잘했어! 덕분에 기분이 좋아 🍅']),
    taskSkip: (label) => `에구, ${label} 못 했구나... 2시간 뒤에 알림 받을래?`,
    taskRetry: (label) => `혹시 지금은 ${label} 했어?? ><`,
    reminderYes: () => randomMessage(['알겠어! 2시간 뒤에 꼭 알려줄게 ⏰', '좋아! 알림 맞춰둘게 ⏰', '잊지 않게 내가 2시간 뒤에 알려줄게!']),
    reminderNo: () => randomMessage(['그럼 시간 날 때 꼭 해줘~', '알겠어~ 나중에 꼭 챙겨줘!', '좋아, 나중에 잊지 말고 해줘 🍅']),
    waterMoist: () => randomMessage(['흙이 촉촉하구나! 오늘은 안 줘도 돼 💧', '아직 물은 필요 없겠다! 고마워!', '촉촉해서 다행이다~ 오늘은 물을 쉬자 💧']),
    sunlightCloudy: () => randomMessage(['흐린 날이었구나~ 괜찮아! 내일은 해가 뜰 거야!', '햇빛이 없었다니 아쉽다 ㅜㅜ 내일 같이 쬐자!', '그런 날도 있지~ 알려줘서 고마워!']),
    photoAsk: '이번엔 내 사진 찍어줘! 📸',
    photoLater: () => randomMessage(['알겠어~ 나중에 꼭 찍어줘! 🍅', '좋아~ 다음에 예쁜 사진 보여줘!', '기다리고 있을게~ 시간 날 때 찍어줘 📸']),
    photoUploaded: () => randomMessage(['와 사진 너무 예뻐! 고마워 📸', '사진 잘 받았어~ 정말 멋지다!', '내 사진 찍어줘서 고마워 🍅']),
    alreadyDone: () => randomMessage(['오늘 이미 다 했어! 정말 수고했어~ ', '오늘 할 일 모두 끝냈네! 최고야 🎉', '오늘도 나를 잘 챙겨줬어. 고마워 🍅']),
    transitionToQuestion: () => randomMessage(['오늘도 챙겨줘서 고마워! (◍\'ᗜ\'◍)', '오늘도 잘 돌봐줘서 고마워~', '덕분에 오늘도 기분이 좋아!']),
  },
  marigold: {
    greeting: (n) => `왔어? 오늘 ${n} 상태 확인하러 왔지? 🌼`,
    longBreakGreeting: (n) => randomMessage([
      `오랜만이네... ${n} 보고 싶었어. 잘 지냈지?`,
      `${n} 오랜만인데, 계속 잘 지내고 있었어?`,
      `7일이나 안 보였네. ${n} 지금까지 잘 있었어?`,
    ]),
    taskAsk: taskAskCommon,
    taskDone: () => randomMessage(['오케이. 잘했어.', '관리 꽤 잘하네.', '이 정도면 합격이야. 고마워 🌼']),
    taskSkip: (label) => `${label} 못 했구나. 2시간 뒤에 알림 줄까?`,
    taskRetry: (label) => `그래서, 지금은 ${label} 했어?`,
    reminderYes: () => randomMessage(['알림 맞춰뒀어. 잊지 말고.', '좋아, 2시간 뒤에 알려줄게.', '알림 설정했어. 그때 꼭 해줘.']),
    reminderNo: () => randomMessage(['알겠어. 오늘은 그냥 넘어가자.', '괜찮아. 시간 될 때 해줘.', '좋아, 다음에 잊지 않도록 하자.']),
    waterMoist: () => randomMessage(['흙이 촉촉하면 안 줘도 돼. 확인해줬네.', '아직 물을 안 줘도 괜찮아. 잘 살펴봤어!', '촉촉한 상태구나. 오늘은 물을 쉬어도 돼.']),
    sunlightCloudy: () => randomMessage(['날씨가 흐렸구나. 그럼 어쩔 수 없지.', '햇빛이 없던 날도 있는 거지. 괜찮아.', '그래, 내일은 볕이 들었으면 좋겠다.']),
    photoAsk: '지금 내 사진 찍어줄 수 있어? 📸',
    photoLater: () => randomMessage(['그래, 나중에 꼭 찍어줘.', '알겠어. 시간 날 때 보여줘', '좋아, 다음에 사진 기다리고 있을게.']),
    photoUploaded: () => randomMessage(['받았어. 잘 찍혔다. 🌼', '사진 확인했어. 정말 잘 찍어줬구나', '고마워. 내 모습이 잘 보이네 🌼']),
    alreadyDone: () => randomMessage(['오늘 이미 다 했어. 수고했어.', '오늘 할 일은 모두 끝났어. 고마워!', '오늘도 빠짐없이 챙겨줬네. 정말 수고했어.']),
    transitionToQuestion: () => randomMessage(['나 챙겨줘서 고마워.', '오늘도 돌봐줘서 고마워.', '덕분에 오늘도 든든했어.']),
  },
};

export function getPlantMessages(plantType: PlantType): PlantChatMessages {
  return MESSAGES[plantType];
}

// ─── task 확인 질문의 선택지 (물주기·햇빛 확인 등 모든 task가 같은 구성) ───────────
// 했어 / 오늘은 안 해도 되는 이유(선택) / 깜빡함
const TASK_CHOICES: Record<string, { done: string; alt?: string; skip: string }> = {
  water:    { done: '당연하지!', alt: '아직 흙이 촉촉해.',     skip: '깜빡했어 ㅜㅜ' },
  sunlight: { done: '당연하지!', alt: '오늘은 날씨가 흐렸어.', skip: '깜빡했어 ㅜㅜ' },
};
const DEFAULT_TASK_CHOICES = { done: '당연하지!', skip: '깜빡했어 ㅜㅜ' };
export const getTaskChoices = (taskId: string): { done: string; alt?: string; skip: string } =>
  TASK_CHOICES[taskId] ?? DEFAULT_TASK_CHOICES;
