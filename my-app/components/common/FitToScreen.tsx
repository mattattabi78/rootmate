import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * 화면(탭) 내용을 "본문 영역 높이"에 맞춰 통째로 축소해서, 짧은 화면(예: iPhone SE)에서도 잘리거나 스크롤하지 않고 한 번에 보이게 한다.
 *
 * - designHeight: 이 화면 내용이 잘리지 않고 보이려면 필요한 본문 높이(px, 디자인 기준).
 * - 본문이 designHeight보다 크거나 같으면 배율 1(그대로)이라 지금과 똑같이 보인다.
 * - 본문이 더 짧으면 그 비율만큼 줄인다. 안쪽 영역은 (가로 / 배율) × (세로 / 배율) 크기로 키워서 줄인 뒤 원래 영역에 꼭 맞게 하므로,
 *   안쪽 화면은 항상 "디자인 높이에 맞는 화면"으로 보고 그대로 레이아웃을 짜면 된다 (절대 좌표·flex 모두 그대로 동작).
 * - minScale: 글자가 너무 작아지지 않도록 하는 하한. 이보다 짧은 화면에서는 일부가 잘릴 수 있다.
 */
export default function FitToScreen({ designHeight, minScale = 0.55, children }: {
  designHeight: number;
  minScale?: number;
  children: React.ReactNode;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const scale = box.h > 0 ? Math.max(minScale, Math.min(1, box.h / designHeight)) : 1;

  return (
    <View
      style={styles.outer}
      onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {box.w > 0 && (
        <View
          style={{
            position: 'absolute', top: 0, left: 0,
            width: box.w / scale, height: box.h / scale,
            transform: [{ scale }],
            transformOrigin: '0% 0%',
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, overflow: 'hidden' },
});
