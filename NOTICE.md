# NOTICE — Rootmate 개발 현황 및 인수인계 문서

> 작성일: 2026-05-31
> 대상: AI / 백엔드 / 손정우
> 작성자: 프론트 / 김지윤

---

## 1. 서비스 개요

**앱명**: Rootmate  
**한 줄 정의**: 식물을 돌보는 척, 나도 돌보게 되는 앱

유저는 실제 식물을 키우며 관리 기록을 남기고, 식물 캐릭터와의 채팅을 통해 자연스럽게 마음 건강 질문에 답하게 됩니다. 마음 건강 앱에 거부감이 있는 20~30대 청년을 타겟으로 합니다.

---

## 2. 프로젝트 구조

```
WeROK/
└── my-app/                         # Expo 앱 루트
    ├── src/
    │   ├── app/                    # 화면 (Expo Router file-based routing)
    │   │   ├── _layout.tsx         # 루트 레이아웃, 하단 탭바
    │   │   ├── index.tsx           # 홈 탭
    │   │   ├── chat.tsx            # 채팅 화면 (핵심)
    │   │   ├── calendar.tsx        # 캘린더 / 앨범 탭
    │   │   ├── collection.tsx      # 도감 탭 (미구현, placeholder)
    │   │   └── onboarding/         # 온보딩 5단계
    │   ├── components/
    │   │   ├── common/             # 공용 컴포넌트
    │   │   └── ...
    │   ├── constants/              # 컬러, 식물, 질문, 성장 단계, 표정 등 정적 데이터
    │   ├── hooks/                  # 커스텀 React 훅
    │   ├── services/
    │   │   └── ai.ts               # ★ AI 연동 진입점 (현재 stub)
    │   ├── store/
    │   │   └── storage.ts          # AsyncStorage 래퍼 (로컬 퍼시스턴스)
    │   └── utils/                  # 날짜, 채팅 재현 유틸
    └── assets/
        └── images/                 # 식물 캐릭터 PNG, SVG 아이콘
```

---

## 3. 기술 스택

| 구분 | 기술 |
|---|---|
| 프레임워크 | Expo ~55 (React Native 0.83) |
| 언어 | TypeScript 5.9 |
| 라우팅 | Expo Router (file-based) |
| 로컬 저장 | AsyncStorage 2.2 |
| 이미지 | expo-image, expo-image-picker |
| 카메라 | expo-camera |
| 알림 | expo-notifications |
| 애니메이션 | react-native-reanimated 4 |
| 스타일 | React Native StyleSheet, expo-linear-gradient |

백엔드 서버 / AI 모델은 현재 연결되어 있지 않으며, 이번 인수인계의 핵심 구현 대상입니다.

---

## 4. 전체 화면 구조 및 구현 현황

### 4.1 온보딩 (`src/app/onboarding/`)

| 파일 | 구현 상태 | 내용 |
|---|---|---|
| `step1.tsx` | ✅ 완료 | 유저 닉네임 입력 |
| `step2.tsx` | ✅ 완료 | 식물 선택 (바질 / 방울토마토 / 튤립), 좌우 스와이프 캐러셀 |
| `step3.tsx` | ✅ 완료 | 식물 닉네임 입력 |
| `step4.tsx` | ✅ 완료 | 식물 관리 가이드 안내 |
| `step5.tsx` | ✅ 완료 | 알림 권한 요청 |
| `complete.tsx` | ✅ 완료 | 온보딩 완료 → 홈으로 이동 |

온보딩 완료 시 AsyncStorage에 `@plant/onboarding_complete`, `@plant/user_nickname`, `@plant/plant_data`가 저장됩니다.

---

### 4.2 홈 탭 (`src/app/index.tsx`)

✅ 완료

- 날짜, 유저 닉네임, 동적 인사 문구 표시
- 연속 관리 streak 카운터
- 성장 단계에 맞는 식물 캐릭터 렌더링 (`PlantCharacter` 컴포넌트)
- 오늘의 Task 카드 목록 (식물 종 / 성장 단계 / 경과 일수 기반으로 자동 결정)
- 채팅 진입 경로 3가지 (상단 아이콘, 말풍선 버튼, Task 카드)
- 개발자 메뉴 (날짜 1.5초 long press → 단계 강제 설정, 데이터 초기화)

---

### 4.3 채팅 화면 (`src/app/chat.tsx`)

✅ 완료 (AI 응답 부분 제외)

채팅은 앱의 핵심 화면입니다. 다음 단계로 순서대로 진행됩니다.

```
Phase 1: Task 확인
  → 식물이 "오늘 [task명] 하셨나요?" 질문
  → [완료했어요] / [못했어요] 버튼 선택

  완료: Phase 2로 진행
  미완료: "나중에 알림 드릴까요?" → 종료

Phase 2: 마음건강 질문 (Task 완료 시에만)
  → constants/questions.ts에서 질문 선택
  → 현재는 질문 원문을 그대로 표시
  ★ AI 연동 후: generateQuestion()이 식물 캐릭터 말투로 변형해서 전달

Phase 3: 식물의 반응
  → 유저 답변 저장
  → 현재는 하드코딩된 임시 반응 메시지 표시
  ★ AI 연동 후: generatePlantResponse()가 유저 답변에 맞춰 동적 응답 생성

Photo Phase (별도, 식물 사진 촬영 task 해당일에 발동):
  → "이번 주 [식물닉네임] 모습이 궁금해요! 사진 찍어줄래요?"
  → 카메라 / 갤러리 선택 → 사진 업로드
  → 현재는 사진을 로컬에 저장만 함
  ★ AI 연동 후: updatePlantCharacter()가 사진을 픽셀 아트 캐릭터로 변환
```

---

### 4.4 캘린더 / 앨범 탭 (`src/app/calendar.tsx`)

✅ 완료

- **달력 뷰**: 월간 달력, 기록 완료 날 dot 표시, 날짜 탭 시 해당 날 기록 요약 슬라이드
- **앨범 뷰**: 날짜별 사진 카드 + 그날 질문/답변 요약

---

### 4.5 도감 탭 (`src/app/collection.tsx`)

⬜ 미구현 (placeholder)

중앙에 "준비 중이에요" 텍스트만 표시. 추후 식물 정보 콘텐츠 채울 예정.

---

## 5. 핵심 데이터 모델

### 5.1 식물 데이터 (`PlantData`)

```typescript
// store/storage.ts → getPlantData() / updatePlantData()
interface PlantData {
  id: 'basil' | 'tomato' | 'tulip';
  nickname: string;           // 유저가 지어준 식물 닉네임
  adoptedAt: string;          // ISO 8601 (입양일)
  growthStage: GrowthStage;   // 1~8 숫자 (식물 종에 따라 최대 단계 상이)
  characterImageUri?: string; // ★ AI가 생성한 픽셀 캐릭터 이미지 URI
}
```

`characterImageUri`는 현재 항상 `undefined`입니다. `updatePlantCharacter()` 구현 후 이 필드에 결과 URI를 저장해야 홈 화면의 캐릭터가 변경됩니다.

---

### 5.2 일별 기록 (`DailyRecord`)

```typescript
// store/storage.ts → getDailyRecord() / saveDailyRecord()
interface DailyRecord {
  date: string;               // 'YYYY-MM-DD'
  waterDone?: boolean;
  completedTaskIds: string[]; // 완료한 task id 목록
  question?: string;          // 당일 마음건강 질문 원문
  answer?: string;            // 유저 텍스트 답변
  answerImageUri?: string;    // 유저가 답변과 함께 첨부한 이미지
  plantPhotoUri?: string;     // 식물 사진 촬영 task 결과 이미지 URI
  skippedQuestion?: boolean;
}
```

---

### 5.3 성장 단계

성장은 `constants/growthStages.ts`에 정의되어 있습니다.

```
식물별 최대 단계:
  바질(basil):          8단계
  방울토마토(tomato):   8단계
  튤립(tulip):          6단계

단계 진행 조건 3종:
  INITIAL         — 앱 시작 시 자동 1단계
  DAYS_PASSED     — N일 경과 시 자동 다음 단계
  USER_CONFIRMED  — 식물이 성장 확인 질문을 하고 유저가 확인하면 다음 단계
```

단계가 오르면 표시 이미지와 활성화되는 Task 종류가 바뀝니다. 성장 상태는 `hooks/useGrowthManager.ts`에서 관리합니다.

---

### 5.4 마음건강 질문

`constants/questions.ts`에 정의되어 있습니다.

```
DAILY_QUESTIONS:   40개 — 일상, 신체/감각, 관계, 식물과의 연결, 휴식/에너지, 자기 성찰
DEEP_QUESTIONS:    15개 — 일정 주차 이후 활성화되는 심층 질문
```

질문 템플릿 변수: `{plantNickname}`, `{userNickname}`

현재 프론트는 질문을 순서대로 선택해서 원문 그대로 채팅에 표시합니다. AI 연동 후에는 `generateQuestion()`이 이를 받아 캐릭터 말투로 가공한 문장을 반환해야 합니다.

---

## 6. AsyncStorage 키 목록

백엔드 / 서버 연동 시 데이터 동기화 범위를 파악하기 위한 참고 목록입니다.

```
@plant/onboarding_complete      boolean
@plant/user_nickname            string
@plant/plant_data               JSON (PlantData)
@plant/streak_count             number
@plant/question_index           number (순환 인덱스)
@plant/deep_q_index             number
@plant/record_YYYY-MM-DD        JSON (DailyRecord)
@plant/photos_YYYY-MM-DD        JSON (string[])      — 당일 사진 URI 목록
@plant/chat_draft_YYYY-MM-DD    JSON                 — 채팅 중단 시 임시 저장
@rootmate/growth_state          JSON                 — 성장 단계 상태
@rootmate/last_stage_check      string (날짜)
```

현재 모든 데이터는 디바이스 로컬에만 저장됩니다. 서버 동기화가 필요하다면 `store/storage.ts`의 각 함수 내부에서 API 호출을 추가하는 방식을 권장합니다.

---

## 7. AI 연동 — 구현이 필요한 부분

**진입점 파일**: `my-app/src/services/ai.ts`

이 파일에 3개의 함수 stub이 준비되어 있습니다. 백엔드 팀원은 이 파일의 함수 내부만 채우면 됩니다. 프론트 코드는 수정하지 않아도 됩니다.

---

### 7.1 식물 메시지 생성 — `generateQuestion()`

```typescript
export async function generateQuestion(
  questionBase: string,   // constants/questions.ts에서 선택된 원문 질문
  plantNickname: string,  // 유저가 지어준 식물 닉네임
  userNickname: string,   // 유저 닉네임
): Promise<string>
```

**역할**: 원문 질문을 식물 캐릭터의 말투로 변형한 문장을 반환합니다.

**예시**:
```
입력: "오늘 밥은 잘 챙겼나요?", plantNickname="초록이", userNickname="지윤"
출력: "지윤, 오늘 밥은 잘 챙겼어? 나도 햇빛 잘 먹었으니까 너도 잘 먹어야 해 🌱"
```

**호출 위치**: `src/app/chat.tsx` — Phase 2 (마음건강 질문 표시 시점)

---

### 7.2 유저 답변에 대한 식물 반응 생성 — `generatePlantResponse()`

```typescript
export async function generatePlantResponse(
  userMessage: string,    // 유저가 입력한 답변 텍스트
  plantNickname: string,
  context: string,        // 당일 질문 원문 (맥락 제공용)
): Promise<string>
```

**역할**: 유저의 답변을 받아 식물 캐릭터가 공감하고 격려하는 짧은 반응 메시지를 반환합니다.

**요구사항**:
- 2~3문장 이내의 짧은 응답
- 과도한 위로나 진단적 언어 지양 — 자연스러운 식물 친구 말투
- 부정적인 답변에도 따뜻하게 수용하는 톤

**호출 위치**: `src/app/chat.tsx` — Phase 3 (유저 답변 전송 후)

---

### 7.3 식물 사진 → 픽셀 캐릭터 이미지 변환 — `updatePlantCharacter()`

```typescript
export async function updatePlantCharacter(
  photoUri: string,   // 디바이스 로컬 파일 URI (예: file:///...)
  plantId: string,    // 'basil' | 'tomato' | 'tulip'
): Promise<string>    // 반환: 새 캐릭터 이미지 URI 또는 URL
```

**역할**:
1. 유저가 채팅 중 촬영한 실제 식물 사진을 받아 서버에 업로드합니다.
2. AI 이미지 생성 모델로 해당 식물의 현재 상태(색, 크기, 건강도 등)를 반영한 **픽셀 아트 스타일의 식물 캐릭터 이미지**를 생성합니다.
3. 생성된 이미지의 URI(혹은 서버 URL)를 반환합니다.

**프론트가 처리하는 부분**:
- 반환된 URI를 `PlantData.characterImageUri`에 저장 (`storage.updatePlantData()` 호출)
- 홈 화면의 `PlantCharacter` 컴포넌트가 해당 URI를 우선 표시

**이미지 포맷 요구사항**:
- 픽셀 아트 / 도트 그래픽 스타일 (기존 캐릭터 에셋의 비주얼 톤과 일치)
- 정사각형 비율 권장
- 반환값이 로컬 파일 URI라면 캐싱 전략 필요, 서버 URL이라면 앱 재설치 후에도 유지됨

**호출 위치**: `src/app/chat.tsx` — Photo Phase 완료 시점

---

## 8. 프론트-백엔드 인터페이스 요약

```
┌─────────────────────────────────────────────┐
│            chat.tsx (프론트)                │
│                                             │
│  Phase 2: 질문 표시                         │
│    generateQuestion(원문, 식물닉네임, 닉네임)│
│    → AI가 캐릭터 말투로 변형한 질문 문장    │
│                                             │
│  Phase 3: 유저 답변 후                      │
│    generatePlantResponse(답변, 식물닉, 질문) │
│    → AI가 생성한 공감 반응 메시지           │
│                                             │
│  Photo Phase: 식물 사진 촬영 후             │
│    updatePlantCharacter(photoUri, plantId)   │
│    → 픽셀 아트 캐릭터 이미지 URI           │
└─────────────────────────────────────────────┘
```

세 함수 모두 `async`이며, 로딩 중에는 프론트가 typing indicator를 표시합니다. 함수가 `throw`하면 프론트는 임시 fallback 메시지를 표시합니다.

---

## 9. 알림 시스템

현재 `expo-notifications` 패키지가 설치되어 있고 권한 요청(온보딩 step5)까지 구현되어 있습니다. 실제 알림 스케줄링 로직은 미완성입니다.

**필요한 알림 2종**:

| 종류 | 시간 | 내용 | 탭 시 이동 |
|---|---|---|---|
| 아침 알림 | 유저 설정 (기본 오전 9시) | "오늘 [task명] 할 시간이에요!" | `/chat` |
| 저녁 알림 | 고정 오후 9시 | "오늘 task 확인했나요? [식물닉네임]이 기다려요" | `/chat` |

`hooks/useNotification.ts`에 스케줄링 함수를 구현하거나, `services/` 하위에 별도 파일로 관리해도 됩니다. 기존 코드 구조에 맞게 결정해주세요.

---

## 10. 현재 미구현 / 잔여 개발 항목 정리

| 항목 | 담당 | 설명 |
|---|---|---|
| `generateQuestion()` 구현 | AI/백엔드 | 캐릭터 말투 변형 질문 생성 |
| `generatePlantResponse()` 구현 | AI/백엔드 | 유저 답변 기반 공감 반응 생성 |
| `updatePlantCharacter()` 구현 | AI/백엔드 | 식물 사진 → 픽셀 아트 캐릭터 변환 |
| 알림 스케줄링 | AI/백엔드 or 프론트 | 아침/저녁 push 알림 스케줄 등록 |
| 서버 데이터 동기화 | AI/백엔드 | 현재 전량 로컬 저장 → 서버 백업 여부 결정 |
| 도감 탭 (`collection.tsx`) | 프론트 | 식물 정보 콘텐츠 구현 |

---

## 11. 로컬 실행 방법

```bash
cd my-app
npm install
npx expo start
```

- iOS 시뮬레이터: `i` 또는 `npm run ios`
- Android 에뮬레이터: `a` 또는 `npm run android`
- 물리 기기: Expo Go 앱 설치 후 QR 코드 스캔

> 카메라, 알림 등 일부 기능은 물리 기기에서만 정상 동작합니다.

---

## 12. 주요 파일 빠른 참조

| 파일 | 설명 |
|---|---|
| `src/services/ai.ts` | AI 연동 진입점 — 이 파일만 수정하면 됩니다 |
| `src/app/chat.tsx` | 채팅 흐름 전체 구현 |
| `src/app/index.tsx` | 홈 화면 |
| `src/constants/questions.ts` | 마음건강 질문 40개 + 심층 15개 |
| `src/constants/growthStages.ts` | 식물별 성장 단계 조건 정의 |
| `src/constants/plants.ts` | 식물별 Task 정의 및 주기 |
| `src/store/storage.ts` | 로컬 저장 전체 API |
| `src/hooks/useGrowthManager.ts` | 성장 단계 상태 관리 훅 |
| `src/hooks/usePlantExpression.ts` | 상황별 식물 표정 자동 결정 훅 |
| `my-app/CLAUDE.md` | 전체 디자인 시스템 및 개발 가이드 |
