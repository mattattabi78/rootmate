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
├── app/                    # 화면 (Expo Router)
│   ├── _layout.tsx         # 루트 레이아웃, 탭바 설정
│   ├── index.tsx           # 홈 화면
│   ├── chat.tsx            # 식물 채팅 화면 (핵심)
│   ├── streak.tsx          # 연속 관리 완료 화면
│   ├── calendar.tsx        # 캘린더 / 앨범
│   ├── collection.tsx      # 도감
│   ├── plant-detail.tsx    # 식물 상세 정보
│   └── welcome.tsx         # 온보딩 시작
├── components/
│   └── common/
│       ├── PlantCharacter  # 식물 캐릭터 렌더링
│       ├── TopAppBar       # 공통 헤더
│       ├── BottomNavBar    # 하단 탭바
│       └── EmojiText       # 이모지 처리 텍스트
├── constants/
│   ├── plants.ts           # 식물 종류, Task 정의
│   ├── growthStages.ts     # 성장 단계 흐름
│   ├── chatMessages.ts     # 식물별 채팅 메시지
│   ├── questions.ts        # 마음 건강 질문 목록
│   ├── character.ts        # 식물 캐릭터 / 표정 에셋
│   └── colors.ts           # 컬러 팔레트
├── store/
│   └── storage.ts          # AsyncStorage 래퍼
├── services/
│   └── ai.ts               # Claude AI 연동 함수
├── hooks/
│   ├── usePlantExpression  # 상황별 표정 자동 계산
│   ├── useGrowthManager    # 성장 단계 관리
│   └── useNotification     # 알림 설정
└── utils/
    ├── date.ts             # 날짜 유틸
    ├── chatHistory.ts      # 채팅 기록 복원
    └── devOverrides.ts     # 개발용 날짜 시뮬레이션
```

---

## 화면별 기능

### 홈 화면 (`index.tsx`)

- 오늘 날짜 및 연속 관리 일수(스트릭) 표시
- 식물 캐릭터를 중앙에 표시하며, 상황에 따라 표정 자동 변화
- 오늘의 Task 카드 목록 (완료 여부에 따라 체크/취소 표시)
- 채팅 진입 경로 3가지: 상단 채팅 아이콘, 식물 옆 말풍선 버튼, Task 카드 탭
- 개발자 메뉴 (날짜 3초 길게 누르면 접근): 날짜 시뮬레이션, 성장 단계 강제 설정, 기록 리셋 등

### 채팅 화면 (`chat.tsx`) — 핵심

매일 1회 진행되는 식물과의 대화 흐름입니다.

**1단계: Task 확인**
- 오늘 해야 할 Task를 순서대로 확인
- 완료 / 미완료 선택 가능
- 물주기 Task는 "흙이 아직 촉촉해요" 옵션 추가 제공
- 미완료 선택 시 알림 설정 여부 질문 후 세션 종료

**2단계: 사진 찍기 Task (수·일요일)**
- 식물 사진 촬영 또는 갤러리에서 선택
- 선택 전 사진 가이드라인 모달 표시
- 업로드된 사진을 AI가 분석해 커스텀 식물 캐릭터 생성
- 캐릭터 생성 후 프리뷰에서 확인 및 사용 확정

**3단계: 마음 건강 질문 (모든 Task 완료 시에만)**
- AI가 생성한 오늘의 질문을 채팅 형식으로 표시
- 유저가 텍스트 또는 사진으로 자유 답변
- 답변에 대한 식물의 짧고 따뜻한 AI 반응

**4단계: 완료**
- 연속 관리 화면으로 이동 (하루 1회만 표시, 이후엔 홈으로 이동)

**기타**
- 세션 중단 시 draft 자동 저장, 재진입 시 이어서 진행
- 기존 기록이 있고 미완료 Task만 남은 경우 Task만 이어서 진행

### 연속 관리 화면 (`streak.tsx`)
- 채팅 완료 후 하루 1회만 표시
- 현재 연속 관리 일수 및 스파클 애니메이션
- 최근 7일간 관리 현황 트래커 (완료 / 미완료 / 미래)

### 캘린더 화면 (`calendar.tsx`)
- 월간 달력 뷰: 기록 완료한 날 표시
- 앨범 뷰: 날짜별 식물 사진 + 채팅 기록 요약

### 도감 화면 (`collection.tsx`)
- 식물별 상세 정보, 성장 단계별 가이드, 관리 방법 제공

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
