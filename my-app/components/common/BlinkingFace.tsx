import React, { useSyncExternalStore } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import { PlantType, Expression, EyeState, FaceSet, getFaceSet } from '../../constants/character';

// ─── 공용 깜빡임 타이머 ─────────────────────────────────────────────
// 깜빡임이 켜진 얼굴(animated)은 타이머 하나를 공유한다. 간격·속도·모양을 매번 무작위로 바꿔 기계적으로 보이지 않게 한다.
//   - 눈 뜸 유지: 1.5~7초 (가끔 더 짧게)
//   - 깜빡임 종류: 보통(약 80%) / 연속 두 번(약 20%)
//   - 각 단계 길이도 매번 조금씩 다름
let eye: EyeState = 'open';
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function setEye(next: EyeState) {
  eye = next;
  listeners.forEach(l => l());
}

function nextGap() {
  return Math.random() < 0.15 ? rand(500, 1500) : rand(1500, 7000);
}

function runBlink(kind: 'single' | 'double' = 'single') {
  const steps: [EyeState, number][] =
    [['half', rand(50, 100)], ['closed', rand(70, 150)], ['half', rand(50, 100)], ['open', 0]];
  let i = 0;
  const step = () => {
    const [state, hold] = steps[i++];
    setEye(state);
    if (i < steps.length) {
      timer = setTimeout(step, hold);
    } else if (kind === 'double') {
      timer = setTimeout(() => runBlink('single'), rand(120, 260));
    } else {
      const r = Math.random();
      timer = setTimeout(() => runBlink(r < 0.2 ? 'double' : 'single'), nextGap());
    }
  };
  step();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) timer = setTimeout(() => runBlink(), rand(1000, 3000));
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) { clearTimeout(timer); timer = null; setEye('open'); }
  };
}

/** 현재 눈 상태 (open → half → closed → half → open 을 계속 반복) */
export function useBlinkEye(): EyeState {
  return useSyncExternalStore(subscribe, () => eye, () => 'open' as EyeState);
}

const EYES: EyeState[] = ['open', 'half', 'closed'];

// ─── 눈물 애니메이션 타이머 ──────────────────────────────────────────
// 눈물·놀람 3프레임(1 → 2 → 3)을 반복 재생한다. 눈물 얼굴이 화면에 있을 때만 돈다 (구독자가 있을 때만 타이머 작동).
const TEAR_HOLD = [260, 260, 420];   // 프레임별 유지 시간(ms): 맺힘 → 흐름 → 길게 떨어짐
let tearFrame = 0;
const tearListeners = new Set<() => void>();
let tearTimer: ReturnType<typeof setTimeout> | null = null;

function tickTear() {
  tearTimer = setTimeout(() => {
    tearFrame = (tearFrame + 1) % 3;
    tearListeners.forEach(l => l());
    tickTear();
  }, TEAR_HOLD[tearFrame]);
}

function subscribeTear(listener: () => void) {
  tearListeners.add(listener);
  if (!tearTimer) tickTear();
  return () => {
    tearListeners.delete(listener);
    if (tearListeners.size === 0 && tearTimer) { clearTimeout(tearTimer); tearTimer = null; tearFrame = 0; }
  };
}

function useTearFrame(): number {
  return useSyncExternalStore(subscribeTear, () => tearFrame, () => 0);
}

function AnimatedLayers({ sources, tears, style }: {
  sources: Record<EyeState, any>;
  tears?: any[];
  style?: StyleProp<ImageStyle>;
}) {
  const current = useBlinkEye();
  return (
    <>
      {EYES.map(k => (
        <Image key={k} source={sources[k]} style={[style, { opacity: current === k ? 1 : 0 }]} resizeMode="contain" />
      ))}
      {tears && <AnimatedTears tears={tears} style={style} />}
    </>
  );
}

function AnimatedTears({ tears, style }: { tears: any[]; style?: StyleProp<ImageStyle> }) {
  const frame = useTearFrame();
  return (
    <>
      {tears.map((src, i) => (
        <Image key={i} source={src} style={[style, { opacity: frame === i ? 1 : 0 }]} resizeMode="contain" />
      ))}
    </>
  );
}

/**
 * 같은 크기·위치에 여러 장을 겹쳐 두고 투명도만 바꿔서 이미지 로딩 깜빡임 없이 전환한다.
 * animated=false(기본)면 눈 뜬 이미지 한 장(+눈물이면 중간 프레임 한 장)만 그린다 (타이머·리렌더 없음). 홈 화면에서만 animated를 켠다.
 * sources: 눈 상태별 이미지, tears: 눈물 3프레임(눈물 얼굴일 때만)
 */
export function BlinkingLayers({ sources, tears, staticFrame = 1, style, animated = false }: {
  sources: Record<EyeState, any>;
  tears?: any[];
  staticFrame?: number;
  style?: StyleProp<ImageStyle>;
  animated?: boolean;
}) {
  if (!animated) {
    return (
      <>
        <Image source={sources.open} style={style} resizeMode="contain" />
        {tears && <Image source={tears[staticFrame]} style={style} resizeMode="contain" />}
      </>
    );
  }
  return <AnimatedLayers sources={sources} tears={tears} style={style} />;
}

/** 얼굴 세트(FaceSet)를 레이어용으로 그린다 (PlantCharacter에서 사용) */
export function FaceLayers({ face, style, animated = false }: {
  face: FaceSet; style?: StyleProp<ImageStyle>; animated?: boolean;
}) {
  return <BlinkingLayers sources={face.layers} tears={face.tears?.layers} staticFrame={face.staticFrame} style={style} animated={animated} />;
}

/** AI로 만든 사진 캐릭터 위에 얹는 얼굴. style로 크기·위치를 지정한다. animated=true면 깜빡임·눈물 애니메이션. */
export default function FaceOverlay({ plantType, expression, style, animated = false }: {
  plantType: PlantType;
  expression?: Expression;
  style?: StyleProp<ImageStyle>;
  animated?: boolean;
}) {
  const face = getFaceSet(plantType, expression);
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <BlinkingLayers sources={face.overlays} tears={face.tears?.overlays} staticFrame={face.staticFrame} style={style} animated={animated} />
    </View>
  );
}
