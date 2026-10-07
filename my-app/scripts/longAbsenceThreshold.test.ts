import { pickSubHeading } from '../constants/notifications';
import { getLongBreakQuestion } from '../services/api/questionPool';

const NEGLECT_MESSAGES = new Set([
  '오랜만이네.',
  '살아있었어?',
  '이제 왔어?',
  '기다렸어. 오래.',
  '안 올 줄 알았어.',
  '잊어버린 줄 알았지.',
  '드디어 왔어!\n얼마나 기다렸는데 ><',
  '나 여기 있었어!\n잊은 거 아니지...? (˶ˊ^ˋ˶)',
  '왔어? 진짜 오랜만이다...',
  '걱정했잖아! >_<',
  '안 오는 줄 알았잖아!\n( ˃ᵕ˂ )',
  '기다리고 있었어요.',
  '오랜만에 찾아와 주셨네요.',
  '보고 싶었어요. 🌷',
  '돌아와 주셔서 다행이에요.',
  '언제든 괜찮아요.\n기다리는 건 잘 하거든요.',
]);

const output6 = pickSubHeading('basil', 0, 6);
if (NEGLECT_MESSAGES.has(output6)) {
  throw new Error(`Expected no long-absence greeting before 7 days, but got: ${output6}`);
}

const output7 = pickSubHeading('basil', 0, 7);
if (!NEGLECT_MESSAGES.has(output7)) {
  throw new Error(`Expected long-absence greeting at 7 days, but got: ${output7}`);
}

const longBreakQuestion = getLongBreakQuestion('민지');
if (!/잘 지냈|오랜만|요즘|7일|지내고/.test(longBreakQuestion)) {
  throw new Error(`Expected long-break question to mention recent life status, but got: ${longBreakQuestion}`);
}

console.log('long absence threshold check passed');
