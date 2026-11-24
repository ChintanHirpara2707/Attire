import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '../../../components/Glass';
import { createItem, removeBackground } from '../../../services/items';
import { useProfileStore } from '../../../store/profileStore';
import { colors, fonts, fontSizes, radius, spacing } from '../../../theme/tokens';

type Picked = { uri: string; width: number; height: number };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
};

export default function AddItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Saving…');

  if (activeProfileId !== id) return <Redirect href="/" />;

  const pick = async (source: 'camera' | 'gallery') => {
    setError(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Camera access is off. Turn it on in Settings to take photos.'
          : 'Photo access is off. Turn it on in Settings to pick photos.',
      );
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return;
    const { uri, width, height } = result.assets[0];
    setPhoto({ uri, width, height });
  };

  const save = async () => {
    if (!photo) return;
    setBusy(true);
    setStatus('Saving…');
    setError(null);
    let item;
    try {
      item = await createItem({ profileId: id, ...photo, name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the item.');
      setBusy(false);
      return;
    }
    // The item is saved; a cutout is a bonus. If it fails, the original is kept.
    setStatus('Removing background…');
    try {
      await removeBackground(item);
    } catch (e) {
      console.warn('Background removal skipped:', e instanceof Error ? e.message : e);
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>‹ Closet</Text>
          </Pressable>
          <Text style={styles.title}>Add clothes</Text>

          <Glass style={styles.preview}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="contain" accessibilityLabel="Selected photo" />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.muted}>Take a photo or pick one from your gallery.</Text>
              </View>
            )}
          </Glass>

          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={() => pick('camera')} disabled={busy} style={[styles.button, styles.secondary]}>
              <Text style={styles.secondaryText}>Camera</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => pick('gallery')} disabled={busy} style={[styles.button, styles.secondary]}>
              <Text style={styles.secondaryText}>Gallery</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>NAME (OPTIONAL)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. White tee"
              placeholderTextColor={colors.inkSoft}
              maxLength={60}
              accessibilityLabel="Name, optional"
              style={styles.input}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            onPress={save}
            disabled={!photo || busy}
            style={[styles.save, (!photo || busy) && styles.disabled]}>
            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={colors.white} />
                <Text style={styles.saveText}>{status}</Text>
              </View>
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  back: {
    color: colors.inkSoft,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 32,
    letterSpacing: -1,
  },
  preview: {
    aspectRatio: 3 / 4,
  },
  image: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  muted: {
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  secondary: { backgroundColor: colors.pill },
  secondaryText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  field: { gap: spacing.sm },
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
  error: {
    color: colors.danger,
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
  },
  save: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  disabled: { opacity: 0.4 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  saveText: { color: colors.white, fontFamily: fonts.semibold, fontSize: fontSizes.md },
});
