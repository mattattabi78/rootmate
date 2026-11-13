import { DailyRecord } from '../store/storage';
import { getTaskLabel } from '../constants/plants';
import { PlantType } from '../constants/character';
import { getPlantMessages, getChecklistLabel } from '../constants/chatMessages';

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
  const altIds: string[] = record.altTaskIds ?? [];
  const allTaskIds = [...new Set([...completedIds, ...altIds, ...(record.waterDone ? ['water'] : [])])];

  // 체크리스트: 오늘 기록된 task를 한 번에 체크한 것처럼 복원
  if (allTaskIds.length > 0) {
    const doneLabels = completedIds.map(tid => getChecklistLabel(tid, getTaskLabel(plantType, tid)));
    const altLabels  = altIds.filter(tid => !completedIds.includes(tid)).map(tid => getTaskLabel(plantType, tid));
    msgs.push({ id: id(), from: 'plant', text: m ? m.checklistAsk() : '오늘 한 일을 체크해 주세요.' });
    const lines = [
      ...doneLabels.map(l => `✔ ${l}`),
      ...altLabels.map(l => `✔ ${l}: 오늘은 안 해도 돼요`),
    ];
    if (lines.length > 0) msgs.push({ id: id(), from: 'user', text: lines.join('\n') });
    if (doneLabels.length > 0) msgs.push({ id: id(), from: 'plant', text: m ? m.checklistResult('all', []) : '확인했어요. 🌿' });
  }

  if (record.question) {
    msgs.push({ id: id(), from: 'plant', text: record.question });
    if (record.skippedQuestion) {
      msgs.push({ id: id(), from: 'user',  text: '그냥 넘길게.' });
      msgs.push({ id: id(), from: 'plant', text: m ? m.alreadyDone() : '그래도 괜찮아요. 오늘도 수고했어요 🌿' });
    } else if (record.answer) {
      msgs.push({ id: id(), from: 'user',  text: record.answer });
      msgs.push({ id: id(), from: 'plant', text: record.aiReply ?? '그렇군요. 오늘도 잘 하셨어요 🌿' });
    }
  }

  return msgs;
}
