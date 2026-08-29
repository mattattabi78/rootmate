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
    'ahn2006-B': require('../assets/fonts/ASS 2006 bold.ttf'),
    'ahn2006-M': require('../assets/fonts/ASS 2006 medium.ttf'),
    'Paperlogy-4Regular': require('../assets/fonts/Paperlogy-4Regular.ttf'),
    'Paperlogy-5Medium': require('../assets/fonts/Paperlogy-5Medium.ttf'),
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}