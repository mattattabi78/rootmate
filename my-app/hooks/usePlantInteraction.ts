import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder } from 'react-native';
import { DROP_FRAMES, Expression, EyeState, FX_IMAGES, PlantType, Z_FRAMES } from '../constants/character';
import { haptics } from '../utils/haptics';

// ─── 홈 화면 캐릭터 터치 반응 ───────────────────────────────────────
//   톡(탭)            : 윙크 + 하트가 떠오름
//   연타 3~4번(1.5초) : 놀람 (바질만 놀람 얼굴이 있어서 다른 식물은 깜짝 깜빡임)
//   연타 5번 이상     : 간지러운 듯 웃는 눈 + 음표
//   문지르기(좌우)    : 웃는 눈 + 음표가 계속 올라옴 (손을 떼면 끝)
//   길게 누르기       : 웃는 눈으로 가만히 있다가 손을 떼면 윙크 + 하트
//   빈 화면 두 번 탭  : 오늘 물주기를 끝냈을 때만 물방울이 떨어짐 (task 기록과는 무관, 화면 효과만)
//   울고 있을 때(눈물·오열): 탭하면 무표정으로 5초간 있다가 다시 우는 모습으로 돌아감. 하트·음표 같은 효과와 문지르기·길게 누르기 반응은 없음
//   자는 중(밤 12시~새벽 6시): 감은 눈 + Z가 계속 올라감. 터치 반응은 위와 똑같이 동작하고, 끝나면 다시 자는 모습으로 돌아감
// 반응이 재생되는 동안은 새 반응을 시작하지 않는다(쿨다운). 연타·문지르기는 진행 중인 반응을 이어받는다.

type FxKind = 'heart' | 'note' | 'drop';
interface Fx { kind: FxKind; frame: number }
interface Step { expr?: Expression; eye?: EyeState; fx?: Fx; ms: number }
interface View { expression: Expression | null; eye: EyeState | null; fx: Fx | null }

const IDLE: View = { expression: null, eye: null, fx: null };
const FAR = 60 * 60 * 1000;

const heart = (frame: number): Fx => ({ kind: 'heart', frame });
const note = (frame: number): Fx => ({ kind: 'note', frame });
const drop = (frame: number): Fx => ({ kind: 'drop', frame });

const winkSteps = (): Step[] => [
  { expr: 'wink', eye: 'open',   ms: 120 },
  { expr: 'wink', eye: 'half',   ms: 90 },
  { expr: 'wink', eye: 'closed', fx: heart(0), ms: 230 },
  { expr: 'wink', eye: 'closed', fx: heart(1), ms: 230 },
  { expr: 'wink', eye: 'half',   fx: heart(2), ms: 230 },
  { expr: 'wink', eye: 'open',   ms: 130 },
];
const surpriseSteps = (hasSurpriseFace: boolean): Step[] => hasSurpriseFace
  ? [{ expr: 'surprise', ms: 1100 }]
  : [{ eye: 'half', ms: 70 }, { eye: 'closed', ms: 90 }, { eye: 'half', ms: 70 }, { eye: 'open', ms: 90 },
     { eye: 'half', ms: 70 }, { eye: 'closed', ms: 90 }, { eye: 'half', ms: 70 }, { eye: 'open', ms: 80 }];
// 음표는 1→2→3프레임 다음 빈 화면(-1)을 한 번 거친 뒤 다시 처음 프레임으로 돌아간다
const NOTE_CYCLE = [0, 1, 2, -1];
// 자는 Z도 같은 방식: 1→2→3프레임 다음 빈 화면
const Z_CYCLE = [0, 1, 2, -1];
const ticklishSteps = (): Step[] => [...NOTE_CYCLE, ...NOTE_CYCLE].map(frame => ({ expr: 'happy' as Expression, fx: frame >= 0 ? note(frame) : undefined, ms: 250 }));
// 우는 중에 탭: 무표정으로 5초 있다가 다시 우는 모습으로 돌아감 (하트·음표 같은 효과 없음)
const comfortSteps = (): Step[] => [{ expr: 'neutral', eye: 'half', ms: 150 }, { expr: 'neutral', ms: 4850 }];
// 우는 중에는 표정은 그대로 두고 물방울만
const dropSteps = (crying: boolean): Step[] => [
  { fx: drop(0), ms: 320 },
  { expr: crying ? undefined : 'happy', fx: drop(1), ms: 300 },
  { expr: crying ? undefined : 'happy', fx: drop(2), ms: 520 },
];

interface Options {
  plantType: PlantType;
  /** 지금 상황에 따른 기본 표정 (울고 있는지 판단용) */
  baseline: Expression;
  /** 오늘 물주기를 끝냈는지 (빈 화면 두 번 탭 물방울 조건) */
  waterDone: boolean;
}

export function usePlantInteraction({ plantType, baseline, waterDone }: Options) {
  const [view, setView] = useState<View>(IDLE);
  // 자는 중에 아무 반응도 없을 때 Z가 올라오는 프레임 (-1 = 비어 있음)
  const [zFrame, setZFrame] = useState(-1);

  // 핸들러(PanResponder는 한 번만 만들어짐)가 항상 최신 값을 쓰도록 보관
  const latest = useRef({ plantType, baseline, waterDone });
  useEffect(() => { latest.current = { plantType, baseline, waterDone }; });

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const token = useRef(0);
  const busyUntil = useRef(0);
  const busyKind = useRef<string>('');
  const taps = useRef<number[]>([]);
  const lastBgTap = useRef(0);

  const isCrying = () => latest.current.baseline === 'tear' || latest.current.baseline === 'cry';
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // 단계(Step)를 차례대로 재생하고, 끝나면 원래 모습으로 돌아간다
  const play = (steps: Step[], kind: string) => {
    clearTimers();
    const id = ++token.current;
    let t = 0;
    steps.forEach(st => {
      const at = t;
      timers.current.push(setTimeout(() => {
        if (token.current === id) setView({ expression: st.expr ?? null, eye: st.eye ?? null, fx: st.fx ?? null });
      }, at));
      t += st.ms;
    });
    timers.current.push(setTimeout(() => {
      if (token.current === id) { setView(IDLE); busyKind.current = ''; }
    }, t));
    busyUntil.current = Date.now() + t;
    busyKind.current = kind;
  };

  // 문지르기: 손을 대고 있는 동안 음표 프레임을 계속 돌린다
  const rubTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rubIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rubbing = useRef(false);
  const stopRub = () => {
    if (rubTimer.current) { clearInterval(rubTimer.current); rubTimer.current = null; }
    if (rubIdle.current) { clearTimeout(rubIdle.current); rubIdle.current = null; }
    if (rubbing.current) {
      rubbing.current = false;
      play([{ expr: 'happy', ms: 350 }], 'rub-end');
    }
  };
  const startRub = () => {
    if (rubbing.current) return;
    rubbing.current = true;
    clearTimers();
    token.current++;
    busyUntil.current = Date.now() + FAR;
    busyKind.current = 'rub';
    haptics.light();
    let step = 0;
    setView({ expression: 'happy', eye: null, fx: note(NOTE_CYCLE[0]) });
    rubTimer.current = setInterval(() => {
      step = (step + 1) % NOTE_CYCLE.length;
      const frame = NOTE_CYCLE[step];
      setView({ expression: 'happy', eye: null, fx: frame >= 0 ? note(frame) : null });
      if (step === 0) haptics.light();
    }, 300);
  };
  const touchRub = () => {   // 움직임이 있을 때마다 '아직 문지르는 중'으로 갱신, 600ms 멈추면 종료
    if (rubIdle.current) clearTimeout(rubIdle.current);
    rubIdle.current = setTimeout(stopRub, 600);
  };

  const handleTap = () => {
    const now = Date.now();
    const { plantType: plant, baseline: base } = latest.current;
    taps.current = taps.current.filter(t => now - t < 1500);
    taps.current.push(now);
    const n = taps.current.length;
    const busy = now < busyUntil.current;
    const crying = base === 'tear' || base === 'cry';

    if (crying) {                       // 우는 중: 무표정으로 5초 (이 동안 새 반응 없음)
      if (busy) return;
      haptics.light();
      play(comfortSteps(), 'comfort');
      return;
    }
    if (n >= 5) {                       // 간지러워
      if (busy && busyKind.current === 'ticklish') return;
      haptics.medium();
      play(ticklishSteps(), 'ticklish');
      return;
    }
    if (n >= 3) {                       // 놀람
      if (busy && busyKind.current === 'surprise') return;
      haptics.medium();
      play(surpriseSteps(plant === 'basil'), 'surprise');
      return;
    }
    if (busy) return;                   // 쿨다운
    haptics.light();
    play(winkSteps(), 'wink');
  };

  // 캐릭터(화분과 식물 전체) 터치: 탭 / 문지르기 / 길게 누르기
  const gesture = useRef({ start: 0, path: 0, reversals: 0, lastDx: 0, lastSign: 0, long: false });
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelLong = () => { if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current = null; } };

  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      gesture.current = { start: Date.now(), path: 0, reversals: 0, lastDx: 0, lastSign: 0, long: false };
      cancelLong();
      longTimer.current = setTimeout(() => {
        longTimer.current = null;
        if (gesture.current.path > 10 || rubbing.current || isCrying()) return;
        gesture.current.long = true;
        haptics.medium();
        clearTimers();
        token.current++;
        busyUntil.current = Date.now() + FAR;
        busyKind.current = 'long';
        setView({ expression: 'happy', eye: null, fx: null });
      }, 500);
    },
    onPanResponderMove: (_, g) => {
      const gs = gesture.current;
      const delta = g.dx - gs.lastDx;
      gs.lastDx = g.dx;
      gs.path += Math.abs(delta);
      const sign = Math.abs(delta) > 3 ? Math.sign(delta) : 0;
      if (sign !== 0) {
        if (gs.lastSign !== 0 && sign !== gs.lastSign) gs.reversals++;
        gs.lastSign = sign;
      }
      if (gs.path > 10) cancelLong();
      if (!gs.long && !rubbing.current && !isCrying() && gs.path > 50 && gs.reversals >= 2) startRub();
      if (rubbing.current) touchRub();
    },
    onPanResponderRelease: () => {
      const gs = gesture.current;
      cancelLong();
      if (rubbing.current) { stopRub(); return; }
      if (gs.long) { haptics.success(); play(winkSteps(), 'wink'); return; }
      if (gs.path < 12 && Date.now() - gs.start < 450) handleTap();
    },
    onPanResponderTerminate: () => {
      cancelLong();
      if (rubbing.current) stopRub();
      else if (gesture.current.long) { clearTimers(); token.current++; setView(IDLE); busyUntil.current = 0; busyKind.current = ''; }
    },
  }));

  // 빈 화면 두 번 탭: 오늘 물주기를 끝냈을 때만 물방울 (화면 효과만, task 기록과는 무관)
  const onBackgroundPress = useCallback(() => {
    const now = Date.now();
    if (now - lastBgTap.current < 350) {
      lastBgTap.current = 0;
      if (latest.current.waterDone && now >= busyUntil.current) {
        haptics.light();
        play(dropSteps(latest.current.baseline === 'tear' || latest.current.baseline === 'cry'), 'drop');
      }
    } else {
      lastBgTap.current = now;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    clearTimers();
    if (rubTimer.current) clearInterval(rubTimer.current);
    if (rubIdle.current) clearTimeout(rubIdle.current);
    cancelLong();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 자는 중이고 터치 반응이 없을 때: Z 프레임을 돌린다 (작은 z → 둘 → 큰 Z → 빈 화면 → 처음으로)
  const sleeping = baseline === 'sleep';
  const idle = view.expression === null && view.eye === null && view.fx === null;
  useEffect(() => {
    if (!sleeping || !idle) { setZFrame(-1); return; }
    let step = 0;
    setZFrame(Z_CYCLE[0]);
    const id = setInterval(() => { step = (step + 1) % Z_CYCLE.length; setZFrame(Z_CYCLE[step]); }, 700);
    return () => clearInterval(id);
  }, [sleeping, idle]);

  // 지금 프레임의 효과 이미지 (846×1254 레이어 캔버스 기준)
  const effect = view.fx
    ? view.fx.kind === 'drop' ? DROP_FRAMES[view.fx.frame] : FX_IMAGES[plantType][view.fx.kind][view.fx.frame]
    : sleeping && idle && zFrame >= 0 ? Z_FRAMES[zFrame] : null;

  return {
    expression: view.expression,
    eye: view.eye,
    effect,
    panHandlers: panResponder.panHandlers,
    onBackgroundPress,
  };
}
