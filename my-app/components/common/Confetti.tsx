import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

// 컨페티(색종이) 폭죽: origin에서 사방(주로 위쪽)으로 터져 나갔다가, 공기 저항으로 느려진 뒤 팔랑거리며 떨어진다.
// react-native-fast-confetti(MIT)의 구성(조각마다 색·크기·속도·회전을 무작위로)을 참고했지만,
// 해당 라이브러리는 Skia가 필요해서 새 네이티브 의존성 없이 React Native 기본 Animated(네이티브 드라이버)로 구현했다.
//
// 조각의 움직임은 물리식으로 미리 계산한 위치(키프레임)를 이어 붙여서 만든다.
//   속도 v(t) = 종단속도 + (처음 속도 - 종단속도) · e^(-k·t)   (k: 공기 저항)  → 처음엔 빠르게 솟구치고 곧 느려져 둥실 떨어진다.

// 노랑 / 분홍 / 하늘색 세 가지만 쓴다. 분홍은 캐릭터 볼터치 색.
const DEFAULT_COLORS = ['#FFD84A', '#F296A2', '#8FD3FF'];

const STEPS = 22;   // 조각 하나의 궤적을 나누는 키프레임 수

interface Piece {
  start: number;       // 터지기 시작하는 시점 (0~1, 전체 재생 시간 기준)
  flight: number;      // 날아가는 시간 비율 (0~1)
  xs: number[];        // 키프레임별 가로 이동 (px, origin 기준)
  ys: number[];        // 키프레임별 세로 이동 (px, 아래가 +)
  w: number;
  h: number;
  color: string;
  shape: 'rect' | 'round' | 'ribbon';
  spin: number;        // 회전 수 (바퀴, 음수 = 반대 방향)
  flutter: number;     // 팔랑거리는 횟수
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makePiece(colors: string[], start: number, power: number, totalSec: number, aim: number): Piece {
  // 발사 각도: aim(-90=위, 90=아래)을 중심으로 넓게 퍼짐 (일부는 옆으로 넓게)
  const angle = (aim + rand(-70, 70)) * Math.PI / 180;
  const speed = rand(380, 900) * power;                 // px/s
  const vx0 = Math.cos(angle) * speed;
  const vy0 = Math.sin(angle) * speed;
  const k = rand(1.8, 3.0);                              // 공기 저항
  const vt = rand(70, 170);                              // 종단속도 (아래로 천천히)
  const swayAmp = rand(10, 34);
  const swayFreq = rand(3, 7);
  const flight = rand(0.72, 0.95) * (1 - start);
  const T = flight * totalSec;                           // 날아가는 시간(초)
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * T;
    const drag = (1 - Math.exp(-k * t)) / k;
    const settle = Math.min(1, t / 0.5);                 // 처음 0.5초 뒤부터 좌우로 흔들림
    xs.push(vx0 * drag + swayAmp * settle * Math.sin(swayFreq * t));
    ys.push(vt * t + (vy0 - vt) * drag);
  }
  const shapeRoll = Math.random();
  const shape = shapeRoll < 0.22 ? 'round' : shapeRoll < 0.5 ? 'ribbon' : 'rect';
  return {
    start, flight, xs, ys,
    w: shape === 'ribbon' ? rand(4, 6) : rand(7, 12),
    h: shape === 'ribbon' ? rand(14, 22) : rand(5, 9),
    color: colors[Math.floor(Math.random() * colors.length)],
    shape,
    spin: rand(1.5, 5) * (Math.random() < 0.5 ? 1 : -1),
    flutter: Math.floor(rand(3, 7)),
  };
}

interface Props {
  /** true가 되는 순간 터진다. 조각은 미리 만들어 두므로(숨김 상태) 터지는 순간 지연이 없다 */
  play: boolean;
  /** 터지는 위치 (이 컴포넌트가 덮는 영역 기준 px) */
  origin: { x: number; y: number };
  /** 첫 번째 폭죽의 조각 수 (두 번째 폭죽은 그 절반) */
  count?: number;
  /** 전체 재생 시간(ms) */
  duration?: number;
  colors?: string[];
  /** 두 번째 폭죽이 터지는 시점 (0~1, 0이면 한 번만) */
  secondBurstAt?: number;
  /** 발사 방향 중심 각도 (기본 -90 = 위로 솟구침, 90 = 아래로 쏟아짐) */
  aim?: number;
  onEnd?: () => void;
}

export default function Confetti({
  play, origin, count = 200, duration = 3800, colors = DEFAULT_COLORS, secondBurstAt = 0.10, aim = -90, onEnd,
}: Props) {
  const [playing, setPlaying] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [t] = useState(() => new Animated.Value(0));
  const totalSec = duration / 1000;
  const pieces = useMemo(() => {
    const first = Array.from({ length: count }, () => makePiece(colors, rand(0, 0.03), 1, totalSec, aim));
    const second = secondBurstAt > 0
      ? Array.from({ length: Math.round(count / 2) }, () => makePiece(colors, secondBurstAt + rand(0, 0.03), 0.8, totalSec, aim))
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
        const times = p.xs.map((_, k) => p.start + (k / STEPS) * p.flight);
        const inputRange = [0, ...times.map((v, k) => (k === 0 ? Math.max(v, 0.0001) : v)), 1];
        const tx = t.interpolate({ inputRange, outputRange: [0, ...p.xs, p.xs[STEPS]], extrapolate: 'clamp' });
        const ty = t.interpolate({ inputRange, outputRange: [0, ...p.ys, p.ys[STEPS]], extrapolate: 'clamp' });
        const end = p.start + p.flight;
        // 터지는 순간 커지며 나타나고, 끝 무렵 사라짐
        const scale = t.interpolate({
          inputRange: [0, p.start, p.start + 0.03, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp',
        });
        const opacity = t.interpolate({
          inputRange: [0, p.start, end - 0.1, end, 1], outputRange: [0, 1, 1, 0, 0], extrapolate: 'clamp',
        });
        const rotate = t.interpolate({
          inputRange: [p.start, end], outputRange: ['0deg', `${p.spin * 360}deg`], extrapolate: 'clamp',
        });
        // 팔랑거리는 느낌: 납작해졌다 펴지는 것을 반복
        const steps = Array.from({ length: p.flutter * 2 + 1 }, (_, k) => p.start + (k / (p.flutter * 2)) * p.flight);
        const flutter = t.interpolate({
          inputRange: steps, outputRange: steps.map((_, k) => (k % 2 === 0 ? 1 : 0.2)), extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: origin.x - p.w / 2,
              top: origin.y - p.h / 2,
              width: p.w,
              height: p.shape === 'round' ? p.w : p.h,
              borderRadius: p.shape === 'round' ? p.w / 2 : 1.5,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate }, { scaleY: flutter }],
            }}
          />
        );
      })}
    </View>
  );
}
