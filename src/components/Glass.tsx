import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, glass, radius } from '../theme/tokens';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  // Android only: ref to the BlurTargetView that holds what is behind the glass.
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
};

// Soft frosted card: blur + warm tint + a top-down inner highlight and a
// hairline light edge, with a plum-tinted shadow.
export function Glass({ children, style, blurTarget }: Props) {
  return (
    <View style={[styles.shadow, style]}>
      <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
        <BlurView
          intensity={glass.intensity}
          tint="light"
          blurTarget={blurTarget}
          blurMethod={blurTarget ? 'dimezisBlurViewSdk31Plus' : 'none'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
        <LinearGradient
          colors={[glass.gradient[0], glass.gradient[1], glass.gradient[2]]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.edge]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 6,
    // Children (photos) must be clipped to the rounded corners, as before.
    overflow: 'hidden',
  },
  clip: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  tint: {
    backgroundColor: glass.tint,
  },
  // Light top edge reads as an inner highlight; the rest is a faint hairline.
  edge: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: glass.border,
    borderTopColor: glass.highlight,
  },
});
