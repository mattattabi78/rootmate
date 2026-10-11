import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { COLORS, FONTS } from '../constants';
import { storage } from '../store/storage';
import PlantCharacter from '../components/common/PlantCharacter';
import { PlantType, GrowthStage, getExpressionImage } from '../constants/character';
import { loadGrowthState } from '../store/growthStore';
import { getLocalDateString } from '../utils/date';
import { getDevAdjustedDate } from '../utils/devOverrides';

const WEEK_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 이번 주(월~일) 날짜 문자열 배열
function getThisWeekDates(): string[] {
  const today = getDevAdjustedDate();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7; // 월=0 … 일=6
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);
    return getLocalDateString(d);
  });
}

function hasFinalConsonant(word: string): boolean {
  if (!word) return false;
  const code = word.charCodeAt(word.length - 1);
  return code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
}

type DayStatus = 'done' | 'missed' | 'future';

const ICON_COLOR = '#303a1e';

function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path d="M2 6.5L5 9.5L10 3" stroke={ICON_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CrossIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke={ICON_COLOR} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function StreakScreen() {
  const [streakCount, setStreakCount] = useState(0);
  const [daysTogether, setDaysTogether] = useState(1);
  const [nickname, setNickname] = useState('');
  const [week, setWeek] = useState<{ date: string; status: DayStatus }[]>([]);
  const [plantType, setPlantType] = useState<PlantType>('tomato');
  const [plantStage, setPlantStage] = useState<GrowthStage>(1);
  const [generatedPlantUri, setGeneratedPlantUri] = useState<string | null>(null);
  const [generatedFacePos, setGeneratedFacePos] = useState<{ x: number; y: number; pot_width: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [streak, nick, plantData, savedPlant] = await Promise.all([
        storage.getStreakCount(),
        storage.getNickname(),
        storage.getPlantData(),
        storage.getGeneratedPlant(),
      ]);
      setStreakCount(streak);
      setNickname(nick ?? '');
      if (plantData?.id) setPlantType(plantData.id as PlantType);
      // 대체(기본) 캐릭터 이미지는 성장 상태의 현재 단계를 따라감
      const growth = await loadGrowthState();
      setPlantStage((growth?.currentStage ?? 1) as GrowthStage);
      if (savedPlant) {
        setGeneratedPlantUri(savedPlant.uri);
        setGeneratedFacePos(savedPlant.facePos);
      }

      // 함께한 일수 (입양일이 1일째)
      if (plantData?.adoptedAt) {
        const a = new Date(plantData.adoptedAt);
        const t = getDevAdjustedDate();
        const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
        const end = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
        setDaysTogether(Math.max(0, Math.round((end - start) / 86400000)) + 1);
      }

      // 이번 주 월~일 상태
      const today = getLocalDateString(getDevAdjustedDate());
      const dates = getThisWeekDates();
      const statuses = await Promise.all(
        dates.map(async date => {
          if (date > today) return { date, status: 'future' as const };
          const record = await storage.getDailyRecord(date);
          if (record !== null) return { date, status: 'done' as const };
          // 오늘은 아직 기록 전일 수 있으므로 '미래'처럼 빈 원으로 표시
          return { date, status: (date === today ? 'future' : 'missed') as DayStatus };
        }),
      );
      setWeek(statuses);
    })();
  }, []);

  const goHome = () => router.replace('/' as any);
  const together = nickname
    ? `${nickname}${hasFinalConsonant(nickname) ? '이와' : '와'} 함께한지 ${daysTogether}일째`
    : `함께한지 ${daysTogether}일째`;

  // 가운데 그룹을 화면(컨테이너) 정중앙에 두기 위해 실제 크기를 측정해 위치를 계산 (고정 상수 없음)
  const [areaH, setAreaH] = useState(0);
  const [groupH, setGroupH] = useState(0);
  const measured = areaH > 0 && groupH > 0;
  const groupTop = measured ? (areaH - groupH) / 2 : 0;

  return (
    <View style={styles.safe} onLayout={e => setAreaH(e.nativeEvent.layout.height)}>
      {/* 위쪽 영역: 캐릭터를 그룹 바로 위(간격 38)에 붙임 */}
      <View style={[styles.topArea, { top: groupTop - PLANT_GAP - PLANT_H, opacity: measured ? 1 : 0 }]}>
        <View style={styles.plantBox}>
          {generatedPlantUri ? (
            <View style={styles.genChar}>
              <Image
                source={{ uri: generatedPlantUri }}
                style={{ width: 180, height: 180 }}
                resizeMode="contain"
              />
              {generatedFacePos && (
                <Image
                  source={getExpressionImage(plantType, 'sparkle')}
                  style={{
                    position: 'absolute',
                    width: 90, height: 90,
                    left: (generatedFacePos.x / 100) * 180 - 45,
                    top:  (generatedFacePos.y / 100) * 180 - 45,
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
              width={122}
            />
          )}
        </View>
      </View>

      {/* 가운데 그룹: 숫자 + Day Streak + 함께한 일수 — 화면 가로·세로 정중앙 */}
      <View
        style={[styles.group, { top: groupTop, opacity: measured ? 1 : 0 }]}
        onLayout={e => setGroupH(e.nativeEvent.layout.height)}
      >
        <Text style={styles.count}>{streakCount}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
        <Text style={styles.together} numberOfLines={1}>{together}</Text>
      </View>

      {/* 아래쪽 영역: 트래커·CTA */}
      <View style={[styles.bottomArea, { top: groupTop + groupH + TRACKER_GAP, opacity: measured ? 1 : 0 }]}>
        <View style={styles.trackerRow}>
          {WEEK_LABELS.map((label, idx) => {
            const day = week[idx];
            const status = day?.status ?? 'future';
            return (
              <View key={label} style={styles.dayCell}>
                <View style={[
                  styles.dayIcon,
                  status === 'done'   && styles.dayIconDone,
                  status === 'missed' && styles.dayIconMissed,
                  status === 'future' && styles.dayIconFuture,
                ]}>
                  {status === 'done' ? <CheckIcon /> : status === 'missed' ? <CrossIcon /> : null}
                </View>
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.cta} onPress={goHome} activeOpacity={0.8}>
          <Text style={styles.ctaText}>앞으로도 함께하자!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const PLANT_H = 180;       // 캐릭터 영역 높이
const PLANT_GAP = 38;      // 캐릭터 ↔ 그룹 간격
const TRACKER_GAP = 47;    // 그룹 ↔ 주간 트래커 간격

// Figma 402x874 (헤더·탭바 없는 전체 화면). 아래 margin 값은 Figma y 좌표 차이로 계산.
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // 모두 절대 위치 — top 값은 렌더 시 측정한 화면·그룹 높이로 계산
  topArea:    { position: 'absolute', left: 0, right: 0, height: PLANT_H, alignItems: 'center' },
  group:      { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bottomArea: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },

  plantBox: { width: 122, height: 180, alignItems: 'center', overflow: 'visible' },
  genChar: { position: 'absolute', left: -29, top: 0, width: 180, height: 180 },

  // 숫자 box 97 (top 340 → 캐릭터 하단 302 + 38), 100px ExtraBold
  count: {
    height: 97,
    fontFamily: FONTS.extraBold,
    fontSize: 100,
    lineHeight: 100,
    color: COLORS.pine,
    textAlign: 'center',
  },
  // Day Streak 28px Heavy, 줄높이 45 (top 437)
  streakLabel: {
    fontFamily: FONTS.heavy,
    fontSize: 28,
    lineHeight: 45,
    color: COLORS.pine,
    textAlign: 'center',
  },
  // 함께한 지 N일째 15px ExtraBold, 줄높이 45 (top 482)
  together: {
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    lineHeight: 45,
    color: COLORS.pine,
    textAlign: 'center',
  },

  // 주간 트래커: left 45 / right 45.5 (폭 311.5), 좌우 4, 칸 사이 균등 (top 574 = together 하단 527 + 47)
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginHorizontal: 45,
    paddingHorizontal: 4,
  },
  dayCell: { alignItems: 'center', gap: 4 },
  dayIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: ICON_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIconDone:   { backgroundColor: COLORS.lime },
  dayIconMissed: { backgroundColor: COLORS.tabTextOff },
  dayIconFuture: { backgroundColor: COLORS.bg, borderColor: COLORS.line },
  dayLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    lineHeight: 22,
    color: '#191C1B',
  },

  // CTA 345×54 (top 688 = 트래커 하단 628 + 60), 반경 10
  cta: {
    width: 345,
    maxWidth: '100%',
    height: 54,
    marginTop: 60,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    lineHeight: 22,
    color: '#191C1B',
  },
});
