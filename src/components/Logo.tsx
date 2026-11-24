import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

import { radius } from '../theme/tokens';

const LOGO: ImageSourcePropType = require('../../assets/logo.png');

// Real pixel size of assets/logo.png, used if the platform can't report it.
const FALLBACK_SIZE = { width: 1624, height: 1586 };

function logoAspectRatio(): number {
  // resolveAssetSource reads the bundled image's real size on iOS/Android;
  // it may be missing on web, so fall back to the known size.
  const resolved = typeof Image.resolveAssetSource === 'function' ? Image.resolveAssetSource(LOGO) : null;
  if (resolved?.width && resolved.height) return resolved.width / resolved.height;
  return FALLBACK_SIZE.width / FALLBACK_SIZE.height;
}

const ASPECT_RATIO = logoAspectRatio();

type Props = {
  // Share of the parent's width, e.g. '70%'.
  width?: `${number}%`;
  maxWidth?: number;
};

// The Attire logo (hanger mark, name and "Wear your aura"), scaled to its container.
export function Logo({ width = '70%', maxWidth = 280 }: Props) {
  return (
    <Image
      source={LOGO}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Attire. Wear your aura."
      style={[styles.logo, { width, maxWidth, aspectRatio: ASPECT_RATIO }]}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
    height: undefined,
    borderRadius: radius.card,
  },
});
