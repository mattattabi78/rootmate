# RootMate

> 식물을 돌보는 척, 나도 돌보게 되는 앱

2026 Art, Tech and Social Impact

---

## 기획 의도

**RootMate**는 식물 관리 앱의 외형을 띠고 있지만, 실제로는 마음 건강 메시지를 자연스럽게 전달하는 앱입니다.

유저는 실제 식물을 키우며 매일 관리 기록을 남기고, 그 과정에서 식물 캐릭터와 채팅 형식으로 자신의 마음을 돌아보는 질문에 답하게 됩니다. 거부감 없이 진입할 수 있는 식물 관리라는 친근한 틀 안에 마음 건강이라는 진짜 목적을 담았습니다.

### 타겟 유저
- 고기능 우울을 겪고 있지만 스스로 인식하지 못하는 20~30대 청년
- 마음 건강 앱에 거부감이 있어 진입 장벽이 높은 유저
- 식물에 관심 있는 식집사

---

## 기술 스택

| 항목 | 기술 |
|---|---|
| 프레임워크 | Expo (React Native) |
| 언어 | TypeScript |
| 라우팅 | Expo Router (file-based) |
| 스타일 | React Native StyleSheet |
| 로컬 저장소 | AsyncStorage |
| 알림 | expo-notifications |
| 카메라 / 갤러리 | expo-camera, expo-image-picker |
| 이미지 처리 | expo-image-manipulator |
| AI 연동 | services/ai.ts (Claude API) |
| 빌드 / 배포 | EAS (Expo Application Services) |

---

## 앱 구조

```
my-app/
├── app/                                  # Expo Router 화면
│   ├── _layout.tsx                       # 전역 폰트 로딩, 알림 설정, Stack 레이아웃
│   ├── welcome.tsx                       # 환영 화면
│   ├── index.tsx                         # 홈 화면
│   ├── chat.tsx                          # 하루 관리 / 질문 대화 흐름
│   ├── streak.tsx                        # 연속 관리 달성 화면
│   ├── calendar.tsx                      # 캘린더 + 앨범 기록
│   ├── collection.tsx                    # 식물 도감 메인
│   ├── plant-detail.tsx                  # 식물 상세 정보 / 성장 단계 설명
│   └── onboarding/
│       ├── _layout.tsx                   # 온보딩 공통 레이아웃
│       ├── step1.tsx                     # 닉네임 입력
│       ├── step2.tsx                     # 식물 선택
│       ├── step3.tsx                     # 식물 닉네임 설정
│       ├── step4.tsx                     # 성장 단계/주기 안내
│       ├── step5.tsx                     # 최종 확인
│       └── complete.tsx                  # 온보딩 완료 화면
├── components/
│   └── common/
│       ├── BottomNavBar.tsx              # 하단 네비게이션
│       ├── Button.tsx                    # 공통 버튼
│       ├── EmojiText.tsx                 # 이모지 포함 텍스트
│       ├── Icons.tsx                     # 아이콘 컴포넌트
│       ├── PlantCharacter.tsx            # 식물 캐릭터 렌더링
│       ├── ProgressDots.tsx              # 온보딩 진행 표시
│       └── TopAppBar.tsx                 # 상단 앱바
├── constants/
│   ├── character.ts                     # 식물 종류, 표정, 성장 단계 정보
│   ├── chatMessages.ts                  # 식물별 말풍선 메시지
│   ├── colors.ts                        # 화면 컬러 팔레트
│   ├── expressions.ts                   # 상황별 표정 매핑
│   ├── growthStages.ts                  # 단계별 Task/진행 로직
│   ├── imageGuide.ts                    # 사진 촬영 안내 문구
│   ├── index.ts                         # constants export
│   ├── notifications.ts                 # 알림 문구 / 세부 문구 선택
│   ├── plants.ts                        # 식물 정보 + Task 정의
│   └── questions.ts                     # 질문 저장소
├── hooks/
│   ├── useGrowthManager.ts              # 성장 단계/Task 동기화
│   ├── useNotification.ts               # 알림 이벤트 처리
│   └── usePlantExpression.ts            # 상황에 따른 표정 계산
├── services/
│   ├── ai.ts                            # AI 질문 생성 / 응답 / 캐릭터 생성
│   ├── api/
│   │   ├── chat.ts                      # 채팅 API 응답 관리
│   │   ├── questionPool.ts              # 오늘 질문 풀
│   │   └── styleTransfer.ts             # 이미지 스타일 변환 관련
│   ├── config/
│   │   └── env.ts                       # 환경 변수 관리
│   └── types/
│       └── chat.ts                      # 채팅 타입 정의
├── store/
│   ├── growthStore.ts                   # 성장 상태 / 완료 Task 관리
│   └── storage.ts                       # AsyncStorage 기반 로컬 저장
├── utils/
│   ├── chatHistory.ts                   # 채팅 기록 복원
│   ├── date.ts                          # 날짜 계산 유틸
│   ├── devOverrides.ts                  # 개발 모드 날짜/Task 시뮬레이션
│   ├── notifications.ts                # 알림 등록/취소 처리
│   └── persistImage.ts                  # 이미지 URI 저장
├── assets/                              # 아이콘, 폰트, 캐릭터 이미지, SVG
├── app.json                             # Expo 앱 설정
├── eas.json                             # EAS 빌드 설정
├── babel.config.js
├── metro.config.js
├── package.json
├── tsconfig.json
├── expo-env.d.ts
└── notification.json                    # 알림 테스트 / 설정 설정 파일
```

---

## 화면별 기능

### 환영 화면 (`welcome.tsx`)
- 앱 첫 진입 시 표시되는 시작 화면
- 식물 캐릭터를 중심으로 앱의 분위기를 소개
- 터치하면 온보딩으로 진입

### 홈 화면 (`index.tsx`)
- 오늘 날짜, 연속 관리 일수, 현재 성장 단계 정보를 한 번에 표시
- 식물 캐릭터가 상황에 따라 자동 표정 변화를 보이며 중심에 배치됨
- 오늘의 관리 Task를 카드 형식으로 보여주고 완료 여부를 기록
- 채팅 시작 경로는 상단 아이콘, 식물 말풍선, Task 카드에서 연결됨
- 개발자 메뉴를 통해 날짜 시뮬레이션, 성장 단계 강제 설정, 오늘 기록 초기화 등을 수행 가능

### 채팅 화면 (`chat.tsx`) — 핵심 플로우

하루 1회 진행되는 식물과의 대화 과정입니다.

**1단계: Task 확인**
- 오늘 해야 할 Task를 순서대로 확인하고 완료 여부를 선택
- 물주기 항목은 "흙이 아직 촉촉해요"처럼 상황별 대안을 함께 제시
- 미완료 항목이 있으면 알림 여부를 묻고 대화 세션을 종료할 수 있음

**2단계: 사진 촬영 Task**
- 특정 요일(예: 수·일)에 사진 촬영 또는 갤러리 선택 화면이 활성화됨
- 촬영 전 가이드 모달을 통해 사진 구성을 안내
- 업로드된 사진을 AI가 분석해 커스텀 식물 캐릭터 이미지를 생성
- 생성 결과를 프리뷰로 확인하고 확정 가능

**3단계: 마음 건강 질문**
- 모든 Task를 마친 경우 오늘의 질문이 채팅 형식으로 제시됨
- 사용자는 텍스트 또는 사진으로 자유롭게 답변 가능
- 답변에 대한 식물의 짧고 따뜻한 반응이 이어짐

**4단계: 완료 처리**
- 하루 관리 완료 후 연속 관리 화면으로 이동
- 이미 하루 기록이 있는 상태에서 미완료 Task만 남아 있으면 해당 Task 흐름만 이어서 진행
- 세션이 중간에 종료되어도 draft를 저장해 다시 이어서 진행 가능

### 연속 관리 화면 (`streak.tsx`)
- 채팅 완료 직후 하루 1회 노출되는 보상 화면
- 현재 연속 관리 일수와 스파클 애니메이션을 통해 성취감을 강조
- 최근 7일 관리 기록을 완료/미완료/미래 상태로 트래킹

### 캘린더 화면 (`calendar.tsx`)
- 월 단위 달력 뷰와 앨범 뷰를 탭 전환으로 제공
- 기록이 있는 날짜는 표시되고, 특정 날짜를 누르면 해당 일의 관리 기록 및 사진 요약 확인 가능
- 사용자가 키운 식물의 하루 기록을 한눈에 정리하는 공간 역할

### 도감 화면 (`collection.tsx`)
- 식물 카드 형태로 바질, 방울토마토, 튤립을 보여줌
- 현재 입양한 식물만 해제 없이 열람 가능하며 잠금 상태를 표현
- 각 식물 상세보기는 `plant-detail.tsx`로 이동

### 식물 상세 화면 (`plant-detail.tsx`)
- 선택한 식물의 설명, 꽃말, 성장 단계별 가이드, 관리 요령을 확인
- 현재 성장 단계에 맞는 섹션이 강조 표시됨
- 아코디언 형태로 단계별 정보를 구성해 읽기 쉽게 설계됨

### 온보딩 화면 (`onboarding/`)
- `step1`에서 사용자 닉네임 입력
- `step2`에서 식물 종류 선택
- `step3`에서 식물 애칭 설정
- `step4`와 `step5`에서 소개 및 최종 확인 단계 진행
- `complete.tsx`에서 온보딩 완료 후 홈으로 이동

---

## 식물 종류

### 바질 🌿
- 성장 단계: 8단계 (씨앗 심기 → 수확 가능)
- 주요 Task: 물주기, 햇빛 확인, 비료 주기, 순 따기, 꽃대 제거, 수확
- 성격: 직설적이고 털털한 말투

### 방울토마토 🍅
- 성장 단계: 8단계 (씨앗 심기 → 수확 가능)
- 주요 Task: 물주기, 햇빛 확인, 곁순 제거, 비료 주기, 지지대 세우기(1회), 수분 돕기, 수확
- 성격: 발랄하고 친근한 말투

### 튤립 🌷
- 성장 단계: 6단계 (구근 심기 → 개화)
- 주요 Task: 물주기, 햇빛 확인
- 성격: 정중하고 차분한 말투
- 특이사항: 냉장 처리 단계 포함 (실내 재배 시 필수)

---

## 성장 시스템

### 단계 진행 방식 2가지

| 방식 | 설명 |
|---|---|
| `DAYS_PASSED` | 이전 단계 진입 후 N일이 지나면 자동으로 다음 단계 진행 |
| `USER_CONFIRMED` | 채팅에서 유저에게 "싹이 올라왔나요?" 같은 확인 질문 후 진행 |

### 단계별 Task 활성화
각 단계마다 활성화되는 Task 목록이 다르며, 단계가 오를수록 Task가 추가됩니다.

---

## Task 시스템

- 매일 오늘 해야 할 Task 자동 계산 (daysOfWeek 필터 포함)
- 이미 완료한 Task는 제외
- 사진 찍기: 수요일(3)·일요일(0)에만 표시
- Task 완료 기록은 당일에만 유효 (날짜 기반)
- 미완료 Task는 세션 저장 후 다음 접속 시 이어서 진행

---

## AI 연동 (`services/ai.ts`)

| 함수 | 역할 |
|---|---|
| `generateQuestion()` | 마음 건강 질문 생성 (식물 캐릭터 말투로 변형) |
| `generatePlantResponse()` | 유저 답변에 대한 식물 반응 생성 |
| `updatePlantCharacterWithCustomPot()` | 식물 사진 → 커스텀 캐릭터 이미지 생성 |

---

## 알림 시스템

- 식물별, Task별 알림 메시지 랜덤 발송
- 알림 탭 시 채팅 화면으로 바로 이동
- 테스트 알림: 개발자 메뉴에서 5초 간격으로 현재 Task 알림 전송

---

## 로컬 저장소 구조

| 키 | 저장 내용 |
|---|---|
| `@plant/plant_data` | 식물 종류, 닉네임, 입양일, 성장 단계 |
| `@plant/record_{date}` | 날짜별 일일 기록 (Task 완료, 질문/답변, 사진) |
| `@plant/chat_draft_{date}` | 미완료 채팅 세션 임시 저장 |
| `@plant/streak_count` | 연속 관리 일수 |
| `@plant/last_record_date` | 마지막 기록 날짜 |
| `@plant/generated_plant_uri` | AI 생성 캐릭터 이미지 |
| `@plant/last_streak_shown_date` | 연속 관리 화면 마지막 표시 날짜 |
| `@rootmate/growth_state` | 현재 성장 단계, 단계 진입일 |

---

## 디자인 시스템

### 주요 컬러
| 이름 | 값 | 용도 |
|---|---|---|
| `green` | `#6DC443` | 메인 강조색 |
| `lime` | `#b5ff22` | 버튼, 그라디언트 |
| `bg` | `#F2F2F2` | 전체 배경 |
| `cardBg` | `#FFFFFF` | 카드 배경 |
| `outline` | `#E0E0E0` | 테두리 |

### 폰트
- `ahn2006-B` / `ahn2006-M`: 주요 UI 텍스트
- `Paperlogy-5Medium` / `Paperlogy-4Regular`: 보조 텍스트

---

## 온보딩 흐름

1. **STEP 1** — 유저 닉네임 입력
2. **STEP 2** — 식물 선택 (바질 / 방울토마토 / 튤립)
3. **STEP 3** — 식물 닉네임 짓기
4. **COMPLETE** — 온보딩 완료, 홈으로 이동

---

## 개발 환경 설정

```bash
cd my-app
npm install
npx expo start
```

### TestFlight 빌드

```bash
npx testflight
```
