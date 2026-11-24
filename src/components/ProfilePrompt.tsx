import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { colors, input, spacing, springs, textStyles } from '../theme/tokens';
import { Button } from './Button';
import { Glass } from './Glass';
import { BackdropContext } from './Screen';

// Confirm / PIN dialog. Give it a `key` that changes per prompt so its PIN and
// error reset.

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
      {/* A modal is its own window, so its glass can't blur the screen's aurora. */}
      <BackdropContext.Provider value={null}>
        <View style={styles.backdrop}>
          <Animated.View
            entering={ZoomIn.springify()
              .damping(springs.gentle.damping)
              .stiffness(springs.gentle.stiffness)
              .reduceMotion(ReduceMotion.System)}
            style={styles.center}>
            <Glass style={styles.sheet}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
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
                  style={[input, styles.pin]}
                />
              )}
              {error && <Text style={textStyles.error}>{error}</Text>}
              <View style={styles.row}>
                <Button label="Cancel" variant="secondary" size="sm" onPress={onCancel} style={styles.flex} />
                <Button
                  label={confirmLabel}
                  variant={destructive ? 'danger' : 'primary'}
                  size="sm"
                  onPress={confirm}
                  loading={busy}
                  style={styles.flex}
                />
              </View>
            </Glass>
          </Animated.View>
        </View>
      </BackdropContext.Provider>
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
  center: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  sheet: {
    padding: spacing.xl,
    gap: spacing.lg,
    // Opaque enough to read without a blur behind it.
    backgroundColor: 'rgba(249,246,240,0.9)',
  },
  title: { ...textStyles.heading, lineHeight: 26 },
  pin: { fontSize: 20, letterSpacing: 8 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
