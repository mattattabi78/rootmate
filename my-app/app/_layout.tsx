import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { COLORS } from '../constants';
import * as Notifications from 'expo-notifications';
import { TASK_REMINDER_TYPE } from '../utils/notifications';

const LAST_HANDLED_NOTIF_KEY = '@plant/last_handled_notif';   // 같은 알림 누름을 앱을 다시 켤 때 또 처리하지 않으려고 보관

// 앱이 포그라운드 상태일 때도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'SUITE-Regular':   require('../assets/fonts/SUITE-Regular.ttf'),
    'SUITE-Medium':    require('../assets/fonts/SUITE-Medium.ttf'),
    'SUITE-Bold':      require('../assets/fonts/SUITE-Bold.ttf'),
    'SUITE-Heavy':     require('../assets/fonts/SUITE-Heavy.ttf'),
  });

  // '2시간 뒤에 알려줘' 알림을 누르면 채팅으로 바로 이동 (앱이 켜져 있을 때·백그라운드일 때·꺼진 상태에서 눌렀을 때 모두)
  useEffect(() => {
    if (!fontsLoaded) return;
    const handle = async (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const request = response.notification.request;
      if (request.content.data?.type !== TASK_REMINDER_TYPE) return;
      try {
        if ((await AsyncStorage.getItem(LAST_HANDLED_NOTIF_KEY)) === request.identifier) return;
        await AsyncStorage.setItem(LAST_HANDLED_NOTIF_KEY, request.identifier);
      } catch { /* 보관 실패해도 이동은 함 */ }
      router.navigate('/chat' as any);   // 이미 채팅이 열려 있으면 새로 쌓지 않고 그 화면으로
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(r => { handle(r); });
    return () => sub.remove();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
