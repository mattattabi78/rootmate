import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../../constants';
import { storage } from '../../store/storage';
import ProgressDots from '../../components/common/ProgressDots';
import Button from '../../components/common/Button';

const MAX_LENGTH = 10;

export default function Step1() {
  const [nickname, setNickname] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = nickname.trim().length > 0;

  const handleNext = async () => {
    if (!isValid) return;
    setLoading(true);
    await storage.saveNickname(nickname.trim());
    await storage.saveOnboardingStep(2);
    router.push('/onboarding/step2' as any);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* 진행 인디케이터 (step1은 뒤로가기 없음) */}
        <View style={styles.progressWrap}>
          <ProgressDots total={5} current={1} />
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>만나서 반가워요.</Text>
          <Text style={styles.sub}>어떻게 불러드릴까요?</Text>

          <View
            style={[
              styles.inputWrap,
              isFocused && styles.inputWrapFocused,
            ]}
          >
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={(t) => setNickname(t.slice(0, MAX_LENGTH))}
              placeholder="닉네임"
              placeholderTextColor={COLORS.textTertiary}
              maxLength={MAX_LENGTH}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
            <Text style={styles.counter}>{nickname.length}/{MAX_LENGTH}</Text>
          </View>
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
  progressWrap: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
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
    lineHeight: 26,
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
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
