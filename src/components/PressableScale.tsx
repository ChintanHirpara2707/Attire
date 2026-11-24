import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { springs } from '../theme/tokens';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  // Style of the animated content (what scales).
  style?: StyleProp<ViewStyle>;
  // Layout style of the outer pressable (e.g. flex: 1 to fill a row).
  containerStyle?: StyleProp<ViewStyle>;
  // How far it shrinks while pressed (0.96 = 4%).
  pressedScale?: number;
  haptic?: boolean;
};

// Pressable with a springy shrink on press and a light haptic tap (phones only).
// With "reduce motion" on, it dims slightly instead of scaling.
export function PressableScale({
  children,
  style,
  containerStyle,
  pressedScale = 0.96,
  haptic = true,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 - pressed.value * 0.15 : 1,
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * (1 - pressedScale) }],
  }));

  return (
    <Pressable
      {...rest}
      style={containerStyle}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = reduceMotion ? withTiming(1, { duration: 80 }) : withSpring(1, springs.press);
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = reduceMotion ? withTiming(0, { duration: 120 }) : withSpring(0, springs.press);
        onPressOut?.(e);
      }}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
