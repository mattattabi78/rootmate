import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../../constants';
import { storage, DEFAULT_NOTIFICATION_TIMES, NotificationTimes } from '../../store/storage';
import { applyNotificationSettings } from '../../utils/notifications';
import Button from '../common/Button';
import TimeStepper, { MORNING_RANGE, EVENING_RANGE } from './TimeStepper';

const MAX_NAME = 10;

interface Draft {
  userName: string;
  plantName: string;
  times: NotificationTimes;
}

const EMPTY: Draft = { userName: '', plantName: '', times: DEFAULT_NOTIFICATION_TIMES };

function isSame(a: Draft, b: Draft): boolean {
  return a.userName === b.userName
    && a.plantName === b.plantName
    && a.times.morning === b.times.morning
    && a.times.evening === b.times.evening
    && a.times.morningEnabled === b.times.morningEnabled
    && a.times.eveningEnabled === b.times.eveningEnabled;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 저장 완료 직후 호출 (화면에서 이름 등을 즉시 다시 읽을 때 사용) */
  onSaved?: () => void;
}

/** 설정 팝업: 내 이름 / 식물 이름 / 알림(아침·저녁 켜기·시간). 저장 버튼을 눌러야 반영됨 */
export default function SettingsModal({ visible, onClose, onSaved }: Props) {
  const [saved, setSaved] = useState<Draft>(EMPTY);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);   // 저장 안 하고 나가기 확인 레이어

  // 열릴 때마다 저장된 값을 불러와 초안으로 사용
  useEffect(() => {
    if (!visible) return;
    (async () => {
      const [userName, plant, times] = await Promise.all([
        storage.getNickname(),
        storage.getPlantData(),
        storage.getNotificationTimes(),
      ]);
      const loaded: Draft = { userName: userName ?? '', plantName: plant?.nickname ?? '', times };
      setSaved(loaded);
      setDraft(loaded);
      setConfirmExit(false);
    })();
  }, [visible]);

  const dirty = !isSame(saved, draft);
  const valid = draft.userName.trim().length > 0 && draft.plantName.trim().length > 0;

  const patchTimes = (p: Partial<NotificationTimes>) =>
    setDraft(d => ({ ...d, times: { ...d.times, ...p } }));

  // 저장하지 않은 변경이 있으면 닫기 전에 확인 레이어를 띄움
  // (Alert.alert는 웹에서 아무 동작도 하지 않아서, 팝업 안에 직접 그린 레이어를 사용)
  const requestClose = () => {
    if (!dirty) { onClose(); return; }
    setConfirmExit(true);
  };

  const handleSave = async () => {
    if (!dirty || !valid || saving) return;
    setSaving(true);
    try {
      const userName = draft.userName.trim();
      const plantName = draft.plantName.trim();
      await storage.saveNickname(userName);
      await storage.updatePlantData({ nickname: plantName });
      await storage.setNotificationTimes(draft.times);
      await applyNotificationSettings().catch(() => {});
      setSaved({ ...draft, userName, plantName });
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={requestClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                {/* 헤더 */}
                <View style={styles.header}>
                  <Text style={styles.title}>설정</Text>
                  <TouchableOpacity onPress={requestClose} hitSlop={14}>
                    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                      <Path d="M2 2L12 12M12 2L2 12" stroke={COLORS.pine} strokeWidth={2} strokeLinecap="round" />
                    </Svg>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.body}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* 내 정보 */}
                  <Text style={styles.sectionTitle}>내 정보</Text>
                  <NameField
                    label="내 이름"
                    value={draft.userName}
                    onChange={t => setDraft(d => ({ ...d, userName: t.slice(0, MAX_NAME) }))}
                  />
                  <NameField
                    label="식물 이름"
                    value={draft.plantName}
                    onChange={t => setDraft(d => ({ ...d, plantName: t.slice(0, MAX_NAME) }))}
                  />

                  {/* 알림 */}
                  <Text style={[styles.sectionTitle, styles.sectionGap]}>알림</Text>
                  <View style={styles.box}>
                    <View style={styles.boxHead}>
                      <Text style={styles.boxTitle}>아침 알림</Text>
                      <Switch
                        value={draft.times.morningEnabled}
                        onValueChange={v => patchTimes({ morningEnabled: v })}
                        trackColor={{ false: '#C5C7C0', true: COLORS.lime }}
                        thumbColor={COLORS.outline}
                        accessibilityLabel="아침 알림"
                      />
                    </View>
                    <TimeStepper
                      value={draft.times.morning}
                      range={MORNING_RANGE}
                      onChange={v => patchTimes({ morning: v })}
                      disabled={!draft.times.morningEnabled}
                    />
                  </View>
                  <View style={styles.box}>
                    <View style={styles.boxHead}>
                      <Text style={styles.boxTitle}>저녁 알림</Text>
                      <Switch
                        value={draft.times.eveningEnabled}
                        onValueChange={v => patchTimes({ eveningEnabled: v })}
                        trackColor={{ false: '#C5C7C0', true: COLORS.lime }}
                        thumbColor={COLORS.outline}
                        accessibilityLabel="저녁 알림"
                      />
                    </View>
                    <TimeStepper
                      value={draft.times.evening}
                      range={EVENING_RANGE}
                      onChange={v => patchTimes({ evening: v })}
                      disabled={!draft.times.eveningEnabled}
                    />
                  </View>
                </ScrollView>

                {/* 저장 */}
                <View style={styles.footer}>
                  <Button
                    label="저장"
                    onPress={handleSave}
                    disabled={!dirty || !valid}
                    loading={saving}
                  />
                </View>

                {/* 저장하지 않고 나가기 확인 */}
                {confirmExit && (
                  <View style={styles.confirmOverlay}>
                    <View style={styles.confirmBox}>
                      <Text style={styles.confirmTitle}>저장하지 않고 나갈까요?</Text>
                      <Text style={styles.confirmDesc}>변경한 내용이 저장되지 않아요.</Text>
                      <View style={styles.confirmRow}>
                        <TouchableOpacity
                          style={[styles.confirmBtn, styles.confirmBtnStay]}
                          onPress={() => setConfirmExit(false)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.confirmBtnText}>계속 수정</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmBtn, styles.confirmBtnLeave]}
                          onPress={() => { setConfirmExit(false); onClose(); }}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.confirmBtnText, styles.confirmBtnLeaveText]}>나가기</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NameField({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  const empty = value.trim().length === 0;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, empty && styles.inputWrapError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          maxLength={MAX_NAME}
          placeholder={label}
          placeholderTextColor={COLORS.tabTextOff}
          returnKeyType="done"
        />
        <Text style={styles.counter}>{value.length}/{MAX_NAME}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    width: '100%',
    maxWidth: 362,
    maxHeight: '88%',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.line,
  },
  title: { fontFamily: FONTS.extraBold, fontSize: 18, lineHeight: 26, color: COLORS.outline },
  scroll: { flexGrow: 0 },
  body: { padding: 20, gap: 12 },
  sectionTitle: { fontFamily: FONTS.extraBold, fontSize: 15, lineHeight: 20, color: COLORS.green },
  sectionGap: { marginTop: 12 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 13, lineHeight: 18, color: COLORS.textSecondary },
  inputWrap: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  inputWrapError: { borderColor: COLORS.inputBorderError },
  input: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textPrimary, padding: 0 },
  counter: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textTertiary, marginLeft: 8 },
  box: {
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: '#303a1e',
    borderRadius: 10,
  },
  boxHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boxTitle: { fontFamily: FONTS.extraBold, fontSize: 16, color: COLORS.pine },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 },

  // 나가기 확인 레이어 (팝업 위에 겹침)
  confirmOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  confirmBox: {
    width: '100%',
    gap: 8,
    padding: 20,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#303a1e',
  },
  confirmTitle: { fontFamily: FONTS.extraBold, fontSize: 17, lineHeight: 24, color: COLORS.outline, textAlign: 'center' },
  confirmDesc: { fontFamily: FONTS.semiBold, fontSize: 14, lineHeight: 20, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 8 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: '#303a1e' },
  confirmBtnStay: { backgroundColor: COLORS.lime },
  confirmBtnLeave: { backgroundColor: COLORS.bg, borderColor: '#d93025' },
  confirmBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.outline },
  confirmBtnLeaveText: { color: '#d93025' },
});
