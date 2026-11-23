import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { generatePlantCharacterFromPhoto, type PlantFacePosition } from '../services/ai';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, fs, ui, FONT_SIZE } from '../constants';
import { storage } from '../store/storage';
import TopAppBar from '../components/common/TopAppBar';
import FitToScreen from '../components/common/FitToScreen';
import { compactFactor } from '../utils/layout';
import BottomNavBar from '../components/common/BottomNavBar';
import FaceOverlay, { getGeneratedFaceOverlayStyle } from '../components/common/BlinkingFace';
import { usePlantInteraction } from '../hooks/usePlantInteraction';
import PlantCharacter from '../components/common/PlantCharacter';
import ActionIconButton from '../components/common/ActionIconButton';
import {
  PlantType, GrowthStage, Expression, isPlantType,
  PLANT_EXPRESSIONS, getMaxStage, CANVAS_FACE_CENTER, CANVAS_PER_FACE_PX,
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
import * as ImagePicker from 'expo-image-picker';
import { persistImageUri } from '../utils/persistImage';

const DAY_KOR = ['일','월','화','수','목','금','토'];
function formatDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd} (${DAY_KOR[d.getDay()]})`;
}

const EXPR_LABEL: Record<Expression, string> = {
  default: '기본', smile: '웃음', neutral: '무표정', tear: '눈물', cry: '오열', surprise: '놀람', wink: '윙크', happy: '기분 좋음', sleep: '자는 중',
};

export default function HomeScreen() {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [plantType, setPlantType]         = useState<PlantType>('tomato');
  const [plantedAt, setPlantedAt]         = useState(new Date().toISOString());
  const [headingMain, setHeadingMain] = useState('');   // 캐릭터 아래 한 줄 대사

  // 개발자 메뉴 상태 (앱 재시작 시 초기화, 패널 닫아도 유지)
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<PlantFacePosition | null>(null);
  const [devCharacterGenerating, setDevCharacterGenerating] = useState(false);

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
        if (isPlantType(plantData?.id)) setPlantType(plantData.id);
        if (plantData?.adoptedAt) setPlantedAt(plantData.adoptedAt);
        // 한 줄 대사는 화면에 들어올 때(탭 전환 후 돌아올 때 포함) 한 번만 고름 — 터치 반응으로 화면이 다시 그려져도 바뀌지 않게
        const neglected = lastRec
          ? Math.floor((new Date(todayStr + 'T00:00:00').getTime() - new Date(lastRec + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
          : 0;   // 0 = 오늘, 1 = 어제, 7+ = 오랜만 복귀
        setHeadingMain(pickSubHeading(isPlantType(plantData?.id) ? plantData.id : 'tomato', streakCount, neglected));
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
          isPlantType(plantData?.id) ? plantData.id : 'tomato',
          record !== null,
        ).catch(() => {});
      })();
    }, [onboardingChecked, todayStr, charDevMode]),
  );

  // 온보딩 완료 여부 확인 — 미완료면 환영 화면 없이 바로 온보딩 첫 단계로 이동
  useEffect(() => {
    storage.isOnboardingComplete().then(done => {
      if (!done) {
        router.replace('/onboarding/step1' as any);
      } else {
        setOnboardingChecked(true);
      }
    });
  }, []);

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
  // 캐릭터 터치 반응 (톡·연타·문지르기·길게 누르기, 빈 화면 두 번 탭 물방울). 반응 중에는 표정·눈·효과가 기본 모습을 덮어씀
  const interaction = usePlantInteraction({ plantType: displayPlant, baseline: displayExpr, waterDone: growthCompletedIds.includes('water') });
  const shownExpr = interaction.expression ?? displayExpr;
  const fxK = (121 * f / 500) / CANVAS_PER_FACE_PX;   // 사진 캐릭터 위 효과 이미지 1캔버스 px의 크기

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

  const handleGenerateDevCharacter = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한이 필요해요', '사진 접근 권한을 허용해야 갤러리에서 사진을 선택할 수 있어요.');
        return;
      }

      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (selection.canceled || !selection.assets[0]) return;

      setDevCharacterGenerating(true);
      const generated = await generatePlantCharacterFromPhoto(selection.assets[0].uri);
      if (!generated) {
        Alert.alert('식물을 찾지 못했어요', '식물이 잘 보이는 사진을 선택해 주세요.');
        return;
      }

      const uri = await persistImageUri(generated.imageUrl);
      await storage.saveGeneratedPlant(uri, generated.facePosition, todayStr);
      setGeneratedPlantUri(uri);
      setGeneratedFacePos(generated.facePosition);
      setDevMenuVisible(false);
      Alert.alert('캐릭터 생성 완료', '홈 캐릭터에 적용했어요. 사진 task는 완료 처리하지 않았습니다.');
    } catch (error) {
      console.warn('Developer character generation failed:', error);
      Alert.alert(
        '캐릭터 생성 실패',
        error instanceof Error ? error.message : '사진을 처리하는 중 문제가 발생했어요.',
      );
    } finally {
      setDevCharacterGenerating(false);
    }
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
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 빈 화면 두 번 탭: 오늘 물주기를 끝냈을 때만 물방울. 버튼·캐릭터가 터치를 가져가고 남은 빈 곳의 터치만 이 바깥 영역이 받음 */}
        <Pressable
          style={[styles.content, { paddingTop: 92 * f, paddingBottom: 24 * f }]}
          onPress={interaction.onBackgroundPress}
        >

        {/* 날짜 (길게 누르면 개발자 메뉴) */}
        <View style={styles.dateRow}>
          <TouchableOpacity onLongPress={() => { storage.isMemoryEnabled().then(setMemoryEnabled); setDevMenuVisible(true); }} delayLongPress={1500} activeOpacity={1}>
            <Text style={styles.date}>{formatDate(today)}</Text>
          </TouchableOpacity>
        </View>

        {/* 식물 캐릭터 */}
        <View style={[styles.plantZone, { height: 340 * f, marginTop: 51 * f }]}>
          {/* 터치 반응 영역은 캐릭터(화분과 식물 전체)만. 양옆 빈 곳은 '빈 화면'으로 취급 */}
          <View {...interaction.panHandlers}>
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
                  expression={shownExpr}
                  eye={interaction.eye ?? undefined}
                  animated
                  style={getGeneratedFaceOverlayStyle(220 * f, generatedFacePos)}
                />
              )}
              {/* 효과(하트·음표·물방울): 레이어 캔버스 기준 이미지를 얼굴 오버레이와 같은 비율로 줄여 얼굴 위치에 맞춤 */}
              {interaction.effect && generatedFacePos && (
                <Image
                  source={interaction.effect}
                  resizeMode="contain"
                  style={{
                    position: 'absolute',
                    width: 846 * fxK, height: 1254 * fxK,
                    left: (generatedFacePos.x / 100) * 220 * f - CANVAS_FACE_CENTER[displayPlant].x * fxK,
                    top: (generatedFacePos.y / 100) * 220 * f - CANVAS_FACE_CENTER[displayPlant].y * fxK,
                  }}
                />
              )}
            </View>
          ) : (
            <PlantCharacter
              plantType={displayPlant}
              stage={displayStage}
              expression={shownExpr}
              eye={interaction.eye ?? undefined}
              effect={interaction.effect}
              width={230 * f}
              animated
            />
          )}
          </View>
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
        </Pressable>
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
                    <DevAction
                      label={devCharacterGenerating ? '캐릭터 생성 중...' : '캐릭터 생성하기'}
                      sub="task와 같은 생성 흐름으로 홈 캐릭터에 적용 (task 완료 처리 안 함)"
                      onPress={() => { void handleGenerateDevCharacter(); }}
                      disabled={devCharacterGenerating}
                    />
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
  date: { fontFamily: FONTS.bold, fontSize: fs(FONT_SIZE.bodyL), lineHeight: fs(20), color: COLORS.green },

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
  devClose: { fontFamily: FONTS.bold, fontSize: fs(FONT_SIZE.bodyL), lineHeight: fs(22), color: COLORS.green },
  devBody: { gap: 14, paddingBottom: 40 },
});
