import { PlantType as AppPlantType } from '../constants/character';
import { generatePlantQuote, generatePlantReply, PlantType as ApiPlantType } from './api/chat';
import { transferImageStyle, StyleId, removePlantBackground, transferWithCustomPot } from './api/styleTransfer';
import { ENV, validateEnv } from './config/env';

export interface PlantFacePosition {
  x: number;         // 0–100, 화분 중심 x (이미지 왼쪽에서 %)
  y: number;         // 0–100, 화분 중심 y (이미지 위쪽에서 %)
  pot_width: number; // 0–100, 화분 너비 (이미지 너비 대비 %)
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
): Promise<string> {
  if (plantType) {
    return generatePlantQuote(PLANT_TYPE_MAP[plantType], questionBase);
  }
  return questionBase;
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
): Promise<string> {
  if (plantType) {
    return generatePlantReply(PLANT_TYPE_MAP[plantType], question, userAnswer, isFirstRound, isLastRound, chatHistory);
  }
  const responses = [
    '그렇군요. 오늘도 잘 하셨어요 🌿',
    '말해줘서 고마워요. 잘 들었어요 🌱',
    '그런 날도 있어요. 괜찮아요 🌿',
    '오늘도 함께해줘서 고마워요 🌱',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
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
            text: '이 이미지에서 화분(pot) 앞면의 시각적 정중앙을 찾아주세요. 화분 바닥·테두리가 아닌 화분 몸통 앞면의 가로·세로 정중앙 지점입니다. 화분 가로 너비도 함께 알려주세요. 반드시 JSON만 출력하세요: {"x":<화분 중심 x, 왼쪽에서 0-100>,"y":<화분 앞면 정중앙 y, 위에서 0-100>,"pot_width":<화분 가로 너비 0-100>}',
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
  return { x: 50, y: 72, pot_width: 60 };
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
  return { imageUrl, facePosition };
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
