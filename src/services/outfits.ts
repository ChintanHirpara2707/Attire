import type { Item, Outfit } from './database.types';
import { listItems } from './items';
import { supabase } from './supabase';

export type { Outfit };

export type OutfitWithItems = Outfit & { items: Item[] };

export async function createOutfit(profileId: string, name: string, itemIds: string[]): Promise<Outfit> {
  const ids = [...new Set(itemIds)];
  if (ids.length === 0) throw new Error('Pick at least one item.');

  const { data: outfit, error } = await supabase
    .from('outfits')
    .insert({ profile_id: profileId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;

  const { error: linkError } = await supabase
    .from('outfit_items')
    .insert(ids.map((item_id) => ({ outfit_id: outfit.id, item_id })));
  if (linkError) {
    // Don't leave an empty outfit behind.
    await supabase.from('outfits').delete().eq('id', outfit.id);
    throw linkError;
  }
  return outfit;
}

// Favorites first, then newest first. Each outfit carries its items.
export async function listOutfits(profileId: string): Promise<OutfitWithItems[]> {
  const { data: outfits, error } = await supabase
    .from('outfits')
    .select('*')
    .eq('profile_id', profileId)
    .order('favorite', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (outfits.length === 0) return [];

  const [{ data: links, error: linkError }, items] = await Promise.all([
    supabase
      .from('outfit_items')
      .select('outfit_id, item_id')
      .in(
        'outfit_id',
        outfits.map((o) => o.id),
      ),
    listItems(profileId),
  ]);
  if (linkError) throw linkError;

  const byId = new Map(items.map((i) => [i.id, i]));
  return outfits.map((o) => ({
    ...o,
    items: links.flatMap((l) => {
      const item = l.outfit_id === o.id ? byId.get(l.item_id) : undefined;
      return item ? [item] : [];
    }),
  }));
}

export async function toggleFavorite(outfitId: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from('outfits').update({ favorite }).eq('id', outfitId);
  if (error) throw error;
}

// outfit_items rows cascade with the outfit; the clothes themselves stay.
export async function deleteOutfit(outfitId: string): Promise<void> {
  const { error } = await supabase.from('outfits').delete().eq('id', outfitId);
  if (error) throw error;
}
