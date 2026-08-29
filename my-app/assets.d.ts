// 이미지/폰트 에셋 모듈 타입 선언
// TypeScript가 require('*.png') 등을 인식하도록 함
declare module '*.png' {
  const value: number;
  export = value;
}
declare module '*.jpg' {
  const value: number;
  export = value;
}
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
declare module '*.ttf' {
  const value: number;
  export = value;
}
