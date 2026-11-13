import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, FONTS, PLANTS, Plant, fs } from '../../constants';
import { storage } from '../../store/storage';
import ProgressDots from '../../components/common/ProgressDots';
import Button from '../../components/common/Button';
import PlantCharacter from '../../components/common/PlantCharacter';
import { PlantType } from '../../constants/character';
import { ActionIcon } from '../../components/common/ActionIconButton';
import { SproutPixelIcon, SunPixelIcon, ThermometerPixelIcon, SparklePixelIcon } from '../../components/common/PixelIcons';

// 앱 전용 픽셀 아이콘 색 (도감 상세 화면과 같은 색)
const ICON_COLOR = { sprout: '#38D76D', sun: '#FF8E47', temp: '#FF6B49', caution: '#FF5C8D' };

export default function Step3() {
  const [plant, setPlant] = useState<Plant | null>(null);

  useEffect(() => {
    storage.getPlantData().then((data) => {
      if (data) setPlant(PLANTS[data.id] ?? null);
    });
  }, []);

  const handleNext = async () => {
    await storage.saveOnboardingStep(4);
    router.push('/onboarding/step4' as any);
  };

  if (!plant) return null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 뒤로가기 + 진행 인디케이터 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <ProgressDots total={5} current={3} />
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 식물 캐릭터 */}
        <View style={styles.illustration}>
          <PlantCharacter
            plantType={plant.id as PlantType}
            stage={1}
            expression="default"
            width={150}
          />
        </View>

        {/* 이름 + 학명 */}
        <Text style={styles.plantName}>{plant.name}</Text>
        <Text style={styles.description}>{plant.description}</Text>

        {/* 관리 정보: 박스 없이 아이콘 + 한 줄 문장 (글자 스타일 통일, 목록 전체는 가운데) */}
        <View style={styles.careList}>
          <CareRow icon={<SproutPixelIcon color={ICON_COLOR.sprout} size={16} />} text={`발아까지 약 ${plant.growthDays.sprout}일`} />
          <CareRow icon={<ActionIcon kind="water" height={16} />} text={`물은 ${plant.care.water} 주기`} />
          <CareRow icon={<SunPixelIcon color={ICON_COLOR.sun} size={16} />} text={`햇빛은 ${plant.care.sunlight}`} />
          <CareRow icon={<ThermometerPixelIcon color={ICON_COLOR.temp} size={16} />} text={`적정온도는 ${plant.care.temperature}`} />
          <CareRow icon={<SparklePixelIcon color={ICON_COLOR.caution} size={16} />} text={plant.care.caution} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {/* 스크롤 내용이 '다음' 버튼 위에서 자연스럽게 사라지도록 흰색 그라데이션 */}
        <Svg style={styles.fade} width="100%" height={40} preserveAspectRatio="none" pointerEvents="none">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="40" fill="url(#fade)" />
        </Svg>
        <Button label="다음" onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
}

function CareRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.careRow}>
      <View style={styles.careIcon}>{icon}</View>
      <Text style={styles.careText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  backArrow: { fontFamily: FONTS.bold, fontSize: fs(22), color: COLORS.pine },
  content: { flexGrow: 1, justifyContent: 'flex-start', paddingTop: 8, paddingHorizontal: 24, paddingBottom: 48 },
  illustration: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  plantName: {
    fontFamily: FONTS.bold,
    fontSize: fs(24),
    color: COLORS.pine,
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontFamily: FONTS.medium,
    fontSize: fs(13),
    color: COLORS.forest,
    textAlign: 'center',
    lineHeight: fs(20),
    marginTop: 15,
    marginBottom: 48,
  },
  // 관리 정보: 항목 안은 왼쪽 정렬, 묶음 전체는 화면 가운데
  careList: { alignSelf: 'center', gap: 16 },
  careRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  careIcon: { width: 22, alignItems: 'center', justifyContent: 'center' },
  careText: { flexShrink: 1, fontFamily: FONTS.medium, fontSize: fs(13), lineHeight: fs(20), color: COLORS.textPrimary },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  // 버튼 바로 위로 40만큼 올라가 스크롤 내용을 덮음
  fade: { position: 'absolute', top: -40, left: 0, right: 0 },
});
