import React, { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { COLORS } from '../constants';
import { storage } from '../store/storage';
import TopAppBar from '../components/common/TopAppBar';
import BottomNavBar from '../components/common/BottomNavBar';
import PlantCharacter from '../components/common/PlantCharacter';
import { PlantType, GrowthStage, growthStageToNumber, getExpressionImage } from '../constants/character';

const lockIconSvg = `<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.24984 22.9166C5.67692 22.9166 5.18664 22.7128 4.779 22.3052C4.37136 21.8975 4.1672 21.4069 4.1665 20.8333V10.4166C4.1665 9.84371 4.37067 9.35343 4.779 8.94579C5.18734 8.53815 5.67761 8.33399 6.24984 8.33329H7.2915V6.24996C7.2915 4.80899 7.79949 3.58086 8.81546 2.56559C9.83143 1.55031 11.0596 1.04232 12.4998 1.04163C13.9401 1.04093 15.1686 1.54892 16.1853 2.56559C17.2019 3.58225 17.7096 4.81038 17.7082 6.24996V8.33329H18.7498C19.3228 8.33329 19.8134 8.53746 20.2217 8.94579C20.63 9.35413 20.8339 9.8444 20.8332 10.4166V20.8333C20.8332 21.4062 20.6294 21.8968 20.2217 22.3052C19.8141 22.7135 19.3234 22.9173 18.7498 22.9166H6.24984ZM6.24984 20.8333H18.7498V10.4166H6.24984V20.8333ZM13.9717 17.0958C14.3794 16.6888 14.5832 16.1986 14.5832 15.625C14.5832 15.0513 14.3794 14.5611 13.9717 14.1541C13.5641 13.7472 13.0734 13.543 12.4998 13.5416C11.9262 13.5402 11.4359 13.7444 11.029 14.1541C10.6221 14.5638 10.4179 15.0541 10.4165 15.625C10.4151 16.1958 10.6193 16.6864 11.029 17.0968C11.4387 17.5073 11.929 17.7111 12.4998 17.7083C13.0707 17.7055 13.5613 17.5007 13.9717 17.0958ZM9.37484 8.33329H15.6248V6.24996C15.6248 5.3819 15.321 4.64406 14.7134 4.03642C14.1057 3.42878 13.3679 3.12496 12.4998 3.12496C11.6318 3.12496 10.8939 3.42878 10.2863 4.03642C9.67866 4.64406 9.37484 5.3819 9.37484 6.24996V8.33329Z" fill="black"/>
</svg>`;

const ALL_PLANTS: PlantType[] = ['basil', 'tomato', 'tulip'];
const PLANT_LABEL: Record<PlantType, string> = { tomato: '방울토마토', basil: '바질', tulip: '튤립' };

// ─── 메인 화면 ────────────────────────────────────────────────────
export default function CollectionScreen() {
  const router = useRouter();
  const [unlockedType, setUnlockedType] = useState<PlantType>('basil');
  const [growthStage, setGrowthStage] = useState<GrowthStage>(4);
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<{ x: number; y: number; pot_width: number } | null>(null);
  const [genImgFailed, setGenImgFailed] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [plantData, savedPlant] = await Promise.all([
        storage.getPlantData(),
        storage.getGeneratedPlant(),
      ]);
      if (plantData?.id) {
        setUnlockedType(plantData.id as PlantType);
        setGrowthStage(growthStageToNumber(plantData.growthStage));
      }
      if (savedPlant) {
        setGeneratedPlantUri(savedPlant.uri);
        setGeneratedFacePos(savedPlant.facePos);
      }
    })();
  }, []));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar title="RootMate" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 식물 카드 그리드 */}
        <View style={styles.plantGrid}>
          {ALL_PLANTS.map(pt => {
            const isUnlocked = pt === unlockedType;
            return (
              <TouchableOpacity
                key={pt}
                style={styles.plantCard}
                onPress={() => isUnlocked && router.push(`/plant-detail?plantType=${pt}`)}
                disabled={!isUnlocked}
                activeOpacity={0.7}
              >
                <View style={[styles.cardContent, !isUnlocked && styles.cardLocked]}>
                  {isUnlocked ? (
                    generatedPlantUri && !genImgFailed ? (
                      <View style={{ width: 75, height: 75 }}>
                        <Image
                          source={{ uri: generatedPlantUri }}
                          style={{ width: 75, height: 75 }}
                          resizeMode="contain"
                          onError={() => { setGenImgFailed(true); }}
                        />
                        {generatedFacePos && (
                          <Image
                            source={getExpressionImage(pt, 'default')}
                            style={{
                              position: 'absolute',
                              width: 30, height: 30,
                              left: (generatedFacePos.x / 100) * 75 - 15,
                              top:  (generatedFacePos.y / 100) * 75 - 15,
                            }}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                    ) : (
                      <PlantCharacter
                        plantType={pt}
                        stage={growthStage}
                        expression="default"
                        size="small"
                        showVase={true}
                      />
                    )
                  ) : (
                    <View style={styles.lockIcon}>
                      <SvgXml xml={lockIconSvg} width={20} height={20} />
                    </View>
                  )}
                </View>
                <Text style={[styles.plantName, !isUnlocked && styles.plantNameLocked]}>
                  {PLANT_LABEL[pt]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="collection" />
    </SafeAreaView>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },

  // 식물 그리드
  plantGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  plantCard: {
    alignItems: 'center',
    gap: 8,
  },
  cardContent: {
    width: 75,
    height: 75,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLocked: {
    opacity: 0.7,
  },
  lockIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 32,
  },
  plantName: {
    fontFamily: 'ahn2006-M',
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  plantNameLocked: {
    color: COLORS.textTertiary,
  },
});
