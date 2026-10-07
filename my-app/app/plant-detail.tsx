import React, { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BackImg from '../assets/images/back-button.svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../constants';
import { storage } from '../store/storage';
import PlantCharacter from '../components/common/PlantCharacter';
import EmojiText from '../components/common/EmojiText';
import { getLocalDateString } from '../utils/date';
import {
  PLANT_INFO,
  getTodayTasks,
  getCurrentWeek,
  growthStageToStep,
} from '../constants/plants';
import { PlantType, GrowthStage, growthStageToNumber, getExpressionImage } from '../constants/character';
import { getTodayCompletedTaskIds, loadGrowthState } from '../store/growthStore';

export default function PlantDetailScreen() {
  const router = useRouter();
  const { plantType: plantTypeParam } = useLocalSearchParams<{ plantType?: string }>();
  const [plantType, setPlantType] = useState<PlantType>((plantTypeParam as PlantType) || 'basil');
  const [growthStage, setGrowthStage] = useState<GrowthStage>(4);
  const [plantedAt, setPlantedAt] = useState<string>(new Date().toISOString());
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [taskCompletionHistory, setTaskCompletionHistory] = useState<{ taskId: string; completedAt: string }[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<{ x: number; y: number; pot_width: number } | null>(null);
  const [genImgFailed, setGenImgFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        // URL 파라미터로 전달된 plantType 사용
        const typeToUse = (plantTypeParam as PlantType) || plantType;
        setPlantType(typeToUse);

        const [plantData, todayRecord, savedPlant, todayCompletions, growthState] = await Promise.all([
          storage.getPlantData(),
          storage.getDailyRecord(getLocalDateString()),
          storage.getGeneratedPlant(),
          getTodayCompletedTaskIds(),
          loadGrowthState(),
        ]);
        if (plantData?.id) {
          setGrowthStage(growthStageToNumber(plantData.growthStage));
          setPlantedAt(plantData.adoptedAt ?? new Date().toISOString());
        }
        const done = new Set(todayCompletions);
        if (todayRecord?.waterDone) done.add('water');
        setCompletedTaskIds([...done]);
        setTaskCompletionHistory(growthState?.completedTasks ?? []);
        if (savedPlant) {
          setGeneratedPlantUri(savedPlant.uri);
          setGeneratedFacePos(savedPlant.facePos);
        }
      })();
    }, [plantTypeParam])
  );

  const info = PLANT_INFO[plantType];
  const todayTasks = getTodayTasks(plantType, plantedAt, completedTaskIds, taskCompletionHistory);
  const currentStep = growthStageToStep(
    ['seed', 'sprout', 'growing', 'done'][Math.min(growthStage - 1, 3)] ?? 'seed',
    info?.growthSteps.length ?? 1
  );

  if (!info) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <BackImg width={styles.backIcon.width} height={styles.backIcon.height} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RootMate</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 상단 중앙 정렬 영역 */}
        <View style={styles.topSection}>
          {/* 캐릭터 — generated 이미지 우선, 없으면 현재 성장 단계 */}
          {generatedPlantUri && !genImgFailed ? (
            <View style={styles.generatedWrap}>
              <Image
                source={{ uri: generatedPlantUri }}
                style={styles.generatedImg}
                resizeMode="contain"
                onError={() => { setGenImgFailed(true); }}
              />
              {generatedFacePos && (
                <Image
                  source={getExpressionImage(plantType, 'default')}
                  style={{
                    position: 'absolute',
                    width: 110, height: 110,
                    left: (generatedFacePos.x / 100) * 220 - 55,
                    top:  (generatedFacePos.y / 100) * 220 - 55,
                  }}
                  resizeMode="contain"
                />
              )}
            </View>
          ) : (
            <PlantCharacter
              plantType={plantType}
              stage={growthStage}
              expression="default"
              size="large"
              showVase={true}
            />
          )}

          {/* 식물 이름 */}
          <Text style={styles.plantName}>{info.name}</Text>

          {/* 꽃말 */}
          <Text style={styles.flowerMeaningLabel}>{info.tagline}</Text>

          {/* 설명 */}
          <EmojiText style={styles.description}>
            {info.intro}
          </EmojiText>
        </View>

        {/* 키우는 방법 */}
        <Text style={styles.sectionTitle}>키우는 방법</Text>
        <View style={styles.card}>
          {info.growthSteps.map(({ step, title, content }) => {
            const isCurrent = step === currentStep;
            const isOpen = expandedStep === step;
            return (
              <View key={step}>
                <TouchableOpacity
                  style={[
                    styles.accordionHeader,
                    isCurrent && styles.accordionHeaderActive,
                  ]}
                  onPress={() => setExpandedStep(isOpen ? null : step)}
                  activeOpacity={0.8}
                >
                  {isCurrent && <View style={styles.activeBar} />}
                  <Text
                    style={[
                      styles.accordionStep,
                      isCurrent && styles.accordionStepActive,
                    ]}
                  >
                    {step}단계
                  </Text>
                  <Text
                    style={[
                      styles.accordionTitle,
                      isCurrent && styles.accordionTitleActive,
                    ]}
                  >
                    {title}
                  </Text>
                  <Text style={styles.accordionChevron}>
                    {isOpen ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {isOpen && (
                  <View style={styles.accordionBody}>
                    <EmojiText style={styles.accordionContent}>{content}</EmojiText>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* 관리 요령 */}
        <Text style={styles.sectionTitle}>관리 요령</Text>
        <View style={styles.card}>
          {info.careGuide.map(({ icon, label, value }, i) => (
            <View key={label}>
              {i > 0 && <View style={styles.tableRule} />}
              <View style={styles.tableRow}>
                <View style={styles.tableCellLeft}>
                  <EmojiText style={styles.careIcon}>{icon}</EmojiText>
                  <Text style={styles.careLabel}>{label}</Text>
                </View>
                <View style={styles.tableDivider} />
                <Text style={styles.careValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
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
  headerTitle: {
    fontFamily: 'ahn2006-B',
    fontSize: 30,
    color: COLORS.textPrimary,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // 상단 중앙 정렬 섹션
  topSection: {
    alignItems: 'center',
    marginTop: -80,
    marginBottom: 10,
    gap: 12,
  },
  generatedWrap: {
    width: 220,
    height: 220,
  },
  generatedImg: {
    width: 220,
    height: 220,
  },
  plantName: {
    fontFamily: 'ahn2006-M',
    fontSize: 40,
    marginTop: -12,
    color: COLORS.textPrimary,
  },
  flowerMeaningLabel: {
    fontFamily: 'ahn2006-M',
    fontSize: 18,
    color: COLORS.green,
  },
  description: {
    fontFamily: 'Paperlogy-4Regular',
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },

  // 카드
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    padding: 16,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardTitle: {
    fontFamily: 'ahn2006-M',
    fontSize: 25,
    color: COLORS.textPrimary,
    lineHeight: 40,
  },

  // 아코디언
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outline,
  },
  accordionHeaderActive: {
    backgroundColor: 'rgba(181,255,34,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  activeBar: { width: 3, height: 20, backgroundColor: COLORS.green, borderRadius: 2 },
  accordionStep: {
    fontFamily: 'ahn2006-B',
    fontSize: 15,
    color: COLORS.textTertiary,
    width: 36,
  },
  accordionStepActive: { color: COLORS.green },
  accordionTitle: {
    flex: 1,
    fontFamily: 'Paperlogy-4Regular',
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  accordionTitleActive: { fontFamily: 'Paperlogy-5Medium', color: COLORS.green },
  accordionChevron: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  accordionBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  accordionContent: {
    fontFamily: 'Paperlogy-4Regular',
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },

  // 섹션 제목 (카드 바깥)
  sectionTitle: {
    fontFamily: 'ahn2006-M',
    fontSize: 25,
    color: COLORS.textPrimary,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 0,
  },

  // 관리 요령 테이블
  tableRule: {
    height: 1,
    backgroundColor: COLORS.outline,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 52,
  },
  tableCellLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 86,
    paddingRight: 10,
  },
  tableDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.outline,
  },
  careIcon: {
    width: 24,
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  careLabel: {
    flexShrink: 0,
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  careValue: {
    flex: 1,
    flexShrink: 1,
    fontFamily: 'Paperlogy-4Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    paddingLeft: 12,
    paddingVertical: 8,
  },
});
