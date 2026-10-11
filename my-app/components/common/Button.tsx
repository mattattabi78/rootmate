import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS, FONTS } from '../../constants';

interface Props extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export default function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  const baseStyle = [
    styles.base,
    variant === 'primary'   && !isDisabled && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost'     && styles.ghost,
    isDisabled              && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    variant === 'primary'   && styles.labelPrimary,
    variant === 'secondary' && styles.labelSecondary,
    variant === 'ghost'     && styles.labelGhost,
    isDisabled              && styles.labelDisabled,
  ];

  const inner = loading ? (
    <ActivityIndicator
      color={variant === 'primary' ? '#FFFFFF' : COLORS.green}
      size="small"
    />
  ) : (
    <Text style={labelStyle}>{label}</Text>
  );

  return (
    <TouchableOpacity
      style={baseStyle}
      disabled={isDisabled}
      activeOpacity={0.85}
      {...rest}
    >
      {inner}
    </TouchableOpacity>
  );
}

// Figma Y2K: 라임 단색 버튼, 반경 10, 테두리 1.5px
const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: COLORS.lime,
  },
  secondary: {
    backgroundColor: COLORS.bg,
    borderColor: '#303a1e',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  disabled: {
    backgroundColor: COLORS.btnDisabledBg,
    borderColor: COLORS.btnDisabledBg,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.outline,
  },
  labelPrimary:   { color: COLORS.outline },
  labelSecondary: { color: COLORS.textPrimary },
  labelGhost:     { color: COLORS.textTertiary },
  labelDisabled:  { color: COLORS.btnDisabledText },
});
