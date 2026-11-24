import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuroraBackground } from '../components/AuroraBackground';
import { Glass } from '../components/Glass';
import { Logo } from '../components/Logo';
import { PressableScale } from '../components/PressableScale';
import { ProfilePrompt } from '../components/ProfilePrompt';
import type { ProfileSummary } from '../services/profiles';
import { useProfileStore } from '../store/profileStore';
import { colors, fonts, fontSizes, gradients, motion, radius, sizes, spacing, springs } from '../theme/tokens';

type Pending = { profile: ProfileSummary; action: 'open' | 'delete' } | null;

const PILL_HEIGHT = 56;

// Entrance: fade up with a soft spring, staggered. Skipped with "reduce motion".
const enter = (index: number) =>
  FadeInDown.delay(120 + index * motion.staggerMs)
    .springify()
    .damping(springs.gentle.damping)
    .stiffness(springs.gentle.stiffness)
    .reduceMotion(ReduceMotion.System);

export default function ProfilesScreen() {
  const backdrop = useRef<ComponentRef<typeof View>>(null);
  const insets = useSafeAreaInsets();
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
      {/* Android blurs only what is inside the BlurTargetView, so the aurora lives there. */}
      <BlurTargetView ref={backdrop} style={StyleSheet.absoluteFill}>
        <AuroraBackground />
      </BlurTargetView>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[
            styles.list,
            // Leave room so the floating pill never covers the last card.
            { paddingBottom: PILL_HEIGHT + insets.bottom + spacing.xxl * 2 },
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
              <Glass blurTarget={backdrop} style={styles.card}>
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
      </SafeAreaView>

      {/* Floating "Add profile" pill */}
      <Animated.View
        entering={FadeInUp.delay(320).springify().reduceMotion(ReduceMotion.System)}
        style={[styles.pillWrap, { bottom: insets.bottom + spacing.xl }]}
        pointerEvents="box-none">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Add profile"
          onPress={() => router.push('/add-profile')}
          pressedScale={0.94}
          style={styles.pillShadow}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.pill}>
            <Text style={styles.pillPlus}>+</Text>
            <Text style={styles.pillText}>Add profile</Text>
          </LinearGradient>
        </PressableScale>
      </Animated.View>

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
  pillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pillShadow: {
    borderRadius: radius.pill,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
  },
  pillPlus: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 26,
  },
  pillText: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },
});
