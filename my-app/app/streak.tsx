import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { COLORS, FONTS, fs } from '../constants';
import { storage } from '../store/storage';
import FaceOverlay from '../components/common/BlinkingFace';
import PlantCharacter from '../components/common/PlantCharacter';
import Confetti from '../components/common/Confetti';
import HoppingText from '../components/common/HoppingText';
import { pickStreakCtaMessage } from '../constants/streakMessages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlantType } from '../constants/character';
import { getLocalDateString } from '../utils/date';
import { getDevAdjustedDate } from '../utils/devOverrides';
import { haptics } from '../utils/haptics';

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

  // ─── 등장 연출 ─────────────────────────────────────────────────
  //  배치가 끝나면 바로: 화면 위쪽에서 컨페티가 위로 터져 오른 뒤 중력으로 떨어지고(진동 강→중), 오늘 칸의 체크가 뿅 튀어올랐다가 제자리로 정렬(착지 때 성공 진동)
  const [plantBox, setPlantBox] = useState<{ y: number; h: number } | null>(null);
  const [areaW, setAreaW] = useState(0);
  const [burst, setBurst] = useState(false);
  const [pop] = useState(() => ({
    lift:  new Animated.Value(0),    // 위로 뜬 높이 (0=제자리, 1=최고점)
    scale: new Animated.Value(0),    // 커졌다 자리잡는 크기 (0=안 보임)
  }));
  const todayIdx = week.findIndex(w => w.date === getLocalDateString(getDevAdjustedDate()) && w.status === 'done');
  const laidOut = !!plantBox && areaW > 0;      // 화면 배치 완료 (데이터 불러오기를 기다리지 않는다)
  const started = useRef(false);
  const popped = useRef(false);

  // 컨페티 + 진동: 배치가 끝나면 거의 바로 터뜨린다
  useEffect(() => {
    if (!laidOut || started.current) return;
    started.current = true;
    haptics.heavy();
    const t1 = setTimeout(haptics.medium, 120);
    setBurst(true);
    return () => clearTimeout(t1);
  }, [laidOut]);

  // 오늘 칸 체크: 기록 데이터까지 불러오면 바로 뿅 (보통 컨페티와 거의 동시)
  useEffect(() => {
    if (!laidOut || week.length === 0 || popped.current || todayIdx < 0) return;
    popped.current = true;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pop.lift, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(pop.lift, { toValue: 0, friction: 4, tension: 150, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(pop.scale, { toValue: 1.4, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(pop.scale, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
      ]),
    ]).start();
    const t2 = setTimeout(haptics.success, 300);   // 착지 순간 (첫 바운스)
    return () => clearTimeout(t2);
  }, [laidOut, week, todayIdx]);   // eslint-disable-line react-hooks/exhaustive-deps

  const goHome = () => router.replace('/' as any);
  const together = nickname
    ? `${nickname}${hasFinalConsonant(nickname) ? '이와' : '와'} 함께한지 ${daysTogether}일째`
    : `함께한지 ${daysTogether}일째`;

  // 버튼 문구: 화면이 열릴 때 7가지 중 하나를 무작위로 (한 번 정하면 화면이 다시 그려져도 유지)
  const [ctaText] = useState(pickStreakCtaMessage);

  // 레이아웃: 캐릭터 → 주간 트래커 → N일 연속 관리 중! → 함께한 일수 를 세로로 쌓아, 버튼 위 영역의 정가운데에 둔다.
  // 높이가 모자라면(작은 화면) 캐릭터와 간격만 줄이고 글자 크기는 유지한다.
  const insets = useSafeAreaInsets();
  const [areaH, setAreaH] = useState(0);
  const ctaBottom = 16 + insets.bottom;                    // 채팅의 '홈으로 돌아가기' 버튼과 같은 위치
  const availH = Math.max(0, areaH - insets.top - ctaBottom - CTA_H - 16);   // 버튼 위쪽 여유 영역
  const textH = TRACKER_H + fs(45) * 2;                    // 줄이지 않는 부분(트래커 + 글자 두 줄)
  const flexH = PLANT_BASE_H + GAP_BASE * 2;                // 줄이는 부분(캐릭터 + 간격 둘)
  const f = areaH > 0 ? Math.max(0.5, Math.min(1, (availH - textH - 32) / flexH)) : 1;
  const plantW = PLANT_BASE_W * f;
  const plantH = PLANT_BASE_H * f;
  const gap = GAP_BASE * f;

  return (
    <View style={styles.safe} onLayout={e => { setAreaH(e.nativeEvent.layout.height); setAreaW(e.nativeEvent.layout.width); }}>
      {/* 축하 컨페티: 캐릭터·글자 뒤에서 터짐 (터치는 통과) */}
      {laidOut && (
        <Confetti play={burst} count={260} secondBurstAt={0} origin={{ x: areaW / 2, y: Math.max(insets.top + 100, areaH * 0.33) }} />
      )}

      <View style={[styles.column, { top: insets.top, height: availH, opacity: areaH > 0 ? 1 : 0 }]}>
        {/* 캐릭터 (Figma 190×283) */}
        <View
          style={{ width: plantW, height: plantH, marginBottom: gap, alignItems: 'center' }}
          onLayout={e => setPlantBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
        >
          {generatedPlantUri ? (
            <View style={{ position: 'absolute', width: GEN_RATIO * plantW, height: GEN_RATIO * plantW, left: (plantW - GEN_RATIO * plantW) / 2, top: (plantH - GEN_RATIO * plantW) / 2 }}>
              <Image
                source={{ uri: generatedPlantUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
              {generatedFacePos && (
                <FaceOverlay
                  plantType={plantType}
                  style={{
                    position: 'absolute',
                    width: GEN_RATIO * plantW * 0.5, height: GEN_RATIO * plantW * 0.5,
                    left: (generatedFacePos.x / 100) * GEN_RATIO * plantW - GEN_RATIO * plantW * 0.25,
                    top:  (generatedFacePos.y / 100) * GEN_RATIO * plantW - GEN_RATIO * plantW * 0.25,
                  }}
                />
              )}
            </View>
          ) : (
            <PlantCharacter plantType={plantType} stage={1} expression="default" width={plantW} />
          )}
        </View>

        {/* 이번 주 월~일 */}
        <View style={[styles.trackerRow, { marginBottom: gap }]}>
          {WEEK_LABELS.map((label, idx) => {
            const day = week[idx];
            const status = day?.status ?? 'future';
            const isPop = idx === todayIdx;
            return (
              <View key={label} style={styles.dayCell}>
                <View>
                  <View style={[
                    styles.dayIcon,
                    status === 'done'   && !isPop && styles.dayIconDone,
                    status === 'missed' && styles.dayIconMissed,
                    (status === 'future' || isPop) && styles.dayIconFuture,
                  ]}>
                    {status === 'done' && !isPop ? <CheckIcon /> : status === 'missed' ? <CrossIcon /> : null}
                  </View>
                  {/* 오늘 칸: 빈 원 위에 체크 원이 뿅 튀어올랐다가 자리잡음 */}
                  {isPop && (
                    <Animated.View
                      style={[
                        styles.dayIcon, styles.dayIconDone, StyleSheet.absoluteFill,
                        {
                          opacity: pop.scale.interpolate({ inputRange: [0, 0.01], outputRange: [0, 1], extrapolate: 'clamp' }),
                          transform: [
                            { translateY: pop.lift.interpolate({ inputRange: [0, 1], outputRange: [0, -44] }) },
                            { scale: pop.scale },
                          ],
                        },
                      ]}
                    >
                      <CheckIcon />
                    </Animated.View>
                  )}
                </View>
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            );
          })}
        </View>

        <HoppingText style={styles.streakLabel} text={`${streakCount}일 연속 관리 중!`} />
        <Text style={styles.together} numberOfLines={1}>{together}</Text>
      </View>

      {/* 하단 버튼: 이전 화면(채팅)의 '홈으로 돌아가기' 버튼과 같은 자리 */}
      <TouchableOpacity style={[styles.cta, { bottom: ctaBottom }]} onPress={goHome} activeOpacity={0.8}>
        <Text style={styles.ctaText}>{ctaText}</Text>
      </TouchableOpacity>

    </View>
  );
}

// Figma 연속 관리 화면(402×874): 캐릭터 190×283 → 간격 50 → 트래커(28 + 4 + 22) → 간격 50 → 'N일 연속 관리 중!'(줄높이 45) → 함께한 일수(줄높이 45)
const PLANT_BASE_W = 190;
const PLANT_BASE_H = 283;
const GAP_BASE = 50;
const TRACKER_H = 28 + 4 + fs(22);
const CTA_H = 48;               // 채팅의 '홈으로 돌아가기' 버튼과 같은 높이
const GEN_RATIO = 1.2;          // AI 사진 캐릭터(정사각형)를 캐릭터 영역 폭의 몇 배로 그릴지

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // 캐릭터·트래커·글자를 세로로 쌓은 묶음: 버튼 위 영역 안에서 세로 가운데
  column: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },

  // N일 연속 관리 중! 28px Heavy, 줄높이 45
  streakLabel: {
    fontFamily: FONTS.heavy,
    fontSize: fs(28),
    lineHeight: fs(45),
    color: COLORS.pine,
    textAlign: 'center',
  },
  // 함께한 지 N일째 15px, 줄높이 45
  together: {
    fontFamily: FONTS.bold,
    fontSize: fs(15),
    lineHeight: fs(45),
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
    fontSize: fs(13),
    lineHeight: fs(22),
    color: '#191C1B',
  },

  // 하단 버튼: 채팅의 '홈으로 돌아가기'와 같은 크기·위치 (좌우 16, 높이 48)
  cta: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: CTA_H,
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
    fontSize: fs(16),
    lineHeight: fs(22),
    color: '#191C1B',
  },
});
