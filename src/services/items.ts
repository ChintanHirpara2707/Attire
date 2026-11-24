import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

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
