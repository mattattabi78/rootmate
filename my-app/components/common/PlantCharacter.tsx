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
  showVase?: boolean;
}

// 각 size의 치수 설정
// container: 전체 View 크기 (overflow: visible로 식물이 위로 삐져나와도 보임)
// vaseW/H:   화분 이미지 크기
// plantW/H:  식물 단계 이미지 크기
// plantBot:  화분과 2px 겹치도록 bottom 위치
// exprW/H:   표정 이미지 크기
// exprBot:   표정 bottom 위치 (화분 상단 근처)
const SIZE: Record<
  'small' | 'medium' | 'large',
  { cW: number; cH: number; vW: number; vH: number; pW: number; pH: number; pBot: number; eW: number; eH: number; eBot: number }
> = {
  small: {
    cW: 100, cH: 100,
    vW: 135, vH: 81,
    pW: 87,  pH: 155,   pBot: 25,
    eW: 57,  eH: 57,   eBot: 26,
  },
  medium: {
    cW: 240, cH: 220,
    vW: 180, vH: 108,
    pW: 116, pH: 185,  pBot: 70,
    eW: 76,  eH: 76,   eBot: 71,
  },
  large: {
    cW: 400, cH: 360,
    vW: 300, vH: 180,
    pW: 204, pH: 270,  pBot: 118,
    eW: 126, eH: 126,  eBot: 119,
  },
};

export default function PlantCharacter({
  plantType,
  stage,
  expression = 'default',
  size = 'medium',
  showVase = true,
}: Props) {
  const s = SIZE[size];

  // showVase=false + size=small → 프로필 이미지를 원형 아바타로 표시
  if (!showVase && size === 'small') {
    return (
      <Image
        source={PROFILE_IMAGES[plantType]}
        style={profileStyle}
        resizeMode="cover"
      />
    );
  }

  const plantSrc = getPlantImage(plantType, stage);
  const exprSrc  = getExpressionImage(plantType, expression);

  if (!showVase) {
    // 화분 없이 식물+표정만 (container 크기 유지)
    return (
      <View style={{ width: s.cW, height: s.cH }}>
        <Image
          source={plantSrc}
          style={[styles.abs, { width: s.pW, height: s.pH, bottom: 0, left: (s.cW - s.pW) / 2 }]}
          resizeMode="contain"
        />
        <Image
          source={exprSrc}
          style={[styles.abs, { width: s.eW, height: s.eH, bottom: s.pH * 0.4, left: (s.cW - s.eW) / 2 }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    // overflow: visible → 식물이 container 위로 삐져나와도 렌더
    <View style={{ width: s.cW, height: s.cH, overflow: 'visible' }}>
      {/* 레이어 1: 화분 (최하단 고정) */}
      <Image
        source={VASE_IMAGE}
        style={[styles.abs, { width: s.vW, height: s.vH, bottom: 20, left: (s.cW - s.vW) / 2 }]}
        resizeMode="contain"
      />
      {/* 레이어 2: 식물 (화분과 2px 겹침) */}
      <Image
        source={plantSrc}
        style={[styles.abs, { width: s.pW, height: s.pH, bottom: -10, left: (s.cW - s.pW) / 2 }]}
        resizeMode="contain"
      />
      {/* 레이어 3: 표정 (화분 상단 중앙) */}
      <Image
        source={exprSrc}
        style={[styles.abs, { width: s.eW, height: s.eH, bottom: 20, left: (s.cW - s.eW) / 2 }]}
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
  abs: { position: 'absolute' },
});
