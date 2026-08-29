import React from 'react';
import { Platform, StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

const EMOJI_RE = /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|[\u2600-\u27BF](?:\uFE0F)?)/gu;

interface Props extends TextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export default function EmojiText({ children, style, ...props }: Props) {
  const chunks = React.Children.toArray(children);
  const textStyle = StyleSheet.flatten(style) ?? {};
  const { fontFamily: _fontFamily, fontWeight: _fontWeight, fontStyle: _fontStyle, ...parentStyle } = textStyle;

  return (
    <Text style={parentStyle} {...props}>
      {chunks.map((chunk, chunkIndex) => {
        if (typeof chunk !== 'string' && typeof chunk !== 'number') return chunk;
        const parts = String(chunk).split(EMOJI_RE).filter(Boolean);
        return parts.map((part, partIndex) => {
          const isEmoji = EMOJI_RE.test(part);
          EMOJI_RE.lastIndex = 0;
          return (
            <Text key={`${chunkIndex}-${part}-${partIndex}`} style={isEmoji ? [parentStyle, styles.emoji] : textStyle}>
              {part}
            </Text>
          );
        });
      })}
    </Text>
  );
}

const styles = {
  emoji: {
    fontFamily: Platform.select({
      ios: 'Apple Color Emoji',
      android: 'Noto Color Emoji',
      default: undefined,
    }),
    fontWeight: '400',
    fontStyle: 'normal',
  },
} as const;
