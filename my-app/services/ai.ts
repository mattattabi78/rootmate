import { Asset } from 'expo-asset';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { isPlantType, PlantType as AppPlantType, POT_REFERENCE_IMAGE } from '../constants/character';
import { generatePlantQuote, generatePlantReply, generateDiarySummary, generateReplicateText, PlantReply, PlantType as ApiPlantType, QuestionCategory, MemorySummaryInput } from './api/chat';
import { transferImageStyle, StyleId, removePlantBackground, transferWithCustomPot } from './api/styleTransfer';

export interface PlantFacePosition {
  x: number;         // 0–100, 화분 중심 x (이미지 왼쪽에서 %)
  y: number;         // 0–100, 화분 중심 y (이미지 위쪽에서 %)
  pot_width: number; // 0–100, 화분 너비 (이미지 너비 대비 %)
}

const PLANT_TYPE_MAP: Record<AppPlantType, ApiPlantType> = {
  basil: '바질',
  tomato: '방울토마토',
  marigold: '메리골드',
};

function getSafePlantType(plantType: unknown): AppPlantType {
  return isPlantType(plantType) ? plantType : 'tomato';
}

function buildQuestionFallback(questionBase: string): string {
  return questionBase.trim() || '오늘의 마음을 들려줄래?';
}

export async function generateQuestion(
  questionBase: string,
  _plantNickname: string,
  _userNickname: string,
  plantType?: AppPlantType,
  category: QuestionCategory = '오늘의 마음 질문',
  memorySummaries: MemorySummaryInput[] = [],
): Promise<string> {
  const safeType = getSafePlantType(plantType);
  if (!plantType) return buildQuestionFallback(questionBase);

  try {
    if (!questionBase.trim()) {
      return await generatePlantQuote(
        PLANT_TYPE_MAP[safeType],
        buildQuestionFallback(''),
        category,
        memorySummaries,
      );
    }
    return await generatePlantQuote(PLANT_TYPE_MAP[safeType], questionBase, category, memorySummaries);
  } catch (error) {
    console.warn('generateQuestion fallback:', error);
    return buildQuestionFallback(questionBase);
  }
}

export async function summarizePlantConversation(
  conversation: string,
  plantType?: AppPlantType,
): Promise<string> {
  if (!plantType) return '특별히 기억할 내용 없음';
  if (!conversation.trim()) return '특별히 기억할 내용 없음';
  return generateDiarySummary(PLANT_TYPE_MAP[getSafePlantType(plantType)], conversation);
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
        PLANT_TYPE_MAP[getSafePlantType(plantType)],
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

// 생성된 이미지 URL을 받아 Claude Haiku 4.5로 식물 얼굴 위치를 분석
export async function analyzeGeneratedImageForFace(imageUrl: string): Promise<PlantFacePosition> {
  const raw = await generateReplicateText(
    '이미지에서 화분의 위치를 분석하는 도우미입니다.',
    '정사각형 이미지에서 얼굴 오버레이를 붙일 화분의 앞면 위치를 찾으세요. 화분의 입구·테두리·흙이나 식물이 아니라, 화분 몸통의 평평한 앞면만 기준으로 합니다. x와 y는 화분 내부 기준이 아닌 이미지 전체 캔버스의 좌상단을 기준으로 한 백분율이어야 합니다. x=0은 이미지 왼쪽, x=100은 오른쪽이며 y=0은 위쪽, y=100은 아래쪽입니다. 픽셀 좌표나 화분 기준 상대 좌표를 출력하지 마세요. x와 y는 앞면의 중앙, pot_width는 화분 몸통의 전체 이미지 너비 대비 백분율입니다. 실제 이미지를 측정해 0에서 100 사이의 숫자를 채우세요. 반드시 {"x":<number>,"y":<number>,"pot_width":<number>} 구조의 JSON만 출력하세요.',
    {
      maxTokens: 1024,
      image: imageUrl,
    },
  );

  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed === 'object') {
        const { x, y, pot_width } = parsed as Record<string, unknown>;
        const isPercentage = (value: unknown): value is number =>
          typeof value === 'number'
          && Number.isFinite(value)
          && value >= 0
          && value <= 100;

        if (isPercentage(x) && isPercentage(y)) {
          return {
            x,
            y,
            pot_width: isPercentage(pot_width) ? pot_width : 60,
          };
        }
      }
    } catch {}
  }

  console.warn('Face position analysis returned invalid coordinates; using default coordinates.');
  return { x: 50, y: 72, pot_width: 60 };
}

// 입력 이미지에 식물이 있는지 Claude Haiku 4.5로 확인 (없으면 false)
async function hasVisiblePlant(imageBase64DataUrl: string): Promise<boolean> {
  console.info('[plant-photo] plant detection started');
  try {
    const answer = (await generateReplicateText(
      'You classify images.',
      'Does this image contain a visible plant, stem, or leaves? Reply with only "yes" or "no".',
      {
        maxTokens: 1024,
        image: imageBase64DataUrl,
      },
    )).trim().toLowerCase();
    const found = !answer.startsWith('no');
    console.info(`[plant-photo] plant detection completed: ${found ? 'found' : 'not found'}`);
    return found;
  } catch (error) {
    console.warn('[plant-photo] plant detection failed; continuing without a detection result', error);
    return true; // 판단 불가 시 파이프라인 진행
  }
}

export interface GeneratedPlantResult {
  imageUrl: string;
  facePosition: PlantFacePosition;
}

async function runPlantPhotoStage<T>(stage: string, task: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  console.info(`[plant-photo] ${stage} started`);
  try {
    const result = await task();
    console.info(`[plant-photo] ${stage} completed (${Date.now() - startedAt}ms)`);
    return result;
  } catch (error) {
    console.error(`[plant-photo] ${stage} failed`, error);
    throw error;
  }
}

export async function generatePlantCharacterFromPhoto(photoUri: string): Promise<GeneratedPlantResult | null> {
  const photo = await runPlantPhotoStage('photo preparation', async () => {
    const photoRef = await ImageManipulator.manipulate(photoUri).renderAsync();
    const preparedPhoto = await photoRef.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
    if (!preparedPhoto.base64) throw new Error('선택한 사진을 읽을 수 없습니다.');
    return preparedPhoto;
  });

  const pot = await runPlantPhotoStage('reference pot preparation', async () => {
    const potAsset = Asset.fromModule(POT_REFERENCE_IMAGE);
    await potAsset.downloadAsync();
    if (!potAsset.localUri) throw new Error('화분 기준 이미지를 불러올 수 없습니다.');

    const potRef = await ImageManipulator.manipulate(potAsset.localUri).renderAsync();
    const preparedPot = await potRef.saveAsync({ base64: true, format: SaveFormat.PNG });
    if (!preparedPot.base64) throw new Error('화분 기준 이미지를 읽을 수 없습니다.');
    return preparedPot;
  });

  return updatePlantCharacterWithCustomPot(
    `data:image/jpeg;base64,${photo.base64}`,
    `data:image/png;base64,${pot.base64}`,
  );
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

  const plantNoBgUrl = await runPlantPhotoStage(
    'background removal',
    () => removePlantBackground(imageBase64DataUrl),
  );
  const imageUrl = await runPlantPhotoStage(
    'plant and pot composition',
    () => transferWithCustomPot(plantNoBgUrl, potBase64DataUrl),
  );
  const facePosition = await runPlantPhotoStage(
    'face position analysis',
    () => analyzeGeneratedImageForFace(imageUrl),
  );
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
