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
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, FONTS } from '../constants';
import { PlantType, GrowthStage, Expression, getExpressionImage } from '../constants/character';
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
import { isSupportedTask, isTaskDueFor, isObservationDue, PlantTask, PLANT_TASKS } from '../constants/plants';
import { getPlantMessages, getTaskChoices } from '../constants/chatMessages';
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
import { getGuideItems, GUIDE_TITLE, GUIDE_SUBTITLE, GUIDE_BTN_LABEL, GUIDE_CAMERA_LABEL, GUIDE_EXAMPLE_OPEN } from '../constants/imageGuide';
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
import TopAppBar from '../components/common/TopAppBar';
import Button from '../components/common/Button';
import { PlusPixelIcon, ArrowRightPixelIcon, CheckboxPixelIcon } from '../components/common/PixelIcons';
import Wallpaper, { WALLPAPER_COLOR } from '../components/common/Wallpaper';

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

const choicesFor = getTaskChoices;

// ─── 화면 ─────────────────────────────────────────────────────────
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
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
  // '흙이 촉촉해' 등 오늘은 안 해도 되는 이유를 고른 task (물주기는 water_moist로 기록해 다음 날 재확인)
  const [chatAltTaskIds, setChatAltTaskIds] = useState<string[]>([]);
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
  const [showPhotoFailed, setShowPhotoFailed] = useState(false);   // 캐릭터 생성 실패·식물 미인식 안내
  const [showGuideExample, setShowGuideExample] = useState(false);   // 가이드 사진 예시 펼치기
  const scrollRef = useRef<ScrollView>(null);
  // 콘텐츠(메시지·완료 카드)나 뷰포트(하단 패널 높이)가 바뀔 때마다 맨 아래로
  const scrollToBottom = () => scrollRef.current?.scrollToEnd({ animated: true });
  useEffect(() => {
    const t = setTimeout(scrollToBottom, 150);
    return () => clearTimeout(t);
  }, [phase, messages.length]);

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
    const observationDue = isObservationDue(pType, plantedAt, completedTasks, todayStr, stage);
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
        !isTaskDueFor(pType, stage, t, plantedAt, completedTasks, todayStr)
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
        setMessages(prev => [...prev, { id: newId(), from: 'plant', text: m.taskAsk(task.id, task.label) }]);
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
      memorySummariesRef.current = await storage.getRecentMemorySummaries();

      // 성장 상태 먼저 확인 (task 필터링에 필요)
      const growthState = await getOrInitGrowthState(pType, pAt);
      setPlantStage(growthState.currentStage as GrowthStage);   // 아바타의 대체 이미지는 현재 단계를 따라감

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
          setChatAltTaskIds(draft.chatAltTaskIds ?? []);
          setCanEndConversation(!!draft.canEndConversation);
          setTodayQuestion(draft.todayQuestion ?? '');
          setPhase(skippedTask ? 'task_check' : 'answering');
        } else {
          setMessages(draft.messages ?? []);
          setTasks(draftTasks);
          setTaskIdx(draftTaskIdx);
          setChatDoneTaskIds(draft.chatDoneTaskIds ?? []);
          setChatAltTaskIds(draft.chatAltTaskIds ?? []);
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
              setPlantStage(nextCfg.stage as GrowthStage);
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
      messages, phase, tasks, taskIdx, chatDoneTaskIds, chatAltTaskIds, todayQuestion,
      canEndConversation,
      observationChat: observationChatRef.current,
    });
  }, [messages, phase, canEndConversation, chatAltTaskIds]);

  // ── 성장 단계 확인 답변 ─────────────────────────────────────────
  const handleGrowthConfirm = async (confirmed: boolean) => {
    setPhase('loading');
    const userText  = confirmed ? '네, 됐어요!' : '아직이요';
    let plantText = STAGE_CONFIRM_MESSAGES[plantType].notConfirmed;
    if (confirmed) {
      const state = await getOrInitGrowthState(plantType, new Date().toISOString());
      const nextCfg = getNextStageConfig(plantType, state.currentStage);
      if (nextCfg) { await recordStageEntry(nextCfg.stage); setPlantStage(nextCfg.stage as GrowthStage); }
      // 단계별 전용 문구가 있으면 우선 사용 (예: 큰 화분 안내)
      plantText = nextCfg?.confirmedMessage ?? STAGE_CONFIRM_MESSAGES[plantType].confirmed;
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
      const doneText = choicesFor(task.id).done;
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
      const skipText = choicesFor(task.id).skip;
      setMessages(prev => [...prev, { id: newId(), from: 'user', text: skipText }]);
      const reminderMsg = m.taskSkip(task.label);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: newId(), from: 'plant', text: reminderMsg }]);
        setPhase('water_reminder');
      }, 500);
    }
  };

  // ── 대체 선택 (흙이 촉촉함 / 날씨가 흐림 → 오늘은 하지 않아도 되는 경우, 완료로 기록) ──
  const handleTaskAlt = () => {
    const m = getPlantMessages(plantTypeRef.current);
    const task = tasks[taskIdx];
    const alt = choicesFor(task.id).alt;
    if (!alt) return;
    setPhase('loading');
    // 물주기는 '물 준 날'이 아니므로 water_moist로 기록 → 다음 날 다시 확인. 그 외(햇빛 등)는 완료로 기록
    recordTaskCompletion(task.id === 'water' ? 'water_moist' : task.id);
    setChatAltTaskIds(prev => [...prev, task.id]);
    setMessages(prev => [...prev, { id: newId(), from: 'user', text: alt }]);
    setTimeout(() => {
      const plantText = task.id === 'water' ? m.waterMoist() : m.sunlightCloudy();
      setMessages(prev => [...prev, { id: newId(), from: 'plant', text: plantText }]);
      const next = taskIdx + 1;
      setTaskIdx(next);
      setTimeout(() => startTaskAt(next, tasks, todayQuestion), 500);
    }, 500);
  };

  // ── 알림 선택 (모든 미완료 task 공용) ──────────────────────────
  const handleReminderChoice = (remind: boolean) => {
    const m = getPlantMessages(plantTypeRef.current);
    const userText  = remind ? '알림 받을게요' : '괜찮아요';
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

  const openPlantCamera = async () => {
    await openCamera(true);
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
        // 식물 미인식 → 가이드를 참고해 다시 찍거나 다음에 찍도록 안내 (기존 캐릭터 유지)
        setPendingPhotoUri(null);
        setShowPhotoFailed(true);
      }
    } catch (e) {
      // 생성 실패 → 같은 안내 (기존 캐릭터 유지)
      setPendingPhotoUri(null);
      setShowPhotoFailed(true);
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
      altTaskIds: chatAltTaskIds,
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar showBack showBadge={false} />

      <View style={styles.body}>
        {/* 배경: 키치 체크 월페이퍼 */}
        <Wallpaper />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* 채팅 영역 */}
          <ScrollView
            ref={scrollRef}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
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
                isGrouped={idx > 0 && messages[idx - 1].from === msg.from}
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
                <EmojiText style={styles.doneText}>오늘 기록이 완료됐어요</EmojiText>
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
                <Text style={styles.imagePickerBtnText}>카메라</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imagePickerBtn}
                onPress={async () => {
                  setShowImagePicker(false);
                  await openGallery(false);
                }}
              >
                <Text style={styles.imagePickerBtnText}>갤러리</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 하단 패널: 선택지 + 입력 행 (Figma: 흰 배경, 상단 2px 선) */}
          <View style={[styles.bottomPanel, { paddingBottom: 16 + insets.bottom }]}>
            {phase === 'stage_confirm' && (
              <View style={styles.choiceContainer}>
                <ChoiceBtn onPress={() => handleGrowthConfirm(true)}>네, 됐어요!</ChoiceBtn>
                <ChoiceBtn onPress={() => handleGrowthConfirm(false)}>나중에 줄게!</ChoiceBtn>
              </View>
            )}

            {phase === 'task_check' && tasks[taskIdx] && (
              <View style={styles.choiceContainer}>
                <ChoiceBtn onPress={() => handleTaskChoice(true)}>{choicesFor(tasks[taskIdx].id).done}</ChoiceBtn>
                {choicesFor(tasks[taskIdx].id).alt && (
                  <ChoiceBtn onPress={handleTaskAlt}>{choicesFor(tasks[taskIdx].id).alt as string}</ChoiceBtn>
                )}
                <ChoiceBtn onPress={() => handleTaskChoice(false)}>{choicesFor(tasks[taskIdx].id).skip}</ChoiceBtn>
              </View>
            )}

            {phase === 'water_reminder' && (
              <View style={styles.choiceContainer}>
                <ChoiceBtn onPress={() => handleReminderChoice(true)}>알림 받을게요</ChoiceBtn>
                <ChoiceBtn onPress={() => handleReminderChoice(false)}>괜찮아요</ChoiceBtn>
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
                    <ChoiceBtn onPress={() => { setShowGuideExample(false); setShowGuideModal(true); }}>사진 올리기</ChoiceBtn>
                    <ChoiceBtn onPress={handlePhotoLater}>나중에 찍을게요</ChoiceBtn>
                  </>
                )}
              </View>
            )}

            {/* 입력 행: 항상 표시, 답변 단계에서만 입력 가능 */}
            <View style={[styles.inputRow, hasChoices(phase, tasks[taskIdx]) && styles.inputRowWithChoices]}>
              <TouchableOpacity
                onPress={handlePlusButton}
                disabled={phase !== 'answering'}
                activeOpacity={0.7}
              >
                <Grad colors={['#F3F4F1', '#E2E2E2']} style={styles.addBtn}>
<PlusPixelIcon color="#000" size={12} />
                </Grad>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                editable={phase === 'answering' || phase === 'observing'}
                placeholder="답장하기"
                placeholderTextColor={COLORS.tabTextOff}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSend}
                disabled={!inputText.trim() || !(phase === 'answering' || phase === 'observing')}
                activeOpacity={0.7}
              >
<ArrowRightPixelIcon color="#1D1B20" size={10} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* 사진 촬영 가이드 (바텀 시트) — 설정 팝업과 같은 스타일: 라임 헤더, 반경 10, #303a1e 테두리 */}
      <Modal visible={showGuideModal} transparent animationType="slide" onRequestClose={() => setShowGuideModal(false)}>
        <View style={styles.guideOverlay}>
          <View style={styles.guideSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{GUIDE_TITLE}</Text>
              <TouchableOpacity onPress={() => setShowGuideModal(false)} hitSlop={14}>
                <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <Path d="M2 2L12 12M12 2L2 12" stroke={COLORS.pine} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.guideScroll}
              contentContainerStyle={styles.guideBody}
              showsVerticalScrollIndicator={false}
            >
              {/* 안내 문구 + 예시 버튼(글자 너비에 맞춤, 안내 문구 오른쪽) */}
              <View style={styles.guideTopRow}>
                <Text style={styles.guideSubtitle}>{GUIDE_SUBTITLE}</Text>
                <TouchableOpacity
                  style={styles.exampleBtn}
                  activeOpacity={0.7}
                  onPress={() => setShowGuideExample(true)}
                >
                  <Text style={styles.exampleBtnText}>{GUIDE_EXAMPLE_OPEN}</Text>
                </TouchableOpacity>
              </View>

              {/* 가이드 항목 */}
              <View style={styles.guideList}>
                {getGuideItems(plantType).map((item, i) => (
                  <View key={i} style={styles.guideItem}>
                    <View style={styles.guideIconBox}>
                      <CheckboxPixelIcon color={GUIDE_ICON_COLOR} size={22} />
                    </View>
                    <Text style={styles.guideText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.guideFooter}>
              <Button
                label={GUIDE_CAMERA_LABEL}
                onPress={() => { setShowGuideModal(false); setTimeout(() => openPlantCamera(), 600); }}
              />
              <Button
                label={GUIDE_BTN_LABEL}
                variant="secondary"
                onPress={() => { setShowGuideModal(false); setTimeout(() => openPlantGallery(), 600); }}
              />
            </View>
          </View>

          {/* 사진 예시 팝업 — 화면 중앙 (같은 Modal 안의 오버레이) */}
          {showGuideExample && (
            <View style={styles.exampleOverlay}>
              <View style={styles.exampleCard}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>사진 예시</Text>
                  <TouchableOpacity onPress={() => setShowGuideExample(false)} hitSlop={14}>
                    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                      <Path d="M2 2L12 12M12 2L2 12" stroke={COLORS.pine} strokeWidth={2} strokeLinecap="round" />
                    </Svg>
                  </TouchableOpacity>
                </View>
                <View style={styles.exampleBody}>
                  <Image
                    source={require('../assets/images/guide.png')}
                    style={styles.exampleImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* 캐릭터 생성 실패 · 식물 미인식 안내 (Alert.alert는 웹에서 동작하지 않아 팝업으로 구현) */}
      <Modal visible={showPhotoFailed} transparent animationType="fade" onRequestClose={() => setShowPhotoFailed(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>사진을 다시 찍어주세요</Text>
            </View>
            <View style={styles.previewBody}>
              <Text style={styles.failedText}>
                {'식물을 잘 알아보지 못했어요.\n사진 촬영 가이드를 참고해서\n다시 찍어주세요.'}
              </Text>
              <Button
                label="다시 찍기"
                onPress={() => { setShowPhotoFailed(false); setShowGuideExample(false); setShowGuideModal(true); }}
              />
              <Button
                label="다음에 찍기"
                variant="secondary"
                onPress={() => { setShowPhotoFailed(false); handlePhotoLater(); }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 변환된 캐릭터 프리뷰 (가운데 팝업) — 같은 스타일의 헤더·버튼 */}
      <Modal visible={!!previewPlantUri} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <View style={styles.previewSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>캐릭터가 생성됐어요!</Text>
            </View>
            <View style={styles.previewBody}>
              <View style={{ width: 220, height: 220, alignSelf: 'center' }}>
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
              <Button label="이 캐릭터 사용하기" onPress={handleConfirmCharacter} />
              <Button label="다시 찍기" variant="secondary" onPress={handleRetakePhoto} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 사진 가이드 항목의 체크박스 아이콘 색 (초록으로 통일)
const GUIDE_ICON_COLOR = '#38D76D';

// ─── 선택지 버튼 (Figma: 382x54, 회색 그라디언트, 반경 10) ──────────
function ChoiceBtn({ onPress, children }: { onPress: () => void; children: string }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Grad colors={['#f3f4f1', '#e2e2e2']} style={styles.choiceBtn}>
        <EmojiText style={styles.choiceBtnText}>{children}</EmojiText>
      </Grad>
    </TouchableOpacity>
  );
}

function hasChoices(phase: Phase, task?: PlantTask) {
  return phase === 'stage_confirm' || phase === 'water_reminder' || phase === 'photo_capture'
    || (phase === 'task_check' && !!task);
}

// ─── 말풍선 컴포넌트 ──────────────────────────────────────────────
function MessageBubble({
  message, isGrouped, plantNickname, plantType, plantStage, plantExpression,
  generatedPlantUri, generatedFacePos, onGenImgError,
}: {
  message: Message; isGrouped: boolean; plantNickname: string; plantType: PlantType;
  plantStage: GrowthStage; plantExpression: Expression;
  generatedPlantUri?: string | null;
  generatedFacePos?: { x: number; y: number; pot_width: number } | null;
  onGenImgError?: () => void;
}) {
  const isPlant = message.from === 'plant';

  return (
    <View style={[styles.bubbleRow, isPlant ? styles.bubbleRowLeft : styles.bubbleRowRight, isGrouped && styles.bubbleRowGrouped]}>
      {/* 같은 사람이 연속으로 보낸 메시지는 맨 위 메시지에만 프로필(이미지·이름)을 표시하고, 나머지는 같은 위치에 빈 칸만 둠 */}
      {isPlant && isGrouped && <View style={styles.avatarSpacer} />}
      {isPlant && !isGrouped && (
        <View style={styles.avatarWrap}>
          {generatedPlantUri ? (
            <View style={{ width: 40, height: 40 }}>
              <Image
                source={{ uri: generatedPlantUri }}
                style={{ width: 40, height: 40 }}
                resizeMode="cover"
                onError={onGenImgError}
              />
              {generatedFacePos && (
                <Image
                  source={getExpressionImage(plantType, plantExpression)}
                  style={{
                    position: 'absolute',
                    width: 20, height: 20,
                    left: (generatedFacePos.x / 100) * 40 - 10,
                    top: (generatedFacePos.y / 100) * 40 - 10,
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
                width={37}
              />
            </View>
          )}
        </View>
      )}

      <View style={styles.bubbleColumn}>
        {isPlant && !isGrouped && (
          <Text style={styles.bubbleSender}>{plantNickname || '식물'}</Text>
        )}
        {message.imageUri ? (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.bubbleImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.bubble, isPlant ? styles.bubblePlant : styles.bubbleUser]}>
            <EmojiText style={[styles.bubbleText, !isPlant && styles.bubbleTextUser]}>{message.text}</EmojiText>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.headerBg },   // 상태바 영역까지 라임
  body: { flex: 1, backgroundColor: WALLPAPER_COLOR },
  flex: { flex: 1 },

  // 스크롤: 좌우 16, 날짜 중심 y=117(헤더 아래 38), 말풍선 간격 ~40
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 38, gap: 40, paddingBottom: 24 },

  // 날짜 — 채팅 상단 중앙
  chatDate: {
    textAlign: 'center',
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.green,
    marginBottom: -9,   // 날짜 하단 → 첫 말풍선 31
  },

  // 말풍선 행: 아바타 40 + 간격 13 + 말풍선(최대 317)
  bubbleRow: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  bubbleRowLeft: { alignSelf: 'stretch' },
  bubbleRowRight: { alignSelf: 'flex-end', maxWidth: 317 },

  // 연속 메시지: 위 메시지와의 간격을 40 → 8로 좁힘 (scrollContent gap 40 상쇄)
  bubbleRowGrouped: { marginTop: -32 },
  avatarSpacer: { width: 40, height: 40, flexShrink: 0 },

  bubbleColumn: { flexDirection: 'column', gap: 10, flexShrink: 1, flexGrow: 1 },

  // 아바타 40x40 — small PlantCharacter(100×100)의 얼굴 부분만 클리핑
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
    flexShrink: 0,
  },
  // 캐릭터 캔버스를 위로 18px(−48.6%) 올려 화분·얼굴 부분만 보이게 함 (Figma 크롭)
  avatarInner: {
    marginTop: -18,
  },

  bubble: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 17.5,
    paddingVertical: 12.25,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  bubblePlant: { alignSelf: 'stretch' },
  bubbleUser: { alignSelf: 'flex-end', paddingHorizontal: 10.5 },

  bubbleSender: {
    fontFamily: FONTS.semiBold, fontSize: 17, lineHeight: 16.5,
    letterSpacing: -0.275, color: COLORS.forest,
  },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
  },
  bubbleText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: -0.275,
    color: '#424343',
  },
  bubbleTextUser: { textAlign: 'right' },

  // 완료 카드
  doneCard: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
  },
  doneText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.green },
  doneBtn: {
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    backgroundColor: COLORS.lime,
  },
  doneBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.outline },

  // 하단 패널: 흰 배경 + 상단 2px 선
  bottomPanel: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 2,
    borderTopColor: 'rgba(20,83,45,0.30)',
  },
  // 선택지: 좌우 10, 높이 54, 간격 7
  choiceContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 7,
  },
  choiceBtn: {
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  choiceBtnText: {
    fontFamily: FONTS.semiBold, fontSize: 15, lineHeight: 23,
    letterSpacing: -0.275, color: '#424343',
  },

  // 입력 행: 좌우 16, 버튼 32, 입력창 높이 49
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.5,
    paddingHorizontal: 16,
    marginTop: 13,
  },
  inputRowWithChoices: { marginTop: 27 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    lineHeight: 22,
    color: '#424343',
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lime,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // 인라인 이미지 선택창
  imagePickerBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
    borderTopWidth: 2,
    borderTopColor: 'rgba(20,83,45,0.30)',
  },
  imagePickerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#424343',
  },

  // 변환 로딩
  transformingWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  transformingText: {
    fontFamily: 'SUITE-Bold',
    fontSize: 16,
    color: COLORS.textTertiary,
  },
  transformingSubText: {
    fontFamily: 'SUITE-Regular',
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  // 사진 촬영 가이드 · 캐릭터 프리뷰 (공통 시트 헤더)
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.line,
  },
  sheetTitle: { fontFamily: FONTS.extraBold, fontSize: 18, lineHeight: 26, color: COLORS.outline },

  // 사진 촬영 가이드 (바텀 시트)
  guideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  guideSheet: {
    maxHeight: '90%',
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#303a1e',
    overflow: 'hidden',
  },
  guideScroll: { flexGrow: 0 },
  guideBody: { padding: 20, gap: 16 },
  // 안내 문구(왼쪽) + 예시 버튼(오른쪽, 글자 너비)
  guideTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideSubtitle: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.forest,
    textAlign: 'left',
  },
  // 항목 목록 (박스 없음)
  guideList: { gap: 14 },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guideIconBox: { width: 28, alignItems: 'center', justifyContent: 'center' },
  guideText: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: '#191C1B',
  },
  guideFooter: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 10 },
  // 예시 버튼: 글자 너비에 맞춤 (테두리는 시트의 다른 박스와 같은 1.5px #303a1e)
  exampleBtn: {
    height: 34,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    backgroundColor: COLORS.bg,
  },
  exampleBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.pine },

  // 사진 예시 팝업 (화면 중앙)
  exampleOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  exampleCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    overflow: 'hidden',
  },
  exampleBody: { padding: 16 },
  exampleImage: { width: '100%', height: 280 },

  // 캐릭터 프리뷰 (가운데 팝업)
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSheet: {
    width: 320,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    overflow: 'hidden',
  },
  previewBody: { padding: 20, gap: 12, alignItems: 'stretch' },
  failedText: { fontFamily: FONTS.bold, fontSize: 15, lineHeight: 23, color: COLORS.forest, textAlign: 'center', marginBottom: 4 },
});
