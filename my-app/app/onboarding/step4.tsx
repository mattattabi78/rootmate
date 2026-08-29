import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, PLANTS } from '../../constants';
import { storage } from '../../store/storage';
import ProgressDots from '../../components/common/ProgressDots';
import Button from '../../components/common/Button';
import EmojiText from '../../components/common/EmojiText';

const MAX_LENGTH = 10;

export default function Step4() {
  const [plantNickname, setPlantNickname] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [plantId, setPlantId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    storage.getPlantData().then((data) => {
      if (data) setPlantId(data.id);
    });
  }, []);

  const isValid = plantNickname.trim().length > 0;
  const hint = PLANTS[plantId]?.nicknameHint ?? '예쁜 이름을 지어주세요...';

  const handleNext = async () => {
    if (!isValid) return;
    setLoading(true);
    await storage.updatePlantData({ nickname: plantNickname.trim() });
    await storage.saveOnboardingStep(5);
    router.push('/onboarding/step5' as any);
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
          <ProgressDots total={5} current={4} />
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>룻메이트의 이름을{'\n'}지어줄게요.</Text>

          <View
            style={[
              styles.inputWrap,
              isFocused && styles.inputWrapFocused,
            ]}
          >
            <TextInput
              style={styles.input}
              value={plantNickname}
              onChangeText={(t) => setPlantNickname(t.slice(0, MAX_LENGTH))}
              placeholder={hint}
              placeholderTextColor={COLORS.textTertiary}
              maxLength={MAX_LENGTH}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
            <Text style={styles.counter}>{plantNickname.length}/{MAX_LENGTH}</Text>
          </View>

          {isValid && (
            <EmojiText style={styles.confirmation}>
              {plantNickname.trim()} 잘 부탁해요 🌱
            </EmojiText>
          )}
        </View>

        <View style={styles.footer}>
          <Button
            label="다음"
            disabled={!isValid}
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
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  heading: {
    fontFamily: 'ahn2006-B',
    fontSize: 36,
    color: COLORS.textPrimary,
    lineHeight: 44,
    marginBottom: 40,
  },
  inputWrap: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputWrapFocused: { borderColor: COLORS.inputBorderFocus, borderWidth: 1.5 },
  input: { flex: 1, fontFamily: 'ahn2006-M', fontSize: 20, color: COLORS.textPrimary, padding: 0 },
  counter: { fontFamily: 'ahn2006-M', fontSize: 20, color: COLORS.textTertiary, marginLeft: 8 },
  confirmation: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 15,
    marginTop: 16,
    color: COLORS.green,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
