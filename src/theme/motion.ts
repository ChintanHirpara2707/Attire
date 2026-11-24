import { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { motion, springs } from './tokens';

// Shared entrance: fade up with a soft spring, staggered by index.
// Follows the system "reduce motion" setting.
export const enter = (index: number) =>
  FadeInDown.delay(80 + Math.min(index, 12) * motion.staggerMs)
    .springify()
    .damping(springs.gentle.damping)
    .stiffness(springs.gentle.stiffness)
    .reduceMotion(ReduceMotion.System);
