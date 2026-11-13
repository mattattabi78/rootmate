import { storage } from '../store/storage';
import { getLocalDateString } from './date';
import { getDevAdjustedDate } from './devOverrides';

/** 이 시각 전(자정~04:00)에 시작한 대화는 전날 기록으로 저장 (전날 기록이 아직 없을 때만) */
export const RECORD_ROLLOVER_HOUR = 4;

export async function shouldBackdateRecord(): Promise<boolean> {
  const now = getDevAdjustedDate();
  if (now.getHours() >= RECORD_ROLLOVER_HOUR) return false;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const record = await storage.getDailyRecord(getLocalDateString(y));
  return record === null;
}
