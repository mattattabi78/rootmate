import { PlantType } from './character';

interface SubHeadingData {
  appVisit: string[];
  consecutiveVisit: string[];
  randomMessages: string[];
  neglectReturn: string[];  // 방치 후 복귀 시 메시지
}

const HOMESCREEN_SUBHEADING: Record<PlantType, SubHeadingData> = {
  basil: {
    appVisit: [
      '오늘도 확인하러 왔어?',
      '생각보다 성실한데.',
      '잘 지내고 있었어.',
    ],
    consecutiveVisit: [
      '또 왔네.',
      '요즘 자주 보인다.',
      '출석률 괜찮은데?',
      '꾸준한 거 인정.',
      '이 정도면 제법 식집사 같아.',
      '나보다 네가 더\n성실한 것 같네.',
    ],
    randomMessages: [
      '생각보다 잘 크고 있어.',
      '오늘 상태 괜찮아.',
      '관리 꽤 잘하네.',
      '이 정도면 합격.',
      '계속 이렇게만 해.',
    ],
    neglectReturn: [
      '오랜만이네.',
      '살아있었어?',
      '이제 왔어?',
      '기다렸어. 오래.',
      '안 올 줄 알았어.',
      '잊어버린 줄 알았지.',
    ],
  },
  tomato: {
    appVisit: [
      '왔구나! ･ᴗ･ )੭',
      '기다리고 있었어!',
      '안녕! 나는 잘 크고 있어!',
      '보러 와줘서 고마워!',
      '오늘도 안 빼먹었네!',
      '덕분에 외롭지 않아!\n(,,>ヮ<,,)!',
    ],
    consecutiveVisit: [
      '출석 도장 쾅\n꒰𑁬👊⸝⸝＞ヮ＜)꒱',
    ],
    randomMessages: [
      '오늘도 토마토답게\n열심히 자라는 중!',
      '성장 경험치 +1 획득!',
      '덕분에 오늘도 건강하게\n크고 있어!',
      '달콤한 토마토로 보답할게!\n((･-･*ゞ)',
      '토마토 모험은 계속된다!\nε⌯(ง ･ω･)ว',
    ],
    neglectReturn: [
      '드디어 왔어!\n얼마나 기다렸는데 ><',
      '나 여기 있었어!\n잊은 거 아니지...? (˶ˊ^ˋ˶)',
      '왔어? 진짜 오랜만이다...',
      '걱정했잖아! >_<',
      '안 오는 줄 알았잖아!\n( ˃ᵕ˂ )',
    ],
  },
  tulip: {
    appVisit: [],
    consecutiveVisit: [],
    randomMessages: [
      '오늘도 찾아와 주셨네요. 😊',
      '함께할 수 있어 기뻐요.',
      '당신의 하루도\n꽃처럼 피어나길 바라요. 🌷',
    ],
    neglectReturn: [
      '기다리고 있었어요.',
      '오랜만에 찾아와 주셨네요.',
      '보고 싶었어요. 🌷',
      '돌아와 주셔서 다행이에요.',
      '언제든 괜찮아요.\n기다리는 건 잘 하거든요.',
    ],
  },
};

function pickRandom(arr: string[]): string | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickSubHeading(
  plantType: PlantType,
  streak: number,
  daysNeglected: number = 0,
): string {
  const data = HOMESCREEN_SUBHEADING[plantType];

  // 방치 후 복귀 (2일 이상 기록 없음)
  if (daysNeglected >= 2 && data.neglectReturn.length > 0) {
    return pickRandom(data.neglectReturn) ?? '';
  }

  if (streak >= 2 && data.consecutiveVisit.length > 0) {
    const pool = [...data.consecutiveVisit, ...data.randomMessages];
    return pickRandom(pool) ?? '';
  }

  if (data.appVisit.length > 0) {
    const pool = [...data.appVisit, ...data.randomMessages];
    return pickRandom(pool) ?? '';
  }

  return pickRandom(data.randomMessages) ?? '';
}
