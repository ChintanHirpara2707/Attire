import { create } from 'zustand';

import {
  createProfile,
  deleteProfile,
  listProfiles,
  verifyPin,
  type ProfileSummary,
} from '../services/profiles';

type ProfileState = {
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  // Opens a profile. Profiles with a PIN need the right one; returns false if wrong.
  select: (id: string, pin?: string) => Promise<boolean>;
  add: (name: string, pin: string) => Promise<ProfileSummary>;
  remove: (id: string) => Promise<void>;
};

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

export const useProfileStore = create<ProfileState>()((set, get) => ({
  profiles: [],
  activeProfileId: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ profiles: await listProfiles() });
    } catch (e) {
      set({ error: message(e) });
    } finally {
      set({ loading: false });
    }
  },

  select: async (id, pin = '') => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return false;
    if (profile.hasPin && !(await verifyPin(id, pin))) return false;
    set({ activeProfileId: id });
    return true;
  },

  add: async (name, pin) => {
    const profile = await createProfile(name, pin);
    set({ profiles: [...get().profiles, profile] });
    return profile;
  },

  remove: async (id) => {
    await deleteProfile(id);
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== id),
      activeProfileId: s.activeProfileId === id ? null : s.activeProfileId,
    }));
  },
}));
