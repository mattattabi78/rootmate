import { getDevDateOffsetDays } from './devOverrides';

export function getLocalDateString(date?: Date): string {
  let d: Date;
  if (date !== undefined) {
    d = date; // 명시적으로 전달된 날짜는 그대로 사용
  } else {
    d = new Date();
    const offset = getDevDateOffsetDays();
    if (offset !== 0) d.setDate(d.getDate() + offset);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateStringForMonthDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
