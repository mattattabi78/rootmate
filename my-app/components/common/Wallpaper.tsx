import React from 'react';
import { Image, StyleSheet, useWindowDimensions } from 'react-native';

// 키치 체크 월페이퍼 — 화면 가로폭에 맞춰 원본 비율(1206x2595)로 상단 기준 배치.
// 크기를 숫자로 명시해야 absolute 이미지가 원본 해상도로 커지지 않는다.
const SRC = require('../../assets/images/kitsch wallpaper.png');
const RATIO = 2595 / 1206;

export const WALLPAPER_COLOR = '#dbfba7'; // 이미지 가장자리 색 (세로가 더 긴 화면의 빈 영역용)

export default function Wallpaper() {
  const { width } = useWindowDimensions();
  return (
    <Image
      source={SRC}
      style={[styles.img, { width, height: Math.round(width * RATIO) }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  img: { position: 'absolute', top: 0, left: 0 },
});
