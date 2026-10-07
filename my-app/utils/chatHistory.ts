import { DailyRecord } from '../store/storage';
import { getTaskLabel } from '../constants/plants';
import { PlantType } from '../constants/character';
import { getPlantMessages } from '../constants/chatMessages';

export interface ChatMsg {
  id: string;
  from: 'plant' | 'user';
  text: string;
}

export function reconstructDayChat(record: DailyRecord, plantNickname: string, plantType?: PlantType): ChatMsg[] {
  const m = plantType ? getPlantMessages(plantType) : null;

  let base = Date.now();
  const id = () => String(base++);
  const msgs: ChatMsg[] = [
    { id: id(), from: 'plant', text: m ? m.greeting(plantNickname) : `안녕하세요! 오늘도 ${plantNickname}와 함께해요 🌱` },
  ];

  const completedIds: string[] = record.completedTaskIds ?? (record.waterDone ? ['water'] : []);
  const allTaskIds = [...new Set([...completedIds, ...(record.waterDone ? ['water'] : [])])];

  for (const taskId of allTaskIds) {
    const label = getTaskLabel(plantType, taskId);
    const done  = completedIds.includes(taskId);

    msgs.push({ id: id(), from: 'plant', text: m ? m.taskAsk(label) : `오늘 ${label} 하셨나요?` });
    msgs.push({
      id: id(), from: 'user',
      text: done
        ? (taskId === 'water' ? '완료했어요 ✅' : '완료했어요 ✓')
        : (taskId === 'water' ? '물 주지 못했어…' : '아직이요'),
    });
    if (done) {
      msgs.push({ id: id(), from: 'plant', text: m ? m.taskDone() : '잘 하셨어요! 🌿' });
    } else if (taskId === 'water') {
      msgs.push({ id: id(), from: 'plant', text: m ? m.reminderNo() : '괜찮아요. 잊기 쉬운 날도 있죠 🌱' });
    } else {
      msgs.push({ id: id(), from: 'plant', text: m ? m.reminderNo() : '괜찮아요. 나중에 해봐요 🌿' });
    }
  }

  if (record.question) {
    msgs.push({ id: id(), from: 'plant', text: record.question });
    if (record.skippedQuestion) {
      msgs.push({ id: id(), from: 'user',  text: '그냥 넘길게요.' });
      msgs.push({ id: id(), from: 'plant', text: m ? m.alreadyDone() : '그래도 괜찮아요. 오늘도 수고했어요 🌿' });
    } else if (record.answer) {
      msgs.push({ id: id(), from: 'user',  text: record.answer });
      msgs.push({ id: id(), from: 'plant', text: record.aiReply ?? '그렇군요. 오늘도 잘 하셨어요 🌿' });
    }
  }

  return msgs;
}
