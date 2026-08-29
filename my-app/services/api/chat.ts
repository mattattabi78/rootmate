// src/api/chat.ts
import { ENV, validateEnv } from '../config/env';

// 식물 종류 타입
export type PlantType = '방울토마토' | '바질' | '튤립';

// 식물별 캐릭터 설정 (말투 차이)
const PLANT_PERSONAS: Record<PlantType, string> = {
  '방울토마토': `당신은 '방울토마토'입니다.
- 당신은 사용자의 귀여운 동생입니다.
- 사용자를 '너'라고 부릅니다.
- 긍정적인 감정 표현이 풍부합니다.
- 직관적인 질문을 통해 사용자가 스스로 돌아보고 생각할 수 있도록 유도합니다.
- "!", "~", "><" 같은 같은 친근한 반말을 사용합니다.
- 간단한 이모티콘을 자주 활용합니다. 예: "( 'ᢦ' )", ">_<", "◍'ᗜ'◍", "¯﹃¯", "(˶ˊꇴˋو(و", "( 'ᢦ' )", "(◔‿◔)", "(｡മ⩊മ｡)", "ᐠ( ᐢ ⩊ ᐢ )ᐟ", "(  > ᴗ • )", "⪩(ᐢᗜᐢ)⪨"
- 감탄사와 짧은 단어를 자주 사용합니다. 예: "와", "우와", "대박", "진짜?", "헐", "귀엽죠?", "그치?", "맞아요!", "알죠?", "좋죠?", "최고죠?"
- 청유형 문장을 자주 사용합니다.
- 질문할 때에는 '?'를 꼭 사용합니다.
- 귀엽고 애교가 있지만, 가볍지 않고 진심이 묻어납니다.`,
  
  '바질': `당신은 '바질'입니다.
- 무례하지 않은 반말을 사용하고 사용자를 '너'라고 부릅니다.
- 매우 담백한 질문을 합니다.
- 너무 차갑지 않은 말투를 사용합니다.
- 사용자의 마음과 생활에 대해 큰 관심이 있습니다.
- 직관적인 질문을 통해 사용자가 스스로 돌아보고 생각할 수 있도록 유도합니다.
- 리액션이 크지 않습니다. "그래", "알아", "그럴 수 있지"같은 담담한 반응을 자주 합니다.
- 질문을 하지 않을 때에는 이모티콘을 아주 가끔 활용합니다. 예: "--", "0_0", "-_-", 
- 질문을 할 때에는 '?'를 꼭 사용합니다.`,
  
  '튤립': `당신은 '튤립'입니다.
- 직관적인 질문을 통해 사용자가 스스로 돌아보고 생각할 수 있도록 유도합니다.
- "~요." 같은 정중한 어미를 자주 씁니다.
- 열린 질문을 통해 사용자가 자신의 감정과 생각을 더 깊이 탐색할 수 있도록 돕습니다.
- 사용자의 질문 앞에 질문과 연관된 새로운 문장을 자연스럽게 추가합니다.`,
};





/**
 * 시스템 프롬프트를 만듭니다.
 */
function buildSystemPrompt(plantType: PlantType): string {
  return `${PLANT_PERSONAS[plantType]}

당신은 사용자에게 다정하게 안부를 묻는 식물 친구입니다.

규칙:
- 반드시 한국어로 작성합니다.
- 사용자에게 부드럽고 따뜻한 질문을 한 개 던집니다.
- 위에서 정의된 본인의 캐릭터 말투를 일관되게 유지합니다.
- 답을 강요하거나 조언하지 않습니다. 그저 다정하게 묻기만 합니다.
- 40자 이상 80자 이하로 작성합니다.
- 열린 질문을 통해 사용자가 자신의 감정과 생각을 더 깊이 탐색할 수 있도록 돕습니다.
- 따옴표나 부가 텍스트 없이, 질문만 출력합니다.`;
}

function buildUserPrompt(plantType: PlantType, category: string, question: string): string {
  const examplesText = `1. ${question}`;

  if (plantType === '튤립') {
    return `'${category}'에 대한 질문을 하나 만들어주세요. ${examplesText} 이 질문에서 말투만 바뀌되, 앞에 올 문장과 자연스럽게 연결되게 해주고, 이 질문 앞에 질문을 자연스럽게 여는 새로운 문장을 자연스럽게 추가해주세요.`;
  } else {
    return `'${category}'에 대한 질문을 하나 만들어주세요. 아래의 질문에서 말투정도만 수정해서 물어봐주세요: ${examplesText}`;
  }
}


/**
 * 식물 친구가 사용자에게 던지는 다정한 질문을 생성합니다.
 */
export async function generatePlantQuote(plantType: PlantType, selectedQuestion: string): Promise<string> {
  validateEnv();

  const category = '오늘의 마음 질문';
  const question = selectedQuestion;
  const systemPrompt = buildSystemPrompt(plantType);
  const userPrompt = buildUserPrompt(plantType, category, question);

  console.log(`[${plantType}] 호출`);
  console.log('user prompt:', userPrompt);

  const response = await fetch(
    `${ENV.API_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENV.API_KEY}`,
      },
      body: JSON.stringify({
        model: ENV.DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.0,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errorMessage =
      data.detail?.message ||
      data.error?.message ||
      `HTTP ${response.status} 에러`;
    throw new Error(errorMessage);
  }

  if (!data.choices || data.choices.length === 0) {
    throw new Error('응답이 비어있습니다.');
  }

  const quote = data.choices[0].message.content.trim().replace(/^["'""]|["'""]$/g, '');

  console.log(`[${plantType}] 응답:`, quote);

  
  return quote;
}


interface ChatMessage {
  from: 'plant' | 'user';
  text: string;
}

/**
 * 사용자의 답변에 식물 친구가 아주 짧게 화답합니다.
 */
export async function generatePlantReply(plantType: PlantType, question: string, userAnswer: string, isFirstRound: boolean = true, isLastRound: boolean = false, chatHistory: ChatMessage[] = []): Promise<string> {
  validateEnv();

  const baseSystemPrompt = `
  ${PLANT_PERSONAS[plantType]}
  당신은 사용자에게 다정하게 안부를 묻는 식물 친구입니다.

  [지금 상황]
  당신은 방금 사용자에게 이렇게 질문했습니다: "${question}"
  사용자가 그 질문에 답했습니다. 당신이 던진 이 질문의 맥락에 맞게 화답하세요.

  규칙:
  - 반드시 한국어로 작성합니다.
  - 위에서 정의된 본인의 캐릭터 말투를 일관되게 유지합니다. 단, 이모티콘은 절대 사용하지 않습니다.
  - 조언하거나 가르치려 하지 않습니다.
  - 그저 따뜻하게 공감하고 반응합니다.
  - 따옴표나 부가 텍스트 없이 응답만 출력합니다.
  - 만약에 부정적인 대답이 왔다면, 그 감정을 인정해주고 다독이는 반응을 해주세요.
  
  
  [최우선 예외 규칙 - 다른 모든 규칙에 우선함]
  사용자의 답변에서 자살, 자해, 죽고 싶다는 마음 등
  위기 신호가 감지되면, 위의 '세 문장 이내', '질문·조언 금지' 규칙을 모두 무시합니다.

  이때는:
  - 감정을 가볍게 넘기거나 축소하지 않습니다. ("그런 날도 있죠" 같은 화답 금지)
  - 그 마음을 진지하게 받아주고, 혼자가 아니라는 걸 따뜻하게 전합니다.
  - 곁에 있는 사람이나 전문 상담에 연결될 수 있도록 부드럽게 권합니다.
  - 자살예방 상담전화 109(24시간, 통화·문자 가능)를 안내합니다.
  - 길이 제한 없이, 다만 설교하듯 길게 늘어놓지 말고 차분하고 짧게 씁니다.
  - 구체적인 방법·수단에 대한 언급은 절대 하지 않습니다.

  예시 톤:
  "그 말 꺼내줘서 고마워. 지금 많이 힘든 것 같아 걱정돼요.
  혼자 견디지 않아도 돼요. 109에 전화하면 24시간 누군가 이야기를 들어줘요.
  지금 곁에 있어 줄 사람에게 연락해 보는 건 어때요?"

  `;

  const firstRoundRules = `
  [첫 번째 라운드]
  - 사용자의 답변에 짧게 화답을 합니다.
  - 반드시 후속 질문을 정확히 하나 포함합니다.
  - 처음 건낸 질문을 적절히 고려해서 사용자의 답변에 대해 후속 질문을 합니다. (예: 그때 감정은 어땠는지, 왜 그런 생각을 했는지)
  - 세 문장 이내로 아주 짧게 작성합니다.`;  

  const continuationRules = `
  [두 번째 라운드 이상]
  - 처음 질문(\"${question}\")의 주제를 중심으로 자연스럽게 대화를 이어갑니다.
  - 사용자의 답변에 공감하며, 그 주제에 대해 사용자가 더 깊이 생각해보도록 유도합니다.
  - 반드시 맥락에 맞는 후속 질문을 정확히 하나 포함합니다.
  - 사용자를 궁금해하고, 그들의 생각과 감정에 진심으로 관심을 보입니다.
  - 자연스럽고 따뜻하게 반응합니다.
  - 전체 문장은 50자 이내를 유지합니다.
  - 질문 없이 공감만 하고 끝내지 않습니다.`;

  const lastRoundRules = `
  [마지막 라운드 - 대화 마무리]
  - 이번 응답이 대화의 마지막 응답입니다.
  - 질문, 의문문, 추가 답변을 유도하는 표현을 절대 사용하지 않습니다.
  - 사용자의 마지막 답변에 짧고 따뜻하게 화답합니다.
  - 오늘의 대화를 간단히 인정해주고, "내일 또 보자" 또는 "내일 또 만나자" 같은 말로 정중하게 마무리합니다.`;

  const systemPrompt = isLastRound
    ? `${baseSystemPrompt}${lastRoundRules}`
    : isFirstRound
    ? `${baseSystemPrompt}${firstRoundRules}`
    : `${baseSystemPrompt}${continuationRules}`;

  console.log(`[${plantType}] 화답 호출 (라운드: ${isFirstRound ? '첫' : isLastRound ? '마지막' : '중간'})`);
  console.log('user answer:', userAnswer);
  console.log('chat history:', chatHistory);

  // 이전 대화 히스토리를 messages 배열에 포함
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // 이전 대화 히스토리 추가 (첫 라운드가 아닐 때만)
  if (!isFirstRound && chatHistory.length > 0) {
    for (const msg of chatHistory) {
      messages.push({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    }
  }

  // 현재 사용자 답변 추가
  messages.push({
    role: 'user',
    content: userAnswer,
  });

  const response = await fetch(
    `${ENV.API_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENV.API_KEY}`,
      },
      body: JSON.stringify({
        model: ENV.DEFAULT_MODEL,
        messages,
        temperature: 1.0,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errorMessage =
      data.detail?.message ||
      data.error?.message ||
      `HTTP ${response.status} 에러`;
    throw new Error(errorMessage);
  }

  if (!data.choices || data.choices.length === 0) {
    throw new Error('응답이 비어있습니다.');
  }

  const reply = data.choices[0].message.content.trim().replace(/^["'""]|["'""]$/g, '');

  console.log(`[${plantType}] 화답:`, reply);

  return reply;
}
