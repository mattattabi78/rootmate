import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, fs, ui } from '../constants';
import { storage } from '../store/storage';
import TopAppBar from '../components/common/TopAppBar';
import FitToScreen from '../components/common/FitToScreen';
import BottomNavBar from '../components/common/BottomNavBar';
import { LockPixelIcon } from '../components/common/PixelIcons';
import PlantCharacter, { CHARACTER_RATIO } from '../components/common/PlantCharacter';
import FaceOverlay from '../components/common/BlinkingFace';
import { usePlantExpression } from '../hooks/usePlantExpression';
import PlantDetailView from '../components/plant/PlantDetailView';
import Wallpaper, { WALLPAPER_COLOR } from '../components/common/Wallpaper';
import { PLANT_INFO } from '../constants/plants';
import { PlantType, GrowthStage, Expression, getMaxStage } from '../constants/character';

const ALL_PLANTS: PlantType[] = ['basil', 'tomato', 'marigold'];

// 키운 적 없는 식물 카드: 회색 테마 + 씨앗 단계 캐릭터(투명도 없음), 글자는 하단 탭바의 비활성 아이콘과 같은 회색으로 보여준다.
const LOCKED_GRAY = COLORS.tabInactive;
const CANVAS_W = 846;               // 캐릭터 레이어 캔버스 폭 (높이 1254)

// Figma 덱 수치 (402x874 프레임)
// Figma 덱 수치 (402x874 프레임, 본문은 y=69부터)
// 카드 크기는 작은 화면에서 글자와 같은 비율(ui)로 줄임 (큰 화면에서는 ui(n) = n)
const CHAR_W = 120;   // 카드 앞면 아치 속 캐릭터 영역 폭 (높이는 폭 × 5/3)
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

// ─── 카드 한 장 (앞면 / 뒷면) ───────────────────────────────────────
// 카드 크기 CARD_W×CARD_H 기준 좌표. 키운 적 있는 식물은 모두 초록 테마(파스텔 연두 배경 + 진한 초록 포인트색), 키운 적 없는 식물은 회색 테마.
const GREEN_THEME = { bg: '#D6F2A0', accent: '#286905', soft: '#EEF9D5' };
const LOCKED_THEME = { bg: '#E6E6E6', accent: LOCKED_GRAY, soft: '#F5F5F5' };
// 아치 창 안에서 캐릭터를 놓는 기준점: 846×1254 캐릭터 캔버스 위의 좌표가 아치 창 가운데에 오게 한다.
// 식물마다 가운데를 따로 재면 화분 높이가 카드마다 달라 보이므로(예: 토마토가 위로 뜸), 화분이 모든 카드에서 같은 높이에 오도록
// 식물 3종의 이미지를 합친 영역(grown = 마지막 단계, seed = 1단계)의 가운데를 공통으로 쓴다.
// 이미지(characters/{식물}/{식물}_N.png + pot_layer.png)의 불투명 영역 bbox에서 구한 값이라, 이미지를 바꾸면 여기도 갱신한다.
const CONTENT_CENTER: Record<'grown' | 'seed', { x: number; y: number }> = {
  grown: { x: 430.5, y: 612.5 },   // 합친 영역: y 0 ~ 1225 (토마토가 가장 키가 큼)
  seed:  { x: 430.5, y: 776 },     // 합친 영역: y 327 ~ 1225
};
// 지금 키우는 식물의 현재 모습(홈 화면과 같은 캐릭터·표정)
export interface LiveLook {
  expression: Expression;
  generated: { uri: string; facePos: { x: number; y: number } } | null;   // 사진으로 만든 캐릭터
}
const ARCH_W = ui(192);
const ARCH_H = ui(248);   // 아래 이름표 윗면(360-22-44)과 12 떨어지게
const BOX_W = CARD_W - ui(32);   // 뒷면 본문 상자
const BOX_H = CARD_H - ui(122);

// 배경 물방울 무늬 (연하게)
function Dots({ color }: { color: string }) {
  const dots = [];
  const step = ui(20);
  for (let y = 0, r = 0; y < CARD_H + step; y += step, r++) {
    for (let x = (r % 2) * (step / 2); x < CARD_W + step; x += step) {
      dots.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={ui(2.2)} fill={color} />);
    }
  }
  return <Svg width={CARD_W} height={CARD_H} style={StyleSheet.absoluteFill} pointerEvents="none">{dots}</Svg>;
}

// 가장자리가 볼록볼록한 상자 배경 (참고 카드의 본문 상자)
function ScallopBox({ w, h, fill }: { w: number; h: number; fill: string }) {
  const b = ui(6);
  const nx = Math.max(2, Math.round((w - 2 * b) / (2 * b)));
  const ny = Math.max(2, Math.round((h - 2 * b) / (2 * b)));
  const sx = (w - 2 * b) / nx;
  const sy = (h - 2 * b) / ny;
  const bumps = [];
  for (let i = 0; i < nx; i++) {
    const cx = b + sx * (i + 0.5);
    bumps.push(<Circle key={`t${i}`} cx={cx} cy={b} r={sx / 2} fill={fill} />);
    bumps.push(<Circle key={`b${i}`} cx={cx} cy={h - b} r={sx / 2} fill={fill} />);
  }
  for (let j = 0; j < ny; j++) {
    const cy = b + sy * (j + 0.5);
    bumps.push(<Circle key={`l${j}`} cx={b} cy={cy} r={sy / 2} fill={fill} />);
    bumps.push(<Circle key={`r${j}`} cx={w - b} cy={cy} r={sy / 2} fill={fill} />);
  }
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={b} y={b} width={w - 2 * b} height={h - 2 * b} fill={fill} />
      {bumps}
    </Svg>
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// ISO 날짜 → 2026.11.03
function formatSince(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

// 앞면: No. → 아치 창 속 캐릭터 → 아래 이름표
//   키운 적 없음: 씨앗 단계(1단계) / 키운 적 있음: 다 자란 모습 / 지금 키우는 식물(live): 홈 화면과 같은 현재 모습
function CardFront({ plantType, unlocked, live }: { plantType: PlantType; unlocked: boolean; live?: LiveLook }) {
  const info = PLANT_INFO[plantType];
  const th = unlocked ? GREEN_THEME : LOCKED_THEME;
  const k = ui(CHAR_W) / CANVAS_W;   // 캐릭터 캔버스(846 폭) → 카드 속 크기 배율
  const showGenerated = !!live?.generated;
  const seed = !unlocked || !!live;   // 씨앗 단계 기본 캐릭터를 쓰는 경우
  const center = CONTENT_CENTER[seed ? 'seed' : 'grown'];
  const GEN = ui(CHAR_W) * 1.4;       // 사진 캐릭터(정사각형) 크기
  return (
    <View style={[styles.faceFill, { backgroundColor: th.bg }]}>
      <Dots color={th.soft} />
      <Text style={[styles.cardNo, { color: th.accent }]}>No.{pad2(ALL_PLANTS.indexOf(plantType) + 1)}</Text>
      <View style={[styles.arch, { backgroundColor: th.soft, borderColor: th.accent }]} pointerEvents="none">
        {showGenerated ? (
          // 사진으로 만든 캐릭터 + 화분 위 얼굴 (홈 화면과 같은 구성)
          <View style={{ position: 'absolute', width: GEN, height: GEN, left: (ARCH_W - 4 - GEN) / 2, top: (ARCH_H - 4 - GEN) / 2 }}>
            <Image source={{ uri: live!.generated!.uri }} style={{ width: GEN, height: GEN }} resizeMode="contain" />
            <FaceOverlay
              plantType={plantType}
              expression={live!.expression}
              style={{
                position: 'absolute', width: GEN / 2, height: GEN / 2,
                left: (live!.generated!.facePos.x / 100) * GEN - GEN / 4,
                top: (live!.generated!.facePos.y / 100) * GEN - GEN / 4,
              }}
            />
          </View>
        ) : (
          /* 캐릭터는 식물마다 키가 달라서 시작점을 정하지 않고, 이미지 내용(화분+식물)의 가운데가 아치 창 가운데에 오게 놓는다 */
          <View style={{ position: 'absolute', width: ui(CHAR_W), height: ui(CHAR_W) * CHARACTER_RATIO, left: (ARCH_W - 4) / 2 - center.x * k, top: (ARCH_H - 4) / 2 - center.y * k }}>
            <PlantCharacter
              plantType={plantType}
              stage={(seed ? 1 : getMaxStage(plantType)) as GrowthStage}
              expression={live?.expression ?? 'default'}
              width={ui(CHAR_W)}
            />
          </View>
        )}
      </View>
      <View style={[styles.banner, { backgroundColor: th.accent }]}>
        <Text style={styles.bannerText}>{info.name}</Text>
        {!unlocked && <LockPixelIcon color="#FFFFFF" size={16} />}
      </View>
    </View>
  );
}

// 뒷면: No. → 이름·태그라인 → 볼록볼록한 본문 상자(상세 설명, 재배 기간, 키우기 시작한 날). 모두 가운데 정렬
function CardBack({ plantType, unlocked, since }: { plantType: PlantType; unlocked: boolean; since?: string }) {
  const info = PLANT_INFO[plantType];
  const th = unlocked ? GREEN_THEME : LOCKED_THEME;
  const textColor = th.accent;   // 본문 글자색도 테마색 (초록 / 회색)
  const labelColor = unlocked ? COLORS.tabInactive : LOCKED_GRAY;
  return (
    <View style={[styles.faceFill, { backgroundColor: th.bg }]}>
      <Dots color={th.soft} />
      <Text style={[styles.cardNo, { color: th.accent }]}>No.{pad2(ALL_PLANTS.indexOf(plantType) + 1)}</Text>
      <View style={styles.backHead}>
        <Text style={[styles.backName, { color: th.accent }]}>{info.name}</Text>
        <Text style={[styles.backTagline, { color: th.accent }]}>{info.tagline}</Text>
      </View>
      <View style={styles.backBox}>
        <ScallopBox w={BOX_W} h={BOX_H} fill="#FFFFFF" />
        <View style={styles.backBoxInner}>
          <Text style={[styles.backIntro, { color: textColor }]}>{info.cardIntro ?? info.intro}</Text>
          <View style={styles.backInfo}>
            <Text style={[styles.backInfoLine, { color: labelColor }]}>
              재배 기간  <Text style={[styles.backInfoValue, { color: th.accent }]}>{info.totalPeriod}</Text>
            </Text>
            {unlocked && !!since && (
              <Text style={[styles.backInfoLine, { color: labelColor }]}>
                키우기 시작한 날  <Text style={[styles.backInfoValue, { color: th.accent }]}>{formatSince(since)}</Text>
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────
export default function CollectionScreen() {
  const [index, setIndex] = useState(0);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);   // 키운 적 없는 식물의 더 알아보기를 눌렀을 때 안내 문구
  const [frontSide, setFrontSide] = useState<'left' | 'right'>('right');   // 뒤 카드 두 장 중 더 앞에 그릴 쪽 (평소엔 오른쪽이 위)
  const [deckH, setDeckH] = useState(0);   // 카드 덱 영역 높이 (카드 묶음을 세로 가운데에 두는 데 사용, 측정 전에는 숨김)
  const [grown, setGrown] = useState<string[]>([]);   // 키운 적 있는 식물 id
  const [since, setSince] = useState<Record<string, string>>({});   // 식물별 키우기 시작한 날(ISO)
  const [currentPlant, setCurrentPlant] = useState<PlantType>('basil');   // 지금 키우는 식물
  const [generated, setGenerated] = useState<LiveLook['generated']>(null);   // 지금 키우는 식물의 사진 캐릭터
  const { expression: liveExpr, refresh: refreshLiveExpr } = usePlantExpression(currentPlant);

  // 스와이프 애니메이션 값: dx = 손가락 이동량(뒤 카드가 중앙으로 올라오는 정도도 이 값에서 계산), enter = 넘긴 직후 뒤 카드가 다시 나타나는 정도(0→1)
  const [dx] = useState(() => new Animated.Value(0));
  const [enter] = useState(() => new Animated.Value(1));
  const swapPending = useRef(false);   // 넘김 애니메이션이 끝나 index를 바꾼 직후인지 (아래 effect에서 처리)
  // 세로 페이저: page 0 = 카드 덱, 1 = 상세 (진행도 0~1)
  const [page] = useState(() => new Animated.Value(0));
  const [bodyH, setBodyH] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailScrollY = useRef(0);
  const [flip] = useState(() => new Animated.Value(0));   // 0 = 앞면, 1 = 뒷면
  const flipped = useRef(false);
  const toggleFlip = () => {
    flipped.current = !flipped.current;
    Animated.timing(flip, { toValue: flipped.current ? 1 : 0, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  };

  const clampIndex = (n: number) => Math.max(0, Math.min(ALL_PLANTS.length - 1, n));

  // 처음 열 때 내가 키우는 식물 카드부터 보여 줌
  useFocusEffect(useCallback(() => {
    storage.getPlantData().then(plantData => {
      if (plantData?.id) {
        setIndex(clampIndex(ALL_PLANTS.indexOf(plantData.id as PlantType)));
        setCurrentPlant(plantData.id as PlantType);
      }
    });
    storage.getGeneratedPlant().then(g => setGenerated(g ? { uri: g.uri, facePos: g.facePos } : null));
    refreshLiveExpr();
    storage.getGrownPlants().then(setGrown);
    storage.getGrownSince().then(setSince);
  }, []));   // eslint-disable-line react-hooks/exhaustive-deps

  const plantType = ALL_PLANTS[index];
  // 지금 키우는 식물 카드만 현재 모습(홈 화면과 같은 캐릭터·표정)으로 보여 줌
  const liveFor = (t: PlantType): LiveLook | undefined => (t === currentPlant ? { expression: liveExpr, generated } : undefined);
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
  // 다른 카드로 넘어가면 항상 앞면부터
  useEffect(() => {
    flipped.current = false;
    flip.stopAnimation();
    flip.setValue(0);
  }, [index]);   // eslint-disable-line react-hooks/exhaustive-deps

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
              <View style={styles.sideScaled}><CardFront plantType={prevType} unlocked={grown.includes(prevType)} live={liveFor(prevType)} /></View>
            </View>
          </Animated.View>
          <Animated.View style={[styles.sideCard, styles.sideCardRight, { top: deckTop + CARD_H / 2 - SIDE_H / 2, zIndex: frontSide === 'right' ? 2 : 1 }, rightTransform]}>
            <View style={styles.sideClip}>
              <View style={styles.sideScaled}><CardFront plantType={nextType} unlocked={grown.includes(nextType)} live={liveFor(nextType)} /></View>
            </View>
          </Animated.View>

          {/* 메인 카드 */}
          {/* 탭할 때마다 앞뒤가 뒤집힘 (좌우 드래그는 카드 넘기기) */}
          <Animated.View style={[styles.mainCard, { top: deckTop, zIndex: 3 }, cardTransform]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={toggleFlip}>
              <Animated.View style={[styles.faceOuter, { transform: [{ perspective: 1200 }, { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]}>
                <View style={styles.faceInner}><CardFront plantType={plantType} unlocked={isUnlocked} live={liveFor(plantType)} /></View>
              </Animated.View>
              <Animated.View style={[styles.faceOuter, { transform: [{ perspective: 1200 }, { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }] }]}>
                <View style={styles.faceInner}><CardBack plantType={plantType} unlocked={isUnlocked} since={since[plantType]} /></View>
              </Animated.View>
            </Pressable>
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
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg,           // 불투명: 카드가 겹쳐도 뒤가 비쳐 보이지 않음
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  // 그림자는 바깥 카드에 두고, 안쪽 내용만 둥근 모서리로 잘라냄
  sideClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18.5, overflow: 'hidden' },
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
  mainCard: { position: 'absolute', top: 146, width: CARD_W, height: CARD_H },
  // 앞·뒷면: 겹쳐 두고 뒷면(backface)은 숨김. 그림자는 바깥, 둥근 모서리 잘라내기는 안쪽에서
  faceOuter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, backgroundColor: COLORS.bg,
    backfaceVisibility: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  faceInner: { flex: 1, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.line, overflow: 'hidden' },
  faceFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
  // 앞면
  cardNo: { position: 'absolute', top: ui(14), left: ui(20), fontFamily: FONTS.bold, fontSize: 11, lineHeight: 15 },
  arch: {
    position: 'absolute', top: ui(34), left: (CARD_W - ARCH_W) / 2, width: ARCH_W, height: ARCH_H,
    borderTopLeftRadius: ARCH_W / 2, borderTopRightRadius: ARCH_W / 2, borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    borderWidth: 2, overflow: 'hidden',
  },
  banner: {
    position: 'absolute', bottom: ui(22), left: ui(30), right: ui(30), height: ui(44), borderRadius: 22,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  bannerText: { fontFamily: FONTS.bold, fontSize: fs(18), lineHeight: fs(24), color: '#FFFFFF' },
  // 뒷면 (모두 가운데 정렬)
  backHead: { position: 'absolute', top: ui(34), left: ui(20), right: ui(20), alignItems: 'center', gap: 2 },
  backName: { fontFamily: FONTS.bold, fontSize: fs(22), lineHeight: fs(28), textAlign: 'center' },
  backTagline: { fontFamily: FONTS.bold, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  backBox: { position: 'absolute', top: ui(100), left: ui(16), width: BOX_W, height: BOX_H },
  backBoxInner: { flex: 1, paddingHorizontal: ui(26), paddingVertical: ui(22), alignItems: 'center', justifyContent: 'center', gap: ui(16) },
  backIntro: { fontFamily: FONTS.medium, fontSize: 11, lineHeight: 18, textAlign: 'center' },
  backInfo: { alignItems: 'center', gap: 4 },
  backInfoLine: { fontFamily: FONTS.medium, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  backInfoValue: { fontFamily: FONTS.bold, fontSize: 11 },

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
