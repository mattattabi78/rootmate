import { PlantType } from './character';

export interface PlantChatMessages {
  greeting: (plantNickname: string) => string;
  longBreakGreeting: (plantNickname: string) => string;
  taskAsk: (taskLabel: string) => string;
  taskDone: () => string;
  taskSkip: (taskLabel: string) => string;
  taskRetry: (taskLabel: string) => string;
  reminderYes: () => string;
  reminderNo: () => string;
  waterMoist: () => string;
  photoAsk: string;
  photoLater: () => string;
  photoUploaded: () => string;
  alreadyDone: () => string;
  transitionToQuestion: () => string;
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
    taskAsk: (label) => `오늘 ${label} 했어?`,
    taskDone: () => randomMessage(['오케이. 잘했어 👍', '좋아. 오늘도 잘 챙겨줬네 🌿', '고마워. 덕분에 힘이 나!']),
    taskSkip: (label) => `${label} 못 했구나. 2시간 뒤에 알림 줄까?`,
    taskRetry: (label) => `그래서, 지금은 ${label} 했어?`,
    reminderYes: () => randomMessage(['알림 맞춰뒀어. 잊지 말고.', '좋아, 2시간 뒤에 알려줄게.', '알림 설정했어. 그때 꼭 해줘.']),
    reminderNo: () => randomMessage(['알겠어. 오늘은 그냥 넘어가자.', '괜찮아. 시간 될 때 해줘.', '좋아, 다음에 잊지 않도록 하자.']),
    waterMoist: () => randomMessage(['흙이 촉촉하면 안 줘도 돼. 확인해줬네.', '아직 물을 안 줘도 괜찮아. 잘 살펴봤어!', '촉촉한 상태구나. 오늘은 물을 쉬어도 돼.']),
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
    taskAsk: (label) => `오늘 ${label} 했어?? 💦`,
    taskDone: () => randomMessage(['와~ 잘 했어! 역시 최고야! 🎉', '최고다~ 오늘도 완벽해! 🎉', '잘했어! 덕분에 기분이 좋아 🍅']),
    taskSkip: (label) => `에구, ${label} 못 했구나... 2시간 뒤에 알림 받을래?`,
    taskRetry: (label) => `혹시 지금은 ${label} 했어?? ><`,
    reminderYes: () => randomMessage(['알겠어! 2시간 뒤에 꼭 알려줄게 ⏰', '좋아! 알림 맞춰둘게 ⏰', '잊지 않게 내가 2시간 뒤에 알려줄게!']),
    reminderNo: () => randomMessage(['그럼 시간 날 때 꼭 해줘~', '알겠어~ 나중에 꼭 챙겨줘!', '좋아, 나중에 잊지 말고 해줘 🍅']),
    waterMoist: () => randomMessage(['흙이 촉촉하구나! 오늘은 안 줘도 돼 💧', '아직 물은 필요 없겠다! 고마워!', '촉촉해서 다행이다~ 오늘은 물을 쉬자 💧']),
    photoAsk: '이번엔 내 사진 찍어줘! 📸',
    photoLater: () => randomMessage(['알겠어~ 나중에 꼭 찍어줘! 🍅', '좋아~ 다음에 예쁜 사진 보여줘!', '기다리고 있을게~ 시간 날 때 찍어줘 📸']),
    photoUploaded: () => randomMessage(['와 사진 너무 예뻐! 고마워 📸', '사진 잘 받았어~ 정말 멋지다!', '내 사진 찍어줘서 고마워 🍅']),
    alreadyDone: () => randomMessage(['오늘 이미 다 했어! 정말 수고했어~ ', '오늘 할 일 모두 끝냈네! 최고야 🎉', '오늘도 나를 잘 챙겨줬어. 고마워 🍅']),
    transitionToQuestion: () => randomMessage(['오늘도 챙겨줘서 고마워! (◍\'ᗜ\'◍)', '오늘도 잘 돌봐줘서 고마워~', '덕분에 오늘도 기분이 좋아!']),
  },
  tulip: {
    greeting: (n) => `안녕하세요 :) ${n}와 함께하는 오늘도 잘 부탁드려요 🌷`,
    longBreakGreeting: (n) => randomMessage([
      `오랜만에 찾아와 주셨네요. ${n}가 보고 싶었어요. 🌷`,
      `${n}가 기다리고 있었습니다. 7일 만이네요.`,
      `돌아와 주셔서 다행이에요. ${n}도 반갑게 반겨요. 🌷`,
    ]),
    taskAsk: (label) => `오늘 ${label} 하셨나요?`,
    taskDone: () => randomMessage(['잘 해주셨네요. 감사합니다 🌷', '오늘도 정성껏 돌봐주셔서 고마워요.', '정말 잘해주셨어요. 든든하네요 🌷']),
    taskSkip: (label) => `${label}을 못 하셨군요. 2시간 뒤에 알림을 드릴까요?`,
    taskRetry: (label) => `지금은 ${label} 하셨나요?`,
    reminderYes: () => randomMessage(['알림을 설정해드릴게요. 잊지 마세요 ', '2시간 뒤에 알려드리겠습니다. 그때 해주세요.', '알림을 맞춰두었어요. 걱정하지 마세요 🌷']),
    reminderNo: () => randomMessage(['알겠어요. 시간이 되실 때 꼭 해주세요.', '괜찮아요. 오늘 안에 챙겨주시면 돼요.', '네, 나중에 잊지 않고 돌봐주세요 🌷']),
    waterMoist: () => randomMessage(['흙이 아직 촉촉하군요. 오늘은 물을 주지 않아도 괜찮아요 🌷', '아직 물을 줄 필요가 없겠어요. 잘 확인하셨습니다.', '촉촉한 상태라 다행이에요. 오늘은 물을 쉬어도 돼요 🌷']),
    photoAsk: '오늘 제 사진을 찍어주세요 📸',
    photoLater: () => randomMessage(['네, 시간이 나실 때 찍어주세요.', '알겠습니다. 다음에 사진 보여주세요.', '천천히 찍어주셔도 괜찮아요 🌷']),
    photoUploaded: () => randomMessage(['사진을 찍어주셨군요. 감사합니다 🌷', '사진 잘 받았습니다. 정말 예쁘네요.', '제 모습을 남겨주셔서 고마워요 🌷']),
    alreadyDone: () => randomMessage(['오늘 모든 기록을 마치셨네요. 수고하셨어요 🌷', '오늘 할 일을 모두 끝내셨습니다. 감사합니다.', '오늘도 꼼꼼히 돌봐주셨네요. 정말 수고하셨어요 🌷']),
    transitionToQuestion: () => randomMessage(['오늘도 잘 돌봐줘서 고마워요.', '오늘도 정성껏 돌봐주셔서 감사해요.', '덕분에 오늘도 든든해요 🌷']),
  },
};

export function getPlantMessages(plantType: PlantType): PlantChatMessages {
  return MESSAGES[plantType];
}
