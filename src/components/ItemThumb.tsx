import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, radius } from '../theme/tokens';

type Props = {
  url?: string;
  label: string;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// A clothing photo tile. Pressable only when onPress is given.
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
    borderRadius: radius.thumb,
    backgroundColor: colors.thumb,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderColor: colors.ink,
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
