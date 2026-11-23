// src/config/env.ts

export const ENV = {
  REPLICATE_BASE_URL: process.env.EXPO_PUBLIC_REPLICATE_BASE_URL ?? '',

  // Replicate (chat, summaries, and generated-image analysis)
  REPLICATE_CHAT_API_KEY: process.env.EXPO_PUBLIC_REPLICATE_CHAT_API_KEY ?? '',
  REPLICATE_CHAT_MODEL: process.env.EXPO_PUBLIC_REPLICATE_CHAT_MODEL ?? '',

  // Replicate (image generation)
  REPLICATE_IMAGE_API_KEY: process.env.EXPO_PUBLIC_REPLICATE_IMAGE_API_KEY ?? '',
  REPLICATE_IMAGE_MODEL: process.env.EXPO_PUBLIC_REPLICATE_IMAGE_MODEL ?? '',
  REPLICATE_BACKGROUND_REMOVAL_VERSION: process.env.EXPO_PUBLIC_REPLICATE_BACKGROUND_REMOVAL_VERSION ?? '',
} as const;

export function validateReplicateChatEnv() {
  if (!ENV.REPLICATE_CHAT_API_KEY) {
    throw new Error('Replicate CHAT API 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  if (!ENV.REPLICATE_CHAT_MODEL) {
    throw new Error('Replicate CHAT 모델이 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  if (!ENV.REPLICATE_BASE_URL) {
    throw new Error('Replicate API 주소가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
}

export function validateReplicateImageEnv() {
  if (!ENV.REPLICATE_IMAGE_API_KEY) {
    throw new Error('Replicate IMAGE API 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  if (!ENV.REPLICATE_IMAGE_MODEL) {
    throw new Error('Replicate IMAGE 모델이 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  if (!ENV.REPLICATE_BASE_URL) {
    throw new Error('Replicate API 주소가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
}

export function validateReplicateBackgroundRemovalEnv() {
  validateReplicateImageEnv();
  if (!ENV.REPLICATE_BACKGROUND_REMOVAL_VERSION) {
    throw new Error('Replicate 배경 제거 모델 버전이 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
}