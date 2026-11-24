import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { hexToColorName } from '../utils/colorName';
import { detectColorHex } from '../utils/detectColor';
import type { Item } from './database.types';
import { supabase } from './supabase';

export type { Item };

const BUCKET = 'clothes';
const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.8;
const SIGNED_URL_SECONDS = 60 * 60;

export type NewItem = {
  profileId: string;
  uri: string; // local image from the picker
  width: number;
  height: number;
  name?: string;
};

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

// Scales the longest side down to MAX_SIDE (never up) and saves as JPEG.
async function prepareImage(uri: string, width: number, height: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    ctx.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return result.uri;
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

export async function createItem({ profileId, uri, width, height, name }: NewItem): Promise<Item> {
  const userId = await currentUserId();
  const id = Crypto.randomUUID();
  const path = `${userId}/${profileId}/${id}-original.jpg`;

  const jpegUri = await prepareImage(uri, width, height);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, await readBytes(jpegUri), { contentType: 'image/jpeg' });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('items')
    .insert({ id, profile_id: profileId, name: name?.trim() ?? '', original_path: path })
    .select()
    .single();
  if (error) {
    // Don't leave an orphaned photo behind.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export async function listItems(profileId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export const CATEGORIES = ['top', 'bottom', 'shoes', 'outerwear', 'accessory'] as const;
export const SEASONS = ['summer', 'winter', 'all'] as const;
export type Category = (typeof CATEGORIES)[number];
export type Season = (typeof SEASONS)[number];

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(hex: string): boolean {
  return HEX_PATTERN.test(hex);
}

export type ItemChanges = {
  name: string;
  category: Category | null;
  season: Season | null;
  // Saved together: both set or both null.
  color: { hex: string; name: string } | null;
};

export async function getItem(itemId: string): Promise<Item> {
  const { data, error } = await supabase.from('items').select('*').eq('id', itemId).single();
  if (error) throw error;
  return data;
}

export async function updateItem(itemId: string, changes: ItemChanges): Promise<Item> {
  const { name, category, season, color } = changes;
  if (color && !isValidHex(color.hex)) throw new Error('Color must be a hex value like #1A2B3C.');
  if (category && !CATEGORIES.includes(category)) throw new Error('Unknown category.');
  if (season && !SEASONS.includes(season)) throw new Error('Unknown season.');

  const { data, error } = await supabase
    .from('items')
    .update({
      name: name.trim(),
      category,
      season,
      color_hex: color ? color.hex.toUpperCase() : null,
      color_name: color ? color.name : null,
    })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(item: Pick<Item, 'id' | 'original_path' | 'image_path'>): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', item.id);
  if (error) throw error;

  // Row is gone first so the item never shows half-deleted; a failed file
  // removal only leaves an unreachable file behind.
  const paths = [item.original_path, item.image_path].filter((p): p is string => !!p);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) console.warn('Item deleted but its photo could not be removed:', storageError.message);
  }
}

export class BackgroundRemovalUnavailableError extends Error {
  constructor() {
    super('Background removal needs a development build on iOS 16+ or Android.');
    this.name = 'BackgroundRemovalUnavailableError';
  }
}

type RemoveBgImage = typeof import('rn-remove-image-bg').removeBgImage;

// Temporary files only; failures to clean up are harmless.
function deleteQuietly(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}

// Loaded on first use so Expo Go and web never touch the native module.
function loadRemover(): RemoveBgImage {
  if (Platform.OS === 'web') throw new BackgroundRemovalUnavailableError();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lib = require('rn-remove-image-bg') as { removeBgImage: RemoveBgImage };
    return lib.removeBgImage;
  } catch {
    throw new BackgroundRemovalUnavailableError();
  }
}

// Downloads the original JPEG to a temporary local file (caller deletes it).
async function downloadOriginal(originalPath: string, itemId: string): Promise<File> {
  const urls = await getSignedUrls([originalPath]);
  const url = urls[originalPath];
  if (!url) throw new Error('Could not download the original photo.');
  // Unique name so color detection and background removal can run at the same time.
  const name = `${itemId}-${Crypto.randomUUID()}-original.jpg`;
  return File.downloadFileAsync(url, new File(Paths.cache, name), { idempotent: true });
}

export type DetectedColor = { hex: string; name: string };

// Detects the main color from the ORIGINAL photo (never the transparent cutout).
// Returns null if detection isn't available (Expo Go, web) or found nothing.
// Does not save anything.
export async function detectItemColor(item: Pick<Item, 'id'>): Promise<DetectedColor | null> {
  const current = await getItem(item.id);
  if (!current.original_path) return null;
  const local = await downloadOriginal(current.original_path, current.id);
  try {
    const hex = await detectColorHex(local.uri);
    return hex ? { hex, name: hexToColorName(hex) } : null;
  } finally {
    deleteQuietly(local.uri);
  }
}

// Detects and saves the color, but only if the item has no color yet, so a
// color the user picked by hand is never replaced. Returns the updated item,
// or null if nothing was saved.
export async function autoDetectColor(item: Pick<Item, 'id'>): Promise<Item | null> {
  const color = await detectItemColor(item);
  if (!color) return null;
  const { data, error } = await supabase
    .from('items')
    .update({ color_hex: color.hex, color_name: color.name })
    .eq('id', item.id)
    .is('color_hex', null)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Makes a transparent cutout of the original on the device (Vision on iOS,
// ML Kit subject segmentation on Android) and stores it as <item>-cutout.png.
// The original file is never changed; the cutout's path goes in image_path.
export async function removeBackground(item: Pick<Item, 'id'>): Promise<Item> {
  const removeBgImage = loadRemover();

  const current = await getItem(item.id);
  const originalPath = current.original_path;
  if (!originalPath) throw new Error('This item has no original photo.');
  const cutoutPath = `${originalPath.slice(0, originalPath.lastIndexOf('/'))}/${current.id}-cutout.png`;
  if (cutoutPath === originalPath) throw new Error('Refusing to overwrite the original photo.');

  const local = await downloadOriginal(originalPath, current.id);

  let cutoutUri: string;
  try {
    cutoutUri = await removeBgImage(local.uri, { maxDimension: MAX_SIDE, format: 'PNG', useCache: false });
  } catch (e) {
    // Native module missing (e.g. Expo Go) shows up as an error here too.
    if (e instanceof Error && /nitro|hybrid ?object|not (be )?found|linked/i.test(e.message)) {
      throw new BackgroundRemovalUnavailableError();
    }
    throw e;
  } finally {
    deleteQuietly(local.uri);
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(cutoutPath, await readBytes(cutoutUri), { contentType: 'image/png', upsert: true });
  deleteQuietly(cutoutUri);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('items')
    .update({ image_path: cutoutPath })
    .eq('id', current.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Goes back to the original photo and deletes the cutout file.
export async function restoreOriginal(item: Pick<Item, 'id' | 'image_path' | 'original_path'>): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update({ image_path: null })
    .eq('id', item.id)
    .select()
    .single();
  if (error) throw error;

  const cutout = item.image_path;
  if (cutout && cutout !== item.original_path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([cutout]);
    if (storageError) console.warn('Original restored but the cutout file could not be removed:', storageError.message);
  }
  return data;
}

// Returns a map of storage path -> temporary URL (valid for one hour).
export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const entry of data) {
    if (entry.path && entry.signedUrl && !entry.error) urls[entry.path] = entry.signedUrl;
  }
  return urls;
}
