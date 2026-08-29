import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../constants';
import { storage } from '../store/storage';
import PlantCharacter from '../components/common/PlantCharacter';
import { PlantType, GrowthStage, growthStageToNumber, getExpressionImage } from '../constants/character';
import EmojiText from '../components/common/EmojiText';
import { getLocalDateString } from '../utils/date';
import { getDevAdjustedDate } from '../utils/devOverrides';

import BackImg from '../assets/images/back-button.svg';

// 시작일부터 오늘까지 날짜 배열. 7일 초과면 최근 7일만 반환.
function getTrackerDays(startDateStr: string): string[] {
  const today = getDevAdjustedDate();
  today.setHours(0, 0, 0, 0);
  
  // 'YYYY-MM-DD' 문자열을 로컬 기준으로 정확히 파싱하기 위한 처리
  const [year, month, day] = startDateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  start.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const totalDays = Math.min(diffDays + 1, 7);
  const fromOffset = totalDays - 1;             

  const days: string[] = [];
  for (let i = fromOffset; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // 🔴 기존: days.push(d.toISOString().split('T')[0]);
    // 🟢 수정: 
    days.push(getLocalDateString(d));
  }
  return days;
}

interface DayStatus {
  date: string;
  dayNum: number;
  status: 'done' | 'missed' | 'future';
}

export default function StreakScreen() {
  const [streakCount, setStreakCount] = useState(0);
  const [weekDays, setWeekDays] = useState<DayStatus[]>([]);
  const [plantType, setPlantType] = useState<PlantType>('tomato');
  const [plantStage, setPlantStage] = useState<GrowthStage>(1);
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<{ x: number; y: number; pot_width: number } | null>(null);

  // 스파클 애니메이션 (각각 다른 타이밍으로 깜빡임)
  const sparks = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const startSpark = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        ])
      ).start();
    };
    startSpark(sparks[0], 0);
    startSpark(sparks[1], 350);
    startSpark(sparks[2], 700);
    startSpark(sparks[3], 175);
  }, []);

  useEffect(() => {
    (async () => {
      const [streak, firstRecordDate, plantData, savedPlant] = await Promise.all([
        storage.getStreakCount(),
        storage.getFirstRecordDate(),
        storage.getPlantData(),
        storage.getGeneratedPlant(),
      ]);
      setStreakCount(streak);
      if (plantData?.id) setPlantType(plantData.id as PlantType);
      if (plantData?.growthStage) setPlantStage(growthStageToNumber(plantData.growthStage));
      if (savedPlant) {
        setGeneratedPlantUri(savedPlant.uri);
        setGeneratedFacePos(savedPlant.facePos);
      }

      const today = getLocalDateString();
      const startDate = firstRecordDate ?? today;
      const days = getTrackerDays(startDate);

      // 관리 시작일 기준 N번째 날 계산
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const startMs = new Date(sy, sm - 1, sd).getTime();

      const results: DayStatus[] = await Promise.all(
        days.map(async (date) => {
          const [cy, cm, cd] = date.split('-').map(Number);
          const dayNum = Math.floor((new Date(cy, cm - 1, cd).getTime() - startMs) / 86400000) + 1;
          if (date > today) return { date, dayNum, status: 'future' as const };
          const record = await storage.getDailyRecord(date);
          return { date, dayNum, status: record !== null ? 'done' as const : 'missed' as const };
        })
      );
      setWeekDays(results);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.replace('/' as any)}
            hitSlop={12}
          >
            <BackImg width={styles.backIcon.width} height={styles.backIcon.height} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RootMate</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 식물 캐릭터 + 스파클 */}
        <View style={styles.plantZone}>
          {generatedPlantUri ? (
            <View style={{ width: 220, height: 220 }}>
              <Image
                source={{ uri: generatedPlantUri }}
                style={{ width: 220, height: 220 }}
                resizeMode="contain"
              />
              {generatedFacePos && (
                <Image
                  source={getExpressionImage(plantType, 'sparkle')}
                  style={{
                    position: 'absolute',
                    width: 110, height: 110,
                    left: (generatedFacePos.x / 100) * 220 - 55,
                    top:  (generatedFacePos.y / 100) * 220 - 55,
                  }}
                  resizeMode="contain"
                />
              )}
            </View>
          ) : (
            <PlantCharacter
              plantType={plantType}
              stage={plantStage}
              expression="sparkle"
              size="large"
            />
          )}
          {/* 스파클: 식물 위에 렌더링되도록 뒤에 배치 */}
          {([styles.sparkle1, styles.sparkle2, styles.sparkle3, styles.sparkle4] as const).map((pos, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.sparkle,
                pos,
                {
                  opacity: sparks[i],
                  transform: [{
                    scale: sparks[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }),
                  }],
                },
              ]}
            >
              ✦
            </Animated.Text>
          ))}
        </View>

        {/* 연속 관리 일수 heading */}
        <EmojiText style={[styles.heading, generatedPlantUri ? { marginTop: 16 } : undefined]}>
          {streakCount}일 연속 관리 중 🫶
        </EmojiText>

        {/* 주간 트래커 */}
        <View style={styles.trackerCard}>
          <Text style={styles.trackerTitle}>연속 관리일</Text>
          <View style={styles.trackerRow}>
            {Array.from({ length: 7 }).map((_, idx) => {
              const day = weekDays[idx];
              if (day) {
                return (
                  <View key={day.date} style={styles.dayCell}>
                    <View style={[
                      styles.dayIcon,
                      day.status === 'done'   && styles.dayIconDone,
                      day.status === 'missed' && styles.dayIconMissed,
                      day.status === 'future' && styles.dayIconFuture,
                    ]}>
                      <EmojiText style={[
                        styles.dayIconText,
                        day.status === 'done'   && styles.dayIconTextDone,
                        day.status === 'missed' && styles.dayIconTextMissed,
                      ]}>
                        {day.status === 'done' ? '✓' : day.status === 'missed' ? '✕' : '🔒'}
                      </EmojiText>
                    </View>
                    <Text style={styles.dayLabel}>{day.dayNum}일</Text>
                  </View>
                );
              }
              return (
                <View key={`empty-${idx}`} style={styles.dayCell}>
                  <View style={[styles.dayIcon, styles.dayIconEmpty]} />
                </View>
              );
            })}
          </View>
        </View>

        {/* 홈으로 버튼 */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.homeBtnText}>홈으로 가기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // 헤더
  header: {
    height: 61,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.outline,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backIcon: { width: 22, height: 22 },
  headerTitle: { fontFamily: 'ahn2006-B', fontSize: 30, color: COLORS.textPrimary },

  // 콘텐츠
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 24,
  },

  // 식물 + 스파클
  plantZone: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plantZoneGenerated: {
    width: 280,
    height: 280,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 22,
    color: '#f5c842',
    fontWeight: '900',
  },
  sparkle1: { top: 10,  left: 10  },
  sparkle2: { top: 10,  right: 10 },
  sparkle3: { bottom: 30, left: 20  },
  sparkle4: { bottom: 30, right: 20 },

  // 연속 관리 heading
  heading: {
    fontFamily: 'ahn2006-B',
    fontSize: 32,
    marginTop: 60,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // 주간 트래커 카드
  trackerCard: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    padding: 20,
    gap: 16,
  },
  trackerTitle: {
    fontFamily: 'ahn2006-B',
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
  },
  dayIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  dayIconDone:   { backgroundColor: COLORS.lime, borderColor: COLORS.outline },
  dayIconMissed: { backgroundColor: '#ffe5e5',    borderColor: COLORS.red },
  dayIconFuture: { backgroundColor: COLORS.cardBg, borderColor: COLORS.outline },
  dayIconEmpty:  { backgroundColor: 'transparent', borderColor: 'transparent' },
  dayIconText: {
    fontSize: 14,
    fontFamily: 'Paperlogy-5Medium',
    color: COLORS.textPrimary,
  },
  dayIconTextDone:   { color: COLORS.outline },
  dayIconTextMissed: { color: COLORS.red },
  dayLabel: {
    fontFamily: 'Paperlogy-5Medium',
    fontSize: 13,
    color: COLORS.textPrimary,
  },

  // 홈 버튼
  homeBtn: {
    width: '100%',
    height: 60,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    fontFamily: 'ahn2006-B',
    fontSize: 20,
    color: COLORS.textPrimary,
  },
});
