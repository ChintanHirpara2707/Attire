import { BlurView } from 'expo-blur';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, glass, radius } from '../theme/tokens';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  // Android only: ref to the BlurTargetView that holds what is behind the glass.
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
};

export function Glass({ children, style, blurTarget }: Props) {
  return (
    <View style={[styles.shadow, style]}>
      <BlurView
        intensity={glass.intensity}
        tint="light"
        blurTarget={blurTarget}
        blurMethod={blurTarget ? 'dimezisBlurViewSdk31Plus' : 'none'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: glass.border,
    borderTopColor: glass.highlight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 25,
  },
  tint: {
    backgroundColor: glass.gradient[1],
  },
});
