import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, gradients, radius, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  // Layout of the button in its parent, e.g. { flex: 1 }.
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'sm';
  accessibilityLabel?: string;
};

// primary: brand gradient pill (white text, ~4.6:1 or better)
// secondary: frosted cream pill with ink text
// danger: solid danger pill
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  size = 'md',
  accessibilityLabel,
}: Props) {
  const inactive = disabled || loading;
  const height = size === 'md' ? 52 : 42;
  const textColor = variant === 'secondary' ? colors.ink : colors.white;

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <Text style={[styles.text, { color: textColor }, size === 'sm' && styles.textSm]}>{label}</Text>
  );

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      containerStyle={style}
      style={[styles.shadow, variant === 'secondary' && styles.flat, inactive && styles.inactive]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.body, { height }]}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.body,
            { height },
            variant === 'secondary' ? styles.secondary : styles.danger,
          ]}>
          {content}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.pill,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 4,
  },
  flat: {
    shadowOpacity: 0.25,
    elevation: 1,
  },
  inactive: {
    opacity: 0.45,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  secondary: {
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },
  textSm: {
    fontSize: fontSizes.sm,
  },
});
