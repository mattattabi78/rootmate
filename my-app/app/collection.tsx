import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, SvgProps } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, fs, ui } from '../constants';
import { storage } from '../store/storage';
import TopAppBar from '../components/common/TopAppBar';
import FitToScreen from '../components/common/FitToScreen';
import BottomNavBar from '../components/common/BottomNavBar';
import PlantCharacter from '../components/common/PlantCharacter';
import PlantDetailView from '../components/plant/PlantDetailView';
import Wallpaper, { WALLPAPER_COLOR } from '../components/common/Wallpaper';
import BasilSilhouette from '../assets/images/characters/silhouette/basil.svg';
import TomatoSilhouette from '../assets/images/characters/silhouette/tomato.svg';
import MarigoldSilhouette from '../assets/images/characters/silhouette/marigold.svg';
import { PLANT_INFO } from '../constants/plants';
import { PlantType, GrowthStage, getMaxStage } from '../constants/character';

const ALL_PLANTS: PlantType[] = ['basil', 'tomato', 'marigold'];

// 키운 적 없는 식물 카드: 실루엣과 글자를 모두 하단 탭바의 비활성 아이콘과 같은 회색으로 보여준다.
const LOCKED_GRAY = COLORS.tabInactive;
// 실루엣 SVG(색은 currentColor).
// 파일은 캐릭터 영역만 잘려 있어서, 846×1254 캐릭터 캔버스 안에서의 위치·크기(x, y, w, h)로 컬러 캐릭터와 같은 자리에 놓는다.
// 위치는 각 식물의 다 자란 모습(`characters/_reference/{식물}_character.png`)과 가장 많이 겹치는 곳으로 맞춘 값이라, 어긋나 보이면 여기만 조정하면 된다.
const CANVAS_W = 846;
const SILHOUETTES: Record<PlantType, { Svg: React.FC<SvgProps>; x: number; y: number; w: number; h: number }> = {
  basil:    { Svg: BasilSilhouette,    x: 87,  y: 141, w: 675, h: 1101 },
  tomato:   { Svg: TomatoSilhouette,   x: 100, y: -8,  w: 660, h: 1184 },
  marigold: { Svg: MarigoldSilhouette, x: 109, y: 167, w: 643, h: 1041 },
};

// Figma 덱 수치 (402x874 프레임)
// Figma 덱 수치 (402x874 프레임, 본문은 y=69부터)
// 카드 크기는 작은 화면에서 글자와 같은 비율(ui)로 줄임 (큰 화면에서는 ui(n) = n)
const CARD_W = ui(240);
const CARD_H = ui(360);
const SIDE_W = ui(167);
const SIDE_H = ui(250);
// 카드 덱의 세로 배치: 카드(+ 간격 + 더 알아보기) 묶음을 본문 영역의 세로 가운데에 둔다.
// 그래서 "헤더 ~ 카드 위"와 "더 알아보기 아래 ~ 하단 탭바"의 여백이 어떤 화면 높이에서도 항상 같다.
// 글자가 들어 있는 카드와 더 알아보기는 크기를 줄이지 않고, 남는 높이에 따라 카드↔더 알아보기 간격(GAP)만 55 ~ 18 사이에서 조정한다.
const DECK_GAP_FULL = 55;      // 여유 있는 화면의 카드↔더 알아보기 간격 (Figma: 카드 하단 506 → 561)
const DECK_GAP_MIN = 18;       // 좁은 화면의 최소 간격
const DECK_MARGIN_PREF = 24;   // 간격을 줄이기 전에 위·아래에 먼저 확보하려는 여백
const DECK_MARGIN_MIN = 12;    // 위·아래 여백의 최소값 (이보다 짧은 화면만 통째로 축소)
const MORE_H = ui(84);         // 더 알아보기(화살표 32 + 간격 32 + 글자 20)
const DECK_MIN_H = DECK_MARGIN_MIN + CARD_H + DECK_GAP_MIN + MORE_H + DECK_MARGIN_MIN;
const SWIPE_THRESHOLD = 60;
const SWIPE_OUT = 360;       // 메인 카드가 완전히 나가는 이동량(px). 이때 뒤 카드가 중앙의 메인 자리에 도착함
const BACK_TO_MAIN = CARD_W / SIDE_W;   // 뒤 카드가 메인 카드 크기가 되는 확대 배율
const SIDE_CENTER_L = ui(63);     // 뒤 카드 중심의 기본 위치 (프레임 중앙 기준, 왼쪽 −63 / 오른쪽 +54) — 중앙으로 올 때 이동량
const SIDE_CENTER_R = ui(54);
const ARROW_D = 'M19.8273 0.0101666C20.387 -0.0260831 20.6271 0.018287 21.0594 0.415336C22.327 1.58042 23.5272 2.83801 24.7434 4.05886C27.1892 6.48735 29.5983 8.95208 31.9694 11.4521L32 13.0534C30.7238 14.6411 21.4783 25.8289 20.8953 25.9637C20.7287 26.0023 20.316 26.0296 20.18 25.9406C19.5787 25.5463 16.6626 22.6078 16.5732 22.0076C16.3846 20.7372 19.0288 18.4632 19.8004 17.4271L19.9902 17.1574L19.9228 17.0212C19.0839 16.9199 14.8291 16.9873 13.7991 16.9815L0.306174 16.879C-0.0343036 15.4693 -0.112673 10.7785 0.182489 9.34526L20.0098 8.93571C15.6901 3.62725 14.1702 5.62196 19.8273 0.0101666Z';

// 받침이 있으면 true (을/를 구분용)
function hasFinalConsonant(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  return code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
}

// ─── 카드 한 장의 내용 (메인 카드·뒤 카드 공용) ─────────────────────
// 키운 적 있으면 캐릭터·소개, 없으면 초록 실루엣과 ? (카드 크기 CARD_W×CARD_H 기준 좌표)
function CardFace({ plantType, unlocked }: { plantType: PlantType; unlocked: boolean }) {
  const info = PLANT_INFO[plantType];
  const sil = SILHOUETTES[plantType];
  const k = ui(90) / CANVAS_W;   // 실루엣: 캐릭터 영역 폭 90(ui) 기준 배율
  return (
    <>
      <Text style={[styles.cardName, !unlocked && styles.lockedText]}>{info.name}</Text>

      {unlocked && (
        <View style={styles.cardChar} pointerEvents="none">
          {/* 도감 카드 이미지는 기본 이미지로 고정: 각 식물의 마지막 성장 단계 (성장 단계·AI 캐릭터와 무관) */}
          <PlantCharacter
            plantType={plantType}
            stage={getMaxStage(plantType) as GrowthStage}
            expression="default"
            width={ui(90)}
          />
        </View>
      )}

      {!unlocked && sil && (
        <View style={styles.cardChar} pointerEvents="none">
          <sil.Svg
            width={sil.w * k} height={sil.h * k} color={LOCKED_GRAY}
            style={{ position: 'absolute', left: sil.x * k, top: sil.y * k }}
          />
        </View>
      )}

      {/* 키운 적 없는 식물도 닉네임(태그라인)과 소개를 보여주되 회색으로 (상세 페이지는 열리지 않음) */}
      <View style={styles.cardTextWrap}>
        <Text style={[styles.cardTagline, !unlocked && styles.lockedText]}>{info.tagline}</Text>
        <Text style={[styles.cardIntro, !unlocked && styles.lockedText]}>{info.cardIntro ?? info.intro}</Text>
      </View>
    </>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────
export default function CollectionScreen() {
  const [index, setIndex] = useState(0);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);   // 키운 적 없는 식물의 더 알아보기를 눌렀을 때 안내 문구
  const [frontSide, setFrontSide] = useState<'left' | 'right'>('right');   // 뒤 카드 두 장 중 더 앞에 그릴 쪽 (평소엔 오른쪽이 위)
  const [deckH, setDeckH] = useState(0);   // 카드 덱 영역 높이 (카드 묶음을 세로 가운데에 두는 데 사용, 측정 전에는 숨김)
  const [grown, setGrown] = useState<string[]>([]);   // 키운 적 있는 식물 id

  // 스와이프 애니메이션 값: dx = 손가락 이동량(뒤 카드가 중앙으로 올라오는 정도도 이 값에서 계산), enter = 넘긴 직후 뒤 카드가 다시 나타나는 정도(0→1)
  const [dx] = useState(() => new Animated.Value(0));
  const [enter] = useState(() => new Animated.Value(1));
  const swapPending = useRef(false);   // 넘김 애니메이션이 끝나 index를 바꾼 직후인지 (아래 effect에서 처리)
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
    storage.getGrownPlants().then(setGrown);
  }, []));

  const plantType = ALL_PLANTS[index];
  // 키운 적 있는 식물만 공개 (아니면 이름만 보임)
  const isUnlocked = grown.includes(plantType);

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
      Math.abs(g.dx) > 10 ||
      (latest.current.isUnlocked && g.dy < -10 && Math.abs(g.dy) > Math.abs(g.dx)),
    onPanResponderGrant: () => {
      axis.current = null;
      // 이전 넘김 애니메이션이 진행 중이어도 새 제스처가 바로 먹히도록 정리
      dx.stopAnimation();
      dx.setValue(0);
    },
    onPanResponderMove: (_, g) => {
      const { isUnlocked: unlocked, bodyH: H } = latest.current;
      // 잠긴(이름만 보이는) 카드는 상세 페이지가 없으므로 항상 좌우 스와이프로 처리
      if (!axis.current) axis.current = !unlocked || Math.abs(g.dx) >= Math.abs(g.dy) ? 'h' : 'v';
      if (axis.current === 'h') {
        dx.setValue(g.dx);
        // 중앙으로 올라오는 쪽 뒤 카드가 반대쪽 뒤 카드보다 앞에 보이도록 끄는 방향이 바뀔 때만 갱신
        if (g.dx > 0) setFrontSide('left');
        else if (g.dx < 0) setFrontSide('right');
      }
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
          toValue: -dir * SWIPE_OUT,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          // 새 카드 내용으로 바꾼 뒤(아래 effect) dx를 0으로 되돌려, 낡은 카드가 한 프레임이라도 보이지 않게 함
          swapPending.current = true;
          setIndex(target);
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

  // 넘김 직후: 메인 카드가 이미 새 식물 내용(뒤 카드가 중앙으로 올라와 있던 모습과 같음)이므로 dx만 0으로 되돌림.
  // 이때 뒤 카드 두 장은 새 이전·다음 카드로 바뀌므로 잠시 숨겼다가 부드럽게 다시 나타냄
  useEffect(() => {
    if (!swapPending.current) return;
    swapPending.current = false;
    enter.setValue(0);
    dx.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [index]);   // eslint-disable-line react-hooks/exhaustive-deps

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
    ],
    // 카드가 비쳐 보이지 않도록 드래그 중에는 불투명하게 두고, 화면 밖으로 나가는 마지막 구간에서만 사라짐
    opacity: dx.interpolate({ inputRange: [-360, -260, 0, 260, 360], outputRange: [0, 1, 1, 1, 0], extrapolate: 'clamp' }),
  };
  // 뒤 카드: 왼쪽 = 이전 카드, 오른쪽 = 다음 카드.
  // 메인 카드를 왼쪽으로 밀면 오른쪽(다음) 카드가, 오른쪽으로 밀면 왼쪽(이전) 카드가 중앙으로 올라와 메인 카드 크기·각도가 된다.
  // 반대쪽 뒤 카드는 그대로 둔다. dx가 SWIPE_OUT에 닿으면 정확히 메인 카드 자리에 겹침 → 이어서 index가 바뀌어도 끊김이 없다.
  // 묶음(카드 + 간격 + 더 알아보기)을 세로 가운데에 배치: 위 여백 = 아래 여백 = (남는 높이 − 간격) / 2
  const deckFree = deckH - CARD_H - MORE_H;
  const deckGap = deckH > 0 ? Math.max(DECK_GAP_MIN, Math.min(DECK_GAP_FULL, deckFree - 2 * DECK_MARGIN_PREF)) : DECK_GAP_FULL;
  const deckMargin = deckH > 0 ? Math.max(0, (deckFree - deckGap) / 2) : 0;   // 위·아래 여백 (같은 값)
  const deckTop = deckMargin;
  const prevType = ALL_PLANTS[(index - 1 + ALL_PLANTS.length) % ALL_PLANTS.length];
  const nextType = ALL_PLANTS[(index + 1) % ALL_PLANTS.length];
  const clamp = { extrapolate: 'clamp' as const };
  const leftTransform = {
    opacity: enter,
    transform: [
      { translateX: dx.interpolate({ inputRange: [0, SWIPE_OUT], outputRange: [0, SIDE_CENTER_L], ...clamp }) },
      { rotate: dx.interpolate({ inputRange: [0, SWIPE_OUT], outputRange: ['-10deg', '0deg'], ...clamp }) },
      { scale: dx.interpolate({ inputRange: [0, SWIPE_OUT], outputRange: [1, BACK_TO_MAIN], ...clamp }) },
    ],
  };
  const rightTransform = {
    opacity: enter,
    transform: [
      { translateX: dx.interpolate({ inputRange: [-SWIPE_OUT, 0], outputRange: [-SIDE_CENTER_R, 0], ...clamp }) },
      { rotate: dx.interpolate({ inputRange: [-SWIPE_OUT, 0], outputRange: ['0deg', '10deg'], ...clamp }) },
      { scale: dx.interpolate({ inputRange: [-SWIPE_OUT, 0], outputRange: [BACK_TO_MAIN, 1], ...clamp }) },
    ],
  };

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
        {/* 짧은 화면(SE 등)에서는 카드 덱을 통째로 줄여 더 알아보기까지 한 번에 보이게 함 (상세 페이지는 그대로) */}
        <FitToScreen designHeight={DECK_MIN_H}>
        <View style={[styles.stage, { opacity: deckH > 0 ? 1 : 0 }]} onLayout={e => setDeckH(e.nativeEvent.layout.height)}>
          {/* 뒤쪽 카드 2장 */}
          <Animated.View style={[styles.sideCard, styles.sideCardLeft, { top: deckTop + CARD_H / 2 - SIDE_H / 2, zIndex: frontSide === 'left' ? 2 : 1 }, leftTransform]}>
            <View style={styles.sideClip}>
              <View style={styles.sideScaled}><CardFace plantType={prevType} unlocked={grown.includes(prevType)} /></View>
            </View>
          </Animated.View>
          <Animated.View style={[styles.sideCard, styles.sideCardRight, { top: deckTop + CARD_H / 2 - SIDE_H / 2, zIndex: frontSide === 'right' ? 2 : 1 }, rightTransform]}>
            <View style={styles.sideClip}>
              <View style={styles.sideScaled}><CardFace plantType={nextType} unlocked={grown.includes(nextType)} /></View>
            </View>
          </Animated.View>

          {/* 메인 카드 */}
          <Animated.View style={[styles.mainCard, { top: deckTop, zIndex: 3 }, cardTransform]}>
            <CardFace plantType={plantType} unlocked={isUnlocked} />
          </Animated.View>

          {/* 더 알아보기: 누르거나 위로 스와이프하면 상세 페이지가 아래에서 올라옴.
              키운 적 없는 식물은 회색으로 보이고, 누르면 "키우기 시작해야 확인할 수 있어요" 안내 알림이 뜸 */}
          <TouchableOpacity
            style={[styles.moreBtn, { top: deckTop + CARD_H + deckGap }]}
            onPress={() => {
              if (isUnlocked) { animatePage(1); return; }
              // 키운 적 없는 식물: 상세 대신 안내 팝업 (Alert.alert는 웹에서 동작하지 않아 직접 그린 팝업을 사용)
              const name = PLANT_INFO[plantType].name;
              setLockedNotice(`${name}${hasFinalConsonant(name) ? '을' : '를'} 키우기 시작해야 확인할 수 있어요.`);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.arrowBox}>
              {/* 오른쪽 화살표(32x26)를 90° 회전 → 가로 26 × 세로 32 아래 화살표 (Figma 1:267) */}
              <Svg width={ui(32)} height={ui(26)} viewBox="0 0 32 26" style={styles.arrowDown}>
                <Path d={ARROW_D} fill={isUnlocked ? COLORS.pine : LOCKED_GRAY} />
              </Svg>
            </View>
            <Text style={[styles.moreText, !isUnlocked && styles.lockedText]}>더 알아보기</Text>
          </TouchableOpacity>
        </View>
        </FitToScreen>
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

      {/* 키운 적 없는 식물 안내 팝업 */}
      <Modal visible={lockedNotice !== null} transparent animationType="fade" onRequestClose={() => setLockedNotice(null)}>
        <TouchableOpacity style={styles.noticeOverlay} activeOpacity={1} onPress={() => setLockedNotice(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>아직 볼 수 없어요</Text>
            <Text style={styles.noticeDesc}>{lockedNotice}</Text>
            <TouchableOpacity style={styles.noticeBtn} onPress={() => setLockedNotice(null)} activeOpacity={0.8}>
              <Text style={styles.noticeBtnText}>확인</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
    backgroundColor: COLORS.bg,           // 불투명: 카드가 겹쳐도 뒤가 비쳐 보이지 않음
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  // 그림자는 바깥 카드에 두고, 안쪽 내용만 둥근 모서리로 잘라냄
  sideClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9, overflow: 'hidden' },
  // 메인 카드 크기(240×360)로 그린 내용을 뒤 카드 크기(167×250)에 맞게 축소
  sideScaled: {
    position: 'absolute',
    width: CARD_W, height: CARD_H,
    left: (SIDE_W - CARD_W) / 2, top: (SIDE_H - CARD_H) / 2,
    transform: [{ scale: SIDE_W / CARD_W }],
  },
  sideCardLeft:  { left: '50%', marginLeft: ui(-63) - SIDE_W / 2 },
  sideCardRight: { left: '50%', marginLeft: ui(54) - SIDE_W / 2 },

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
    position: 'absolute', top: ui(28), left: 0, right: 0, textAlign: 'center',
    fontFamily: FONTS.bold, fontSize: fs(24), lineHeight: fs(28), color: COLORS.green,
  },
  // 캐릭터 90x150: 카드 기준 top 60
  // 캐릭터 영역 90x150 (카드 기준 left 72, top 75 → 중심 (117, 135))
  cardChar: { position: 'absolute', top: ui(75), left: ui(72), width: ui(90), height: ui(150) },
  // 태그라인 top 446 (카드 기준 231), 폭 170, 요소 간격 15
  // 세부 설명(태그라인·소개) 글자는 줄이지 않는다. 폭 170은 그대로 두고 카드 가운데에 맞춤
  // 안내 팝업 (설정 화면의 '저장하지 않고 나갈까요?' 팝업과 같은 모양)
  noticeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  noticeBox: {
    width: '100%', maxWidth: 320, gap: 8, padding: 20,
    backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 1.5, borderColor: '#303a1e',
  },
  noticeTitle: { fontFamily: FONTS.bold, fontSize: fs(17), lineHeight: fs(24), color: COLORS.outline, textAlign: 'center' },
  noticeDesc: { fontFamily: FONTS.medium, fontSize: fs(14), lineHeight: fs(20), color: COLORS.textSecondary, textAlign: 'center', marginBottom: 8 },
  noticeBtn: { height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: '#303a1e', backgroundColor: COLORS.lime },
  noticeBtnText: { fontFamily: FONTS.bold, fontSize: fs(15), color: COLORS.outline },
  lockedText: { color: LOCKED_GRAY },
  cardTextWrap: { position: 'absolute', top: ui(231), left: (CARD_W - 170) / 2, width: 170, alignItems: 'center', gap: 15 },
  cardTagline: {
    fontFamily: FONTS.bold, fontSize: 16, lineHeight: 20,   // 줄이지 않음
    color: COLORS.green, textAlign: 'center',
  },
  cardIntro: {
    alignSelf: 'stretch',
    fontFamily: FONTS.medium, fontSize: 10, lineHeight: 15,   // 줄이지 않음
    color: '#000', textAlign: 'center',
  },

  // 더 알아보기: 화살표 top 630 (→561), 높이 58 / 텍스트 top 694 (→625)
  moreBtn: { position: 'absolute', top: 561, alignItems: 'center' },
  arrowBox: { width: ui(26), height: ui(32) },
  // 58x26 화살표를 중심 기준 90° 회전 (레이아웃 박스를 26x58에 맞추려 오프셋)
  arrowDown: { position: 'absolute', left: ui(-3), top: ui(3), transform: [{ rotate: '90deg' }] },
  moreText: {
    marginTop: ui(32),             // 화살표 하단 662 → 텍스트 top 694
    fontFamily: FONTS.bold, fontSize: fs(16), lineHeight: fs(20), color: COLORS.pine,
  },
});
