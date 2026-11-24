import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { ItemThumb } from '../../../components/ItemThumb';
import { getSignedUrls, listItems, type Item } from '../../../services/items';
import { createOutfit } from '../../../services/outfits';
import { useProfileStore } from '../../../store/profileStore';
import { colors, fonts, fontSizes, radius, spacing } from '../../../theme/tokens';
import { RULE_LABELS, scoreOutfit, suggestOutfits, type Suggestion } from '../../../utils/colorMatch';

type Slot = 'top' | 'bottom' | 'shoes';
const SLOTS: { key: Slot; title: string }[] = [
  { key: 'top', title: 'TOP' },
  { key: 'bottom', title: 'BOTTOM' },
  { key: 'shoes', title: 'SHOES' },
];
const EXTRA_CATEGORIES = ['outerwear', 'accessory'];
const SHUFFLE_JITTER = 0.2;

type Closet = { items: Item[]; urls: Record<string, string> };
type Picks = Record<Slot, string | null>;

const photoPath = (i: Item) => i.image_path ?? i.original_path;
const itemLabel = (i: Item) => i.name || i.color_name || i.category || 'Item';

export default function BuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const allowed = activeProfileId === id;

  const [closet, setCloset] = useState<Closet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Picks>({ top: null, bottom: null, shoes: null });
  const [extras, setExtras] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion<Item>[] | null>(null);
  const [suggestMessage, setSuggestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      try {
        const items = await listItems(id);
        const urls = await getSignedUrls(items.flatMap((i) => (photoPath(i) ? [photoPath(i) as string] : [])));
        if (active) setCloset({ items, urls });
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : 'Could not load the closet.');
      }
    })();
    return () => {
      active = false;
    };
  }, [allowed, id]);

  const byId = useMemo(() => new Map((closet?.items ?? []).map((i) => [i.id, i])), [closet]);
  const selectedIds = [picks.top, picks.bottom, picks.shoes, ...extras].filter((x): x is string => !!x);
  const selectedItems = selectedIds.flatMap((x) => (byId.get(x) ? [byId.get(x) as Item] : []));
  const current = selectedItems.some((i) => i.color_hex) ? scoreOutfit(selectedItems) : null;

  if (!allowed) return <Redirect href="/" />;

  const urlFor = (i: Item) => {
    const p = photoPath(i);
    return p ? closet?.urls[p] : undefined;
  };

  const suggest = (jitter: number) => {
    const { suggestions: found, missing } = suggestOutfits(closet?.items ?? [], 5, jitter);
    setSuggestions(found);
    setSuggestMessage(
      missing.length > 0
        ? `To get suggestions, add a ${missing.join(', ')} with a category and a color.`
        : found.length === 0
          ? 'No suggestions yet.'
          : null,
    );
  };

  const save = async (itemIds: string[], fallbackName: string) => {
    setBusy(true);
    setError(null);
    try {
      await createOutfit(id, name.trim() || fallbackName, itemIds);
      router.replace(`/profile/${id}/outfits`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the outfit.');
      setBusy(false);
    }
  };

  const applySuggestion = (s: Suggestion<Item>) => {
    const find = (c: string) => s.items.find((i) => i.category === c)?.id ?? null;
    setPicks({ top: find('top'), bottom: find('bottom'), shoes: find('shoes') });
    setExtras([]);
  };

  if (!closet) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        {loadError ? <Text style={styles.error}>{loadError}</Text> : <ActivityIndicator color={colors.ink} />}
      </SafeAreaView>
    );
  }

  const extraItems = closet.items.filter((i) => i.category && EXTRA_CATEGORIES.includes(i.category));
  const uncategorized = closet.items.filter((i) => !i.category).length;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>‹ Closet</Text>
          </Pressable>
          <Text style={styles.title}>Build an outfit</Text>
          {uncategorized > 0 && (
            <Text style={styles.muted}>
              {uncategorized} item{uncategorized === 1 ? '' : 's'} without a category {uncategorized === 1 ? 'is' : 'are'}{' '}
              hidden. Set one on the item screen.
            </Text>
          )}

          {SLOTS.map(({ key, title }) => {
            const options = closet.items.filter((i) => i.category === key);
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{title}</Text>
                {options.length === 0 ? (
                  <Text style={styles.muted}>No {key} in your closet yet.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                    {options.map((i) => (
                      <ItemThumb
                        key={i.id}
                        url={urlFor(i)}
                        label={itemLabel(i)}
                        selected={picks[key] === i.id}
                        onPress={() => setPicks((p) => ({ ...p, [key]: p[key] === i.id ? null : i.id }))}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          })}

          {extraItems.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>EXTRAS (OPTIONAL)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {extraItems.map((i) => (
                  <ItemThumb
                    key={i.id}
                    url={urlFor(i)}
                    label={itemLabel(i)}
                    selected={extras.includes(i.id)}
                    onPress={() =>
                      setExtras((x) => (x.includes(i.id) ? x.filter((e) => e !== i.id) : [...x, i.id]))
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {current && (
            <Text style={styles.score}>
              {RULE_LABELS[current.rule]} · {Math.round(current.score * 100)}% match
            </Text>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>NAME (OPTIONAL)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sunday brunch"
              placeholderTextColor={colors.inkSoft}
              maxLength={60}
              accessibilityLabel="Outfit name, optional"
              style={styles.input}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => suggest(0)}
              disabled={busy}
              style={[styles.button, styles.secondary]}>
              <Text style={styles.secondaryText}>Suggest</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => save(selectedIds, 'My outfit')}
              disabled={busy || selectedIds.length === 0}
              style={[styles.button, styles.primary, (busy || selectedIds.length === 0) && styles.disabled]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Save outfit</Text>}
            </Pressable>
          </View>

          {suggestMessage && <Text style={styles.muted}>{suggestMessage}</Text>}

          {suggestions && suggestions.length > 0 && (
            <View style={styles.field}>
              <View style={styles.suggestHeader}>
                <Text style={styles.label}>SUGGESTIONS</Text>
                <Pressable accessibilityRole="button" onPress={() => suggest(SHUFFLE_JITTER)} hitSlop={8}>
                  <Text style={styles.link}>Shuffle</Text>
                </Pressable>
              </View>
              {suggestions.map((s) => (
                <Glass key={s.items.map((i) => i.id).join('|')} style={styles.suggestion}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${RULE_LABELS[s.rule]} suggestion`}
                    onPress={() => applySuggestion(s)}
                    style={styles.suggestionThumbs}>
                    {s.items.map((i) => (
                      <ItemThumb key={i.id} url={urlFor(i)} label={itemLabel(i)} size={56} />
                    ))}
                  </Pressable>
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionRule}>{RULE_LABELS[s.rule]}</Text>
                    <Text style={styles.muted}>{Math.round(s.score * 100)}% match</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => save(s.items.map((i) => i.id), RULE_LABELS[s.rule])}
                      disabled={busy}
                      hitSlop={6}>
                      <Text style={styles.link}>Save</Text>
                    </Pressable>
                  </View>
                </Glass>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  flex: { flex: 1 },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  back: { color: colors.inkSoft, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  title: { color: colors.ink, fontFamily: fonts.black, fontSize: 32, letterSpacing: -1 },
  field: { gap: spacing.sm },
  label: { color: colors.inkSoft, fontFamily: fonts.bold, fontSize: fontSizes.label, letterSpacing: 1.2 },
  muted: { color: colors.inkSoft, fontFamily: fonts.medium, fontSize: fontSizes.sm },
  strip: { gap: spacing.sm },
  score: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  input: {
    height: 52,
    borderRadius: radius.thumb,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.pill,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
  },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: fontSizes.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  button: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.pill },
  disabled: { opacity: 0.4 },
  primaryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  secondaryText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  suggestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.ink, fontFamily: fonts.bold, fontSize: fontSizes.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  suggestionThumbs: { flexDirection: 'row', gap: spacing.xs },
  suggestionInfo: { flex: 1, gap: 2 },
  suggestionRule: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
});
