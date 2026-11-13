import * as Haptics from 'expo-haptics';

// 진동 피드백 도우미. 웹·진동 미지원 기기·시스템 진동 꺼짐에서는 조용히 아무 일도 하지 않는다.
const safe = (fn: () => Promise<void>) => { fn().catch(() => {}); };

export const haptics = {
  light:   () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium:  () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy:   () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
