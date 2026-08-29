// src/types/chat.ts

export type ChatRole = 'user' | 'assistant' | 'system';

export type Message = {
  role: ChatRole;
  content: string;
};

// API 응답 타입 (필요한 부분만)
export type ChatCompletionResponse = {
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
    };
  }>;
  error?: {
    message: string;
    type?: string;
  };
};