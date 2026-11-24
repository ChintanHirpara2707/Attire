import { useState } from 'react';

// Give this a `key` that changes per prompt so its PIN and error reset.
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, fontSizes, radius, spacing } from '../theme/tokens';
import { Glass } from './Glass';

type Props = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  destructive?: boolean;
  askPin: boolean;
  // Returns an error message to show, or null when done.
  onConfirm: (pin: string) => Promise<string | null>;
  onCancel: () => void;
};

export function ProfilePrompt({ visible, title, confirmLabel, destructive, askPin, onConfirm, onCancel }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (askPin && pin.length !== 4) {
      setError('Enter the 4-digit PIN.');
      return;
    }
    setBusy(true);
    setError(await onConfirm(pin));
    setBusy(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Glass style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {askPin && (
            <TextInput
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
              placeholder="PIN"
              placeholderTextColor={colors.inkSoft}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus
              onSubmitEditing={confirm}
              accessibilityLabel="PIN"
              style={styles.input}
            />
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.button, styles.secondary]}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirm}
              disabled={busy}
              style={[styles.button, destructive ? styles.danger : styles.primary]}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Glass>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.scrim,
  },
  sheet: {
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.sheet,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },
  input: {
    height: 48,
    borderRadius: radius.thumb,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.pill,
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 20,
    letterSpacing: 8,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    minWidth: 96,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.ink },
  danger: { backgroundColor: colors.danger },
  secondary: { backgroundColor: colors.chip },
  primaryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  secondaryText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
});
