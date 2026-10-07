// expo-notifications 설치 후 실제 구현
// npx expo install expo-notifications
//
// 현재는 함수 껍데기만 구현. 백엔드 팀원이 실제 로직 채움.
import { PlantType } from '../constants/character';
import { isSupportedTask, PLANT_TASKS, PlantTask, getRandomNotification } from '../constants/plants';
import { STAGE_TASKS, getActiveTaskIds } from '../constants/growthStages';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications 미설치 시 건너뜀
}

// 알림 권한 요청
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * 성장 단계가 바뀔 때마다 호출.
 * 현재 단계의 활성 task 목록을 기반으로 알림을 재스케줄함.
 */
export async function rescheduleNotifications(
  plantType: PlantType,
  currentStage: number,
  plantedAt: string,
): Promise<void> {
  if (!Notifications) return;

  // 1. 기존 예약된 알림 전체 취소
  await Notifications.cancelAllScheduledNotificationsAsync();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // 2. 현재 단계의 활성 task id 목록
  const activeIds = getActiveTaskIds(plantType, currentStage);
  const allTasks = PLANT_TASKS[plantType] ?? [];
  const activeTasks = allTasks.filter(t => isSupportedTask(t.id) && activeIds.includes(t.id as any));

  // 3. 각 task의 notificationTime 기반으로 반복 알림 등록
  for (const task of activeTasks) {
    await scheduleTaskNotification(task, plantedAt);
  }
}

async function scheduleTaskNotification(
  task: PlantTask,
  plantedAt: string,
): Promise<void> {
  if (!Notifications) return;

  const [hStr, mStr] = task.notificationTime.split(':');
  const hour   = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);

  const body = getRandomNotification(task);

  if (task.oneTime) {
    // 1회성 알림: 내일 해당 시각에 한 번만
    const trigger = new Date();
    trigger.setDate(trigger.getDate() + 1);
    trigger.setHours(hour, minute, 0, 0);
    await Notifications.scheduleNotificationAsync({
      content: { title: task.label, body },
      trigger,
    });
    return;
  }

  if (task.intervalDays > 0) {
    // 주기적 알림: intervalDays마다 반복
    // expo-notifications는 seconds 단위의 TimeIntervalTrigger 지원
    await Notifications.scheduleNotificationAsync({
      content: { title: task.label, body },
      trigger: {
        type: 'timeInterval',
        seconds: task.intervalDays * 24 * 60 * 60,
        repeats: true,
      },
    });
  }
}
