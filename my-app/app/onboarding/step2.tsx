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
import { COLORS, PLANTS, PLANT_CODES } from '../../constants';
import { storage } from '../../store/storage';
import PlantCharacter from '../../components/common/PlantCharacter';
import { PlantType } from '../../constants/character';
import ProgressDots from '../../components/common/ProgressDots';
import Button from '../../components/common/Button';
import EmojiText from '../../components/common/EmojiText';

type Mode = 'code' | 'select';

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
                      <PlantCharacter
                        plantType={plant.id as PlantType}
                        stage={1}
                        expression="default"
                        size="small"
                      />
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
  backArrow: { fontFamily: 'ahn2006-B', fontSize: 22, color: COLORS.textPrimary },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  heading: {
    fontFamily: 'ahn2006-B',
    fontSize: 36,
    color: COLORS.textPrimary,
    lineHeight: 44,
    marginBottom: 8,
  },
  sub: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 15,
    color: COLORS.textGreen,
    lineHeight: 24,
    marginBottom: 32,
  },
  inputWrap: {
    height: 52,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  inputWrapValid: { borderColor: COLORS.inputBorderFocus, borderWidth: 1.5 },
  inputWrapError: { borderColor: COLORS.inputBorderError, borderWidth: 1.5 },
  input: { fontFamily: 'ahn2006-M', fontSize: 20, color: COLORS.textPrimary },
  feedbackValid: {
    fontFamily: 'Paperlogy-5Medium',
    marginTop: 8,
    fontSize: 15,
    color: COLORS.green,
  },
  feedbackError: {
    fontFamily: 'Paperlogy-5Medium',
    marginTop: 8,
    fontSize: 15,
    color: COLORS.red,
  },
  switchLink: { marginTop: 20, alignSelf: 'center' },
  switchLinkText: {
    fontFamily: 'Paperlogy-5Medium',
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
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plantCardSelected: {
    borderColor: COLORS.green,
    backgroundColor: '#EEF6E9',
  },
  plantEmoji: { fontSize: 28 },
  plantName: {
    fontFamily: 'ahn2006-M',
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  plantNameSelected: {
    color: COLORS.green,
    fontFamily: 'ahn2006-B',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
