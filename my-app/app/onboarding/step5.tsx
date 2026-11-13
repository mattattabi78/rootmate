import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, FONTS, fs } from '../../constants';
import { storage, DEFAULT_NOTIFICATION_TIMES } from '../../store/storage';
import ProgressDots from '../../components/common/ProgressDots';
import Button from '../../components/common/Button';
import TimeStepper, { MORNING_RANGE, EVENING_RANGE } from '../../components/settings/TimeStepper';

// NOTE: expo-notifications가 필요합니다.
// npx expo install expo-notifications
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications 미설치 시 건너뜀
}

export default function Step5() {
  const [plantNickname, setPlantNickname] = useState('');
  const [morning, setMorning] = useState(DEFAULT_NOTIFICATION_TIMES.morning);
  const [evening, setEvening] = useState(DEFAULT_NOTIFICATION_TIMES.evening);
  const [morningOn, setMorningOn] = useState(true);
  const [eveningOn, setEveningOn] = useState(true);

  useEffect(() => {
    storage.getPlantData().then((data) => {
      if (data?.nickname) setPlantNickname(data.nickname);
    });
    storage.getNotificationTimes().then((t) => {
      setMorning(t.morning);
      setEvening(t.evening);
      setMorningOn(t.morningEnabled);
      setEveningOn(t.eveningEnabled);
    });
  }, []);

  const requestAndContinue = async () => {
    await storage.setNotificationTimes({ morning, evening, morningEnabled: morningOn, eveningEnabled: eveningOn });
    if (Notifications && (morningOn || eveningOn)) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // TODO: scheduleInitialNotifications 구현 후 연결
      }
    }
    router.push('/onboarding/complete' as any);
  };

  const skipAndContinue = async () => {
    await storage.setNotificationTimes({ morning, evening, morningEnabled: morningOn, eveningEnabled: eveningOn });
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
          아침과 저녁에 알림을 보내드려요.{'\n'}켜고 끄거나 받고 싶은 시간을 정해주세요.
        </Text>

        {/* 알림 시간 설정 */}
        <View style={styles.list}>
          <View style={styles.timeBox}>
            <View style={styles.boxHead}>
              <Text style={styles.listTitle}>아침 알림</Text>
              <Switch value={morningOn} onValueChange={setMorningOn} trackColor={{ false: '#C5C7C0', true: COLORS.lime }} thumbColor={COLORS.outline} accessibilityLabel="아침 알림" />
            </View>
            <TimeStepper value={morning} range={MORNING_RANGE} onChange={setMorning} disabled={!morningOn} />
            <Text style={styles.listDesc}>오늘 식물을 챙겨달라고 알려줘요</Text>
          </View>
          <View style={styles.timeBox}>
            <View style={styles.boxHead}>
              <Text style={styles.listTitle}>저녁 알림</Text>
              <Switch value={eveningOn} onValueChange={setEveningOn} trackColor={{ false: '#C5C7C0', true: COLORS.lime }} thumbColor={COLORS.outline} accessibilityLabel="저녁 알림" />
            </View>
            <TimeStepper value={evening} range={EVENING_RANGE} onChange={setEvening} disabled={!eveningOn} />
            <Text style={styles.listDesc}>아직 기록 전이라면 알려줘요</Text>
          </View>
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
  backArrow: { fontFamily: FONTS.bold, fontSize: fs(22), color: COLORS.pine },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 48 },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: fs(28),
    color: COLORS.pine,
    lineHeight: fs(38),
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontFamily: FONTS.bold,
    fontSize: fs(15),
    color: COLORS.forest,
    lineHeight: fs(22),
    textAlign: 'center',
    marginBottom: 36,
  },
  list: { gap: 12 },
  timeBox: {
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    borderRadius: 10,
  },
  boxHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: {
    fontFamily: FONTS.bold,
    fontSize: fs(16),
    color: COLORS.pine,
    marginBottom: 2,
  },
  listDesc: { fontFamily: FONTS.medium, fontSize: fs(13), lineHeight: fs(19), color: COLORS.textSecondary, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontFamily: 'SUITE-Regular', fontSize: fs(13), color: COLORS.textTertiary, textDecorationLine: 'underline' },
});
