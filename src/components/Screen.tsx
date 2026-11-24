import { BlurTargetView } from 'expo-blur';
import { createContext, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '../theme/tokens';
import { AuroraBackground } from './AuroraBackground';

type Backdrop = RefObject<ComponentRef<typeof View> | null> | null;

// Lets every Glass on the screen blur the aurora on Android without passing refs.
export const BackdropContext = createContext<Backdrop>(null);

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  // Content drawn outside the safe area, above everything (floating buttons, modals).
  overlay?: ReactNode;
};

// Page shell: aurora background + safe area. Android blurs only what is inside
// the BlurTargetView, so the aurora lives there.
export function Screen({ children, style, edges, overlay }: Props) {
  const backdrop = useRef<ComponentRef<typeof View>>(null);
  return (
    <BackdropContext.Provider value={backdrop}>
      <View style={styles.root}>
        <BlurTargetView ref={backdrop} style={StyleSheet.absoluteFill}>
          <AuroraBackground />
        </BlurTargetView>
        <SafeAreaView style={[styles.safe, style]} edges={edges}>
          {children}
        </SafeAreaView>
        {overlay}
      </View>
    </BackdropContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
});
