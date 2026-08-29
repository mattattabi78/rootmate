import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

interface Props {
  noBorder?: boolean;
  rightAction?: React.ReactNode;
  title?: string;
}

export default function TopAppBar({ noBorder = false, rightAction, title = 'RootMate' }: Props) {
  return (
    <View style={[styles.bar, !noBorder && styles.border]}>
      <Text style={styles.title}>{title}</Text>
      {rightAction != null && (
        <View style={styles.rightSlot}>{rightAction}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 61,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  border: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.outline,
  },
  title: {
    fontFamily: 'ahn2006-B',
    fontSize: 30,
    color: COLORS.textPrimary,
  },
  rightSlot: {
    position: 'absolute',
    right: 20,
    bottom: 12,
  },
});
