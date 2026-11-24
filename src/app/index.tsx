import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { FloatingButton, useFloatingButtonSpace } from '../components/FloatingButton';
import { Glass } from '../components/Glass';
import { Logo } from '../components/Logo';
import { PressableScale } from '../components/PressableScale';
import { ProfilePrompt } from '../components/ProfilePrompt';
import { Screen } from '../components/Screen';
import type { ProfileSummary } from '../services/profiles';
import { useProfileStore } from '../store/profileStore';
import { enter } from '../theme/motion';
import { colors, fonts, fontSizes, gradients, radius, sizes, spacing } from '../theme/tokens';

type Pending = { profile: ProfileSummary; action: 'open' | 'delete' } | null;

export default function ProfilesScreen() {
  const bottomSpace = useFloatingButtonSpace();
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
    <Screen
      edges={['top', 'left', 'right']}
      overlay={<FloatingButton label="Add profile" onPress={() => router.push('/add-profile')} />}>
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[
            styles.list,
            // Leave room so the floating pill never covers the last card.
            { paddingBottom: bottomSpace },
          ]}
          ListHeaderComponent={
            <View style={styles.header}>
              <Animated.View entering={FadeIn.duration(700).reduceMotion(ReduceMotion.System)}>
                {/* The logo already shows the name and tagline. */}
                <Logo width="62%" maxWidth={260} />
              </Animated.View>
              <Animated.View entering={enter(1)} style={styles.headingBlock}>
                <Text style={styles.heading} accessibilityRole="header">
                  Who&apos;s getting dressed?
                </Text>
                <Text style={styles.subheading}>Choose a wardrobe to open.</Text>
              </Animated.View>
            </View>
          }
          ListEmptyComponent={
            <Animated.View entering={enter(2)} style={styles.empty}>
              {loading ? (
                <ActivityIndicator color={colors.accent} />
              ) : error ? (
                <Pressable accessibilityRole="button" onPress={load}>
                  <Text style={styles.muted}>{error} Tap to retry.</Text>
                </Pressable>
              ) : (
                <Text style={styles.muted}>No profiles yet. Add one to start your wardrobe.</Text>
              )}
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={enter(index + 2)}>
              {/* Open and Delete are siblings, not nested: on web a button
                  inside a button is invalid HTML and React reports an error. */}
              <Glass style={styles.card}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.name}${item.hasPin ? ', PIN protected' : ''}`}
                  onPress={() => open(item)}
                  pressedScale={0.97}
                  containerStyle={styles.cardPress}
                  style={styles.cardMain}>
                  <LinearGradient
                    colors={gradients.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <View style={styles.cardText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.hasPin && <Text style={styles.pinTag}>PIN</Text>}
                  </View>
                </PressableScale>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                  onPress={() => setPending({ profile: item, action: 'delete' })}
                  hitSlop={10}
                  style={styles.delete}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </Glass>
            </Animated.View>
          )}
        />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: 560, // keeps cards a comfortable width on web/tablets
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.xl,
  },
  headingBlock: {
    gap: spacing.xs,
  },
  heading: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: fontSizes.display,
    lineHeight: fontSizes.display * 1.15,
    letterSpacing: -0.5,
  },
  subheading: {
    color: colors.inkSoft,
    fontFamily: fonts.displayItalic,
    fontSize: fontSizes.md,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  muted: {
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  cardPress: {
    flex: 1,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
  },
  avatar: {
    width: sizes.avatar,
    height: sizes.avatar,
    borderRadius: sizes.avatar / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 22,
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
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
  },
  pinTag: {
    color: colors.accentDeep,
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
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
  },
});
