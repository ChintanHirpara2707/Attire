// Finds the main color of a clothing photo.
// Crops the centre ~50% (where the garment usually is, away from the floor or
// wall behind it) and asks react-native-image-colors for its palette.
//
// No expo-file-system here: ImageManipulator reads the (signed, remote) URL
// itself and saves the crop to its own cache file, which getColors then reads.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

type GetColors = typeof import('react-native-image-colors').getColors;

const CENTER_SHARE = 0.5;
// Photos are stored at 1024px max; this only guards against larger sources.
const LOAD_MAX_SIDE = 1024;
// Returned by the library when it can't read a color; we treat it as "no result".
const FALLBACK = '#010203';

export class ColorDetectionUnavailableError extends Error {
  constructor() {
    super('Color detection needs a development build.');
    this.name = 'ColorDetectionUnavailableError';
  }
}

// Loaded on first use: the native module is missing in Expo Go and we skip web.
function loadGetColors(): GetColors {
  if (Platform.OS === 'web') throw new ColorDetectionUnavailableError();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('react-native-image-colors') as { getColors: GetColors }).getColors;
  } catch {
    throw new ColorDetectionUnavailableError();
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

// Loads the image once (local file or https URL), crops the centre and saves
// it as a JPEG in ImageManipulator's cache. Returns the local file URI.
async function cropCenter(source: string): Promise<string> {
  const full = await ImageManipulator.manipulate(source, {
    maxWidth: LOAD_MAX_SIDE,
    maxHeight: LOAD_MAX_SIDE,
  }).renderAsync();
  const width = Math.max(1, Math.round(full.width * CENTER_SHARE));
  const height = Math.max(1, Math.round(full.height * CENTER_SHARE));
  const cropped = await ImageManipulator.manipulate(full)
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
 * Returns the main color of an image as #RRGGBB, or null when no usable
 * color was found. `source` can be a local file or a signed https URL.
 * Throws ColorDetectionUnavailableError in Expo Go / web.
 *
 * Each platform's palette differs, so the field is chosen per platform:
 * - Android: `dominant` (most common pixel color), then `average`
 * - iOS: `background` (the most prominent color), then `primary`
 */
export async function detectColorHex(source: string): Promise<string | null> {
  const getColors = loadGetColors();
  const croppedUri = await cropCenter(source);
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
    if (e instanceof Error && /native module|ImageColors/i.test(e.message)) {
      throw new ColorDetectionUnavailableError();
    }
    throw e;
  }
}
