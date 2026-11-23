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
  marigold: {
    appVisit: [
      '오늘도 와줘서 반가워요.',
      '왔네요! 보고 싶었어요.',
      '잘 지냈어요? 오늘도 함께해요.',
    ],
    consecutiveVisit: [
      '또 와줬네요, 고마워요.',
      '요즘 자주 와서 좋아요.',
      '매일 와주니까 든든해요.',
      '꾸준히 챙겨줘서 고마워요.',
      '이제 제법 든든한 식집사 같아요.',
      '덕분에 제가\n이렇게 잘 자라요.',
    ],
    randomMessages: [
      '오늘 컨디션이 좋아요. 덕분이에요.',
      '잘 크고 있으니 걱정 안 해도 돼요.',
      '항상 챙겨줘서 고마워요.',
      '너무 애쓰지 않아도 돼요.\n충분히 잘하고 있어요.',
      '오늘도 힘내요. 내가 응원할게요.',
    ],
    neglectReturn: [
      '왔네요, 기다렸어요.',
      '잘 지냈어요? 걱정했어요.',
      '와줘서 고마워요. 보고 싶었어요.',
      '바빴죠? 괜찮아요, 다시 왔잖아요.',
      '오래 기다렸지만 괜찮아요. 다시 만나 반가워요!',
      '다시 와줘서 고마워요.\n함께 천천히 해봐요.',
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

  // 방치 후 복귀 (7일 이상 기록 없음)
  if (daysNeglected >= 7 && data.neglectReturn.length > 0) {
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
