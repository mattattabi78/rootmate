import { PlantType } from './character';

/** all: 전부 했을 때 · some: 일부만 했을 때 · few: 거의 못 했을 때 */
export type ChecklistResultKind = 'all' | 'some' | 'few';

export interface PlantChatMessages {
  greeting: (plantNickname: string) => string;
  longBreakGreeting: (plantNickname: string) => string;
  /** 첫 인사 뒤, 오늘 한 일을 체크해 달라는 요청 */
  checklistAsk: () => string;
  /** 체크리스트 제출 뒤 반응 — 전부 / 일부 / 거의 못 했을 때. 일부·거의 못 했을 때는 체크하지 않은 task 이름을 문구에 넣는다 */
  checklistResult: (kind: ChecklistResultKind, uncheckedLabels: string[]) => string;
  /** '오늘은 못할 것 같아'를 골랐을 때 — 이해해 주고, 내일 다시 같이 할 수 있게 남겨둔다고 알려 준다 */
  taskCantToday: (taskLabel: string) => string;
  /** 2시간 뒤 알림을 알려줄 때 — timeText는 알림이 울릴 시각(예: '오후 3시 20분') */
  reminderYes: (timeText: string) => string;
  waterMoist: () => string;
  sunlightCloudy: () => string;
  /** 체크리스트 직후 이어지는 사진 요청 */
  photoAsk: () => string;
  /** '나중에 찍을게'를 골랐을 때 — 알림 / 내일로 미루기 중 고르게 묻는다 */
  photoLaterAsk: () => string;
  photoUploaded: () => string;
  alreadyDone: () => string;
  transitionToQuestion: () => string;
}

/** 'A, B' 뒤에 주제 조사(은/는)를 붙인다: ['물주기'] → '물주기는', ['물주기','햇빛 확인'] → '물주기, 햇빛 확인은' */
function topic(labels: string[]): string {
  const text = labels.join(', ');
  const code = text.charCodeAt(text.length - 1) - 0xAC00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return text + (hasBatchim ? '은' : '는');
}

/** 'HH:mm' 대신 대화체로: 15:20 → '오후 3시 20분', 12:00 → '오후 12시' */
export function formatClock(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? '오전' : '오후'} ${h12}시${m > 0 ? ` ${m}분` : ''}`;
}

function randomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

const MESSAGES: Record<PlantType, PlantChatMessages> = {
  basil: {
    greeting: (n) => `왔어? 오늘 ${n} 상태 확인하러 왔지? 🌿`,
    longBreakGreeting: (n) => randomMessage([
      `오랜만이네... ${n} 보고 싶었어. 잘 지냈지? 🌿`,
      `${n} 오랜만인데, 계속 잘 지내고 있었어?`,
      `7일이나 안 보였네. ${n} 지금까지 잘 있었어? 🌱`,
    ]),
    checklistAsk: () => randomMessage([
      '오늘 내가 어떻게 지냈는지 체크해줘. 해준 것만 눌러도 돼.',
      '오늘 나 잘 돌봐줬는지 알려줘. 한 건 체크해줘.',
      '오늘 해준 일 체크해줄래? 아래에서 골라줘.',
    ]),
    checklistResult: (kind, labels) => {
      const t = topic(labels);
      return randomMessage({
        all:  ['전부 해줬네. 고마워. 든든해.', '빠짐없이 챙겨줬구나. 오늘도 수고했어.', '완벽하네. 덕분에 잘 지냈어 🌿'],
        some: [`오늘도 날 돌봐줘서 고마워. ${t} 어떻게 할지 말해줄래?`, `챙겨줘서 고마워. 그럼 ${t} 어떻게 할까?`, `덕분에 잘 지냈어. ${t} 어떻게 할지만 알려줘.`],
        few:  [`바빴나 보네. 그래도 와줘서 고마워. ${t} 어떻게 할지 말해줄래?`, `괜찮아, 그런 날도 있지. ${t} 어떻게 할까?`, `오늘은 쉬어간 날이네. ${t} 어떻게 할지 알려줘.`],
      }[kind]);
    },
    taskCantToday: (label) => `그럴 수 있지. 오늘은 ${label} 쉬어도 돼. 내일 다시 할 수 있게 남겨둘게.`,
    reminderYes: (t) => randomMessage([`좋아, 2시간 뒤(${t})에 알려줄게. 그때 꼭 해줘.`, `알겠어. ${t}에 알려줄게. 잊지 말고.`, `그래, 2시간 뒤인 ${t}에 알려줄게.`]),
    waterMoist: () => randomMessage(['흙이 촉촉하면 안 줘도 돼. 확인해줬네.', '아직 물을 안 줘도 괜찮아. 잘 살펴봤어!', '촉촉한 상태구나. 오늘은 물을 쉬어도 돼.']),
    sunlightCloudy: () => randomMessage(['날씨가 흐렸구나. 그럼 어쩔 수 없지.', '햇빛이 없던 날도 있는 거지. 괜찮아.', '그래, 내일은 볕이 들었으면 좋겠다.']),
    photoAsk: () => '오늘도 돌봐줘서 고마워.\n오늘 내 모습을 사진으로도 남겨줘! 📸',
    photoLaterAsk: () => randomMessage([
      '그래, 지금은 어려울 수 있지. 2시간 뒤에 알려줄까, 아니면 내일로 미룰까?',
      '알겠어. 그럼 어떻게 할까? 이따 알림을 줄지, 내일 찍을지 골라줘.',
      '괜찮아. 나중에 찍자. 2시간 뒤 알림이 좋아, 내일이 좋아?',
    ]),
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
    checklistAsk: () => randomMessage([
      '오늘 나 잘 돌봐줬는지 알려줘~ 한 거 체크해줘! ✔️',
      '오늘 내가 한 일 체크해줘! 뭐뭐 해줬어?',
      '나 오늘 잘 챙겨줬어? 아래에서 체크해줘~ 🍅',
    ]),
    checklistResult: (kind, labels) => {
      const t = topic(labels);
      return randomMessage({
        all:  ['와 전부 해줬어?! 역시 최고야~ 🎉', '하나도 안 빠뜨렸네! 너무 고마워 🍅', '완벽해~! 오늘 기분 최고야 🎉'],
        some: [`오늘도 날 돌봐줘서 고마워~! ${t} 어떻게 할지 말해줄래? 🍅`, `잘했어! 그럼 ${t} 어떻게 할까?`, `고마워~ ${t} 어떻게 할지만 알려줘!`],
        few:  [`바빴구나ㅠㅠ 그래도 와줘서 고마워! ${t} 어떻게 할지 말해줄래?`, `괜찮아 괜찮아~ ${t} 어떻게 할까?`, `오늘은 힘든 날이었나 보다... ${t} 어떻게 할지 같이 정하자!`],
      }[kind]);
    },
    taskCantToday: (label) => `그럴 수도 있지~ 오늘은 ${label} 안 해도 괜찮아! 내일 다시 할 수 있게 남겨둘게 🍅`,
    reminderYes: (t) => randomMessage([`알겠어! 2시간 뒤(${t})에 꼭 알려줄게 ⏰`, `좋아~ ${t}에 내가 알려줄게! ⏰`, `잊지 않게 2시간 뒤, ${t}에 알려줄게!`]),
    waterMoist: () => randomMessage(['흙이 촉촉하구나! 오늘은 안 줘도 돼 💧', '아직 물은 필요 없겠다! 고마워!', '촉촉해서 다행이다~ 오늘은 물을 쉬자 💧']),
    sunlightCloudy: () => randomMessage(['흐린 날이었구나~ 괜찮아! 내일은 해가 뜰 거야!', '햇빛이 없었다니 아쉽다 ㅜㅜ 내일 같이 쬐자!', '그런 날도 있지~ 알려줘서 고마워!']),
    photoAsk: () => '오늘도 돌봐줘서 고마워~\n오늘 내 모습을 사진으로도 남겨줘! 📸',
    photoLaterAsk: () => randomMessage([
      '앗 지금은 힘들구나~ 그럼 2시간 뒤에 알려줄까, 내일로 미룰까? 🍅',
      '알겠어~! 이따 알림 줄까, 아니면 내일 찍을까?',
      '괜찮아 괜찮아~ 2시간 뒤 알림이 좋아, 내일이 좋아? 📸',
    ]),
    photoUploaded: () => randomMessage(['와 사진 너무 예뻐! 고마워 📸', '사진 잘 받았어~ 정말 멋지다!', '내 사진 찍어줘서 고마워 🍅']),
    alreadyDone: () => randomMessage(['오늘 이미 다 했어! 정말 수고했어~ ', '오늘 할 일 모두 끝냈네! 최고야 🎉', '오늘도 나를 잘 챙겨줬어. 고마워 🍅']),
    transitionToQuestion: () => randomMessage(['오늘도 챙겨줘서 고마워! (◍\'ᗜ\'◍)', '오늘도 잘 돌봐줘서 고마워~', '덕분에 오늘도 기분이 좋아!']),
  },
  marigold: {
    greeting: (n) => `왔구나! 오늘도 ${n} 보러 와줘서 고마워 🌼`,
    longBreakGreeting: (n) => randomMessage([
      `오랜만이야. ${n} 많이 보고 싶었어. 잘 지냈지? 🌼`,
      `${n} 계속 기다리고 있었어. 와줘서 반가워!`,
      `7일이나 지났네. 별일 없었지? ${n} 언제나 네 편이야 🌼`,
    ]),
    checklistAsk: () => randomMessage([
      '오늘 나한테 뭘 해줬는지 같이 확인해볼까? 해준 것만 눌러줘.',
      '오늘 챙겨준 것들 체크해줘. 못 한 건 괜찮아, 같이 정하면 되니까.',
      '오늘은 뭘 해줬어? 해준 것만 골라줘 🌼',
    ]),
    checklistResult: (kind, labels) => {
      const t = topic(labels);
      return randomMessage({
        all:  ['전부 해줬네! 정말 고마워 🌼', '하나도 빠짐없이 챙겨줬구나. 든든해.', '다 해줬네. 오늘도 수고 많았어.'],
        some: [`오늘도 날 돌봐줘서 고마워. ${t} 어떻게 할지 같이 정해볼까?`, `이만큼이나 챙겨줬네, 고마워. ${t} 어떻게 할래?`, `잘했어. ${t} 어떻게 할지만 말해줘, 내가 도울게.`],
        few:  [`괜찮아, 그런 날도 있지. ${t} 어떻게 할지 같이 정해보자.`, `오늘은 바빴나 보네. ${t} 어떻게 할지 편하게 말해줘.`, `와줘서 고마워. ${t} 하나씩 천천히 해보자.`],
      }[kind]);
    },
    taskCantToday: (label) => `괜찮아, 무리하지 마. 오늘은 ${label} 쉬어도 돼. 내일 같이 할 수 있게 남겨둘게.`,
    reminderYes: (t) => randomMessage([`좋아, 2시간 뒤(${t})에 알려줄게. 그때 같이 해보자.`, `알겠어. ${t}에 알려줄게. 깜빡해도 괜찮아, 내가 챙길게.`, `그래, 2시간 뒤인 ${t}에 살짝 알려줄게.`]),
    waterMoist: () => randomMessage(['흙이 촉촉하면 오늘은 안 줘도 돼. 꼼꼼히 봐줘서 고마워.', '아직 물이 충분하구나. 잘 살펴봐 줘서 고마워.', '촉촉하다니 다행이야. 오늘은 물을 쉬어도 돼.']),
    sunlightCloudy: () => randomMessage(['날씨가 흐렸구나. 괜찮아, 내일은 볕이 들 거야.', '햇빛이 없던 날도 있는 거지. 걱정하지 마.', '그래, 내일은 따뜻한 볕이 들었으면 좋겠다.']),
    photoAsk: () => '오늘도 돌봐줘서 고마워.\n오늘 내 모습을 사진으로도 남겨줘!',
    photoLaterAsk: () => randomMessage([
      '지금은 어렵구나. 2시간 뒤에 알려줄까, 내일로 미룰까?',
      '괜찮아, 천천히 해도 돼. 이따 알림으로 할래, 내일 찍을래?',
      '그럴 수 있지. 2시간 뒤 알림이랑 내일 중에 편한 걸로 골라줘.',
    ]),
    photoUploaded: () => randomMessage(['받았어. 정말 잘 찍어줬네, 고마워 🌼', '사진 확인했어. 내 모습이 이렇게 예쁘구나 🌼', '고마워. 네가 찍어준 내 모습, 마음에 들어 🌼']),
    alreadyDone: () => randomMessage(['오늘 이미 다 했어. 수고 많았어, 푹 쉬어.', '오늘 할 일은 모두 끝났어. 고마워!', '오늘도 빠짐없이 챙겨줬네. 정말 수고했어.']),
    transitionToQuestion: () => randomMessage(['나 챙겨줘서 고마워. 이제 네 이야기도 들려줘.', '오늘도 돌봐줘서 고마워.', '덕분에 오늘도 든든했어.']),
  },
};

export function getPlantMessages(plantType: PlantType): PlantChatMessages {
  return MESSAGES[plantType];
}

// ─── 체크하지 않은 task의 후속 선택지 (한 화면에서 항목마다 하나씩 고른다) ───────────
// alt: 오늘은 안 해도 되는 이유(선택) / remind: 조금 이따가 할게 → 2시간 뒤 알림 / cantToday: 내일로 미룰게 → 내일 task 목록에 같이 띄움
export type FollowupKind = 'alt' | 'remind' | 'cantToday';
interface TaskChoices { alt?: string; remind: string; cantToday: string }
const REMIND = '조금 이따가 할게.';
const CANT_TODAY = '내일로 미룰게.';
const TASK_CHOICES: Record<string, TaskChoices> = {
  water:    { alt: '아직 흙이 촉촉해.',     remind: REMIND, cantToday: CANT_TODAY },
  sunlight: { alt: '날씨가 흐렸어.', remind: REMIND, cantToday: CANT_TODAY },
};
const DEFAULT_TASK_CHOICES: TaskChoices = { remind: REMIND, cantToday: CANT_TODAY };
export const getTaskChoices = (taskId: string): TaskChoices =>
  TASK_CHOICES[taskId] ?? DEFAULT_TASK_CHOICES;

/** 체크리스트 항목 문구 (체크한 항목은 사용자 말풍선에도 그대로 쓴다) */
const CHECKLIST_LABELS: Record<string, string> = {
  water: '물 줬어',
  sunlight: '햇빛 확인했어',
  observe: '식물 관찰했어',
};
export const getChecklistLabel = (taskId: string, taskLabel: string): string =>
  CHECKLIST_LABELS[taskId] ?? `${taskLabel} 했어`;
