import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants';

interface Props {
  total: number;
  current: number; // 1-based
}

export default function ProgressDots({ total, current }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current - 1;
        const isDone = i < current - 1;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive && styles.dotActive,
              isDone && styles.dotDone,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.btnDisabledBg,
  },
  dotActive: {
    width: 20,
    backgroundColor: COLORS.green,
  },
  dotDone: {
    width: 8,
    backgroundColor: COLORS.green,
    opacity: 0.4,
  },
});
