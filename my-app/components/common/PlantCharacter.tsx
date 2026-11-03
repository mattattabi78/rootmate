import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  PlantType,
  GrowthStage,
  Expression,
  VASE_IMAGE,
  PROFILE_IMAGES,
  getPlantImage,
  getExpressionImage,
} from '../../constants/character';

interface Props {
  plantType: PlantType;
  stage: GrowthStage;
  expression?: Expression;
  size?: 'small' | 'medium' | 'large';
  /** 캔버스 가로폭(px) 직접 지정 — 지정하면 size 프리셋보다 우선. 세로는 비율로 자동 계산 */
  width?: number;
  showVase?: boolean;
}

// 화분·식물·표정 이미지는 모두 같은 846×1254 캔버스에 위치가 맞춰진 레이어다.
// 따라서 같은 크기로 겹쳐 그리면 Figma의 합성 캐릭터(예: 230×340)와 동일하게 보인다.
export const CHARACTER_RATIO = 1254 / 846;

// ─── 표정 레이어 조정값 (화면 보면서 직접 바꿔 보세요) ─────────────────────────
// 표정 이미지는 캔버스 전체 크기이고 얼굴은 아래쪽에 그려져 있어서,
// "얼굴 중심점"을 기준으로 크기를 줄입니다.
export const EXPRESSION_SCALE = 0.7;    // 표정 크기 배율 (1 = 원본, 작을수록 작아짐)
const FACE_CENTER_X = 51;                // 얼굴 중심 x (캔버스 가로 %, 크기 조절의 기준점)
const FACE_CENTER_Y = 90;                // 얼굴 중심 y (캔버스 세로 %, 크기 조절의 기준점)
const EXPRESSION_OFFSET_X = 0;           // 표정을 좌우로 이동 (캔버스 가로 대비 %, +오른쪽)
const EXPRESSION_OFFSET_Y = 0;           // 표정을 상하로 이동 (캔버스 세로 대비 %, +아래)

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
}: Props) {
  const w = width ?? SIZE_WIDTH[size];
  const h = w * CHARACTER_RATIO;

  // showVase=false + size=small → 프로필 이미지를 원형 아바타로 표시
  if (!showVase && size === 'small' && width === undefined) {
    return (
      <Image
        source={PROFILE_IMAGES[plantType]}
        style={profileStyle}
        resizeMode="cover"
      />
    );
  }

  const layer = { width: w, height: h };

  return (
    <View style={{ width: w, height: h }}>
      {/* 레이어 1: 화분 */}
      {showVase && (
        <Image source={VASE_IMAGE} style={[styles.abs, layer]} resizeMode="contain" />
      )}
      {/* 레이어 2: 식물 (성장 단계) */}
      <Image source={getPlantImage(plantType, stage)} style={[styles.abs, layer]} resizeMode="contain" />
      {/* 레이어 3: 표정 */}
      <Image
        source={getExpressionImage(plantType, expression)}
        style={[
          styles.abs,
          layer,
          {
            transformOrigin: `${FACE_CENTER_X}% ${FACE_CENTER_Y}%`,
            transform: [
              { translateX: (w * EXPRESSION_OFFSET_X) / 100 },
              { translateY: (h * EXPRESSION_OFFSET_Y) / 100 },
              { scale: EXPRESSION_SCALE },
            ],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const profileStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
} as const;

const styles = StyleSheet.create({
  abs: { position: 'absolute', top: 0, left: 0 },
});
