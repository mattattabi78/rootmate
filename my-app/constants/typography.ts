// 폰트 패밀리 — app/_layout.tsx 의 useFonts 키와 동일해야 함
export const FONTS = {
  light:     'SUITE-Light',
  regular:   'SUITE-Regular',
  medium:    'SUITE-Medium',
  semiBold:  'SUITE-SemiBold',
  bold:      'SUITE-Bold',
  extraBold: 'SUITE-ExtraBold',
  heavy:     'SUITE-Heavy',
} as const;

export const TYPOGRAPHY = {
  appTitle:     { fontFamily: FONTS.extraBold, fontSize: 20, lineHeight: 28, letterSpacing: 0.9 },
  headingXl:    { fontFamily: FONTS.extraBold, fontSize: 36, lineHeight: 44 },
  headingLg:    { fontFamily: FONTS.extraBold, fontSize: 28, lineHeight: 36 },
  headingMd:    { fontFamily: FONTS.bold,      fontSize: 22, lineHeight: 30 },
  headingSm:    { fontFamily: FONTS.bold,      fontSize: 18, lineHeight: 26 },
  dialogue:     { fontFamily: FONTS.bold,      fontSize: 20, lineHeight: 40 },
  date:         { fontFamily: FONTS.extraBold, fontSize: 15, lineHeight: 20 },
  bodyLg:       { fontFamily: FONTS.regular,   fontSize: 16, lineHeight: 24 },
  bodyMd:       { fontFamily: FONTS.regular,   fontSize: 14, lineHeight: 22 },
  bodySm:       { fontFamily: FONTS.regular,   fontSize: 13, lineHeight: 18 },
  label:        { fontFamily: FONTS.extraBold, fontSize: 14, lineHeight: 15, letterSpacing: -0.25 },
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};
