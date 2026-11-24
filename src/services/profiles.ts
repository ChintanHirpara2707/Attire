import * as Crypto from 'expo-crypto';

import { supabase } from './supabase';

export type ProfileSummary = {
  id: string;
  name: string;
  avatar: string | null;
  hasPin: boolean;
};

const BUCKET = 'clothes';
export const NAME_MAX = 40;
const PIN_PATTERN = /^\d{4}$/;

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1) return 'Enter a name.';
  if (trimmed.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer.`;
  return null;
}

export function validatePin(pin: string): string | null {
  if (pin === '') return null; // PIN is optional
  return PIN_PATTERN.test(pin) ? null : 'PIN must be exactly 4 digits.';
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

// Stored as "salt:hash"; the plain PIN never leaves this function.
async function makePinHash(pin: string): Promise<string> {
  const salt = toHex(Crypto.getRandomBytes(16));
  return `${salt}:${await hashPin(pin, salt)}`;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

export async function listProfiles(): Promise<ProfileSummary[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar, pin_hash')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, hasPin: p.pin_hash !== null }));
}

export async function createProfile(name: string, pin: string): Promise<ProfileSummary> {
  const inputError = validateName(name) ?? validatePin(pin);
  if (inputError) throw new Error(inputError);

  const pin_hash = pin ? await makePinHash(pin) : null;
  const { data, error } = await supabase
    .from('profiles')
    .insert({ name: name.trim(), pin_hash })
    .select('id, name, avatar')
    .single();
  if (error) throw error;
  return { ...data, hasPin: pin_hash !== null };
}

export async function verifyPin(profileId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('pin_hash')
    .eq('id', profileId)
    .single();
  if (error) throw error;
  if (!data.pin_hash) return true;

  const [salt, expected] = data.pin_hash.split(':');
  if (!salt || !expected) return false;
  return (await hashPin(pin, salt)) === expected;
}

// Collects every file path under a storage folder, walking into sub-folders.
async function listFiles(folder: string): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, { limit: pageSize, offset });
    if (error) throw error;
    for (const entry of data) {
      const path = `${folder}/${entry.name}`;
      // Folders come back with a null id.
      if (entry.id === null) paths.push(...(await listFiles(path)));
      else paths.push(path);
    }
    if (data.length < pageSize) return paths;
  }
}

export async function deleteProfile(profileId: string): Promise<void> {
  const userId = await currentUserId();
  const files = await listFiles(`${userId}/${profileId}`);
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(files.slice(i, i + 100));
    if (error) throw error;
  }

  // Items, outfits and outfit links cascade from the profile row.
  const { error } = await supabase.from('profiles').delete().eq('id', profileId);
  if (error) throw error;
}
