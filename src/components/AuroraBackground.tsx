import { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, palette } from '../theme/tokens';

// Soft colour fields drifting slowly behind the content.
// Each blob is a stack of faint concentric circles, which reads as a blurred
// radial glow on every platform (Expo Go, dev build, web) without a blur view.
// Only transform and opacity are animated. With "reduce motion" on, it is static.

type BlobSpec = {
  color: string;
  size: number; // share of screen width
  x: number; // centre, share of width
  y: number; // centre, share of height
  dx: number; // drift distance, share of width
  dy: number;
  durationMs: number;
  opacity: number;
};

const BLOBS: BlobSpec[] = [
  { color: palette.gold, size: 1.1, x: 0.15, y: 0.08, dx: 0.12, dy: 0.06, durationMs: 17000, opacity: 0.55 },
  { color: palette.ember, size: 1.0, x: 0.95, y: 0.22, dx: -0.14, dy: 0.08, durationMs: 21000, opacity: 0.38 },
  { color: palette.wine, size: 1.2, x: 0.05, y: 0.75, dx: 0.1, dy: -0.07, durationMs: 24000, opacity: 0.22 },
  { color: palette.plum, size: 1.0, x: 0.9, y: 0.95, dx: -0.1, dy: -0.06, durationMs: 19000, opacity: 0.2 },
];

const RINGS = 9; // more rings = smoother falloff

function Blob({ spec, width, height, still }: { spec: BlobSpec; width: number; height: number; still: boolean }) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    t.value = withRepeat(
      withTiming(1, { duration: spec.durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [still, spec.durationMs, t]);

  const size = spec.size * width;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: spec.opacity * (0.85 + 0.15 * t.value),
    transform: [
      { translateX: t.value * spec.dx * width },
      { translateY: t.value * spec.dy * height },
      { scale: 1 + 0.08 * t.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          left: spec.x * width - size / 2,
          top: spec.y * height - size / 2,
        },
        animatedStyle,
      ]}>
      {Array.from({ length: RINGS }, (_, i) => {
        const share = 1 - i / RINGS; // 1 .. ~0.1
        const ring = size * share;
        return (
          <View
            key={i}
            style={[
              styles.ring,
              {
                width: ring,
                height: ring,
                borderRadius: ring / 2,
                backgroundColor: spec.color,
                // Inner rings stack up, so the centre is strongest.
                opacity: 0.16,
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

export function AuroraBackground() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none">
      {BLOBS.map((spec, i) => (
        <Blob key={i} spec={spec} width={width} height={height} still={reduceMotion} />
      ))}
      {/* A cream veil keeps text on top comfortably readable. */}
      <View style={[StyleSheet.absoluteFill, styles.veil]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Web can blur cheaply, which smooths the ring edges completely.
    ...(Platform.OS === 'web' ? { filter: 'blur(40px)' } : null),
  },
  ring: {
    position: 'absolute',
  },
  veil: {
    backgroundColor: 'rgba(249,246,240,0.35)',
  },
});
