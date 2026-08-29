import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PlantCharacter from '../../components/common/PlantCharacter';
import { PlantType } from '../../constants/character';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../../constants';
import { storage } from '../../store/storage';
import Button from '../../components/common/Button';
import EmojiText from '../../components/common/EmojiText';

export default function OnboardingComplete() {
  const [plantNickname, setPlantNickname] = useState('');
  const [plantType, setPlantType]         = useState<PlantType>('tomato');
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    storage.getPlantData().then((data) => {
      if (data?.nickname) setPlantNickname(data.nickname);
      if (data?.id) setPlantType(data.id as PlantType);
    });

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleStart = async () => {
    await storage.completeOnboarding();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {/* 화분 등장 애니메이션 */}
        <Animated.View
          style={[
            styles.potWrap,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <EmojiText style={styles.potEmoji}>🪴</EmojiText>
        </Animated.View>

        {/* 메시지 */}
        <Animated.View style={{ opacity: opacityAnim }}>
          <Text style={styles.title}>씨앗을 심었어요.</Text>
          {plantNickname ? (
            <Text style={styles.subtitle}>
              {plantNickname}의 첫 번째 날이에요.
            </Text>
          ) : null}
          <Text style={styles.body}>
            {'앞으로 잘 부탁해요!'}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Button label="시작하기" onPress={handleStart} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  potWrap: {
    width: 160,
    height: 160,
    backgroundColor: COLORS.cardBg,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outline,
  },
  potEmoji: { fontSize: 72 },
  title: {
    fontFamily: 'ahn2006-B',
    fontSize: 28,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 15,
    color: COLORS.green,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  body: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 15,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
