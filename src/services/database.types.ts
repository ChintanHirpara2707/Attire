// Hand-written to match supabase/migrations/0001_init.sql.
// Can be replaced by: npx supabase gen types typescript --linked > src/services/database.types.ts

type Owned = { owner_id: string };

type ProfileRow = Owned & {
  id: string;
  name: string;
  avatar: string | null;
  pin_hash: string | null;
  created_at: string;
};

type ItemRow = Owned & {
  id: string;
  profile_id: string;
  name: string;
  category: string | null;
  season: string | null;
  color_name: string | null;
  color_hex: string | null;
  image_path: string | null;
  original_path: string | null;
  created_at: string;
};

type OutfitRow = Owned & {
  id: string;
  profile_id: string;
  name: string;
  favorite: boolean;
  created_at: string;
};

type OutfitItemRow = Owned & {
  outfit_id: string;
  item_id: string;
};

// Columns with defaults are optional on insert; everything is optional on update.
type Insert<Row, Required extends keyof Row> = Partial<Row> & Pick<Row, Required>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insert<ProfileRow, 'name'>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      items: {
        Row: ItemRow;
        Insert: Insert<ItemRow, 'profile_id'>;
        Update: Partial<ItemRow>;
        Relationships: [];
      };
      outfits: {
        Row: OutfitRow;
        Insert: Insert<OutfitRow, 'profile_id'>;
        Update: Partial<OutfitRow>;
        Relationships: [];
      };
      outfit_items: {
        Row: OutfitItemRow;
        Insert: Insert<OutfitItemRow, 'outfit_id' | 'item_id'>;
        Update: Partial<OutfitItemRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = ProfileRow;
export type Item = ItemRow;
export type Outfit = OutfitRow;
export type OutfitItem = OutfitItemRow;
