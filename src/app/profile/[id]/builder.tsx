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
import Animated from 'react-native-reanimated';

import { Button } from '../../../components/Button';
import { Glass } from '../../../components/Glass';
import { ItemThumb } from '../../../components/ItemThumb';
import { PressableScale } from '../../../components/PressableScale';
import { Screen } from '../../../components/Screen';
import { getSignedUrls, listItems, type Item } from '../../../services/items';
import { createOutfit } from '../../../services/outfits';
import { useProfileStore } from '../../../store/profileStore';
import { enter } from '../../../theme/motion';
import { colors, fonts, fontSizes, input, radius, spacing, textStyles } from '../../../theme/tokens';
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
      <Screen style={styles.center}>
        {loadError ? <Text style={textStyles.error}>{loadError}</Text> : <ActivityIndicator color={colors.accent} />}
      </Screen>
    );
  }

  const extraItems = closet.items.filter((i) => i.category && EXTRA_CATEGORIES.includes(i.category));
  const uncategorized = closet.items.filter((i) => !i.category).length;

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={textStyles.back}>‹ Closet</Text>
          </Pressable>
          <Animated.View entering={enter(0)} style={styles.headingBlock}>
            <Text style={textStyles.title} accessibilityRole="header">
              Build an outfit
            </Text>
            <Text style={textStyles.subtitle}>Pick a piece for each slot, or let colour lead.</Text>
          </Animated.View>
          {uncategorized > 0 && (
            <Text style={textStyles.muted}>
              {uncategorized} item{uncategorized === 1 ? '' : 's'} without a category {uncategorized === 1 ? 'is' : 'are'}{' '}
              hidden. Set one on the item screen.
            </Text>
          )}

          <Animated.View entering={enter(1)}>
            <Glass style={styles.card}>
              {SLOTS.map(({ key, title }) => {
                const options = closet.items.filter((i) => i.category === key);
                return (
                  <View key={key} style={styles.field}>
                    <Text style={textStyles.label}>{title}</Text>
                    {options.length === 0 ? (
                      <Text style={textStyles.muted}>No {key} in your closet yet.</Text>
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
                  <Text style={textStyles.label}>EXTRAS (OPTIONAL)</Text>
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
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreValue}>{Math.round(current.score * 100)}%</Text>
                  <Text style={textStyles.muted}>{RULE_LABELS[current.rule]} match</Text>
                </View>
              )}
            </Glass>
          </Animated.View>

          <Animated.View entering={enter(2)} style={styles.field}>
            <Text style={textStyles.label}>NAME (OPTIONAL)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sunday brunch"
              placeholderTextColor={colors.inkSoft}
              maxLength={60}
              accessibilityLabel="Outfit name, optional"
              style={input}
            />
          </Animated.View>

          {error && <Text style={textStyles.error}>{error}</Text>}

          <Animated.View entering={enter(3)} style={styles.row}>
            <Button label="Suggest" variant="secondary" onPress={() => suggest(0)} disabled={busy} style={styles.flex} />
            <Button
              label="Save outfit"
              onPress={() => save(selectedIds, 'My outfit')}
              disabled={selectedIds.length === 0}
              loading={busy}
              style={styles.flex}
            />
          </Animated.View>

          {suggestMessage && <Text style={textStyles.muted}>{suggestMessage}</Text>}

          {suggestions && suggestions.length > 0 && (
            <View style={styles.field}>
              <View style={styles.suggestHeader}>
                <Text style={textStyles.label}>SUGGESTIONS</Text>
                <Pressable accessibilityRole="button" onPress={() => suggest(SHUFFLE_JITTER)} hitSlop={8}>
                  <Text style={styles.link}>Shuffle</Text>
                </Pressable>
              </View>
              {suggestions.map((s, index) => (
                <Animated.View key={s.items.map((i) => i.id).join('|')} entering={enter(index)}>
                  <Glass style={styles.suggestion}>
                    {/* Thumbs (use) and Save are siblings: no button inside a button on web. */}
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${RULE_LABELS[s.rule]} suggestion`}
                      onPress={() => applySuggestion(s)}
                      style={styles.suggestionThumbs}>
                      {s.items.map((i) => (
                        <ItemThumb key={i.id} url={urlFor(i)} label={itemLabel(i)} size={56} />
                      ))}
                    </PressableScale>
                    <View style={styles.suggestionInfo}>
                      <Text style={textStyles.heading} numberOfLines={1}>
                        {RULE_LABELS[s.rule]}
                      </Text>
                      <Text style={textStyles.muted}>{Math.round(s.score * 100)}% match</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Save ${RULE_LABELS[s.rule]} suggestion`}
                        onPress={() => save(s.items.map((i) => i.id), RULE_LABELS[s.rule])}
                        disabled={busy}
                        hitSlop={6}>
                        <Text style={styles.link}>Save</Text>
                      </Pressable>
                    </View>
                  </Glass>
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  body: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  headingBlock: { gap: spacing.xs },
  card: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.sm },
  strip: { gap: spacing.sm, paddingVertical: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  scoreValue: { color: colors.accent, fontFamily: fonts.display, fontSize: 28 },
  row: { flexDirection: 'row', gap: spacing.sm },
  suggestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.accent, fontFamily: fonts.bold, fontSize: fontSizes.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  suggestionThumbs: { flexDirection: 'row', gap: spacing.xs },
  suggestionInfo: { flex: 1, gap: 2 },
});
