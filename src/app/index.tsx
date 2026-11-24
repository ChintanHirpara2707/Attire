import { BlurTargetView } from 'expo-blur';
import { useRef, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '../components/Glass';
import { colors, fonts, fontSizes, spacing } from '../theme/tokens';

export default function ProfilesScreen() {
  const backdrop = useRef<ComponentRef<typeof View>>(null);

  return (
    <View style={styles.root}>
      <BlurTargetView ref={backdrop} style={StyleSheet.absoluteFill}>
        <Text style={styles.ghost} numberOfLines={1}>
          FIT
        </Text>
      </BlurTargetView>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Attire</Text>
          <Text style={styles.tagline}>Wear your aura.</Text>
        </View>
        <Glass blurTarget={backdrop} style={styles.card}>
          <Text style={styles.cardLabel}>PROFILES</Text>
        </Glass>
      </SafeAreaView>
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
    paddingHorizontal: spacing.xl,
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
    gap: spacing.xs,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 44,
    letterSpacing: -1.5,
  },
  tagline: {
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
  },
  card: {
    marginTop: spacing.xl * 2,
    padding: spacing.xl,
  },
  cardLabel: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: fontSizes.label,
    letterSpacing: 1.2,
  },
});
