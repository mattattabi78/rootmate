import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronPixelIcon } from '../common/PixelIcons';
import { COLORS, FONTS } from '../../constants';

// 알림 시간 선택: 30분 단위, 아침 05:00~12:00 / 저녁 17:00~23:30 (자정부터의 분)
export const STEP_MIN = 30;
export const MORNING_RANGE = { min: 5 * 60, max: 12 * 60 };
export const EVENING_RANGE = { min: 17 * 60, max: 23 * 60 + 30 };

export function formatTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const period = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${String(m).padStart(2, '0')}`;
}

function Chevron({ dir, disabled }: { dir: 'left' | 'right'; disabled?: boolean }) {
  return <ChevronPixelIcon direction={dir} color={disabled ? COLORS.tabTextOff : COLORS.pine} size={15} />;
}

interface Props {
  value: number;
  range: { min: number; max: number };
  onChange: (v: number) => void;
  disabled?: boolean;   // 알림을 끈 상태 — 흐리게 표시하고 조작 불가
}

/** ‹ 오전 9:00 › */
export default function TimeStepper({ value, range, onChange, disabled }: Props) {
  const canDown = !disabled && value - STEP_MIN >= range.min;
  const canUp = !disabled && value + STEP_MIN <= range.max;
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <TouchableOpacity onPress={() => canDown && onChange(value - STEP_MIN)} hitSlop={16} disabled={!canDown}>
        <Chevron dir="left" disabled={!canDown} />
      </TouchableOpacity>
      <Text style={styles.time}>{formatTime(value)}</Text>
      <TouchableOpacity onPress={() => canUp && onChange(value + STEP_MIN)} hitSlop={16} disabled={!canUp}>
        <Chevron dir="right" disabled={!canUp} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  rowDisabled: { opacity: 0.4 },
  time: {
    minWidth: 110, textAlign: 'center',
    fontFamily: FONTS.extraBold, fontSize: 24, lineHeight: 32, color: COLORS.pine,
  },
});
