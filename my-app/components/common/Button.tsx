import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { COLORS } from '../../constants';

// expo-linear-gradient is optional — install with: npx expo install expo-linear-gradient
let LinearGradient: React.ComponentType<any> | null = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}

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

  // Primary: lime gradient (같은 앱 디자인)
  if (variant === 'primary' && !isDisabled) {
    if (LinearGradient) {
      return (
        <TouchableOpacity
          style={[styles.base, style]}
          disabled={isDisabled}
          activeOpacity={0.85}
          {...rest}
        >
          <LinearGradient
            colors={['#f3f4f1', '#b5ff22']}
            style={styles.gradientInner}
          >
            {inner}
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    // LinearGradient 없을 때 fallback
    return (
      <TouchableOpacity
        style={[styles.base, styles.primaryFallback, style]}
        disabled={isDisabled}
        activeOpacity={0.85}
        {...rest}
      >
        {inner}
      </TouchableOpacity>
    );
  }

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

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradientInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryFallback: {
    backgroundColor: COLORS.lime,
  },
  secondary: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.outline,
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
    fontFamily: 'ahn2006-M',
    fontSize: 18,
    color: COLORS.outline,
  },
  labelPrimary:   { color: COLORS.outline },
  labelSecondary: { color: COLORS.textPrimary },
  labelGhost:     { color: COLORS.textTertiary },
  labelDisabled:  { color: COLORS.btnDisabledText },
});
