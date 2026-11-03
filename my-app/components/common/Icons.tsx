import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 피그마(Y2K) 픽셀 스타일 아이콘 — 모두 단색 fill, color prop 으로 색 지정
interface IconProps {
  color: string;
  size?: number;
}

export function HomeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M10 0L0 8.57143V20H7.14286V12.8571H12.8571V20H20V8.57143L10 0Z" fill={color} />
    </Svg>
  );
}

export function RecordIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M2.85714 0V2.85714H0V20H20V2.85714H17.1429V0H14.2857V2.85714H5.71429V0H2.85714ZM17.1429 5.71429V17.1429H2.85714V5.71429H17.1429ZM5.71429 8.57143H8.57143V11.4286H5.71429V8.57143ZM11.4286 8.57143H14.2857V11.4286H11.4286V8.57143ZM5.71429 12.8571H8.57143V15.7143H5.71429V12.8571ZM11.4286 12.8571H14.2857V15.7143H11.4286V12.8571Z"
        fill={color}
      />
    </Svg>
  );
}

export function CollectionIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={Math.round((size * 17) / 20)} height={size} viewBox="0 0 17 20" fill="none">
      <Path
        d="M0 0H17V20H0V0ZM3.4 3.33333V16.6667H13.6V3.33333H3.4ZM5.1 6.66667H11.9V8.33333H5.1V6.66667ZM5.1 10H11.9V11.6667H5.1V10Z"
        fill={color}
      />
    </Svg>
  );
}

export function ChatIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M0 0H20V15H5L0 20V0ZM3.33333 3.33333V11.6667H15V3.33333H3.33333ZM6.66667 5H11.6667V6.66667H6.66667V5ZM6.66667 8.33333H10V10H6.66667V8.33333Z"
        fill={color}
      />
    </Svg>
  );
}

// 기존 이름 호환
export const ChatBubbleIcon = ChatIcon;

export function HeartIcon({ color = '#14532D', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={Math.round((size * 14) / 13)} height={size} viewBox="0 0 14 13" fill="none">
      <Path
        d="M2.16719 0.00984631C3.00644 -0.0109797 3.94115 0.0193052 4.78727 0.0291701C5.4088 0.899015 6.19684 1.89457 6.86248 2.72276L9.10842 0.0564023C9.82255 -0.0267862 11.1203 0.00661611 11.8821 0.0066738C12.2998 0.351889 13.6114 1.71123 13.9751 2.12163C14.033 3.16876 13.9726 4.90533 13.9661 6.00161C12.9538 7.0946 11.7928 8.2316 10.7415 9.29915C9.57093 10.5457 8.31931 11.7336 7.15888 12.992C6.93514 13.0029 6.67558 12.9983 6.44857 13C4.37286 10.7622 2.12309 8.21551 0.0113798 6.05503C0.00873239 4.79751 -0.0255718 3.37356 0.0395442 2.13363C0.672229 1.47707 1.50432 0.612357 2.16719 0.00984631Z"
        fill={color}
      />
    </Svg>
  );
}

