import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '../../../components/Glass';
import { ProfilePrompt } from '../../../components/ProfilePrompt';
import { getSignedUrls, type Item } from '../../../services/items';
import { deleteOutfit, listOutfits, toggleFavorite, type OutfitWithItems } from '../../../services/outfits';
import { useProfileStore } from '../../../store/profileStore';
import { colors, fonts, fontSizes, radius, spacing } from '../../../theme/tokens';

type Loaded = { outfits: OutfitWithItems[]; urls: Record<string, string> };

const photoPath = (i: Item) => i.image_path ?? i.original_path;

export default function OutfitsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const allowed = activeProfileId === id;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<OutfitWithItems | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      let active = true;
      (async () => {
        try {
          const outfits = await listOutfits(id);
          const paths = [...new Set(outfits.flatMap((o) => o.items.flatMap((i) => (photoPath(i) ? [photoPath(i) as string] : []))))];
          const urls = await getSignedUrls(paths);
          if (active) {
            setLoaded({ outfits, urls });
            setError(null);
          }
        } catch (e) {
          if (active) setError(e instanceof Error ? e.message : 'Could not load outfits.');
        }
      })();
      return () => {
        active = false;
      };
    }, [allowed, id]),
  );

  if (!allowed) return <Redirect href="/" />;

  const setOutfits = (update: (list: OutfitWithItems[]) => OutfitWithItems[]) =>
    setLoaded((l) => (l ? { ...l, outfits: update(l.outfits) } : l));

  const favorite = async (outfit: OutfitWithItems) => {
    const next = !outfit.favorite;
    setOutfits((list) => list.map((o) => (o.id === outfit.id ? { ...o, favorite: next } : o)));
    try {
      await toggleFavorite(outfit.id, next);
    } catch (e) {
      setOutfits((list) => list.map((o) => (o.id === outfit.id ? { ...o, favorite: !next } : o)));
      setError(e instanceof Error ? e.message : 'Could not update favorite.');
    }
  };

  const remove = async (): Promise<string | null> => {
    if (!toDelete) return null;
    try {
      await deleteOutfit(toDelete.id);
      setOutfits((list) => list.filter((o) => o.id !== toDelete.id));
      setToDelete(null);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not delete.';
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <FlatList
        data={loaded?.outfits ?? []}
        keyExtractor={(o) => o.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Outfits</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/profile/${id}/builder`)}
                style={styles.add}>
                <Text style={styles.addText}>+ Build</Text>
              </Pressable>
            </View>
            {error && loaded && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          !loaded ? (
            error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <ActivityIndicator color={colors.ink} />
            )
          ) : (
            <Glass>
              <View style={styles.emptyBody}>
                <Text style={styles.emptyTitle}>No outfits yet</Text>
                <Text style={styles.muted}>Build one by hand or tap Suggest in the builder.</Text>
              </View>
            </Glass>
          )
        }
        renderItem={({ item: outfit }) => (
          <Glass style={styles.card}>
            <Collage items={outfit.items} urls={loaded?.urls ?? {}} />
            <View style={styles.cardFooter}>
              <Text style={styles.name} numberOfLines={1}>
                {outfit.name || 'Outfit'}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={outfit.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  accessibilityState={{ selected: outfit.favorite }}
                  onPress={() => favorite(outfit)}
                  hitSlop={8}>
                  <Text style={[styles.star, outfit.favorite && styles.starOn]}>{outfit.favorite ? '★' : '☆'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${outfit.name || 'outfit'}`}
                  onPress={() => setToDelete(outfit)}
                  hitSlop={8}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </Glass>
        )}
      />
      <ProfilePrompt
        key={toDelete?.id ?? 'closed'}
        visible={toDelete !== null}
        title={`Delete ${toDelete?.name || 'this outfit'}? Your clothes stay in the closet.`}
        confirmLabel="Delete"
        destructive
        askPin={false}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </SafeAreaView>
  );
}

// Up to four photos in a 2x2 grid.
function Collage({ items, urls }: { items: Item[]; urls: Record<string, string> }) {
  const shown = items.slice(0, 4);
  return (
    <View style={styles.collage}>
      {shown.map((i) => {
        const p = photoPath(i);
        const url = p ? urls[p] : undefined;
        return (
          <View key={i.id} style={[styles.tile, shown.length === 1 && styles.tileFull]}>
            {url ? <Image source={{ uri: url }} style={styles.tileImage} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
  gridRow: { gap: spacing.md },
  header: { gap: spacing.xl, marginBottom: spacing.sm },
  back: { marginTop: spacing.md, color: colors.inkSoft, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontFamily: fonts.black, fontSize: 40, letterSpacing: -1.5 },
  add: {
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  addText: { color: colors.white, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: fontSizes.sm },
  muted: { color: colors.inkSoft, fontFamily: fonts.regular, fontSize: fontSizes.sm },
  emptyBody: { padding: spacing.xl, gap: spacing.xs },
  emptyTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.md },
  card: { flex: 1 / 2 },
  collage: { flexDirection: 'row', flexWrap: 'wrap', aspectRatio: 1 },
  tile: { width: '50%', height: '50%', padding: 1 },
  tileFull: { width: '100%', height: '100%' },
  tileImage: { flex: 1, borderRadius: radius.thumb },
  cardFooter: { padding: spacing.md, gap: spacing.xs },
  name: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  star: { color: colors.inkSoft, fontSize: 22 },
  starOn: { color: colors.ink },
  delete: { color: colors.danger, fontFamily: fonts.semibold, fontSize: fontSizes.xs },
});
