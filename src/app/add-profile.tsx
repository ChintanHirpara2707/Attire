import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '../components/Button';
import { Glass } from '../components/Glass';
import { Screen } from '../components/Screen';
import { NAME_MAX, validateName, validatePin } from '../services/profiles';
import { useProfileStore } from '../store/profileStore';
import { enter } from '../theme/motion';
import { colors, input, spacing, textStyles } from '../theme/tokens';

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
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Animated.View entering={enter(0)} style={styles.headingBlock}>
            <Text style={textStyles.title} accessibilityRole="header">
              New profile
            </Text>
            <Text style={textStyles.subtitle}>A wardrobe of their own.</Text>
          </Animated.View>

          <Animated.View entering={enter(1)}>
            <Glass style={styles.card}>
              <View style={styles.field}>
                <Text style={textStyles.label}>NAME</Text>
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
                  style={input}
                />
              </View>

              <View style={styles.field}>
                <Text style={textStyles.label}>PIN (OPTIONAL)</Text>
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
                  style={[input, styles.pin]}
                />
                <Text style={textStyles.muted}>Leave empty to open this profile without a PIN.</Text>
              </View>

              {error && <Text style={textStyles.error}>{error}</Text>}
            </Glass>
          </Animated.View>

          <Animated.View entering={enter(2)} style={styles.row}>
            <Button label="Cancel" variant="secondary" onPress={() => router.back()} style={styles.flex} />
            <Button label="Save" onPress={save} loading={busy} style={styles.flex} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  headingBlock: { gap: spacing.xs, marginTop: spacing.md },
  card: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
  pin: { fontSize: 20, letterSpacing: 8 },
  row: { flexDirection: 'row', gap: spacing.sm },
});
