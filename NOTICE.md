# NOTICE — Rootmate 개발 현황 및 인수인계 문서

> 최초 작성일: 2026-05-31 / 최종 업데이트: 2026-11-23
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
    │   ├── index.tsx                # 홈 탭
    │   ├── calendar.tsx             # Record 탭 (캘린더 / 앨범)
    │   ├── collection.tsx           # 도감 탭 (카드 덱 + 같은 화면의 상세 페이지)
    │   ├── chat.tsx                 # 채팅 (핵심 흐름, 탭바 없음)
    │   ├── streak.tsx               # 연속 관리 화면
    │   └── onboarding/              # 온보딩 step1~5, complete
    ├── components/
    │   ├── common/                  # TopAppBar, BottomNavBar, Button, PlantCharacter, BlinkingFace,
    │   │                            # Confetti, FitToScreen, Icons / PixelIcons / ActionIconButton, Wallpaper …
    │   ├── dev/DevControls          # 개발자 메뉴 컨트롤
    │   ├── plant/PlantDetailView    # 도감 상세 (기본 정보 / 성장 과정 / 잘 키우기)
    │   └── settings/                # 설정 팝업(SettingsModal), 알림 시간 선택(TimeStepper)
    ├── constants/                   # 컬러(토큰)·폰트·글자 크기 7단계(typography), 버튼·입력창 크기(controls), 식물, 질문, 표정, 알림·채팅 문구, 도감 텍스트
    ├── hooks/                       # useGrowthManager, usePlantExpression, usePlantInteraction(캐릭터 터치 반응), useNotification
    ├── services/
    │   ├── ai.ts                    # ★ AI 연동 진입점 (프론트가 호출하는 함수)
    │   ├── api/                     # chat.ts(LLM), questionPool.ts(질문 선택), styleTransfer.ts(이미지)
    │   └── config/env.ts            # API 키·모델 환경변수
    ├── store/                       # storage.ts(AsyncStorage 래퍼), growthStore.ts
    ├── utils/                       # 날짜, 채팅 복원, 알림 예약, 개발자 날짜 시뮬레이션, 작은 화면 압축(layout), 진동(haptics), 네트워크 확인(network)
    ├── scripts/                     # build_faces.py: 화분 얼굴 이미지(face_v2/{식물}/layers·overlays, fx) 생성
    │                                # pixelate_plants.py: 식물 단계 이미지를 10단위 칸 그림으로 변환
    ├── assets/                      # SUITE 폰트(Regular·Medium·Bold·Heavy), images/ui(월페이퍼·가이드), images/characters
    │                                #   (식물 단계, face_v2, pot, `_source`·`_reference`는 보관용)
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
| 진동 | expo-haptics (연속 관리 연출, 캐릭터 터치 반응) |
| 애니메이션 | React Native Animated + PanResponder (도감 카드·상세 전환, 컨페티, 캐릭터 얼굴 깜빡임·눈물) |
| 스타일 | React Native StyleSheet. 폰트는 SUITE 한 종류(Regular · Medium · Bold · Heavy) |
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
| `step5.tsx` | 아침·저녁 알림 켜기/끄기 스위치 + 시간 설정(30분 단위), 알림 권한 요청 (둘 다 끄면 권한 요청 생략) |
| `complete.tsx` | 선택한 식물 일러스트와 시작 안내 → 홈 이동 |

저장 키: `@plant/onboarding_complete`, `@plant/user_nickname`, `@plant/plant_data`, `@plant/notification_times`.
온보딩에는 별도 Figma 시안이 없어 공통 컴포넌트와 새 팔레트·폰트로 구성했고, 모든 단계가 가운데 정렬입니다. 앱을 처음 켜면 환영 화면 없이 바로 `step1`로 이동합니다(`welcome.tsx`는 삭제). `step2`의 식물 카드는 박스 없이 캐릭터와 이름만 보이고, `step3`의 관리 정보는 앱 전용 아이콘 + 한 줄 문장 목록(묶음은 가운데, 문장은 왼쪽 정렬, 버튼 위에 흰 그라데이션)입니다. 입력창은 높이 52·글자 20으로 앱의 다른 입력창(48)보다 크게 둡니다.

### 4.3 홈 (`index.tsx`)

캐릭터 터치 반응(`hooks/usePlantInteraction.ts`): 화분·식물 전체가 터치 영역이며 하루 횟수 제한은 없습니다. **밤 12시~새벽 6시에는 자는 얼굴**(감은 눈 ∪∪)로 바뀌고 Z(작은 z → 둘 → 큰 Z 둘 → 빈 화면)가 계속 올라오며, 이때도 터치 반응은 그대로 되고 끝나면 다시 자는 모습으로 돌아감(다른 상황보다 우선, 일별 기록에는 저장 안 함). 톡 = 윙크 + 하트 / 연타 3~4번 = 놀람(바질, 다른 식물은 깜짝 깜빡임) / 5번 이상 = 웃는 눈 + 음표 / 좌우 문지르기 = 웃는 눈 + 음표 / 길게 누르기 = 웃는 눈 → 손 떼면 윙크 + 하트 / 우는 중(눈물·오열)에는 탭하면 무표정으로 5초간 있다가 다시 우는 모습으로 돌아가고 하트·음표 효과는 없음. 터치 영역은 캐릭터만이고 나머지 빈 곳은 "빈 화면". 한 줄 대사는 화면에 들어올 때 한 번만 정해져 반응으로 바뀌지 않음. 진동과 쿨다운 포함. 빈 화면을 두 번 탭하면 오늘 물주기를 끝낸 경우에만 물방울 효과(task 기록과 무관). 대사 변경은 보류.

- 날짜, 식물 캐릭터(230×340, AI 캐릭터가 있으면 그것을, 없으면 **1단계 기본 캐릭터**), 식물의 한 줄 대사, 액션 아이콘 4개(물주기 / 햇볕에 두기 / 식물 사진 찍기 / 식물 관찰)
- 아이콘은 오늘 해야 하는 task만 색이 켜지고(식물 사진 찍기는 사진 찍는 날인 수·토만), 누르면 채팅으로 이동
- 캐릭터 얼굴은 눈이 불규칙하게 깜빡이고(홈에서만 움직임) 상황에 따라 표정이 바뀜 (9종, §4.8)
- 작은 화면(iPhone SE 등): 기준은 iPhone 16(Figma 그대로). 그보다 짧은 화면에서만 날짜·캐릭터·대사·버튼 간격과 헤더·탭바 높이를 압축하고 글자는 `fs()`로 같은 비율만 줄임 (`utils/layout.ts`, `constants/typography.ts`)
- 개발자 메뉴: 날짜를 1.5초 길게 누르면 열림. 박스·이모티콘 없이 글자와 섹션 구분선으로 구성 (`components/dev/DevControls.tsx`). 데이터 삭제·초기화, 알림 테스트, **연속 관리 화면 열기**, **캐릭터 종류·표정·단계 전환**, 오늘 task 완료 초기화, 날짜 시뮬레이션, 채팅 라운드 수, **대화 기억 켜기/끄기**

### 4.4 채팅 (`chat.tsx`)

흐름은 아래 순서입니다. 탭바 없이 뒤로가기 헤더를 씁니다. 대화창에 들어올 때 인터넷 연결을 확인하고(`utils/network.ts`), 연결이 안 된 경우에만 대화창을 배경으로 "네트워크 연결을 확인해주세요" 경고 팝업(`홈으로` / `다시 확인` 버튼)을 띄웁니다. task 완료 기록(`store/growthStore.ts`)은 여러 항목을 한꺼번에 체크해도 서로 덮어쓰지 않도록 한 번에 하나씩 순서대로 저장합니다.

```
체크리스트                   → 첫 인사 뒤 식물이 "오늘 한 일을 체크해줘"라고 말하고 채팅 아래에 체크박스(물주기 / 햇빛 확인하기 / 관찰하기) + `오늘은 못했어`(항상 활성) + `보내기`(하나라도 체크해야 활성: 회색 → 라임 초록) 버튼 표시
                               체크한 항목 = task 완료 기록. 식물 반응은 전부 / 일부 / 거의 못 했을 때 3종 × 문구 3개 (식물별 말투, `checklistResult(kind, uncheckedLabels)`)
                               일부·거의 못 했을 때는 체크하지 않은 task 이름을 문장에 넣어 "오늘도 날 돌봐줘서 고마워. {안 한 task}는/은 어떻게 할지 말해줄래?" 식으로 이어지며, 은/는은 자동으로 붙음 (`chatMessages.ts`의 `topic()`)
                               체크하지 않은 항목은 한 화면에서 항목마다 칩 선택 후 `확인`:
                               아직 흙이 촉촉해.(날씨가 흐렸어.) → 물 준 날로 치지 않고 다음 날 다시 확인 (§5.5) /
                               조금 이따가 할게. → 2시간 뒤 알림 예약(식물 답변에 알림 시각 표시, `formatClock`; 식물이 말한 뒤 알림 권한을 확인해, 아직 안 물어본 상태면 허용 요청 창을 띄우고 이미 거부한 상태면 설정 이동을 안내(`ensureNotificationPermission`)) / 내일로 미룰게. → 그 task를 **내일 task 목록에 같이 띄우도록 넘김**(`@plant/deferred_tasks`)
사진 찍기 (수·토)            → 체크리스트 뒤 별도 단계: 사진 촬영/갤러리 선택 → 캐릭터 생성 → 프리뷰에서 확정 (AI 키 필요)
                               '나중에 찍을게' → "2시간 뒤에 알려줘 / 내일로 미룰게" 선택 (알림 예약 또는 `@plant/deferred_tasks`)
마음 건강 질문               → 모든 task를 마치면 AI가 식물 말투로 질문, 유저가 답하면 식물이 반응
                               (라운드 수는 개발자 메뉴에서 조정)
완료                         → 일기 요약 저장, 연속 관리 갱신. 입력창 자리에 같은 크기의 `오늘 기록 완료!` 박스(가로 전체)가 뜨고 말풍선 간격만큼 아래에 `홈으로 돌아가기` 버튼 표시 (채팅에는 하단 탭 없음)
```

- **새벽 기록 소급**: 자정~04:00에 연 대화는 전날 기록이 없을 때 전날 기록으로 저장됨 (기록·사진·연속 관리·임시 저장 기준 날짜가 전날). 전날 기록이 이미 있으면 오늘 기록. 화면의 날짜 표시는 시스템 시간 그대로 (`utils/recordDate.ts`)

- 같은 사람이 연속으로 말하면 프로필(이미지·이름)은 첫 말풍선에만 표시
- **입력창**: 한 줄 높이 48, 글이 줄을 넘으면 자동으로 줄바꿈되며 최대 4줄까지 커지고(`+` 버튼 제거 후 입력창 + 보내기 버튼만 있음), 엔터는 줄바꿈이 아니라 전송. 입력창 높이는 보이지 않는 복사본 글자로 줄 수를 재서 정함. 글자는 말풍선 본문과 같은 15 Medium
- **사진 답변 제거**: 이전의 `+` 버튼(카메라/갤러리로 사진을 답변으로 보내기)과 `카메라/갤러리` 선택 바, "[사진으로 답변했어요]" 처리를 없앴습니다(AI가 사진 내용을 읽지 못해서). 식물 캐릭터용 사진 촬영은 체크리스트의 `사진 찍기` 단계에서 그대로 합니다. 이전 기록에 남은 사진 답변은 복원 시 그대로 보임
- 내가 보낸 말풍선은 오른쪽 정렬이고 가장 길어져도 왼쪽 시작점은 식물 말풍선과 같음(아바타 40 + 간격 13). 식물 이름은 Bold 16
- 버튼·팝업 버튼·선택지는 높이 54·글자 16(`constants/controls.ts`)
- 중간에 나가면 draft가 `@plant/chat_draft_{date}`에 저장되어 이어서 진행

### 4.5 Record 탭 (`calendar.tsx`)

- **캘린더**: 월 이동, 기록한 날 라임 원, 3일 이상 연속이면 띠로 연결, 오늘은 기록 전 회색 → 기록 후 라임, 물주기를 한 날은 물방울 뱃지(오늘 물을 주면 즉시 표시)
- **앨범**: 월별 사진 2열 그리드
- 날짜 탭 시 **날짜별 기록 카드**(폭 최대 362 · 높이 480): 날짜, 사진(없으면 **그날 보이던 캐릭터**: 그날까지 만든 사진 캐릭터가 있으면 그것, 없으면 1단계 기본 캐릭터. 표정·식물 종류는 그날 마지막으로 저장된 것 `@plant/day_look_{date}`), 요약, 완료한 task 아이콘

### 4.6 도감 탭 (`collection.tsx`)

- 카드 앞면 속 캐릭터: **키운 적 없는 식물은 씨앗 단계(1단계), 키운 적 있는 식물은 마지막 단계 기본 이미지, 지금 키우는 식물은 홈 화면과 같은 현재 모습**(사진 캐릭터가 있으면 그것 + 오늘의 표정). 표정은 도감 탭에 들어올 때마다 다시 계산하고, 성장 단계는 없으므로 자라난 모습으로는 바뀌지 않음. 캐릭터는 화분 높이가 카드마다 같도록 식물 3종 이미지의 합친 영역 중심 기준으로 아치 창 가운데에 놓음
- 카드 디자인: 크기는 원래 디자인(240×360)의 0.85배(204×306), 흰색 단색 바탕, 드롭 섀도 없음, 테두리 1.5 `#7f7f7f`·반경 20. 색은 식물마다 앱에서 쓰던 색(바질 `#7AB10B`, 토마토 `#D93025`, 메리골드 `#FF8E47`)의 불투명도만 바꿔 씀(뒷면 본문 상자 15%, 포인트 글자는 RGB×0.8). 식물 이름과 뒷면 설명·부제는 서비스 기본 글자색 `#052e16`, `No.`·점선 구분선·재배 기간 이하·자물쇠는 포인트 컬러. 뒷면은 가장자리가 볼록한 본문 상자에 설명(왼쪽 정렬, 자동 줄바꿈) → 점선 → 재배 기간·키우기 시작한 날. 상세 수치는 `DESIGN.md`
- 식물 카드 덱: 좌우 스와이프로 바질 → 방울토마토 → 메리골드를 **무한 순환**. **카드를 탭하면 앞면(아치 창 속 캐릭터 + 이름 글자)과 뒷면(이름·태그라인·볼록한 본문 상자의 설명·재배 기간(주 단위)·키우기 시작한 날)이 뒤집히고**, **키운 적 없는 식물 카드는 씨앗 단계 캐릭터와 자물쇠(카드 색은 키운 식물과 같음)**를 두며, `더 알아보기`도 회색으로 보이고 누르면 "{식물}을(를) 키우기 시작해야 확인할 수 있어요" 안내가 뜸 (상세로 이동 불가, `@plant/grown_plants`)
- `더 알아보기`를 누르거나 위로 스와이프하면 **같은 화면 안에서** 상세 페이지가 아래에서 올라옴. 맨 위에서 아래로 당기거나 Collection 탭을 다시 누르면 돌아감
- 상세 탭 3개: 기본 정보 / 성장 과정 / 잘 키우기. 본문은 `constants/plantGuide.ts`에 식물별·탭별로 모여 있음(카드의 `extra` 필드는 본문 아래 점선·`선택` 라벨·소제목으로 구분해 보이는 선택 내용, 바질 2단계 키친타월 발아법) (세 식물 모두 팀원이 정리한 최종 문구가 반영됨. `성장 과정` 카드 수는 바질 5 / 토마토 7 / 메리골드 5로, 앱의 캐릭터 이미지 단계와는 별개의 안내용 단계. `잘 키우기`가 비면 task 안내가 대신 표시됨)

### 4.7 연속 관리 (`streak.tsx`)

캐릭터, 이번 주(월~일) 완료 현황, `N일 연속 관리 중!`, `{닉네임}와 함께한지 N일째`(입양일이 1일째)를 위에서 아래로 쌓아 가운데에 두고, 하단에는 채팅의 `홈으로 돌아가기` 버튼과 같은 자리에 CTA 버튼을 둡니다. 버튼 문구는 7가지(`constants/streakMessages.ts`) 중 무작위입니다. 채팅 완료 직후 하루 1회 노출됩니다. 화면 배치가 끝나면 바로 화면 위쪽 가운데에서 노랑·분홍·하늘색 컨페티가 한 번 위로 터져 오른 뒤 중력으로 떨어지고, 같은 때 오늘 칸의 체크가 뿅 튀어올랐다가 자리잡습니다(`components/common/Confetti.tsx`, 기본 `Animated` 사용 · 기기의 '동작 줄이기' 설정이면 생략). 진동(`utils/haptics.ts`, `expo-haptics`)은 진입 · 컨페티 · 체크 착지에 줍니다. `N일 연속 관리 중!` 글자는 왼쪽부터 차례로 통통 뛰어오르는 모션을 약 2.6초 간격으로 반복합니다(`components/common/HoppingText.tsx`, 동작 줄이기면 정지).

### 4.8 캐릭터 표정 (`constants/character.ts`, `constants/expressions.ts`, `scripts/build_faces.py`)

표정(`Expression`)은 화분 얼굴 종류와 같은 9가지입니다. 식물에 없는 얼굴은 `cry → tear`, 나머지는 `default`로 대체됩니다.

| 얼굴 | 있는 식물 | 나오는 때 |
|---|---|---|
| `default` 기본 (눈 깜빡임) | 전체 | 평소 |
| `smile` 웃음 | 바질 | 오늘 기록 완료 |
| `neutral` 무표정 | 전체 (바질은 우는 입·눈썹 + 기본 눈으로 합성) | 하루 관리 없이 건너뜀 (1일 초과) |
| `tear` 눈물 (3프레임) | 전체 | 이틀 관리 없음 |
| `cry` 더 슬픈 눈물 (감은 눈 + 3프레임) | 메리골드 | 3일 이상 관리 없음 (나머지 식물은 `tear`) |
| `surprise` 놀람 (3프레임) | 바질 | 채팅 열기·사진 요청 |
| `wink` 윙크 (+ 하트 3프레임) | 전체 | 캐릭터를 톡 쳤을 때 (터치 반응) |
| `happy` 웃는 눈 ^^ (+ 음표 3프레임) | 전체 | 5번 이상 연타·문지르기·길게 누르기 (터치 반응) |
| `sleep` 자는 얼굴 (감은 눈 ∪∪, + Z 3프레임) | 전체 | **밤 12시~새벽 6시** (다른 상황보다 우선). 터치 반응은 그대로 되고 끝나면 다시 자는 모습. 일별 기록(`day_look`)에는 저장 안 함 |

효과 이미지(하트·음표·물방울·Z)는 `face_v2/fx/`에 846×1254 캔버스 정렬 레이어로 있고, 물방울과 Z는 식물 공통입니다. Z는 앱의 검정에 가까운 `#191c1b`로 10단위 칸에 그렸습니다.

- 이미지: 화분(`pot_layer.png`)·식물·얼굴은 846×1254 캔버스에 정렬된 레이어. 바질·토마토의 1~8단계 이미지는 고해상도 원본(`_source/{식물}/성장단계_원본/`)을 `scripts/pixelate_plants.py`로 화분·얼굴과 같은 10단위 칸 그림으로 바꾼 것(메리골드 6단계는 사람이 직접 그렸고 1~3단계는 그 11색 팔레트로 변환, 4·5단계 꽃은 6단계 꽃에서 17×16칸·11×10칸으로 다시 줄여 만듦). 얼굴은 원본 레이어(`characters/_source/{바질,토마토,메리골드}/{표정 폴더}`)를 `scripts/build_faces.py`(Pillow)로 식물별 위치·눈 크기를 맞춰 `face_v2/`에 생성. 사진 캐릭터용 500×500 오버레이(`*_overlay_*`)도 함께 생성.
- 애니메이션(깜빡임·눈물·놀람)은 홈에서만 재생하고 다른 화면은 정지 프레임.
- 상황 → 표정 매핑은 `constants/expressions.ts`의 `SITUATION_MAP`(`sleeping` 상황 포함). 채팅 중 일시 표정은 놀람과 기본 복귀뿐.

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
  answerImageUri?: string;      // 이전 버전의 사진 답변(지금은 만들지 않음, 복원용으로만 읽음)
  skippedQuestion: boolean;
  plantPhotoUri?: string;       // 오늘 찍은 식물 사진
  aiReply?: string;             // AI가 만든 식물 반응
  conversationSummary?: string; // 오늘 대화 요약(일기)
}
```

### 5.3 성장 단계 (제거됨)

앱은 식물의 성장 단계를 따로 관리하지 않습니다. 단계 확인 질문("싹이 올라왔어?" 등), 자동 진행, `constants/growthStages.ts`는 삭제했고, 단계별 task와 물주기 보정도 없습니다. 모든 식물의 task는 물주기 / 햇빛 확인 / 관찰하기 / 사진 찍기로 항상 같습니다.

- 실제 화면의 기본 캐릭터는 1단계 이미지로 고정됩니다. 단계 이미지(`characters/{basil,tomato,marigold}/…_N.png`)는 **개발자 메뉴의 캐릭터 개발 모드**에서 식물이 자랐을 때 UI가 어색하지 않은지 확인하는 용도와, 도감 카드(마지막 단계 이미지)에 씁니다. 단계 수와 이미지 연결은 `constants/character.ts`의 `IMAGE_STAGE_MAP`·`getMaxStage`.
- `store/growthStore.ts`·`hooks/useGrowthManager.ts`에는 **오늘 task 완료 기록**만 남았습니다. 이전 버전이 저장해 둔 단계 값(`currentStage`, `stageHistory` 등)은 읽지 않고 그대로 둡니다.
- 채팅 임시 저장(draft)에 예전 단계(`stage_confirm`, `task_check`, `water_reminder`, `observing`, `reminder_done`)가 남아 있으면 체크리스트 단계로 이어집니다.

### 5.4 마음 건강 질문

전체 목록과 선택 규칙은 `my-app/QUESTIONS.md`를 참고하세요 (`constants/questions.ts`와 동기화). 요약: KST 기준으로 새해·연말·월초·월말 고정 질문 → 일요일은 심화 질문(29개) → 토요일은 주말 질문(5개) → 평일은 기본 질문(월별 고정 셔플). 오랜만에 복귀한 경우는 복귀 질문 4개.

### 5.5 Task 주기와 물주기 보정 메커니즘

현재 활성 task는 모든 식물이 **물주기 / 햇빛 확인 / 관찰하기 / 사진 찍기** 4개입니다. 오늘의 task 계산은 채팅(`chat.tsx`의 `buildTodayTasks`)과 홈(`hooks/useGrowthManager.ts`의 `computeTodayTasks`)이 같은 규칙으로 합니다.

| task | 주기 | 비고 |
|---|---|---|
| 물주기 | **계절에 따라 가변** (아래) | 흙 상태 기준. `촉촉해`를 고르면 다음 날 재확인 |
| 햇빛 확인 | 매일 | **관찰하는 날에는 생략**, 사진 찍는 날에는 유지 |
| 관찰하기 | 3일 | 오늘 물주기 날이 아니고 햇빛 확인 날일 때만. **사진 찍는 날(수·토)에는 생략** |
| 사진 찍기 | **수·토** (`PHOTO_DAYS = [3, 6]`) | 사진으로 캐릭터를 갱신하므로 주 2회. 못 해도 다음 날 보충하지 않음 |

**물주기 보정** (`constants/watering.ts`)

- 근거: 바질·토마토·메리골드 가이드 모두 "날짜가 아니라 손가락 한 마디 깊이로 흙을 찔러 말랐을 때 준다"가 결론이고, 주기는 계절과 환경에 따라 달라짐.
- 오늘의 주기 = **계절표**. 계절은 오늘 날짜의 월로 정함 (봄 3~5, 여름 6~8, 가을 9~11, 겨울 12~2).

| 식물 | 봄 | 여름 | 가을 | 겨울 |
|---|---|---|---|---|
| 바질 | 2일 | 1일 | 2일 | 3일 |
| 방울토마토 | 3일 | 2일 | 3일 | 5일 |
| 메리골드 | 2일 | 1일 | 3일 | 4일 |

  표의 일부 칸(바질 가을·겨울, 메리골드 여름·겨울)은 자료에 없어 **추정한 값**이므로 확인이 필요합니다. 값은 `WATER_INTERVALS` 한 곳에서 수정합니다.
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
@plant/grown_plants              string[]             — 키운 적 있는 식물 id (도감 컬러 표시용)
@plant/grown_since               {식물id: ISO}        — 식물별 처음 키우기 시작한 날 (도감 카드 뒷면 표시, 기록 없는 현재 식물은 입양일로 대체)
@plant/deferred_tasks            {날짜: taskId[]}     — 체크리스트 후속 선택 '내일로 미룰게'(사진도 같은 문구)로 다음 날로 넘긴 task
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
@plant/day_look_{date}            {plantType, expression} — 그날 마지막으로 보인 식물·기본 표정 (오늘 날짜로만 갱신, Record 팝업용)
@plant/generated_plant_history   [{date, uri, facePos}] — 사진 캐릭터를 만든 날짜별 기록 (Record 팝업에서 그날의 캐릭터를 보여주는 용도)
@plant/last_streak_shown_date    string
@plant/notification_times        JSON                 — 아침·저녁 시간(분)과 켜기/끄기
@plant/notification_signature    string               — 예약 알림 재등록 판단용
@rootmate/growth_state           JSON                 — task 완료 기록
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
| `summarizePlantConversation()` | 하루 대화를 1~3문장(100자 이내) 일기로 요약 |
| `updatePlantCharacterWithCustomPot()` | 식물 사진 → 픽셀 캐릭터 생성 (Replicate) |
| `analyzeGeneratedImageForFace()` | 생성된 이미지에서 화분 위치를 찾아 표정을 올릴 좌표 계산 |

식물별 말투는 `services/api/chat.ts`의 `PLANT_PERSONAS`(바질: 담백한 반말, 방울토마토: 귀여운 동생, 메리골드: 따뜻한 가족이자 조력자의 다정한 반말)에 정의되어 있습니다.

### 7.3 알려진 한계

- **캐릭터 이미지 규칙**: 홈, 연속 관리, 채팅 아바타는 저장된 AI 캐릭터(`@plant/generated_plant_uri`)가 있으면 그것을, 없거나 이미지가 로드되지 않으면 **1단계 기본 캐릭터**를 보여 줍니다. 단계별 기본 캐릭터는 AI 캐릭터 업데이트가 실패했을 때의 대체 이미지 역할입니다.
- **캐릭터 생성 실패 처리**: 변환 호출이 실패하거나 식물을 인식하지 못하면 `사진을 다시 찍어주세요` 팝업(`다시 찍기` → 가이드 시트, `다음에 찍기` → 기존 캐릭터 유지하고 넘어감)을 띄웁니다. 이때 사진 task는 완료로 기록되지 않습니다.
- 사진 촬영 → 캐릭터 생성 흐름은 **수·토 task로 진입**합니다 (§5.5). 단, 이미지 변환은 Replicate 키가 있어야 동작하며, 실제 기기에서 사진 → 캐릭터 결과물 품질은 아직 검증하지 못했습니다.
- 기본 모델 이름(`claude-sonnet-5`)이 게이트웨이에서 인식되는 이름인지는 각자 환경에서 확인이 필요합니다.
- 메리골드 이미지: 개화(6번)는 사람이 직접 그린 실제 메리골드 꽃 그림(격자 칸 그림)입니다. 성장 중·꽃망울(4·5번)은 그 꽃을 6번의 칸 그림에서 17×16칸·11×10칸으로 줄여 다시 만든 임시 이미지이고, 씨앗·새싹(1~3번)은 이전 그림을 6번의 11색 팔레트로 칸 그림으로 바꾼 것입니다.

---

## 8. 알림 시스템

| 종류 | 시간 | 동작 | 상태 |
|---|---|---|---|
| 아침 알림 | 유저 설정 (기본 오전 9시) | 매일 반복. 식물 말투의 인사 | ✅ |
| 저녁 알림 | 유저 설정 (기본 오후 9시) | 오늘 관리 전일 때만. 완료하면 취소 | ✅ |
| 다시 알림 | 2시간 뒤 | 채팅에서 못 했다고 하고 `알림 받을게요`를 선택했을 때 | ✅ |

- 시간과 켜기/끄기는 온보딩 step5와 설정 팝업에서 바꿀 수 있고, 바꾸면 예약이 즉시 새로 등록됩니다 (`utils/notifications.ts`).
- 홈에 들어올 때마다 `refreshDailyNotifications()`가 예약 상태를 맞춥니다. 알림 권한이 없으면 예약되지 않습니다.
- **물주기·햇빛별 주기 알림은 아직 연결되지 않았습니다.** `notification.json`(식물별 문구와 주기)과 `hooks/useNotification.ts`의 `rescheduleNotifications()`가 준비되어 있지만 앱 어디에서도 호출하지 않습니다. 
- 개발자 메뉴의 `실제 알림 테스트`로 현재 단계 task 알림을 5초 간격으로 받아볼 수 있습니다.

---

## 9. 남은 개발 항목

| 항목 | 담당 | 설명 |
|---|---|---|
| 사진 task 후속 | 프론트 + AI | 수·토에 진입하도록 연결됨. 사진 → 캐릭터 결과 품질 검증, 사진을 못 찍은 주의 보충 정책(현재는 보충 없음) 결정 |
| 관찰하기 상태 선택지 | 프론트 + 기획 | 관찰 체크 뒤 "어때 보여?" 칩(예: 쌩쌩해 보여 / 잎이 처졌어 / 잎 색이 변했어 / 벌레·곰팡이가 보여)과 상태별 식물 반응 문구 추가. 반응은 `plantGuide.ts` 근거로 작성, 선택한 상태를 일기 요약·대화 기억에 넘겨 다음 대화에 활용. 체크리스트 안/뒤 배치 결정 필요 |
| 물주기 사용자별 학습 (방안 C) | 프론트 | 현재는 계절표 + `촉촉해` 시 재확인만 적용. `촉촉해`를 연달아 고르면 그 사용자의 주기를 늘리는 식의 학습은 미래 계획 |
| 물주기 주기표 확정 | 기획 | 추정값 칸(바질 가을·겨울, 메리골드 여름·겨울) 확인. 지역·실내외 환경 반영 여부 결정 |
| task별 주기 알림 연결 | 프론트 / 백엔드 | `rescheduleNotifications(plantType, plantedAt)` 연결 및 알림 정책 확정 (성장 단계 인자는 제거됨. 호출하는 곳은 아직 없음) |
| API 키 보호 | 백엔드 | 현재 앱 번들에 키가 포함됨 → 서버 경유 구조로 전환 |
| 서버 데이터 동기화 | 백엔드 | 현재 전량 로컬 저장. 서버 백업 여부 결정 |
| 메리골드 캐릭터 이미지 | 디자인 | 개화(6번)는 사람이 직접 그린 그림. 성장 중·꽃망울(4·5번)은 그 꽃을 칸 그림으로 줄여 만든 임시 이미지이므로 직접 그린 봉오리 이미지로 교체 필요, 씨앗·새싹(1~3번)은 이전 그림을 6번 팔레트로 변환한 것이라 확인 필요 (`assets/images/characters/marigold/`) |
| 도감에서 새로 키우기 시작 | 프론트 + 기획 | 키운 적 없는 식물의 `더 알아보기`를 누르면 뜨는 안내 팝업("{식물}을(를) 키우기 시작해야 확인할 수 있어요") 아래에 `새로 키우기 시작하기` 버튼을 추가. 누르면 해당 식물로 새로 시작하는 흐름(현재 키우는 식물 처리, task 완료 기록·일일 기록 초기화 여부, 온보딩 연결 등)은 정책 확정 필요 |
| 디자인 일관성 후속 | 프론트 + 디자인 | 빨강 3종(`red` `#ff6565` / `weekend` `#ff6b49` / `redStrong` `#d93025`) 통합 여부, 아이콘 색 팔레트(`ActionIconButton`·`PlantDetailView`에 따로 정의)의 토큰화, 글자 줄 간격이 13 본문 등에서 18~23으로 여러 값인 것 정리 (`DESIGN.md` 3장·7장) |
| 자는 중 대사·알림 | 기획 | 밤 12시~새벽 6시에는 자는 얼굴만 바뀌고 홈 한 줄 대사와 채팅 문구는 그대로. 잠꼬대 같은 대사를 넣을지, 이 시간대 알림은 어떻게 할지 결정 |
| 표정 이미지 보완 | 디자인 | 웃음·놀람은 바질만 있어 토마토·메리골드는 기본 얼굴로 대체됨. 바질 놀람은 웃음 기반으로 만든 이미지라 확인 필요. 바질 무표정은 눈물 표정의 입·눈썹과 기본 눈을 합성한 것 |
| 메리골드 단계 이미지 | 디자인 | 식물 그림(`marigold_1~5`)이 위처럼 임시 상태. 실제 화면은 1단계만 쓰므로 `marigold_1` 우선 |
| 연속 관리 연출 실기기 확인 | 프론트 | 컨페티(300개)·진동·체크 연출은 실제 기기에서 타이밍과 성능을 확인하고 조정 (터지는 위치·조각 수는 `streak.tsx`·`Confetti.tsx` 상수) |
| 선 색 농도 Figma 일치 | 프론트 + 디자인 | 선 두께는 Figma와 모두 일치. 하단 탭·채팅 패널 위 선은 Figma가 불투명색인데 코드는 30% 투명도, 앨범 사진 모서리 4px(Figma 5px) |
| 보관용 이미지 정리 | 프론트 | `characters/_source`(얼굴 원본), `_reference`(기본 모습)는 앱에 들어가지 않는 보관용. 불필요하면 삭제 (이전 표정 PNG `_legacy`는 삭제함) |
| 이전 단계 세부 UI 조정 | 프론트 | 개정 UI 초안 완료 후 화면별로 다시 다듬을 예정 |
| 남은 미사용 코드 정리 | 프론트 + 백엔드 | 화면 쪽 미사용 코드는 정리 완료. 남은 것: `services/utils/koreaDate.ts`(파일 전체), `services/ai.ts`의 `updatePlantCharacter`, `services/types/chat.ts`의 `ChatCompletionResponse`, `services/api/styleTransfer.ts`의 `STYLE_OPTIONS`(AI 연동 쪽이라 담당자 확인 후 삭제), `questionPool.ts`의 `installedMonths`·`pickDeepQuestion`(설치 개월 수별 질문 선택을 구현하다 만 것인지 확인 필요) |

### 최근 정리 내역

- **성장 단계 시스템 제거**: 성장 확인 질문·자동 진행·단계별 task·물주기 단계 보정(메리골드 −1일, 토마토 +1일)을 없애고 `constants/growthStages.ts`를 삭제함. 단계별 task는 원래 모든 단계가 같아서 동작에는 변화가 없고, 물주기는 계절표만 씀 (§5.3, §5.5).
- **캐릭터 단계 이미지**: 실제 화면은 1단계 이미지 고정. 개발자 메뉴의 캐릭터 개발 모드와 도감(마지막 단계)에서만 다른 단계를 씀.
- **미사용 코드 정리**: `ChatBubbleIcon`, `TYPOGRAPHY`/`SPACING`, `growthStageToNumber`, `getTodayTasks`·`getNextTaskDate`·`growthStageToStep`·`getCurrentWeek`, `isTaskCompletedToday`·`clearTodayTaskCompletions`, 홈의 쓰지 않는 상태 등을 삭제.

### 추가 작업 이력

#### 1. 도감(Collection) 탭
- 카드 스와이프 시 뒷면 카드가 불투명한 실제 이전·다음 카드로 전환되며, 밀어낼 경우 해당 방향의 뒷면 카드가 중앙으로 이동함. 오른쪽 이동 시 뒷면 카드 위치가 어색하던 오류 수정함.
- 미재배 식물은 씨앗 단계 캐릭터와 자물쇠로 표시되며 카드 색은 키운 식물과 같음. '더 알아보기'는 회색으로 처리되며, 클릭 시 "{식물}을(를) 키우기 시작해야 확인할 수 있어요" 팝업이 노출됨.
- 화면별 카드 상하단 간격을 동일하게 맞춤.

#### 2. 작은 화면(iPhone SE 등) 대응
- iPhone 16 기준(Figma 동일)으로 제작되었으며, 이보다 짧은 화면에서만 여백, 캐릭터, 헤더, 탭바를 압축하고 글자 비율을 동일하게 축소함.
- 모든 탭이 스크롤 없이 한 화면에 노출됨.

#### 3. 폰트 및 개발자 메뉴
- 폰트 굵기를 4종(Regular, Medium, Bold, Heavy)으로 통합하고 미사용 폰트 파일 삭제함.
- 개발자 메뉴를 박스 및 이모티콘 없이 텍스트와 섹션 구분선으로 재설계함. 연속 관리 화면 열기 및 캐릭터 종류·표정 전환 기능 추가함.

#### 4. 채팅
- 대화 종료 시 입력창 위치에 가로 전체 크기의 '오늘 기록 완료!' 박스가 노출됨. 해당 박스 하단에 말풍선 간격만큼 이격되어 '홈으로 돌아가기' 버튼이 위치하며, 채팅 화면에는 하단 탭이 없음.
- task 선택지에 "오늘은 못할 것 같아." 항목 추가함. 선택 시 해당 task가 내일 task 목록에 함께 노출됨.

#### 5. Record(날짜별 기록)
- 요약 분량을 5줄(90자 이내)로 고정함.
- 사진이 없는 날은 당일 노출되었던 캐릭터가 표시됨. 사진 캐릭터 생성 날짜를 기록하여, 생성 이전 날짜에는 기본 캐릭터가 노출됨(성장 단계 제거 후에는 1단계 기본 캐릭터).

#### 6. 캐릭터 및 표정
- 임시 화분 이미지를 pot.png 기준으로 교체하고 화분, 식물, 얼굴을 동일 캔버스 내 정렬된 레이어로 합성함.
- 프레임이 적용된 신규 얼굴로 전체 교체했으며, 홈 화면에서만 불규칙하게 깜빡임.
- 메리골드에 실제 꽃 이미지 및 신규 표정 디자인 반영함. 바질과 토마토에도 신규 표정 반영함.
- 표정을 6가지(기본, 웃음: 바질/기록 완료 시, 무표정: 1일 건너뜀, 눈물: 2일, 더 슬픈 눈물: 3일 이상/메리골드 전용, 놀람: 바질/채팅 진입 및 사진 요청 시)로 정리함.
- 얼굴 이미지는 `scripts/build_faces.py`를 통해 원본에서 재생성 가능함. 기본 모습(표정 포함/미포함) 이미지는 `_reference` 폴더에 위치함.

#### 7. 연속 관리 페이지
- Figma 55:16 구조로 변경함. 하단 버튼은 채팅의 '홈으로 돌아가기'와 동일한 위치이며, 문구는 7종 중 무작위로 노출됨.
- 메인 텍스트는 "{숫자}일 연속 관리 중!"으로 설정함.
- 등장 연출: 진동과 함께 노랑, 분홍, 하늘색 컨페티(260개)가 캐릭터 뒤편에서 위로 터진 후 중력에 의해 하강함. 동시점에 오늘 자 체크 항목이 튀어올랐다가 정렬됨.

#### 8. 정리 및 검증
- 이미지 폴더 구조를 `ui/`, `characters/`, `_source/`, `_reference/`로 정돈함(구형 `_legacy/`는 이후 삭제). 미사용 구형 표정 이미지(약 3.3MB)는 앱 번들에서 제외한 뒤 삭제함.
- 선 두께를 Figma와 비교 검증하였으며 전체 일치함.

#### 9. 디자인 시스템 정리와 기능 추가 (2026-11)
- **도감 카드 리뉴얼**: 앞뒤 뒤집기 카드(0.85배, 흰 바탕, 식물 색 불투명도, 드롭 섀도 없음), 점선 구분선, 지금 키우는 식물은 홈과 같은 모습, 뒷면 설명 자동 줄바꿈. 상세 카드는 본문 13·제목 15(Medium)로 줄이고 `extra`(선택 내용 블록)를 추가.
- **색 토큰**: `COLORS`에 `borderDark`·`redStrong`·`textBubble`·`textInk`·`shadow`·`gradEnd`·`imageBg`를 추가하고 코드에 직접 쓰던 hex를 모두 토큰으로 바꿈(채팅 말풍선 테두리 `#2a2a2a`는 `#303a1e`로 통일).
- **글자·크기 규칙**: 글자 크기 7단계(`FONT_SIZE`: 12/13/15/16/18/22/28)와 기본 줄 높이 표(`LINE_HEIGHT`, `lh()`), 버튼·입력창 크기(`constants/controls.ts`: 버튼 54·16, 입력창 48/온보딩 52)를 도입하고 전 화면에 적용. 예외는 도감 카드 안 글자, 헤더 로고·홈 대사·기록 제목·온보딩 입력창의 20.
- **채팅**: 입력창 자동 줄바꿈(최대 4줄, 엔터 전송), `+` 버튼·사진 답변 제거, 내 말풍선 왼쪽 시작점을 식물 말풍선에 맞춤, 식물 이름 Bold 16.
- **캐릭터**: 자는 얼굴 `sleep` + Z 효과(밤 12시~새벽 6시), 터치 반응(윙크·하트·음표·물방울), 식물 단계 이미지를 10단위 칸 그림으로 변환(`scripts/pixelate_plants.py`).
- **Record**: 일별 기록 카드가 그날 마지막으로 저장된 식물·표정으로 캐릭터를 표시(`@plant/day_look_{date}`).
- **정리**: `welcome.tsx`와 `react-native-svg-transformer` 삭제, 온보딩 이모지 제거.

#### 문서 반영 내역
- **README.md**: 기술 스택(진동, svg 변환, 애니메이션), 앱 구조(신규 컴포넌트·유틸·스크립트·이미지 폴더), 홈 표정 및 개발자 메뉴, 채팅 완료 UI, 작은 화면 대응, "캐릭터 표정" 섹션 추가함.
- **NOTICE.md** (루트 및 my-app 동일): 프로젝트 구조, 기술 스택, 홈, 채팅 완료, 신규 4.8 "캐릭터 표정", 파일 빠른 참조, 잔여 개발 항목 5개 추가함. 2026-11 갱신: 온보딩·채팅(입력창, 사진 답변 제거)·도감 카드·표정 9종(자는 얼굴)·디자인 토큰 반영.
- **DESIGN.md**: 채팅 완료 UI, 개발자 메뉴 스타일, 연속 관리 등장 연출 수치 반영함.

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
| `my-app/constants/watering.ts` | 물주기 계절표·물주기 날 판단 |
| `my-app/constants/chatMessages.ts` | 식물별 채팅 대사, task 확인 질문·선택지 |
| `my-app/store/storage.ts` | 로컬 저장 전체 API |
| `my-app/utils/notifications.ts` | 아침·저녁·다시 알림 예약 |
| `my-app/constants/character.ts` | 식물·단계 이미지, 얼굴 세트(`FACE_SETS`), 표정 → 얼굴 변환 |
| `my-app/scripts/build_faces.py` | 화분 얼굴 이미지(face_v2/{식물}/layers·overlays, fx: 하트·음표·물방울·Z) 생성 |
| `my-app/scripts/pixelate_plants.py` | 식물 단계 이미지를 10단위 칸 그림으로 변환 |
| `my-app/hooks/usePlantInteraction.ts` | 홈 캐릭터 터치 반응(탭·연타·문지르기·길게 누르기)과 자는 Z 효과 |
| `my-app/constants/typography.ts` | 글자 크기 7단계(`FONT_SIZE`), 줄 높이 표(`lh`), 폰트 이름 |
| `my-app/constants/controls.ts` | 버튼·입력창 공통 크기 |
| `my-app/utils/network.ts` | 대화창 진입 시 인터넷 연결 확인 |
| `my-app/components/common/Confetti.tsx` | 연속 관리 컨페티 (물리식 궤적, Animated) |
| `my-app/components/common/HoppingText.tsx` | 글자가 차례로 뛰어오르는 반복 모션 텍스트 (연속 관리 문구) |
| `my-app/utils/haptics.ts` | 진동 도우미 (웹·미지원 기기에서는 조용히 무시) |
| `my-app/utils/layout.ts` | 작은 화면 압축 계산 (`compactFactor`) |
| `my-app/DESIGN.md` | 개정된 디자인 시스템 |
| `my-app/QUESTIONS.md` | 질문 목록과 운영 방식 |
