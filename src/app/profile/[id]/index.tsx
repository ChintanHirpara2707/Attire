import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '../../../components/Button';
import { FloatingButton, useFloatingButtonSpace } from '../../../components/FloatingButton';
import { Glass } from '../../../components/Glass';
import { PressableScale } from '../../../components/PressableScale';
import { Screen } from '../../../components/Screen';
import { getSignedUrls, listItems, type Item } from '../../../services/items';
import { useProfileStore } from '../../../store/profileStore';
import { enter } from '../../../theme/motion';
import { colors, fonts, fontSizes, radius, spacing, textStyles } from '../../../theme/tokens';

const COLUMNS = 3;

type Closet = { items: Item[]; urls: Record<string, string> };

export default function ClosetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfileStore((s) => s.profiles.find((p) => p.id === id));
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const allowed = !!profile && activeProfileId === id;
  const bottomSpace = useFloatingButtonSpace();

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
          const paths = items.flatMap((i) => {
            const p = i.image_path ?? i.original_path;
            return p ? [p] : [];
          });
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
    <Screen
      edges={['top', 'left', 'right']}
      overlay={
        <FloatingButton
          label="Add clothes"
          onPress={() => router.push(`/profile/${id}/add-item`)}
        />
      }>
      <FlatList
        data={closet?.items ?? []}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.list, { paddingBottom: bottomSpace }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={8}>
              <Text style={textStyles.back}>‹ Profiles</Text>
            </Pressable>
            <Animated.View entering={enter(0)} style={styles.titleBlock}>
              <Text style={textStyles.title} numberOfLines={1} accessibilityRole="header">
                {profile.name}
              </Text>
              <Text style={textStyles.subtitle}>
                {closet ? `${closet.items.length} piece${closet.items.length === 1 ? '' : 's'} in the closet` : 'Closet'}
              </Text>
            </Animated.View>
            <Animated.View entering={enter(1)} style={styles.navRow}>
              <Button
                label="Build outfit"
                size="sm"
                onPress={() => router.push(`/profile/${id}/builder`)}
                style={styles.flex}
              />
              <Button
                label="Outfits"
                variant="secondary"
                size="sm"
                onPress={() => router.push(`/profile/${id}/outfits`)}
                style={styles.flex}
              />
            </Animated.View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text style={textStyles.error}>{error}</Text>
          ) : !closet ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Animated.View entering={enter(2)}>
              <Glass>
                <View style={styles.emptyBody}>
                  <Text style={textStyles.heading}>Your closet is empty</Text>
                  <Text style={textStyles.muted}>Tap “Add clothes” to photograph your first piece.</Text>
                </View>
              </Glass>
            </Animated.View>
          )
        }
        renderItem={({ item, index }) => {
          const path = item.image_path ?? item.original_path;
          const url = path ? closet?.urls[path] : undefined;
          return (
            <Animated.View entering={enter(index + 2)} style={styles.cellWrap}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.name || 'clothing item'}`}
                onPress={() => router.push(`/profile/${id}/item/${item.id}`)}>
                <Glass style={styles.cell}>
                  {url ? (
                    <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={styles.image} />
                  )}
                  {item.name || item.color_hex ? (
                    <View style={styles.cellFooter}>
                      {item.color_hex ? (
                        <View style={[styles.dot, { backgroundColor: item.color_hex }]} />
                      ) : null}
                      <Text style={styles.cellName} numberOfLines={1}>
                        {item.name || item.color_name || ''}
                      </Text>
                    </View>
                  ) : null}
                </Glass>
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  gridRow: { gap: spacing.md },
  header: { gap: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.md },
  titleBlock: { gap: spacing.xs },
  navRow: { flexDirection: 'row', gap: spacing.sm },
  // Each grid cell takes a third of the row (fixed even when the last row is short).
  cellWrap: { flex: 1 / COLUMNS },
  cell: { borderRadius: radius.thumb },
  image: { width: '100%', aspectRatio: 3 / 4 },
  cellFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cellName: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
  },
  emptyBody: { padding: spacing.xl, gap: spacing.xs },
});
