// src/api/styleTransfer.ts
import { ENV, validateReplicateEnv } from '../config/env';

// ─────────────────────────────────────────────
// 스타일 정의 (외부에 노출)
// ─────────────────────────────────────────────

export type StyleId = 'pixel' | '3d';

export type StyleOption = {
  id: StyleId;
  label: string;
};

// UI에서 보여줄 라벨 정보 (프롬프트는 비공개)
export const STYLE_OPTIONS: StyleOption[] = [
  { id: 'pixel', label: '👾 픽셀아트' },
  { id: '3d', label: '🧊 3D' },
];

// ─────────────────────────────────────────────
// 내부 프롬프트 매핑 (이 파일 안에서만 사용)
// ─────────────────────────────────────────────

// 모든 스타일에 공통으로 붙는 배경 지시
const WHITE_BACKGROUND_INSTRUCTION =
  'Replace the entire background with a pure solid white color (#FFFFFF). ' +
  'The plant should be cleanly isolated on a plain white background with no shadows, gradients, or other elements behind it.';

const STYLE_PROMPTS: Record<StyleId, string> = {
  pixel:
    'Transform this into strict low-resolution 8-bit pixel art. ' +
    'The result must look exactly like a classic NES/Famicom game sprite: ' +
    'large clearly visible square pixels, maximum 16 colors total, heavy dithering for shading, ' +
    'zero smooth gradients, zero anti-aliasing, hard blocky edges everywhere. ' +
    'Aggressively simplify all detail — reduce shapes to their most basic pixel forms, as if drawn on a 48×48 or 64×64 pixel canvas and scaled up. ' +
    'Preserve the same objects and composition from the input. Do not add new elements. ' +
    WHITE_BACKGROUND_INSTRUCTION,

  '3d':
    'Transform this plant into an adorable 3D clay-style character. ' +
    'Create a fully visible single plant figure with rounded leaves, thick stems, and simplified organic forms. ' +
    'Use soft matte clay materials, subtle subsurface softness, and toy-like proportions. ' +
    'Apply smooth 3D rendering, gentle shadows, cozy ambient lighting, and cute stylized geometry. ' +
    'The plant should feel like a handcrafted animated figurine or collectible toy. ' +
    'Minimal, clean, playful, and emotionally warm 3D design. ' +
    WHITE_BACKGROUND_INSTRUCTION,
};

// ─────────────────────────────────────────────
// Replicate API 호출
// ─────────────────────────────────────────────

type ReplicatePrediction = {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  urls: { get: string; cancel: string };
};

/**
 * 입력 이미지를 받아서 지정된 스타일로 변환합니다.
 * @param imageBase64DataUrl - "data:image/jpeg;base64,..." 형태의 문자열
 * @param styleId - 변환할 스타일 ID
 */
export async function transferImageStyle(
  imageBase64DataUrl: string,
  styleId: StyleId,
  aspectRatio: string = '1:1',
): Promise<string> {
  validateReplicateEnv();

  // 스타일 ID로 실제 프롬프트 찾기
  const stylePrompt = STYLE_PROMPTS[styleId];
  if (!stylePrompt) {
    throw new Error(`알 수 없는 스타일: ${styleId}`);
  }

  // 1) 변환 작업 시작
  const startResponse = await fetch(
    `${ENV.REPLICATE_BASE_URL}/models/google/nano-banana-pro/predictions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt: stylePrompt,
          image_input: [imageBase64DataUrl],
          aspect_ratio: aspectRatio,
          output_format: 'jpg',
          safety_tolerance: 2,
          resolution: '1K',
          seed: 42,
        },
      }),
    }
  );

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    throw new Error(`Replicate 요청 실패 (${startResponse.status}): ${errorText}`);
  }

  let prediction: ReplicatePrediction = await startResponse.json();
  console.log('초기 상태:', prediction.status);

  // 2) 완료될 때까지 폴링
  const MAX_ATTEMPTS = 60;
  let attempts = 0;

  while (
    (prediction.status === 'starting' || prediction.status === 'processing') &&
    attempts < MAX_ATTEMPTS
  ) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pollResponse = await fetch(prediction.urls.get, {
      headers: {
        'Authorization': `Bearer ${ENV.REPLICATE_API_KEY}`,
      },
    });

    prediction = await pollResponse.json();
    attempts++;
    console.log(`폴링 ${attempts}회: ${prediction.status}`);
  }

  // 3) 결과 처리
  if (prediction.status === 'failed') {
    throw new Error(prediction.error || '이미지 변환에 실패했습니다.');
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(`타임아웃: 최종 상태 = ${prediction.status}`);
  }

  if (!prediction.output) {
    throw new Error('결과 이미지가 없습니다.');
  }

  return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
}


// ─────────────────────────────────────────────
// Step 1: 배경 제거 (rembg)
// ─────────────────────────────────────────────

/**
 * 식물 사진에서 배경을 제거하고 투명 PNG URL을 반환합니다.
 */
export async function removePlantBackground(imageBase64DataUrl: string): Promise<string> {
  validateReplicateEnv();

  const res = await fetch(`${ENV.REPLICATE_BASE_URL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ENV.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc',
      input: {
        image: imageBase64DataUrl,
        background_type: 'rgba',
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`배경 제거 실패 (${res.status}): ${JSON.stringify(data)}`);

  if (data.status === 'starting' || data.status === 'processing') {
    return await pollReplicateResult(data.urls.get);
  }

  const output = data.output;
  if (!output) throw new Error('배경 제거 결과 없음');
  return Array.isArray(output) ? output[0] : output;
}

async function pollReplicateResult(pollUrl: string): Promise<string> {
  const MAX = 30;
  for (let i = 0; i < MAX; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${ENV.REPLICATE_API_KEY}` },
    });
    const data = await res.json();
    if (data.status === 'succeeded') {
      const out = data.output;
      return Array.isArray(out) ? out[0] : out;
    }
    if (data.status === 'failed') throw new Error(data.error ?? '폴링 실패');
  }
  throw new Error('폴링 타임아웃');
}


// ─────────────────────────────────────────────
// Step 2-A: 식물만 스타일 변환 (화분은 건드리지 않음, 레이어 합성용)
// ─────────────────────────────────────────────

const PLANT_ONLY_PROMPT =
  'Convert this plant into strict 8-bit pixel art. ' +
  'STYLE: NES/Famicom sprite style. Hard square pixel edges everywhere. ' +
  'Zero anti-aliasing, zero gradients, zero blur. Maximum 16 colors. ' +
  'Flat color fills with exactly 3 tone levels per area (shadow / base / highlight). ' +
  'Keep the plant\'s natural colors — greens for leaves, brown for stem. ' +
  'LAYOUT: The plant stem base must be placed at the exact bottom-center of the canvas. ' +
  'The stem root touches the very bottom edge. Leaves and branches grow upward from the stem. ' +
  'Center the plant horizontally. Plant fills roughly 75% of canvas height, leaving ~25% at the top. ' +
  'BACKGROUND: solid #F2F2F2. ' +
  'OUTPUT: Plant and stem only — no pot, no soil, no container, no ground line.';

export async function styleTransferPlantOnly(
  plantNoBgUrl: string,
  potStyleBase64DataUrl: string,
): Promise<string> {
  validateReplicateEnv();

  const startResponse = await fetch(
    `${ENV.REPLICATE_BASE_URL}/models/google/nano-banana-pro/predictions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt: PLANT_ONLY_PROMPT,
          image_input: [plantNoBgUrl],
          aspect_ratio: '1:1',
          output_format: 'jpg',
          safety_tolerance: 2,
          resolution: '1K',
          seed: 42,
        },
      }),
    }
  );

  if (startResponse.status === 429) {
    const errData = await startResponse.json().catch(() => ({}));
    const waitSec = (errData.retry_after ?? 10) + 1;
    await new Promise(r => setTimeout(r, waitSec * 1000));
    return styleTransferPlantOnly(plantNoBgUrl, potStyleBase64DataUrl);
  }
  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    throw new Error(`스타일 변환 실패 (${startResponse.status}): ${errorText}`);
  }

  let prediction: ReplicatePrediction = await startResponse.json();
  const MAX = 60;
  let attempts = 0;
  while ((prediction.status === 'starting' || prediction.status === 'processing') && attempts < MAX) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Bearer ${ENV.REPLICATE_API_KEY}` },
    });
    prediction = await poll.json();
    attempts++;
  }
  if (prediction.status !== 'succeeded') throw new Error(`타임아웃: ${prediction.status}`);
  if (!prediction.output) throw new Error('결과 없음');
  return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
}

// Step 2-B: 식물 + 화분 합성 (레거시, 하나의 이미지로)
// ─────────────────────────────────────────────

const COMPOSITE_PROMPT =
  'Image 1 is a pixel art pot/vase — this is the REFERENCE POT. ' +
  'Image 2 is a plant with its background removed — this is the PLANT CONTENT. ' +
  'Task: composite the plant growing naturally out of the pot opening. ' +
  'Scale the plant so its stem base sits exactly at the pot rim, plant fills 50–70% of total image height above the pot. ' +
  'STYLE: strict NES/Famicom 8-bit pixel art throughout. ' +
  'Hard square pixel edges, zero anti-aliasing, zero gradients, zero blur. Maximum 16 colors. ' +
  'Flat fills with 3 shading levels (shadow / base / highlight). ' +
  'Render the pot exactly as it appears in Image 1. ' +
  'Render the plant in pixel art style using its natural colors (green for leaves, brown for stem). ' +
  'Pure white (#FFFFFF) background. No other elements.';

/**
 * 배경 제거된 식물 + 앱 화분을 합성해 단일 정사각 이미지로 반환합니다.
 */
export async function transferWithCustomPot(
  plantNoBgUrl: string,
  potBase64DataUrl: string,
): Promise<string> {
  validateReplicateEnv();

  const startResponse = await fetch(
    `${ENV.REPLICATE_BASE_URL}/models/google/nano-banana-pro/predictions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt: COMPOSITE_PROMPT,
          image_input: [potBase64DataUrl, plantNoBgUrl],
          aspect_ratio: '1:1',
          output_format: 'jpg',
          safety_tolerance: 2,
          resolution: '1K',
          seed: 42,
        },
      }),
    }
  );

  // 429 rate limit 시 retry_after만큼 대기 후 1회 재시도
  if (startResponse.status === 429) {
    const errData = await startResponse.json().catch(() => ({}));
    const waitSec = (errData.retry_after ?? 10) + 1;
    await new Promise(r => setTimeout(r, waitSec * 1000));
    return transferWithCustomPot(plantNoBgUrl, potBase64DataUrl);
  }

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    throw new Error(`Nano Banana Pro 실패 (${startResponse.status}): ${errorText}`);
  }

  let prediction: ReplicatePrediction = await startResponse.json();

  const MAX_ATTEMPTS = 60;
  let attempts = 0;
  while (
    (prediction.status === 'starting' || prediction.status === 'processing') &&
    attempts < MAX_ATTEMPTS
  ) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const pollResponse = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Bearer ${ENV.REPLICATE_API_KEY}` },
    });
    prediction = await pollResponse.json();
    attempts++;
  }

  if (prediction.status === 'failed') throw new Error(prediction.error ?? '이미지 변환 실패');
  if (prediction.status !== 'succeeded') throw new Error(`타임아웃: ${prediction.status}`);
  if (!prediction.output) throw new Error('결과 이미지가 없습니다.');

  return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
}