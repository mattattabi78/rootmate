import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS } from '../constants';
import { storage } from '../store/storage';
import TopAppBar from '../components/common/TopAppBar';
import BottomNavBar from '../components/common/BottomNavBar';
import PlantCharacter from '../components/common/PlantCharacter';
import PlantDetailView from '../components/plant/PlantDetailView';
import Wallpaper, { WALLPAPER_COLOR } from '../components/common/Wallpaper';
import { PLANT_INFO } from '../constants/plants';
import { getMaxStage } from '../constants/growthStages';
import { PlantType, GrowthStage } from '../constants/character';

const ALL_PLANTS: PlantType[] = ['basil', 'tomato', 'marigold'];

// Figma 덱 수치 (402x874 프레임)
// Figma 덱 수치 (402x874 프레임, 본문은 y=69부터)
const CARD_W = 240;
const CARD_H = 360;
const SIDE_W = 167;
const SIDE_H = 250;
const SWIPE_THRESHOLD = 60;
// 카드 + 화살표 + 더 알아보기 그룹 전체의 세로 위치 조정 (px, −위 / +아래). 0이 Figma 위치
const GROUP_OFFSET_Y = 30;
const ARROW_D = 'M19.8273 0.0101666C20.387 -0.0260831 20.6271 0.018287 21.0594 0.415336C22.327 1.58042 23.5272 2.83801 24.7434 4.05886C27.1892 6.48735 29.5983 8.95208 31.9694 11.4521L32 13.0534C30.7238 14.6411 21.4783 25.8289 20.8953 25.9637C20.7287 26.0023 20.316 26.0296 20.18 25.9406C19.5787 25.5463 16.6626 22.6078 16.5732 22.0076C16.3846 20.7372 19.0288 18.4632 19.8004 17.4271L19.9902 17.1574L19.9228 17.0212C19.0839 16.9199 14.8291 16.9873 13.7991 16.9815L0.306174 16.879C-0.0343036 15.4693 -0.112673 10.7785 0.182489 9.34526L20.0098 8.93571C15.6901 3.62725 14.1702 5.62196 19.8273 0.0101666Z';

// ─── 메인 화면 ────────────────────────────────────────────────────
export default function CollectionScreen() {
  const [index, setIndex] = useState(0);

  // 스와이프 애니메이션 값: dx = 손가락 이동량, enter = 새 카드 등장(0→1)
  const [dx] = useState(() => new Animated.Value(0));
  const [enter] = useState(() => new Animated.Value(1));
  // 세로 페이저: page 0 = 카드 덱, 1 = 상세 (진행도 0~1)
  const [page] = useState(() => new Animated.Value(0));
  const [bodyH, setBodyH] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailScrollY = useRef(0);

  const clampIndex = (n: number) => Math.max(0, Math.min(ALL_PLANTS.length - 1, n));

  // 처음 열 때 내가 키우는 식물 카드부터 보여 줌
  useFocusEffect(useCallback(() => {
    storage.getPlantData().then(plantData => {
      if (plantData?.id) setIndex(clampIndex(ALL_PLANTS.indexOf(plantData.id as PlantType)));
    });
  }, []));

  const plantType = ALL_PLANTS[index];
  const info = PLANT_INFO[plantType];
  // 모든 식물 카드를 정보까지 공개 (내가 키우는 식물 표시 방식은 추후 결정)
  const isUnlocked = true;

  // PanResponder 핸들러가 항상 최신 값을 보도록 보관
  const latest = useRef({ index, isUnlocked, bodyH, detailOpen });
  useEffect(() => { latest.current = { index, isUnlocked, bodyH, detailOpen }; });

  const animatePage = (to: 0 | 1) => {
    setDetailOpen(to === 1);
    Animated.timing(page, {
      toValue: to,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // 카드 덱 페이지: 좌우 = 카드 넘기기(무한 반복), 위로 = 상세 페이지로 스와이프
  const axis = useRef<'h' | 'v' | null>(null);
  // eslint-disable-next-line react-hooks/refs
  const [deckPan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 10 || (g.dy < -10 && Math.abs(g.dy) > Math.abs(g.dx)),
    onPanResponderGrant: () => { axis.current = null; },
    onPanResponderMove: (_, g) => {
      const { isUnlocked: unlocked, bodyH: H } = latest.current;
      if (!axis.current) axis.current = Math.abs(g.dx) >= Math.abs(g.dy) ? 'h' : 'v';
      if (axis.current === 'h') dx.setValue(g.dx);
      else if (unlocked && H > 0) page.setValue(Math.max(0, Math.min(1, -g.dy / H)));
    },
    onPanResponderRelease: (_, g) => {
      const { index: i, isUnlocked: unlocked, bodyH: H } = latest.current;
      if (axis.current === 'v') {
        const progress = H > 0 ? -g.dy / H : 0;
        if (unlocked && (progress > 0.12 || g.vy < -0.5)) animatePage(1);
        else animatePage(0);
        return;
      }
      if (Math.abs(g.dx) > SWIPE_THRESHOLD) {
        const dir = g.dx < 0 ? 1 : -1;                         // 왼쪽으로 밀면 다음 카드
        const target = (i + dir + ALL_PLANTS.length) % ALL_PLANTS.length;   // 순환
        Animated.timing(dx, {
          toValue: -dir * 360,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          setIndex(target);
          dx.setValue(0);
          enter.setValue(0);
          Animated.spring(enter, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
        });
      } else {
        Animated.spring(dx, { toValue: 0, friction: 6, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start();
      animatePage(latest.current.detailOpen ? 1 : 0);
    },
  }));

  // 상세 페이지: 맨 위에서 아래로 당기면 덱 페이지로 복귀
  // eslint-disable-next-line react-hooks/refs
  const [detailPan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) =>
      g.dy > 10 && g.dy > Math.abs(g.dx) && detailScrollY.current <= 0,
    onPanResponderMove: (_, g) => {
      const H = latest.current.bodyH;
      if (H > 0) page.setValue(1 - Math.max(0, Math.min(1, g.dy / H)));
    },
    onPanResponderRelease: (_, g) => {
      const H = latest.current.bodyH;
      const progress = H > 0 ? g.dy / H : 0;
      animatePage(progress > 0.15 || g.vy > 0.5 ? 0 : 1);
    },
    onPanResponderTerminate: () => animatePage(1),
  }));

  // 메인 카드 변형: 드래그에 따라 이동·기울기·페이드
  const cardTransform = {
    transform: [
      { translateX: dx },
      { rotate: dx.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-12deg', '0deg', '12deg'] }) },
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
    ],
    opacity: Animated.multiply(
      dx.interpolate({ inputRange: [-300, -120, 0, 120, 300], outputRange: [0, 0.6, 1, 0.6, 0], extrapolate: 'clamp' }),
      enter.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    ),
  };
  // 뒤쪽 카드는 드래그 방향으로 살짝 따라 움직임
  const sideShift = dx.interpolate({ inputRange: [-300, 0, 300], outputRange: [-14, 0, 14], extrapolate: 'clamp' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar />

      <View style={styles.body} onLayout={e => setBodyH(e.nativeEvent.layout.height)}>
        <Wallpaper />

        {bodyH > 0 && (
        <>
        {/* 페이지 0: 카드 덱 */}
        <Animated.View
          style={[styles.page, { height: bodyH, transform: [{ translateY: page.interpolate({ inputRange: [0, 1], outputRange: [0, -bodyH] }) }] }]}
          {...deckPan.panHandlers}
        >
        <View style={[styles.stage, { transform: [{ translateY: GROUP_OFFSET_Y }] }]}>
          {/* 뒤쪽 카드 2장 */}
          <Animated.View style={[styles.sideCard, styles.sideCardLeft, { transform: [{ translateX: sideShift }, { rotate: '-10deg' }] }]} />
          <Animated.View style={[styles.sideCard, styles.sideCardRight, { transform: [{ translateX: sideShift }, { rotate: '10deg' }] }]} />

          {/* 메인 카드 */}
          <Animated.View style={[styles.mainCard, cardTransform]}>
            <Text style={styles.cardName}>{info.name}</Text>

            <View style={styles.cardChar} pointerEvents="none">
              {/* 도감 카드 이미지는 기본 이미지로 고정: 각 식물의 마지막 성장 단계 (성장 단계·AI 캐릭터와 무관) */}
              <PlantCharacter
                plantType={plantType}
                stage={getMaxStage(plantType) as GrowthStage}
                expression="default"
                width={90}
              />
            </View>

            {isUnlocked && (
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTagline}>{info.tagline}</Text>
                <Text style={styles.cardIntro}>{info.cardIntro ?? info.intro}</Text>
              </View>
            )}
          </Animated.View>

          {/* 더 알아보기: 누르거나 위로 스와이프하면 상세 페이지가 아래에서 올라옴 */}
          {isUnlocked && (
            <TouchableOpacity style={styles.moreBtn} onPress={() => animatePage(1)} activeOpacity={0.7}>
              <View style={styles.arrowBox}>
                {/* 오른쪽 화살표(32x26)를 90° 회전 → 가로 26 × 세로 32 아래 화살표 (Figma 1:267) */}
                <Svg width={32} height={26} viewBox="0 0 32 26" style={styles.arrowDown}>
                  <Path d={ARROW_D} fill={COLORS.pine} />
                </Svg>
              </View>
              <Text style={styles.moreText}>더 알아보기</Text>
            </TouchableOpacity>
          )}
        </View>
        </Animated.View>

        {/* 페이지 1: 상세 — 아래에서 위로 올라오고, 아래로 당기면 덱으로 복귀 */}
        <Animated.View
          style={[styles.page, { height: bodyH, transform: [{ translateY: page.interpolate({ inputRange: [0, 1], outputRange: [bodyH, 0] }) }] }]}
          pointerEvents={detailOpen ? 'auto' : 'none'}
          {...detailPan.panHandlers}
        >
          <PlantDetailView plantType={plantType} onScrollY={y => { detailScrollY.current = y; }} />
        </Animated.View>
        </>
        )}
      </View>

      <BottomNavBar activeTab="collection" onActiveTabPress={() => { if (detailOpen) animatePage(0); }} />
    </SafeAreaView>
  );
}

// ─── 스타일 (Figma 402x874, 본문은 헤더 아래 y=69부터 → 아래 top 값은 Figma y − 69) ──
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.headerBg },
  // overflow hidden: 페이지가 위로 밀려 올라가도 헤더 영역을 침범하지 않도록 본문 안에서 잘라냄
  body: { flex: 1, backgroundColor: WALLPAPER_COLOR, overflow: 'hidden' },
  page: { position: 'absolute', top: 0, left: 0, right: 0 },
  stage: { flex: 1, alignItems: 'center' },

  // 뒤쪽 카드: 중심 (프레임 중앙 −63 / +54, y 395−69=326), 각도는 중심 기준 ±10°
  sideCard: {
    position: 'absolute',
    top: 326 - SIDE_H / 2,
    width: SIDE_W,
    height: SIDE_H,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  sideCardLeft:  { left: '50%', marginLeft: -63 - SIDE_W / 2 },
  sideCardRight: { left: '50%', marginLeft: 54 - SIDE_W / 2 },

  // 메인 카드 top 215 → 146
  mainCard: {
    position: 'absolute',
    top: 146,
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  // 이름: top 247 (카드 기준 32), 24px, 줄높이 20 → 28로 맞추고 top 28
  cardName: {
    position: 'absolute', top: 28, left: 0, right: 0, textAlign: 'center',
    fontFamily: FONTS.extraBold, fontSize: 24, lineHeight: 28, color: COLORS.green,
  },
  // 캐릭터 90x150: 카드 기준 top 60
  // 캐릭터 영역 90x150 (카드 기준 left 72, top 75 → 중심 (117, 135))
  cardChar: { position: 'absolute', top: 75, left: 72, width: 90, height: 150 },
  // 태그라인 top 446 (카드 기준 231), 폭 170, 요소 간격 15
  cardTextWrap: { position: 'absolute', top: 231, left: 35, width: 170, alignItems: 'center', gap: 15 },
  cardTagline: {
    fontFamily: FONTS.extraBold, fontSize: 16, lineHeight: 20,
    color: COLORS.green, textAlign: 'center',
  },
  cardIntro: {
    alignSelf: 'stretch',
    fontFamily: FONTS.semiBold, fontSize: 10, lineHeight: 15,
    color: '#000', textAlign: 'center',
  },

  // 더 알아보기: 화살표 top 630 (→561), 높이 58 / 텍스트 top 694 (→625)
  moreBtn: { position: 'absolute', top: 561, alignItems: 'center' },
  arrowBox: { width: 26, height: 32 },
  // 58x26 화살표를 중심 기준 90° 회전 (레이아웃 박스를 26x58에 맞추려 오프셋)
  arrowDown: { position: 'absolute', left: -3, top: 3, transform: [{ rotate: '90deg' }] },
  moreText: {
    marginTop: 32,                 // 화살표 하단 662 → 텍스트 top 694
    fontFamily: FONTS.extraBold, fontSize: 16, lineHeight: 20, color: COLORS.pine,
  },
});
