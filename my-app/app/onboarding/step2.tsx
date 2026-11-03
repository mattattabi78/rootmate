import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { COLORS, FONTS, PLANTS, PLANT_CODES } from '../../constants';
import { storage } from '../../store/storage';
import PlantCharacter from '../../components/common/PlantCharacter';
import { PlantType } from '../../constants/character';
import ProgressDots from '../../components/common/ProgressDots';
import Button from '../../components/common/Button';
import EmojiText from '../../components/common/EmojiText';

type Mode = 'code' | 'select';

// 식물 선택 카드 안 캐릭터 (박스 가로 ≈ 108px). 박스 밖으로 나온 부분은 잘림
const CARD_CHAR_WIDTH = 100;      // 캐릭터 캔버스 가로폭 (세로는 비율로 ×1.48)
const CARD_CHAR_OFFSET_Y = -35;     // 캐릭터를 위(−)/아래(+)로 이동 (px)

export default function Step2() {
  const [mode, setMode] = useState<Mode>('code');
  const [code, setCode] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizedCode = code.trim().toUpperCase();
  const resolvedId = PLANT_CODES[normalizedCode] ?? null;
  const codeIsValid = resolvedId !== null;
  const codeIsTyped = code.trim().length > 0;

  const canGoNext =
    mode === 'code' ? codeIsValid : selectedId !== null;

  const handleNext = async () => {
    if (!canGoNext) return;
    setLoading(true);
    const plantId = mode === 'code' ? resolvedId! : selectedId!;
    await storage.savePlantData({
      id: plantId,
      code: mode === 'code' ? normalizedCode : undefined,
      adoptedAt: new Date().toISOString(),
      nickname: '',
      growthStage: 'seed',
    });
    await storage.saveOnboardingStep(3);
    router.push('/onboarding/step3' as any);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 뒤로가기 + 진행 인디케이터 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <ProgressDots total={5} current={2} />
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>어떤 식물과{'\n'}함께할 건가요?</Text>

          {mode === 'code' ? (
            <>
              <Text style={styles.sub}>배송받은 씨앗 봉투 안에 코드가 있어요.</Text>

              {/* 코드 입력 */}
              <View
                style={[
                  styles.inputWrap,
                  codeIsTyped && codeIsValid && styles.inputWrapValid,
                  codeIsTyped && !codeIsValid && styles.inputWrapError,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder="예) BAS-001"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              {/* 코드 피드백 */}
              {codeIsTyped && codeIsValid && (
                <EmojiText style={styles.feedbackValid}>
                  {PLANTS[resolvedId!].name}이군요! 🌿
                </EmojiText>
              )}
              {codeIsTyped && !codeIsValid && (
                <Text style={styles.feedbackError}>
                  코드를 다시 확인해주세요.
                </Text>
              )}

              {/* 직접 선택 링크 */}
              <TouchableOpacity
                onPress={() => setMode('select')}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkText}>코드가 없으신가요?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sub}>직접 식물을 선택해주세요.</Text>

              <View style={styles.plantGrid}>
                {Object.values(PLANTS).map((plant) => (
                  <TouchableOpacity
                    key={plant.id}
                    style={styles.plantItem}
                    onPress={() => setSelectedId(plant.id)}
                    activeOpacity={0.8}
                  >
                    {/* 캐릭터 사각형 박스*/}
                    <View style={[
                      styles.plantCard,
                      selectedId === plant.id && styles.plantCardSelected,
                    ]}>
                      {/* 박스 중앙에 배치 (이전 64의 2배). 세로 위치는 CARD_CHAR_OFFSET_Y로 조정 */}
                      <View style={{ transform: [{ translateY: CARD_CHAR_OFFSET_Y }] }}>
                        <PlantCharacter
                          plantType={plant.id as PlantType}
                          stage={1}
                          expression="default"
                          width={CARD_CHAR_WIDTH}
                        />
                      </View>
                    </View>
                    {/* 이름은 박스 아래 */}
                    <Text style={[
                      styles.plantName,
                      selectedId === plant.id && styles.plantNameSelected,
                    ]}>
                      {plant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => setMode('code')}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkText}>코드로 입력하기</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="다음"
            disabled={!canGoNext}
            loading={loading}
            onPress={handleNext}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  backArrow: { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.pine },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  heading: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    color: COLORS.pine,
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.forest,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputWrap: {
    height: 52,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  inputWrapValid: { borderColor: COLORS.inputBorderFocus, borderWidth: 1.5 },
  inputWrapError: { borderColor: COLORS.inputBorderError, borderWidth: 1.5 },
  input: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.textPrimary, textAlign: 'center' },
  feedbackValid: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 15,
    color: COLORS.green,
  },
  feedbackError: {
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 15,
    color: COLORS.red,
  },
  switchLink: { marginTop: 20, alignSelf: 'center' },
  switchLinkText: {
    fontFamily: 'SUITE-Medium',
    fontSize: 15,
    color: COLORS.textTertiary,
    textDecorationLine: 'underline',
  },
  plantGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  // 카드 + 이름 전체 래퍼
  plantItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  // 캐릭터가 들어가는 사각형 박스
  plantCard: {
    width: '100%',
    aspectRatio: 1 / 1,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plantCardSelected: {
    borderColor: COLORS.pine,
    backgroundColor: COLORS.limeLight,
  },
  plantEmoji: { fontSize: 28 },
  plantName: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  plantNameSelected: {
    color: COLORS.pine,
    fontFamily: FONTS.extraBold,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
