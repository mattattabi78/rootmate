# CLAUDE.md — 서비스 개요 및 개발 가이드

> VS Code에서 Claude가 이 프로젝트를 이해하고 구현하기 위한 문서입니다.
> 코드 작성 전 반드시 이 파일을 먼저 읽어주세요.

---

## 1. 서비스 개요

### 앱명
**Rootmate**

### 한 줄 정의
식물을 돌보는 척, 나도 돌보게 되는 앱

### 핵심 컨셉
식물 기록 앱의 얼굴을 하고 있지만, 실제로는 마음 건강 메시지를 자연스럽게 전달하는 앱입니다.
유저는 실제 식물을 키우며 관리 기록을 남기고, 그 과정에서 식물 캐릭터와 채팅 형태로 자연스럽게 자신의 마음을 들여다보는 질문에 답하게 됩니다.

### 타겟 유저
- 고기능 우울을 겪고 있지만 스스로 인식하지 못하는 20~30대 청년
- 마음 건강 앱에 거부감이 있어 진입 장벽이 높은 유저
- 식물에 관심 있는 유저 (식집사)

---

## 2. 기술 스택

```
프레임워크   Expo (React Native)
언어         TypeScript
라우팅       Expo Router (file-based routing)
스타일       React Native StyleSheet
로컬 저장    AsyncStorage
알림         expo-notifications
카메라       expo-camera, expo-image-picker
AI 연동      백엔드 팀원이 추후 붙임 (함수 껍데기만 구현)
```

---

## 3. 폴더 구조

```
my-app/
├── src/
│   └── app/
│       ├── _layout.tsx              # 루트 레이아웃, 탭바 설정
│       ├── index.tsx                # 홈 탭
│       ├── calendar.tsx             # 캘린더/앨범 탭
│       ├── collection.tsx         # 도감 탭 (빈 화면)
│       ├── chat.tsx                 # 채팅 화면 (홈에서 말풍선 탭 시 진입)
│       └── onboarding/
│           ├── _layout.tsx
│           ├── step1.tsx            # 닉네임 입력
│           ├── step2.tsx            # 식물 선택
│           ├── step3.tsx            # 식물 닉네임 짓기
│           └── complete.tsx         # 온보딩 완료
├── components/
│   ├── home/
│   │   ├── PlantCharacter.tsx       # 홈 중앙 식물 캐릭터 이미지
│   │   ├── MessageBubble.tsx        # 캐릭터 옆 말풍선 버튼
│   │   └── TaskCards.tsx            # 오늘의 task 카드 목록
│   ├── chat/
│   │   ├── ChatBubble.tsx           # 채팅 말풍선 (식물 / 유저)
│   │   ├── TaskCheckItem.tsx        # task 완수 확인 UI
│   │   ├── QuestionCard.tsx         # 마음건강 질문 카드
│   │   └── InputBar.tsx             # 하단 입력창
│   ├── calendar/
│   │   ├── MonthCalendar.tsx        # 월간 달력
│   │   └── AlbumView.tsx            # 주차별 사진 앨범
│   └── common/
│       ├── Button.tsx
│       └── Card.tsx
├── constants/
│   ├── colors.ts                    # 컬러 팔레트
│   ├── typography.ts                # 폰트 스타일
│   ├── plants.ts                    # 식물 종류 및 관리 정보
│   └── questions.ts                 # 마음 건강 질문 리스트
├── hooks/
│   ├── usePlant.ts                  # 식물 상태 관련 훅
│   ├── useChat.ts                   # 채팅 메시지 관련 훅
│   └── useNotification.ts           # 알림 관련 훅
├── services/
│   └── ai.ts                        # AI 연동 함수 (껍데기만, 백엔드 팀원이 채움)
├── store/
│   └── storage.ts                   # AsyncStorage 래퍼
└── assets/
    └── images/
        └── plants/                  # 식물 캐릭터 이미지
```

---

## 4. 디자인 시스템

### 컬러 팔레트

UI 이미지 기준으로 밝고 따뜻한 그린 계열이에요.

```typescript
// constants/colors.ts
export const COLORS = {
  // 배경
  bg:           '#F2F2F2',   // 전체 배경 (연한 회색)
  card:         '#FFFFFF',   // 카드/채팅창 배경

  // 메인 그린
  green:        '#6DC443',   // 메인 초록 (밝은 연두)
  greenDark:    '#4A9E2F',   // 진한 초록 (버튼 등)
  greenLight:   '#E8F7DE',   // 연한 초록 배경

  // 채팅 말풍선
  bubblePlant:  '#6DC443',   // 식물 말풍선 배경 (초록)
  bubbleUser:   '#FFFFFF',   // 유저 말풍선 배경 (흰색)
  bubblePlantText: '#FFFFFF',
  bubbleUserText:  '#2D2D2D',

  // task 카드
  taskBg:       '#6DC443',   // task 카드 배경 (초록)
  taskText:     '#FFFFFF',

  // 텍스트
  textPrimary:   '#2D2D2D',
  textSecondary: '#6B6B6B',
  textTertiary:  '#ADADAD',

  // 기타
  border:       '#E0E0E0',
  tabActive:    '#6DC443',
  tabInactive:  '#ADADAD',
  streak:       '#6DC443',   // 연속 관리 표시
};
```

### 타이포그래피

```typescript
// constants/typography.ts
export const TYPOGRAPHY = {
  headingLg: { fontSize: 22, fontWeight: '700' as const },
  headingMd: { fontSize: 18, fontWeight: '600' as const },
  headingSm: { fontSize: 15, fontWeight: '600' as const },
  bodyLg:    { fontSize: 16, fontWeight: '400' as const },
  bodyMd:    { fontSize: 14, fontWeight: '400' as const },
  bodySm:    { fontSize: 12, fontWeight: '400' as const },
  label:     { fontSize: 10, fontWeight: '500' as const },
};
```

### 간격 시스템

```typescript
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};
```

---

## 5. 탭 구조

```
하단 탭바 4개:

[홈(Home)] [캘린더(Record)] [도감] 
```

UI 이미지 기준:
- 홈: 집 아이콘
- 캘린더/앨범: 달력 아이콘
- 도감: 책/도감 아이콘 (빈 화면)

---

## 6. 화면별 상세 스펙

---

### 6.1 홈 탭 (index.tsx)

**UI 구성 (위→아래)**

```
상단 탭바:
  앱명 "Rootmate" (좌측)
  우측: 채팅 아이콘 (assets/images/chat-icon.svg) → 탭하면 chat.tsx로 이동

날짜 및 인사 텍스트:
  날짜 (예: MAY 19, 2026) + 연속 관리 일수
  "[유저닉네임]님,"
  "오늘은 물 주는 날이에요!" (오늘 task 기반 동적 문구)
  서브텍스트

식물 캐릭터 영역:
  중앙에 식물 캐릭터 이미지
  우하단: 말풍선 버튼 (assets/images/chat-bubble.svg) → 탭하면 chat.tsx로 이동

오늘의 Task 카드 목록:
  각 카드: 초록 배경, 흰 텍스트
  카드 예시:
    🌱 물 주기
       "오늘은 물을 줄게요."
    📸 기록 남기기
       "오늘의 식물을 기록해요."
  카드 탭 → chat.tsx로 이동

하단 탭바
```

**채팅 진입 경로 요약 (index.tsx)**
- 상단 우측 채팅 아이콘 탭
- 식물 캐릭터 옆 말풍선 버튼 탭
- task 카드 탭
→ 세 경로 모두 `router.push('/chat')`으로 이동

**연속 관리 표시**

홈 어딘가에 현재 연속 관리 일수 표시 (UI 이미지 참고: "2일 연속 관리 중 🌱")

---

### 6.2 채팅 화면 (chat.tsx)

**핵심 화면이에요.**

**진입 경로 3가지:**
1. 홈에서 식물 캐릭터 옆 말풍선 버튼 탭
2. 홈의 task 카드 탭
3. 홈 상단 탭바 우측 채팅 아이콘 탭 (assets/images/chat-icon.svg 사용)

**UI 구성**

```
상단 헤더:
  뒤로가기 버튼 (←)
  "Rootmate" 텍스트
  날짜 (예: 2026.05.25 (월))

채팅 영역 (ScrollView):
  식물 캐릭터 말풍선 (좌측, 초록 배경)
  유저 말풍선 (우측, 흰색 배경)

하단 입력창:
  텍스트 입력 필드
  전송 버튼 (초록 원형)
  사진 전송 버튼 (카메라/갤러리)
```

**채팅 흐름**

```
1단계: Task 확인
  식물: "오늘 물 주기 하셨나요?"
  → [완료했어요 ✅] [물 주지 못했어…] 버튼 표시

  선택 A — 완료했어요:
    식물 칭찬 메시지 → 2단계 마음건강 질문으로 바로 이어짐

  선택 B — 물 주지 못했어…:
    식물: "괜찮아요. 2시간 뒤에 다시 알림을 드릴까요?"
    → [알림 받을게요 ⏰] [괜찮아요] 버튼 표시
    → 어떤 버튼을 누르든 채팅 종료 (마음건강 질문으로 넘어가지 않음)
    ※ 마음건강 질문은 식물 task가 완료(완료했어요 선택)된 경우에만 표시됨

2단계: 마음건강 질문 (task 완료 시에만)
  식물: QUESTIONS.md 기반 질문 (AI가 캐릭터 말투로 변형)
  → 유저가 텍스트로 자유 답변
  → 건너뛰기 버튼 없음

3단계: 식물의 답변
  유저 답변에 대한 식물의 짧은 반응
  → AI가 생성 (백엔드 팀원이 연동)
```

**사진 찍기 (일주일에 2회)**

채팅창에서 진행됨.

```
식물: "이번 주 [닉네임] 모습이 궁금해요! 사진 찍어줄래요?"
→ 카메라/갤러리 버튼 활성화
→ 사진 업로드 시 채팅창에 이미지 표시
→ 업로드 완료 후 캐릭터 이미지 업데이트 함수 호출
   (실제 구현은 백엔드 팀원이 붙임 → 함수 껍데기만)
```

**AI 연동 관련**

```typescript
// services/ai.ts
// 아래 함수들은 껍데기만 구현. 백엔드 팀원이 실제 로직 채움.

// 마음건강 질문 생성 (QUESTIONS.md 기반 + 캐릭터 말투 변형)
export async function generateQuestion(
  questionBase: string,
  plantNickname: string,
  userNickname: string
): Promise<string> {
  // TODO: 백엔드 팀원이 AI 모델 연동
  return questionBase; // 임시: 원본 질문 그대로 반환
}

// 유저 답변에 대한 식물 반응 생성
export async function generatePlantResponse(
  userMessage: string,
  plantNickname: string,
  context: string
): Promise<string> {
  // TODO: 백엔드 팀원이 AI 모델 연동
  return '그렇군요. 오늘도 잘 하셨어요 🌿'; // 임시 응답
}

// 사진 기반 캐릭터 이미지 업데이트
export async function updatePlantCharacter(
  photoUri: string,
  plantId: string
): Promise<string> {
  // TODO: 백엔드 팀원이 이미지 변환 로직 연동
  return ''; // 임시: 기존 이미지 유지
}
```

---

### 6.3 캘린더/앨범 탭 (calendar.tsx)

**두 가지 뷰 전환 (탭 상단 세그먼트)**

```
[달력뷰] [앨범뷰]
```

**달력 뷰**

```
월 단위 달력
각 날짜에 표시:
  오늘 날짜 강조 (초록 원)
  기록 완료한 날 표시

날짜 탭하면 → 그날의 기록 요약 (하단 슬라이드)
```

**앨범 뷰**

```
날짜별 사진 카드가 세로로 나열됨
각 카드:
  날짜 헤더 (예: May 25, 2026)
  사진 이미지
  그날의 채팅 기록 (식물 질문 + 유저 답변) 요약
```

---

### 6.4 도감 탭 (collection.tsx)

```
빈 화면으로 구현
추후 식물 정보 콘텐츠 채울 예정

일단 중앙에 "준비 중이에요 🌱" 텍스트만 표시
```

---

### 6.5 온보딩 (onboarding/)

**STEP 1 — 닉네임 입력**

```
"당신의 이름을 알려주세요!"
텍스트 입력 필드 (하단 둥근 입력창)
```

**STEP 2 — 식물 선택**

```
"당신의 룸메이트를 선택해주세요!"
좌우 스와이프로 식물 선택
각 식물: 캐릭터 이미지 + 식물명
현재 지원: 방울토마토, 바질, 튤립
[선택하기] 버튼
```

**STEP 3 — 식물 닉네임**

```
"룸메이트의 이름을 지어주세요!"
식물 캐릭터 이미지 표시
텍스트 입력 필드
[완료하기] 버튼
```

**COMPLETE — 완료**

```
홈 화면으로 이동
AsyncStorage에 온보딩 완료 플래그 저장
```

---

## 7. 알림 시스템

**알림 종류 2가지**

```
1. 아침 알림 (시간 설정 가능, 기본 오전 9시)
   내용: "오늘 [task명] 해줄 시간이에요! 🌱"
   → 탭하면 채팅 화면으로 이동

2. 저녁 알림 (고정 오후 9시)
   내용: "오늘 task 확인했나요? [닉네임]가 기다리고 있어요"
   → 탭하면 채팅 화면으로 이동
```

**task 종류 (식물 종별로 다름)**

```typescript
// 예시: 방울토마토
const TASKS = {
  water: {
    id: 'water',
    label: '물 주기',
    description: '오늘은 물을 줄게요.',
    interval: 2,  // 며칠마다
  },
  photo: {
    id: 'photo',
    label: '사진 찍기',
    description: '이번 주 모습을 찍어줘요!',
    interval: 3,  // 주 2회 (3~4일 간격)
  },
  sunlight: {
    id: 'sunlight',
    label: '햇빛 확인',
    description: '창가에 두고 계신가요?',
    interval: 1,
  },
};
```

---

## 8. AsyncStorage 키 규칙

```typescript
// store/storage.ts
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: '@rootmate/onboarding_complete',
  USER_NICKNAME:       '@rootmate/user_nickname',
  PLANT_DATA:          '@rootmate/plant_data',
  CHAT_HISTORY:        '@rootmate/chat_history',
  STREAK_COUNT:        '@rootmate/streak_count',
  LAST_RECORD_DATE:    '@rootmate/last_record_date',
  QUESTION_INDEX:      '@rootmate/question_index',
  DEEP_Q_INDEX:        '@rootmate/deep_q_index',
};
```

**plant_data 구조**

```typescript
interface PlantData {
  id: 'basil' | 'tomato' | 'tulip';
  nickname: string;         // 유저가 지어준 식물 닉네임
  adoptedAt: string;        // ISO date string
  growthStage: 'seed' | 'sprout' | 'growing' | 'done';
  characterImageUri?: string; // AI 변환된 캐릭터 이미지 (백엔드 팀원이 채움)
}
```

**chat_history 구조**

```typescript
interface ChatMessage {
  id: string;
  sender: 'plant' | 'user';
  type: 'text' | 'image' | 'task_check';
  content: string;
  imageUri?: string;
  timestamp: string;
  date: string;             // 'YYYY-MM-DD' (캘린더 조회용)
}
```

---

## 9. 컴포넌트 작성 규칙

- 모든 색상은 `COLORS` 상수 사용, 하드코딩 금지
- 모든 간격은 `SPACING` 상수 사용
- 컴포넌트 파일명은 PascalCase
- StyleSheet는 컴포넌트 파일 하단에 위치
- props 타입은 컴포넌트 상단에 interface로 정의
- AI 연동 함수는 `services/ai.ts`에서만 호출

```typescript
// 컴포넌트 기본 구조
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

interface Props {
  title: string;
  onPress?: () => void;
}

export default function ExampleCard({ title, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.headingMd,
    color: COLORS.textPrimary,
  },
});
```

---

## 10. 구현 순서 (권장)

```
1단계  constants/ (colors, typography, spacing, plants, questions)
2단계  store/storage.ts
3단계  services/ai.ts (함수 껍데기만)
4단계  온보딩 화면 3단계
5단계  홈 탭 (PlantCharacter, MessageBubble, TaskCards)
6단계  채팅 화면 (핵심, 가장 공수 많음)
7단계  캘린더/앨범 탭
8단계  도감 탭 (빈 화면)
9단계  알림 시스템 연동
```

---

## 11. 백엔드 팀원과의 인터페이스

프론트에서 함수 껍데기를 만들어두고, 백엔드 팀원이 실제 로직을 채우는 함수들이에요.

```
services/ai.ts
  └── generateQuestion()       마음건강 질문 생성 (AI)
  └── generatePlantResponse()  유저 답변에 대한 식물 반응 (AI)
  └── updatePlantCharacter()   사진 기반 캐릭터 이미지 업데이트
```

이 함수들은 반드시 `services/ai.ts`에서만 관리하고,
컴포넌트에서 직접 AI 호출 로직을 작성하지 않아요.

---

## 12. 관련 문서

- `ONBOARDING.md` — 온보딩 각 스텝 상세 스펙
- `QUESTIONS.md` — 마음 건강 질문 전체 리스트 및 선택 로직