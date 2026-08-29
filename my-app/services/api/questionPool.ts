import {
  DAILY_QUESTIONS,
  WEEKEND_DAILY_QUESTIONS,
  SUNDAY_DEEP_QUESTIONS,
  NEW_YEAR_QUESTION,
  YEAR_END_QUESTION,
  MONTHLY_START_QUESTION,
  MONTHLY_END_QUESTION,
  Question,
} from '../../constants/questions';
import { getDevAdjustedDate } from '../../utils/devOverrides';

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let currentSeed = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = ((currentSeed * 1664525 + 1013904223) >>> 0);
    const j = currentSeed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function replaceNickname(question: Question, plantNickname: string): string {
  return question.text.replace('{plantNickname}', plantNickname);
}

/** 날짜와 식물과 함께한 기간에 맞는 기준 질문을 선택한다. */
export function getTodayQuestion(
  plantNickname: string,
  installDate: Date,
  _questionIndex: number,
  deepQuestionIndex: number,
): string {
  const kst = new Date(getDevAdjustedDate().getTime() + 9 * 60 * 60 * 1000);
  const dayOfMonth = kst.getUTCDate();
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const dayOfWeek = kst.getUTCDay();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const kstInstall = new Date(installDate.getTime() + 9 * 60 * 60 * 1000);
  const installedMonths = Math.max(
    0,
    (year - kstInstall.getUTCFullYear()) * 12
      + (month - (kstInstall.getUTCMonth() + 1))
      - (dayOfMonth < kstInstall.getUTCDate() ? 1 : 0),
  );

  const pickDeepQuestion = (questions: Question[]): string =>
    replaceNickname(questions[deepQuestionIndex % questions.length], plantNickname);

  if (month === 1 && dayOfMonth === 1) return replaceNickname(NEW_YEAR_QUESTION, plantNickname);
  if (month === 12 && dayOfMonth === 31) return replaceNickname(YEAR_END_QUESTION, plantNickname);
  if (dayOfMonth === 1) return replaceNickname(MONTHLY_START_QUESTION, plantNickname);
  if (dayOfMonth === lastDay) return replaceNickname(MONTHLY_END_QUESTION, plantNickname);

  if (dayOfWeek === 0) {
    return replaceNickname(
      SUNDAY_DEEP_QUESTIONS[deepQuestionIndex % SUNDAY_DEEP_QUESTIONS.length],
      plantNickname,
    );
  }

  const isWeekend = dayOfWeek === 6;
  const questions = isWeekend ? WEEKEND_DAILY_QUESTIONS : DAILY_QUESTIONS;
  const monthlyOrder = seededShuffle(questions, year * 100 + month);
  return replaceNickname(monthlyOrder[Math.max(0, dayOfMonth - 2) % monthlyOrder.length], plantNickname);
}

