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
import { COLORS, FONTS } from '../constants';
import { storage, DailyRecord } from '../store/storage';
import { loadGrowthState } from '../store/growthStore';
import { PlantType, GrowthStage } from '../constants/character';
import TopAppBar from '../components/common/TopAppBar';
import BottomNavBar from '../components/common/BottomNavBar';
import PlantCharacter from '../components/common/PlantCharacter';
import { ActionIcon } from '../components/common/ActionIconButton';
import { ChevronPixelIcon } from '../components/common/PixelIcons';
import { getDateStringForMonthDay } from '../utils/date';
import { getDevAdjustedDate } from '../utils/devOverrides';

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
  // 마지막 주만 채움 (4~6주)
  const rem = (7 - (grid.length % 7)) % 7;
  for (let d = 1; d <= rem; d++)
    grid.push({ day: d, type: 'next' });
  return grid;
}

const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(year: number, month: number, day: number) {
  const d = new Date(year, month, day);
  return `${year}년 ${month + 1}월 ${day}일 (${DAY_HEADERS[d.getDay()]})`;
}

// 해당 날짜에 도달했던 성장 단계 (stageHistory 기준, 없으면 null)
async function getStageAtDate(dateStr: string): Promise<GrowthStage | null> {
  try {
    const state = await loadGrowthState();
    if (!state) return null;
    const entered = state.stageHistory
      .filter(h => h.enteredAt <= dateStr)
      .sort((a, b) => b.stage - a.stage)[0];
    return (entered?.stage ?? state.stageHistory[0]?.stage ?? 1) as GrowthStage;
  } catch {
    return null;
  }
}

function Chevron({ dir, color = COLORS.pine }: { dir: 'left' | 'right'; color?: string }) {
  return <ChevronPixelIcon direction={dir} color={color} size={15} />;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
type TabView = 'calendar' | 'album';
const TAB_LABEL: Record<TabView, string> = { calendar: '캘린더', album: '앨범' };

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
  const [modalStage,     setModalStage]     = useState<GrowthStage>(1);

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

  const openDay = async (y: number, m: number, day: number) => {
    const dateStr = getDateStringForMonthDay(y, m, day);
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
    const stage = await getStageAtDate(dateStr);
    setModalStage(stage ?? 1);
    setModalDateLabel(formatDateLabel(y, m, day));
    setModalRecord(record);
    setModalVisible(true);
  };

  // Figma 탭: 캘린더·앨범 2개(가운데 정렬)
  const tabs: TabView[] = ['calendar', 'album'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar />

      <View style={styles.body}>
        {/* 탭 (밑줄) */}
        <View style={[styles.tabRow, view === 'album' && styles.tabRowAlbum]}>
          {tabs.map(tab => {
            const active = view === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tab}
                onPress={() => setView(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{TAB_LABEL[tab]}</Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {view === 'calendar' && (
            <>
              <View style={styles.monthRow}>
                <TouchableOpacity onPress={goToPrev} hitSlop={20}>
                  <View style={styles.chevronBox}><Chevron dir="left" /></View>
                </TouchableOpacity>
                <Text style={styles.monthTitle} numberOfLines={1}>{year}년 {month + 1}월</Text>
                <TouchableOpacity onPress={goToNext} hitSlop={20}>
                  <View style={styles.chevronBox}><Chevron dir="right" /></View>
                </TouchableOpacity>
              </View>
              <CalendarGrid
                year={year} month={month} today={today}
                recordDays={recordDays} onDayPress={d => openDay(year, month, d)}
              />
            </>
          )}
          {view === 'album' && (
            <AlbumList today={today} onDayPress={openDay} />
          )}
        </ScrollView>
      </View>

      <BottomNavBar activeTab="calendar" />

      {/* 날짜별 기록 카드 */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            {modalRecord && (
              <DayRecordCard
                label={modalDateLabel}
                record={modalRecord}
                plantType={plantType}
                stage={modalStage}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 날짜별 기록 카드 (362x480 고정, 요소는 Figma 절대 좌표) ───────
function DayRecordCard({ label, record, plantType, stage }: {
  label: string; record: DailyRecord; plantType: PlantType; stage: GrowthStage;
}) {
  const completedIds = record.completedTaskIds ?? (record.waterDone ? ['water'] : []);
  const photoUri = record.plantPhotoUri ?? record.answerImageUri;
  const text = record.conversationSummary || record.answer || '';

  return (
    <View style={styles.recordCard}>
      <Text style={styles.recordTitle}>{label}</Text>

      <View style={styles.recordImageArea}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.recordPhoto} resizeMode="cover" />
        ) : (
          // 사진이 없으면 그날의 캐릭터만 표시
          <View style={styles.recordPlant} pointerEvents="none">
            <PlantCharacter plantType={plantType} stage={stage} width={101} />
          </View>
        )}
      </View>

      <Text style={styles.recordText} numberOfLines={4}>{text}</Text>

      <View style={styles.recordFooter}>
        <ActionIcon kind="water"  active={completedIds.includes('water')}    height={20.05} />
        <ActionIcon kind="sun"    active={completedIds.includes('sunlight')} height={22.56} />
        <ActionIcon kind="camera" active={!!photoUri || record.recordDone}   height={16.29} />
        <ActionIcon kind="search" active={completedIds.includes('observe')}  height={19.42} />
      </View>
    </View>
  );
}

// ─── 캘린더 그리드 ────────────────────────────────────────────────
function CalendarGrid({ year, month, today, recordDays, onDayPress }: {
  year: number; month: number; today: Date; recordDays: number[];
  onDayPress: (day: number) => void;
}) {
  const grid = buildMonthGrid(year, month);
  const rows = grid.length / 7;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  // 물주기 완료한 날 (💧 뱃지) — 기록 완료 전이라도 task 완료 즉시 표시하기 위해 growthStore도 확인
  const [waterDays, setWaterDays] = useState<number[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const set = new Set<number>();
      const monthPrefix = getDateStringForMonthDay(year, month, 1).slice(0, 7);
      try {
        const gs = await loadGrowthState();
        gs?.completedTasks.forEach(t => {
          if (t.taskId === 'water' && t.completedAt.startsWith(monthPrefix)) {
            set.add(parseInt(t.completedAt.split('-')[2], 10));
          }
        });
      } catch {}
      await Promise.all(recordDays.map(async day => {
        const rec = await storage.getDailyRecord(getDateStringForMonthDay(year, month, day));
        if (rec && (rec.waterDone || rec.completedTaskIds?.includes('water'))) set.add(day);
      }));
      if (alive) setWaterDays([...set]);
    })();
    return () => { alive = false; };
  }, [year, month, recordDays]);

  const hasRec = (d: number) => recordDays.includes(d);
  // 3일 이상 연속 기록된 구간: 양 끝은 원, 사이 날짜는 띠로 표시
  const runInfo = (d: number): { band: boolean; middle: boolean; left: boolean; right: boolean } => {
    const none = { band: false, middle: false, left: false, right: false };
    if (!hasRec(d)) return none;
    let start = d; while (hasRec(start - 1)) start -= 1;
    let end = d;   while (hasRec(end + 1))   end += 1;
    if (end - start + 1 < 3) return none;
    return { band: true, middle: d > start && d < end, left: d > start, right: d < end };
  };

  return (
    <View style={styles.gridWrap}>
      <View style={styles.weekHeaderRow}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={styles.dayCell}>
            <Text style={[styles.dayHeader, (i === 0 || i === 6) && styles.dayHeaderWeekend]}>{d}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={styles.weekRow}>
          {grid.slice(row * 7, row * 7 + 7).map((entry, col) => {
            const cur       = entry.type === 'cur';
            const isToday   = isCurrentMonth && cur && entry.day === today.getDate();
            const record    = cur && hasRec(entry.day);
            const run       = cur ? runInfo(entry.day) : runInfo(-99);
            const middle    = run.middle;
            const water     = cur && waterDays.includes(entry.day);
            const left      = run.left && col > 0;     // 주 경계에서는 띠를 끊음
            const right     = run.right && col < 6;
            const pressable = cur && record;

            return (
              <TouchableOpacity
                key={col}
                style={styles.dayCell}
                onPress={() => pressable && onDayPress(entry.day)}
                activeOpacity={pressable ? 0.7 : 1}
                disabled={!pressable}
              >
                {/* 연속 기록 띠 */}
                {(left || right) && (
                  <View style={styles.bandRow} pointerEvents="none">
                    <View style={[styles.bandHalf, left && styles.bandOn]} />
                    <View style={[styles.bandHalf, right && styles.bandOn]} />
                  </View>
                )}

                {/* 오늘: 기록 전 회색 → 기록 완료 시 라임 */}
                <View style={[
                  styles.dateCircle,
                  record && !middle && styles.dateCircleRecord,
                  isToday && !record && styles.dateCircleToday,
                ]}>
                  <Text style={[
                    styles.dateText,
                    !cur && styles.prevNextText,
                    isToday && !record && styles.todayText,
                  ]}>
                    {entry.day}
                  </Text>
                </View>

                {water && (
                  <View style={styles.waterBadge} pointerEvents="none">
                    <ActionIcon kind="water" height={20.05} color={COLORS.waterBadge} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── 앨범 뷰 ──────────────────────────────────────────────────────
type AlbumMonth = { year: number; month: number; items: { day: number; uri: string }[] };

function AlbumList({ today, onDayPress }: {
  today: Date; onDayPress: (y: number, m: number, d: number) => void;
}) {
  const [months, setMonths] = useState<AlbumMonth[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 첫 기록 월 ~ 이번 달까지 최신순
      const first = await storage.getFirstRecordDate();
      const start = first ? new Date(first + 'T00:00:00') : today;
      const list: AlbumMonth[] = [];
      let y = today.getFullYear();
      let m = today.getMonth();
      const startKey = start.getFullYear() * 12 + start.getMonth();
      while (y * 12 + m >= startKey) {
        const days = (await storage.getRecordedDaysForMonth(y, m)).sort((a, b) => b - a);
        const items: { day: number; uri: string }[] = [];
        await Promise.all(days.map(async day => {
          const dateKey = getDateStringForMonthDay(y, m, day);
          const record = await storage.getDailyRecord(dateKey);
          let uri = record?.plantPhotoUri;
          if (!uri) {
            const photos = await storage.getPlantPhotos(dateKey);
            uri = photos[0];
          }
          if (uri) items.push({ day, uri });
        }));
        items.sort((a, b) => b.day - a.day);
        if (items.length > 0) list.push({ year: y, month: m, items });
        m -= 1;
        if (m < 0) { m = 11; y -= 1; }
      }
      if (alive) setMonths(list);
    })();
    return () => { alive = false; };
  }, [today]);

  if (months === null) return null;

  if (months.length === 0) {
    return (
      <View style={styles.emptyAlbum}>
        <Text style={styles.emptyText}>아직 사진 기록이 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.albumWrap}>
      {months.map(({ year, month, items }) => (
        <View key={`${year}-${month}`} style={styles.albumSection}>
          <Text style={styles.albumMonth}>{year}년 {month + 1}월</Text>
          <View style={styles.albumGrid}>
            {items.map(({ day, uri }) => (
              <TouchableOpacity
                key={day}
                activeOpacity={0.8}
                onPress={() => onDayPress(year, month, day)}
              >
                <Image source={{ uri }} style={styles.albumPhoto} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── 스타일 (수치는 Figma 402x874 프레임 기준) ─────────────────────
const CELL_H = 69.5;

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.headerBg },
  body:          { flex: 1, backgroundColor: COLORS.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // 탭 (밑줄): 62x45, 간격 50, 상하 패딩 30
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
    paddingTop: 30,
    paddingBottom: 30,
  },
  tabRowAlbum: { paddingBottom: 10 },   // 앨범 프레임: 탭 영역 85 (월 라벨 y=181)
  tab: { width: 62, height: 45, alignItems: 'center' },
  tabUnderline: {
    position: 'absolute', left: 0, right: 0, bottom: -0.75,
    height: 1.5, backgroundColor: COLORS.pine,
  },
  tabText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    lineHeight: 45,
    color: COLORS.tabTextOff,
    width: 80,
    textAlign: 'center',
  },
  tabTextActive: { color: COLORS.pine },

  // 월 헤더: 화살표 15x15 | 간격 20 | 제목 22px(최소 폭 111) | 간격 19 | 화살표 15x15
  // 두 자리 월에서도 줄바꿈 없이 제목이 좌우로 늘어나도록 폭 고정 대신 minWidth
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 27,        // 탭 영역 하단(174) → 제목 상단(204, 줄높이 20 → 26 기준 201)
    height: 26,
  },
  chevronBox: { width: 15, height: 15, alignItems: 'center', justifyContent: 'center' },
  monthTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    lineHeight: 26,
    color: COLORS.pine,
    minWidth: 111,
    flexShrink: 0,
    textAlign: 'center',
  },

  // 요일 / 날짜
  gridWrap:      { marginTop: 33, paddingHorizontal: 16 },
  weekHeaderRow: { flexDirection: 'row', marginBottom: 36 },
  weekRow:       { flexDirection: 'row', height: CELL_H },
  dayCell:       { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  dayHeader:     { fontFamily: FONTS.bold, fontSize: 17, lineHeight: 22, paddingVertical: 8, color: '#191C1B' },
  dayHeaderWeekend: { color: COLORS.weekend },

  dateCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  dateCircleRecord: { backgroundColor: COLORS.lime },
  dateCircleToday:  { backgroundColor: COLORS.line },
  dateText:     { fontFamily: FONTS.bold, fontSize: 16, lineHeight: 22, color: '#191C1B' },
  prevNextText: { color: COLORS.prevMonthText },
  todayText:    { color: '#FFFFFF' },

  // 연속 기록 띠: 시작 원 중심 ~ 끝 원 중심
  bandRow:  { position: 'absolute', top: 0, left: 0, right: 0, height: 40, flexDirection: 'row' },
  bandHalf: { flex: 1 },
  bandOn:   { backgroundColor: COLORS.limeLight },

  // 물방울 뱃지: 날짜 원 우상단 (원 위쪽 10px, 원 오른쪽 끝에 맞춤)
  waterBadge: { position: 'absolute', top: -10, left: '50%', marginLeft: 4, zIndex: 2 },

  // 앨범: 좌우 46, 사진 150x150 간격 10
  albumWrap:    { paddingHorizontal: 46, paddingTop: 27, gap: 27 },
  albumSection: { gap: 10 },
  albumMonth:   { fontFamily: FONTS.extraBold, fontSize: 15, lineHeight: 20, color: COLORS.green },
  albumGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  albumPhoto: {
    width: 150, height: 150, borderRadius: 4,
    backgroundColor: '#E0E0E0', borderWidth: 1, borderColor: COLORS.line,
  },
  emptyAlbum: { paddingVertical: 60, alignItems: 'center' },
  emptyText:  { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textTertiary },

  // 날짜별 기록 카드: 362x480 고정, 내부는 절대 좌표
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCard: {
    width: 362,
    height: 480,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
  },
  recordTitle: {
    position: 'absolute', top: 51, left: 0, right: 0,
    textAlign: 'center',
    fontFamily: FONTS.bold, fontSize: 20, lineHeight: 20,
    color: COLORS.outline,
  },
  recordImageArea: { position: 'absolute', top: 94, left: 51, width: 260, height: 180 },
  recordPhoto: {
    width: 260, height: 180, borderRadius: 5,
    borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#E0E0E0',
  },
  // 캐릭터 101×150을 사진 영역(260×180) 중앙에 배치
  recordPlant: { position: 'absolute', left: 79.5, top: 15, width: 101, height: 150 },
  recordText: {
    position: 'absolute', top: 299, left: 51, width: 260, height: 80,
    fontFamily: FONTS.bold, fontSize: 13, lineHeight: 20,
    color: '#191C1B',
  },
  recordFooter: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 63,
    backgroundColor: COLORS.limeLight,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 9,
    paddingRight: 23,
  },
});
