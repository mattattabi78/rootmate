import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  useWindowDimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, fs, ui } from '../constants';
import { storage, DailyRecord } from '../store/storage';
import { loadGrowthState } from '../store/growthStore';
import { PlantType } from '../constants/character';
import TopAppBar from '../components/common/TopAppBar';
import FitToScreen from '../components/common/FitToScreen';
import { compactFactor } from '../utils/layout';
import BottomNavBar from '../components/common/BottomNavBar';
import PlantCharacter from '../components/common/PlantCharacter';
import FaceOverlay from '../components/common/BlinkingFace';
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

function Chevron({ dir, color = COLORS.pine }: { dir: 'left' | 'right'; color?: string }) {
  return <ChevronPixelIcon direction={dir} color={color} size={15} />;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
type TabView = 'calendar' | 'album';
const TAB_LABEL: Record<TabView, string> = { calendar: '캘린더', album: '앨범' };

export default function CalendarScreen() {
  const [calH, setCalH] = useState(0);   // 캘린더 본문 높이 (짧은 화면에서 간격을 줄이는 데 사용)
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
  // 기록 팝업에 보여줄, 그 날짜의 사진 캐릭터(AI 생성 이미지). 그날까지 만든 것이 없으면 null → 기본 캐릭터
  const [modalGenerated, setModalGenerated] = useState<{ uri: string; facePos: { x: number; y: number } } | null>(null);

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
    const g = await storage.getGeneratedPlantForDate(dateStr);
    setModalGenerated(g ? { uri: g.uri, facePos: g.facePos } : null);
    setModalDateLabel(formatDateLabel(y, m, day));
    setModalRecord(record);
    setModalVisible(true);
  };

  // Figma 탭: 캘린더·앨범 2개(가운데 정렬)
  const tabs: TabView[] = ['calendar', 'album'];

  // 짧은 화면(SE 등): 글자 크기는 그대로 두고 간격과 날짜 칸 높이만 줄임 (캘린더 탭만)
  const f = view === 'calendar' ? compactFactor(calH, CAL_FIXED_H, CAL_FLEX_H, CAL_MIN_FACTOR) : 1;

  const content = (
    <View style={{ flex: 1 }} onLayout={e => setCalH(e.nativeEvent.layout.height)}>
        {/* 탭 (밑줄) */}
        <View style={[styles.tabRow, view === 'album' && styles.tabRowAlbum, view === 'calendar' && { paddingTop: 30 * f, paddingBottom: 30 * f }]}>
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 * f }]}
          showsVerticalScrollIndicator={false}
        >
          {view === 'calendar' && (
            <>
              <View style={[styles.monthRow, { marginTop: 27 * f }]}>
                <TouchableOpacity onPress={goToPrev} hitSlop={20}>
                  <View style={styles.chevronBox}><Chevron dir="left" /></View>
                </TouchableOpacity>
                <Text style={styles.monthTitle} numberOfLines={1}>{year}년 {month + 1}월</Text>
                <TouchableOpacity onPress={goToNext} hitSlop={20}>
                  <View style={styles.chevronBox}><Chevron dir="right" /></View>
                </TouchableOpacity>
              </View>
              <CalendarGrid
                year={year} month={month} today={today} f={f}
                recordDays={recordDays} onDayPress={d => openDay(year, month, d)}
              />
            </>
          )}
          {view === 'album' && (
            <AlbumList today={today} onDayPress={openDay} />
          )}
        </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar />

      <View style={styles.body}>
        {/* 캘린더 탭은 짧은 화면(SE 등)에서 통째로 줄여 스크롤 없이 한 번에 보이게 함. 앨범은 긴 목록이라 그대로 스크롤 */}
        {view === 'calendar'
          ? <FitToScreen designHeight={CAL_MIN_H}>{content}</FitToScreen>
          : content}
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
                generated={modalGenerated}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 날짜별 기록 카드 (폭 최대 362 · 높이 480, 요소는 Figma 절대 좌표) ───────
function DayRecordCard({ label, record, plantType, generated }: {
  label: string; record: DailyRecord; plantType: PlantType;
  generated: { uri: string; facePos: { x: number; y: number } } | null;
}) {
  const completedIds = record.completedTaskIds ?? (record.waterDone ? ['water'] : []);
  const photoUri = record.plantPhotoUri ?? record.answerImageUri;
  const text = record.conversationSummary || record.answer || '';
  // 팝업 폭: 기본 362, 좁은 화면에서는 화면 좌우에 최소 28씩 여백이 남도록 줄임. 안쪽 내용(폭 260)은 가운데 정렬
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.min(362, screenW - 2 * 28);
  const sideInset = (cardW - 260) / 2;

  return (
    <View style={[styles.recordCard, { width: cardW }]}>
      <Text style={styles.recordTitle}>{label}</Text>

      <View style={[styles.recordImageArea, { left: sideInset }]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.recordPhoto} resizeMode="cover" />
        ) : (
          // 사진이 없으면 캐릭터만 표시: 그날 보이던 사진 캐릭터가 있으면 그 모습, 없으면 그날의 성장 단계 기본 캐릭터
          generated ? (
            <View style={styles.recordGenerated} pointerEvents="none">
              <Image source={{ uri: generated.uri }} style={{ width: GEN_SIZE, height: GEN_SIZE }} resizeMode="contain" />
              <FaceOverlay
                plantType={plantType}
                style={{
                  position: 'absolute',
                  width: GEN_SIZE / 2, height: GEN_SIZE / 2,
                  left: (generated.facePos.x / 100) * GEN_SIZE - GEN_SIZE / 4,
                  top:  (generated.facePos.y / 100) * GEN_SIZE - GEN_SIZE / 4,
                }}
              />
            </View>
          ) : (
            <View style={styles.recordPlant} pointerEvents="none">
              <PlantCharacter plantType={plantType} stage={1} width={101} />
            </View>
          )
        )}
      </View>

      <Text style={[styles.recordText, { left: sideInset }]} numberOfLines={5}>{text}</Text>

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
function CalendarGrid({ year, month, today, recordDays, onDayPress, f = 1 }: {
  year: number; month: number; today: Date; recordDays: number[]; f?: number;
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
    <View style={[styles.gridWrap, { marginTop: 33 * f }]}>
      <View style={[styles.weekHeaderRow, { marginBottom: 36 * f }]}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={styles.dayCell}>
            <Text style={[styles.dayHeader, (i === 0 || i === 6) && styles.dayHeaderWeekend]}>{d}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={[styles.weekRow, { height: Math.max(CELL_MIN_H, CELL_H * f) }]}>
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
const GEN_SIZE = 160;   // 기록 팝업에서 사진으로 만든 캐릭터를 그리는 크기
const CELL_H = 69.5;
const CELL_MIN_H = ui(46);   // 날짜 원(40) + 물방울 뱃지가 들어가는 최소 칸 높이
// 캘린더 높이 구성(6주짜리 달 기준): 줄이지 않는 부분 = 탭 글자 45 + 월 제목 26 + 요일 글자 38 = 109 / 줄이는 부분 = 여백(탭 위아래 60 + 27 + 33 + 36 + 24) + 날짜 칸 6×69.5 = 597
const CAL_FIXED_H = ui(109);
const CAL_FLEX_H = 597;
const CAL_MIN_FACTOR = 0.5;
const CAL_MIN_H = CAL_FIXED_H + CAL_FLEX_H * CAL_MIN_FACTOR + 6 * (CELL_MIN_H - CELL_H * CAL_MIN_FACTOR);   // 이보다 짧은 화면만 통째로 축소

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
  tab: { width: ui(62), height: ui(45), alignItems: 'center' },
  tabUnderline: {
    position: 'absolute', left: 0, right: 0, bottom: -0.75,
    height: 1.5, backgroundColor: COLORS.pine,
  },
  tabText: {
    fontFamily: FONTS.bold,
    fontSize: fs(22),
    lineHeight: fs(45),
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
    fontSize: fs(22),
    lineHeight: fs(26),
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
  dayHeader:     { fontFamily: FONTS.bold, fontSize: fs(17), lineHeight: fs(22), paddingVertical: 8, color: '#191C1B' },
  dayHeaderWeekend: { color: COLORS.weekend },

  dateCircle: {
    width: ui(40), height: ui(40), borderRadius: ui(20),
    alignItems: 'center', justifyContent: 'center',
  },
  dateCircleRecord: { backgroundColor: COLORS.lime },
  dateCircleToday:  { backgroundColor: COLORS.line },
  dateText:     { fontFamily: FONTS.bold, fontSize: fs(16), lineHeight: fs(22), color: '#191C1B' },
  prevNextText: { color: COLORS.prevMonthText },
  todayText:    { color: '#FFFFFF' },

  // 연속 기록 띠: 시작 원 중심 ~ 끝 원 중심
  bandRow:  { position: 'absolute', top: 0, left: 0, right: 0, height: ui(40), flexDirection: 'row' },
  bandHalf: { flex: 1 },
  bandOn:   { backgroundColor: COLORS.limeLight },

  // 물방울 뱃지: 날짜 원 우상단 (원 위쪽 10px, 원 오른쪽 끝에 맞춤)
  waterBadge: { position: 'absolute', top: -10, left: '50%', marginLeft: 4, zIndex: 2 },

  // 앨범: 좌우 46, 사진 150x150 간격 10
  albumWrap:    { paddingHorizontal: 46, paddingTop: 27, gap: 27 },
  albumSection: { gap: 10 },
  albumMonth:   { fontFamily: FONTS.bold, fontSize: fs(15), lineHeight: fs(20), color: COLORS.green },
  albumGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  albumPhoto: {
    width: 150, height: 150, borderRadius: 4,
    backgroundColor: '#E0E0E0', borderWidth: 1, borderColor: COLORS.line,
  },
  emptyAlbum: { paddingVertical: 60, alignItems: 'center' },
  emptyText:  { fontFamily: FONTS.medium, fontSize: fs(15), color: COLORS.textTertiary },

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
    fontFamily: FONTS.bold, fontSize: fs(20), lineHeight: fs(20),
    color: COLORS.outline,
  },
  recordImageArea: { position: 'absolute', top: 94, left: 51, width: 260, height: 180 },
  recordPhoto: {
    width: 260, height: 180, borderRadius: 5,
    borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#E0E0E0',
  },
  // 캐릭터 101×150을 사진 영역(260×180) 중앙에 배치
  // 사진으로 만든 캐릭터(정사각형)를 사진 영역(260×180) 중앙에 배치
  recordGenerated: { position: 'absolute', left: (260 - GEN_SIZE) / 2, top: (180 - GEN_SIZE) / 2, width: GEN_SIZE, height: GEN_SIZE },
  recordPlant: { position: 'absolute', left: 79.5, top: 15, width: 101, height: 150 },
  recordText: {
    position: 'absolute', top: 299, left: 51, width: 260, height: 100,
    fontFamily: FONTS.bold, fontSize: fs(13), lineHeight: fs(20),
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
