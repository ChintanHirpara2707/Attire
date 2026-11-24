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
import Animated from 'react-native-reanimated';

import { Button } from '../../../components/Button';
import { Glass } from '../../../components/Glass';
import { Screen } from '../../../components/Screen';
import { autoDetectColor, createItem, removeBackground } from '../../../services/items';
import { useProfileStore } from '../../../store/profileStore';
import { enter } from '../../../theme/motion';
import { colors, input, spacing, textStyles } from '../../../theme/tokens';


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
    // The item is saved; color and cutout are bonuses. Color detection runs in
    // the background from the original photo and any failure is ignored.
    autoDetectColor(item).catch((e) =>
      console.warn('Color detection skipped:', e instanceof Error ? e.message : e),
    );
    // If background removal fails, the original is kept.
    setStatus('Removing background…');
    try {
      await removeBackground(item);
    } catch (e) {
      console.warn('Background removal skipped:', e instanceof Error ? e.message : e);
    }
    router.back();
  };


  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={textStyles.back}>‹ Closet</Text>
          </Pressable>
          <Animated.View entering={enter(0)} style={styles.headingBlock}>
            <Text style={textStyles.title} accessibilityRole="header">
              Add clothes
            </Text>
            <Text style={textStyles.subtitle}>Snap it, and we&apos;ll do the rest.</Text>
          </Animated.View>

          <Animated.View entering={enter(1)}>
            <Glass style={styles.preview}>
              {photo ? (
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.image}
                  resizeMode="contain"
                  accessibilityLabel="Selected photo"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={[textStyles.muted, styles.center]}>Take a photo or pick one from your gallery.</Text>
                </View>
              )}
            </Glass>
          </Animated.View>

          <Animated.View entering={enter(2)} style={styles.row}>
            <Button label="Camera" variant="secondary" onPress={() => pick('camera')} disabled={busy} style={styles.flex} />
            <Button label="Gallery" variant="secondary" onPress={() => pick('gallery')} disabled={busy} style={styles.flex} />
          </Animated.View>

          <Animated.View entering={enter(3)} style={styles.field}>
            <Text style={textStyles.label}>NAME (OPTIONAL)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. White tee"
              placeholderTextColor={colors.inkSoft}
              maxLength={60}
              accessibilityLabel="Name, optional"
              style={input}
            />
          </Animated.View>

          {error && <Text style={textStyles.error}>{error}</Text>}

          <Animated.View entering={enter(4)} style={styles.saveBlock}>
            <Button label="Save" onPress={save} disabled={!photo} loading={busy} />
            {busy && (
              <View style={styles.busyRow} accessibilityLiveRegion="polite">
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={textStyles.muted}>{status}</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  body: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  headingBlock: { gap: spacing.xs },
  preview: { aspectRatio: 3 / 4 },
  image: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { gap: spacing.sm },
  saveBlock: { gap: spacing.sm },
  busyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
