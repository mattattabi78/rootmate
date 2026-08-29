import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '../constants';
import { storage, DailyRecord } from '../store/storage';
import { PLANT_TASKS } from '../constants/plants';
import { PlantType } from '../constants/character';
import TopAppBar from '../components/common/TopAppBar';
import BottomNavBar from '../components/common/BottomNavBar';
import EmojiText from '../components/common/EmojiText';
import { getDateStringForMonthDay } from '../utils/date';
import { getDevAdjustedDate } from '../utils/devOverrides';
import HeartImage from '../assets/images/heart.svg';

let LinearGradient: React.ComponentType<any> | null = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}

function Grad({ colors, style, children }: { colors: string[]; style?: any; children?: React.ReactNode }) {
  if (LinearGradient) {
    return <LinearGradient colors={colors} style={style}>{children}</LinearGradient>;
  }
  return <View style={[style, { backgroundColor: colors[colors.length - 1] }]}>{children}</View>;
}

// ─── 달력 유틸 ────────────────────────────────────────────────────
type DayEntry = { day: number; type: 'prev' | 'cur' | 'next' };

function buildMonthGrid(year: number, month: number): DayEntry[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const daysInPrev   = new Date(year, month, 0).getDate();
  const grid: DayEntry[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--)
    grid.push({ day: daysInPrev - i, type: 'prev' });
  for (let d = 1; d <= daysInMonth; d++)
    grid.push({ day: d, type: 'cur' });
  const rem = 42 - grid.length;
  for (let d = 1; d <= rem; d++)
    grid.push({ day: d, type: 'next' });
  return grid;
}

const MONTH_NAMES  = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADERS  = ['S','M','T','W','T','F','S'];
const DAY_KOR      = ['일','월','화','수','목','금','토'];

function formatDateLabel(year: number, month: number, day: number) {
  const d = new Date(year, month, day);
  return `${SHORT_MONTHS[month]} ${day}, ${year} (${DAY_KOR[d.getDay()]})`;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
type TabView = 'calendar' | 'album';

export default function CalendarScreen() {
  const [view, setView] = useState<TabView>('calendar');

  const [today, setToday]           = useState(() => getDevAdjustedDate());
  const [year, setYear]             = useState(today.getFullYear());
  const [month, setMonth]           = useState(today.getMonth());
  const [recordDays, setRecordDays] = useState<number[]>([]);
  const [plantType, setPlantType]   = useState<PlantType>('tomato');

  // 모달 상태
  const [modalVisible,   setModalVisible]   = useState(false);
  const [modalDateLabel, setModalDateLabel] = useState('');
  const [modalRecord,    setModalRecord]    = useState<DailyRecord | null>(null);

  const loadRecordDays = useCallback(async (y: number, m: number) => {
    const days = await storage.getRecordedDaysForMonth(y, m);
    setRecordDays(days);
  }, []);

  useFocusEffect(useCallback(() => {
    // 개발자 모드 날짜 반영
    const devToday = getDevAdjustedDate();
    setToday(devToday);
    setYear(devToday.getFullYear());
    setMonth(devToday.getMonth());
    loadRecordDays(devToday.getFullYear(), devToday.getMonth());
    storage.getPlantData().then(d => {
      if (d?.id) setPlantType(d.id as PlantType);
    });
  }, [loadRecordDays]));

  const goToPrev = () => {
    const nm = month === 0 ? 11 : month - 1;
    const ny = month === 0 ? year - 1 : year;
    setMonth(nm); setYear(ny); loadRecordDays(ny, nm);
  };
  const goToNext = () => {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    setMonth(nm); setYear(ny); loadRecordDays(ny, nm);
  };

  const handleDayPress = async (day: number) => {
    const dateStr = getDateStringForMonthDay(year, month, day);
    let record: DailyRecord | null = await storage.getDailyRecord(dateStr);
    if (!record) {
      const photos = await storage.getPlantPhotos(dateStr);
      if (!photos[0]) return;
      record = {
        date: dateStr,
        waterDone: false,
        completedTaskIds: [],
        recordDone: false,
        question: '',
        answer: '',
        skippedQuestion: true,
        plantPhotoUri: photos[0],
      };
    }
    setModalDateLabel(formatDateLabel(year, month, day));
    setModalRecord(record);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 탭 스위처 */}
        <View style={styles.tabRow}>
          {(['calendar', 'album'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={styles.tabWrapper}
              onPress={() => setView(tab)}
              activeOpacity={0.85}
            >
              {view === tab ? (
                <Grad colors={['#f3f4f1', '#b5ff22']} style={styles.tabActive}>
                  <Text style={styles.tabActiveText}>{tab === 'calendar' ? '캘린더' : '앨범'}</Text>
                </Grad>
              ) : (
                <View style={styles.tabInactive}>
                  <Text style={styles.tabInactiveText}>{tab === 'calendar' ? '캘린더' : '앨범'}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 카드 컨테이너 */}
        <View style={styles.card}>
          {/* 월 헤더 */}
          <View style={styles.monthRow}>
            <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPrev} hitSlop={10}>
                <Text style={styles.navArrow}>{'<'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToNext} hitSlop={10}>
                <Text style={styles.navArrow}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {view === 'calendar' ? (
            <CalendarGrid
              year={year} month={month} today={today}
              recordDays={recordDays} onDayPress={handleDayPress}
            />
          ) : (
            <AlbumList
              year={year} month={month}
              recordDays={recordDays}
              onDayPress={handleDayPress}
            />
          )}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="calendar" />

      {/* 날짜 채팅 기록 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalDateLabel}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={12}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {modalRecord && (
                <DayRecordSummary record={modalRecord} plantType={plantType} />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 날짜 기록 요약 ───────────────────────────────────────────────
function DayRecordSummary({ record, plantType }: { record: DailyRecord; plantType: PlantType }) {
  const allTasks = PLANT_TASKS[plantType] ?? [];
  const completedIds = record.completedTaskIds ?? (record.waterDone ? ['water'] : []);

  // 완료한 task + 완료 못 한 water task 모두 표시
  const shownTaskIds = [...new Set([
    ...completedIds,
    ...(record.waterDone === false && !completedIds.includes('water') ? ['water'] : []),
    ...(completedIds.length === 0 && record.waterDone ? ['water'] : []),
  ])];

  const hasContent = shownTaskIds.length > 0 || record.question || record.answer || record.plantPhotoUri;

  return (
    <View style={sumStyles.container}>
      {!hasContent && (
        <Text style={sumStyles.skipped}>기록 내용이 없어요.</Text>
      )}

      {/* task 완료 현황 */}
      {shownTaskIds.length > 0 && (
        <View style={sumStyles.section}>
          <Text style={sumStyles.sectionTitle}>오늘의 관리</Text>
          {shownTaskIds.map(taskId => {
            const def  = allTasks.find(t => t.id === taskId);
            const done = completedIds.includes(taskId);
            return (
              <View key={taskId} style={sumStyles.taskRow}>
                <Text style={[sumStyles.taskCheck, done ? sumStyles.taskDone : sumStyles.taskSkip]}>
                  {done ? '✓' : '✗'}
                </Text>
                <Text style={sumStyles.taskLabel}>{def?.label ?? taskId}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 오늘의 질문 + 답변 */}
      {(record.question || record.answer) ? (
        <View style={sumStyles.section}>
          <Text style={sumStyles.sectionTitle}>오늘의 기록</Text>
          {record.question ? <Text style={sumStyles.question}>{record.question}</Text> : null}
          {record.answerImageUri ? (
            <Image source={{ uri: record.answerImageUri }} style={sumStyles.answerImage} resizeMode="cover" />
          ) : record.answer ? (
            <View style={sumStyles.answerBox}>
              <Text style={sumStyles.answer}>{record.answer}</Text>
            </View>
          ) : (
            <Text style={sumStyles.skipped}>건너뜀</Text>
          )}
        </View>
      ) : null}

      {record.plantPhotoUri ? (
        <View style={sumStyles.section}>
          <EmojiText style={sumStyles.sectionTitle}>오늘의 식물 사진 📸</EmojiText>
          <Image source={{ uri: record.plantPhotoUri }} style={sumStyles.plantPhoto} resizeMode="cover" />
        </View>
      ) : null}
    </View>
  );
}

const sumStyles = StyleSheet.create({
  container:    { gap: 20 },
  section:      { gap: 10 },
  sectionTitle: { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.green },
  taskRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskCheck:    { fontFamily: 'Paperlogy-5Medium', fontSize: 16, width: 20, textAlign: 'center' },
  taskDone:     { color: COLORS.green },
  taskSkip:     { color: COLORS.textTertiary },
  taskLabel:    { fontFamily: 'Paperlogy-5Medium', fontSize: 14, color: COLORS.textPrimary },
  question:     { fontFamily: 'Paperlogy-5Medium', fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  answerBox:    { backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1.5,
                  borderColor: COLORS.outline, padding: 12 },
  answer:       { fontFamily: 'Paperlogy-4Regular', fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },
  skipped:      { fontFamily: 'Paperlogy-4Regular', fontSize: 13, color: COLORS.textTertiary },
  answerImage:  { width: '100%', height: 200, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.outline },
  plantPhoto:   { width: '100%', height: 220, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.outline },
});

// ─── 캘린더 그리드 ────────────────────────────────────────────────
function CalendarGrid({ year, month, today, recordDays, onDayPress }: {
  year: number; month: number; today: Date; recordDays: number[];
  onDayPress: (day: number) => void;
}) {
  const grid = buildMonthGrid(year, month);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <View>
      <View style={styles.weekRow}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={styles.dayCell}>
            <Text style={styles.dayHeader}>{d}</Text>
          </View>
        ))}
      </View>
      {Array.from({ length: 6 }).map((_, row) => (
        <View key={row} style={styles.weekRow}>
          {grid.slice(row * 7, row * 7 + 7).map((entry, col) => {
            const isToday    = isCurrentMonth && entry.type === 'cur' && entry.day === today.getDate();
            const hasRecord  = entry.type === 'cur' && recordDays.includes(entry.day);
            const pressable  = entry.type === 'cur' && hasRecord;
            return (
              <TouchableOpacity
                key={col}
                style={styles.dayCell}
                onPress={() => pressable && onDayPress(entry.day)}
                activeOpacity={pressable ? 0.7 : 1}
                disabled={!pressable}
              >
                <View style={styles.dayCellNumber}>
                  {isToday ? (
                    <Grad colors={['#f3f4f1', '#b5ff22']} style={styles.todayCell}>
                      <Text style={styles.todayText}>{entry.day}</Text>
                    </Grad>
                  ) : (
                    <Text style={[
                      styles.dateText,
                      entry.type !== 'cur' && styles.prevNextText,
                      hasRecord && styles.recordText
                    ]}>
                      {entry.day}
                    </Text>
                  )}
                </View>
                {hasRecord && <HeartImage width={12} height={12} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── 앨범 뷰 ──────────────────────────────────────────────────────
function AlbumList({ year, month, recordDays, onDayPress }: {
  year: number; month: number; recordDays: number[];
  onDayPress: (day: number) => void;
}) {
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(recordDays.map(async day => {
        const dateKey = getDateStringForMonthDay(year, month, day);
        const record = await storage.getDailyRecord(dateKey);
        if (record?.plantPhotoUri) {
          map[dateKey] = record.plantPhotoUri;
        } else {
          const photos = await storage.getPlantPhotos(dateKey);
          if (photos[0]) map[dateKey] = photos[0];
        }
      }));
      setPhotoMap(map);
      setLoaded(true);
    })();
  }, [year, month, recordDays]);

  // 사진이 실제로 있는 날만 추림
  const photoDays = loaded
    ? [...recordDays]
        .sort((a, b) => a - b)
        .filter(day => !!photoMap[getDateStringForMonthDay(year, month, day)])
    : [];

  if (loaded && photoDays.length === 0) {
    return (
      <View style={styles.emptyAlbum}>
        <EmojiText style={styles.emptyText}>이번 달 사진 기록이 없어요 🌱</EmojiText>
      </View>
    );
  }

  return (
    <View style={styles.albumList}>
      {photoDays.map(day => {
        const label    = `${SHORT_MONTHS[month]} ${day}, ${year}`;
        const dateKey  = getDateStringForMonthDay(year, month, day);
        const photoUri = photoMap[dateKey];
        return (
          <TouchableOpacity
            key={dateKey}
            style={styles.albumEntry}
            onPress={() => onDayPress(day)}
            activeOpacity={0.75}
          >
            <Text style={styles.albumDate}>{label}</Text>
            <Image source={{ uri: photoUri }} style={styles.albumPhoto} resizeMode="cover" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // 탭 스위처
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
    height: 54,
  },
  tabWrapper: { flex: 1 },
  tabActive: {
    flex: 1,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInactive: {
    flex: 1,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActiveText:   { fontFamily: 'ahn2006-B', fontSize: 18, color: COLORS.outline },
  tabInactiveText: { fontFamily: 'ahn2006-M', fontSize: 18, color: 'rgba(71,84,103,0.8)' },

  // 카드
  card: {
    marginHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    paddingHorizontal: 21,
    paddingVertical: 21,
    shadowColor: 'rgba(90,158,58,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  // 월 헤더
  monthRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  monthTitle: { fontFamily: 'ahn2006-B', fontSize: 25, color: COLORS.green },
  monthNav:  { flexDirection: 'row', gap: 12 },
  navArrow:  { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.textPrimary },

  // 요일 헤더
  weekRow:   { flexDirection: 'row', marginBottom: 4 },
  dayCell:   { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 3 },
  dayHeader: { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.green },

  // 날짜 숫자 고정 높이 래퍼 (오늘 박스와 일반 텍스트의 y좌표 통일)
  dayCellNumber: { height: 32, alignItems: 'center', justifyContent: 'center' },

  // 날짜 셀
  dateText:    { fontFamily: 'ahn2006-M', fontSize: 20, color: COLORS.textPrimary, lineHeight: 22 },
  prevNextText: { color: COLORS.prevMonthText },
  recordText:  { color: COLORS.green },

  // 오늘 셀
  todayCell: {
    width: 32, height: 32, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  todayText: { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.outline },

  // 기록 점
  recordDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.calendarDot },

  // 앨범
  albumList:          { gap: 20 },
  albumEntry:         { gap: 8 },
  albumDate:          { fontFamily: 'Paperlogy-5Medium', fontSize: 15, color: COLORS.green },
  albumPhoto:         { width: 180, height: 180, borderRadius: 12, backgroundColor: '#E0E0E0',
                        borderWidth: 1, borderColor: COLORS.outline, alignItems: 'center', justifyContent: 'center' },
  albumPhotoEmpty:       { backgroundColor: '#E0E0E0' },
  albumPhotoPlaceholder: { fontSize: 40 },
  emptyAlbum:         { paddingVertical: 32, alignItems: 'center' },
  emptyText:          { fontFamily: 'Paperlogy-5Medium', fontSize: 15, color: COLORS.textTertiary },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    borderBottomWidth: 0,
    minHeight: 200,
    maxHeight: '75%',
    paddingBottom: 32,
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.outline,
  },
  modalTitle: { fontFamily: 'ahn2006-B', fontSize: 25, color: COLORS.textPrimary, marginTop: 5 },
  modalClose: { fontFamily: 'ahn2006-B', fontSize: 16, color: COLORS.textTertiary },
  modalScroll: { flexGrow: 1, flexShrink: 1 },
  modalScrollContent: { padding: 16, gap: 4, paddingBottom: 8 },
});
