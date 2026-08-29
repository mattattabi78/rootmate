# DESIGN.md — Rootmate 디자인 시스템

> 피그마 디자인 파일: https://www.figma.com/design/2fBhs18ET6zp7eIrI2FDWl/Roommate
>
> 이 문서는 피그마 실제 디자인을 기준으로 작성되었습니다. 코드 작성 시 이 파일의 값을 그대로 사용하세요.

---

## 1. 컬러 팔레트

```typescript
// constants/colors.ts
export const COLORS = {
  // 배경
  bg:           '#FFFFFF',              // 전체 화면 배경
  cardBg:       '#f3f4f1',             // 카드/그라디언트 시작색
  headerBg:     'rgba(255,255,255,0.8)', // 헤더 배경 (backdrop-blur)

  // 브랜드 컬러
  green:        '#286905',             // 메인 그린 (날짜, 섹션 제목, 카드 서브텍스트)
  lime:         '#b5ff22',             // 라임 액센트 (카드/버튼 그라디언트 끝색)
  outline:      '#303a1e',             // 모든 테두리, 내비 아이콘, 텍스트 일부

  // 텍스트
  textPrimary:  '#191c1b',             // 앱 타이틀, 인사 헤딩, 카드 제목
  textDark:     '#1b1c1b',             // 본문 텍스트 (textPrimary와 거의 동일)

  // 상태
  red:          '#ff6565',             // 취소/X 버튼 그라디언트 끝색

  // 그라디언트
  gradCard:     ['#f3f4f1', '#b5ff22'], // 카드·활성 탭 그라디언트 (위→아래)
  gradCancel:   ['#f3f4f1', '#ff6565'], // X 버튼 그라디언트 (위→아래)
};
```

### 컬러 사용 규칙
| 용도 | 값 |
|---|---|
| 앱 전체 배경 | `#FFFFFF` |
| 헤더 배경 | `rgba(255,255,255,0.8)` + backdrop-blur 12px |
| 테두리 (모든 카드·버튼·내비) | `#303a1e` 1.5px solid |
| 날짜 텍스트 | `#286905` |
| 메인 인사 텍스트 | `#191c1b` |
| 섹션 제목 | `#286905` |
| 카드 제목 | `#191c1b` |
| 카드 설명 | `#286905` |
| 카드 배경 | 그라디언트 `#f3f4f1` → `#b5ff22` |
| 취소 버튼 | 그라디언트 `#f3f4f1` → `#ff6565` |

---

## 2. 타이포그래피

피그마에서 사용하는 폰트는 2종입니다.

- **ahn2006-B / ahn2006-M**: 한국어 UI 전반 (안상수 계열)
- **Be Vietnam Pro SemiBold**: 영어 레이블 (내비게이션 탭 등)

```typescript
// constants/typography.ts
export const TYPOGRAPHY = {
  // 앱 타이틀 ("Rootmate" 로고)
  appTitle: {
    fontFamily: 'ahn2006-B',
    fontSize: 30,
    lineHeight: 45,
    color: '#191c1b',
  },

  // 날짜 표시 (예: "MAY 13, 2026")
  dateLabel: {
    fontFamily: 'ahn2006-B',
    fontSize: 20,
    lineHeight: 20,
    color: '#286905',
  },

  // 메인 인사 헤딩 (예: "서영님,\n오늘은 물 주는 날이에요!")
  headingXl: {
    fontFamily: 'ahn2006-M',
    fontSize: 40,
    lineHeight: 45,
    color: '#191c1b',
  },

  // 보조 헤딩 (예: "토마토가 새 메시지를 보냈어요 💌")
  headingMd: {
    fontFamily: 'ahn2006-M',
    fontSize: 20,
    lineHeight: 20,
    color: '#286905',
  },

  // 섹션 제목 (예: "오늘의 Tasks")
  sectionTitle: {
    fontFamily: 'ahn2006-B',
    fontSize: 20,
    lineHeight: 20,
    color: '#286905',
  },

  // 카드 제목 (예: "물 주기", "기록 남기기")
  cardTitle: {
    fontFamily: 'ahn2006-B',
    fontSize: 23,
    lineHeight: 22,
    color: '#191c1b',
  },

  // 카드 설명 텍스트
  cardBody: {
    fontFamily: 'ahn2006-B',
    fontSize: 16,
    lineHeight: 20,
    color: '#286905',
  },

  // 내비게이션 탭 레이블 (영문)
  navLabel: {
    fontFamily: 'Be Vietnam Pro',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: '#303a1e',
  },

  // 캘린더 월 표시 (예: "May 2026")
  calendarMonth: {
    fontFamily: 'ahn2006-B',
    fontSize: 20,
    lineHeight: 20,
  },

  // 캘린더 날짜 숫자
  calendarDate: {
    fontSize: 22,
    lineHeight: 22,
  },

  // 연속 관리일 수 표시 (예: "11일")
  streakDay: {
    fontSize: 22,
    lineHeight: 22,
  },
};
```

---

## 3. 간격 시스템

```typescript
// constants/spacing.ts
export const SPACING = {
  xs:   4,
  sm:   8,
  md:  12,
  lg:  16,   // 화면 좌우 패딩 (px-16)
  xl:  24,
  xxl: 32,
};

// 컴포넌트별 주요 수치
export const LAYOUT = {
  screenWidth:       390,   // 기준 디바이스 너비 (px)
  screenPaddingH:     16,   // 화면 좌우 여백
  contentWidth:      358,   // 컨텐츠 영역 너비 (390 - 16*2)
  cardPadding:      17.5,   // 카드 내부 패딩
  cardRadius:        32,    // 카드 border-radius
  cardBorderWidth:  1.5,    // 카드 테두리 두께
  topAppBarHeight:   61,    // 상단 앱바 높이
  bottomNavHeight:   76,    // 하단 내비바 높이
  bottomNavRadius:   32,    // 하단 내비바 상단 모서리
};
```

---

## 4. 컴포넌트 스펙

### 4.1 TopAppBar (상단 헤더)

```
높이:        61px
배경:        rgba(255,255,255,0.8) + backdrop-blur 12px
하단 테두리: 1.5px solid #303a1e
패딩:        px-20, py-16~17.5
앱 타이틀:  "Rootmate", ahn2006-B 30px, #191c1b
```

### 4.2 BottomNavBar (하단 내비게이션)

```
높이:          76px
배경:          #FFFFFF
상단 테두리:   1.5px solid #303a1e
상단 모서리:   border-top-left-radius 32px, border-top-right-radius 32px
탭 간격:       gap 55px
패딩:          pl-58.42px, pr-63.62px, py-12px

활성 탭 버튼:
  배경:        그라디언트 #f3f4f1 → #b5ff22 (위→아래)
  테두리:      1.5px solid #303a1e
  모양:        pill (border-radius 9999px)
  크기:        약 119×61px
  아이콘:      16×18px
  레이블:      Be Vietnam Pro SemiBold 12px, #303a1e, letter-spacing 0.6px

비활성 탭:
  배경:        없음 (투명)
  아이콘:      18×20px
  레이블:      Be Vietnam Pro SemiBold 12px, #303a1e
```

**탭 구성**: Home | Calendar (탭 2개)

### 4.3 Task Card (할 일 카드)

```
높이:        80px
너비:        358px (screenWidth - 32)
배경:        그라디언트 #f3f4f1 → #b5ff22 (위→아래)
테두리:      1.5px solid #303a1e
모서리:      border-radius 32px
패딩:        17.5px 전체

카드 제목:   ahn2006-B 23px, #191c1b
카드 설명:   ahn2006-B 16px, #286905

우측 액션 버튼 (원형):
  크기:      32×32px
  모양:      circle (border-radius 9999px)
  테두리:    1.5px solid #303a1e
  완료 전:   그라디언트 #f3f4f1 → #ff6565 (X 아이콘)
  완료 후:   그라디언트 #f3f4f1 → #b5ff22 (체크 아이콘)
  아이콘:    14×14px
```

### 4.4 Chat Bubble — 식물 메시지

```
위치:        x:60 (왼쪽 식물 아바타 공간 확보)
너비:        314px
패딩:        17.5px
모서리:      rounded (Background+Border)
테두리:      있음

식물 아바타: 40×40px, 원형, 카드 왼쪽 외부 (-46px)
식물 이름:   ahn2006-B (소제목)
메시지:      ahn2006 본문
```

### 4.5 Chat Bubble — 유저 답변

```
위치:        x:16 (화면 좌우 여백)
너비:        358px
패딩:        17.5px
모서리:      rounded
테두리:      있음

닉네임:      상단 표시
내용:        텍스트 or 이미지 (234×312px)
```

### 4.6 캘린더 탭 스위처 (캘린더/앨범)

```
컨테이너:    mx:24, 높이:54px, gap:10px
활성 탭:     그라디언트 #f3f4f1→#b5ff22, border 1.5px #303a1e, radius:9999px
비활성 탭:   배경 #FFFFFF, border 1.5px #303a1e, radius:9999px
활성 레이블: ahn2006 18px #303a1e, fontWeight:600
비활성 레이블: 18px rgba(71,84,103,0.8), fontWeight:500

홈 화면:    Home 탭 활성(그라디언트), Calendar 탭 비활성
캘린더 화면: Home 탭 비활성, Record 탭 활성(그라디언트)
```

### 4.7 캘린더 날짜 그리드

```
캘린더 카드:     배경 #FFFFFF, border 1.5px #303a1e, radius:32px, padding:21px
월 헤더:         ahn2006-B 20px #286905
이전/다음 달 날짜: #b7b7b7
오늘 셀:         그라디언트 #f3f4f1→#b5ff22, border 1.5px #303a1e, radius:12px, 32×32px
기록 점:         #3e98ff, 4×4px, radius:2px (날짜 아래)
```

### 4.7 연속 관리 위젯 (Streak Tracker)

```
컨테이너:   너비:358px, 높이:123px
섹션 제목:  "연속 관리일", ahn2006-B 22px
날짜 아이템: 7개 (일~토), 너비:28px
  배경 원:  28×28px
  날짜 텍스트: 22px (아래)
  완료 상태: 체크 아이콘 12×12px + 배경
  미완료:   X or 시계 아이콘
```

### 4.8 Button (탭 선택형, 예: "물 주기 완료!" / "물 주기 못했어..")

```
너비:       166px
높이:       54px
레이블:     ahn2006 22px, 중앙 정렬
테두리:     있음 (Option 2: School 스타일)
```

### 4.9 답장하기 버튼 (질문 화면 하단)

```
위치:       하단 고정 (y:820 기준)
너비:       354px (x:20)
높이:       51px
내용:       "답장하기" 텍스트 + 우측 + 아이콘 (24×24px)
```

---

## 5. 화면별 레이아웃

### 홈 화면 (index.tsx)

```
[TopAppBar]             — "Rootmate" 타이틀, blur 배경
  날짜 (MAY 13, 2026)   — ahn2006-B 20px #286905
  메인 인사 헤딩         — ahn2006-M 40px #191c1b (2줄)
  서브 메시지            — ahn2006-M 20px #286905

[식물 캐릭터 이미지]     — 164×310px, x:91 y:-12 (카드 위에 겹침)

[오늘의 Tasks 섹션]
  섹션 제목             — "오늘의 Tasks", ahn2006-B 20px #286905
  Task Card 1           — "물 주기" / 250ml 안내 / X or Check 버튼
  Task Card 2           — "기록 남기기" / 사진 안내 / X or Check 버튼

[BottomNavBar]          — Home(활성) | Calendar(비활성)
```

### Task 확인 화면 (task.tsx)

```
[Header]                — 뒤로가기 버튼 + "Rootmate"
날짜 표시               — "2026.05.25 (월)", 중앙 정렬

[식물 말풍선]           — 식물 아바타 + 메시지
[Task Card들]           — 물 주기, 기록 남기기 등

[선택 버튼 2개]
  "물 주기 완료!" | "물 주기 못했어.."
  "사진 추가하기" | "다음에.."

[유저 답변 카드]        — 닉네임 + 선택 결과
```

### 질문 화면 (질문.tsx)

```
[Header]                — 뒤로가기 + "Rootmate"
날짜

[식물 말풍선들]         — 순차적으로 쌓이는 대화 형식
[유저 답변들]           — 텍스트 / 사진 답변 카드

[답장하기 버튼]         — 하단 고정, 텍스트 입력 + 아이콘
```

### 연속 관리 화면

```
[TopAppBar]
[식물 캐릭터]
[인사 헤딩]             — "2 일 연속 관리 중 🫳🏻"

[연속 관리 위젯]
  제목: "연속 관리일"
  7일 트래커 (날짜별 완료/미완료)
```

### 캘린더 탭 (calendar.tsx)

```
[TopAppBar]
[탭 스위처]             — 캘린더 | 앨범

[캘린더 뷰 (월간)]
  월 헤딩 + 이전/다음 화살표
  요일 헤더 (S M T W T F S)
  날짜 그리드 (날짜 + 기록 도트)

[선택된 날짜 기록]
  날짜 제목 (예: "May 14, 2026")
  180×180px 사진 영역
```

---

## 6. 컴포넌트 작성 규칙

- 모든 색상은 `COLORS` 상수 사용, 하드코딩 금지
- 모든 간격·크기는 `SPACING` / `LAYOUT` 상수 사용
- 테두리는 항상 `1.5px solid COLORS.outline`
- 카드 배경 그라디언트: LinearGradient `COLORS.gradCard`
- 취소 버튼 그라디언트: LinearGradient `COLORS.gradCancel`
- 컴포넌트 파일명은 PascalCase
- StyleSheet는 컴포넌트 파일 하단에 위치
- props 타입은 컴포넌트 상단에 interface로 정의

```typescript
// 카드 컴포넌트 기본 구조 예시
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, LAYOUT, TYPOGRAPHY } from '../../constants';

<LinearGradient
  colors={COLORS.gradCard}
  style={{
    borderRadius: LAYOUT.cardRadius,
    borderWidth: LAYOUT.cardBorderWidth,
    borderColor: COLORS.outline,
    padding: LAYOUT.cardPadding,
  }}
>
  <Text style={{ ...TYPOGRAPHY.cardTitle }}>{title}</Text>
  <Text style={{ ...TYPOGRAPHY.cardBody }}>{description}</Text>
</LinearGradient>
```
