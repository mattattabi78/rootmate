import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { COLORS, FONTS } from '../../constants';
import { storage } from '../../store/storage';
import { getDevAdjustedDate } from '../../utils/devOverrides';
import { HeartIcon } from './Icons';
import { GearPixelIcon, ChevronPixelIcon } from './PixelIcons';
import SettingsModal from '../settings/SettingsModal';

interface Props {
  noBorder?: boolean;
  /** 지정하면 우측 D+N 배지 대신 이 노드를 렌더링 */
  rightAction?: React.ReactNode;
  title?: string;
  /** 좌측 뒤로가기 버튼 표시 */
  showBack?: boolean;
  onBack?: () => void;
  /** 우측 D+N(식물을 키운 일수) 배지 표시 (기본 true) */
  showBadge?: boolean;
}

export const HEADER_HEIGHT = 69;

// 식물을 입양한 날(D+0)부터 오늘까지 경과한 일수 — 로컬 날짜 기준
function daysSince(adoptedAt: string): number {
  const a = new Date(adoptedAt);
  const t = getDevAdjustedDate();
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const end = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

export default function TopAppBar({
  noBorder = false,
  rightAction,
  title = 'Rootmate',
  showBack = false,
  onBack,
  showBadge = true,
}: Props) {
  const [days, setDays] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!showBadge || rightAction != null) return;
      let alive = true;
      storage.getPlantData()
        .then(d => { if (alive) setDays(d?.adoptedAt ? daysSince(d.adoptedAt) : 0); })
        .catch(() => {});
      return () => { alive = false; };
    }, [showBadge, rightAction]),
  );

  const handleBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/' as any)));

  return (
    <View style={[styles.bar, !noBorder && styles.border]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <ChevronPixelIcon color="#41493B" size={14} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, showBack && styles.titleAfterBack]}>{title}</Text>
      </View>

      {rightAction != null ? (
        <View>{rightAction}</View>
      ) : showBadge ? (
        <View style={styles.right}>
          <TouchableOpacity
            onPress={() => router.push('/streak' as any)}
            activeOpacity={0.8}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>D+{days}</Text>
            <HeartIcon color={COLORS.outline} size={13} />
          </TouchableOpacity>
          {/* 설정 (팝업) */}
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            activeOpacity={0.7}
            hitSlop={10}
            accessibilityLabel="설정"
          >
            <GearPixelIcon color={COLORS.outline} size={22} />
          </TouchableOpacity>
          <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: HEADER_HEIGHT,
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 12,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  border: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.line,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    paddingLeft: 5,
    paddingRight: 5,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0.9,
    color: COLORS.outline,
    marginLeft: 8,
  },
  titleAfterBack: { marginLeft: 20 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    borderRadius: 4,
    paddingHorizontal: 11,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    lineHeight: 17,
    color: COLORS.outline,
  },
});
