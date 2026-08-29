import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, PLANTS, Plant } from '../../constants';
import { storage } from '../../store/storage';
import ProgressDots from '../../components/common/ProgressDots';
import Button from '../../components/common/Button';
import PlantCharacter from '../../components/common/PlantCharacter';
import { PlantType } from '../../constants/character';

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
            size="medium"
          />
        </View>

        {/* 이름 + 학명 */}
        <Text style={styles.plantName}>{plant.name}</Text>
        <Text style={styles.description}>{plant.description}</Text>

        {/* 관리 정보 카드 */}
        <View style={styles.careCard}>
          <CareRow label="발아까지" value={`약 ${plant.growthDays.sprout}일`} />
          <View style={styles.divider} />
          <CareRow label="물 주기" value={plant.care.water} />
          <View style={styles.divider} />
          <CareRow label="햇빛" value={plant.care.sunlight} />
          <View style={styles.divider} />
          <CareRow label="온도" value={plant.care.temperature} />
          <View style={styles.divider} />
          <CareRow label="주의사항" value={plant.care.caution} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="다음" onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
}

function CareRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.careRow}>
      <Text style={styles.careLabel}>{label}</Text>
      <Text style={styles.careValue}>{value}</Text>
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
  backArrow: { fontFamily: 'ahn2006-B', fontSize: 22, color: COLORS.textPrimary },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  illustration: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  plantName: {
    fontFamily: 'ahn2006-B',
    fontSize: 28,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 15,
    color: COLORS.textGreen,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 15,
    marginBottom: 28,
  },
  careCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    overflow: 'hidden',
  },
  careRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  careLabel: { fontFamily: 'Paperlogy-5Medium', fontSize: 15, color: COLORS.textTertiary },
  careValue: { fontFamily: 'Paperlogy-5Medium', fontSize: 15, color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.inputBorder, marginHorizontal: 16 },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
