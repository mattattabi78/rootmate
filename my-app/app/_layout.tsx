import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { COLORS } from '../constants';
import * as Notifications from 'expo-notifications';

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
    'SUITE-Light':     require('../assets/fonts/SUITE-Light.ttf'),
    'SUITE-Regular':   require('../assets/fonts/SUITE-Regular.ttf'),
    'SUITE-Medium':    require('../assets/fonts/SUITE-Medium.ttf'),
    'SUITE-SemiBold':  require('../assets/fonts/SUITE-SemiBold.ttf'),
    'SUITE-Bold':      require('../assets/fonts/SUITE-Bold.ttf'),
    'SUITE-ExtraBold': require('../assets/fonts/SUITE-ExtraBold.ttf'),
    'SUITE-Heavy':     require('../assets/fonts/SUITE-Heavy.ttf'),
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
