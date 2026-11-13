import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, fs } from '../../constants';

// 개발자 메뉴 전용 컨트롤. 박스·테두리·이모티콘 없이 글자와 여백으로 구성하고, 섹션 사이에만 가는 구분선을 둔다.
//   - 섹션 제목은 작은 회색 글자, 선택된 항목은 굵은 초록 글자, 위험한 동작은 빨간 글자

/** 섹션: 작은 제목 + (오른쪽에 스위치 등) + 내용 */
export function DevSection({ title, children, right, first }: {
  title: string; children?: React.ReactNode; right?: React.ReactNode;
  /** 첫 번째 섹션이면 위쪽 구분선을 그리지 않음 */
  first?: boolean;
}) {
  return (
    <View style={[styles.section, !first && styles.sectionDivider]}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** 섹션 제목 줄의 켜기/끄기 스위치 */
export function DevSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: '#C5C7C0', true: COLORS.lime }}
      thumbColor={COLORS.outline}
      accessibilityLabel={label}
    />
  );
}

/** 누르는 항목 한 줄: 굵은 이름 + 작은 설명 */
export function DevAction({ label, sub, onPress, danger, disabled }: {
  label: string; sub?: string; onPress: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.action, disabled && styles.disabled]} onPress={onPress} disabled={disabled} activeOpacity={0.6}>
      <Text style={[styles.actionLabel, danger && styles.danger]}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

/** 글자로만 된 선택 목록 (선택된 항목은 굵은 초록) */
export function DevOptions<T extends string | number>({ items, value, onSelect }: {
  items: { key: T; label: string; disabled?: boolean }[];
  value: T;
  onSelect: (key: T) => void;
}) {
  return (
    <View style={styles.optRow}>
      {items.map(it => (
        <TouchableOpacity
          key={String(it.key)}
          onPress={() => onSelect(it.key)}
          disabled={it.disabled}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          activeOpacity={0.6}
        >
          <Text style={[styles.opt, value === it.key && styles.optOn, it.disabled && styles.disabled]}>{it.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** 선택 목록의 이름표(캐릭터 / 단계 / 표정 …) */
export function DevLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** 값 설명 글 */
export function DevInfo({ children }: { children: React.ReactNode }) {
  return <Text style={styles.info}>{children}</Text>;
}

/** 글자만 있는 작은 조작 (− 3 + 처럼 가로로 늘어놓을 때) */
export function DevInline({ items }: { items: { label: string; onPress?: () => void; disabled?: boolean }[] }) {
  return (
    <View style={styles.inline}>
      {items.map(it => it.onPress ? (
        <TouchableOpacity key={it.label} onPress={it.onPress} disabled={it.disabled} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.6}>
          <Text style={[styles.inlineText, it.disabled && styles.disabled]}>{it.label}</Text>
        </TouchableOpacity>
      ) : (
        <Text key={it.label} style={styles.inlineValue}>{it.label}</Text>   // 누르지 않는 값 표시
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  // 섹션 사이 구분선: 가는 연한 선. 선 위쪽 여백은 시트의 gap(14), 아래쪽 여백은 paddingTop(14)으로 같게 맞춤
  sectionDivider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(20,83,45,0.18)', paddingTop: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: fs(13), lineHeight: fs(18), color: COLORS.textSecondary },

  action: { gap: 3, paddingVertical: 4 },
  actionLabel: { fontFamily: FONTS.bold, fontSize: fs(16), lineHeight: fs(22), color: COLORS.outline },
  danger: { color: '#d93025' },
  sub: { fontFamily: FONTS.medium, fontSize: fs(12), lineHeight: fs(17), color: COLORS.textTertiary },

  label: { fontFamily: FONTS.medium, fontSize: fs(12), lineHeight: fs(17), color: COLORS.textTertiary, marginTop: 4 },
  optRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 },
  opt: { fontFamily: FONTS.medium, fontSize: fs(15), lineHeight: fs(24), color: COLORS.textSecondary },
  optOn: { fontFamily: FONTS.bold, color: COLORS.green },
  disabled: { opacity: 0.3 },

  info: { fontFamily: FONTS.medium, fontSize: fs(13), lineHeight: fs(19), color: COLORS.textSecondary },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  inlineValue: { fontFamily: FONTS.medium, fontSize: fs(18), lineHeight: fs(26), color: COLORS.textSecondary },
  inlineText: { fontFamily: FONTS.bold, fontSize: fs(18), lineHeight: fs(26), color: COLORS.outline },
});
