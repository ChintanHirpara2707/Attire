import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, gradients, radius, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';

export const FLOATING_BUTTON_HEIGHT = 56;

// Space a scrolling list should leave at its bottom so the pill never covers content.
export function useFloatingButtonSpace(): number {
  const insets = useSafeAreaInsets();
  return FLOATING_BUTTON_HEIGHT + insets.bottom + spacing.xxl * 2;
}

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

// Brand-gradient pill floating at the bottom centre of the screen.
// Render it via <Screen overlay={...}> so it sits above the content.
export function FloatingButton({ label, onPress, accessibilityLabel }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInUp.delay(320).springify().reduceMotion(ReduceMotion.System)}
      style={[styles.wrap, { bottom: insets.bottom + spacing.xl }]}
      pointerEvents="box-none">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        pressedScale={0.94}
        style={styles.shadow}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.pill}>
          <Text style={styles.plus}>+</Text>
          <Text style={styles.text}>{label}</Text>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shadow: {
    borderRadius: radius.pill,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  pill: {
    height: FLOATING_BUTTON_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
  },
  plus: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 26,
  },
  text: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },
});
