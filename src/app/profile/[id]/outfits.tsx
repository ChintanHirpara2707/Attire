import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FloatingButton, useFloatingButtonSpace } from '../../../components/FloatingButton';
import { Glass } from '../../../components/Glass';
import { PressableScale } from '../../../components/PressableScale';
import { ProfilePrompt } from '../../../components/ProfilePrompt';
import { Screen } from '../../../components/Screen';
import { getSignedUrls, type Item } from '../../../services/items';
import { deleteOutfit, listOutfits, toggleFavorite, type OutfitWithItems } from '../../../services/outfits';
import { useProfileStore } from '../../../store/profileStore';
import { enter } from '../../../theme/motion';
import { colors, fonts, fontSizes, radius, spacing, textStyles } from '../../../theme/tokens';

type Loaded = { outfits: OutfitWithItems[]; urls: Record<string, string> };

const photoPath = (i: Item) => i.image_path ?? i.original_path;

export default function OutfitsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const allowed = activeProfileId === id;
  const bottomSpace = useFloatingButtonSpace();

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
    <Screen
      edges={['top', 'left', 'right']}
      overlay={<FloatingButton label="Build outfit" onPress={() => router.push(`/profile/${id}/builder`)} />}>
      <FlatList
        data={loaded?.outfits ?? []}
        keyExtractor={(o) => o.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.list, { paddingBottom: bottomSpace }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
              <Text style={textStyles.back}>‹ Closet</Text>
            </Pressable>
            <Animated.View entering={enter(0)} style={styles.headingBlock}>
              <Text style={textStyles.title} accessibilityRole="header">
                Outfits
              </Text>
              <Text style={textStyles.subtitle}>Your saved looks, favourites first.</Text>
            </Animated.View>
            {error && loaded && <Text style={textStyles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          !loaded ? (
            error ? (
              <Text style={textStyles.error}>{error}</Text>
            ) : (
              <ActivityIndicator color={colors.accent} />
            )
          ) : (
            <Animated.View entering={enter(1)}>
              <Glass>
                <View style={styles.emptyBody}>
                  <Text style={textStyles.heading}>No outfits yet</Text>
                  <Text style={textStyles.muted}>Build one by hand or tap Suggest in the builder.</Text>
                </View>
              </Glass>
            </Animated.View>
          )
        }
        renderItem={({ item: outfit, index }) => (
          <Animated.View entering={enter(index + 1)} style={styles.cellWrap}>
            <Glass>
              <Collage items={outfit.items} urls={loaded?.urls ?? {}} />
              <View style={styles.cardFooter}>
                <Text style={styles.name} numberOfLines={1}>
                  {outfit.name || 'Outfit'}
                </Text>
                <View style={styles.actions}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={outfit.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    accessibilityState={{ selected: outfit.favorite }}
                    onPress={() => favorite(outfit)}
                    pressedScale={0.8}
                    hitSlop={8}>
                    <Text style={[styles.star, outfit.favorite && styles.starOn]}>{outfit.favorite ? '★' : '☆'}</Text>
                  </PressableScale>
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
          </Animated.View>
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
    </Screen>
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
            {url ? <Image source={{ uri: url }} style={styles.tileImage} /> : <View style={styles.tileEmpty} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  gridRow: { gap: spacing.md },
  header: { gap: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm },
  headingBlock: { gap: spacing.xs },
  emptyBody: { padding: spacing.xl, gap: spacing.xs },
  cellWrap: { flex: 1 / 2 },
  collage: { flexDirection: 'row', flexWrap: 'wrap', aspectRatio: 1, padding: 4 },
  tile: { width: '50%', height: '50%', padding: 2 },
  tileFull: { width: '100%', height: '100%' },
  tileImage: { flex: 1, borderRadius: radius.thumb },
  tileEmpty: { flex: 1, borderRadius: radius.thumb, backgroundColor: colors.thumb },
  cardFooter: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  name: { color: colors.ink, fontFamily: fonts.display, fontSize: fontSizes.md },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  star: { color: colors.inkSoft, fontSize: 24 },
  starOn: { color: colors.accent },
  delete: { color: colors.danger, fontFamily: fonts.semibold, fontSize: fontSizes.xs },
});
