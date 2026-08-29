import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../../constants';
import { HomeIcon } from './Icons';
import RecordIconSvg from '../../assets/images/record-icon.svg';
import CollectionIconSvg from '../../assets/images/collection-icon.svg';

function RecordIcon({ color, size = 20 }: { color: string; size?: number }) {
  return <RecordIconSvg width={size} height={size} fill={color} />;
}
function CollectionIcon({ color, size = 20 }: { color: string; size?: number }) {
  return <CollectionIconSvg width={size} height={size} fill={color} />;
}

let LinearGradient: React.ComponentType<any> | null = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}

function GradPill({ style, children }: { style?: any; children: React.ReactNode }) {
  if (LinearGradient) {
    return (
      <LinearGradient colors={['#f3f4f1', '#b5ff22']} style={style}>
        {children}
      </LinearGradient>
    );
  }
  return <View style={[style, { backgroundColor: COLORS.lime }]}>{children}</View>;
}

export type ActiveTab = 'home' | 'calendar' | 'collection';

interface Props {
  activeTab: ActiveTab;
}

const ACTIVE_COLOR   = COLORS.outline;
const INACTIVE_COLOR = 'rgba(71,84,103,0.55)';

export default function BottomNavBar({ activeTab }: Props) {
  const insets = useSafeAreaInsets();

  const tabs: { key: ActiveTab; label: string; route: string; Icon: React.ComponentType<{ color: string; size?: number }> }[] = [
    { key: 'home',         label: 'Home',       route: '/',            Icon: HomeIcon },
    { key: 'calendar',     label: 'Record',     route: '/calendar',    Icon: RecordIcon },
    { key: 'collection', label: 'Collection', route: '/collection', Icon: CollectionIcon },
  ];

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map(({ key, label, route, Icon }) => {
        const isActive = activeTab === key;
        const color = ACTIVE_COLOR;

        if (isActive) {
          return (
            <TouchableOpacity key={key} onPress={() => router.replace(route as any)} activeOpacity={0.8}>
              <GradPill style={styles.activePill}>
                <Icon color={color} size={20} />
                <Text style={styles.activeLabel}>{label}</Text>
              </GradPill>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={key} onPress={() => router.replace(route as any)} activeOpacity={0.8}>
            <View style={styles.inactiveTab}>
              <Icon color={key === 'home' ? ACTIVE_COLOR : INACTIVE_COLOR} size={20} />
              <Text style={styles.inactiveLabel}>{label}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: COLORS.outline,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  activePill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 55,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    gap: 5,
  },
  inactiveTab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    paddingVertical: 6,
    gap: 5,
  },
  activeLabel: {
    fontFamily: 'ahn2006-B',
    fontSize: 15,
    color: COLORS.outline,
    letterSpacing: 0.4,
  },
  inactiveLabel: {
    fontFamily: 'ahn2006-B',
    fontSize: 15,
    color: INACTIVE_COLOR,
    letterSpacing: 0.4,
  },
});
