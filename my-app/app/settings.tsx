import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { storage } from '../store/storage';

export default function SettingsScreen() {
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  useFocusEffect(useCallback(() => {
    storage.isMemoryEnabled().then(setMemoryEnabled);
  }, []));

  const toggleMemory = async (enabled: boolean) => {
    await storage.setMemoryEnabled(enabled);
    setMemoryEnabled(enabled);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.outline} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>대화</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>대화 기억</Text>
            <Text style={styles.settingDescription}>
              켜면 대화 요약을 저장해 다음 대화에 참고해요. 끄면 저장된 장기 기억 요약도 삭제돼요.
            </Text>
          </View>
          <Switch
            value={memoryEnabled}
            onValueChange={toggleMemory}
            trackColor={{ false: '#D8D5D0', true: COLORS.lime }}
            thumbColor={COLORS.outline}
            accessibilityLabel="대화 기억"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    height: 61,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.outline,
  },
  backButton: { marginRight: 12, paddingBottom: 4 },
  headerTitle: { fontFamily: 'ahn2006-B', fontSize: 30, color: COLORS.textPrimary },
  content: { paddingHorizontal: 20, paddingTop: 28 },
  sectionTitle: { fontFamily: 'ahn2006-B', fontSize: 20, color: COLORS.green, marginBottom: 12 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  settingCopy: { flex: 1, gap: 6 },
  settingTitle: { fontFamily: 'ahn2006-B', fontSize: 18, color: COLORS.textPrimary },
  settingDescription: {
    fontFamily: 'ahn2006-M',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
});