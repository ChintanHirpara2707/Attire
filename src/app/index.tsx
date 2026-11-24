import { BlurTargetView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '../components/Glass';
import { Logo } from '../components/Logo';
import { ProfilePrompt } from '../components/ProfilePrompt';
import type { ProfileSummary } from '../services/profiles';
import { useProfileStore } from '../store/profileStore';
import { colors, fonts, fontSizes, radius, spacing } from '../theme/tokens';

type Pending = { profile: ProfileSummary; action: 'open' | 'delete' } | null;

export default function ProfilesScreen() {
  const backdrop = useRef<ComponentRef<typeof View>>(null);
  const { profiles, loading, error, load, select, remove } = useProfileStore();
  const [pending, setPending] = useState<Pending>(null);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (profile: ProfileSummary) => {
    if (profile.hasPin) {
      setPending({ profile, action: 'open' });
      return;
    }
    if (await select(profile.id)) router.push(`/profile/${profile.id}`);
  };

  const confirm = async (pin: string): Promise<string | null> => {
    if (!pending) return null;
    const { profile, action } = pending;
    try {
      if (action === 'open') {
        if (!(await select(profile.id, pin))) return 'Wrong PIN.';
        setPending(null);
        router.push(`/profile/${profile.id}`);
        return null;
      }
      // Deleting a PIN-protected profile also needs its PIN.
      if (profile.hasPin && !(await select(profile.id, pin))) return 'Wrong PIN.';
      await remove(profile.id);
      setPending(null);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Something went wrong.';
    }
  };

  return (
    <View style={styles.root}>
      <BlurTargetView ref={backdrop} style={StyleSheet.absoluteFill}>
        <Text style={styles.ghost} numberOfLines={1}>
          FIT
        </Text>
      </BlurTargetView>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              {/* The logo already shows the name and tagline. */}
              <Logo />
              <Text style={styles.section}>WHO&apos;S GETTING DRESSED?</Text>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : error ? (
              <Pressable accessibilityRole="button" onPress={load}>
                <Text style={styles.muted}>{error} Tap to retry.</Text>
              </Pressable>
            ) : (
              <Text style={styles.muted}>No profiles yet. Add one to start your wardrobe.</Text>
            )
          }
          renderItem={({ item }) => (
            <Glass blurTarget={backdrop} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}${item.hasPin ? ', PIN protected' : ''}`}
                onPress={() => open(item)}
                style={styles.cardMain}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.hasPin && <Text style={styles.pinTag}>PIN</Text>}
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
                onPress={() => setPending({ profile: item, action: 'delete' })}
                hitSlop={8}
                style={styles.delete}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </Glass>
          )}
          ListFooterComponent={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/add-profile')}
              style={styles.add}>
              <Text style={styles.addText}>+ Add profile</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
      <ProfilePrompt
        key={pending ? `${pending.action}-${pending.profile.id}` : 'closed'}
        visible={pending !== null}
        title={
          pending?.action === 'delete'
            ? `Delete ${pending.profile.name} and all their clothes?`
            : `Enter PIN for ${pending?.profile.name ?? ''}`
        }
        confirmLabel={pending?.action === 'delete' ? 'Delete' : 'Open'}
        destructive={pending?.action === 'delete'}
        askPin={pending?.profile.hasPin ?? false}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  ghost: {
    position: 'absolute',
    alignSelf: 'center',
    top: '18%',
    fontFamily: fonts.black,
    fontSize: 180,
    lineHeight: 180,
    letterSpacing: -7,
    color: colors.ghostText,
    textShadowColor: colors.hover,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  header: {
    marginTop: spacing.xl * 2,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
    color: colors.inkSoft,
    fontFamily: fonts.bold,
    fontSize: fontSizes.label,
    letterSpacing: 1.2,
  },
  muted: {
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.thumb,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
  },
  avatarText: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 20,
  },
  cardText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },
  pinTag: {
    color: colors.inkSoft,
    fontFamily: fonts.bold,
    fontSize: fontSizes.label,
    letterSpacing: 1.2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.chip,
    overflow: 'hidden',
  },
  delete: {
    paddingVertical: spacing.sm,
  },
  deleteText: {
    color: colors.danger,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
  },
  add: {
    marginTop: spacing.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  addText: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },
});
