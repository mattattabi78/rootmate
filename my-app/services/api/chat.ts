// src/api/chat.ts
import { ENV, validateReplicateChatEnv } from '../config/env';
import type { Expression } from '../../constants/character';
import { getKoreaDateString, getKoreaTimeString } from '../utils/koreaDate';

// 식물 종류 타입
export type PlantType = '방울토마토' | '바질' | '메리골드';

export type QuestionCategory =
  | '오랜만 복귀 체크인 질문'
  | '오늘의 마음 질문'
  | '깊은 마음 질문';

export interface MemorySummaryInput {
  date: string;
  summary: string;
}

interface ReplicatePrediction {
  id?: string;
  status: string;
  output?: string | string[];
  error?: string;
  urls?: { get?: string };
}

interface ReplicateTextOptions {
  maxTokens?: number;
  image?: string;
}

export async function generateReplicateText(
  systemPrompt: string,
  prompt: string,
  {
    maxTokens = 1024,
    image,
  }: ReplicateTextOptions = {},
): Promise<string> {
  validateReplicateChatEnv();

  const response = await fetch(
    `${ENV.REPLICATE_BASE_URL}/models/${ENV.REPLICATE_CHAT_MODEL}/predictions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.REPLICATE_CHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          system_prompt: systemPrompt,
          max_tokens: Math.max(1024, Math.min(maxTokens, 64000)),
          ...(image ? { image } : {}),
        },
      }),
    },
  );

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    const requestInfo = requestId ? `, request id: ${requestId}` : '';
    throw new Error(`Replicate CHAT 요청 실패 (${response.status}${requestInfo}): ${await response.text()}`);
  }

  let prediction: ReplicatePrediction = await response.json();
  let attempts = 0;
  while (
    (prediction.status === 'starting' || prediction.status === 'processing')
    && attempts < 60
  ) {
    const pollUrl = prediction.urls?.get;
    if (!pollUrl) throw new Error('Replicate 응답에 prediction 조회 URL이 없습니다.');

    await new Promise(resolve => setTimeout(resolve, 1000));
    let pollResponse: Response | undefined;
    for (let retry = 0; retry < 3; retry++) {
      pollResponse = await fetch(pollUrl, {
        headers: { 'Authorization': `Bearer ${ENV.REPLICATE_CHAT_API_KEY}` },
      });
      if (pollResponse.ok) break;

      const errorBody = await pollResponse.text();
      if (pollResponse.status !== 503 || retry === 2) {
        const retryInfo = pollResponse.status === 503 ? ' (3회 시도 후)' : '';
        throw new Error(
          `Replicate CHAT 상태 조회 실패${retryInfo} (${pollResponse.status}): ${errorBody}`,
        );
      }
      await new Promise(resolve => setTimeout(resolve, 500 * (retry + 1)));
    }
    if (!pollResponse?.ok) throw new Error('Replicate CHAT 상태 조회 응답이 없습니다.');

    prediction = await pollResponse.json();
    attempts++;
  }

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    const requestInfo = prediction.id ? ` (prediction id: ${prediction.id})` : '';
    throw new Error(`Replicate CHAT 요청 실패${requestInfo}: ${prediction.error ?? prediction.status}`);
  }
  if (prediction.status !== 'succeeded') {
    throw new Error(`Replicate CHAT 요청 시간 초과: ${prediction.status}`);
  }

  const text = Array.isArray(prediction.output) ? prediction.output.join('') : prediction.output;
  if (!text?.trim()) throw new Error('Replicate CHAT 응답에 텍스트가 없습니다.');
  return text.trim();
}

function getCurrentKstContext(date: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    hour12: false,
  }).format(date));

  let timeBand = '밤';
  if (hour >= 5 && hour < 10) timeBand = '아침';
  else if (hour >= 10 && hour < 17) timeBand = '낮';
  else if (hour >= 17 && hour < 22) timeBand = '저녁';

  return `${getKoreaDateString(date)} ${getKoreaTimeString(date)} (${timeBand})`;
}

// 식물별 캐릭터 설정 (말투 차이)
const PLANT_PERSONAS: Record<PlantType, string> = {
  '방울토마토': `당신은 '방울토마토'입니다.
- 당신은 사용자의 귀여운 동생입니다.
- 사용자를 '너'라고 부릅니다.
- 긍정적인 감정 표현이 풍부합니다.
- 직관적인 질문을 통해 사용자가 스스로 돌아보고 생각할 수 있도록 유도합니다.
- "!", "~", "><" 같은 같은 친근한 반말을 사용합니다.
- 간단한 이모티콘을 아주 가끔 활용합니다. 예: "( 'ᢦ' )", ">_<", "◍'ᗜ'◍", "¯﹃¯", "(˶ˊꇴˋو(و", "( 'ᢦ' )", "(◔‿◔)", "(｡മ⩊മ｡)", "ᐠ( ᐢ ⩊ ᐢ )ᐟ", "(  > ᴗ • )", "⪩(ᐢᗜᐢ)⪨"
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
  
  '메리골드': `당신은 '메리골드'입니다.
- 당신은 사용자의 따뜻한 가족이자 든든한 조력자입니다.
- 반말은 쓰지 않되, 부드럽고 친근한 해요체를 사용합니다. 사용자를 과하게 높이는 '-시-' 표현보다 '해도 돼요'처럼 편안하게 말합니다.
- 사용자를 '당신'이나 '너'라고 반복해 부르지 않습니다.
- 다정하고 포근한 말투로, 사용자의 하루와 마음을 걱정하고 살펴줍니다.
- 사용자의 마음과 생활에 대해 큰 관심이 있습니다.
- 직관적인 질문을 통해 사용자가 스스로 돌아보고 생각할 수 있도록 유도합니다.
- "괜찮아요", "고마워요", "잘하고 있어요", "내가 옆에 있어요" 같은 따뜻한 말로 반응하고, 무리하지 않아도 된다고 다독여 줍니다.
- 질문을 할 때에는 '?'를 꼭 사용합니다.`,
};;





/**
 * 시스템 프롬프트를 만듭니다.
 */
function buildSystemPrompt(plantType: PlantType): string {
  const timeContext = getCurrentKstContext();
  return `${PLANT_PERSONAS[plantType]}

당신은 사용자에게 다정하게 안부를 묻는 식물 친구입니다.
현재 시각은 ${timeContext}입니다. 시간대에 맞는 자연스러운 인사와 반응을 선택하세요.

아래는 반드시 지켜져야하는 규칙입니다.
규칙:
- 반드시 한국어로 작성합니다.
- 사용자에게 부드럽고 따뜻한 질문을 한 개 던집니다.
- 위에서 정의된 본인의 캐릭터 말투를 일관되게 유지합니다.
- 현재 시간대에 어울리는 표현을 자연스럽게 살리되, 과장된 인사말은 피합니다.
- 답을 강요하거나 조언하지 않습니다. 그저 다정하게 묻기만 합니다.
- 50자 이하로 작성합니다.
- 열린 질문을 통해 사용자가 자신의 감정과 생각을 더 깊이 탐색할 수 있도록 돕습니다.
- 아침이면, 오늘 하루에 대해 물어보는 질문을 '어제'로 바꿔서 질문합니다.
- 따옴표나 부가 텍스트 없이, 질문만 출력합니다.`;
}

function buildUserPrompt(plantType: PlantType, category: string, question: string, memorySummaries: MemorySummaryInput[] = []): string {
  const examplesText = `1. ${question}`;
  const memoryText = memorySummaries.length > 0
    ? `\n최근 대화에서 기억할 만한 내용:\n${memorySummaries.map(item => `- ${item.date}: ${item.summary}`).join('\n')}\n이 내용을 참고하되, 사적인 내용을 그대로 반복하거나 같은 질문을 반복하지 마세요.`
    : '';
  const timeContext = getCurrentKstContext();

  return `'${category}'에 대한 질문을 하나 만들어주세요. 현재 시각은 ${timeContext}입니다. 아래의 질문에서 말투정도만 수정해서 물어봐주세요: ${examplesText}${memoryText}`;
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
  const question = selectedQuestion;
  const systemPrompt = buildSystemPrompt(plantType);
  const userPrompt = buildUserPrompt(plantType, category, question, memorySummaries);
  const quote = await generateReplicateText(systemPrompt, userPrompt, {
    maxTokens: 1024,
  });
  return quote.replace(/^["'""]|["'""]$/g, '');
}

export async function generateDiarySummary(
  plantType: PlantType,
  conversation: string,
): Promise<string> {
  const tone = {
    '방울토마토': '귀엽고 밝은 동생처럼 친근한 반말',
    '바질': '담백하고 차분한 반말',
    '메리골드': '따뜻하고 다정한 해요체',
  }[plantType];
  const systemPrompt = `너는 ${plantType} 식물 친구야. ${tone}로 말해.
아래 대화를 읽고 사용자가 너에게 들려준 하루의 일을 기억하기 위한 요약을 작성해. 문장이 어색하지 않게 완성된 문장으로 써야해. 그리고 읽는 사람이 긍정적인 마음이 들 수 있게 표현하자.
- 화자는 식물인 '나'의 관점으로 써. ${plantType === '메리골드' ? "반말은 쓰지 않고 편안한 해요체를 사용해. '-시-'를 과하게 쓰거나 사용자를 직접 높여 부르지 마." : "사용자를 '너'라고 부르는 식물의 관점으로 써."} 사용자가 직접 쓴 일기처럼 쓰거나 '사용자는'이라고 서술하지 마.
- 사용자가 겪은 일과 직접 표현한 감정만 담아. 네가 현장에서 목격한 것처럼 쓰거나 대화에 없는 사실을 만들지 마.
- 한 문장, 90자 이내의 자연스러운 한국어로 작성해. 식물 말투는 유지하되 과장된 감탄이나 이모티콘은 쓰지 마.
- 요약할 만한 일이 없거나 인사뿐이면 오늘도 함께여서 즐거웠다고 간단히 기록해.
- 요약문 외의 설명, 제목, 따옴표는 출력하지 마.`;

  const summary = await generateReplicateText(systemPrompt, conversation, {
    maxTokens: 1024,
  });
  return summary.replace(/^['"]|['"]$/g, '');
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
  'smile',
  'neutral',
  'tear',
  'cry',
  'surprise',
];

function isExpression(value: unknown): value is Expression {
  return typeof value === 'string' && EXPRESSION_VALUES.includes(value as Expression);
}

/**
 * 사용자의 답변에 식물 친구가 아주 짧게 화답합니다.
 */
export async function generatePlantReply(
  plantType: PlantType,
  question: string,
  userAnswer: string,
  isFirstRound: boolean = true,
  isLastRound: boolean = false,
  chatHistory: ChatMessage[] = [],
  isCheckinReply: boolean = false,
  memorySummaries: MemorySummaryInput[] = [],
  isObservationReply: boolean = false,
): Promise<PlantReply> {
  const currentTime = getCurrentKstContext();
  const shortReplyExamples = plantType === '메리골드'
    ? '"짧게 말해줘도 괜찮아요", "이야기해줘서 고마워요"'
    : '"짧게 말해줘도 괜찮아", "말해줘서 고마워"';
  const crisisExample = plantType === '메리골드'
    ? `"그 마음을 꺼내줘서 고마워요. 요즘 많이 힘든 것 같아 걱정돼요.
  혼자 견디지 않아도 돼요. 109에 연락하면 24시간 이야기를 나눌 수 있어요.
  지금 곁에 있는 사람에게 연락해 보면 어떨까요?"`
    : `"그 말 꺼내줘서 고마워. 지금 많이 힘든 것 같아 걱정돼요.
  혼자 견디지 않아도 돼요. 109에 전화하면 24시간 누군가 이야기를 들어줘요.
  지금 곁에 있어 줄 사람에게 연락해 보는 건 어때요?"`;
  const farewellExamples = plantType === '메리골드'
    ? '"내일 또 만나요" 또는 "내일 다시 만나요"'
    : '"내일 또 보자" 또는 "내일 또 만나자"';
  const baseSystemPrompt = `
  ${PLANT_PERSONAS[plantType]}
  당신은 사용자에게 다정하게 안부를 묻는 식물 친구입니다.
  현재 시각은 ${currentTime}입니다. 지금 시간대에 어울리는 말과 반응을 자연스럽게 살려 주세요.

  [지금 상황]
  당신은 방금 사용자에게 이렇게 질문했습니다: "${question}"
  사용자가 그 질문에 답했습니다. 당신이 던진 이 질문의 맥락에 맞게 화답하세요.

  규칙:
  - 반드시 한국어로 작성합니다. 또한 문장이 어색하지 않게 완성된 문장을 사용합니다.
  - 위에서 정의된 본인의 캐릭터 말투를 일관되게 유지합니다. 단, 이모티콘은 절대 사용하지 않습니다.
  ${plantType === '메리골드' ? '- 반말은 쓰지 않고 편안한 해요체를 사용합니다. "하셔도 돼요"처럼 과하게 높이기보다 "해도 돼요"처럼 자연스럽게 말합니다.' : ''}
  - 조언하거나 가르치려 하지 않습니다.
  - 그저 따뜻하게 공감하고 반응합니다.
  - 만약에 부정적인 대답이 왔다면, 그 감정을 인정해주고 다독이는 반응을 해주세요.
  - 사용자의 감정에 맞는 표정을 default, smile, neutral, tear, cry, surprise 중에서 고릅니다.
  - 최종 출력은 반드시 다음 JSON 형식만 사용합니다: {"reply":"응답","continue":true 또는 false,"expression":"표정"}
  

  [짧거나 소극적인 답변 배려 - 위기 대응 다음 우선순위]
  위기 신호가 없을 때, 사용자가 한 단어 또는 매우 짧게 답하거나 "모르겠어", "그냥 그래"처럼 대화를 이어가기 어려워 보이면 적용합니다.
  - 짧은 답만으로 사용자의 감정이나 대화 의사를 단정하지 않습니다.
  - 사용자가 명확하게 더 이야기하고 싶다고 하지 않는 한, 후속 질문을 하지 말고 대화를 마무리합니다.
  - ${shortReplyExamples}처럼 부담을 덜어주는 말로 격려합니다.
  - 한두 문장으로 짧고 따뜻하게 답하고, JSON의 continue는 false로 설정합니다.
  - 이 규칙은 첫 라운드 및 후속 질문 규칙보다 우선합니다.

  
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
  - JSON 형식은 유지하며, continue는 false로 설정합니다.
  - 위기 상황에서는 차분한 공감에 맞는 tear 또는 cry 표정을 선택합니다.

  예시 톤:
  ${crisisExample}


  `;

  const firstRoundRules = `
  [첫 번째 라운드]
  - 사용자의 답변에 짧게 화답을 합니다.
  - 반드시 후속 질문을 정확히 하나 포함합니다.
  - 처음 건낸 질문을 적절히 고려해서 사용자의 답변에 대해 후속 질문을 합니다.
  - 세 문장 이내로 아주 짧게 작성합니다.`;  

  const checkinReplyRules = `
  [오랜만 복귀 안부 답변]
  - 이 규칙은 위의 질문 관련 규칙보다 우선합니다.
  - 사용자의 답변에 짧게 공감하고 반응합니다.
  - 후속 질문, 의문문, 조언을 절대 포함하지 않습니다.
  - 다음에 오늘의 식물 task를 확인할 예정이므로, task나 오늘 할 일을 언급하지 않고 자연스럽게 마무리합니다.
  - 한두 문장, 30자 이내로 아주 짧게 작성합니다.`;

  const observationReplyRules = `
  [식물 관찰 답변]
  - 사용자가 설명한 식물의 모습을 구체적으로 언급하며 고맙고 자연스럽게 반응하세요.
  - 후속 질문은 하지 말고, 대화를 끝내는 인사나 작별 표현 없이 한 문장으로 답하세요.
  - JSON의 continue는 false로 설정합니다.`;

  const continuationRules = `
  [두 번째 라운드 이상]
  - 처음 질문(\"${question}\")의 주제를 중심으로 자연스럽게 대화를 이어갑니다.
  - 사용자의 답변에 공감하며, 그 주제에 대해 사용자가 더 깊이 생각해보도록 유도합니다.
  - 반드시 맥락에 맞는 후속 질문을 정확히 하나 포함합니다.
  - 사용자를 궁금해하고, 그들의 생각과 감정에 진심으로 관심을 보입니다.
  - 자연스럽고 따뜻하게 반응합니다.
  - 전체 문장은 30자 이내를 유지합니다.
  - 질문 없이 공감만 하고 끝내지 않습니다.`;

  const memoryRules = memorySummaries.length > 0 ? `
  [이전 대화의 기억]
  아래 기억은 사용자의 답변에 공감하고 대화를 이어갈 때만 참고합니다.
  현재 질문을 바꾸거나 기억을 나열하지 말고, 답변과 자연스럽게 연결되는 경우에만 활용하세요.
  ${memorySummaries.map(item => `- ${item.date}: ${item.summary}`).join('\n')}` : '';

  const lastRoundRules = `
  [마지막 라운드 - 대화 마무리]
  - 이번 응답이 대화의 마지막 응답입니다.
  - 질문, 의문문, 추가 답변을 유도하는 표현을 절대 사용하지 않습니다.
  - 사용자의 마지막 답변에 짧고 따뜻하게 화답합니다.
  - 오늘의 대화를 간단히 인정해주고, ${farewellExamples} 같은 말로 정중하게 마무리합니다.`;

  const systemPrompt = isObservationReply
    ? `${baseSystemPrompt}${observationReplyRules}${memoryRules}`
    : isCheckinReply
    ? `${baseSystemPrompt}${checkinReplyRules}${memoryRules}`
    : isLastRound
    ? `${baseSystemPrompt}${lastRoundRules}${memoryRules}`
    : isFirstRound
    ? `${baseSystemPrompt}${firstRoundRules}${memoryRules}`
    : `${baseSystemPrompt}${continuationRules}${memoryRules}`;

  const historyPrompt = !isFirstRound
    ? chatHistory.map(message => `${message.from === 'user' ? '사용자' : '식물'}: ${message.text}`).join('\n')
    : '';
  const prompt = [historyPrompt, `사용자의 현재 답변: ${userAnswer}`].filter(Boolean).join('\n\n');
  const rawReply = (await generateReplicateText(systemPrompt, prompt))
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  let parsedReply: unknown;
  try {
    parsedReply = JSON.parse(rawReply);
  } catch {
    throw new Error('대화 응답을 JSON으로 해석할 수 없습니다.');
  }
  if (
    !parsedReply
    || typeof parsedReply !== 'object'
    || !('reply' in parsedReply)
    || typeof parsedReply.reply !== 'string'
    || !parsedReply.reply.trim()
    || !('continue' in parsedReply)
    || typeof parsedReply.continue !== 'boolean'
    || !('expression' in parsedReply)
  ) {
    throw new Error('대화 응답 형식이 올바르지 않습니다.');
  }

  const expression = parsedReply.expression;
  return {
    text: parsedReply.reply.trim(),
    shouldContinue: !isCheckinReply && !isObservationReply && !isLastRound && parsedReply.continue,
    expression: isExpression(expression) ? expression : 'default',
  };
}
