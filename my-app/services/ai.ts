import { PlantType as AppPlantType } from '../constants/character';
import { generatePlantQuote, generatePlantReply, generateDiarySummary, PlantType as ApiPlantType, QuestionCategory, MemorySummaryInput, PlantReply } from './api/chat';
import { transferImageStyle, StyleId, removePlantBackground, transferWithCustomPot } from './api/styleTransfer';
import { ENV, validateEnv } from './config/env';

export interface PlantFacePosition {
  x: number;         // 0–100, 화분 중심 x (이미지 왼쪽에서 %)
  y: number;         // 0–100, 화분 중심 y (이미지 위쪽에서 %)
  pot_width: number; // 0–100, 화분 너비 (이미지 너비 대비 %)
  pot_height?: number; // 0–100, 화분 높이 (이미지 높이 대비 %)
  pot_left?: number;  // 0–100, 화분 좌측 x 위치
  pot_top?: number;   // 0–100, 화분 상단 y 위치
  pot_right?: number; // 0–100, 화분 우측 x 위치
  pot_bottom?: number; // 0–100, 화분 하단 y 위치
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getFaceOverlayPosition(
  facePos: PlantFacePosition | null | undefined,
  size: number,
): { left: number; top: number; width: number; height: number } {
  const safeFacePos = facePos ?? { x: 50, y: 72, pot_width: 60, pot_height: 55, pot_left: 20, pot_top: 40, pot_right: 80, pot_bottom: 92 };

  const fallbackPotWidth = clamp(safeFacePos.pot_width ?? 60, 25, 85);
  const fallbackPotHeight = clamp(safeFacePos.pot_height ?? fallbackPotWidth * 0.9, 20, 80);
  const fallbackPotLeft = (100 - fallbackPotWidth) / 2;
  const fallbackPotTop = 100 - fallbackPotHeight;

  const potLeft = typeof safeFacePos.pot_left === 'number' ? safeFacePos.pot_left : fallbackPotLeft;
  const potTop = typeof safeFacePos.pot_top === 'number' ? safeFacePos.pot_top : fallbackPotTop;
  const potRight = typeof safeFacePos.pot_right === 'number' ? safeFacePos.pot_right : potLeft + fallbackPotWidth;
  const potBottom = typeof safeFacePos.pot_bottom === 'number' ? safeFacePos.pot_bottom : potTop + fallbackPotHeight;
  const hasPotBounds = potRight > potLeft && potBottom > potTop;
  const potWidth = hasPotBounds ? potRight - potLeft : fallbackPotWidth;
  const potHeight = hasPotBounds ? potBottom - potTop : fallbackPotHeight;
  const faceSize = size * clamp(potWidth, 10, 85) / 100 * 0.95;

  const actualCenterX = (
    hasPotBounds
      ? (potLeft + potRight) / 2
      : safeFacePos.x ?? ((potLeft + potRight) / 2)
  );
  const actualCenterY = hasPotBounds
    ? potTop + potHeight * 0.4
    : safeFacePos.y ?? (potTop + potHeight * 0.4);

  const xPx = clamp(actualCenterX, 0, 100) / 100 * size;
  const yPx = clamp(actualCenterY, 0, 100) / 100 * size;

  return {
    left: xPx - faceSize / 2,
    // Expression PNGs have transparent space above the visible face artwork.
    top: yPx - faceSize * 0.81,
    width: faceSize,
    height: faceSize,
  };
}

const PLANT_TYPE_MAP: Record<AppPlantType, ApiPlantType> = {
  basil: '바질',
  tomato: '방울토마토',
  tulip: '튤립',
};

export async function generateQuestion(
  questionBase: string,
  _plantNickname: string,
  _userNickname: string,
  plantType?: AppPlantType,
  category: QuestionCategory = '오늘의 마음 질문',
  memorySummaries: MemorySummaryInput[] = [],
): Promise<string> {
  try {
    if (plantType) {
      return await generatePlantQuote(PLANT_TYPE_MAP[plantType], questionBase, category, memorySummaries);
    }
    return questionBase;
  } catch (error) {
    console.warn('generateQuestion fallback:', error);
    return questionBase;
  }
}

export async function summarizePlantConversation(
  conversation: string,
  plantType?: AppPlantType,
): Promise<string> {
  if (!plantType) return '특별히 기억할 내용 없음';
  return generateDiarySummary(PLANT_TYPE_MAP[plantType], conversation);
}

interface ChatMessage {
  from: 'plant' | 'user';
  text: string;
}

export async function generatePlantResponse(
  userAnswer: string,
  _plantNickname: string,
  question: string,
  plantType?: AppPlantType,
  isFirstRound: boolean = true,
  isLastRound: boolean = false,
  chatHistory: ChatMessage[] = [],
  isCheckinReply: boolean = false,
  memorySummaries: MemorySummaryInput[] = [],
  isObservationReply: boolean = false,
): Promise<PlantReply> {
  try {
    if (plantType) {
      return await generatePlantReply(
        PLANT_TYPE_MAP[plantType],
        question,
        userAnswer,
        isFirstRound,
        isLastRound,
        chatHistory,
        isCheckinReply,
        memorySummaries,
        isObservationReply,
      );
    }
    const responses = [
      '그렇군요. 오늘도 잘 하셨어요 🌿',
      '말해줘서 고마워요. 잘 들었어요 🌱',
      '그런 날도 있어요. 괜찮아요 🌿',
      '오늘도 함께해줘서 고마워요 🌱',
    ];
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      shouldContinue: false,
      expression: 'default',
    };
  } catch (error) {
    console.warn('generatePlantResponse fallback:', error);
    const fallbackResponses = [
      '그렇군요. 잘 들었어요. 오늘도 수고 많았어요 🌿',
      '그렇게 느꼈군요. 오늘도 잘 해내고 있어요 🌱',
      '그 말 듣고 마음이 조금 가볍게 느껴졌어요. 고마워요 🌿',
      '잘 들어뒀어요. 그 마음도 충분히 중요해요 🌱',
    ];
    return {
      text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      shouldContinue: false,
      expression: 'default',
    };
  }
}

// 생성된 이미지 URL을 받아 Claude 비전으로 식물 얼굴 위치를 분석
export async function analyzeGeneratedImageForFace(imageUrl: string): Promise<PlantFacePosition> {
  validateEnv();

  const response = await fetch(`${ENV.API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ENV.API_KEY}`,
    },
    body: JSON.stringify({
      model: ENV.DEFAULT_MODEL,
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
          {
            type: 'text',
            text: '이 이미지의 실제 화분 경계 박스(pot bounding box)를 먼저 찾으세요. 화분 바닥이나 외곽 테두리 전체가 아니라, 화분 몸통의 앞면 영역만 포함하는 실제 사각형을 기준으로 정중앙을 계산하세요. 이미지를 가로와 세로 각각 0~100으로 정규화해 주세요. 반드시 JSON만 출력하세요: {"x":<화분 실제 중심 x, 왼쪽에서 0-100>,"y":<화분 실제 중심 y, 위에서 0-100>,"pot_left":<화분 왼쪽 경계, 0-100>,"pot_top":<화분 상단 경계, 0-100>,"pot_right":<화분 오른쪽 경계, 0-100>,"pot_bottom":<화분 하단 경계, 0-100>,"pot_width":<화분 가로 너비 0-100>,"pot_height":<화분 앞면 높이 0-100>}. 화분 중심은 (pot_left + pot_right) / 2, (pot_top + pot_bottom) / 2 로 계산해야 하며, 추측이 아니라 실제 화분 영역을 기준으로 계산하세요.',
          },
        ],
      }],
      temperature: 0,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.choices?.[0]) throw new Error('이미지 분석 실패');

  const raw = data.choices[0].message.content.trim();

  // 응답에서 JSON 오브젝트 추출 (모델이 설명 텍스트를 앞뒤에 붙일 수 있음)
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as PlantFacePosition;
    } catch {}
  }

  // 파싱 실패 시 화분 중앙 하단 기본값
  return { x: 50, y: 72, pot_width: 60, pot_height: 55, pot_left: 20, pot_top: 40, pot_right: 80, pot_bottom: 92 };
}

// 입력 이미지에 식물이 있는지 Claude 비전으로 확인 (없으면 false)
async function hasVisiblePlant(imageBase64DataUrl: string): Promise<boolean> {
  try {
    validateEnv();
    const res = await fetch(`${ENV.API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENV.API_KEY}`,
      },
      body: JSON.stringify({
        model: ENV.DEFAULT_MODEL,
        max_tokens: 5,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageBase64DataUrl } },
            { type: 'text', text: 'Does this image contain a visible plant, stem, or leaves? Reply with only "yes" or "no".' },
          ],
        }],
      }),
    });
    const data = await res.json();
    const answer = (data.choices?.[0]?.message?.content ?? 'yes').trim().toLowerCase();
    return !answer.startsWith('no');
  } catch {
    return true; // 판단 불가 시 파이프라인 진행
  }
}

export interface GeneratedPlantResult {
  imageUrl: string;
  facePosition: PlantFacePosition;
}

/**
 * 식물 감지 → rembg 배경 제거 → 화분과 합성 → 화분 얼굴 위치 감지
 * 식물이 없으면 null 반환
 */
export async function updatePlantCharacterWithCustomPot(
  imageBase64DataUrl: string,
  potBase64DataUrl: string,
): Promise<GeneratedPlantResult | null> {
  const plantFound = await hasVisiblePlant(imageBase64DataUrl);
  if (!plantFound) return null;

  const plantNoBgUrl = await removePlantBackground(imageBase64DataUrl);
  const imageUrl = await transferWithCustomPot(plantNoBgUrl, potBase64DataUrl);
  const facePosition = await analyzeGeneratedImageForFace(imageUrl);
  return {
    imageUrl,
    facePosition: {
      ...facePosition,
      pot_left: facePosition.pot_left ?? (100 - (facePosition.pot_width ?? 60)) / 2,
      pot_top: facePosition.pot_top ?? (100 - (facePosition.pot_height ?? 55)),
      pot_right: facePosition.pot_right ?? (facePosition.pot_left ?? (100 - (facePosition.pot_width ?? 60)) / 2) + (facePosition.pot_width ?? 60),
      pot_bottom: facePosition.pot_bottom ?? (facePosition.pot_top ?? (100 - (facePosition.pot_height ?? 55))) + (facePosition.pot_height ?? 55),
      pot_height: facePosition.pot_height ?? (facePosition.pot_width ?? 60) * 0.9,
    },
  };
}

// imageBase64DataUrl: "data:image/jpeg;base64,..." 형태 (expo-image-picker의 base64 옵션으로 직접 획득)
export async function updatePlantCharacter(
  imageBase64DataUrl: string,
  _plantId: string,
  styleId: StyleId = 'pixel',
  aspectRatio: string = '1:1',
): Promise<string> {
  return transferImageStyle(imageBase64DataUrl, styleId, aspectRatio);
}
