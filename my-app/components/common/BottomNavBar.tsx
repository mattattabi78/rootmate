import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, FONTS } from '../../constants';
import { HomeIcon, RecordIcon, CollectionIcon, ChatIcon } from './Icons';

// Figma 하단 탭 (node 5:14): 라인(2px, 위) + 간격 3 + 흰 배경 75 = 80. 항목은 라인 아래 21px에서 시작.
export const TAB_BAR_HEIGHT = 80;
const BORDER_W = 2;

export type ActiveTab = 'home' | 'calendar' | 'collection' | 'chat';

interface Props {
  activeTab: ActiveTab;
  /** 이미 활성인 탭을 다시 눌렀을 때 (예: 도감 상세 → 도감 목록) */
  onActiveTabPress?: () => void;
}

const TABS: {
  key: ActiveTab;
  label: string;
  route: string;
  Icon: React.ComponentType<{ color: string; size?: number }>;
}[] = [
  { key: 'home',       label: 'Home',       route: '/',           Icon: HomeIcon },
  { key: 'calendar',   label: 'Record',     route: '/calendar',   Icon: RecordIcon },
  { key: 'collection', label: 'Collection', route: '/collection', Icon: CollectionIcon },
  { key: 'chat',       label: 'Chat',       route: '/chat',       Icon: ChatIcon },
];

export default function BottomNavBar({ activeTab, onActiveTabPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom }]}>
      {TABS.map(({ key, label, route, Icon }) => {
        const color = key === activeTab ? COLORS.tabActive : COLORS.tabInactive;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => {
              if (key !== activeTab) router.replace(route as any);
              else onActiveTabPress?.();
            }}
          >
            {/* 아이콘 20px 높이, 칸의 가로 중앙 */}
            <View style={styles.iconSlot}>
              <Icon color={color} size={20} />
            </View>
            {/* 라벨: 아이콘 아래 6px (Figma top 26), 14px ExtraBold, 줄높이 15 */}
            <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// 4개 탭을 같은 폭으로 나눔. 항목은 선 아래 21px에서 시작.
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderTopWidth: BORDER_W,
    borderTopColor: 'rgba(122,177,11,0.30)',   // #7AB10B 30%
    paddingTop: 21,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  iconSlot: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 6,
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    lineHeight: 15,
    letterSpacing: -0.25,
    textAlign: 'center',
  },
});
