import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, radius } from '../theme/tokens';
import { PressableScale } from './PressableScale';

type Props = {
  url?: string;
  label: string;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// A clothing photo tile. Pressable (with spring + haptic) only when onPress is
// given, so it can sit inside another pressable without nesting buttons.
export function ItemThumb({ url, label, size = 84, selected, onPress, style }: Props) {
  const body = (
    <View style={[styles.tile, { width: size, height: size * (4 / 3) }, selected && styles.selected, style]}>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} />
      ) : (
        <Text style={styles.fallback} numberOfLines={2}>
          {label}
        </Text>
      )}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      pressedScale={0.93}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
    borderRadius: radius.thumb,
    backgroundColor: colors.thumb,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    padding: 4,
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    fontSize: fontSizes.label,
    textAlign: 'center',
  },
});
