import React, { useEffect, useMemo } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, Text, TextStyle, View } from 'react-native';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  /** 글자가 뛰는 높이 (px) */
  height?: number;
  /** 글자 사이 시차 (ms) — 왼쪽부터 차례로 뛰어오름 */
  stagger?: number;
  /** 한 바퀴가 끝난 뒤 다음 바퀴까지 쉬는 시간 (ms) */
  rest?: number;
  /** 첫 바퀴가 시작되기까지의 대기 (ms) */
  startDelay?: number;
};

/**
 * 글자가 왼쪽부터 차례로 통통 뛰어오르는 모션을 일정한 간격으로 반복하는 텍스트.
 * '동작 줄이기' 설정이 켜져 있으면 움직이지 않는다.
 */
export default function HoppingText({
  text, style, height = 10, stagger = 70, rest = 1400, startDelay = 900,
}: Props) {
  const chars = useMemo(() => Array.from(text), [text]);
  const lifts = useMemo(() => chars.map(() => new Animated.Value(0)), [chars]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled || reduce) return;
      const hop = (v: Animated.Value) =>
        Animated.sequence([
          Animated.timing(v, { toValue: -height, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(v, { toValue: 0, friction: 4, tension: 170, useNativeDriver: true }),
        ]);
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(startDelay),
          Animated.stagger(stagger, lifts.map(hop)),
          Animated.delay(rest),
        ]),
      );
      loop.start();
    });

    return () => {
      cancelled = true;
      loop?.stop();
      lifts.forEach(v => v.setValue(0));
    };
  }, [lifts, height, stagger, rest, startDelay]);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center' }} accessible accessibilityLabel={text}>
      {chars.map((ch, i) => (
        <Animated.View key={i} style={{ transform: [{ translateY: lifts[i] }] }}>
          <Text style={style} accessibilityElementsHidden importantForAccessibility="no">
            {ch === ' ' ? ' ' : ch}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}
