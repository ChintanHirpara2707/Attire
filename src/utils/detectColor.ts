// Finds the main color of a clothing photo.
// Crops the centre ~50% (where the garment usually is, away from the floor or
// wall behind it) and asks react-native-image-colors for its palette.
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

type GetColors = typeof import('react-native-image-colors').getColors;

const CENTER_SHARE = 0.5;
// Returned by the library when it can't read a color; we treat it as "no result".
const FALLBACK = '#010203';

// Loaded on first use: the native module is missing in Expo Go and we skip web.
function loadGetColors(): GetColors | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('react-native-image-colors') as { getColors: GetColors }).getColors;
  } catch {
    return null;
  }
}

function normalizeHex(value: string | undefined): string | null {
  if (!value) return null;
  let hex = value.trim().replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6); // drop alpha
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const out = `#${hex.toUpperCase()}`;
  return out === FALLBACK.toUpperCase() ? null : out;
}

async function cropCenter(uri: string): Promise<string> {
  const full = await ImageManipulator.manipulate(uri).renderAsync();
  const width = Math.round(full.width * CENTER_SHARE);
  const height = Math.round(full.height * CENTER_SHARE);
  const cropped = await ImageManipulator.manipulate(uri)
    .crop({
      originX: Math.round((full.width - width) / 2),
      originY: Math.round((full.height - height) / 2),
      width,
      height,
    })
    .renderAsync();
  const saved = await cropped.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return saved.uri;
}

/**
 * Returns the main color of a local JPEG as #RRGGBB, or null when it can't
 * (native module missing, or no usable color).
 * Each platform's palette differs, so the field is chosen per platform:
 * - Android: `dominant` (most common pixel color), then `average`
 * - iOS: `background` (the most prominent color), then `primary`
 */
export async function detectColorHex(uri: string): Promise<string | null> {
  const getColors = loadGetColors();
  if (!getColors) return null;

  const croppedUri = await cropCenter(uri);
  try {
    const result = await getColors(croppedUri, { fallback: FALLBACK, quality: 'high', pixelSpacing: 2 });
    switch (result.platform) {
      case 'android':
        return normalizeHex(result.dominant) ?? normalizeHex(result.average);
      case 'ios':
        return normalizeHex(result.background) ?? normalizeHex(result.primary);
      default:
        return normalizeHex(result.dominant);
    }
  } catch (e) {
    // Expo modules report a missing native module when it is first called.
    if (e instanceof Error && /native module|ImageColors/i.test(e.message)) return null;
    throw e;
  } finally {
    try {
      new File(croppedUri).delete();
    } catch {
      // temp file; ignore
    }
  }
}
