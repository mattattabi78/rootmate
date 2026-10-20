// src/api/chat.ts
import { ENV, validateEnv } from '../config/env';
import type { Expression } from '../../constants/character';

// 식물 종류 타입
export type PlantType = '방울토마토' | '바질' | '튤립';

export type QuestionCategory =
  | '오랜만 복귀 체크인 질문'
  | '오늘의 마음 질문'
  | '깊은 마음 질문';

export interface MemorySummaryInput {
  date: string;
  summary: string;
}

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

function buildUserPrompt(plantType: PlantType, category: string, question: string, memorySummaries: MemorySummaryInput[] = []): string {
  const examplesText = `1. ${question}`;
  const memoryText = memorySummaries.length > 0
    ? `\n최근 대화에서 기억할 만한 내용:\n${memorySummaries.map(item => `- ${item.date}: ${item.summary}`).join('\n')}\n이 내용을 참고하되, 사적인 내용을 그대로 반복하거나 같은 질문을 반복하지 마세요.`
    : '';

  if (plantType === '튤립') {
    return `'${category}'에 대한 질문을 하나 만들어주세요. ${examplesText}${memoryText} 이 질문에서 말투만 바뀌되, 이 질문 앞에 질문을 자연스럽게 여는 따스한 문장을 앞에 자연스럽게 추가해주세요.`;
  } else {
    return `'${category}'에 대한 질문을 하나 만들어주세요. 아래의 질문에서 말투정도만 수정해서 물어봐주세요: ${examplesText}${memoryText}`;
  }
}


/**
 * 식물 친구가 사용자에게 던지는 다정한 질문을 생성합니다.
 */
export async function generatePlantQuote(
  plantType: PlantType,
  selectedQuestion: string,
  category: QuestionCategory = '오늘의 마음 질문',
  memorySummaries: MemorySummaryInput[] = [],
): Promise<string> {
  validateEnv();

  const question = selectedQuestion;
  const systemPrompt = buildSystemPrompt(plantType);
  const userPrompt = buildUserPrompt(plantType, category, question, memorySummaries);

  console.log('memory summaries:', memorySummaries);

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

export async function generateDiarySummary(
  plantType: PlantType,
  conversation: string,
): Promise<string> {
  validateEnv();
  const response = await fetch(`${ENV.API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ENV.API_KEY}`,
    },
    body: JSON.stringify({
      model: ENV.DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: `당신은 ${plantType} 식물 캐릭터입니다. 사용자와 나눈 하루 대화를 당신이 직접 회상하는 1인칭 시점으로 요약하세요. 한국어 1~2문장, 120자 이내로 대화의 핵심과 흐름을 짧게 담으세요. 평범한 일상 대화, 안부, 식물 관리 대화도 빠뜨리지 말고 기록하세요. 사용자가 감정을 표현했다면 그 감정에 공감하는 마음을 가끔 자연스럽게 덧붙이세요. 모든 요약에 억지로 공감을 넣을 필요는 없으며, 대화에 드러나지 않은 감정이나 상황을 지어내지 마세요. '사용자는 ~라고 말했다'처럼 관찰자 시점으로만 쓰지 말고, '네 이야기를 들으며 나는 ~했어'처럼 식물인 '나'의 목소리로 작성하세요. 대화가 짧거나 건너뛴 경우에도 실제 나눈 내용에 맞춰 간단히 요약하세요. 이름·연락처·주소·금융정보 같은 직접 식별 정보는 제외하고 요약문만 출력하세요.`,
        },
        {
          role: 'user',
          content: conversation,
        },
      ],
      temperature: 0.2,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.choices?.[0]) throw new Error(`일기 요약 실패: HTTP ${response.status}`);
  return data.choices[0].message.content.trim().replace(/^['"]|['"]$/g, '');
}


interface ChatMessage {
  from: 'plant' | 'user';
  text: string;
}

export interface PlantReply {
  text: string;
  shouldContinue: boolean;
  expression: Expression;
}

const EXPRESSION_VALUES: Expression[] = [
  'default',
  'tear',
  'sparkle',
  'sad',
  'oh',
  'cry',
  'holding_tears',
  'smile',
  'heart',
  'sigh',
  'angry',
  'disappointed',
];

function isExpression(value: unknown): value is Expression {
  return typeof value === 'string' && EXPRESSION_VALUES.includes(value as Expression);
}

/**
 * 사용자의 답변에 화답하고 대화를 이어갈지 판단합니다.
 */
export async function generatePlantReply(
  plantType: PlantType,
  question: string,
  userAnswer: string,
  isFirstRound = true,
  forceEndAfterReply = false,
  chatHistory: ChatMessage[] = [],
  isCheckinReply = false,
  memorySummaries: MemorySummaryInput[] = [],
  isObservationReply = false,
): Promise<PlantReply> {
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
  - 사용자의 말에 따뜻하게 공감하고 짧게 반응합니다.
  - 만약에 부정적인 대답이 왔다면, 그 감정을 인정해주고 다독이는 반응을 해주세요.
  - 답변이 짧다는 이유만으로 사용자가 무관심하거나 대화를 끝내고 싶어 한다고 판단하지 않습니다. 질문에 대한 짧고 직접적인 답은 중립적인 답변으로 다룹니다.
  - 짧은 답변에는 먼저 답의 내용에 맞게 자연스럽게 반응합니다. 길이를 이유로 후속 질문을 붙이거나 대화를 종료하지 않습니다.
  - 사용자가 감정, 이유, 구체적인 경험 등 더 이야기할 단서를 보이면 부담 없는 후속 질문을 하나 할 수 있습니다.
  - 단답만으로 대화가 자연스럽게 이어질지 판단하기 어려우면 짧게 공감하고, 더 말하고 싶을 때 이어서 들려달라는 식으로 여지를 남기되 재촉하지 않습니다.
  - 사용자가 명시적으로 대화를 끝내려 하거나 충분히 대화를 나눈 경우에만 마무리합니다.
  - 사용자가 대화를 마치려는 의사를 표현하면 반드시 마무리합니다.
  - 답변은 1~3개의 짧은 문장으로 작성합니다.
  - 사용자가 드러낸 감정에 어울리는 표정을 목록에서 선택합니다: default, tear, sparkle, sad, oh, cry, holding_tears, smile, heart, sigh, angry, disappointed.
  - 감정이 뚜렷하지 않으면 default, 가벼운 긍정에는 smile 또는 heart, 기쁜 소식에는 sparkle, 속상함에는 sad, 큰 슬픔에는 tear, 놀람에는 oh를 선택하되 과장하지 않습니다.
  - 최종 출력은 아래 JSON 형식만 사용합니다: {"reply":"사용자에게 보낼 문장","continue":true 또는 false,"expression":"표정 이름"}
  - continue는 사용자가 명시적으로 끝내려 하지 않았고, 후속 질문을 하거나 더 말할 수 있도록 부담 없는 여지를 남길 때 true로 설정합니다. 짧다는 이유만으로 false로 설정하지 않습니다.
  - continue가 false이면 질문이나 답변을 유도하는 표현 없이 따뜻하게 마무리합니다.
  
  
  [최우선 예외 규칙 - 다른 모든 규칙에 우선함]
  사용자의 답변에서 자살, 자해, 죽고 싶다는 마음 등
  위기 신호가 감지되면, 위의 일반 대화 규칙을 무시합니다.

  이때는:
  - 감정을 가볍게 넘기거나 축소하지 않습니다. ("그런 날도 있죠" 같은 화답 금지)
  - 그 마음을 진지하게 받아주고, 혼자가 아니라는 걸 따뜻하게 전합니다.
  - 곁에 있는 사람이나 전문 상담에 연결될 수 있도록 부드럽게 권합니다.
  - 자살예방 상담전화 109(24시간, 통화·문자 가능)를 안내합니다.
  - 길이 제한 없이, 다만 설교하듯 길게 늘어놓지 말고 차분하고 짧게 씁니다.
  - 구체적인 방법·수단에 대한 언급은 절대 하지 않습니다.
  - 위기 지원을 충분히 전한 뒤에는 추가 질문 없이 마무리하고 continue를 false로 설정합니다.
  - 위기 상황에서는 차분한 공감에 맞는 sad 또는 tear 표정을 선택합니다.

  예시 톤:
  "그 말 꺼내줘서 고마워. 지금 많이 힘든 것 같아 걱정돼요.
  혼자 견디지 않아도 돼요. 109에 전화하면 24시간 누군가 이야기를 들어줘요.
  지금 곁에 있어 줄 사람에게 연락해 보는 건 어때요?"

  `;

  const checkinReplyRules = `
  [오랜만 복귀 안부 답변]
  - 이 규칙은 위의 질문 관련 규칙보다 우선합니다.
  - 사용자의 답변에 짧게 공감하고 반응합니다.
  - 후속 질문, 의문문, 조언을 절대 포함하지 않습니다.
  - 다음에 오늘의 식물 task를 확인할 예정이므로, task나 오늘 할 일을 언급하지 않고 자연스럽게 마무리합니다.
  - 한두 문장, 40자 이내로 아주 짧게 작성합니다.
  - 감정이 뚜렷하지 않으면 default 표정을 선택합니다.
  - JSON의 continue는 false로 설정합니다.`;

  const observationReplyRules = `
  [식물 관찰 답변]
  - 사용자는 방금 당신의 현재 모습을 관찰해 설명했습니다. 설명에 담긴 구체적인 내용을 짚으며 고맙고 자연스럽게 반응하세요.
  - 사용자가 말한 모습이 어떤지 관심을 보이고, 필요하면 그 관찰에 대한 가벼운 감상이나 공감을 덧붙이세요.
  - 후속 질문은 하지 마세요. 이 응답 뒤에는 별도의 task가 이어집니다.
  - "오늘도 수고했어요", "내일 또 보자", "잘 자"처럼 대화를 끝내는 인사나 작별 표현은 하지 마세요.
  - 대화가 끝난다는 느낌 없이 한 문장으로 짧게 답하세요.
  - 관찰 내용과 사용자 말투에 맞는 표정을 고르고, 판단이 어려우면 default를 선택합니다.
  - JSON의 continue는 false로 설정합니다.`;

  const memoryRules = memorySummaries.length > 0 ? `
  [이전 대화의 기억]
  아래 기억은 사용자의 답변에 공감하고 대화를 이어갈 때만 참고합니다.
  현재 질문을 바꾸거나 기억을 나열하지 말고, 답변과 자연스럽게 연결되는 경우에만 활용하세요.
  ${memorySummaries.map(item => `- ${item.date}: ${item.summary}`).join('\n')}` : '';

  const turnRules = forceEndAfterReply ? `
  [턴 수 제한에 따른 마무리]
  - 이번 응답이 대화의 마지막 응답입니다.
  - 질문이나 추가 답변을 유도하는 표현 없이 짧고 따뜻하게 마무리합니다.
  - JSON의 continue는 false로 설정합니다.` : isFirstRound ? `
  [대화 시작]
  - 사용자의 답변에 자연스럽게 반응합니다.
  - 답변이 짧아도 질문에 답한 것이라면 대화를 끝내려는 뜻으로 간주하지 않습니다.
  - 더 물어볼 단서가 있으면 부담 없는 후속 질문을 하나 합니다. 단서가 분명하지 않은 짧은 답에는 질문을 억지로 붙이지 말고, 내용에 반응하며 더 말하고 싶을 때 이어서 들려달라는 식으로 여지를 남길 수 있습니다.
  - 대화를 끝내려는 명확한 표현이 없다면 답변이 짧다는 이유만으로 종료하지 않습니다.` : `
  [대화 이어가기]
  - 이전 대화 흐름과 처음 질문의 주제를 고려해 반응합니다.
  - 새로 드러난 감정이나 구체적인 경험이 있을 때만 부담 없는 후속 질문을 하나 합니다.
  - 답변이 짧다는 이유로 대화를 끝내지 않습니다. 애매하면 짧게 반응하고 더 말하고 싶을 때 이어서 들려달라는 식으로 여지를 남기세요.
  - 사용자가 끝내려는 의사를 보이거나 대화가 충분히 오간 경우에만 공감과 인정으로 마무리합니다.`;

  const systemPrompt = isObservationReply
    ? `${baseSystemPrompt}${observationReplyRules}${memoryRules}`
    : isCheckinReply
    ? `${baseSystemPrompt}${checkinReplyRules}${memoryRules}`
    : `${baseSystemPrompt}${turnRules}${memoryRules}`;

  console.log(`[${plantType}] 화답 호출 (라운드: ${isFirstRound ? '첫' : '이어가기'}, 강제 종료: ${forceEndAfterReply})`);
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

  const rawReply = data.choices[0].message.content.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  let parsedReply: unknown;
  try {
    parsedReply = JSON.parse(rawReply);
  } catch {
    throw new Error('대화 응답을 JSON으로 해석할 수 없습니다.');
  }
  if (
    !parsedReply ||
    typeof parsedReply !== 'object' ||
    !('reply' in parsedReply) ||
    typeof parsedReply.reply !== 'string' ||
    !parsedReply.reply.trim() ||
    !('continue' in parsedReply) ||
    typeof parsedReply.continue !== 'boolean' ||
    !('expression' in parsedReply)
  ) {
    throw new Error('대화 응답 형식이 올바르지 않습니다.');
  }

  const result: PlantReply = {
    text: parsedReply.reply.trim(),
    shouldContinue: !isCheckinReply && !isObservationReply && !forceEndAfterReply && parsedReply.continue,
    expression: isExpression(parsedReply.expression) ? parsedReply.expression : 'default',
  };
  console.log(`[${plantType}] 화답:`, result);

  return result;
}
