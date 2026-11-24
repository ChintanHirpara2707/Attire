# Attire – AI Wardrobe & Outfit Organizer
Tagline: "Wear your aura."

## Stack
React Native (Expo, TypeScript, Expo Router), Supabase (Auth anonymous, Postgres, Storage, Edge Functions), zustand.

## Rules
- Keep code small and simple. No extra libraries without asking.
- TypeScript strict. Functional components only.
- All DB access goes through src/services/*. Never call supabase directly in screens.
- Every table has RLS. Every row has owner_id.
- Never commit .env or API keys. Secrets live in Edge Functions only.
- Do one feature at a time. Reply with a short summary of changed files only.

## Structure
src/app/ (screens, Expo Router) · src/theme · src/services · src/store · src/utils · src/components · supabase/migrations · supabase/functions

## Features
1. Profiles (name only, optional PIN, separate wardrobe per profile)
2. Add clothes: camera or upload
3. Auto background removal (Edge Function -> transparent PNG, keep original)
4. Edit image + name, category, season
5. Auto color detect (hex + color name), user can correct
6. Auto outfit pairing by color rules (neutrals, complementary, analogous, monochrome)
7. Manual outfit builder, favorites

## Commands
npx expo start · npx supabase db push · npx supabase functions deploy remove-bg

## Status
(update this list as features are completed)
- [x] Scaffold: Expo Router in src/app, theme tokens (src/theme/tokens.ts), Inter font, Glass component
- [x] Supabase foundation: 0001_init.sql (tables, RLS, private "clothes" bucket), src/services/supabase.ts (client + ensureSession)
- [x] Profiles: list, add (name + optional PIN, salted SHA-256), open with PIN, delete (incl. storage files) — not yet device-tested
- [x] Add clothes: camera/gallery, resized JPEG upload to clothes/<user>/<profile>/<item>-original.jpg, closet grid with signed URLs — not yet device-tested
