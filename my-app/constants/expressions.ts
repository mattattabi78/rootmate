import { PlantType, Expression } from './character';

// ─── 상황 타입 ────────────────────────────────────────────────────
export type PlantSituation =
  | 'morning_before_task'    // 아침, task 완료 전
  | 'task_completed'         // 오늘 task 완료
  | 'water_due_today'        // 오늘 물 줘야 하는 날, 아직 안 줌
  | 'water_done_today'       // 오늘 물 줌 완료
  | 'no_water_1day'          // 물 주기 1일 초과
  | 'no_water_2days'         // 물 주기 2일 초과
  | 'no_water_3days_plus'    // 물 주기 3일 이상 초과
  | 'chat_opened'            // 채팅창 열었을 때
  | 'question_asked'         // 마음건강 질문 던졌을 때
  | 'user_replied'           // 유저가 답변했을 때
  | 'streak_achieved'        // 연속 기록 달성
  | 'photo_requested'        // 사진 찍기 요청 중
  | 'photo_received'         // 사진 업로드 완료
  | 'evening_check'          // 저녁 task 확인
  | 'idle';                  // 기본

// ─── 상황 → 표정 매핑 테이블 ─────────────────────────────────────
// 얼굴 종류는 default(기본) / smile(웃음) / neutral(무표정) / tear(눈물) / cry(더 슬픈 눈물) / surprise(놀람) 6가지.
// 해당 식물에 없는 얼굴은 getFaceKind()가 대체한다 (cry → tear, surprise → default).
const D: Record<PlantType, Expression> = { basil: 'default', tomato: 'default', marigold: 'default' };
const all = (e: Expression): Record<PlantType, Expression> => ({ basil: e, tomato: e, marigold: e });
const SITUATION_MAP: Record<PlantSituation, Record<PlantType, Expression>> = {
  morning_before_task: D,
  task_completed:      all('smile'),     // task 완료 (바질만 웃음 이미지가 있고 나머지는 기본)
  water_due_today:     D,
  water_done_today:    D,
  no_water_1day:       all('neutral'),   // 하루 관리 없이 건너뜀
  no_water_2days:      all('tear'),      // 이틀 관리 없음
  no_water_3days_plus: all('cry'),       // 3일 이상 (메리골드만 더 슬픈 눈물, 나머지는 눈물)
  chat_opened:         all('surprise'),  // 바질만 놀람 이미지가 있고 나머지는 웃음
  question_asked:      D,
  user_replied:        D,
  streak_achieved:     D,
  photo_requested:     all('surprise'),
  photo_received:      D,
  evening_check:       D,
  idle:                D,
};

// 상황 → 표정 변환 (해당 식물에 없는 표정은 'default' fallback)
export function getExpressionForSituation(
  plantType: PlantType,
  situation: PlantSituation,
): Expression {
  return SITUATION_MAP[situation][plantType];
}

// 개발 패널용 레이블
export const SITUATION_LABELS: Record<PlantSituation, string> = {
  morning_before_task: '아침(task 전)',
  task_completed:      '완료',
  water_due_today:     '물 줘야 함',
  water_done_today:    '물 줬음',
  no_water_1day:       '1일 초과',
  no_water_2days:      '2일 초과',
  no_water_3days_plus: '3일+ 초과',
  chat_opened:         '채팅 열림',
  question_asked:      '질문 중',
  user_replied:        '답변함',
  streak_achieved:     '연속 달성',
  photo_requested:     '사진 요청',
  photo_received:      '사진 받음',
  evening_check:       '저녁 확인',
  idle:                '기본',
};

export const ALL_SITUATIONS: PlantSituation[] = Object.keys(SITUATION_LABELS) as PlantSituation[];
