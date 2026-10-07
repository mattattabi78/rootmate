// src/config/env.ts
// src/config/env.ts

export const ENV = {
  // Mindlogic (텍스트 + 이미지 생성)
  API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
  API_BASE_URL: 'https://factchat-cloud.mindlogic.ai/v1/gateway',
  DEFAULT_MODEL: process.env.EXPO_PUBLIC_DEFAULT_MODEL ?? 'claude-sonnet-5',

  // Replicate (image-to-image)
  REPLICATE_API_KEY: process.env.EXPO_PUBLIC_REPLICATE_API_KEY ?? '',
  REPLICATE_BASE_URL: 'https://api.replicate.com/v1',
} as const;

export function validateEnv() {
  if (!ENV.API_KEY) {
    throw new Error('Mindlogic API 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
}

export function validateReplicateEnv() {
  if (!ENV.REPLICATE_API_KEY) {
    throw new Error('Replicate API 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
}