import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

// 컨페티(색종이) 폭죽: origin에서 사방(주로 위쪽)으로 터져 나갔다가, 공기 저항으로 느려진 뒤 팔랑거리며 떨어진다.
// react-native-fast-confetti(MIT)의 구성(조각마다 색·크기·속도·회전을 무작위로)을 참고했지만,
// 해당 라이브러리는 Skia가 필요해서 새 네이티브 의존성 없이 React Native 기본 Animated(네이티브 드라이버)로 구현했다.
//
// 조각의 움직임은 물리식으로 미리 계산한 위치(키프레임)를 이어 붙여서 만든다. 아이콘은 회전·뒤집기 없이 위치만 이동한다(도트가 뭉개지지 않게).
//   속도 v(t) = 종단속도 + (처음 속도 - 종단속도) · e^(-k·t)   (k: 공기 저항)  → 처음엔 빠르게 솟구치고 곧 느려져 둥실 떨어진다.

// 조각은 색종이 대신 앱의 픽셀 아이콘(반짝이)을 미리 색을 입혀 만든 PNG다 (assets/images/ui/confetti).
// 노랑 / 연두(앱의 라임) 두 가지만 쓴다. 같은 모양의 SVG 아이콘(PixelIcons, Icons)은 그대로 남아 있고,
// 이 화면에서는 조각이 수십 개라 가볍게 그려지도록 PNG를 쓴다.
const ICONS = {
  sparkle: [
    require('../../assets/images/ui/confetti/sparkle_yellow.png'),
    require('../../assets/images/ui/confetti/sparkle_lime.png'),
  ],
};
type IconKind = keyof typeof ICONS;
const ICON_ASPECT: Record<IconKind, number> = { sparkle: 89 / 96 };   // 가로 / 세로

const PIECE_SCALE = 0.8;   // 조각 전체 크기 배율 (1 = 기본)
// 픽셀 화면 느낌: 위치를 GRID px 칸에 맞추고, 초당 FPS번만 움직임(그 사이엔 멈춰 있음)
const GRID = 6;     // 위치가 놓이는 칸 크기 (px). 클수록 더 뚝뚝 끊김
const FPS = 4;     // 초당 움직임 횟수. 낮을수록 더 레트로
const snap = (v: number) => Math.round(v / GRID) * GRID;

interface Piece {
  start: number;       // 터지기 시작하는 시점 (0~1, 전체 재생 시간 기준)
  flight: number;      // 날아가는 시간 비율 (0~1)
  xs: number[];        // 키프레임별 가로 이동 (px, origin 기준)
  ys: number[];        // 키프레임별 세로 이동 (px, 아래가 +)
  steps: number;       // 움직임 횟수
  w: number;
  h: number;
  icon: IconKind;
  tone: number;        // 색 (0 노랑 / 1 연두)
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makePiece(start: number, power: number, totalSec: number, aim: number): Piece {
  // 발사 각도: aim(-90=위, 90=아래)을 중심으로 넓게 퍼짐 (일부는 옆으로 넓게)
  const angle = (aim + rand(-70, 70)) * Math.PI / 180;
  const speed = rand(380, 900) * power;                 // px/s
  const vx0 = Math.cos(angle) * speed;
  const vy0 = Math.sin(angle) * speed;
  const k = rand(1.8, 3.0);                              // 공기 저항
  const vt = rand(60, 130);                              // 종단속도 (아래로 천천히)
  const swayAmp = rand(8, 26);                           // 좌우 흔들림 폭 (px)
  const swayFreq = rand(1.6, 3.6);                       // 좌우 흔들림 빠르기 (rad/s). 낮출수록 부드럽게 흔들림
  const flight = rand(0.72, 0.95) * (1 - start);
  const T = flight * totalSec;                           // 날아가는 시간(초)
  const xs: number[] = [];
  const ys: number[] = [];
  const steps = Math.max(2, Math.round(T * FPS));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * T;
    const drag = (1 - Math.exp(-k * t)) / k;
    const u = Math.min(1, t / 1.0);
    const settle = u * u * (3 - 2 * u);                   // 처음 1초에 걸쳐 서서히 좌우로 흔들리기 시작 (갑자기 꺾이지 않게)
    xs.push(snap(vx0 * drag + swayAmp * settle * Math.sin(swayFreq * t)));
    ys.push(snap(vt * t + (vy0 - vt) * drag));
  }
  const icon: IconKind = 'sparkle';
  const h = rand(13, 22) * PIECE_SCALE;   // 조각 크기(높이) 13~22px × 배율
  return {
    start, flight, xs, ys, steps,
    w: h * ICON_ASPECT[icon],
    h,
    icon,
    tone: Math.floor(Math.random() * 2),
  };
}

interface Props {
  /** true가 되는 순간 터진다. 조각은 미리 만들어 두므로(숨김 상태) 터지는 순간 지연이 없다 */
  play: boolean;
  /** 터지는 위치 (이 컴포넌트가 덮는 영역 기준 px) */
  origin: { x: number; y: number };
  /** 첫 번째 폭죽의 조각 수 (두 번째 폭죽은 그 절반). 아이콘 조각이라 색종이보다 적게 써도 충분함 */
  count?: number;
  /** 전체 재생 시간(ms) */
  duration?: number;
  /** 두 번째 폭죽이 터지는 시점 (0~1, 0이면 한 번만) */
  secondBurstAt?: number;
  /** 발사 방향 중심 각도 (기본 -90 = 위로 솟구침, 90 = 아래로 쏟아짐) */
  aim?: number;
  onEnd?: () => void;
}

export default function Confetti({
  play, origin, count = 90, duration = 3800, secondBurstAt = 0.10, aim = -90, onEnd,
}: Props) {
  const [playing, setPlaying] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [t] = useState(() => new Animated.Value(0));
  const totalSec = duration / 1000;
  const pieces = useMemo(() => {
    const first = Array.from({ length: count }, () => makePiece(rand(0, 0.03), 1, totalSec, aim));
    const second = secondBurstAt > 0
      ? Array.from({ length: Math.round(count / 2) }, () => makePiece(secondBurstAt + rand(0, 0.03), 0.8, totalSec, aim))
      : [];
    return [...first, ...second];
  }, [count, totalSec, secondBurstAt, aim]);   // eslint-disable-line react-hooks/exhaustive-deps

  // 움직임 줄이기 설정은 미리 확인해 둔다 (터지는 순간에 비동기로 기다리지 않도록)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (!play) return;
    if (reduceMotion) { onEnd?.(); return; }   // 움직임 줄이기 설정이면 효과 생략 (아래에서 그리지도 않음)
    const anim = Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true });
    anim.start(({ finished }) => { if (finished) { setPlaying(false); onEnd?.(); } });
    return () => anim.stop();
  }, [play]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!playing || reduceMotion) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        // 계단식: 각 칸의 값을 다음 칸 직전까지 유지했다가 한 번에 옮김
        const n = p.steps;
        const EPS = 0.0001;
        const at = (k: number) => p.start + (k / n) * p.flight;
        const inputRange: number[] = [0];
        const xr: number[] = [0];
        const yr: number[] = [0];
        for (let k = 0; k <= n; k++) {
          inputRange.push(k === 0 ? Math.max(at(0), EPS) : at(k));
          xr.push(p.xs[k]); yr.push(p.ys[k]);
          if (k < n) { inputRange.push(at(k + 1) - EPS); xr.push(p.xs[k]); yr.push(p.ys[k]); }
        }
        inputRange.push(1); xr.push(p.xs[n]); yr.push(p.ys[n]);
        const tx = t.interpolate({ inputRange, outputRange: xr, extrapolate: 'clamp' });
        const ty = t.interpolate({ inputRange, outputRange: yr, extrapolate: 'clamp' });
        const end = p.start + p.flight;
        // 터지는 순간 커지며 나타나고, 끝 무렵 사라짐
        const scale = t.interpolate({
          inputRange: [0, p.start, p.start + 0.03, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp',
        });
        const opacity = t.interpolate({
          inputRange: [0, p.start, end - 0.1, end, 1], outputRange: [0, 1, 1, 0, 0], extrapolate: 'clamp',
        });
        return (
          <Animated.Image
            key={i}
            source={ICONS[p.icon][p.tone]}
            resizeMode="contain"
            style={{
              position: 'absolute',
              left: Math.round(origin.x - p.w / 2),
              top: Math.round(origin.y - p.h / 2),
              width: p.w,
              height: p.h,
              opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale }],
            }}
          />
        );
      })}
    </View>
  );
}
