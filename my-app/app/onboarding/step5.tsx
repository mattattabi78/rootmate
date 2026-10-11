import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, FONTS } from '../../constants';
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

  useEffect(() => {
    storage.getPlantData().then((data) => {
      if (data?.nickname) setPlantNickname(data.nickname);
    });
    storage.getNotificationTimes().then((t) => {
      setMorning(t.morning);
      setEvening(t.evening);
    });
  }, []);

  const requestAndContinue = async () => {
    await storage.setNotificationTimes({ ...DEFAULT_NOTIFICATION_TIMES, morning, evening });
    if (Notifications) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // TODO: scheduleInitialNotifications 구현 후 연결
      }
    }
    router.push('/onboarding/complete' as any);
  };

  const skipAndContinue = async () => {
    await storage.setNotificationTimes({ ...DEFAULT_NOTIFICATION_TIMES, morning, evening });
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
          아침과 저녁에 알림을 보내드려요.{'\n'}받고 싶은 시간을 정해주세요.
        </Text>

        {/* 알림 시간 설정 */}
        <View style={styles.list}>
          <View style={styles.timeBox}>
            <Text style={styles.listTitle}>아침 알림</Text>
            <TimeStepper value={morning} range={MORNING_RANGE} onChange={setMorning} />
            <Text style={styles.listDesc}>오늘 식물을 챙겨달라고 알려줘요</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.listTitle}>저녁 알림</Text>
            <TimeStepper value={evening} range={EVENING_RANGE} onChange={setEvening} />
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
  backArrow: { fontFamily: FONTS.extraBold, fontSize: 22, color: COLORS.pine },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 48 },
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
    marginBottom: 36,
  },
  list: { gap: 12 },
  timeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    borderRadius: 10,
  },
  listTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: COLORS.pine,
    textAlign: 'center',
    marginBottom: 2,
  },
  listDesc: { fontFamily: FONTS.semiBold, fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontFamily: 'SUITE-Regular', fontSize: 13, color: COLORS.textTertiary, textDecorationLine: 'underline' },
});
