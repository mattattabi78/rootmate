import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { FaceLayers } from './BlinkingFace';
import {
  PlantType,
  GrowthStage,
  Expression,
  POT_IMAGE,
  getPlantImage,
  getFaceSet,
} from '../../constants/character';

interface Props {
  plantType: PlantType;
  stage: GrowthStage;
  expression?: Expression;
  size?: 'small' | 'medium' | 'large';
  /** 캔버스 가로폭(px) 직접 지정 — 지정하면 size 프리셋보다 우선. 세로는 비율로 자동 계산 */
  width?: number;
  showVase?: boolean;
  /** 눈 깜빡임 켜기 (홈 화면에서만 사용, 기본 꺼짐) */
  animated?: boolean;
}

// 화분·식물·표정 이미지는 모두 같은 846×1254 캔버스에 위치가 맞춰진 레이어다.
// 따라서 같은 크기로 겹쳐 그리면 Figma의 합성 캐릭터(예: 230×340)와 동일하게 보인다.
export const CHARACTER_RATIO = 1254 / 846;

const SIZE_WIDTH: Record<'small' | 'medium' | 'large', number> = {
  small:  100,   // 100 × 148
  medium: 150,   // 150 × 222
  large:  230,   // 230 × 340 (홈 화면 Figma 기준)
};

export default function PlantCharacter({
  plantType,
  stage,
  expression = 'default',
  size = 'medium',
  width,
  showVase = true,
  animated = false,
}: Props) {
  const w = width ?? SIZE_WIDTH[size];
  const h = w * CHARACTER_RATIO;

  const layer = { width: w, height: h };

  return (
    <View style={{ width: w, height: h }}>
      {/* 레이어 1: 화분 */}
      {showVase && (
        <Image source={POT_IMAGE} style={[styles.abs, layer]} resizeMode="contain" />
      )}
      {/* 레이어 2: 식물 (성장 단계) */}
      <Image source={getPlantImage(plantType, stage)} style={[styles.abs, layer]} resizeMode="contain" />
      {/* 레이어 3: 얼굴 (화분 위에 그려진 v2 얼굴, 눈이 깜빡이고(표정에 따라 눈물이 흐름). 화분 캔버스와 위치가 맞춰져 있어 변형 없이 겹침) */}
      {showVase && (
        <FaceLayers face={getFaceSet(plantType, expression)} style={[styles.abs, layer]} animated={animated} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', top: 0, left: 0 },
});
