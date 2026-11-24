import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { Button } from '../../../../components/Button';
import { Glass } from '../../../../components/Glass';
import { PressableScale } from '../../../../components/PressableScale';
import { ProfilePrompt } from '../../../../components/ProfilePrompt';
import { Screen } from '../../../../components/Screen';
import {
  CATEGORIES,
  SEASONS,
  deleteItem,
  detectItemColor,
  getItem,
  getSignedUrls,
  isValidHex,
  removeBackground,
  restoreOriginal,
  updateItem,
  type Category,
  type Item,
  type Season,
} from '../../../../services/items';
import { useProfileStore } from '../../../../store/profileStore';
import { enter } from '../../../../theme/motion';
import { colors, fonts, fontSizes, gradients, input, radius, spacing, textStyles } from '../../../../theme/tokens';
import { hexToColorName } from '../../../../utils/colorName';


// Common clothing colors for the manual picker.
const SWATCHES = [
  '#111111', '#FFFFFF', '#F2EBDD', '#D9CCB4', '#8B5A2B', '#9A9A9A', '#3B3C3F', '#27324D',
  '#4A78C2', '#BCD0E2', '#717556', '#3E6B48', '#B9C2AE', '#C0392B', '#800020', '#E8A0B4',
  '#E67E22', '#F1C40F', '#7D3C98', '#1ABC9C',
];

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Loaded = { item: Item; photoUrl: string | null };

export default function ItemScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const allowed = activeProfileId === id;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [hexInput, setHexInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [colorNote, setColorNote] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      try {
        const item = await getItem(itemId);
        const path = item.image_path ?? item.original_path;
        const urls = path ? await getSignedUrls([path]) : {};
        if (!active) return;
        setLoaded({ item, photoUrl: path ? (urls[path] ?? null) : null });
        setName(item.name);
        setCategory((CATEGORIES as readonly string[]).includes(item.category ?? '') ? (item.category as Category) : null);
        setSeason((SEASONS as readonly string[]).includes(item.season ?? '') ? (item.season as Season) : null);
        setHexInput(item.color_hex ?? '');
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : 'Could not load this item.');
      }
    })();
    return () => {
      active = false;
    };
  }, [allowed, itemId]);

  if (!allowed) return <Redirect href="/" />;

  // Normalise "#abc123" / "abc123"; empty means "no color".
  const hex = hexInput.trim() === '' ? '' : `#${hexInput.trim().replace(/^#/, '').toUpperCase()}`;
  const hexValid = hex === '' || isValidHex(hex);
  const colorName = hex && hexValid ? hexToColorName(hex) : null;

  const save = async () => {
    if (!hexValid) {
      setError('Color must be a hex value like #1A2B3C.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateItem(itemId, {
        name,
        category,
        season,
        color: hex ? { hex, name: hexToColorName(hex) } : null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  };

  // Fills the picker with the detected color; nothing is saved until Save.
  const detectColor = async () => {
    if (!loaded) return;
    setDetecting(true);
    setColorNote(null);
    try {
      const found = await detectItemColor(loaded.item);
      if (found) {
        setHexInput(found.hex);
        setColorNote(`Detected ${found.name}. Tap Save to keep it.`);
      } else {
        setColorNote('Could not detect a color here (needs a development build). Pick one above.');
      }
    } catch (e) {
      setColorNote(e instanceof Error ? e.message : 'Could not detect a color.');
    } finally {
      setDetecting(false);
    }
  };

  // Remove background, or restore the original if a cutout exists.
  const toggleBackground = async () => {
    if (!loaded) return;
    setBgBusy(true);
    setError(null);
    try {
      const item = loaded.item.image_path
        ? await restoreOriginal(loaded.item)
        : await removeBackground(loaded.item);
      const path = item.image_path ?? item.original_path;
      const urls = path ? await getSignedUrls([path]) : {};
      setLoaded({ item, photoUrl: path ? (urls[path] ?? null) : null });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the background.');
    } finally {
      setBgBusy(false);
    }
  };

  const remove = async (): Promise<string | null> => {
    if (!loaded) return null;
    try {
      await deleteItem(loaded.item);
      setConfirmDelete(false);
      router.back();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not delete.';
    }
  };


  if (!loaded) {
    return (
      <Screen style={styles.center}>
        {loadError ? <Text style={textStyles.error}>{loadError}</Text> : <ActivityIndicator color={colors.accent} />}
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={textStyles.back}>‹ Closet</Text>
          </Pressable>

          <Animated.View entering={enter(0)}>
            <Glass style={styles.photo}>
              {loaded.photoUrl ? (
                <Image
                  source={{ uri: loaded.photoUrl }}
                  style={styles.image}
                  resizeMode="contain"
                  accessibilityLabel={name || 'Clothing item'}
                />
              ) : null}
            </Glass>
          </Animated.View>
          {loaded.item.original_path && (
            <Animated.View entering={enter(1)}>
              <Button
                label={loaded.item.image_path ? 'Restore original' : 'Remove background'}
                variant="secondary"
                size="sm"
                onPress={toggleBackground}
                loading={bgBusy}
                disabled={busy}
              />
            </Animated.View>
          )}

          <Animated.View entering={enter(2)}>
            <Glass style={styles.card}>
              <View style={styles.field}>
                <Text style={textStyles.label}>NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. White tee"
                  placeholderTextColor={colors.inkSoft}
                  maxLength={60}
                  accessibilityLabel="Name"
                  style={input}
                />
              </View>

              <View style={styles.field}>
                <Text style={textStyles.label}>CATEGORY</Text>
                <View style={styles.chips}>
                  {CATEGORIES.map((c) => (
                    <Chip key={c} text={label(c)} active={category === c} onPress={() => setCategory(category === c ? null : c)} />
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={textStyles.label}>SEASON</Text>
                <View style={styles.chips}>
                  {SEASONS.map((s) => (
                    <Chip key={s} text={label(s)} active={season === s} onPress={() => setSeason(season === s ? null : s)} />
                  ))}
                </View>
              </View>
            </Glass>
          </Animated.View>

          <Animated.View entering={enter(3)}>
            <Glass style={styles.card}>
              <View style={styles.field}>
                <Text style={textStyles.label}>COLOR{colorName ? ` · ${colorName.toUpperCase()}` : ''}</Text>
                <View style={styles.swatches}>
                  {SWATCHES.map((s) => {
                    const selected = hex === s;
                    return (
                      <PressableScale
                        key={s}
                        accessibilityRole="button"
                        accessibilityLabel={`${hexToColorName(s)} ${s}`}
                        accessibilityState={{ selected }}
                        onPress={() => setHexInput(s)}
                        pressedScale={0.85}
                        style={[styles.swatch, { backgroundColor: s }, selected && styles.swatchSelected]}>
                        {null}
                      </PressableScale>
                    );
                  })}
                </View>
                <View style={styles.hexRow}>
                  <View style={[styles.hexPreview, { backgroundColor: hex && hexValid ? hex : 'transparent' }]} />
                  <TextInput
                    value={hexInput}
                    onChangeText={setHexInput}
                    placeholder="#RRGGBB"
                    placeholderTextColor={colors.inkSoft}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={7}
                    accessibilityLabel="Color hex code"
                    style={[input, styles.hexInput]}
                  />
                  {hex !== '' && (
                    <Pressable accessibilityRole="button" onPress={() => setHexInput('')} hitSlop={8}>
                      <Text style={textStyles.back}>Clear</Text>
                    </Pressable>
                  )}
                </View>
                {!hexValid && <Text style={textStyles.error}>Use 6 hex digits, like #1A2B3C.</Text>}
                <Button
                  label="Auto-detect color"
                  variant="secondary"
                  size="sm"
                  onPress={detectColor}
                  loading={detecting}
                  disabled={busy}
                />
                {colorNote && <Text style={styles.note}>{colorNote}</Text>}
              </View>
            </Glass>
          </Animated.View>

          {error && <Text style={textStyles.error}>{error}</Text>}

          <Animated.View entering={enter(4)} style={styles.actions}>
            <Button label="Save" onPress={save} loading={busy} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmDelete(true)}
              disabled={busy}
              style={styles.delete}>
              <Text style={styles.deleteText}>Delete item</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ProfilePrompt
        key={confirmDelete ? 'open' : 'closed'}
        visible={confirmDelete}
        title={`Delete ${name.trim() || 'this item'}? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        askPin={false}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      pressedScale={0.92}
      style={[styles.chip, active && styles.chipActive]}>
      {active ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  body: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  photo: { aspectRatio: 1 },
  image: { flex: 1 },
  card: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.hover,
    overflow: 'hidden',
  },
  chipActive: { borderColor: 'transparent' },
  chipText: { color: colors.ink, fontFamily: fonts.medium, fontSize: fontSizes.sm },
  chipTextActive: { color: colors.white, fontFamily: fonts.semibold },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  swatchSelected: { borderWidth: 3, borderColor: colors.accentDeep },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hexPreview: {
    width: 44,
    height: 44,
    borderRadius: radius.thumb,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  hexInput: { flex: 1, fontFamily: fonts.semibold, letterSpacing: 1 },
  note: { color: colors.inkSoft, fontFamily: fonts.medium, fontSize: fontSizes.xs },
  actions: { gap: spacing.sm },
  delete: { height: 46, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
});
