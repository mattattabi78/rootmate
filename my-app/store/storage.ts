import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantData } from '../constants/plants';
import { getLocalDateString } from '../utils/date';

export interface DailyRecord {
  date: string;            // 'YYYY-MM-DD'
  waterDone: boolean;
  completedTaskIds?: string[];  // 오늘 완료한 task id 목록
  recordDone: boolean;     // 사진 기록 완료
  question: string;        // 오늘 노출된 질문 텍스트
  answer: string;          // 유저 답변 (빈 문자열이면 건너뜀)
  answerImageUri?: string; // 이미지로 답변한 경우
  skippedQuestion: boolean;
  plantPhotoUri?: string;  // 오늘 찍은 식물 사진 (AI 생성용)
  aiReply?: string;        // AI가 생성한 답변 텍스트
  conversationSummary?: string; // 오늘 대화 전체 요약
}

export interface MemorySummary {
  date: string;
  summary: string;
}

export const KEYS = {
  ONBOARDING_COMPLETE: '@plant/onboarding_complete',
  ONBOARDING_STEP:     '@plant/onboarding_step',
  USER_NICKNAME:       '@plant/user_nickname',
  PLANT_DATA:          '@plant/plant_data',
  TOTAL_SEEDS:         '@plant/total_seeds',
  STREAK_COUNT:        '@plant/streak_count',
  LAST_RECORD_DATE:    '@plant/last_record_date',
  FIRST_RECORD_DATE:   '@plant/first_record_date',
  QUESTION_INDEX:      '@plant/question_index',
  DEEP_Q_INDEX:        '@plant/deep_q_index',
  DAILY_RECORD:        (date: string) => `@plant/record_${date}`,
  MEMORY_SUMMARY:      (date: string) => `@rootmate/memory_summary_${date}`,
  MEMORY_ENABLED:      '@rootmate/memory_enabled',
  PLANT_PHOTOS:        (date: string) => `@plant/photos_${date}`,
  CHAT_DRAFT:          (date: string) => `@plant/chat_draft_${date}`,
  GROWTH_STATE:           '@rootmate/growth_state',
  LAST_STAGE_CHECK:       '@rootmate/last_stage_check',
  GENERATED_PLANT_URI:    '@plant/generated_plant_uri',
  GENERATED_FACE_POS:     '@plant/generated_face_pos',
  LAST_STREAK_SHOWN_DATE: '@plant/last_streak_shown_date',
};

export const storage = {
  // 온보딩
  async isOnboardingComplete(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
    return val === 'true';
  },
  async completeOnboarding(): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
  },
  async saveOnboardingStep(step: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING_STEP, String(step));
  },
  async getOnboardingStep(): Promise<number | null> {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_STEP);
    return val ? parseInt(val, 10) : null;
  },

  // 유저
  async saveNickname(nickname: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.USER_NICKNAME, nickname);
  },
  async getNickname(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.USER_NICKNAME);
  },

  // 식물
  async savePlantData(data: PlantData): Promise<void> {
    await AsyncStorage.setItem(KEYS.PLANT_DATA, JSON.stringify(data));
  },
  async getPlantData(): Promise<PlantData | null> {
    const raw = await AsyncStorage.getItem(KEYS.PLANT_DATA);
    return raw ? (JSON.parse(raw) as PlantData) : null;
  },
  async updatePlantData(partial: Partial<PlantData>): Promise<void> {
    const current = await storage.getPlantData();
    if (!current) return;
    await storage.savePlantData({ ...current, ...partial });
  },

  // 씨앗
  async getTotalSeeds(): Promise<number> {
    const val = await AsyncStorage.getItem(KEYS.TOTAL_SEEDS);
    return val ? parseInt(val, 10) : 0;
  },
  async addSeeds(count: number): Promise<void> {
    const current = await storage.getTotalSeeds();
    await AsyncStorage.setItem(KEYS.TOTAL_SEEDS, String(current + count));
  },

  // 연속 기록
  async getStreakCount(): Promise<number> {
    const val = await AsyncStorage.getItem(KEYS.STREAK_COUNT);
    return val ? parseInt(val, 10) : 0;
  },
  async setStreakCount(count: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.STREAK_COUNT, String(count));
  },
  async getLastRecordDate(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_RECORD_DATE);
  },
  async setLastRecordDate(date: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_RECORD_DATE, date);
  },
  async getFirstRecordDate(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.FIRST_RECORD_DATE);
  },
  async setFirstRecordDateIfEmpty(date: string): Promise<void> {
    const existing = await AsyncStorage.getItem(KEYS.FIRST_RECORD_DATE);
    if (!existing) await AsyncStorage.setItem(KEYS.FIRST_RECORD_DATE, date);
  },

  // 일일 기록
  async saveDailyRecord(record: DailyRecord): Promise<void> {
    await AsyncStorage.setItem(KEYS.DAILY_RECORD(record.date), JSON.stringify(record));
  },
  async getDailyRecord(date: string): Promise<DailyRecord | null> {
    const raw = await AsyncStorage.getItem(KEYS.DAILY_RECORD(date));
    return raw ? (JSON.parse(raw) as DailyRecord) : null;
  },
  async isRecordDoneForDate(date: string): Promise<boolean> {
    const raw = await AsyncStorage.getItem(KEYS.DAILY_RECORD(date));
    return raw !== null;
  },
  async saveMemorySummary(summary: MemorySummary): Promise<void> {
    await AsyncStorage.setItem(KEYS.MEMORY_SUMMARY(summary.date), JSON.stringify(summary));
  },
  async removeMemorySummary(date: string): Promise<void> {
    await AsyncStorage.removeItem(KEYS.MEMORY_SUMMARY(date));
  },
  async getRecentMemorySummaries(limit = 7): Promise<MemorySummary[]> {
    if (!(await storage.isMemoryEnabled())) return [];
    const keys = (await AsyncStorage.getAllKeys())
      .filter(key => key.startsWith('@rootmate/memory_summary_'))
      .sort()
      .reverse()
      .slice(0, limit);
    const values = await AsyncStorage.multiGet(keys);
    return values
      .map(([, raw]) => raw ? JSON.parse(raw) as MemorySummary : null)
      .filter((item): item is MemorySummary => item !== null);
  },
  async getAllMemorySummaries(): Promise<MemorySummary[]> {
    if (!(await storage.isMemoryEnabled())) return [];
    const keys = (await AsyncStorage.getAllKeys())
      .filter(key => key.startsWith('@rootmate/memory_summary_'))
      .sort()
      .reverse();
    const values = await AsyncStorage.multiGet(keys);
    return values
      .map(([, raw]) => raw ? JSON.parse(raw) as MemorySummary : null)
      .filter((item): item is MemorySummary => item !== null);
  },
  async isMemoryEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(KEYS.MEMORY_ENABLED);
    return value !== 'false';
  },
  async setMemoryEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.MEMORY_ENABLED, String(enabled));
    if (!enabled) {
      const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith('@rootmate/memory_summary_'));
      if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    }
  },
  async getRecordedDaysForMonth(year: number, month: number): Promise<number[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const days = new Set<number>();
    for (const key of allKeys) {
      for (const prefix of ['@plant/record_', '@plant/photos_']) {
        if (!key.startsWith(prefix)) continue;
        const dateStr = key.replace(prefix, '');
        if (dateStr.startsWith(monthStr)) {
          const day = parseInt(dateStr.split('-')[2], 10);
          if (!isNaN(day)) days.add(day);
        }
      }
    }
    return [...days].sort((a, b) => a - b);
  },

  // 식물 사진 (AI 생성용, 날짜별)
  async savePlantPhoto(date: string, uri: string): Promise<void> {
    const existing = await storage.getPlantPhotos(date);
    existing.push(uri);
    await AsyncStorage.setItem(KEYS.PLANT_PHOTOS(date), JSON.stringify(existing));
  },
  async getPlantPhotos(date: string): Promise<string[]> {
    const raw = await AsyncStorage.getItem(KEYS.PLANT_PHOTOS(date));
    return raw ? JSON.parse(raw) : [];
  },
  async getDatesWithPhotos(year: number, month: number): Promise<number[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefix  = '@plant/photos_';
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    return allKeys
      .filter(k => k.startsWith(prefix) && k.replace(prefix, '').startsWith(monthStr))
      .map(k => parseInt(k.replace(prefix, '').split('-')[2], 10))
      .filter(d => !isNaN(d));
  },

  // 채팅 draft (미완료 세션 복원용)
  async saveChatDraft(date: string, draft: object): Promise<void> {
    await AsyncStorage.setItem(KEYS.CHAT_DRAFT(date), JSON.stringify(draft));
  },
  async getChatDraft(date: string): Promise<any | null> {
    const raw = await AsyncStorage.getItem(KEYS.CHAT_DRAFT(date));
    return raw ? JSON.parse(raw) : null;
  },
  async clearChatDraft(date: string): Promise<void> {
    await AsyncStorage.removeItem(KEYS.CHAT_DRAFT(date));
  },

  // AI 생성 식물 이미지 (세션 간 유지)
  async saveGeneratedPlant(uri: string, facePos: { x: number; y: number; pot_width: number }): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(KEYS.GENERATED_PLANT_URI, uri),
      AsyncStorage.setItem(KEYS.GENERATED_FACE_POS, JSON.stringify(facePos)),
    ]);
  },
  async getGeneratedPlant(): Promise<{ uri: string; facePos: { x: number; y: number; pot_width: number } } | null> {
    const [uri, posRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.GENERATED_PLANT_URI),
      AsyncStorage.getItem(KEYS.GENERATED_FACE_POS),
    ]);
    if (!uri) return null;
    const facePos = posRaw ? JSON.parse(posRaw) : { x: 50, y: 72, pot_width: 60 };
    return { uri, facePos };
  },
  async clearGeneratedPlant(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.GENERATED_PLANT_URI),
      AsyncStorage.removeItem(KEYS.GENERATED_FACE_POS),
    ]);
  },

  // streak 화면 노출 일자
  async getLastStreakShownDate(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_STREAK_SHOWN_DATE);
  },
  async setLastStreakShownDate(date: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_STREAK_SHOWN_DATE, date);
  },

  // 개발용 리셋
  async clearTodayRecord(): Promise<void> {
    const today = getLocalDateString();
    await AsyncStorage.removeItem(KEYS.DAILY_RECORD(today));
  },
  async resetAll(): Promise<void> {
    await AsyncStorage.clear();
  },

  // 질문 인덱스
  async getQuestionIndex(): Promise<number> {
    const val = await AsyncStorage.getItem(KEYS.QUESTION_INDEX);
    return val ? parseInt(val, 10) : 0;
  },
  async incrementQuestionIndex(): Promise<void> {
    const current = await storage.getQuestionIndex();
    await AsyncStorage.setItem(KEYS.QUESTION_INDEX, String(current + 1));
  },
  async decrementQuestionIndex(): Promise<void> {
    const current = await storage.getQuestionIndex();
    if (current > 0) await AsyncStorage.setItem(KEYS.QUESTION_INDEX, String(current - 1));
  },
  async getDeepQuestionIndex(): Promise<number> {
    const val = await AsyncStorage.getItem(KEYS.DEEP_Q_INDEX);
    return val ? parseInt(val, 10) : 0;
  },
  async incrementDeepQuestionIndex(): Promise<void> {
    const current = await storage.getDeepQuestionIndex();
    await AsyncStorage.setItem(KEYS.DEEP_Q_INDEX, String(current + 1));
  },
};
