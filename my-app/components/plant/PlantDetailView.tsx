import React, { useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS } from '../../constants';
import { ActionIcon } from '../common/ActionIconButton';
import {
  SunPixelIcon, ThermometerPixelIcon, SproutPixelIcon, SoilPixelIcon,
  PlusPixelIcon, SparklePixelIcon,
} from '../common/PixelIcons';
import { PLANT_INFO, PLANT_TASKS, isSupportedTask } from '../../constants/plants';
import { PLANT_GUIDE, GuideCard } from '../../constants/plantGuide';
import { PlantType } from '../../constants/character';

// 앱에서 쓰는 색 (홈 액션 버튼·캘린더 등): 주황 · 파랑 · 분홍 · 초록 · 코랄 · 연두 · 진초록
const PALETTE = ['#FF8E47', '#14B5EB', '#FF5C8D', '#38D76D', '#FF6B49', '#7AB10B', '#14532D'];
const C = { sun: '#FF8E47', water: '#14B5EB', pink: '#FF5C8D', green: '#38D76D', coral: '#FF6B49', soil: '#B07A4A' };

// 카드 제목 옆 아이콘. 탭마다 규칙이 다름 (해당하는 아이콘이 없으면 표시하지 않음)
//  - info  : 항목 이름으로 선택, 항목마다 다른 색
//  - growth: 모든 카드에 `+`, 단계마다 PALETTE 색을 돌려 사용
//  - tips  : 제목의 단어로 선택, 없으면 반짝이
function CardIcon({ tab, title, index }: { tab: 'info' | 'growth' | 'tips'; title: string; index: number }) {
  if (tab === 'growth') {
    return <PlusPixelIcon color={PALETTE[index % PALETTE.length]} size={16} />;
  }
  if (tab === 'info') {
    if (title === '빛' || title === '햇빛') return <SunPixelIcon color={C.sun} size={20} />;
    if (title === '온도') return <ThermometerPixelIcon color={C.coral} size={20} />;
    if (title.startsWith('화분')) return <SproutPixelIcon color={C.green} size={20} />;
    if (title === '흙') return <SoilPixelIcon color={C.soil} size={20} />;
    if (title === '물') return <ActionIcon kind="water" height={20} />;
    return null;
  }
  // tips
  if (title.includes('햇빛') || title.includes('빛')) return <SunPixelIcon color={C.sun} size={20} />;
  if (title.includes('물')) return <ActionIcon kind="water" height={20} />;
  if (title.includes('관찰')) return <ActionIcon kind="search" height={20} />;
  if (title.includes('비료')) return <SproutPixelIcon color={C.green} size={20} />;
  if (title.includes('온도')) return <ThermometerPixelIcon color={C.coral} size={20} />;
  return <SparklePixelIcon color={PALETTE[(index + 2) % PALETTE.length]} size={20} />;
}

type DetailTab = 'info' | 'growth' | 'tips';
const TABS: { key: DetailTab; label: string }[] = [
  { key: 'info',   label: '기본 정보' },
  { key: 'growth', label: '성장 과정' },
  { key: 'tips',   label: '잘 키우기' },
];

interface Props {
  plantType: PlantType;
  /** 스크롤 위치 보고 — 맨 위일 때만 아래로 당겨 닫기를 허용하기 위함 */
  onScrollY?: (y: number) => void;
}

// 도감 상세 본문 (Figma 402x874 기준, 본문은 헤더 아래 y=69부터)
export default function PlantDetailView({ plantType, onScrollY }: Props) {
  const [tab, setTab] = useState<DetailTab>('info');
  const info = PLANT_INFO[plantType];
  if (!info) return null;

  const guide = PLANT_GUIDE[plantType];
  let cards: GuideCard[] = [];
  if (tab === 'info') {
    cards = guide.info;
  } else if (tab === 'growth') {
    cards = guide.growth;
  } else if (guide.tips.length > 0) {
    cards = guide.tips;
  } else {
    // 잘 키우기 문구가 없는 식물은 관리 task 안내를 대신 표시
    cards = (PLANT_TASKS[plantType] ?? [])
      .filter(t => isSupportedTask(t.id))
      .map(t => ({ title: t.label, body: t.description }));
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => onScrollY?.(e.nativeEvent.contentOffset.y)}
    >
      {/* 식물 이름 */}
      <View style={styles.nameBox}>
        <Text style={styles.name}>{info.name}</Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <TouchableOpacity key={key} style={styles.tab} onPress={() => setTab(key)} activeOpacity={0.7}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 카드 목록 */}
      <View style={styles.cardList}>
        {cards.map(({ title, body }, i) => (
          <View key={`${title}-${i}`} style={styles.card}>
            <View style={styles.cardHead}>
              <CardIcon tab={tab} title={title} index={i} />
              <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardDivider} />
            <Text style={styles.cardBody}>{body}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // 식물 이름: 위아래 패딩 20, 높이 45
  nameBox: { paddingVertical: 20, alignItems: 'center' },
  name: { fontFamily: FONTS.bold, fontSize: 22, lineHeight: 45, color: COLORS.pine },

  // 탭: 62x45, 간격 50, 위아래 패딩 20
  tabRow: { flexDirection: 'row', justifyContent: 'center', gap: 50, paddingVertical: 20 },
  tab: { width: 62, height: 45, alignItems: 'center' },
  tabText: {
    fontFamily: FONTS.bold, fontSize: 16, lineHeight: 45,
    color: COLORS.line, width: 90, textAlign: 'center',
  },
  tabTextActive: { fontFamily: FONTS.extraBold, color: COLORS.pine },
  tabUnderline: {
    position: 'absolute', left: 0, right: 0, bottom: -0.75,
    height: 1.5, backgroundColor: COLORS.pine,
  },

  // 카드: 좌우 29, 간격 15, 안쪽 좌우 16.5 / 상하 10 (카드 시작 y=264)
  cardList: { paddingHorizontal: 29, paddingTop: 25, gap: 15 },
  card: {
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 16.5,
    paddingVertical: 10,
  },
  // 제목과 본문 사이 구분선
  cardDivider: { height: 1, backgroundColor: COLORS.line, marginTop: 4, marginBottom: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: FONTS.semiBold, fontSize: 16, lineHeight: 25, color: '#000' },
  cardBody: { fontFamily: FONTS.semiBold, fontSize: 14, lineHeight: 25, color: '#000' },
});
