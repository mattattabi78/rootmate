import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PlantType } from '../constants/character';

export const MORNING_NOTIF_ID = 'rootmate-daily-am';
export const EVENING_NOTIF_ID = 'rootmate-daily-pm';

const PLANT_NOTIF: Record<PlantType, {
  morning: { title: string; body: string };
  evening: { title: string; body: string };
  remind: (label: string) => { title: string; body: string };
}> = {
  basil: {
    morning: { title: '🌿 일어났어?', body: '오늘 까먹지 말고 나 챙겨줘~' },
    evening: { title: '🌿 아직이야?', body: '아직 안 한 거 알아. 괜찮아. 지금이라도 해 줘.' },
    remind: (label) => ({ title: `🌿 ${label}`, body: `아까 못 했다고 했잖아. 지금은?` }),
  },
  tomato: {
    morning: { title: '🍅 좋은 아침이야!', body: '오늘 나 관리해주는거 잊지 않았지? 같이 해보자~ (๑>ᴗ<๑)' },
    evening: { title: '🍅 아직이야?', body: '아직 못 했지? 빨리 와줘! ><' },
    remind: (label) => ({ title: `🍅 ${label} 잊은 거 아니지?`, body: `2시간 됐는데, 이제 할 수 있어?` }),
  },
  tulip: {
    morning: { title: '🌷 안녕하세요', body: '오늘 저 관리해주는거 잊지 말아주세요 🌷' },
    evening: { title: '🌷 task가 남아있어요', body: '아직 완료하지 못하셨나요? 지금 해주시겠어요?' },
    remind: (label) => ({ title: `🌷 ${label} 알림`, body: `지금은 하실 수 있으실까요?` }),
  },
};

async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RootMate',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#b5ff22',
      enableVibrate: true,
    });
  }
}

/** task 미완료 시 2시간 뒤 알림 예약 */
export async function scheduleTaskReminder(taskLabel: string, plantType: PlantType): Promise<void> {
  if (!(await hasPermission())) return;
  await ensureAndroidChannel();
  const msgs = PLANT_NOTIF[plantType] ?? PLANT_NOTIF.tomato;
  const { title, body } = msgs.remind(taskLabel);
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: 'timeInterval', seconds: 7200, repeats: false } as any,
  });
}

/**
 * 일일 알림 갱신 — 앱 열릴 때마다 호출
 * - 오전 9시: 없을 때만 recurring 등록 (매일 반복)
 * - 오후 9시: recurring 등록 후 완료 시 취소, 다음 날 앱 열 때 미완료면 재등록
 */
export async function refreshDailyNotifications(plantType: PlantType, todayDone: boolean): Promise<void> {
  if (!(await hasPermission())) return;
  await ensureAndroidChannel();

  const msgs = PLANT_NOTIF[plantType] ?? PLANT_NOTIF.tomato;
  const all = await Notifications.getAllScheduledNotificationsAsync();

  // 오전 9시: 아직 등록 안 된 경우에만 추가 (recurring이라 한 번만 설정)
  if (!all.some(n => n.identifier === MORNING_NOTIF_ID)) {
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_NOTIF_ID,
      content: { title: msgs.morning.title, body: msgs.morning.body, sound: true },
      trigger: { type: 'calendar', repeats: true, hour: 9, minute: 0 } as any,
    });
  }

  // 오후 9시: 미완료 → recurring 유지(없으면 등록), 완료 → 취소
  const hasEvening = all.some(n => n.identifier === EVENING_NOTIF_ID);
  if (todayDone) {
    if (hasEvening) {
      await Notifications.cancelScheduledNotificationAsync(EVENING_NOTIF_ID).catch(() => {});
    }
  } else if (!hasEvening) {
    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_NOTIF_ID,
      content: { title: msgs.evening.title, body: msgs.evening.body, sound: true },
      trigger: { type: 'calendar', repeats: true, hour: 21, minute: 0 } as any,
    });
  }
}

/** tasks 완료 시 오늘 저녁 알림 취소 */
export async function cancelEveningNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(EVENING_NOTIF_ID).catch(() => {});
}
