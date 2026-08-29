import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../../constants';
import { storage } from '../../store/storage';
import ProgressDots from '../../components/common/ProgressDots';
import Button from '../../components/common/Button';
import EmojiText from '../../components/common/EmojiText';

// NOTE: expo-notifications가 필요합니다.
// npx expo install expo-notifications
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications 미설치 시 건너뜀
}

const NOTIFICATION_ITEMS = [
  { icon: '💧', title: '물 주기 알림', desc: '식물에게 물 줄 때가 됐을 때' },
  { icon: '☀️', title: '햇빛 알림',   desc: '오전 10시, 햇빛 체크 알림' },
  { icon: '🌿', title: '기록 알림',   desc: '오후 8시, 오늘 기록 독려' },
  { icon: '🌱', title: '성장 알림',   desc: '특별한 순간 (새싹, 꽃 등)' },
];

export default function Step5() {
  const [plantNickname, setPlantNickname] = useState('');

  useEffect(() => {
    storage.getPlantData().then((data) => {
      if (data?.nickname) setPlantNickname(data.nickname);
    });
  }, []);

  const requestAndContinue = async () => {
    if (Notifications) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // TODO: scheduleInitialNotifications 구현 후 연결
      }
    }
    router.push('/onboarding/complete' as any);
  };

  const skipAndContinue = () => {
    router.push('/onboarding/complete' as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 뒤로가기 + 진행 인디케이터 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <ProgressDots total={5} current={5} />
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>
          {plantNickname
            ? `${plantNickname}가 잘 자랄 수 있게\n제때 알려드릴게요.`
            : '제때 알려드릴게요.'}
        </Text>
        <Text style={styles.sub}>
          알림을 허용하면 물 주기, 햇빛,{'\n'}성장 기록 알림을 받아요.
        </Text>

        {/* 알림 종류 리스트 */}
        <View style={styles.list}>
          {NOTIFICATION_ITEMS.map((item) => (
            <View key={item.title} style={styles.listItem}>
              <EmojiText style={styles.listIcon}>{item.icon}</EmojiText>
              <View>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 버튼 영역 */}
      <View style={styles.footer}>
        <Button label="알림 허용하기" onPress={requestAndContinue} />
        <TouchableOpacity onPress={skipAndContinue} style={styles.skipBtn}>
          <Text style={styles.skipText}>나중에 설정하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  heading: {
    fontFamily: 'ahn2006-B',
    fontSize: 32,
    color: COLORS.textPrimary,
    lineHeight: 38,
    marginBottom: 8,
  },
  sub: {
    fontFamily: 'Paperlogy-4Regular',
    fontSize: 15,
    color: COLORS.textGreen,
    lineHeight: 25,
    marginBottom: 36,
  },
  list: { gap: 20 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  listIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  listTitle: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  listDesc: { fontFamily: 'Paperlogy-4Regular', fontSize: 13, color: COLORS.textTertiary },
  footer: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontFamily: 'Paperlogy-4Regular', fontSize: 13, color: COLORS.textTertiary, textDecorationLine: 'underline' },
});
