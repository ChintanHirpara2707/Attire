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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '../../../../components/Glass';
import { ProfilePrompt } from '../../../../components/ProfilePrompt';
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
import { colors, fonts, fontSizes, radius, spacing } from '../../../../theme/tokens';
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
      <SafeAreaView style={[styles.root, styles.center]}>
        {loadError ? <Text style={styles.error}>{loadError}</Text> : <ActivityIndicator color={colors.ink} />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>‹ Closet</Text>
          </Pressable>

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
          {loaded.item.original_path && (
            <Pressable
              accessibilityRole="button"
              onPress={toggleBackground}
              disabled={bgBusy || busy}
              style={[styles.bgButton, (bgBusy || busy) && styles.disabled]}>
              {bgBusy ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.bgButtonText}>
                  {loaded.item.image_path ? 'Restore original' : 'Remove background'}
                </Text>
              )}
            </Pressable>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. White tee"
              placeholderTextColor={colors.inkSoft}
              maxLength={60}
              accessibilityLabel="Name"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Chip key={c} text={label(c)} active={category === c} onPress={() => setCategory(category === c ? null : c)} />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SEASON</Text>
            <View style={styles.chips}>
              {SEASONS.map((s) => (
                <Chip key={s} text={label(s)} active={season === s} onPress={() => setSeason(season === s ? null : s)} />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>COLOR{colorName ? ` · ${colorName.toUpperCase()}` : ''}</Text>
            <View style={styles.swatches}>
              {SWATCHES.map((s) => {
                const selected = hex === s;
                return (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    accessibilityLabel={`${hexToColorName(s)} ${s}`}
                    accessibilityState={{ selected }}
                    onPress={() => setHexInput(s)}
                    style={[styles.swatch, { backgroundColor: s }, selected && styles.swatchSelected]}
                  />
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
                style={[styles.input, styles.hexInput]}
              />
              {hex !== '' && (
                <Pressable accessibilityRole="button" onPress={() => setHexInput('')} hitSlop={8}>
                  <Text style={styles.clear}>Clear</Text>
                </Pressable>
              )}
            </View>
            {!hexValid && <Text style={styles.error}>Use 6 hex digits, like #1A2B3C.</Text>}
            <Pressable
              accessibilityRole="button"
              onPress={detectColor}
              disabled={detecting || busy}
              style={[styles.bgButton, (detecting || busy) && styles.disabled]}>
              {detecting ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.bgButtonText}>Auto-detect color</Text>
              )}
            </Pressable>
            {colorNote && <Text style={styles.note}>{colorNote}</Text>}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            onPress={save}
            disabled={busy}
            style={[styles.save, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} disabled={busy} style={styles.delete}>
            <Text style={styles.deleteText}>Delete item</Text>
          </Pressable>
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
    </SafeAreaView>
  );
}

function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  flex: { flex: 1 },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  back: { color: colors.inkSoft, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  photo: { aspectRatio: 1 },
  image: { flex: 1 },
  field: { gap: spacing.sm },
  label: { color: colors.inkSoft, fontFamily: fonts.bold, fontSize: fontSizes.label, letterSpacing: 1.2 },
  input: {
    height: 52,
    borderRadius: radius.thumb,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.pill,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.hover,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontFamily: fonts.medium, fontSize: fontSizes.sm },
  chipTextActive: { color: colors.white },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  swatchSelected: { borderWidth: 3, borderColor: colors.ink },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hexPreview: {
    width: 40,
    height: 40,
    borderRadius: radius.thumb,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  hexInput: { flex: 1, fontFamily: fonts.semibold, letterSpacing: 1 },
  clear: { color: colors.inkSoft, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: fontSizes.sm },
  save: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  disabled: { opacity: 0.4 },
  bgButton: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.pill,
  },
  bgButtonText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  note: { color: colors.inkSoft, fontFamily: fonts.medium, fontSize: fontSizes.xs },
  saveText: { color: colors.white, fontFamily: fonts.semibold, fontSize: fontSizes.md },
  delete: { height: 46, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
});
