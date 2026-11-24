import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '../../../components/Glass';
import { useProfileStore } from '../../../store/profileStore';
import { colors, fonts, fontSizes, spacing } from '../../../theme/tokens';

export default function ClosetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfileStore((s) => s.profiles.find((p) => p.id === id));
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  // Only reachable after select() succeeded (PIN checked); otherwise go back to Profiles.
  if (!profile || activeProfileId !== id) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.root}>
      <Pressable
        accessibilityRole="button"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={8}>
        <Text style={styles.back}>‹ Profiles</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {profile.name}
      </Text>
      <Text style={styles.subtitle}>Closet</Text>
      <Glass style={styles.empty}>
        <View style={styles.emptyBody}>
          <Text style={styles.emptyTitle}>Your closet is empty</Text>
          <Text style={styles.emptyText}>Adding clothes is coming next.</Text>
        </View>
      </Glass>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  back: {
    marginTop: spacing.md,
    color: colors.inkSoft,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
  },
  title: {
    marginTop: spacing.xl,
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
  empty: {
    marginTop: spacing.xl,
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
