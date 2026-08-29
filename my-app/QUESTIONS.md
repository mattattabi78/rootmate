# QUESTIONS.md — 마음 건강 질문 리스트

> 이 파일의 질문들은 `constants/questions.ts`에 그대로 옮겨 사용합니다.

---

## 질문 운영 방식

```
월~금, 일  DAILY_QUESTIONS (40개) 풀에서 순환
토요일     DEEP_QUESTIONS (사용 기간순, 반복 없음)
매월 1일   MONTHLY_START_QUESTION (고정)
매월 말일  MONTHLY_END_QUESTION (고정)
```

---

## 기본 질문 (DAILY_QUESTIONS) — 40개

### 오늘 하루 (10개)

```typescript
{ id: 'D01', text: '오늘 밥은 잘 챙겼어요?' },
{ id: 'D02', text: '오늘 기분을 날씨로 표현하면요?' },
{ id: 'D03', text: '오늘 가장 오래 한 것이 뭐예요?' },
{ id: 'D04', text: '오늘 잠깐이라도 멈춘 순간이 있었나요?' },
{ id: 'D05', text: '오늘 나를 위해 뭔가 하나 했다면 뭐예요?' },
{ id: 'D06', text: '오늘 가장 잘한 것 하나만요.' },
{ id: 'D07', text: '오늘 나를 가장 지치게 한 게 뭐예요?' },
{ id: 'D08', text: '오늘 소소하게 기뻤던 게 있었나요?' },
{ id: 'D09', text: '오늘 가장 기억하고 싶은 순간은요?' },
{ id: 'D10', text: '오늘 밖에 나갔어요? 뭐가 눈에 들어왔어요?' },
```

### 몸과 감각 (5개)

```typescript
{ id: 'D11', text: '지금 몸의 어느 부분이 가장 피곤해요?' },
{ id: 'D12', text: '오늘 잠은 충분했나요?' },
{ id: 'D13', text: '지금 뭐가 제일 먹고 싶어요?' },
{ id: 'D14', text: '오늘 몸이 보낸 신호 중 알아챈 게 있어요?' },
{ id: 'D15', text: '지금 앉아있는 자세, 편안한가요?' },
```

### 관계와 감정 (5개)

```typescript
{ id: 'D16', text: '오늘 누군가한테 연락하고 싶었는데 안 한 사람 있어요?' },
{ id: 'D17', text: '오늘 고마웠던 사람이 있어요?' },
{ id: 'D18', text: '오늘 나한테 가장 친절했던 순간은요?' },
{ id: 'D19', text: '오늘 누군가의 말이 마음에 남아있어요?' },
{ id: 'D20', text: '요즘 가장 자주 드는 감정이 뭐예요?' },
```

### 식물과 연결된 질문 (5개)

```typescript
{
  id: 'D21',
  text: '{plantNickname}한테는 물, 햇빛, 공기가 필요해요.\n지금 나한테 제일 필요한 게 뭐예요?'
},
{
  id: 'D22',
  text: '식물은 억지로 자라게 할 수 없어요.\n요즘 나한테 억지로 하고 있는 게 있나요?'
},
{
  id: 'D23',
  text: '식물도 과습이 오면 뿌리가 썩어요.\n요즘 뭔가 너무 많이 하고 있는 게 있나요?'
},
{
  id: 'D24',
  text: '{plantNickname}한테 오늘 물을 줬어요.\n오늘 나한테는 뭘 줬어요?'
},
{
  id: 'D25',
  text: '식물은 햇빛이 부족하면 한쪽으로 기울어요.\n요즘 나는 어느 쪽으로 기울어져 있는 것 같아요?'
},
```

### 휴식과 에너지 (5개)

```typescript
{ id: 'D26', text: '이번 주 진짜로 쉰 순간이 있었나요?' },
{ id: 'D27', text: '지금 에너지가 몇 퍼센트쯤 남은 것 같아요?' },
{ id: 'D28', text: '쉬고 싶은데 못 쉬고 있는 게 있어요?' },
{ id: 'D29', text: '요즘 충전이 잘 되는 것과 방전이 잘 되는 게 뭐예요?' },
{ id: 'D30', text: '이번 주 나한테 고맙다고 하고 싶은 것 하나만요.' },
```

### 나를 돌아보기 (10개)

```typescript
{ id: 'D31', text: "요즘 '이건 나중에 해야지'하고 미뤄둔 것 중 나를 위한 게 있어요?" },
{ id: 'D32', text: '이번 주 가장 많이 신경 쓴 것과 가장 덜 신경 쓴 것이 뭐예요?' },
{ id: 'D33', text: '요즘 나는 무엇을 위해 이렇게 달리고 있어요?' },
{ id: 'D34', text: '최근에 진짜 원해서 한 것과 해야 해서 한 것 중 뭐가 더 많았나요?' },
{ id: 'D35', text: '이번 주 나한테 가장 잘해준 것 하나만요.' },
{ id: 'D36', text: "오늘 나한테 '잘하고 있어'라고 말해줄 수 있는 순간이 있었나요?" },
{ id: 'D37', text: '요즘 나한테 가장 엄격한 사람이 나 자신인 것 같을 때가 있어요?' },
{ id: 'D38', text: '지금 내 삶에서 내려놓고 싶은 것 하나만요.' },
{ id: 'D39', text: '오늘 하루를 한 단어로 표현하면요?' },
{ id: 'D40', text: '지금 이 순간 솔직히 어때요?' },
```

---

## 심화 질문 (DEEP_QUESTIONS)

앱 사용 기간이 쌓일수록 순서대로 노출. 반복 없음.

### 1~4주차

```typescript
{
  id: 'DQ01',
  weekFrom: 1,
  text: "쉬어도 된다고 느끼는 날과 쉬면 안 될 것 같은 날, 차이가 뭔 것 같아요?"
},
{
  id: 'DQ02',
  weekFrom: 2,
  text: "뭔가를 하지 않을 때 불편한 느낌이 드는 적 있어요?\n어떤 상황이에요?"
},
{
  id: 'DQ03',
  weekFrom: 3,
  text: "요즘 충전이 잘 안 되는 느낌이 들 때가 있나요?\n어떨 때예요?"
},
{
  id: 'DQ04',
  weekFrom: 4,
  text: "내가 지쳐있다는 걸 나보다 먼저 알아챈 사람이 있었나요?"
},
```

### 2~3개월차

```typescript
{
  id: 'DQ05',
  weekFrom: 8,
  text: "'이 정도는 다들 하는 거지'라고 생각하며 넘어간 것들이 있나요?"
},
{
  id: 'DQ06',
  weekFrom: 9,
  text: "나한테 가장 엄격한 사람이 나 자신인 경우, 어떤 상황에서 그래요?"
},
{
  id: 'DQ07',
  weekFrom: 10,
  text: "요즘 하루 중 진짜 내 시간이라고 느끼는 순간이 있나요?\n언제예요?"
},
{
  id: 'DQ08',
  weekFrom: 11,
  text: "요즘 나는 무엇으로 나를 채우고 있어요?"
},
```

### 4~6개월차

```typescript
{
  id: 'DQ09',
  weekFrom: 16,
  text: "지금 내 삶에서 가장 많은 에너지를 쓰는 것과\n가장 많은 에너지를 받는 것이 뭐예요?"
},
{
  id: 'DQ10',
  weekFrom: 18,
  text: "한 달 전 나와 지금 나, 어떤 게 달라진 것 같아요?"
},
{
  id: 'DQ11',
  weekFrom: 20,
  text: "지금 나의 삶에서 가장 충전이 잘 되는 것은 뭐예요?"
},
{
  id: 'DQ12',
  weekFrom: 22,
  text: "1년 후의 나한테 오늘 하루를 한 문장으로 설명한다면요?"
},
```

### 6개월 이상

```typescript
{
  id: 'DQ13',
  weekFrom: 24,
  text: "이 앱을 쓰기 시작했을 때랑 비교해서 나한테 뭔가 달라진 게 있나요?"
},
{
  id: 'DQ14',
  weekFrom: 26,
  text: "쉬어도 된다고, 나 스스로 허락해준 적이 있어요?\n어떤 순간이었어요?"
},
{
  id: 'DQ15',
  weekFrom: 28,
  text: "요즘 나한테 가장 필요한 것 하나를 솔직하게 말해볼 수 있어요?"
},
```

---

## 월초 · 월말 질문 (고정)

```typescript
export const MONTHLY_START_QUESTION = {
  id: 'MS01',
  text: '새 달이 시작됐어요.\n{plantNickname}도 새 달을 맞이하고 있어요.\n\n이번 달, 나한테 딱 하나만 해주고 싶은 게 있다면요?',
};

export const MONTHLY_END_QUESTION = {
  id: 'ME01',
  text: '이번 달도 {plantNickname}와 함께했어요.\n\n이번 달 나한테 가장 잘해준 것 하나만 떠올려봐요.\n작은 거도 괜찮아요.',
};
```

---

## 질문 선택 로직 (constants/questions.ts)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export function getTodayQuestion(
  plantNickname: string,
  installDate: Date,
  questionIndex: number,
  deepQuestionIndex: number
): string {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfWeek = today.getDay(); // 0: 일요일, 6: 토요일

  // 매월 1일
  if (dayOfMonth === 1) {
    return MONTHLY_START_QUESTION.text.replace('{plantNickname}', plantNickname);
  }

  // 매월 말일
  if (dayOfMonth === lastDay) {
    return MONTHLY_END_QUESTION.text.replace('{plantNickname}', plantNickname);
  }

  // 토요일: 심화 질문
  if (dayOfWeek === 6) {
    const weeksInstalled = Math.floor(
      (today.getTime() - installDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const availableDeep = DEEP_QUESTIONS.filter(q => q.weekFrom <= weeksInstalled);
    const deepQ = availableDeep[deepQuestionIndex % availableDeep.length];
    return deepQ.text.replace('{plantNickname}', plantNickname);
  }

  // 평일 + 일요일: 기본 질문 순환
  const dailyQ = DAILY_QUESTIONS[questionIndex % DAILY_QUESTIONS.length];
  return dailyQ.text.replace('{plantNickname}', plantNickname);
}
```

---

## 질문 설계 원칙

1. **식집사 정체성 유지**: 마음 건강이라는 단어를 직접 쓰지 않음. 식물 언어로 우회하거나 일상 언어 사용
2. **강요하지 않음**: 모든 질문에 "그냥 넘길게요" 옵션. 답하지 않아도 기록에 빈칸으로 남고 페널티 없음
3. **짧게 답해도 됨**: 한 단어, 이모지도 괜찮음. 긴 글 압박 없음
4. **점진적 깊이**: 처음엔 오늘 밥 먹었냐는 질문, 6개월 후엔 자신의 패턴을 돌아보는 질문
5. **{plantNickname} 치환**: 유저의 식물 닉네임으로 자동 치환되어 개인화된 느낌 제공