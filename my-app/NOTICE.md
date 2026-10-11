# NOTICE — Rootmate 개발 현황 및 인수인계 문서

> 최초 작성일: 2026-05-31 / 최종 업데이트: 2026-10-10
> 대상: AI / 백엔드 / 손정우
> 작성자: 프론트 / 김지윤
>
> 이 문서는 `rootmate/NOTICE.md`와 `rootmate/my-app/NOTICE.md` 두 곳에 같은 내용으로 둡니다. 수정할 때 둘 다 맞춰 주세요.

---

## 1. 서비스 개요

**앱명**: Rootmate  
**한 줄 정의**: 식물을 돌보는 척, 나도 돌보게 되는 앱

유저는 실제 식물을 키우며 관리 기록을 남기고, 식물 캐릭터와의 채팅을 통해 자연스럽게 마음 건강 질문에 답하게 됩니다. 마음 건강 앱에 거부감이 있는 20~30대 청년을 타겟으로 합니다.

---

## 2. 프로젝트 구조

```
rootmate/
├── README.md, NOTICE.md
└── my-app/                          # Expo 앱 루트
    ├── app/                         # 화면 (Expo Router file-based routing)
    │   ├── _layout.tsx              # 폰트 로딩(SUITE), 알림 핸들러, Stack
    │   ├── welcome.tsx              # 환영 화면
    │   ├── index.tsx                # 홈 탭
    │   ├── calendar.tsx             # Record 탭 (캘린더 / 앨범)
    │   ├── collection.tsx           # 도감 탭 (카드 덱 + 같은 화면의 상세 페이지)
    │   ├── chat.tsx                 # 채팅 (핵심 흐름, 탭바 없음)
    │   ├── streak.tsx               # 연속 관리 화면
    │   └── onboarding/              # 온보딩 step1~5, complete
    ├── components/
    │   ├── common/                  # TopAppBar, BottomNavBar, Button, PlantCharacter,
    │   │                            # Icons / PixelIcons / ActionIconButton, Wallpaper …
    │   ├── plant/PlantDetailView    # 도감 상세 (기본 정보 / 성장 과정 / 잘 키우기)
    │   └── settings/                # 설정 팝업(SettingsModal), 알림 시간 선택(TimeStepper)
    ├── constants/                   # 컬러·폰트, 식물, 질문, 성장 단계, 표정, 알림·채팅 문구, 도감 텍스트
    ├── hooks/                       # useGrowthManager, usePlantExpression, useNotification
    ├── services/
    │   ├── ai.ts                    # ★ AI 연동 진입점 (프론트가 호출하는 함수)
    │   ├── api/                     # chat.ts(LLM), questionPool.ts(질문 선택), styleTransfer.ts(이미지)
    │   └── config/env.ts            # API 키·모델 환경변수
    ├── store/                       # storage.ts(AsyncStorage 래퍼), growthStore.ts
    ├── utils/                       # 날짜, 채팅 복원, 알림 예약, 개발자 날짜 시뮬레이션
    ├── assets/                      # SUITE 폰트, 캐릭터 이미지, 월페이퍼, 아이콘
    ├── DESIGN.md                    # 디자인 시스템 (Y2K 개정판)
    ├── QUESTIONS.md                 # 질문 목록 (questions.ts와 동기화)
    └── notification.json            # 식물별 알림 문구·주기 기획 데이터
```

---

## 3. 기술 스택

| 구분 | 기술 |
|---|---|
| 프레임워크 | Expo ~57 (React Native 0.86, React 19) |
| 언어 | TypeScript 6 |
| 라우팅 | Expo Router (file-based) |
| 로컬 저장 | AsyncStorage |
| 이미지 / 카메라 | expo-image, expo-image-picker, expo-image-manipulator, expo-camera |
| 알림 | expo-notifications |
| 그래픽 | react-native-svg (아이콘 대부분을 SVG 코드로 구현) |
| 애니메이션 | React Native Animated + PanResponder (도감 카드·상세 전환) |
| 스타일 | React Native StyleSheet. 폰트는 SUITE 한 종류 |
| AI | Mindlogic FactChat 게이트웨이(텍스트), Replicate(이미지) |

---

## 4. 전체 화면 구조 및 구현 현황

디자인은 2026년 개정된 **Y2K 레트로 OS 스타일**입니다. 수치와 규칙은 `my-app/DESIGN.md`를 참고하세요.

### 4.1 공통 UI

| 요소 | 상태 | 내용 |
|---|---|---|
| 상단 헤더 (`TopAppBar`) | ✅ | 라임 헤더, 우측 `D+N`(식물을 키운 일수) 배지 → 연속 관리 화면, 옆의 톱니바퀴 → 설정 팝업 |
| 하단 탭 (`BottomNavBar`) | ✅ | Home / Record / Collection / Chat 4개를 같은 폭으로 배치 |
| 설정 팝업 (`SettingsModal`) | ✅ | 내 이름·식물 이름 변경, 아침/저녁 알림 켜기·시간 설정. 저장 버튼을 눌러야 반영, 저장 없이 닫으면 확인 레이어 표시 |

### 4.2 온보딩 (`app/onboarding/`)

| 파일 | 내용 |
|---|---|
| `step1.tsx` | 유저 닉네임 입력 (최대 10자) |
| `step2.tsx` | 식물 선택 (바질 / 방울토마토 / 메리골드) 또는 구매 코드 입력 |
| `step3.tsx` | 선택한 식물 소개와 관리 정보 |
| `step4.tsx` | 식물 닉네임 입력 |
| `step5.tsx` | 알림 시간 설정(아침·저녁, 30분 단위)과 알림 권한 요청 |
| `complete.tsx` | 선택한 식물 일러스트와 시작 안내 → 홈 이동 |

저장 키: `@plant/onboarding_complete`, `@plant/user_nickname`, `@plant/plant_data`, `@plant/notification_times`.
온보딩에는 별도 Figma 시안이 없어 공통 컴포넌트와 새 팔레트·폰트로 구성했고, 모든 단계가 가운데 정렬입니다.

### 4.3 홈 (`index.tsx`)

- 날짜, 식물 캐릭터(230×340, AI 캐릭터가 있으면 그것을, 없으면 **현재 성장 단계의 기본 캐릭터**), 식물의 한 줄 대사, 액션 아이콘 4개(물주기 / 햇볕에 두기 / 식물 사진 찍기 / 식물 관찰)
- 아이콘은 오늘 해야 하는 task만 색이 켜지고(식물 사진 찍기는 사진 찍는 날인 수·토만), 누르면 채팅으로 이동
- 개발자 메뉴: 날짜를 1.5초 길게 누르면 열림 (날짜 시뮬레이션, 성장 단계 강제, 표정 테스트, 기록 초기화, **대화 기억 켜기/끄기**, 채팅 라운드 수 등)

### 4.4 채팅 (`chat.tsx`)

흐름은 아래 순서입니다. 탭바 없이 뒤로가기 헤더를 씁니다.

```
성장 단계 확인 (해당일에만)  → "싹이 올라왔나요?" 같은 질문 → 네 / 아직
Task 확인                    → "오늘 물 줬어?" "오늘 햇빛은 봤어?" (모든 식물 공통 문구)
                               선택지: 당연하지! / 아직 흙이 촉촉해.(날씨가 흐렸어.) / 깜빡했어 ㅜㅜ
                               '촉촉해'를 고르면 물 준 날로 치지 않고 다음 날 다시 확인 (§5.5)
                               못 했다고 하면 "알림 받을게요 / 괜찮아요" → 2시간 뒤 알림 예약 후 종료
사진 찍기 (수·토)            → 사진 촬영/갤러리 선택 → 캐릭터 생성 → 프리뷰에서 확정 (AI 키 필요)
관찰하기 (3일 주기)          → 자유 입력 대화 (사진 찍는 날은 생략)
마음 건강 질문               → 모든 task를 마치면 AI가 식물 말투로 질문, 유저가 답하면 식물이 반응
                               (라운드 수는 개발자 메뉴에서 조정)
완료                         → 일기 요약 저장, 연속 관리 갱신
```

- 같은 사람이 연속으로 말하면 프로필(이미지·이름)은 첫 말풍선에만 표시
- 중간에 나가면 draft가 `@plant/chat_draft_{date}`에 저장되어 이어서 진행

### 4.5 Record 탭 (`calendar.tsx`)

- **캘린더**: 월 이동, 기록한 날 라임 원, 3일 이상 연속이면 띠로 연결, 오늘은 기록 전 회색 → 기록 후 라임, 물주기를 한 날은 물방울 뱃지(오늘 물을 주면 즉시 표시)
- **앨범**: 월별 사진 2열 그리드
- 날짜 탭 시 **날짜별 기록 카드**(362×480 고정): 날짜, 사진(없으면 그날의 캐릭터), 요약, 완료한 task 아이콘

### 4.6 도감 탭 (`collection.tsx`)

- 카드 속 캐릭터는 각 식물의 **마지막 성장 단계 기본 이미지로 고정**(성장 단계·AI 캐릭터와 무관)
- 식물 카드 덱: 좌우 스와이프로 바질 → 방울토마토 → 메리골드를 **무한 순환**. 모든 식물의 정보가 공개되어 있음
- `더 알아보기`를 누르거나 위로 스와이프하면 **같은 화면 안에서** 상세 페이지가 아래에서 올라옴. 맨 위에서 아래로 당기거나 Collection 탭을 다시 누르면 돌아감
- 상세 탭 3개: 기본 정보 / 성장 과정 / 잘 키우기. 본문은 `constants/plantGuide.ts`에 식물별·탭별로 모여 있음 (바질·토마토의 `잘 키우기`는 문구 대기 중이라 task 안내가 대신 표시됨)

### 4.7 연속 관리 (`streak.tsx`)

연속 일수(큰 숫자), `Day Streak`, `{닉네임}와 함께한지 N일째`(입양일이 1일째)를 화면 정중앙에 두고, 이번 주(월~일) 완료 현황과 CTA 버튼을 둡니다. 채팅 완료 직후 하루 1회 노출됩니다.

---

## 5. 핵심 데이터 모델

### 5.1 식물 데이터 (`PlantData`, `constants/plants.ts`)

```typescript
interface PlantData {
  id: string;                                   // 'basil' | 'tomato' | 'marigold'
  code?: string;                                // 구매 코드 (BAS-001 / TOM-001 / MAR-001)
  adoptedAt: string;                            // ISO 8601 (입양일 = D+0, 연속 관리 화면에서는 1일째)
  nickname: string;                             // 유저가 지어준 식물 이름
  growthStage: 'seed' | 'sprout' | 'growing' | 'done';
  photoUri?: string;
}
```

AI가 만든 캐릭터 이미지는 `PlantData`가 아니라 별도 키(`@plant/generated_plant_uri`, `@plant/generated_face_pos`)에 저장합니다.

### 5.2 일별 기록 (`DailyRecord`, `store/storage.ts`)

```typescript
interface DailyRecord {
  date: string;                 // 'YYYY-MM-DD'
  waterDone: boolean;
  completedTaskIds?: string[];  // 완료한 task
  altTaskIds?: string[];        // '흙이 촉촉해' 등 오늘은 안 해도 된다고 답한 task (완료에는 미포함)
  recordDone: boolean;
  question: string;             // 오늘 노출된 질문
  answer: string;               // 유저 답변 (비어 있으면 건너뜀)
  answerImageUri?: string;
  skippedQuestion: boolean;
  plantPhotoUri?: string;       // 오늘 찍은 식물 사진
  aiReply?: string;             // AI가 만든 식물 반응
  conversationSummary?: string; // 오늘 대화 요약(일기)
}
```

### 5.3 성장 단계 (`constants/growthStages.ts`)

```
식물별 최대 단계:
  바질(basil):          9단계 (… 성장 중 → 15cm 이상 성장 → 순 따기 → 무성한 바질 → 수확 가능)
  방울토마토(tomato):   9단계 (… 모종 성장 → 15cm 이상 성장 → 정식 완료 → 줄기 성장 → 꽃 피는 중 → 수확 가능)
  메리골드(marigold):   7단계 (씨앗 심기 → 발아 중 → 새싹 → 성장 중 → 옮겨심기 → 꽃망울 → 개화)
                        캐릭터 이미지는 6장이라 '성장 중'과 '옮겨심기'가 같은 이미지를 씀

단계 진행 조건 3종:
  INITIAL         — 앱 시작 시 자동 1단계
  DAYS_PASSED     — N일 경과 시 자동 다음 단계
  USER_CONFIRMED  — 식물이 성장 확인 질문을 하고 유저가 확인하면 다음 단계

최소 경과일(daysRequired) = '바로 앞 단계에 진입한 날'부터 센 일수. 자동 진행(DAYS_PASSED)은 이 일수가 지나면 넘어가고,
확인 질문(USER_CONFIRMED)은 이 일수가 지난 뒤부터 접속한 날마다 물어봄 (1단계 진입일은 성장 상태가 처음 만들어진 날).
단계별로 '네'라고 답했을 때 식물이 하는 전용 말(confirmedMessage)을 둘 수 있음.

**두 단계로 나눈 확인 질문** — 처음 키우는 유저가 "큰 화분으로 옮겨 심었나요?" 같은 질문에 당황하지 않도록, 먼저 "키가 15cm 이상 자랐나요?"를 묻고 `네`라고 하면 다음 행동(큰 화분, 순 따기)을 식물이 안내한 뒤 **다음 날부터** 실제로 했는지 확인합니다. 바질은 순 따기, 방울토마토·메리골드는 큰 화분 옮겨심기에 적용했습니다. 단계 이미지는 두 단계가 같은 이미지를 공유합니다(`constants/character.ts`의 `IMAGE_STAGE_MAP`).

메리골드 확인 질문:
  3 새싹        싹이 올라왔나요?
  4 성장 중     키가 15cm 이상 자랐나요? (14일 후부터) → "큰 화분으로 옮겨 심으면 더 잘 자라" 안내
  5 옮겨심기    큰 화분으로 옮겨 심었나요? (다음 날부터)
  6 꽃망울      꽃망울이 맺혔나요? (7일 후부터)
  7 개화        꽃이 피었나요? (5일 후부터)

방울토마토 확인 질문:
  3 새싹          싹이 올라왔나요?
  4 모종 성장     본잎이 2~3장 나왔나요? (7일 후부터)
  5 15cm 이상 성장 키가 15cm 이상 자랐나요? (14일 후부터) → 큰 화분 안내
  6 정식 완료     큰 화분으로 옮겨 심었나요? (다음 날부터)
  8 꽃 피는 중    꽃이 피기 시작했나요?
  9 수확 가능     열매가 빨갛게 익었나요?

바질 확인 질문:
  3 새싹          싹이 올라왔나요?
  4 본잎 성장     본잎이 2~3장 나왔나요? (7일 후부터)
  6 15cm 이상 성장 키가 15cm 이상 자랐나요? → 순 따기 안내
  7 순 따기       순 따기를 했나요? (다음 날부터)
```

현재 단계별 활성 task는 모든 식물이 물주기 / 햇빛 확인 / 관찰하기입니다. 성장 상태는 `store/growthStore.ts`와 `hooks/useGrowthManager.ts`가 관리합니다.

### 5.4 마음 건강 질문

전체 목록과 선택 규칙은 `my-app/QUESTIONS.md`를 참고하세요 (`constants/questions.ts`와 동기화). 요약: KST 기준으로 새해·연말·월초·월말 고정 질문 → 일요일은 심화 질문(29개) → 토요일은 주말 질문(5개) → 평일은 기본 질문(월별 고정 셔플). 오랜만에 복귀한 경우는 복귀 질문 4개.

### 5.5 Task 주기와 물주기 보정 메커니즘

현재 활성 task는 모든 식물이 **물주기 / 햇빛 확인 / 관찰하기 / 사진 찍기** 4개입니다. 단계별 활성 목록은 `constants/growthStages.ts`의 `*_STAGE_TASKS`에 있고, 오늘의 task 계산은 채팅(`chat.tsx`의 `buildTodayTasks`)과 홈(`hooks/useGrowthManager.ts`의 `computeTodayTasks`)이 같은 규칙으로 합니다.

| task | 주기 | 비고 |
|---|---|---|
| 물주기 | **계절·성장 단계에 따라 가변** (아래) | 흙 상태 기준. `촉촉해`를 고르면 다음 날 재확인 |
| 햇빛 확인 | 매일 | **관찰하는 날에는 생략**, 사진 찍는 날에는 유지 |
| 관찰하기 | 3일 | 오늘 물주기 날이 아니고 햇빛 확인 날일 때만. **사진 찍는 날(수·토)에는 생략** |
| 사진 찍기 | **수·토** (`PHOTO_DAYS = [3, 6]`) | 사진으로 캐릭터를 갱신하므로 주 2회. 못 해도 다음 날 보충하지 않음 |

**물주기 보정** (`constants/watering.ts`)

- 근거: 바질·토마토·메리골드 가이드 모두 "날짜가 아니라 손가락 한 마디 깊이로 흙을 찔러 말랐을 때 준다"가 결론이고, 주기는 계절과 환경에 따라 달라짐.
- 오늘의 주기 = **계절표 + 성장 단계 보정**. 계절은 오늘 날짜의 월로 정함 (봄 3~5, 여름 6~8, 가을 9~11, 겨울 12~2).

| 식물 | 봄 | 여름 | 가을 | 겨울 | 단계 보정 |
|---|---|---|---|---|---|
| 바질 | 2일 | 1일 | 2일 | 3일 | — |
| 방울토마토 | 3일 | 2일 | 3일 | 5일 | 열매가 익는 마지막 단계(8)는 +1일 |
| 메리골드 | 2일 | 1일 | 3일 | 4일 | 새싹·어린 모종(1~3단계)은 −1일 |

  최소 주기는 1일. 표의 일부 칸(바질 가을·겨울, 메리골드 여름·겨울)은 자료에 없어 **추정한 값**이므로 확인이 필요합니다. 값은 `WATER_INTERVALS` 한 곳에서 수정합니다.
- 완료 기록(`growthState.completedTasks`)에 두 종류를 구분해서 남김
  - `water` — 실제로 물을 준 날
  - `water_moist` — 확인했지만 흙이 촉촉해서 주지 않은 날 (물 준 날로 치지 않음)
- 물주기 날 판단 (`isWaterDue`)
  1. 가장 최근 기록이 `water_moist`(물 준 날 이후)이면 → **그 다음 날** 다시 확인
  2. 아니면 → 마지막으로 `water`를 한 날 + 오늘 계절의 주기가 지났을 때
  3. 물 준 기록이 없으면 → 바로 확인 대상 (계절이 바뀌는 날에는 새 계절 주기가 즉시 적용됨)
- `water_moist`는 캘린더 물방울 뱃지와 날짜별 기록 카드의 물주기 아이콘을 **켜지 않음**. 지난 대화 복원(`utils/chatHistory.ts`)에서는 `DailyRecord.altTaskIds`로 "아직 흙이 촉촉해." 응답을 다시 보여 줌.
- 햇빛의 `날씨가 흐렸어.`는 완료로 기록되지만 `altTaskIds`에도 남아 기록 카드의 해 아이콘은 켜지 않음.
- 검증: 개발자 메뉴의 날짜 시뮬레이션으로 계절 전환, `촉촉해` 후 다음 날 재질문, 수·토 사진 task와 관찰 생략을 확인. (계산 함수는 단위 시나리오 19건으로 확인함)

---

## 6. AsyncStorage 키 목록

```
@plant/onboarding_complete       boolean
@plant/user_nickname             string
@plant/plant_data                JSON (PlantData)
@plant/streak_count              number
@plant/last_record_date          string
@plant/first_record_date         string
@plant/question_index            number
@plant/deep_q_index              number
@plant/record_YYYY-MM-DD         JSON (DailyRecord)
@plant/photos_YYYY-MM-DD         JSON (string[])      — 당일 사진 URI 목록
@plant/chat_draft_YYYY-MM-DD     JSON                 — 채팅 중단 시 임시 저장
@plant/generated_plant_uri       string               — AI 생성 캐릭터 이미지
@plant/generated_face_pos        JSON                 — 화분 중심 위치(표정 오버레이용)
@plant/last_streak_shown_date    string
@plant/notification_times        JSON                 — 아침·저녁 시간(분)과 켜기/끄기
@plant/notification_signature    string               — 예약 알림 재등록 판단용
@rootmate/growth_state           JSON                 — 성장 단계 상태
@rootmate/last_stage_check       string (날짜)
@rootmate/memory_enabled         boolean              — 대화 기억(개발자 메뉴)
@rootmate/memory_summary_YYYY-MM-DD  JSON             — 대화 요약(장기 기억)
```

현재 모든 데이터는 디바이스 로컬에만 저장됩니다. 서버 동기화가 필요하다면 `store/storage.ts` 각 함수 내부에 API 호출을 추가하는 방식을 권장합니다.

---

## 7. AI 연동 — 현재 상태

AI는 이미 코드에 연결되어 있습니다. **이 저장소에는 API 키(`.env`)가 없으므로 각자 환경에서 설정해야 동작**합니다. 키가 없거나 호출이 실패하면 프론트는 미리 만든 기본 문구로 대체합니다(터미널에 `fallback` 경고).

### 7.1 환경 변수 (`my-app/.env`, git에 올라가지 않음)

| 변수 | 용도 |
|---|---|
| `EXPO_PUBLIC_OPENAI_API_KEY` | Mindlogic FactChat 게이트웨이 키 (텍스트 생성) |
| `EXPO_PUBLIC_DEFAULT_MODEL` | 모델 이름 (없으면 `claude-sonnet-5`) |
| `EXPO_PUBLIC_REPLICATE_API_KEY` | 이미지 변환(Replicate) 키 |

> 키가 `EXPO_PUBLIC_` 변수라 앱 번들에 그대로 들어갑니다. 개발 중에는 괜찮지만 배포 전에는 서버를 거치는 구조로 바꾸는 것을 권장합니다.

### 7.2 프론트가 호출하는 함수 (`services/ai.ts`)

| 함수 | 역할 |
|---|---|
| `generateQuestion()` | 원문 질문을 식물 캐릭터 말투로 변형 (`services/api/chat.ts`의 페르소나 사용) |
| `generatePlantResponse()` | 유저 답변에 대한 식물의 짧은 반응 (라운드, 이전 대화, 대화 기억 반영) |
| `summarizePlantConversation()` | 하루 대화를 1~3문장 일기로 요약 |
| `updatePlantCharacterWithCustomPot()` | 식물 사진 → 픽셀 캐릭터 생성 (Replicate) |
| `analyzeGeneratedImageForFace()` | 생성된 이미지에서 화분 위치를 찾아 표정을 올릴 좌표 계산 |

식물별 말투는 `services/api/chat.ts`의 `PLANT_PERSONAS`(바질: 담백한 반말, 방울토마토: 귀여운 동생, 메리골드: 담백하고 솔직한 반말)에 정의되어 있습니다.

### 7.3 알려진 한계

- **캐릭터 이미지 규칙**: 홈, 연속 관리, 채팅 아바타는 저장된 AI 캐릭터(`@plant/generated_plant_uri`)가 있으면 그것을, 없거나 이미지가 로드되지 않으면 성장 상태의 **현재 단계 기본 캐릭터**를 보여 줍니다. 단계별 기본 캐릭터는 AI 캐릭터 업데이트가 실패했을 때의 대체 이미지 역할입니다.
- **캐릭터 생성 실패 처리**: 변환 호출이 실패하거나 식물을 인식하지 못하면 `사진을 다시 찍어주세요` 팝업(`다시 찍기` → 가이드 시트, `다음에 찍기` → 기존 캐릭터 유지하고 넘어감)을 띄웁니다. 이때 사진 task는 완료로 기록되지 않습니다.
- 사진 촬영 → 캐릭터 생성 흐름은 **수·토 task로 진입**합니다 (§5.5). 단, 이미지 변환은 Replicate 키가 있어야 동작하며, 실제 기기에서 사진 → 캐릭터 결과물 품질은 아직 검증하지 못했습니다.
- 기본 모델 이름(`claude-sonnet-5`)이 게이트웨이에서 인식되는 이름인지는 각자 환경에서 확인이 필요합니다.
- 메리골드의 도감 캐릭터 이미지는 아직 튤립 그림이 자리표시자로 들어 있습니다.

---

## 8. 알림 시스템

| 종류 | 시간 | 동작 | 상태 |
|---|---|---|---|
| 아침 알림 | 유저 설정 (기본 오전 9시) | 매일 반복. 식물 말투의 인사 | ✅ |
| 저녁 알림 | 유저 설정 (기본 오후 9시) | 오늘 관리 전일 때만. 완료하면 취소 | ✅ |
| 다시 알림 | 2시간 뒤 | 채팅에서 못 했다고 하고 `알림 받을게요`를 선택했을 때 | ✅ |

- 시간과 켜기/끄기는 온보딩 step5와 설정 팝업에서 바꿀 수 있고, 바꾸면 예약이 즉시 새로 등록됩니다 (`utils/notifications.ts`).
- 홈에 들어올 때마다 `refreshDailyNotifications()`가 예약 상태를 맞춥니다. 알림 권한이 없으면 예약되지 않습니다.
- **물주기·햇빛별 주기 알림은 아직 연결되지 않았습니다.** `notification.json`(식물별 문구와 주기)과 `hooks/useNotification.ts`의 `rescheduleNotifications()`가 준비되어 있지만 앱 어디에서도 호출하지 않습니다. 성장 알림도 없습니다.
- 개발자 메뉴의 `실제 알림 테스트`로 현재 단계 task 알림을 5초 간격으로 받아볼 수 있습니다.

---

## 9. 남은 개발 항목

| 항목 | 담당 | 설명 |
|---|---|---|
| 사진 task 후속 | 프론트 + AI | 수·토에 진입하도록 연결됨. 사진 → 캐릭터 결과 품질 검증, 사진을 못 찍은 주의 보충 정책(현재는 보충 없음) 결정 |
| 물주기 사용자별 학습 (방안 C) | 프론트 | 현재는 계절표 + `촉촉해` 시 재확인만 적용. `촉촉해`를 연달아 고르면 그 사용자의 주기를 늘리는 식의 학습은 미래 계획 |
| 물주기 주기표 확정 | 기획 | 추정값 칸(바질 가을·겨울, 메리골드 여름·겨울) 확인. 지역·실내외 환경 반영 여부 결정 |
| task별 주기 알림 연결 | 프론트 / 백엔드 | `rescheduleNotifications()` 연결 및 알림 정책 확정 |
| API 키 보호 | 백엔드 | 현재 앱 번들에 키가 포함됨 → 서버 경유 구조로 전환 |
| 서버 데이터 동기화 | 백엔드 | 현재 전량 로컬 저장. 서버 백업 여부 결정 |
| 바질·토마토 `잘 키우기` 문구 | 기획 | `constants/plantGuide.ts`의 `tips`에 물주기 상세만 있고 햇빛·비료 등은 비어 있음 (메리골드도 나머지 항목 보강 필요) |
| 메리골드 캐릭터 이미지 | 디자인 | 성장 6단계·표정 6종 (`assets/images/characters/marigold/`) |
| 이전 단계 세부 UI 조정 | 프론트 | 개정 UI 초안 완료 후 화면별로 다시 다듬을 예정 |

---

## 10. 로컬 실행 방법

```bash
cd my-app
npm install
npx expo start
```

- iOS 시뮬레이터: `i` 또는 `npm run ios`
- Android 에뮬레이터: `a` 또는 `npm run android`
- 물리 기기: Expo Go 앱 설치 후 QR 코드 스캔
- AI 기능을 쓰려면 `my-app/.env`에 위 환경 변수를 넣고 서버를 다시 시작하세요.

> 카메라, 알림 등 일부 기능은 물리 기기에서만 정상 동작합니다.
> `npx expo start --web`으로 실행하면 일부 동작이 다릅니다 (`Alert.alert`가 동작하지 않음, 네이티브 애니메이션 경고, 알림 미지원 등).

---

## 11. 주요 파일 빠른 참조

| 파일 | 설명 |
|---|---|
| `my-app/services/ai.ts` | 프론트가 호출하는 AI 함수 진입점 |
| `my-app/services/api/chat.ts` | LLM 호출, 식물별 페르소나 프롬프트 |
| `my-app/services/api/questionPool.ts` | 오늘의 질문 선택 로직 |
| `my-app/app/chat.tsx` | 채팅 흐름 전체 |
| `my-app/app/index.tsx` | 홈 화면 + 개발자 메뉴 |
| `my-app/components/settings/SettingsModal.tsx` | 설정 팝업 |
| `my-app/constants/questions.ts` | 질문 (QUESTIONS.md와 동기화) |
| `my-app/constants/plants.ts` | 식물 정보, task 정의, 도감 카드 문구 |
| `my-app/constants/plantGuide.ts` | 도감 상세 탭 본문 (식물별·탭별) |
| `my-app/constants/growthStages.ts` | 식물별 성장 단계 조건, 단계별 활성 task |
| `my-app/constants/watering.ts` | 물주기 계절표·단계 보정·물주기 날 판단 |
| `my-app/constants/chatMessages.ts` | 식물별 채팅 대사, task 확인 질문·선택지 |
| `my-app/store/storage.ts` | 로컬 저장 전체 API |
| `my-app/utils/notifications.ts` | 아침·저녁·다시 알림 예약 |
| `my-app/DESIGN.md` | 개정된 디자인 시스템 |
| `my-app/QUESTIONS.md` | 질문 목록과 운영 방식 |
