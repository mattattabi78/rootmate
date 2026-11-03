import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Switch,
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
import { COLORS, FONTS } from '../constants';
import { storage } from '../store/storage';
import TopAppBar from '../components/common/TopAppBar';
import BottomNavBar from '../components/common/BottomNavBar';
import PlantCharacter from '../components/common/PlantCharacter';
import ActionIconButton from '../components/common/ActionIconButton';
import {
  PlantType, GrowthStage, Expression,
  PLANT_EXPRESSIONS, getExpressionImage,
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

const DAY_KOR = ['일','월','화','수','목','금','토'];
function formatDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd} (${DAY_KOR[d.getDay()]})`;
}

const EXPR_LABEL: Record<Expression, string> = {
  default: '기본', tear: '눈물', sparkle: '반짝', sad: '시무룩',
  oh: '오', cry: '오열', holding_tears: '울참', smile: '웃음',
  heart: '하트', sigh: '한숨', angry: '화', disappointed: '실망',
};

export default function HomeScreen() {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [nickname, setNickname]           = useState('');
  const [plantType, setPlantType]         = useState<PlantType>('tomato');
  const [plantedAt, setPlantedAt]         = useState(new Date().toISOString());
  const [streak, setStreak]               = useState(0);
  const [todayDone, setTodayDone]         = useState(false);
  const [lastRecordDate, setLastRecordDate] = useState<string | null>(null);

  // 개발자 메뉴 상태 (앱 재시작 시 초기화, 패널 닫아도 유지)
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<PlantFacePosition | null>(null);

  const [devMenuVisible, setDevMenuVisible] = useState(false);
  const [memoryEnabled, setMemoryEnabled]   = useState(true);   // 대화 기억 (개발자 메뉴로 이전)
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
        if (plantData?.id) setPlantType(plantData.id as PlantType);
        if (plantData?.adoptedAt) setPlantedAt(plantData.adoptedAt);
        setStreak(streakCount);
        setTodayDone(record !== null);
        setLastRecordDate(lastRec);
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

  // 마지막 기록일로부터 며칠이 지났는지 (0 = 오늘, 1 = 어제, 7+ = 오랜만 복귀)
  const daysNeglected = (() => {
    if (!lastRecordDate) return 0;
    const last = new Date(lastRecordDate + 'T00:00:00');
    const cur  = new Date(todayStr + 'T00:00:00');
    return Math.floor((cur.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  })();

  const headingMain = pickSubHeading(plantType, streak, daysNeglected);

  const goToChat = () => router.push('/chat' as any);

  // 오늘 해야 하고 아직 완료하지 않은 task 인지
  const isTaskPending = (taskId: string) =>
    todayTasks.some(t => t.id === taskId) && !growthCompletedIds.includes(taskId);

  // 대화 기억 on/off — 끄면 저장된 장기 기억 요약도 삭제됨
  const toggleMemory = async (enabled: boolean) => {
    await storage.setMemoryEnabled(enabled);
    setMemoryEnabled(enabled);
  };

  // 개발 모드: 단계/표정/상황 선택
  const handleDevStage = (s: GrowthStage) => setDevStage(s);
  const handleDevExpr  = (e: Expression)  => setDevExpr(e);
  const handleDevSituation = (sit: PlantSituation) => {
    setDevSituation(sit);
    setDevExpr(getExpressionForSituation(plantType, sit));
  };

  // 표시에 사용할 stage / expression
  // 대체(기본) 캐릭터 이미지는 성장 상태의 현재 단계를 따라감 (AI 캐릭터가 없을 때 표시)
  const displayStage = (charDevMode ? devStage : growthCurrentStage) as GrowthStage;
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
      <TopAppBar />

      <View style={styles.body}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 날짜 (길게 누르면 개발자 메뉴) */}
        <View style={styles.dateRow}>
          <TouchableOpacity onLongPress={() => { storage.isMemoryEnabled().then(setMemoryEnabled); setDevMenuVisible(true); }} delayLongPress={1500} activeOpacity={1}>
            <Text style={styles.date}>{formatDate(today)}</Text>
          </TouchableOpacity>
        </View>

        {/* 식물 캐릭터 */}
        <View style={styles.plantZone} pointerEvents="none">
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

        {/* 캐릭터 대사 */}
        <Text style={styles.dialogue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {'\u201C'}{headingMain}{'\u201D'}
        </Text>

        {/* 액션 버튼: 물주기 / 햇볕에 두기 / 식물 사진 찍기(기록) / 식물 관찰 */}
        <View style={styles.actionRow}>
          <ActionIconButton kind="water"  active={isTaskPending('water')}    onPress={goToChat} />
          <ActionIconButton kind="sun"    active={isTaskPending('sunlight')} onPress={goToChat} />
          <ActionIconButton kind="camera" active={isTaskPending('photo')}    onPress={goToChat} />
          <ActionIconButton kind="search" active={isTaskPending('observe')}  onPress={goToChat} />
        </View>
      </ScrollView>
      </View>

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
                <View style={styles.devRow}>
                  <TouchableOpacity style={[styles.devBtn, styles.devBtnHalf]} onPress={handleClearToday}>
                    <Text style={styles.devBtnText}>오늘 기록만 삭제</Text>
                    <Text style={styles.devBtnSub}>채팅 흐름 재테스트</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.devBtn, styles.devBtnHalf, styles.devBtnDanger]} onPress={handleResetAll}>
                    <Text style={[styles.devBtnText, styles.devBtnDangerText]}>전체 초기화</Text>
                    <Text style={styles.devBtnSub}>온보딩부터 다시 시작</Text>
                  </TouchableOpacity>
                </View>

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
                    onPress={() => { if (!charDevMode) setDevStage(growthCurrentStage as GrowthStage); setCharDevMode(!charDevMode); }}
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
                      {([1,2,3,4,5,6,7,8,9] as GrowthStage[]).map(s => {
                        const disabled = s > getMaxStage(plantType);
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

                {/* 대화 기억 (설정 화면에서 이전) */}
                <View style={styles.devDivider} />
                <View style={styles.devCharHeader}>
                  <EmojiText style={styles.devSectionTitle}>💬 대화 기억</EmojiText>
                  <Switch
                    value={memoryEnabled}
                    onValueChange={toggleMemory}
                    trackColor={{ false: '#C5C7C0', true: COLORS.lime }}
                    thumbColor={COLORS.outline}
                    accessibilityLabel="대화 기억"
                  />
                </View>
                <Text style={styles.devCharInfo}>
                  켜면 대화 요약을 저장해 다음 대화에 참고해요. 끄면 저장된 장기 기억 요약도 삭제돼요.
                </Text>

                {/* 날짜 시뮬레이션 섹션 */}
                <View style={styles.devDivider} />
                <EmojiText style={styles.devSectionTitle}>📅 날짜 시뮬레이션</EmojiText>
                <Text style={styles.devCharInfo}>
                  현재 (시뮬): {todayStr}
                  {getDevDateOffsetDays() > 0 ? ` (+${getDevDateOffsetDays()}일)` : ' (실제 날짜)'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
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
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 10 }}>
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
                    <Text style={{fontFamily: FONTS.bold, fontSize: 18, color: COLORS.outline}}>
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
  safe:    { flex: 1, backgroundColor: COLORS.headerBg },   // 상태바 영역까지 라임 헤더 색
  body:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', paddingTop: 92, paddingBottom: 24 },   // 날짜 top 161

  dateRow: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  date: { fontFamily: FONTS.extraBold, fontSize: 15, lineHeight: 20, color: COLORS.green },

  // 캐릭터 영역 230x340 (top 232 = 날짜 하단 181 + 51)
  plantZone: { height: 340, marginTop: 51, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },

  // 대사: 폭 254, 줄높이 40 (캐릭터 하단 572 + 25)
  dialogue: {
    fontFamily: FONTS.bold, fontSize: 20, lineHeight: 40, height: 40, alignSelf: 'stretch', paddingHorizontal: 24,
    color: COLORS.forest, textAlign: 'center', marginTop: 25,
  },

  // 액션 버튼 45x45, 간격 ~13.6 (top 688 = 대사 하단 637 + 51)
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 13.6, marginTop: 51 },

  // ─── 개발자 메뉴 modal (새 디자인: 반경 10, #303a1e 테두리, SUITE, 라임 강조) ──
  devOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  devSheet: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 10, borderTopRightRadius: 10,
    borderWidth: 1.5, borderBottomWidth: 0, borderColor: '#303a1e',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 14, maxHeight: '85%',
  },
  devTitle: {
    fontFamily: FONTS.extraBold, fontSize: 17, lineHeight: 24, color: COLORS.outline,
    paddingBottom: 4,
  },

  devBtn: {
    backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#303a1e', paddingHorizontal: 16, paddingVertical: 16, gap: 5,
  },
  devRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  devBtnHalf: { flex: 1 },
  devBtnDanger:     { borderColor: '#d93025', backgroundColor: '#fff5f5' },
  devBtnText:       { fontFamily: FONTS.bold, fontSize: 15, lineHeight: 21, color: COLORS.outline },
  devBtnDangerText: { color: '#d93025' },
  devBtnSub:        { fontFamily: FONTS.medium, fontSize: 12, lineHeight: 17, color: COLORS.textSecondary },

  devDivider:   { height: 0, marginVertical: 12 },   // 구분선 없이 간격만 유지
  devCharHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  devSectionTitle: { fontFamily: FONTS.extraBold, fontSize: 15, lineHeight: 22, color: COLORS.pine },
  devToggleChip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#303a1e', backgroundColor: COLORS.bg,
  },
  devToggleChipOn:  { backgroundColor: COLORS.lime, borderColor: '#303a1e' },
  devToggleText:    { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textSecondary },
  devToggleTextOn:  { color: COLORS.outline },

  devCharInfo: { fontFamily: FONTS.medium, fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, marginBottom: 2 },
  devCharLabel: { fontFamily: FONTS.extraBold, fontSize: 13, lineHeight: 18, color: COLORS.outline, marginTop: 10 },
  devChipRow:  { flexDirection: 'row', paddingVertical: 6, gap: 10 },
  devChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 6 },
  devChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: COLORS.bg,
  },
  devChipActive:    { backgroundColor: COLORS.lime, borderColor: '#303a1e' },
  devChipDisabled:  { opacity: 0.3 },
  devChipText:      { fontFamily: FONTS.semiBold, fontSize: 13, lineHeight: 18, color: COLORS.textPrimary },
  devChipTextActive: { fontFamily: FONTS.bold, fontSize: 13, lineHeight: 18, color: COLORS.outline },

  devScroll: { flexShrink: 1 },
  devCancelBtn: {
    alignItems: 'center', paddingVertical: 16, marginTop: 12,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#303a1e', backgroundColor: COLORS.lime,
  },
  devCancelText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.outline },
});
