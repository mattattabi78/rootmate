import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { PlantFacePosition } from '../services/ai';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { COLORS } from '../constants';
import { storage } from '../store/storage';
import TopAppBar from '../components/common/TopAppBar';
import BottomNavBar from '../components/common/BottomNavBar';
import PlantCharacter from '../components/common/PlantCharacter';
import {
  PlantType, GrowthStage, Expression,
  PLANT_EXPRESSIONS, growthStageToNumber, getExpressionImage,
} from '../constants/character';
import {
  PlantSituation, SITUATION_LABELS, ALL_SITUATIONS,
  getExpressionForSituation,
} from '../constants/expressions';
import { usePlantExpression } from '../hooks/usePlantExpression';
import { useGrowthManager } from '../hooks/useGrowthManager';
import { getStageConfig, getMaxStage } from '../constants/growthStages';
import { pickSubHeading } from '../constants/notifications';
import EmojiText from '../components/common/EmojiText';
import { getLocalDateString } from '../utils/date';
import { setDevDayOfWeek, advanceDevDay, resetDevDateOffset, getDevAdjustedDate, getDevDateOffsetDays, setDevChatRounds, getDevChatRounds } from '../utils/devOverrides';
import { refreshDailyNotifications } from '../utils/notifications';
import { isSupportedTask, PLANT_TASKS, getRandomNotification } from '../constants/plants';
import { getActiveTaskIds } from '../constants/growthStages';
import * as Notifications from 'expo-notifications';

let LinearGradient: React.ComponentType<any> | null = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}

function Grad({ colors, style, children }: { colors: string[]; style?: any; children?: React.ReactNode }) {
  if (LinearGradient) return <LinearGradient colors={colors} style={style}>{children}</LinearGradient>;
  return <View style={[style, { backgroundColor: colors[colors.length - 1] }]}>{children}</View>;
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function formatDate(d: Date) {
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

import BubbleImage from '../assets/images/chat-bubble.svg';
import ChatImage from '../assets/images/chat-icon.svg';
import HeartImage from '../assets/images/heart.svg';


const EXPR_LABEL: Record<Expression, string> = {
  default: '기본', tear: '눈물', sparkle: '반짝', sad: '시무룩',
  oh: '오', cry: '오열', holding_tears: '울참', smile: '웃음',
  heart: '하트', sigh: '한숨', angry: '화', disappointed: '실망',
};

export default function HomeScreen() {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [nickname, setNickname]           = useState('');
  const [plantNickname, setPlantNickname] = useState('');
  const [plantType, setPlantType]         = useState<PlantType>('tomato');
  const [plantStage, setPlantStage]       = useState<GrowthStage>(1);
  const [plantedAt, setPlantedAt]         = useState(new Date().toISOString());
  const [streak, setStreak]               = useState(0);
  const [todayDone, setTodayDone]         = useState(false);
  const [lastRecordDate, setLastRecordDate] = useState<string | null>(null);

  // 개발자 메뉴 상태 (앱 재시작 시 초기화, 패널 닫아도 유지)
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<PlantFacePosition | null>(null);

  const [devMenuVisible, setDevMenuVisible] = useState(false);
  const [charDevMode, setCharDevMode]       = useState(false);
  const [devStage, setDevStage]             = useState<GrowthStage>(1);
  const [devExpr, setDevExpr]               = useState<Expression>('default');
  const [devSituation, setDevSituation]     = useState<PlantSituation>('idle');
  const [devChatRounds, setDevChatRoundsLocal] = useState(getDevChatRounds());

  const today    = getDevAdjustedDate();
  const todayStr = getLocalDateString(today);

  // 표정 자동 계산 훅
  const { expression: autoExpr, situation: autoSituation, refresh: refreshExpression } = usePlantExpression(plantType);

  // 성장 관리 훅
  const {
    currentStage: growthCurrentStage,
    todayTasks,
    completedTaskIds: growthCompletedIds,
    forceStage, forceNextStage, forcePrevStage, clearTodayTasks, reload: reloadGrowth,
  } = useGrowthManager(plantType, plantedAt);

  useFocusEffect(
    useCallback(() => {
      if (!onboardingChecked) return;
      (async () => {
        const [nick, plantData, streakCount, record, savedPlant, lastRec] = await Promise.all([
          storage.getNickname(),
          storage.getPlantData(),
          storage.getStreakCount(),
          storage.getDailyRecord(todayStr),
          storage.getGeneratedPlant(),
          storage.getLastRecordDate(),
        ]);
        setNickname(nick ?? '');
        setPlantNickname(plantData?.nickname ?? '');
        if (plantData?.id) setPlantType(plantData.id as PlantType);
        if (plantData?.growthStage) setPlantStage(growthStageToNumber(plantData.growthStage));
        if (plantData?.adoptedAt) setPlantedAt(plantData.adoptedAt);
        setStreak(streakCount);
        setTodayDone(record !== null);
        setLastRecordDate(lastRec);
        if (!charDevMode) setDevStage(growthStageToNumber(plantData?.growthStage ?? 'seed'));
        // 저장된 생성 이미지 복원
        if (savedPlant) {
          setGeneratedPlantUri(savedPlant.uri);
          setGeneratedFacePos(savedPlant.facePos);
        } else {
          setGeneratedPlantUri(null);
          setGeneratedFacePos(null);
        }
        reloadGrowth();
        refreshExpression();
        refreshDailyNotifications(
          (plantData?.id ?? 'tomato') as PlantType,
          record !== null,
        ).catch(() => {});
      })();
    }, [onboardingChecked, todayStr, charDevMode]),
  );

  // 온보딩 완료 여부 확인 — 미완료면 웰컴 화면으로 이동
  useEffect(() => {
    storage.isOnboardingComplete().then(done => {
      if (!done) {
        router.replace('/welcome' as any);
      } else {
        setOnboardingChecked(true);
      }
    });
  }, []);

  const greeting = nickname ? `${nickname},` : '안녕하세요,';

  const josa = (word: string, pair: [string, string]) => {
    if (!word) return pair[1];
    const code = word.charCodeAt(word.length - 1);
    const hasConsonant = code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
    return hasConsonant ? pair[0] : pair[1];
  };

  // 마지막 기록일로부터 며칠이 지났는지 (0 = 오늘, 1 = 어제, 7+ = 오랜만 복귀)
  const daysNeglected = (() => {
    if (!lastRecordDate) return 0;
    const last = new Date(lastRecordDate + 'T00:00:00');
    const cur  = new Date(todayStr + 'T00:00:00');
    return Math.floor((cur.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  })();

  const headingMain = pickSubHeading(plantType, streak, daysNeglected);

  const sub = (() => {
    if (daysNeglected >= 7 && plantNickname) {
      return `${plantNickname}${josa(plantNickname, ['이', '가'])} 방치된지 ${daysNeglected}일 째...`;
    }
    if (nickname && plantNickname) {
      return `${nickname}${josa(nickname, ['과', '와'])} ${plantNickname}${josa(plantNickname, ['이', '가'])} ${streak > 0 ? streak + '일 연속 관리 중' : '함께 시작해요'}`;
    }
    return streak > 0 ? `${streak}일 연속 관리 중` : '오늘 첫 관리를 시작해봐요';
  })();

  const goToChat = () => router.push('/chat' as any);

  const openMemorySettings = () => router.push('/settings' as any);

  // 개발 모드: 단계/표정/상황 선택
  const handleDevStage = (s: GrowthStage) => setDevStage(s);
  const handleDevExpr  = (e: Expression)  => setDevExpr(e);
  const handleDevSituation = (sit: PlantSituation) => {
    setDevSituation(sit);
    setDevExpr(getExpressionForSituation(plantType, sit));
  };

  // 표시에 사용할 stage / expression
  const displayStage = charDevMode ? devStage : plantStage;
  const displayExpr  = charDevMode ? devExpr  : autoExpr;

  const handleAdvanceDay = async () => {
    advanceDevDay();
    setDevDayOfWeek(null);
    setTodayDone(false);
    await reloadGrowth();
    refreshExpression();
  };

  const handleResetDay = async () => {
    resetDevDateOffset();
    setDevDayOfWeek(null);
    setTodayDone(false);
    await reloadGrowth();
    refreshExpression();
  };

  const handleClearToday = async () => {
    setDevMenuVisible(false);
    const todayStr = getLocalDateString();
    // DailyRecord, 채팅 draft, task 완료 기록, 성장 단계 체크, 질문 인덱스 복원
    await Promise.all([
      storage.clearTodayRecord(),
      storage.clearChatDraft(todayStr),
      storage.decrementQuestionIndex(),
      clearTodayTasks(),          // clearTodaySession 포함: task 완료 + LAST_STAGE_CHECK + pendingQuestion
    ]);
    setTodayDone(false);
    await reloadGrowth();
    Alert.alert('완료', '오늘 기록이 삭제됐어요. 채팅을 다시 진행할 수 있어요.');
  };
  const handleResetAll = async () => {
    setDevMenuVisible(false);
    await storage.resetAll();
    router.replace('/onboarding/step1' as any);
  };

  const handleTestNotification = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('알림 권한 없음', '설정에서 알림 권한을 허용해 주세요.');
      return;
    }

    // 기존 예약 알림 초기화
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 현재 식물·단계의 활성 task 알림을 실제 내용으로 예약
    const activeIds = getActiveTaskIds(plantType, growthCurrentStage);
    const allTasks  = PLANT_TASKS[plantType] ?? [];
    const activeTasks = allTasks.filter(t => isSupportedTask(t.id) && activeIds.includes(t.id as any));

    if (activeTasks.length === 0) {
      Alert.alert('활성 task 없음', '현재 단계에 알림이 설정된 task가 없어요.');
      return;
    }

    // 5초 간격으로 차례대로 예약
    for (let i = 0; i < activeTasks.length; i++) {
      const task = activeTasks[i];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: task.label,
          body: getRandomNotification(task),
        },
        trigger: { type: 'timeInterval', seconds: 5 + i * 5, repeats: false } as any,
      });
    }

    const names = activeTasks.map((t, i) => `  ${5 + i * 5}초 — ${t.label}`).join('\n');
    Alert.alert(
      `${activeTasks.length}개 알림 예약됨`,
      `앱을 홈으로 내리세요!\n\n${names}`,
    );
  };

  if (!onboardingChecked) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={openMemorySettings} hitSlop={8} style={styles.memoryButton}>
              <Text style={styles.memoryButtonText}>설정</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToChat} hitSlop={10}>
              <ChatImage width={styles.chatIcon.width} height={styles.chatIcon.height} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 날짜 + 인사 헤딩 */}
        <View style={styles.headerSection}>
          <View style={styles.dateRow}>
            <TouchableOpacity onLongPress={() => setDevMenuVisible(true)} delayLongPress={1500}>
              <Text style={styles.date}>{formatDate(today)}</Text>
            </TouchableOpacity>
            {streak > 0 && (
              <View style={styles.streakRow}>
                <HeartImage width={styles.heartIcon.width} height={styles.heartIcon.height} />
                <Text style={[styles.streakBadge, !todayDone && styles.streakBadgeInactive]}>
                  x {streak}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.heading}>{greeting}{'\n'}{headingMain}</Text>
          <Text style={styles.subHeading}>{sub}</Text>
        </View>

        {/* 식물 캐릭터 */}
        <View style={styles.plantZone} pointerEvents="box-none">
          <View style={styles.plantCharWrap} pointerEvents="none">
            {generatedPlantUri ? (
              // 합성 이미지(식물+화분) + 감지된 화분 위치에 표정 오버레이
              <View style={{ width: 220, height: 220 }}>
                <Image
                  source={{ uri: generatedPlantUri }}
                  style={{ width: 220, height: 220 }}
                  resizeMode="contain"
                />
                {generatedFacePos && (
                  <Image
                    source={getExpressionImage(plantType, displayExpr)}
                    style={{
                      position: 'absolute',
                      width: 110, height: 110,
                      left: (generatedFacePos.x / 100) * 220 - 55,
                      top: (generatedFacePos.y / 100) * 220 - 55,
                    }}
                    resizeMode="contain"
                  />
                )}
              </View>
            ) : (
              <PlantCharacter
                plantType={plantType}
                stage={displayStage}
                expression={displayExpr}
                size="large"
              />
            )}
          </View>
          {todayTasks.some(t => !growthCompletedIds.includes(t.id)) && (
            <TouchableOpacity
              style={(() => {
                const screenW = Dimensions.get('window').width;
                if (generatedPlantUri) {
                  // 220px 합성 이미지 오른쪽 바로 옆
                  return {
                    ...styles.messageBubble,
                    left: Math.min(screenW / 2 + 73, screenW - 52),
                    right: undefined,
                    bottom: 80,
                  };
                }
                // 기본 PlantCharacter 옆
                return { ...styles.messageBubble, left: Math.min(screenW / 2 + 63, screenW - 52), right: undefined, bottom: 74 };
              })()}
              activeOpacity={0.8}
              onPress={goToChat}
            >
              <BubbleImage width={styles.bubbleIcon.width} height={styles.bubbleIcon.height} />
            </TouchableOpacity>
          )}
        </View>

        {/* 오늘의 Tasks */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>
            {todayDone ? '오늘의 Tasks ✓' : '오늘의 TaskS'}
          </Text>
          <View style={styles.taskList}>
            {todayTasks.length === 0 ? (
              <View style={styles.taskEmptyRow}>
                <Text style={styles.taskEmpty}>오늘 해야 할 task가 없어요 </Text>
                <HeartImage width={styles.heartIcon.width} height={styles.heartIcon.height} />
              </View>
            ) : todayTasks.map(task => {
              const isDone = growthCompletedIds.includes(task.id);
              return (
                <TouchableOpacity key={task.id} onPress={goToChat} activeOpacity={0.85}>
                  <Grad colors={['#f3f4f1', '#b5ff22']} style={styles.taskCard}>
                    <View style={styles.taskInfo}>
                      <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                        {task.label}
                      </Text>
                      <Text style={styles.taskDesc} numberOfLines={1}>
                        {task.description}
                      </Text>
                    </View>
                    {isDone ? (
                      <Grad colors={['#f3f4f1', '#b5ff22']} style={styles.actionBtn}>
                        <Text style={styles.actionCheck}>✓</Text>
                      </Grad>
                    ) : (
                      <Grad colors={['#f3f4f1', '#ff6565']} style={styles.actionBtn}>
                        <Text style={styles.actionX}>✕</Text>
                      </Grad>
                    )}
                  </Grad>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <BottomNavBar activeTab="home" />

      {/* ─── 개발자 메뉴 모달 (날짜 3초 길게 누르면 열림) ────────── */}
      <Modal visible={devMenuVisible} transparent animationType="fade">
        {/* devMenuVisible이 true일 때만 ScrollView 등 내부 마운트 */}
        {devMenuVisible && <TouchableWithoutFeedback onPress={() => setDevMenuVisible(false)}>
          <View style={styles.devOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.devSheet}>
                <EmojiText style={styles.devTitle}>🛠 개발자 메뉴</EmojiText>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.devScroll}>

                {/* 리셋 섹션 */}
                <TouchableOpacity style={styles.devBtn} onPress={handleClearToday}>
                  <Text style={styles.devBtnText}>오늘 기록만 삭제</Text>
                  <Text style={styles.devBtnSub}>채팅 흐름 재테스트</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.devBtn, styles.devBtnDanger]} onPress={handleResetAll}>
                  <Text style={[styles.devBtnText, styles.devBtnDangerText]}>전체 초기화</Text>
                  <Text style={styles.devBtnSub}>온보딩부터 다시 시작</Text>
                </TouchableOpacity>

                {/* 알림 테스트 */}
                <View style={styles.devDivider} />
                <EmojiText style={styles.devSectionTitle}>🔔 알림 테스트</EmojiText>
                <TouchableOpacity style={styles.devBtn} onPress={handleTestNotification}>
                  <Text style={styles.devBtnText}>실제 알림 테스트</Text>
                  <Text style={styles.devBtnSub}>현재 단계 활성 task 알림 · 5초 간격 발송</Text>
                </TouchableOpacity>

                {/* 캐릭터 개발 섹션 */}
                <View style={styles.devDivider} />
                <View style={styles.devCharHeader}>
                  <EmojiText style={styles.devSectionTitle}>🌱 캐릭터 개발</EmojiText>
                  <TouchableOpacity
                    style={[styles.devToggleChip, charDevMode && styles.devToggleChipOn]}
                    onPress={() => setCharDevMode(v => !v)}
                  >
                    <Text style={[styles.devToggleText, charDevMode && styles.devToggleTextOn]}>
                      {charDevMode ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {charDevMode && (
                  <>
                    {/* 현재 상태 표시 */}
                    <Text style={styles.devCharInfo}>
                      {charDevMode ? '(DEV) ' : ''}{plantType} · stage {displayStage} · {displayExpr}
                      {'\n'}상황: {SITUATION_LABELS[charDevMode ? devSituation : autoSituation]}
                    </Text>

                    {/* 단계 선택 */}
                    <Text style={styles.devCharLabel}>단계</Text>
                    <View style={styles.devChipWrap}>
                      {([1,2,3,4,5,6,7,8] as GrowthStage[]).map(s => {
                        const disabled = plantType === 'tulip' && s > 6;
                        return (
                          <TouchableOpacity
                            key={s}
                            style={[styles.devChip, devStage === s && styles.devChipActive, disabled && styles.devChipDisabled]}
                            onPress={() => !disabled && handleDevStage(s)}
                            disabled={disabled}
                          >
                            <Text style={[styles.devChipText, devStage === s && styles.devChipTextActive]}>{s}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* 표정 선택 */}
                    <Text style={styles.devCharLabel}>표정</Text>
                    <View style={styles.devChipWrap}>
                      {PLANT_EXPRESSIONS[plantType].map(expr => (
                        <TouchableOpacity
                          key={expr}
                          style={[styles.devChip, devExpr === expr && styles.devChipActive]}
                          onPress={() => handleDevExpr(expr)}
                        >
                          <Text style={[styles.devChipText, devExpr === expr && styles.devChipTextActive]}>
                            {EXPR_LABEL[expr]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 상황 선택 */}
                    <Text style={styles.devCharLabel}>상황</Text>
                    <View style={styles.devChipWrap}>
                      {ALL_SITUATIONS.map(sit => (
                        <TouchableOpacity
                          key={sit}
                          style={[styles.devChip, devSituation === sit && styles.devChipActive]}
                          onPress={() => handleDevSituation(sit)}
                        >
                          <Text style={[styles.devChipText, devSituation === sit && styles.devChipTextActive]}>
                            {SITUATION_LABELS[sit]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* 날짜 시뮬레이션 섹션 */}
                <View style={styles.devDivider} />
                <EmojiText style={styles.devSectionTitle}>📅 날짜 시뮬레이션</EmojiText>
                <Text style={styles.devCharInfo}>
                  현재 (시뮬): {todayStr}
                  {getDevDateOffsetDays() > 0 ? ` (+${getDevDateOffsetDays()}일)` : ' (실제 날짜)'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity style={[styles.devBtn, { flex: 1 }]} onPress={handleAdvanceDay}>
                    <Text style={styles.devBtnText}>다음 날 →</Text>
                    <Text style={styles.devBtnSub}>+1일 이동</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.devBtn, { flex: 1 }, getDevDateOffsetDays() === 0 && { opacity: 0.4 }]}
                    onPress={handleResetDay}
                    disabled={getDevDateOffsetDays() === 0}
                  >
                    <Text style={styles.devBtnText}>← 원래 날짜</Text>
                    <Text style={styles.devBtnSub}>오프셋 초기화</Text>
                  </TouchableOpacity>
                </View>

                {/* 채팅 라운드 수 조정 섹션 */}
                <View style={styles.devDivider} />
                <EmojiText style={styles.devSectionTitle}>💬 채팅 라운드 수</EmojiText>
                <Text style={styles.devCharInfo}>
                  현재 설정: {devChatRounds}라운드
                  {'\n'}AI 질문에 여러 번 답변할 수 있습니다
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.devBtn, { flex: 0.5 }]}
                    onPress={() => {
                      const newRounds = Math.max(1, devChatRounds - 1);
                      setDevChatRoundsLocal(newRounds);
                      setDevChatRounds(newRounds);
                    }}
                  >
                    <Text style={styles.devBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={{flex: 1, alignItems: 'center', paddingVertical: 8}}>
                    <Text style={{fontFamily: 'Paperlogy-5Medium', fontSize: 18, color: COLORS.textPrimary}}>
                      {devChatRounds}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.devBtn, { flex: 0.5 }]}
                    onPress={() => {
                      const newRounds = devChatRounds + 1;
                      setDevChatRoundsLocal(newRounds);
                      setDevChatRounds(newRounds);
                    }}
                  >
                    <Text style={styles.devBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* 성장 단계 제어 섹션 */}
                <View style={styles.devDivider} />
                <EmojiText style={styles.devSectionTitle}>🌿 성장 단계 강제 설정</EmojiText>
                <Text style={styles.devCharInfo}>
                  현재 단계: {growthCurrentStage} · {getStageConfig(plantType, growthCurrentStage)?.label ?? ''}
                  {'\n'}완료 task: {growthCompletedIds.join(', ') || '없음'}
                </Text>
                {/* 단계 버튼 1~maxStage */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.devChipRow}>
                    {Array.from({ length: getMaxStage(plantType) }, (_, i) => i + 1).map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.devChip, growthCurrentStage === s && styles.devChipActive]}
                        onPress={() => forceStage(s)}
                      >
                        <Text style={[styles.devChipText, growthCurrentStage === s && styles.devChipTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <View style={styles.devChipRow}>
                  <TouchableOpacity style={[styles.devChip, { flex: 1 }]} onPress={forcePrevStage}>
                    <Text style={styles.devChipText}>← 이전 단계</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.devChip, styles.devChipActive, { flex: 1 }]} onPress={forceNextStage}>
                    <Text style={styles.devChipTextActive}>다음 단계 →</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.devBtn, { marginTop: 4 }]} onPress={clearTodayTasks}>
                  <Text style={styles.devBtnText}>오늘 task 완료 초기화</Text>
                  <Text style={styles.devBtnSub}>task 완료 상태 테스트용</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.devCancelBtn} onPress={() => setDevMenuVisible(false)}>
                  <Text style={styles.devCancelText}>닫기</Text>
                </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { paddingBottom: 24 },

  headerSection: { paddingHorizontal: 16, paddingTop: 6, gap: 5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.green, marginTop: 10 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  heartIcon: { width: 22, height: 22 },
  streakBadge: { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.green },
  streakBadgeInactive: { color: COLORS.textTertiary },
  taskEmptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  heading: { fontFamily: 'ahn2006-B', fontSize: 40, color: COLORS.textPrimary, lineHeight: 55, marginTop: 5 },
  subHeading: { fontFamily: 'ahn2006-M', fontSize: 20, color: COLORS.green, marginTop: 10, lineHeight: 28 },

  plantZone: { height: 280, position: 'relative' },
  generatedPlantWrap: { width: 220, height: 220 }, // fallback (genImageSize 없을 때)
  generatedPlantExpr:  { position: 'absolute', width: 145, height: 145, bottom: 28, left: 38 },
  aiTransferBtn: {
    position: 'absolute', bottom: 10, left: 16,
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: COLORS.outline,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center', justifyContent: 'center',
  },
  aiTransferBtnText: { fontSize: 18 },
  plantCharWrap: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' },
  messageBubble: { position: 'absolute', bottom: 64, right: 100, width: 44, height: 44 },
  bubbleIcon: { width: 44, height: 44 },
  chatIcon: { width: 22, height: 32 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  memoryButton: { paddingVertical: 4 },
  memoryButtonText: { fontFamily: 'ahn2006-M', fontSize: 13, color: COLORS.green },

  tasksSection: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  sectionTitle: { fontFamily: 'ahn2006-B', fontSize: 23, color: COLORS.green, marginTop: 20, lineHeight: 32 },
  taskList: { gap: 10, paddingBottom: 16 },
  taskCard: {
    height: 80, borderRadius: 32, borderWidth: 1.5, borderColor: COLORS.outline,
    paddingHorizontal: 17, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  taskInfo:      { flex: 1, paddingRight: 8 },
  taskTitle:     { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.textPrimary, lineHeight: 30 },
  taskTitleDone: { color: COLORS.textTertiary, textDecorationLine: 'line-through' },
  taskDesc:      { fontFamily: 'Paperlogy-5Medium', fontSize: 13, color: COLORS.green, lineHeight: 20 },
  taskEmpty:     { fontFamily: 'ahn2006-M', fontSize: 16, color: COLORS.textTertiary, paddingVertical: 16, textAlign: 'center' },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    borderColor: COLORS.outline, alignItems: 'center', justifyContent: 'center',
  },
  actionX:     { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.outline },
  actionCheck: { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.outline },

  // ─── 개발자 메뉴 modal ───────────────────────────────────────────
  devOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  devSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, gap: 8, maxHeight: '85%',
  },
  devTitle: { fontFamily: 'Paperlogy-5Medium', fontSize: 15, color: COLORS.textTertiary, marginBottom: 4 },

  devBtn: {
    backgroundColor: COLORS.bg, borderRadius: 14, borderWidth: 1.5,
    borderColor: COLORS.outline, paddingHorizontal: 16, paddingVertical: 12, gap: 2,
  },
  devBtnDanger:     { borderColor: '#ff6565', backgroundColor: '#fff5f5' },
  devBtnText:       { fontFamily: 'Paperlogy-5Medium', fontSize: 15, color: COLORS.textPrimary },
  devBtnDangerText: { color: '#d93025' },
  devBtnSub:        { fontFamily: 'Paperlogy-5Medium', fontSize: 13, color: COLORS.textTertiary },

  devDivider:   { height: 1, backgroundColor: COLORS.outline, marginVertical: 4 },
  devCharHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  devSectionTitle: { fontFamily: 'Paperlogy-5Medium', fontSize: 15, color: COLORS.textPrimary },
  devToggleChip: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 9999,
    borderWidth: 1.5, borderColor: COLORS.outline, backgroundColor: COLORS.bg,
  },
  devToggleChipOn:  { backgroundColor: COLORS.lime, borderColor: COLORS.outline },
  devToggleText:    { fontFamily: 'Paperlogy-5Medium', fontSize: 13, color: COLORS.textTertiary },
  devToggleTextOn:  { color: COLORS.outline },

  devCharInfo: { fontFamily: 'Paperlogy-5Medium', fontSize: 13, color: COLORS.textTertiary, marginBottom: 2 },
  devCharLabel: { fontFamily: 'ahn2006-B', fontSize: 13, color: COLORS.textPrimary, marginTop: 4 },
  devChipRow:  { flexDirection: 'row', paddingVertical: 4, gap: 6 },
  devChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 },
  devChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999,
    borderWidth: 1.5, borderColor: COLORS.outline, backgroundColor: COLORS.bg,
  },
  devChipActive:    { backgroundColor: COLORS.lime, borderColor: COLORS.outline },
  devChipDisabled:  { opacity: 0.3 },
  devChipText:      { fontFamily: 'Paperlogy-5Medium', fontSize: 13, color: COLORS.textPrimary },
  devChipTextActive: { fontFamily: 'Paperlogy-5Medium', fontSize: 13, color: COLORS.outline },

  devScroll: { flexShrink: 1 },
  devCancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  devCancelText: { fontFamily: 'Paperlogy-5Medium', fontSize: 15, color: COLORS.textTertiary },
});
