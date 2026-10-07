import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../constants';
import { PlantType, GrowthStage, Expression, growthStageToNumber, getExpressionImage } from '../constants/character';
import PlantCharacter from '../components/common/PlantCharacter';
import { getTodayQuestion, getLongBreakQuestion } from '../services/api/questionPool';
import { usePlantExpression } from '../hooks/usePlantExpression';
import {
  getOrInitGrowthState, recordStageEntry, getDaysSinceStageEntry,
  setPendingConfirmQuestion, wasStageCheckedToday, setLastStageCheckDate,
  recordTaskCompletion, getTodayCompletedTaskIds,
} from '../store/growthStore';
import { getNextStageConfig, AUTO_ADVANCE_MESSAGES, STAGE_CONFIRM_MESSAGES, getActiveTaskIds } from '../constants/growthStages';
import { storage, DailyRecord, MemorySummary } from '../store/storage';
import { isSupportedTask, isTaskDue, isObservationDue, PlantTask, PLANT_TASKS } from '../constants/plants';
import { getPlantMessages } from '../constants/chatMessages';
import { generateQuestion, generatePlantResponse, summarizePlantConversation, updatePlantCharacterWithCustomPot, PlantFacePosition } from '../services/ai';
import { reconstructDayChat } from '../utils/chatHistory';
import * as ImagePicker from 'expo-image-picker';
import { CameraView } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Asset } from 'expo-asset';
import { VASE_IMAGE } from '../constants/character';
import EmojiText from '../components/common/EmojiText';
import { getLocalDateString } from '../utils/date';
import { getKstDayOfWeek, getDevAdjustedDate, getDevChatRounds } from '../utils/devOverrides';
import { scheduleTaskReminder, cancelEveningNotification } from '../utils/notifications';
import { getGuideItems, GUIDE_TITLE, GUIDE_SUBTITLE, GUIDE_BTN_LABEL } from '../constants/imageGuide';
import { persistImageUri } from '../utils/persistImage';

// ─── 그라디언트 ───────────────────────────────────────────────────
let LinearGradient: React.ComponentType<any> | null = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}

function Grad({ colors, style, children }: { colors: string[]; style?: any; children?: React.ReactNode }) {
  if (LinearGradient) {
    return <LinearGradient colors={colors} style={style}>{children}</LinearGradient>;
  }
  return <View style={[style, { backgroundColor: colors[colors.length - 1] }]}>{children}</View>;
}

// ─── 에셋 ─────────────────────────────────────────────────────────
import BackImg from '../assets/images/back-button.svg';

// ─── 타입 ─────────────────────────────────────────────────────────
interface Message {
  id: string;
  from: 'plant' | 'user';
  text: string;
  imageUri?: string;
}

type Phase =
  | 'loading'
  | 'already_done'     // 오늘 이미 완료
  | 'stage_confirm'    // 성장 단계 USER_CONFIRMED 질문 버튼 표시
  | 'task_check'       // 오늘의 task 확인 (task 순서대로)
  | 'observing'        // 식물 관찰 답변 대기
  | 'photo_capture'    // 식물 사진 촬영 대기
  | 'water_reminder'   // 못 했을 때 알림 선택
  | 'reminder_done'    // 알림 설정 후 종료 (기록 미완료)
  | 'answering'        // 마음 건강 질문 답변 중
  | 'done';            // 완료

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
function formatDate(d: Date) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${DAY_NAMES[d.getDay()]})`;
}

let msgId = Date.now();
function newId() { return String(++msgId); }

// ─── 화면 ─────────────────────────────────────────────────────────
export default function ChatScreen() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [plantNickname, setPlantNickname] = useState('');
  const [plantType, setPlantType]         = useState<PlantType>('tomato');
  const plantTypeRef = useRef<PlantType>('tomato');
  const observationChatRef = useRef(false);
  // 오늘 기록은 있지만 미완료 task가 남은 경우 (AI 질문 건너뜀)
  const hasExistingRecordRef = useRef(false);
  const [todayQuestion, setTodayQuestion] = useState('');
  const [longBreakCheckin, setLongBreakCheckin] = useState<string | null>(null);
  const memorySummariesRef = useRef<MemorySummary[]>([]);
  const [tasks, setTasks]               = useState<PlantTask[]>([]);
  const [taskIdx, setTaskIdx]           = useState(0);
  const [chatDoneTaskIds, setChatDoneTaskIds] = useState<string[]>([]);
  const [canEndConversation, setCanEndConversation] = useState(false);
  const [plantStage, setPlantStage]   = useState<GrowthStage>(1);
  const [plantPhotoUri, setPlantPhotoUri] = useState<string | undefined>();
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<{ x: number; y: number; pot_width: number } | null>(null);
  // 식물 사진 변환 프리뷰
  const [isTransforming, setIsTransforming] = useState(false);
  const [previewPlantUri, setPreviewPlantUri] = useState<string | null>(null);
  const [previewFacePos, setPreviewFacePos] = useState<PlantFacePosition | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // 채팅 라운드 관련 state
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds] = useState(() => getDevChatRounds());

  const today = getDevAdjustedDate();
  const todayStr = getLocalDateString(today);
  // KST 기준 요일 (0=일, 3=수)
  const kstDow = getKstDayOfWeek();

  // 표정 훅 — plantType이 확정되기 전엔 'tomato' 기본값으로 시작
  const { expression: plantExpression, setTemporaryExpression } = usePlantExpression(plantType);

  // ── 오늘 task 목록 계산 (daysOfWeek 필터 포함) ────────────────────
  const buildTodayTasks = (
    pType: PlantType,
    stage: number,
    alreadyDoneToday: string[],
    completedTasks: { taskId: string; completedAt: string }[],
    plantedAt: string,
  ): PlantTask[] => {
    const activeIds = getActiveTaskIds(pType, stage);
    const observationDue = isObservationDue(pType, plantedAt, completedTasks, todayStr);
    const observationDay = observationDue || alreadyDoneToday.includes('observe');
    return (PLANT_TASKS[pType] ?? []).filter(t => {
      if (!isSupportedTask(t.id)) return false;
      if (!activeIds.includes(t.id as any)) return false;
      if (t.id === 'sunlight' && observationDay) return false;
      if (t.id === 'observe' && !observationDue) return false;
      if (t.oneTime && completedTasks.some(entry => entry.taskId === t.id)) return false;
      if (alreadyDoneToday.includes(t.id)) return false;
      if (t.daysOfWeek && !t.daysOfWeek.includes(kstDow)) return false;
      if (
        (t.id === 'water' || t.id === 'sunlight' || t.id === 'observe') &&
        !isTaskDue(t, plantedAt, completedTasks, todayStr)
      ) return false;
      return true;
    });
  };

  // ── task 질문 시작 헬퍼 ──────────────────────────────────────────
  const startTaskAt = (idx: number, taskList: PlantTask[], fallbackQuestion: string) => {
    const m = getPlantMessages(plantTypeRef.current);
    if (idx >= taskList.length) {
      // 기록은 있지만 미완료 task를 마저 완료한 경우 → AI 질문 없이 완료
      if (hasExistingRecordRef.current) {
        setPhase('done');
        return;
      }
      setCanEndConversation(true);
      // 잠깐 대기 → 로딩 점 → AI 질문
      setPhase('loading');
      setTimeout(() => {
        const loadingId = newId();
        setMessages(prev => [...prev, { id: loadingId, from: 'plant', text: '.' }]);
        let dots = 1;
        const dotInterval = setInterval(() => {
          dots = (dots % 3) + 1;
          setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: '.'.repeat(dots) } : msg));
        }, 400);
        const questionCategory = kstDow === 0 ? '깊은 마음 질문' : '오늘의 마음 질문';
        generateQuestion(fallbackQuestion, '', '', plantTypeRef.current, questionCategory).then(aiQuestion => {
          clearInterval(dotInterval);
          setTodayQuestion(aiQuestion);
          setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: aiQuestion } : msg));
          setPhase('answering');
          setTemporaryExpression('default', 2000);
        }).catch(() => {
          clearInterval(dotInterval);
          setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: fallbackQuestion } : msg));
          setPhase('answering');
          setTemporaryExpression('default', 2000);
        });
      }, 800);
    } else {
      const task = taskList[idx];
      if (task.id === 'observe') {
        observationChatRef.current = true;
        setCurrentRound(0);
        setMessages(prev => [...prev, { id: newId(), from: 'plant', text: '지금 내 모습 어때?' }]);
        setPhase('observing');
      } else if (task.id === 'photo') {
        setMessages(prev => [...prev, { id: newId(), from: 'plant', text: m.photoAsk }]);
        setPhase('photo_capture');
      } else {
        setMessages(prev => [...prev, { id: newId(), from: 'plant', text: m.taskAsk(task.label) }]);
        setPhase('task_check');
      }
    }
  };

  // ── 초기화 ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [, plantData, qIdx, dqIdx, savedPlant] = await Promise.all([
        storage.getNickname(),
        storage.getPlantData(),
        storage.getQuestionIndex(),
        storage.getDeepQuestionIndex(),
        storage.getGeneratedPlant(),
      ]);
      if (savedPlant) {
        setGeneratedPlantUri(savedPlant.uri);
        setGeneratedFacePos(savedPlant.facePos);
      }

      const pNick = plantData?.nickname ?? '식물';
      const pType = (plantData?.id ?? 'tomato') as PlantType;
      const pAt   = plantData?.adoptedAt ?? new Date().toISOString();
      setPlantNickname(pNick);
      plantTypeRef.current = pType;
      setPlantType(pType);
      if (plantData?.growthStage) setPlantStage(growthStageToNumber(plantData.growthStage));
      memorySummariesRef.current = await storage.getRecentMemorySummaries();

      // 성장 상태 먼저 확인 (task 필터링에 필요)
      const growthState = await getOrInitGrowthState(pType, pAt);

      // 오늘 완료 기록 확인
      const existingRecord = await storage.getDailyRecord(todayStr);
      if (existingRecord) {
        const alreadyDoneIds = await getTodayCompletedTaskIds();
        const pendingTasks   = buildTodayTasks(
          pType,
          growthState.currentStage,
          alreadyDoneIds,
          growthState.completedTasks,
          growthState.plantedAt,
        );

        if (pendingTasks.length === 0) {
          // 모든 task 완료 → 완료 화면
          setMessages(reconstructDayChat(existingRecord, pNick, pType));
          setPhase('already_done');
          return;
        }

        // 미완료 task 남아있음 → task 검사만 진행 (AI 질문 없음)
        hasExistingRecordRef.current = true;
        // fall through to task flow below
      }

      const lastRecordDate = await storage.getLastRecordDate();
      const daysSinceLastRecord = lastRecordDate
        ? Math.floor((new Date(todayStr + 'T00:00:00').getTime() - new Date(lastRecordDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysSinceLastRecord >= 7) {
        const alreadyDoneToday = await getTodayCompletedTaskIds();
        const longBreakTasks = buildTodayTasks(
          pType,
          growthState.currentStage,
          alreadyDoneToday,
          growthState.completedTasks,
          growthState.plantedAt,
        );
        const fallbackQuestion = getTodayQuestion(pNick, new Date(pAt), qIdx, dqIdx);
        setTasks(longBreakTasks);
        setTodayQuestion(fallbackQuestion);

        const longBreakQuestion = await generateQuestion(
          getLongBreakQuestion(pNick),
          '',
          '',
          plantTypeRef.current,
          '오랜만 복귀 체크인 질문',
        ).catch(() => getLongBreakQuestion(pNick));

        setLongBreakCheckin(longBreakQuestion);
        setMessages([{ id: newId(), from: 'plant' as const, text: longBreakQuestion }]);
        setPhase('answering');
        setTemporaryExpression('default', 2000);
        return;
      }

      // draft 복원 (미완료 세션) — hasExistingRecordRef 이미 설정된 상태일 수 있음
      const draft = await storage.getChatDraft(todayStr);
      if (draft) {
        const draftTasks: PlantTask[] = draft.tasks ?? [];
        const draftTaskIdx: number = draft.taskIdx ?? 0;
        observationChatRef.current = !!draft.observationChat;

        if (draft.phase === 'reminder_done') {
          const skippedTask = draftTasks[draftTaskIdx];
          const msgs = [...(draft.messages ?? [])];
          if (skippedTask) {
            const retryMsg = getPlantMessages(pType).taskRetry(skippedTask.label);
            msgs.push({ id: newId(), from: 'plant' as const, text: retryMsg });
          }
          setMessages(msgs);
          setTasks(draftTasks);
          setTaskIdx(draftTaskIdx);
          setChatDoneTaskIds(draft.chatDoneTaskIds ?? []);
          setCanEndConversation(!!draft.canEndConversation);
          setTodayQuestion(draft.todayQuestion ?? '');
          setPhase(skippedTask ? 'task_check' : 'answering');
        } else {
          setMessages(draft.messages ?? []);
          setTasks(draftTasks);
          setTaskIdx(draftTaskIdx);
          setChatDoneTaskIds(draft.chatDoneTaskIds ?? []);
          setCanEndConversation(!!draft.canEndConversation);
          setTodayQuestion(draft.todayQuestion ?? '');
          setPhase(draft.phase ?? 'task_check');
        }
        return;
      }

      // 새 세션 시작 (또는 기록은 있지만 미완료 task가 남은 경우)
      const installDate = plantData?.adoptedAt ? new Date(plantData.adoptedAt) : new Date();
      const fallbackQuestion = getTodayQuestion(pNick, installDate, qIdx, dqIdx);
      setTodayQuestion(fallbackQuestion);
      if (!hasExistingRecordRef.current) setTemporaryExpression('oh', 2000);

      const alreadyChecked = await wasStageCheckedToday();
      const alreadyDone    = await getTodayCompletedTaskIds();
      const todayTaskList  = buildTodayTasks(
        pType,
        growthState.currentStage,
        alreadyDone,
        growthState.completedTasks,
        growthState.plantedAt,
      );
      setTasks(todayTaskList);

      let growthMsg: string | null = null;
      let needConfirm = false;
      let confirmQ: string | undefined;

      if (!alreadyChecked) {
        const nextCfg = getNextStageConfig(pType, growthState.currentStage);
        if (nextCfg) {
          if (nextCfg.triggerCondition === 'DAYS_PASSED') {
            const days = await getDaysSinceStageEntry(growthState.currentStage);
            if (days >= (nextCfg.daysRequired ?? 0)) {
              await recordStageEntry(nextCfg.stage);
              growthMsg = AUTO_ADVANCE_MESSAGES[pType]?.[nextCfg.stage] ?? null;
            }
          } else if (nextCfg.triggerCondition === 'USER_CONFIRMED') {
            const days = await getDaysSinceStageEntry(growthState.currentStage);
            if (days >= (nextCfg.daysRequired ?? 0)) {
              if (!growthState.pendingConfirmQuestion) await setPendingConfirmQuestion(nextCfg.confirmQuestion);
              needConfirm = true;
              confirmQ    = nextCfg.confirmQuestion;
            }
          }
        }
        await setLastStageCheckDate(todayStr);
      } else if (growthState.pendingConfirmQuestion) {
        needConfirm = true;
        confirmQ    = growthState.pendingConfirmQuestion;
      }

      const plantMessages = getPlantMessages(plantTypeRef.current);
      const greetMsg = { id: newId(), from: 'plant' as const, text: plantMessages.greeting(pNick) };

      setMessages([greetMsg]);

      setTimeout(() => {
        if (growthMsg) {
          setMessages(prev => [...prev, { id: newId(), from: 'plant', text: growthMsg! }]);
          setTimeout(() => startTaskAt(0, todayTaskList, fallbackQuestion), 800);
        } else if (needConfirm && confirmQ) {
          setMessages(prev => [...prev, { id: newId(), from: 'plant', text: confirmQ! }]);
          setPhase('stage_confirm');
        } else {
          startTaskAt(0, todayTaskList, fallbackQuestion);
        }
      }, 500);
    })();
  }, []);

  // 스크롤
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // draft 자동 저장 (완료·로딩 제외, reminder_done 포함)
  useEffect(() => {
    if (phase === 'loading' || phase === 'already_done' || phase === 'done' || messages.length === 0) return;
    storage.saveChatDraft(todayStr, {
      messages, phase, tasks, taskIdx, chatDoneTaskIds, todayQuestion,
      canEndConversation,
      observationChat: observationChatRef.current,
    });
  }, [messages, phase, canEndConversation]);

  // ── 성장 단계 확인 답변 ─────────────────────────────────────────
  const handleGrowthConfirm = async (confirmed: boolean) => {
    setPhase('loading');
    const userText  = confirmed ? '네, 됐어요! 🌱' : '아직이요';
    const plantText = confirmed
      ? STAGE_CONFIRM_MESSAGES[plantType].confirmed
      : STAGE_CONFIRM_MESSAGES[plantType].notConfirmed;
    if (confirmed) {
      const state = await getOrInitGrowthState(plantType, new Date().toISOString());
      const nextCfg = getNextStageConfig(plantType, state.currentStage);
      if (nextCfg) await recordStageEntry(nextCfg.stage);
      setTemporaryExpression('sparkle', 3000);
    }
    await setPendingConfirmQuestion(undefined);
    setMessages(prev => [
      ...prev,
      { id: newId(), from: 'user',  text: userText },
      { id: newId(), from: 'plant', text: plantText },
    ]);
    setTimeout(() => startTaskAt(0, tasks, todayQuestion), 800);
  };

  // ── task 선택 (모든 task 공용) ──────────────────────────────────
  const handleTaskChoice = (done: boolean) => {
    const m = getPlantMessages(plantTypeRef.current);
    const task = tasks[taskIdx];
    setPhase('loading');
    if (done) {
      const doneText = task.id === 'water' ? '완료했어요 ✅' : '완료했어요 ✓';
      const newDone  = [...chatDoneTaskIds, task.id];
      setChatDoneTaskIds(newDone);
      recordTaskCompletion(task.id);
      setMessages(prev => [...prev, { id: newId(), from: 'user', text: doneText }]);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: newId(), from: 'plant', text: m.taskDone() }]);
        const next = taskIdx + 1;
        setTaskIdx(next);
        setTimeout(() => startTaskAt(next, tasks, todayQuestion), 500);
      }, 500);
    } else {
      const skipText = task.id === 'water' ? '물 주지 못했어…' : '아직이요';
      setMessages(prev => [...prev, { id: newId(), from: 'user', text: skipText }]);
      const reminderMsg = m.taskSkip(task.label);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: newId(), from: 'plant', text: reminderMsg }]);
        setPhase('water_reminder');
      }, 500);
    }
  };

  // ── 흙 촉촉 선택 (물주기 불필요) ───────────────────────────────
  const handleWaterMoist = () => {
    const m = getPlantMessages(plantTypeRef.current);
    setPhase('loading');
    recordTaskCompletion('water');
    setMessages(prev => [...prev, { id: newId(), from: 'user', text: '흙이 아직 촉촉해요 💧' }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: newId(), from: 'plant', text: m.waterMoist() }]);
      const next = taskIdx + 1;
      setTaskIdx(next);
      setTimeout(() => startTaskAt(next, tasks, todayQuestion), 500);
    }, 500);
  };

  // ── 알림 선택 (모든 미완료 task 공용) ──────────────────────────
  const handleReminderChoice = (remind: boolean) => {
    const m = getPlantMessages(plantTypeRef.current);
    const userText  = remind ? '알림 받을게요 ⏰' : '괜찮아요';
    const plantText = remind ? m.reminderYes() : m.reminderNo();
    if (remind) {
      const skippedTask = tasks[taskIdx];
      if (skippedTask) {
        scheduleTaskReminder(skippedTask.label, plantTypeRef.current).catch(() => {});
      }
    }
    setMessages(prev => [...prev, { id: newId(), from: 'user', text: userText }]);
    setPhase('loading');
    setTimeout(() => {
      setMessages(prev => [...prev, { id: newId(), from: 'plant', text: plantText }]);
      setPhase('reminder_done');
    }, 500);
  };

  const handlePhotoLater = () => {
    setPhase('loading');
    setMessages(prev => [...prev, { id: newId(), from: 'user', text: '나중에 찍을게요' }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: newId(), from: 'plant', text: getPlantMessages(plantTypeRef.current).photoLater() }]);
      const next = taskIdx + 1;
      setTaskIdx(next);
      setTimeout(() => startTaskAt(next, tasks, todayQuestion), 500);
    }, 500);
  };

  const openCamera = async (isPlant: boolean) => {
    try {
      const available = await CameraView.isAvailableAsync();
      if (!available) {
        Alert.alert(
          '카메라를 사용할 수 없어요',
          Platform.OS === 'ios'
            ? 'iOS 시뮬레이터에는 실제 카메라가 없어서 갤러리에서 사진을 선택해야 해요.'
            : '이 기기에서 카메라를 열 수 없어 갤러리에서 사진을 선택해 주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '갤러리 열기', onPress: () => openGallery(isPlant) },
          ],
        );
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한이 필요해요', '카메라 권한을 허용해야 사진을 찍을 수 있어요.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await handlePhotoResult(result.assets[0].uri, isPlant);
      }
    } catch (error) {
      console.warn('Failed to open camera', error);
      Alert.alert(
        '카메라를 열 수 없어요',
        '시뮬레이터나 일부 환경에서는 카메라가 지원되지 않을 수 있어요. 갤러리에서 사진을 선택해 주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '갤러리 열기', onPress: () => openGallery(isPlant) },
        ],
      );
    }
  };

  const openGallery = async (isPlant: boolean) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한이 필요해요', '사진 접근 권한을 허용해야 갤러리에서 선택할 수 있어요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) await handlePhotoResult(result.assets[0].uri, isPlant);
  };

  const openPlantGallery = async () => {
    await openGallery(true);
  };

  const handlePlusButton = () => setShowImagePicker(v => !v);

  // 식물 사진 변환 파이프라인
  const transformPlantPhoto = async (uri: string) => {
    setPendingPhotoUri(uri);
    setIsTransforming(true);
    try {
      const ref = await ImageManipulator.manipulate(uri).renderAsync();
      const resized = await ref.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
      const base64DataUrl = `data:image/jpeg;base64,${resized.base64!}`;

      const vaseAsset = Asset.fromModule(VASE_IMAGE);
      await vaseAsset.downloadAsync();
      const vaseRef = await ImageManipulator.manipulate(vaseAsset.localUri!).renderAsync();
      const vaseSaved = await vaseRef.saveAsync({ base64: true, format: SaveFormat.PNG });
      const potBase64 = `data:image/png;base64,${vaseSaved.base64!}`;

      const result = await updatePlantCharacterWithCustomPot(base64DataUrl, potBase64);
      if (result) {
        const previewUri = await persistImageUri(result.imageUrl);
        setPreviewPlantUri(previewUri);
        setPreviewFacePos(result.facePosition);
      } else {
        // 식물 미인식 → 기본 화분 이미지로 대체
        setPreviewPlantUri(potBase64);
        setPreviewFacePos({ x: 50, y: 72, pot_width: 60 });
      }
    } catch (e) {
      Alert.alert('변환 실패', '다시 시도해주세요.');
      setPendingPhotoUri(null);
    } finally {
      setIsTransforming(false);
    }
  };

  // 변환된 캐릭터 확정
  const handleConfirmCharacter = async () => {
    if (!previewPlantUri || !previewFacePos || !pendingPhotoUri) return;

    const persistUri = await persistImageUri(previewPlantUri);

    await storage.saveGeneratedPlant(persistUri, previewFacePos);
    setGeneratedPlantUri(persistUri);
    setGeneratedFacePos(previewFacePos);
    setPreviewPlantUri(null);
    setPreviewFacePos(null);
    setPendingPhotoUri(null);

    setPlantPhotoUri(pendingPhotoUri);
    await storage.savePlantPhoto(todayStr, pendingPhotoUri);
    setMessages(prev => [...prev, { id: newId(), from: 'user', text: '', imageUri: pendingPhotoUri }]);
    const newDone = [...chatDoneTaskIds, 'photo'];
    setChatDoneTaskIds(newDone);
    recordTaskCompletion('photo');
    setTimeout(() => {
      setMessages(prev => [...prev, { id: newId(), from: 'plant', text: getPlantMessages(plantTypeRef.current).photoUploaded() }]);
      const next = taskIdx + 1;
      setTaskIdx(next);
      setTimeout(() => startTaskAt(next, tasks, todayQuestion), 500);
    }, 500);
  };

  // 다시 찍기 — 프리뷰만 닫고 photo_capture 유지
  const handleRetakePhoto = () => {
    setPreviewPlantUri(null);
    setPreviewFacePos(null);
    setPendingPhotoUri(null);
  };

  // 사진 결과 처리
  const handlePhotoResult = async (uri: string, isPlant: boolean) => {
    if (isPlant) {
      await transformPlantPhoto(uri);
      return;
    }

    // 마음건강 질문 이미지 답변
    setMessages(prev => [...prev, { id: newId(), from: 'user', text: '', imageUri: uri }]);
    setPhase('loading');
    setTemporaryExpression('heart', 3000);
    const loadingId = newId();
    setMessages(prev => [...prev, { id: loadingId, from: 'plant', text: '.' }]);
    let dots = 1;
    const dotInterval = setInterval(() => {
      dots = (dots % 3) + 1;
      setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: '.'.repeat(dots) } : msg));
    }, 400);
    const isLastRound = currentRound === maxRounds - 1;
    // 현재까지의 대화 히스토리를 AI에 전달 (답변 직전까지만)
    const chatHistoryForAI = messages
      .filter(msg => msg.id !== loadingId)
      .map(msg => ({ from: msg.from as 'plant' | 'user', text: msg.text }));
    const aiReply = await generatePlantResponse(
      '[사진으로 답변했어요]',
      plantNickname,
      todayQuestion,
      plantType,
      currentRound === 0,
      isLastRound,
      chatHistoryForAI,
      false,
      memorySummariesRef.current,
    );
    clearInterval(dotInterval);
    setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: aiReply } : msg));
    
    // 라운드 체크: 다음 라운드가 있으면 계속 대화
    const nextRound = currentRound + 1;
    if (nextRound < maxRounds) {
      setCurrentRound(nextRound);
      // 첫 라운드가 아니면 새로운 질문 없이 입력 필드만 활성화
      setTimeout(() => {
        setPhase('answering');
        setTemporaryExpression('default', 2000);
      }, 1000);
    } else {
      // 모든 라운드 완료 - 기록 저장 후 종료
      await saveRecord('[사진으로 답변했어요]', uri, aiReply);
      setTimeout(() => setPhase('done'), 1000);
    }
  };

  // ── 답변 전송 ────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setPhase('loading');
    setMessages(prev => [...prev, { id: newId(), from: 'user', text }]);
    setTemporaryExpression('heart', 3000);
    const loadingId = newId();
    setMessages(prev => [...prev, { id: loadingId, from: 'plant', text: '.' }]);
    let dots = 1;
    const dotInterval = setInterval(() => {
      dots = (dots % 3) + 1;
      setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: '.'.repeat(dots) } : msg));
    }, 400);

    const isLongBreakReply = !!longBreakCheckin;
    const isObservationChat = observationChatRef.current;
    const checkinQuestion = isObservationChat ? '지금 내 모습 어때?' : longBreakCheckin ?? todayQuestion;
    const isLastRound = currentRound === maxRounds - 1;
    const chatHistoryForAI = messages
      .filter(msg => msg.id !== loadingId)
      .map(msg => ({ from: msg.from as 'plant' | 'user', text: msg.text }));
    const aiReply = await generatePlantResponse(
      text,
      plantNickname,
      checkinQuestion,
      plantType,
      currentRound === 0,
      isLongBreakReply ? false : isLastRound,
      chatHistoryForAI,
      isLongBreakReply,
      memorySummariesRef.current,
    );
    clearInterval(dotInterval);
    setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, text: aiReply } : msg));

    if (isLongBreakReply) {
      setLongBreakCheckin(null);
      setTimeout(() => {
        startTaskAt(0, tasks, todayQuestion);
      }, 600);
      return;
    }

    if (isObservationChat) {
      const nextRound = currentRound + 1;
      if (nextRound < maxRounds) {
        setCurrentRound(nextRound);
        setTimeout(() => {
          setPhase('observing');
          setTemporaryExpression('default', 2000);
        }, 1000);
        return;
      }

      observationChatRef.current = false;
      await recordTaskCompletion('observe');
      setChatDoneTaskIds(prev => prev.includes('observe') ? prev : [...prev, 'observe']);
      setCurrentRound(0);
      const next = taskIdx + 1;
      setTaskIdx(next);
      setTimeout(() => startTaskAt(next, tasks, todayQuestion), 700);
      return;
    }

    // 라운드 체크: 다음 라운드가 있으면 계속 대화
    const nextRound = currentRound + 1;
    if (nextRound < maxRounds) {
      setCurrentRound(nextRound);
      setTimeout(() => {
        setPhase('answering');
        setTemporaryExpression('default', 2000);
      }, 1000);
    } else {
      await saveRecord(text, undefined, aiReply);
      setTimeout(() => setPhase('done'), 1000);
    }
  };

  const handleEndConversation = async () => {
    if (phase !== 'answering' || !canEndConversation) return;
    setPhase('loading');
    await saveRecord('');
    setPhase('done');
  };

  // ── 기록 저장 + 연속 관리일 업데이트 ────────────────────────────
  const saveRecord = async (answer: string, answerImageUri?: string, aiReply?: string) => {
    const transcript = messages
      .filter(message => !/^\.+$/.test(message.text.trim()))
      .map(message => {
        const text = message.text.trim() || (message.imageUri ? '[사진]' : '');
        return text ? `${message.from === 'user' ? '사용자' : '식물'}: ${text}` : '';
      })
      .filter(Boolean);
    const lastMessage = [...messages].reverse().find(message =>
      message.text.trim() && !/^\.+$/.test(message.text.trim()) || message.imageUri,
    );
    const answerAlreadyIncluded = lastMessage?.from === 'user' && (
      lastMessage.text === answer || (!!answerImageUri && lastMessage.imageUri === answerImageUri)
    );
    if (answer && !answerAlreadyIncluded) transcript.push(`사용자: ${answer}`);
    if (aiReply) transcript.push(`식물: ${aiReply}`);

    const record: DailyRecord = {
      date: todayStr,
      waterDone: chatDoneTaskIds.includes('water'),
      completedTaskIds: chatDoneTaskIds,
      recordDone: false,
      question: todayQuestion,
      answer,
      answerImageUri,
      plantPhotoUri,
      skippedQuestion: answer === '',
      aiReply,
    };
    await storage.saveDailyRecord(record);
    let conversationSummary: string | undefined;
    try {
      const summary = await summarizePlantConversation(transcript.join('\n'), plantType);
      if (summary && summary !== '특별히 기억할 내용 없음') {
        conversationSummary = summary;
        record.conversationSummary = summary;
        await storage.saveDailyRecord(record);
        if (await storage.isMemoryEnabled()) {
          await storage.saveMemorySummary({ date: todayStr, summary });
        }
      }
    } catch (error) {
      console.warn('diary summary fallback:', error);
    }
    await storage.clearChatDraft(todayStr);
    await storage.setFirstRecordDateIfEmpty(todayStr);
    await storage.incrementQuestionIndex();

    const lastDate = await storage.getLastRecordDate();
    const currentStreak = await storage.getStreakCount();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = getLocalDateString(yesterday);

    if (!lastDate) {
      // 첫 완료
      await storage.setStreakCount(1);
    } else if (lastDate === todayStr) {
      // 오늘 이미 완료(clear 후 재완료) — streak 변경 없음
    } else if (lastDate === yStr) {
      // 연속 달성
      await storage.setStreakCount(currentStreak + 1);
    } else {
      // 연속 끊김
      await storage.setStreakCount(1);
    }
    await storage.setLastRecordDate(todayStr);
    cancelEveningNotification().catch(() => {});
    return conversationSummary;
  };

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* 헤더 — TopAppBar와 동일한 스타일, 좌측에 뒤로가기 추가 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)}
            hitSlop={12}
          >
            <BackImg width={styles.backIcon.width} height={styles.backIcon.height} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RootMate</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* 채팅 영역 */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 날짜 — 채팅 상단 중앙 */}
          <Text style={styles.chatDate}>{formatDate(today)}</Text>

          {messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              plantNickname={plantNickname}
              plantType={plantType}
              plantStage={plantStage}
              plantExpression={plantExpression}
              generatedPlantUri={generatedPlantUri}
              generatedFacePos={generatedFacePos}
              onGenImgError={() => {
                setGeneratedPlantUri(null);
                setGeneratedFacePos(null);
              }}
            />
          ))}
          {phase === 'already_done' && (
            <View style={styles.doneCard}>
              <EmojiText style={styles.doneText}>오늘 기록이 완료됐어요 🌱</EmojiText>
              <TouchableOpacity onPress={() => router.replace('/' as any)} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>홈으로 돌아가기</Text>
              </TouchableOpacity>
            </View>
          )}
          {phase === 'reminder_done' && (
            <View style={styles.doneCard}>
              <TouchableOpacity onPress={() => router.replace('/' as any)} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>홈으로 돌아가기</Text>
              </TouchableOpacity>
            </View>
          )}
          {phase === 'done' && (
            <View style={styles.doneCard}>
              <TouchableOpacity
                onPress={async () => {
                  const lastShown = await storage.getLastStreakShownDate();
                  if (lastShown === todayStr) {
                    router.replace('/' as any);
                  } else {
                    await storage.setLastStreakShownDate(todayStr);
                    router.replace('/streak' as any);
                  }
                }}
                style={styles.doneBtn}
              >
                <Text style={styles.doneBtnText}>홈으로 가기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 선택 버튼 — 마지막 메시지 아래 30px */}
          {phase === 'stage_confirm' && (
            <View style={styles.choiceContainer}>
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnPrimary]} onPress={() => handleGrowthConfirm(true)}>
                <EmojiText style={styles.choiceBtnPrimaryText}>네, 됐어요! 🌱</EmojiText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnSecondary]} onPress={() => handleGrowthConfirm(false)}>
                <Text style={styles.choiceBtnSecondaryText}>나중에 줄게!</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'task_check' && tasks[taskIdx] && (
            <View style={styles.choiceContainer}>
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnPrimary]} onPress={() => handleTaskChoice(true)}>
                <EmojiText style={styles.choiceBtnPrimaryText}>
                  {tasks[taskIdx].id === 'water' ? '완료했어요 ✅' : '완료했어요 ✓'}
                </EmojiText>
              </TouchableOpacity>
              {tasks[taskIdx].id === 'water' && (
                <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnSecondary]} onPress={handleWaterMoist}>
                  <EmojiText style={styles.choiceBtnSecondaryText}>흙이 아직 촉촉해요 💧</EmojiText>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnSecondary]} onPress={() => handleTaskChoice(false)}>
                <EmojiText style={styles.choiceBtnSecondaryText}>
                  {tasks[taskIdx].id === 'water' ? '깜빡했어😢' : '나중에'}
                </EmojiText>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'water_reminder' && (
            <View style={styles.choiceContainer}>
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnPrimary]} onPress={() => handleReminderChoice(true)}>
                <EmojiText style={styles.choiceBtnPrimaryText}>알림 받을게요 ⏰</EmojiText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnSecondary]} onPress={() => handleReminderChoice(false)}>
                <Text style={styles.choiceBtnSecondaryText}>괜찮아요</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'photo_capture' && (
            <View style={styles.choiceContainer}>
              {isTransforming ? (
                <View style={styles.transformingWrap}>
                  <ActivityIndicator size="large" color={COLORS.green} />
                  <Text style={styles.transformingText}>캐릭터를 만들고 있어요...</Text>
                  <Text style={styles.transformingSubText}>약 1분정도 소요될 수 있습니다.</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.choiceBtn, styles.choiceBtnPrimary]}
                    onPress={() => setShowGuideModal(true)}
                    activeOpacity={0.7}
                  >
                    <EmojiText style={styles.choiceBtnPrimaryText}>🖼 갤러리에서 선택</EmojiText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceBtn, styles.choiceBtnSecondary]}
                    onPress={handlePhotoLater}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.choiceBtnSecondaryText}>나중에 찍을게요</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* 인라인 이미지 선택창 */}
        {phase === 'answering' && showImagePicker && (
          <View style={styles.imagePickerBar}>
            <TouchableOpacity
              style={styles.imagePickerBtn}
              onPress={async () => {
                setShowImagePicker(false);
                await openCamera(false);
              }}
            >
              <EmojiText style={styles.imagePickerBtnText}>📸 카메라</EmojiText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imagePickerBtn}
              onPress={async () => {
                setShowImagePicker(false);
                await openGallery(false);
              }}
            >
              <EmojiText style={styles.imagePickerBtnText}>🖼 갤러리</EmojiText>
            </TouchableOpacity>
          </View>
        )}

        {/* 하단 입력창 */}
        {(phase === 'answering' || phase === 'observing') && (
          <View style={styles.inputBar}>
            {phase === 'answering' && (
              <TouchableOpacity style={styles.addBtn} onPress={handlePlusButton}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={phase === 'observing' ? '식물에게 답장하기...' : '답장하기...'}
              placeholderTextColor={COLORS.textTertiary}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}
        {phase === 'answering' && canEndConversation && (
          <TouchableOpacity
            style={styles.endConversationBtn}
            onPress={handleEndConversation}
            activeOpacity={0.7}
          >
            <Text style={styles.endConversationText}>대화 마치기</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      {/* 이미지 업로드 가이드라인 모달 */}
      <Modal visible={showGuideModal} transparent animationType="slide">
        <View style={styles.guideOverlay}>
          <View style={styles.guideSheet}>
            {/* 제목·부제목 */}
            <View style={styles.guidePadded}>
              <Text style={styles.guideTitle}>{GUIDE_TITLE}</Text>
              <Text style={styles.guideSubtitle}>{GUIDE_SUBTITLE}</Text>
            </View>

            {/* 가이드 이미지 — 전체 너비 */}
            <Image
              source={require('../assets/images/guide.png')}
              style={styles.guideImage}
              resizeMode="contain"
            />

            {/* 항목·버튼 */}
            <View style={styles.guidePadded}>
              <View style={styles.guideList}>
                {getGuideItems(plantType).map((item, i) => (
                  <View key={i} style={styles.guideItem}>
                    <EmojiText style={styles.guideEmoji}>{item.emoji}</EmojiText>
                    <Text style={styles.guideText}>{item.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.guideBtn}
                activeOpacity={0.8}
                onPress={() => { setShowGuideModal(false); setTimeout(() => openPlantGallery(), 600); }}
              >
                <Text style={styles.guideBtnText}>{GUIDE_BTN_LABEL}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.guideCancelBtn}
                onPress={() => setShowGuideModal(false)}
              >
                <Text style={styles.guideCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 변환된 캐릭터 프리뷰 모달 */}
      <Modal visible={!!previewPlantUri} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <View style={styles.previewSheet}>
            <Text style={styles.previewTitle}>캐릭터가 생성됐어요!</Text>
            <View style={{ width: 220, height: 220, marginVertical: 20 }}>
              <Image
                source={{ uri: previewPlantUri! }}
                style={{ width: 220, height: 220 }}
                resizeMode="contain"
              />
              {previewFacePos && (
                <Image
                  source={getExpressionImage(plantType, 'sparkle')}
                  style={{
                    position: 'absolute',
                    width: 110, height: 110,
                    left: (previewFacePos.x / 100) * 220 - 55,
                    top:  (previewFacePos.y / 100) * 220 - 55,
                  }}
                  resizeMode="contain"
                />
              )}
            </View>
            <TouchableOpacity style={styles.previewConfirmBtn} onPress={handleConfirmCharacter} activeOpacity={0.8}>
              <Text style={styles.previewConfirmText}>이 캐릭터 사용하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.previewRetakeBtn} onPress={handleRetakePhoto} activeOpacity={0.8}>
              <Text style={styles.previewRetakeText}>다시 찍기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 말풍선 컴포넌트 ──────────────────────────────────────────────
function MessageBubble({
  message, plantNickname, plantType, plantStage, plantExpression,
  generatedPlantUri, generatedFacePos, onGenImgError,
}: {
  message: Message; plantNickname: string; plantType: PlantType;
  plantStage: GrowthStage; plantExpression: Expression;
  generatedPlantUri?: string | null;
  generatedFacePos?: { x: number; y: number; pot_width: number } | null;
  onGenImgError?: () => void;
}) {
  const isPlant = message.from === 'plant';
  const gradColors = isPlant
    ? ['#f3f4f1', '#b5ff22']
    : ['#efefef', '#e2e2e2'];

  return (
    <View style={[styles.bubbleRow, isPlant ? styles.bubbleRowLeft : styles.bubbleRowRight]}>
      {isPlant && (
        <View style={styles.avatarWrap}>
          {generatedPlantUri ? (
            <View style={{ width: 45, height: 45 }}>
              <Image
                source={{ uri: generatedPlantUri }}
                style={{ width: 45, height: 45 }}
                resizeMode="cover"
                onError={onGenImgError}
              />
              {generatedFacePos && (
                <Image
                  source={getExpressionImage(plantType, plantExpression)}
                  style={{
                    position: 'absolute',
                    width: 22, height: 22,
                    left: (generatedFacePos.x / 100) * 45 - 11,
                    top: (generatedFacePos.y / 100) * 45 - 11,
                  }}
                  resizeMode="contain"
                />
              )}
            </View>
          ) : (
            <View style={styles.avatarInner}>
              <PlantCharacter
                plantType={plantType}
                stage={plantStage}
                expression={plantExpression}
                size="small"
                showVase={true}
              />
            </View>
          )}
        </View>
      )}

      <View style={styles.bubbleColumn}>
        {isPlant && (
          <Text style={styles.bubbleSender}>{plantNickname || '식물'}</Text>
        )}
        {message.imageUri ? (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.bubbleImage}
            resizeMode="cover"
          />
        ) : (
          <Grad
            colors={gradColors}
            style={[styles.bubble, isPlant ? styles.bubblePlant : styles.bubbleUser]}
          >
            <EmojiText style={styles.bubbleText}>{message.text}</EmojiText>
          </Grad>
        )}
      </View>
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },

  // 헤더 — TopAppBar와 동일한 높이/배경/보더, 좌하단에 뒤로가기 + 타이틀
  header: {
    height: 61,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.outline,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backIcon: { width: 12, height: 32 },
  headerTitle: { fontFamily: 'ahn2006-B', fontSize: 30, color: COLORS.textPrimary },

  // 스크롤
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 24 },

  // 날짜 — 채팅 상단 중앙
  chatDate: {
    textAlign: 'center',
    fontFamily: 'ahn2006-M',
    fontSize: 20,
    color: COLORS.green,
    marginBottom: 4,
  },

  // 말풍선 행
  bubbleRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bubbleRowLeft: { alignSelf: 'flex-start', maxWidth: '88%' },
  bubbleRowRight: { alignSelf: 'flex-end', maxWidth: '75%' },

  bubbleColumn: { flexDirection: 'column', gap: 4, flexShrink: 1 },

  // 아바타 — small PlantCharacter(100×100)를 50×70으로 클리핑
  avatarWrap: {
    width: 45,
    height: 45,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarInner: {
    marginLeft: -30,
    marginTop: -35,
  },

  bubble: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexShrink: 1,
  },
  bubblePlant: {},
  bubbleUser: {},

  bubbleSender: { fontFamily: 'ahn2006-M', fontSize: 15, color: COLORS.green },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
  },
  bubbleText: {
    fontFamily: 'ahn2006-M',
    fontSize: 18,
    color: COLORS.textPrimary,
    lineHeight: 25,
  },

  // 완료 카드
  doneCard: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    marginTop: 8,
  },
  doneText: { fontFamily: 'ahn2006-M', fontSize: 22, color: COLORS.green },
  doneBtn: {
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.cardBg,
  },
  doneBtnText: { fontFamily: 'ahn2006-M', fontSize: 20, color: COLORS.textPrimary },

  // 선택 버튼 컨테이너 (스크롤 내부)
  choiceContainer: {
    marginTop: 30,
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  choiceBtn: {
    height: 64,
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  choiceBtnPrimary: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.outline,
  },
  choiceBtnPrimaryText: { fontFamily: 'ahn2006-M', fontSize: 18, color: COLORS.textPrimary },
  choiceBtnSecondary: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.outline,
  },
  choiceBtnSecondaryText: { fontFamily: 'ahn2006-M', fontSize: 18, color: COLORS.textPrimary },

  // 입력 바
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.outline,
    backgroundColor: COLORS.bg,
  },
  endConversationBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.bg,
  },
  endConversationText: {
    fontFamily: 'ahn2006-M',
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addBtnText: {
    fontSize: 24,
    color: COLORS.textSecondary,
    lineHeight: 28,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 0,
    fontFamily: 'ahn2006-M',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: COLORS.btnDisabledBg },
  sendArrow: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 22,
    color: '#fff',
    lineHeight: 26,
  },

  // 인라인 이미지 선택창
  imagePickerBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.outline,
  },
  imagePickerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerBtnText: {
    fontFamily: 'ahn2006-M',
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  // 변환 로딩
  transformingWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  transformingText: {
    fontFamily: 'ahn2006-M',
    fontSize: 16,
    color: COLORS.textTertiary,
  },
  transformingSubText: {
    fontFamily: 'Paperlogy-4Regular',
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  // 이미지 업로드 가이드 모달
  guideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  guideSheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    borderBottomWidth: 0,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 16,
    overflow: 'hidden',
  },
  guidePadded: {
    paddingHorizontal: 20,
    gap: 8,
  },
  guideTitle: {
    fontFamily: 'ahn2006-B',
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  guideSubtitle: {
    fontFamily: 'Paperlogy-4Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  guideImage: {
    width: '100%',
    height: 220,
  },
  guideList: { gap: 12 },
  guideItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  guideEmoji: { fontSize: 18, width: 24 },
  guideText: {
    flex: 1,
    fontFamily: 'Paperlogy-4Regular',
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  guideBtn: {
    height: 56,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  guideBtnText: {
    fontFamily: 'ahn2006-B',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  guideCancelBtn: { alignItems: 'center', paddingVertical: 8 },
  guideCancelText: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 14,
    color: COLORS.textTertiary,
  },

  // 캐릭터 프리뷰 모달
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSheet: {
    backgroundColor: COLORS.bg,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    padding: 24,
    alignItems: 'center',
    width: 300,
  },
  previewTitle: {
    fontFamily: 'ahn2006-B',
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  previewConfirmBtn: {
    width: '100%',
    height: 52,
    borderRadius: 9999,
    backgroundColor: COLORS.lime,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  previewConfirmText: {
    fontFamily: 'ahn2006-B',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  previewRetakeBtn: {
    width: '100%',
    height: 52,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRetakeText: {
    fontFamily: 'ahn2006-M',
    fontSize: 18,
    color: COLORS.textTertiary,
  },
});
