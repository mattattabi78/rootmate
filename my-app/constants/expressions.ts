import { PlantType, Expression, EXPRESSION_IMAGES } from './character';

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
const SITUATION_MAP: Record<PlantSituation, Record<PlantType, Expression>> = {
  morning_before_task: { basil: 'default',     tomato: 'default',      tulip: 'default'      },
  task_completed:      { basil: 'sparkle',     tomato: 'sparkle',      tulip: 'sparkle'      },
  water_due_today:     { basil: 'default',     tomato: 'default',      tulip: 'default'      },
  water_done_today:    { basil: 'smile',       tomato: 'smile',        tulip: 'heart'        },
  no_water_1day:       { basil: 'default',     tomato: 'sad',          tulip: 'disappointed' },
  no_water_2days:      { basil: 'tear',        tomato: 'tear',         tulip: 'tear'         },
  no_water_3days_plus: { basil: 'cry',         tomato: 'cry',          tulip: 'tear'         },
  chat_opened:         { basil: 'oh',          tomato: 'oh',           tulip: 'oh'           },
  question_asked:      { basil: 'default',     tomato: 'default',      tulip: 'default'      },
  user_replied:        { basil: 'heart',       tomato: 'heart',        tulip: 'heart'        },
  streak_achieved:     { basil: 'sparkle',     tomato: 'sparkle',      tulip: 'sparkle'      },
  photo_requested:     { basil: 'oh',          tomato: 'oh',           tulip: 'oh'           },
  photo_received:      { basil: 'heart',       tomato: 'heart',        tulip: 'heart'        },
  evening_check:       { basil: 'sigh',        tomato: 'disappointed', tulip: 'disappointed' },
  idle:                { basil: 'default',     tomato: 'default',      tulip: 'default'      },
};

// 상황 → 표정 변환 (해당 식물에 없는 표정은 'default' fallback)
export function getExpressionForSituation(
  plantType: PlantType,
  situation: PlantSituation,
): Expression {
  const desired = SITUATION_MAP[situation][plantType];
  // @ts-ignore
  if (EXPRESSION_IMAGES[plantType]?.[desired]) return desired;
  return 'default';
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
