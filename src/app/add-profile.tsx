import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NAME_MAX, validateName, validatePin } from '../services/profiles';
import { useProfileStore } from '../store/profileStore';
import { colors, fonts, fontSizes, radius, spacing } from '../theme/tokens';

export default function AddProfileScreen() {
  const add = useProfileStore((s) => s.add);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const invalid = validateName(name) ?? validatePin(pin);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await add(name, pin);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the profile.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.body}>
        <Text style={styles.title}>New profile</Text>

        <View style={styles.field}>
          <Text style={styles.label}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Maya"
            placeholderTextColor={colors.inkSoft}
            maxLength={NAME_MAX}
            autoFocus
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Name"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PIN (OPTIONAL)</Text>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
            placeholder="4 digits"
            placeholderTextColor={colors.inkSoft}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            onSubmitEditing={save}
            accessibilityLabel="PIN, optional"
            style={[styles.input, styles.pin]}
          />
          <Text style={styles.hint}>Leave empty to open this profile without a PIN.</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.button, styles.secondary]}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={save}
            disabled={busy}
            style={[styles.button, styles.primary]}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Save</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 32,
    letterSpacing: -1,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.inkSoft,
    fontFamily: fonts.bold,
    fontSize: fontSizes.label,
    letterSpacing: 1.2,
  },
  input: {
    height: 52,
    borderRadius: radius.thumb,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.pill,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
  },
  pin: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    letterSpacing: 8,
  },
  hint: {
    color: colors.inkSoft,
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
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
    minWidth: 104,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.chip },
  primaryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  secondaryText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
});
