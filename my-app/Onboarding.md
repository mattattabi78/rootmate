# ONBOARDING.md — 온보딩 상세 스펙

> 앱 최초 실행 시 진행되는 온보딩 플로우 구현 가이드입니다.

---

## 1. 온보딩 진입 조건

```typescript
// app/_layout.tsx에서 체크
const isOnboardingComplete = await AsyncStorage.getItem(
  '@plant/onboarding_complete'
);

if (!isOnboardingComplete) {
  router.replace('/onboarding/step1');
}
```

- 온보딩 완료 여부: `@plant/onboarding_complete` 키로 관리
- 완료 전 홈 화면 진입 불가
- 중간 이탈 후 재실행 시 마지막 완료 스텝부터 재시작

---

## 2. 온보딩 라우팅 구조

```
app/onboarding/
├── _layout.tsx     # 온보딩 전용 레이아웃 (탭바 없음, 진행 인디케이터)
├── step1.tsx       # 닉네임 입력
├── step2.tsx       # 식물 코드 입력
├── step3.tsx       # 식물 소개
├── step4.tsx       # 식물 닉네임 짓기
├── step5.tsx       # 알림 설정
└── complete.tsx    # 온보딩 완료
```

---

## 3. 공통 레이아웃 (onboarding/_layout.tsx)

```typescript
// 온보딩 전체에 공통 적용
// - 상단 진행 인디케이터 (점 5개)
// - 뒤로 가기 버튼 (step1 제외)
// - 하단 다음 버튼 영역
// - 탭바 없음

const TOTAL_STEPS = 5;  // complete 제외

interface OnboardingLayoutProps {
  currentStep: number;   // 1~5
  canGoNext: boolean;    // 다음 버튼 활성화 여부
  onNext: () => void;
  nextLabel?: string;    // 기본값: "다음"
  children: React.ReactNode;
}
```

**진행 인디케이터**

```
● ○ ○ ○ ○   step1
● ● ○ ○ ○   step2
● ● ● ○ ○   step3
...
```

**다음 버튼**

```
활성:   배경 COLORS.green, 텍스트 white
비활성: 배경 COLORS.border, 텍스트 COLORS.textTertiary
```

---

## 4. 각 스텝 상세

---

### STEP 1 — 닉네임 입력 (step1.tsx)

**화면 텍스트**

```
헤드: "만나서 반가워요."
서브: "어떻게 불러드릴까요?"
```

**입력 필드**

```typescript
// 유효성 검사
const isValid = nickname.trim().length >= 1 && nickname.trim().length <= 10;

// 저장
await AsyncStorage.setItem('@plant/user_nickname', nickname.trim());
```

**UI 스펙**

```
입력 필드:
  높이: 52pt
  배경: COLORS.cardAlt
  테두리: 1pt COLORS.border (포커스 시 COLORS.green)
  모서리: 12pt
  패딩: 16pt
  최대 글자: 10자
  우측 글자 수 카운터 표시: "3/10"

키보드 타입: default
다음 버튼: nickname.trim().length > 0 시 활성화
```

**저장 후 이동**

```
→ /onboarding/step2
```

---

### STEP 2 — 식물 코드 입력 (step2.tsx)

**화면 텍스트**

```
헤드: "어떤 식물과 함께할 건가요?"
서브: "배송받은 씨앗 봉투 안에 코드가 있어요."
```

**코드 입력 방식**

```typescript
// 코드 입력 → 식물 종 자동 매핑
const PLANT_CODES: Record<string, string> = {
  'BAS-001': 'basil',
  'TOM-001': 'tomato',
  'TUL-001': 'tulip',
  // 추가 코드...
};

const plantId = PLANT_CODES[code.toUpperCase()];
```

**UI 스펙**

```
코드 입력 필드:
  높이: 52pt
  키보드: default (대문자 자동 변환)
  유효한 코드: 테두리 COLORS.green, 하단에 "바질이군요! 🌿" 확인 메시지
  유효하지 않은 코드: 테두리 red, 하단에 "코드를 다시 확인해주세요"

코드 없이 시작하기 (텍스트 링크):
  하단에 "코드가 없으신가요?" 텍스트
  탭하면 직접 선택 모드로 전환

직접 선택 모드:
  [바질] [방울토마토] [튤립] 카드 형태
  각 카드: 이미지 + 이름
  선택 시 테두리 COLORS.green
```

**저장**

```typescript
interface PlantData {
  id: string;           // 'basil' | 'tomato' | 'tulip'
  code?: string;        // 구매 코드 (없으면 undefined)
  adoptedAt: string;    // ISO date string
  nickname: string;     // step4에서 설정
  growthStage: 'seed' | 'sprout' | 'growing' | 'done';
  photoUri?: string;    // 최신 사진
}
// step2에서 id, code, adoptedAt, growthStage: 'seed' 저장
// nickname은 step4에서 추가
```

---

### STEP 3 — 식물 소개 (step3.tsx)

**화면 구성**

```
상단: 식물 일러스트 (assets/images/plants/{plantId}_intro.png)

식물명 (한글)
학명 (이탤릭)

설명 텍스트 (1~2줄)

관리 정보 카드:
  발아까지  [growthDays.sprout]일
  물 주기   [care.water]
  햇빛      [care.sunlight]
```

**버튼**

```
다음 버튼: 항상 활성화 (정보 확인 화면이라 필수 입력 없음)
```

---

### STEP 4 — 식물 닉네임 짓기 (step4.tsx)

**화면 텍스트**

```
헤드: "룻메이트의 이름을 지어줄게요."
```

**UI 스펙**

```
입력 필드:
  닉네임 입력 (step1과 동일 스타일)
  최대 10자
  플레이스홀더: 식물 종별 예시
    바질:      "바질이, 초록이, 버질..."
    방울토마토: "토마링, 토토, 방울이..."
    튤립:      "튤리, 빨강이, 봄이..."

확인 메시지:
  닉네임 입력 시 하단에
  "[입력한 닉네임] 잘 부탁해요 🌱" 표시
```

**저장**

```typescript
// 기존 plant_data에 nickname 추가
const plantData = JSON.parse(
  await AsyncStorage.getItem('@plant/plant_data') || '{}'
);
plantData.nickname = plantNickname.trim();
await AsyncStorage.setItem('@plant/plant_data', JSON.stringify(plantData));
```

---

### STEP 5 — 알림 설정 (step5.tsx)

**화면 텍스트**

```
헤드: "[식물닉네임]가 잘 자랄 수 있게 제때 알려드릴게요."
서브: "알림을 허용하면 물 주기, 햇빛, 성장 기록 알림을 받아요."
```

**알림 종류 설명 (리스트)**

```
💧 물 주기 알림    식물에게 물 줄 때가 됐을 때
☀️ 햇빛 알림      오전 10시, 햇빛 체크 알림
🌿 기록 알림      오후 8시, 오늘 기록 독려
🌱 성장 알림      특별한 순간 (새싹, 꽃 등)
```

**버튼**

```
[알림 허용하기]  → iOS 권한 요청 팝업 → 완료 화면으로
[나중에 설정하기] → 완료 화면으로 (알림 없이 진행)
```

**구현**

```typescript
import * as Notifications from 'expo-notifications';

const requestPermission = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    await scheduleInitialNotifications(plantData);
  }
  router.push('/onboarding/complete');
};
```

---

### COMPLETE — 온보딩 완료 (complete.tsx)

**화면 구성**

```
애니메이션:
  화분만 있는 홈 화면 미리보기 (씨앗 심기 전)
  화분이 천천히 등장하는 애니메이션

텍스트:
  "씨앗을 심었어요."
  "[식물닉네임]의 첫 번째 날이에요."

  "매일 조금씩 돌봐주면
   함께 자라날 거예요."

버튼:
  [시작하기] → 홈 화면으로 이동
```

**완료 처리**

```typescript
const completeOnboarding = async () => {
  await AsyncStorage.setItem('@plant/onboarding_complete', 'true');
  await AsyncStorage.setItem(
    '@plant/last_record_date',
    new Date().toISOString().split('T')[0]
  );
  router.replace('/');  // 홈으로 이동
};
```

---

## 5. 온보딩 데이터 흐름 요약

```
step1: 닉네임 → @plant/user_nickname
step2: 식물 종 + 코드 → @plant/plant_data (일부)
step3: (저장 없음, 정보 확인만)
step4: 식물 닉네임 → @plant/plant_data (nickname 추가)
step5: 알림 권한 요청
complete: @plant/onboarding_complete = 'true'
```

---

## 6. 온보딩 중 이탈 처리

```typescript
// 각 스텝에서 현재 진행 상태 저장
await AsyncStorage.setItem('@plant/onboarding_step', String(currentStep));

// 앱 재실행 시
const savedStep = await AsyncStorage.getItem('@plant/onboarding_step');
if (savedStep && !isOnboardingComplete) {
  router.replace(`/onboarding/step${savedStep}`);
}
```

---

## 7. 온보딩 관련 주의사항

- step2에서 코드 없이 직접 선택한 경우 `code` 필드는 `undefined`
- step5에서 알림 거부해도 온보딩은 정상 완료
- 알림 권한은 설정 탭에서 나중에 다시 요청 가능
- 온보딩 완료 후 홈 화면 첫 진입 시 화분 등장 애니메이션 한 번만 재생
- 식물 닉네임이 앱 전체의 식물 호칭으로 사용됨 ([닉네임]가 목말라해요 등)