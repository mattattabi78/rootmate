import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { COLORS, FONTS, fs, ui } from '../constants';
import { storage } from '../store/storage';
import TopAppBar from '../components/common/TopAppBar';
import FitToScreen from '../components/common/FitToScreen';
import { compactFactor } from '../utils/layout';
import BottomNavBar from '../components/common/BottomNavBar';
import FaceOverlay from '../components/common/BlinkingFace';
import PlantCharacter from '../components/common/PlantCharacter';
import ActionIconButton from '../components/common/ActionIconButton';
import {
  PlantType, GrowthStage, Expression,
  PLANT_EXPRESSIONS, getMaxStage,
} from '../constants/character';
import {
  PlantSituation, SITUATION_LABELS, ALL_SITUATIONS,
  getExpressionForSituation,
} from '../constants/expressions';
import { usePlantExpression } from '../hooks/usePlantExpression';
import { useGrowthManager } from '../hooks/useGrowthManager';
import { pickSubHeading } from '../constants/notifications';
import { DevSection, DevSwitch, DevAction, DevOptions, DevLabel, DevInfo, DevInline } from '../components/dev/DevControls';
import { getLocalDateString } from '../utils/date';
import { setDevDayOfWeek, advanceDevDay, resetDevDateOffset, getDevAdjustedDate, getDevDateOffsetDays, setDevChatRounds, getDevChatRounds } from '../utils/devOverrides';
import { refreshDailyNotifications } from '../utils/notifications';
import { isSupportedTask, PLANT_TASKS, PLANT_INFO, getRandomNotification } from '../constants/plants';
import * as Notifications from 'expo-notifications';

const DAY_KOR = ['일','월','화','수','목','금','토'];
function formatDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd} (${DAY_KOR[d.getDay()]})`;
}

const EXPR_LABEL: Record<Expression, string> = {
  default: '기본', smile: '웃음', neutral: '무표정', tear: '눈물', cry: '오열', surprise: '놀람',
};

export default function HomeScreen() {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [plantType, setPlantType]         = useState<PlantType>('tomato');
  const [plantedAt, setPlantedAt]         = useState(new Date().toISOString());
  const [streak, setStreak]               = useState(0);
  const [lastRecordDate, setLastRecordDate] = useState<string | null>(null);

  // 개발자 메뉴 상태 (앱 재시작 시 초기화, 패널 닫아도 유지)
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<PlantFacePosition | null>(null);

  const [devMenuVisible, setDevMenuVisible] = useState(false);
  const [memoryEnabled, setMemoryEnabled]   = useState(true);   // 대화 기억 (개발자 메뉴로 이전)
  const [charDevMode, setCharDevMode]       = useState(false);
  const [devStage, setDevStage]             = useState<GrowthStage>(1);
  const [devExpr, setDevExpr]               = useState<Expression>('default');
  const [homeH, setHomeH]                 = useState(0);   // 홈 본문(스크롤 영역) 높이 — 짧은 화면에서 여백·캐릭터를 줄이는 데 사용
  const [devPlant, setDevPlant]             = useState<PlantType>('tomato');   // 개발 모드에서 화면에만 적용하는 식물 종류
  const [devSituation, setDevSituation]     = useState<PlantSituation>('idle');
  const [devChatRounds, setDevChatRoundsLocal] = useState(getDevChatRounds());

  const today    = getDevAdjustedDate();
  const todayStr = getLocalDateString(today);

  // 표정 자동 계산 훅
  const { expression: autoExpr, refresh: refreshExpression } = usePlantExpression(plantType);

  // 오늘 task 관리 훅
  const {
    todayTasks,
    completedTaskIds: growthCompletedIds,
    clearTodayTasks, reload: reloadGrowth,
  } = useGrowthManager(plantType, plantedAt);

  useFocusEffect(
    useCallback(() => {
      if (!onboardingChecked) return;
      (async () => {
        const [plantData, streakCount, record, savedPlant, lastRec] = await Promise.all([
          storage.getPlantData(),
          storage.getStreakCount(),
          storage.getDailyRecord(todayStr),
          storage.getGeneratedPlant(),
          storage.getLastRecordDate(),
        ]);
        if (plantData?.id) setPlantType(plantData.id as PlantType);
        if (plantData?.adoptedAt) setPlantedAt(plantData.adoptedAt);
        setStreak(streakCount);
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
    setDevExpr(getExpressionForSituation(displayPlant, sit));
  };
  // 캐릭터(식물 종류) 바꿔 보기: 저장 데이터·성장 상태는 그대로 두고 홈 화면 표시만 바뀜
  const handleDevPlant = (t: PlantType) => {
    setDevPlant(t);
    setDevStage(prev => Math.min(prev, getMaxStage(t)) as GrowthStage);
    setDevExpr('default');
  };

  // 표시에 사용할 stage / expression
  // 실제 화면의 대체(기본) 캐릭터는 1단계 이미지 고정 (AI 캐릭터가 없을 때 표시). 단계는 개발 모드에서만 바꿔 봄
  // 개발 모드 ON이면 devPlant, 아니면 실제 식물. 실제와 다른 식물을 보는 중에는 AI 사진 캐릭터 대신 기본 캐릭터를 보여줌
  const displayPlant = (charDevMode ? devPlant : plantType) as PlantType;
  const showGenerated = !!generatedPlantUri && displayPlant === plantType;
  // 짧은 화면: 글자·버튼은 그대로 두고 여백과 캐릭터만 줄임 (1 = 기본)
  const f = compactFactor(homeH, HOME_FIXED_H, HOME_FLEX_H, HOME_MIN_FACTOR);
  const displayStage = (charDevMode ? devStage : 1) as GrowthStage;
  const displayExpr  = charDevMode ? devExpr  : autoExpr;

  const handleAdvanceDay = async () => {
    advanceDevDay();
    setDevDayOfWeek(null);
    await reloadGrowth();
    refreshExpression();
  };

  const handleResetDay = async () => {
    resetDevDateOffset();
    setDevDayOfWeek(null);
    await reloadGrowth();
    refreshExpression();
  };

  const handleClearToday = async () => {
    setDevMenuVisible(false);
    const todayStr = getLocalDateString();
    // DailyRecord, 채팅 draft, task 완료 기록, 질문 인덱스 복원
    await Promise.all([
      storage.clearTodayRecord(),
      storage.clearChatDraft(todayStr),
      storage.decrementQuestionIndex(),
      clearTodayTasks(),          // 오늘 task 완료 기록 삭제
    ]);
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

    // 현재 식물의 task 알림을 실제 내용으로 예약
    const allTasks  = PLANT_TASKS[plantType] ?? [];
    const activeTasks = allTasks.filter(t => isSupportedTask(t.id));

    if (activeTasks.length === 0) {
      Alert.alert('활성 task 없음', '알림이 설정된 task가 없어요.');
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
      {/* 짧은 화면(SE 등): 글자 크기는 유지하고 여백·캐릭터만 줄임. 그래도 모자란 아주 짧은 화면만 통째로 축소 */}
      <FitToScreen designHeight={HOME_FIXED_H + HOME_FLEX_H * HOME_MIN_FACTOR}>
      <ScrollView
        style={styles.scroll}
        onLayout={e => setHomeH(e.nativeEvent.layout.height)}
        contentContainerStyle={[styles.content, { paddingTop: 92 * f, paddingBottom: 24 * f }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 날짜 (길게 누르면 개발자 메뉴) */}
        <View style={styles.dateRow}>
          <TouchableOpacity onLongPress={() => { storage.isMemoryEnabled().then(setMemoryEnabled); setDevMenuVisible(true); }} delayLongPress={1500} activeOpacity={1}>
            <Text style={styles.date}>{formatDate(today)}</Text>
          </TouchableOpacity>
        </View>

        {/* 식물 캐릭터 */}
        <View style={[styles.plantZone, { height: 340 * f, marginTop: 51 * f }]} pointerEvents="none">
          {showGenerated ? (
            // 합성 이미지(식물+화분) + 감지된 화분 위치에 표정 오버레이
            <View style={{ width: 220 * f, height: 220 * f }}>
              <Image
                source={{ uri: generatedPlantUri }}
                style={{ width: 220 * f, height: 220 * f }}
                resizeMode="contain"
              />
              {generatedFacePos && (
                <FaceOverlay
                  plantType={displayPlant}
                  expression={displayExpr}
                  animated
                  style={{
                    position: 'absolute',
                    width: 110 * f, height: 110 * f,
                    left: (generatedFacePos.x / 100) * 220 * f - 55 * f,
                    top: (generatedFacePos.y / 100) * 220 * f - 55 * f,
                  }}
                />
              )}
            </View>
          ) : (
            <PlantCharacter
              plantType={displayPlant}
              stage={displayStage}
              expression={displayExpr}
              width={230 * f}
              animated
            />
          )}
        </View>

        {/* 캐릭터 대사 */}
        <Text style={[styles.dialogue, { marginTop: 25 * f }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {'\u201C'}{headingMain}{'\u201D'}
        </Text>

        {/* 액션 버튼: 물주기 / 햇볕에 두기 / 식물 사진 찍기(기록) / 식물 관찰 */}
        <View style={[styles.actionRow, { marginTop: 51 * f }]}>
          <ActionIconButton kind="water"  active={isTaskPending('water')}    onPress={goToChat} />
          <ActionIconButton kind="sun"    active={isTaskPending('sunlight')} onPress={goToChat} />
          <ActionIconButton kind="camera" active={isTaskPending('photo')}    onPress={goToChat} />
          <ActionIconButton kind="search" active={isTaskPending('observe')}  onPress={goToChat} />
        </View>
      </ScrollView>
      </FitToScreen>
      </View>

      <BottomNavBar activeTab="home" />

      {/* ─── 개발자 메뉴 (날짜를 1.5초 길게 누르면 열림): 박스·이모티콘 없이 글자와 여백, 섹션 사이 가는 구분선만 ───── */}
      <Modal visible={devMenuVisible} transparent animationType="fade" onRequestClose={() => setDevMenuVisible(false)}>
        {/* devMenuVisible이 true일 때만 내부 마운트 */}
        {devMenuVisible && <TouchableWithoutFeedback onPress={() => setDevMenuVisible(false)}>
          <View style={styles.devOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.devSheet}>
                <View style={styles.devHeader}>
                  <Text style={styles.devTitle}>개발자 메뉴</Text>
                  <TouchableOpacity onPress={() => setDevMenuVisible(false)} hitSlop={12}>
                    <Text style={styles.devClose}>닫기</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.devBody}>
                  <DevSection title="데이터" first>
                    <DevAction label="오늘 기록만 삭제" sub="채팅 흐름 다시 테스트" onPress={handleClearToday} />
                    <DevAction label="전체 초기화" sub="온보딩부터 다시 시작" onPress={handleResetAll} danger />
                  </DevSection>

                  <DevSection title="알림">
                    <DevAction label="실제 알림 테스트" sub="현재 단계의 task 알림을 5초 간격으로 발송" onPress={handleTestNotification} />
                  </DevSection>

                  <DevSection title="화면">
                    <DevAction
                      label="연속 관리 화면 열기"
                      sub="컨페티 포함, 하루 1회 제한 없이 바로 확인"
                      onPress={() => { setDevMenuVisible(false); router.push('/streak' as any); }}
                    />
                  </DevSection>

                  <DevSection
                    title="캐릭터"
                    right={
                      <DevSwitch
                        label="캐릭터 개발 모드"
                        value={charDevMode}
                        onChange={on => {
                          if (on) { setDevPlant(plantType); }
                          setCharDevMode(on);
                        }}
                      />
                    }
                  >
                    {charDevMode && (
                      <>
                        <DevInfo>
                          {displayPlant} · {displayStage}단계 · {displayExpr}{'\n'}상황: {SITUATION_LABELS[devSituation]}
                        </DevInfo>
                        <DevLabel>식물</DevLabel>
                        <DevOptions
                          value={devPlant}
                          onSelect={handleDevPlant}
                          items={(['basil', 'tomato', 'marigold'] as PlantType[]).map(t => ({ key: t, label: PLANT_INFO[t]?.name ?? t }))}
                        />
                        <DevLabel>단계</DevLabel>
                        <DevOptions
                          value={devStage}
                          onSelect={handleDevStage}
                          items={([1, 2, 3, 4, 5, 6, 7, 8, 9] as GrowthStage[]).map(n => ({ key: n, label: String(n), disabled: n > getMaxStage(displayPlant) }))}
                        />
                        <DevLabel>표정</DevLabel>
                        <DevOptions
                          value={devExpr}
                          onSelect={handleDevExpr}
                          items={PLANT_EXPRESSIONS[displayPlant].map(e => ({ key: e, label: EXPR_LABEL[e] }))}
                        />
                        <DevLabel>상황</DevLabel>
                        <DevOptions
                          value={devSituation}
                          onSelect={handleDevSituation}
                          items={ALL_SITUATIONS.map(sit => ({ key: sit, label: SITUATION_LABELS[sit] }))}
                        />
                      </>
                    )}
                  </DevSection>

                  <DevSection title="오늘 task (실제 데이터 변경)">
                    <DevInfo>
                      완료한 task: {growthCompletedIds.join(', ') || '없음'}
                    </DevInfo>
                    <DevAction label="오늘 task 완료 초기화" sub="task 완료 상태 테스트용" onPress={clearTodayTasks} />
                  </DevSection>

                  <DevSection title="날짜">
                    <DevInfo>
                      {todayStr}{getDevDateOffsetDays() > 0 ? ` (실제보다 +${getDevDateOffsetDays()}일)` : ' (실제 날짜)'}
                    </DevInfo>
                    <DevInline
                      items={[
                        { label: '다음 날', onPress: handleAdvanceDay },
                        { label: '원래 날짜', onPress: handleResetDay, disabled: getDevDateOffsetDays() === 0 },
                      ]}
                    />
                  </DevSection>

                  <DevSection title="채팅 라운드 수">
                    <DevInfo>AI 질문에 답할 수 있는 횟수</DevInfo>
                    <DevInline
                      items={[
                        { label: '−', onPress: () => { const n = Math.max(1, devChatRounds - 1); setDevChatRoundsLocal(n); setDevChatRounds(n); } },
                        { label: String(devChatRounds) },
                        { label: '+', onPress: () => { const n = devChatRounds + 1; setDevChatRoundsLocal(n); setDevChatRounds(n); } },
                      ]}
                    />
                  </DevSection>

                  <DevSection title="대화 기억" right={<DevSwitch label="대화 기억" value={memoryEnabled} onChange={toggleMemory} />}>
                    <DevInfo>켜면 대화 요약을 저장해 다음 대화에 참고해요. 끄면 저장된 장기 기억 요약도 삭제돼요.</DevInfo>
                  </DevSection>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>}
      </Modal>
    </SafeAreaView>
  );
}

// 홈 높이 구성(기본 디자인): 줄이지 않는 부분 = 날짜 20 + 대사 40 + 버튼 45 = 105 / 줄이는 부분 = 위 여백 92 + 간격 51+25+51 + 캐릭터 340 + 아래 여백 24 = 583
const HOME_FIXED_H = ui(105);
const HOME_FLEX_H = 583;
const HOME_MIN_FACTOR = 0.5;   // 여백·캐릭터를 줄이는 한계 (이보다 짧은 화면만 통째로 축소)

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.headerBg },   // 상태바 영역까지 라임 헤더 색
  body:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', paddingTop: 92, paddingBottom: 24 },   // 날짜 top 161

  dateRow: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  date: { fontFamily: FONTS.bold, fontSize: fs(15), lineHeight: fs(20), color: COLORS.green },

  // 캐릭터 영역 230x340 (top 232 = 날짜 하단 181 + 51)
  plantZone: { height: 340, marginTop: 51, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },

  // 대사: 폭 254, 줄높이 40 (캐릭터 하단 572 + 25)
  dialogue: {
    fontFamily: FONTS.bold, fontSize: fs(20), lineHeight: fs(40), height: 40, alignSelf: 'stretch', paddingHorizontal: 24,
    color: COLORS.forest, textAlign: 'center', marginTop: 25,
  },

  // 액션 버튼 45x45, 간격 ~13.6 (top 688 = 대사 하단 637 + 51)
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: ui(13.6), marginTop: 51 },

  // ─── 개발자 메뉴 modal (새 디자인: 반경 10, #303a1e 테두리, SUITE, 라임 강조) ──
  // ─── 개발자 메뉴 (글자와 여백 + 섹션 사이 가는 구분선, 박스·이모티콘 없음) ───
  devOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  devSheet: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 10, borderTopRightRadius: 10,
    paddingHorizontal: 24, paddingTop: 22, maxHeight: '85%',
  },
  devHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18 },
  devTitle: { fontFamily: FONTS.bold, fontSize: fs(20), lineHeight: fs(28), color: COLORS.outline },
  devClose: { fontFamily: FONTS.bold, fontSize: fs(15), lineHeight: fs(22), color: COLORS.green },
  devBody: { gap: 14, paddingBottom: 40 },
});
