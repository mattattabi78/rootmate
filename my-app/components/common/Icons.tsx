import React from 'react';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';

export function HomeIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={Math.round(size * 16 / 18)} height={size} viewBox="0 0 16 18" fill="none">
      <Path d="M0 18V6L8 0L16 6V18H10V11H6V18H0Z" fill={color} />
    </Svg>
  );
}

export function RecordIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={Math.round(size * 18 / 20)} height={size} viewBox="0 0 18 20" fill="none">
      <Rect x="1" y="2" width="16" height="17" rx="1.5" stroke={color} strokeWidth="1.5" />
      <Line x1="1" y1="7.25" x2="17" y2="7.25" stroke={color} strokeWidth="1.5" />
      <Line x1="5" y1="0" x2="5" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="13" y1="0" x2="13" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="5" cy="11" r="1" fill={color} />
      <Circle cx="9" cy="11" r="1" fill={color} />
      <Circle cx="13" cy="11" r="1" fill={color} />
      <Circle cx="5" cy="15" r="1" fill={color} />
      <Circle cx="9" cy="15" r="1" fill={color} />
      <Circle cx="13" cy="15" r="1" fill={color} />
    </Svg>
  );
}

export function CollectionIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={Math.round(size * 16 / 20)} height={size} viewBox="0 0 16 20" fill="none">
      <Path d="M2 18C2 16.9 2.9 16 4 16H14V2H4C2.9 2 2 2.9 2 4V18Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M2 18C2 19.1 2.9 20 4 20H14V16H4C2.9 16 2 16.9 2 18Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <Line x1="6" y1="6" x2="12" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="6" y1="9" x2="10" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function ChatBubbleIcon({ color = '#303A1E', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
