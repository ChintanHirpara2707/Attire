import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '../../../components/Glass';
import { getSignedUrls, listItems, type Item } from '../../../services/items';
import { useProfileStore } from '../../../store/profileStore';
import { colors, fonts, fontSizes, radius, spacing } from '../../../theme/tokens';

const COLUMNS = 3;

type Closet = { items: Item[]; urls: Record<string, string> };

export default function ClosetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfileStore((s) => s.profiles.find((p) => p.id === id));
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const allowed = !!profile && activeProfileId === id;

  const [closet, setCloset] = useState<Closet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reload whenever the screen comes into view (e.g. after adding an item).
  // Signed URLs expire, so they are fetched fresh each time too.
  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      let active = true;
      (async () => {
        try {
          const items = await listItems(id);
          const paths = items.flatMap((i) => (i.original_path ? [i.original_path] : []));
          const urls = await getSignedUrls(paths);
          if (active) {
            setCloset({ items, urls });
            setError(null);
          }
        } catch (e) {
          if (active) setError(e instanceof Error ? e.message : 'Could not load the closet.');
        }
      })();
      return () => {
        active = false;
      };
    }, [allowed, id]),
  );

  // Only reachable after select() succeeded (PIN checked); otherwise go back to Profiles.
  if (!allowed) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.root}>
      <FlatList
        data={closet?.items ?? []}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={8}>
              <Text style={styles.back}>‹ Profiles</Text>
            </Pressable>
            <View style={styles.titleRow}>
              <View style={styles.titleText}>
                <Text style={styles.title} numberOfLines={1}>
                  {profile.name}
                </Text>
                <Text style={styles.subtitle}>Closet</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add clothes"
                onPress={() => router.push(`/profile/${id}/add-item`)}
                style={styles.add}>
                <Text style={styles.addText}>+ Add</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !closet ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Glass>
              <View style={styles.emptyBody}>
                <Text style={styles.emptyTitle}>Your closet is empty</Text>
                <Text style={styles.emptyText}>Tap “+ Add” to photograph your first piece.</Text>
              </View>
            </Glass>
          )
        }
        renderItem={({ item }) => {
          const url = item.original_path ? closet?.urls[item.original_path] : undefined;
          return (
            <Glass style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.name || 'clothing item'}`}
                onPress={() => router.push(`/profile/${id}/item/${item.id}`)}>
                {url ? <Image source={{ uri: url }} style={styles.image} /> : <View style={styles.image} />}
                {item.name ? (
                  <Text style={styles.cellName} numberOfLines={1}>
                    {item.name}
                  </Text>
                ) : null}
              </Pressable>
            </Glass>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  gridRow: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xl,
    marginBottom: spacing.sm,
  },
  back: {
    marginTop: spacing.md,
    color: colors.inkSoft,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  titleText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 40,
    letterSpacing: -1.5,
  },
  subtitle: {
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
  },
  add: {
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  addText: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
  },
  cell: {
    flex: 1 / COLUMNS,
    borderRadius: radius.thumb,
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  cellName: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
  },
  emptyBody: {
    padding: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },
  emptyText: {
    color: colors.inkSoft,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
});
