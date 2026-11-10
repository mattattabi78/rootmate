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

## 디자인

개정된 **Y2K 레트로 OS 스타일**입니다. 라임색 헤더, 반경 10의 카드·버튼, 얇은 회색 선, 픽셀 아이콘, 체크 월페이퍼(채팅·도감)가 특징입니다. 수치와 규칙은 [`my-app/DESIGN.md`](my-app/DESIGN.md)에 정리되어 있습니다.

| 항목 | 내용 |
|---|---|
| 폰트 | SUITE 한 종류 (Regular · Medium · Bold · Heavy 4굵기) |
| 주요 색 | 라임 `#BAFE32`(헤더·버튼), 진초록 `#14532D`·`#052E16`(제목), 활성 탭 `#7AB10B`, 선 `#7F7F7F` |
| 아이콘 | 코드로 그린 SVG 픽셀 아이콘 (Figma 아이콘 모음 기반) |
| 작은 화면 | iPhone 16(기준)보다 작은 화면(예: iPhone SE)에서는 글자는 비율만 줄이고 여백·캐릭터·헤더·탭바를 압축해 스크롤 없이 보이게 함 (기준 화면은 Figma 그대로) |

---

## 기술 스택

| 항목 | 기술 |
|---|---|
| 프레임워크 | Expo ~57 (React Native 0.86, React 19) |
| 언어 | TypeScript 6 |
| 라우팅 | Expo Router (file-based) |
| 스타일 | React Native StyleSheet |
| 로컬 저장소 | AsyncStorage |
| 알림 | expo-notifications |
| 카메라 / 갤러리 | expo-camera, expo-image-picker |
| 이미지 처리 | expo-image-manipulator |
| 아이콘 | react-native-svg (+ react-native-svg-transformer로 `.svg` 파일을 컴포넌트로 사용: 도감 실루엣) |
| 진동 | expo-haptics (연속 관리 화면 연출) |
| 애니메이션 | React Native `Animated`(네이티브 드라이버) + PanResponder (도감 카드, 연속 관리 컨페티, 캐릭터 얼굴) |
| AI 연동 | Mindlogic FactChat 게이트웨이(텍스트), Replicate(이미지) — `services/ai.ts` |
| 빌드 / 배포 | EAS (Expo Application Services) |

---

## 앱 구조

```
my-app/
├── app/                                  # Expo Router 화면
│   ├── _layout.tsx                       # 폰트 로딩, 알림 핸들러, Stack 레이아웃
│   ├── welcome.tsx                       # 환영 화면
│   ├── index.tsx                         # 홈 (+ 개발자 메뉴)
│   ├── calendar.tsx                      # Record 탭: 캘린더 / 앨범 / 날짜별 기록 카드
│   ├── collection.tsx                    # 도감 탭: 카드 덱 + 같은 화면의 상세 페이지
│   ├── chat.tsx                          # 채팅 (하루 관리 / 질문 대화 흐름)
│   ├── streak.tsx                        # 연속 관리 화면
│   └── onboarding/                       # step1~5, complete
├── components/
│   ├── common/                           # TopAppBar, BottomNavBar, Button, PlantCharacter, BlinkingFace(깜빡임·눈물·놀람),
│   │                                     # Confetti, FitToScreen, Icons, PixelIcons, ActionIconButton,
│   │                                     # Wallpaper, ProgressDots, EmojiText
│   ├── dev/DevControls.tsx               # 개발자 메뉴 전용 컨트롤
│   ├── plant/PlantDetailView.tsx         # 도감 상세 (기본 정보 / 성장 과정 / 잘 키우기)
│   └── settings/                         # SettingsModal, TimeStepper
├── constants/
│   ├── colors.ts, typography.ts          # 색 · 폰트
│   ├── character.ts                      # 식물 종류, 캐릭터 이미지, 표정
│   ├── plants.ts                         # 식물 정보, task 정의, 도감 카드 문구
│   ├── plantGuide.ts                     # 도감 상세 탭 본문 (식물별 · 탭별)
│   ├── chatMessages.ts                   # 채팅 대사, task 확인 질문·선택지
│   ├── notifications.ts                  # 홈 대사 등 식물별 문구
│   ├── expressions.ts                    # 상황별 표정 매핑
│   ├── streakMessages.ts                 # 연속 관리 하단 버튼 문구 7가지
│   ├── imageGuide.ts                     # 사진 촬영 안내 문구
│   └── questions.ts                      # 마음 건강 질문
├── hooks/                                # useGrowthManager, usePlantExpression, useNotification
├── services/
│   ├── ai.ts                             # AI 진입점
│   ├── api/                              # chat.ts, questionPool.ts, styleTransfer.ts
│   ├── config/env.ts                     # 환경 변수
│   └── types/, utils/
├── store/                                # storage.ts(AsyncStorage), growthStore.ts
├── utils/                                # chatHistory, date, devOverrides, notifications, persistImage,
│                                         # recordDate, layout(작은 화면 압축 계산), haptics(진동)
├── scripts/build_faces.py                # 화분 얼굴 이미지(face_v2) 생성 스크립트
├── assets/                               # 폰트(SUITE), 이미지
│   └── images/                           # ui/(월페이퍼·가이드), characters/(식물·얼굴·실루엣, `_`로 시작하는 폴더는 보관용), 앱 아이콘
├── DESIGN.md                             # 디자인 시스템
├── QUESTIONS.md                          # 질문 목록과 운영 방식
├── NOTICE.md                             # 개발 현황 · 인수인계 (rootmate/NOTICE.md와 동일)
├── notification.json                     # 식물별 알림 문구·주기 기획 데이터
└── app.json, eas.json, package.json …
```

---

## 화면별 기능

### 공통 UI
- **상단 헤더**: 라임 배경의 `Rootmate` 로고, 우측에 `D+N`(식물을 키운 일수) 배지와 설정(톱니바퀴) 버튼
- **하단 탭**: Home / Record / Collection / Chat
- **설정 팝업**: 내 이름 · 식물 이름 변경, 아침/저녁 알림 켜기와 시간 설정. 저장 버튼을 눌러야 반영되며, 저장하지 않고 닫으려 하면 확인 레이어가 뜸

### 환영 화면 (`welcome.tsx`)
앱 첫 진입 시 식물 캐릭터와 함께 표시되고, 터치하면 온보딩으로 이동합니다.

### 온보딩 (`onboarding/`)
1. `step1` — 유저 닉네임
2. `step2` — 식물 선택 (바질 / 방울토마토 / 메리골드) 또는 구매 코드 입력
3. `step3` — 선택한 식물 소개와 관리 정보
4. `step4` — 식물 닉네임
5. `step5` — 아침·저녁 알림 켜기/끄기와 시간 설정, 알림 권한 요청
6. `complete` — 선택한 식물 일러스트와 시작 안내 → 홈

### 홈 (`index.tsx`)
- 날짜, 식물 캐릭터(상황에 따라 표정 변화), 식물의 한 줄 대사
- 액션 아이콘 4개: 물주기 / 햇볕에 두기 / 식물 사진 찍기 / 식물 관찰. 오늘 해야 하는 task만 색이 켜지고(식물 사진 찍기는 수·토만), 누르면 채팅으로 이동
- 캐릭터 얼굴: 평소 눈이 불규칙하게 깜빡이고(홈에서만 움직임), 상황에 따라 6가지 표정으로 바뀜 (아래 "캐릭터 표정")
- 개발자 메뉴 (날짜 1.5초 길게 누르기): 박스·이모티콘 없이 글자와 섹션 구분선으로 구성. 데이터 삭제·초기화, 알림 테스트, **연속 관리 화면 열기**, **캐릭터 종류·표정·단계 전환(캐릭터 개발 모드)**, 오늘 task 완료 초기화, 날짜 시뮬레이션, 채팅 라운드 수, 대화 기억 켜기/끄기

### 채팅 (`chat.tsx`) — 핵심 플로우

하루 1회 진행되는 식물과의 대화입니다. 탭바 없이 뒤로가기 헤더를 사용합니다.

**1단계: Task 확인**
- 오늘 해야 할 task(물주기, 햇빛 확인, 사진 찍기, 관찰하기)를 순서대로 확인. 질문은 모든 식물 공통 문구(`오늘 물 줬어?`, `오늘 햇빛은 봤어?`)
- 선택지는 `당연하지!` / `아직 흙이 촉촉해.`(햇빛은 `오늘은 날씨가 흐렸어.`) / `오늘은 못할 것 같아.` / `깜빡했어 ㅜㅜ`
- `아직 흙이 촉촉해.`를 고르면 물을 준 날로 치지 않고 **다음 날 다시 질문**함 (아래 Task 시스템)
- 깜빡했다고 하면 알림 여부를 묻고(2시간 뒤 알림), 대화를 마침
- `오늘은 못할 것 같아.`(외출 등)를 고르면 그 task를 내일 task 목록에 같이 띄우도록 넘기고, 대화는 다음 task·오늘 질문으로 이어짐
- 대화가 끝나면 입력창 자리에 같은 크기의 `오늘 기록 완료!` 안내 박스(가로 전체)가 뜨고, 말풍선 간격만큼 아래에 `홈으로 돌아가기` 버튼이 표시됨 (채팅에는 하단 탭이 없음)
- 자정~04:00에 연 대화는 전날 기록이 없을 때 전날 기록으로 저장됨 (화면 날짜 표시는 시스템 시간 그대로)
- 사진 찍기는 수·토에 사진 촬영/선택 → 캐릭터 생성 → 프리뷰 확정
- 관찰하기는 3일 주기로 자유 입력 대화 (사진 찍는 날은 생략)

**2단계: 마음 건강 질문**
- 모든 task를 마치면 오늘의 질문을 식물 말투로 제시 (질문 선택 규칙은 `QUESTIONS.md`)
- 텍스트나 사진으로 답하면 식물이 따뜻하게 반응. 대화 라운드를 모두 마치면 종료

**3단계: 완료** — 하루 대화를 일기로 요약해 저장하고 연속 관리 화면으로 이동. 중간에 종료해도 draft가 저장되어 이어서 진행할 수 있음

같은 사람이 연속으로 말하면 프로필(이미지·이름)은 첫 말풍선에만 표시합니다.

### 연속 관리 (`streak.tsx`)
채팅 완료 직후 하루 1회 보이는 화면. 캐릭터, 이번 주 월~일 완료 현황, `N일 연속 관리 중!`, `{닉네임}와 함께한지 N일째`를 가운데에 두고, 하단(채팅의 홈으로 돌아가기 버튼과 같은 자리)에 `앞으로도 함께하자!` 등 7가지 문구 중 무작위 버튼을 표시합니다. 화면이 열리면 진동과 함께 화면 위쪽에서 컨페티(색종이)가 위로 터져 오른 뒤 떨어지고, 오늘 칸의 체크가 뿅 튀어올랐다가 자리를 잡습니다(`components/common/Confetti.tsx`, 기본 `Animated` 사용 · 기기의 '동작 줄이기' 설정이면 생략). `N일 연속 관리 중!` 글자는 왼쪽부터 차례로 통통 뛰어오르는 모션을 일정한 간격으로 반복합니다(`components/common/HoppingText.tsx`).

### Record 탭 (`calendar.tsx`)
- **캘린더**: 기록한 날은 라임 원, 3일 이상 연속이면 띠로 연결. 오늘은 기록 전 회색 → 기록 후 라임. 물주기를 한 날에는 물방울 뱃지
- **앨범**: 월별 사진 2열 그리드
- **날짜별 기록 카드**: 날짜 탭 시 사진(없으면 그날의 캐릭터), 요약(5줄 초과 시 스크롤바와 함께 스크롤), 완료한 task 아이콘 표시

### 도감 탭 (`collection.tsx`)
- 카드 속 캐릭터는 각 식물의 **마지막 단계 기본 이미지로 고정**되어 있음
- 식물 카드 덱을 좌우로 스와이프해 바질 → 방울토마토 → 메리골드를 순환하며 볼 수 있음. 키운 적 없는 식물 카드는 실루엣(`assets/images/characters/silhouette/`)과 이름·태그라인·소개를 모두 회색으로 보여주고 `더 알아보기`도 회색으로 보이고 누르면 "{식물}을(를) 키우기 시작해야 확인할 수 있어요" 안내가 뜸
- `더 알아보기`를 누르거나 위로 스와이프하면 같은 화면에서 상세 페이지가 아래에서 올라옴. 맨 위에서 아래로 당기거나 Collection 탭을 다시 누르면 돌아감
- 상세 탭: 기본 정보 / 성장 과정 / 잘 키우기 (본문은 `constants/plantGuide.ts`, 팀원 정리 최종 문구)

---

## 캐릭터 표정

화분 위 얼굴은 6가지입니다 (`constants/character.ts`의 `FACE_SETS`). 식물에 없는 얼굴은 `cry → tear`, 나머지는 `default`로 대체됩니다.

| 얼굴 | 모양 | 있는 식물 | 나오는 때 |
|---|---|---|---|
| `default` 기본 | 눈 깜빡임 | 전체 | 평소 |
| `smile` 웃음 | 웃는 입 | 바질 | 오늘 기록(task·질문) 완료 |
| `neutral` 무표정 | 무표정 입 | 전체 (바질은 우는 입·눈썹 + 기본 눈) | 하루 관리 없이 건너뜀(1일 초과) |
| `tear` 눈물 | 눈물 3프레임이 흐름 | 전체 | 이틀 관리 없음 |
| `cry` 더 슬픈 눈물 | 감은 눈 + 눈물 3프레임 | 메리골드 (나머지는 눈물) | 3일 이상 관리 없음 |
| `surprise` 놀람 | 3단계 프레임 | 바질 (나머지는 기본) | 채팅 열기·사진 요청 |

- 얼굴 이미지는 `scripts/build_faces.py`가 `assets/images/characters/_source/`의 원본 레이어를 식물별 위치(`dy`)·눈 크기(`eye`)로 합성해 `face_v2/`에 만듭니다 (`pip install pillow` 후 `python3 scripts/build_faces.py`). 화분(`pot_layer.png`), 식물, 얼굴은 같은 846×1254 캔버스에 정렬된 레이어입니다.
- 눈 깜빡임·눈물·놀람 애니메이션은 홈 화면에서만 재생하고, 다른 화면은 정지 프레임을 보여줍니다.
- 사진으로 만든 AI 캐릭터에는 500×500 오버레이(`*_overlay_*`)로 같은 얼굴을 얹습니다.

---

## 식물 종류

### 바질 🌿
- 말투: 담백하고 무례하지 않은 반말

### 방울토마토 🍅
- 말투: 귀엽고 발랄한 동생 같은 반말

### 메리골드 🌼
- 말투: 담백하고 솔직한 반말
- 노란색·주황색 꽃이 피는 식물 (이전의 튤립을 대체)

> 현재 모든 식물의 활성 task는 물주기 / 햇빛 확인 / 관찰하기 / 사진 찍기입니다.

---

## 성장 단계

앱은 식물의 성장 단계를 관리하지 않습니다(성장 확인 질문·자동 진행 없음). 실제 화면의 기본 캐릭터는 1단계 이미지로 고정이고, 단계별 이미지는 개발자 메뉴의 캐릭터 개발 모드(UI 확인용)와 도감 카드에서만 씁니다.

---

## Task 시스템

| task | 주기 | 비고 |
|---|---|---|
| 물주기 | 계절에 따라 가변 | 흙 상태 기준, `촉촉해`를 고르면 다음 날 재확인 |
| 햇빛 확인 | 매일 | 관찰하는 날에는 생략, 사진 찍는 날에는 유지 |
| 관찰하기 | 3일 | 오늘이 물주기 날이 아니고 햇빛 확인 날일 때만. 사진 찍는 날은 생략 |
| 사진 찍기 | 수·토 | 사진으로 캐릭터를 갱신하므로 주 2회 |

### 물주기 주기 (`constants/watering.ts`)

식물 가이드의 공통 결론은 "날짜가 아니라 흙 상태를 보고 준다"입니다. 그래서 고정 주기 대신 아래 규칙을 씁니다.

- **계절표**: 월로 계절을 정해(봄 3~5, 여름 6~8, 가을 9~11, 겨울 12~2) 식물별 주기를 선택

| 식물 | 봄 | 여름 | 가을 | 겨울 |
|---|---|---|---|---|
| 바질 | 2일 | 1일 | 2일 | 3일 |
| 방울토마토 | 3일 | 2일 | 3일 | 5일 |
| 메리골드 | 2일 | 1일 | 3일 | 4일 |

- **촉촉해 → 재확인**: `아직 흙이 촉촉해.`는 `water_moist`로 기록되고, 그 다음 날 물주기 질문이 다시 나옴. 물을 준 날로 치지 않으므로 캘린더 물방울 뱃지와 날짜별 기록 카드의 물주기 아이콘이 켜지지 않음
- **물을 준 날 + 오늘 계절의 주기**가 지나면 다시 물주기 날. 계절이 바뀌면 새 계절 주기가 바로 적용됨
- 일부 칸(바질 가을·겨울, 메리골드 여름·겨울)은 자료에 없어 추정한 값입니다. 사용자별 학습(촉촉해를 연달아 고르면 주기를 늘리는 방식)은 미래 계획입니다.

### 공통 규칙
- 매일 오늘 해야 할 task 자동 계산 (주기, 요일, 이미 완료한 것 제외)
- task 완료 기록은 당일에만 유효 (날짜 기반)
- 미완료 task는 세션 저장 후 다음 접속 시 이어서 진행

---

## AI 연동 (`services/ai.ts`)

| 함수 | 역할 |
|---|---|
| `generateQuestion()` | 오늘의 질문을 식물 캐릭터 말투로 변형 |
| `generatePlantResponse()` | 유저 답변에 대한 식물의 반응 생성 |
| `summarizePlantConversation()` | 하루 대화를 일기로 요약 |
| `updatePlantCharacterWithCustomPot()` | 식물 사진 → 캐릭터 이미지 생성 |

- 키는 `my-app/.env`에 둡니다 (`EXPO_PUBLIC_OPENAI_API_KEY`, `EXPO_PUBLIC_REPLICATE_API_KEY`, 선택: `EXPO_PUBLIC_DEFAULT_MODEL`). 이 파일은 git에 올라가지 않습니다.
- 키가 없거나 호출에 실패하면 미리 만든 기본 문구로 대체됩니다.
- 캐릭터 이미지: 홈, 연속 관리, 채팅 아바타는 AI 캐릭터가 있으면 그것을, 없으면 1단계 기본 캐릭터를 보여 줍니다. 캐릭터 생성이 실패하거나 식물을 인식하지 못하면 사진을 다시 찍도록 안내하고(`다시 찍기` / `다음에 찍기`), 기존 캐릭터를 유지합니다.
- 사진 촬영 → 캐릭터 생성은 수·토 task로 진입합니다. 이미지 변환에는 Replicate 키가 필요합니다. 자세한 내용은 `NOTICE.md`를 참고하세요.

---

## 알림 시스템

| 종류 | 시간 | 설명 |
|---|---|---|
| 아침 알림 | 유저 설정 (기본 오전 9시) | 매일 반복. 식물 말투의 인사 |
| 저녁 알림 | 유저 설정 (기본 오후 9시) | 오늘 관리 전일 때만. 완료하면 취소 |
| 다시 알림 | 2시간 뒤 | 채팅에서 못 했다고 하고 알림을 선택했을 때 |

- 시간과 켜기/끄기는 온보딩과 설정 팝업에서 바꾸며, 바꾸면 예약이 바로 갱신됩니다.
- 알림을 누르면 앱이 열립니다.
- 개발자 메뉴의 `실제 알림 테스트`로 현재 task 알림을 5초 간격으로 확인할 수 있습니다.
- 식물별·task별 주기 알림은 아직 연결되지 않았습니다 (`notification.json`에 기획 데이터만 있음).

---

## 로컬 저장소 구조

| 키 | 저장 내용 |
|---|---|
| `@plant/plant_data` | 식물 종류, 닉네임, 입양일 |
| `@plant/user_nickname` | 유저 닉네임 |
| `@plant/record_{date}` | 날짜별 일일 기록 (task 완료, 질문/답변, 사진, 요약) |
| `@plant/chat_draft_{date}` | 미완료 채팅 세션 임시 저장 |
| `@plant/streak_count`, `@plant/last_record_date` | 연속 관리 일수, 마지막 기록 날짜 |
| `@plant/generated_plant_uri`, `@plant/generated_face_pos` | AI 생성 캐릭터 이미지와 표정 위치 |
| `@plant/generated_plant_history` | 사진 캐릭터를 만든 날짜별 기록 (Record 기록 카드에서 그날의 캐릭터를 보여줌) |
| `@plant/last_streak_shown_date` | 연속 관리 화면 마지막 표시 날짜 |
| `@plant/grown_plants` | 키운 적 있는 식물 목록 (도감에서 안 키운 식물은 실루엣으로 표시) |
| `@plant/notification_times` | 아침·저녁 알림 시간과 켜기/끄기 |
| `@rootmate/growth_state` | task 완료 기록 |
| `@rootmate/memory_enabled`, `@rootmate/memory_summary_{date}` | 대화 기억 켜기/끄기와 대화 요약 |

---

## 문서

| 문서 | 내용 |
|---|---|
| [`my-app/DESIGN.md`](my-app/DESIGN.md) | 디자인 시스템 (색, 폰트, 컴포넌트 수치, 화면별 레이아웃) |
| [`my-app/QUESTIONS.md`](my-app/QUESTIONS.md) | 마음 건강 질문 목록과 운영 방식 |
| [`NOTICE.md`](NOTICE.md) | 개발 현황, 데이터 모델, 남은 작업 (인수인계) |
| [`my-app/Onboarding.md`](my-app/Onboarding.md) | 온보딩 기획 문서 (초기 기획 기준) |

---

## 개발 환경 설정

```bash
cd my-app
npm install
npx expo start
```

- iOS: `i` 또는 `npm run ios`, Android: `a` 또는 `npm run android`
- 카메라, 알림 등 일부 기능은 물리 기기에서만 정상 동작합니다.
- 웹(`npx expo start --web`)에서는 일부 동작이 다릅니다 (`Alert.alert` 미동작, 네이티브 애니메이션 경고, 알림 미지원).

### TestFlight 빌드

```bash
npx testflight
```
