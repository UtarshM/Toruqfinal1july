import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { api } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role: {
    id: string;
    name: string;
    permissions: Array<{ id: string; name: string }>;
  } | null;
}

interface AuthState {
  session: Session | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isPinAuthenticated: boolean;
  setSession: (session: Session | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setPinAuthenticated: (val: boolean) => void;
  /**
   * Fetches the user's full profile (including role & permissions) from FastAPI.
   * Call this immediately after Supabase auth confirms a valid session.
   */
  fetchProfile: () => Promise<void>;
  /** Helper: check if current user has a specific permission by name */
  hasPermission: (permissionName: string) => boolean;
  /** Helper: get the current user's role name */
  roleName: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  userProfile: null,
  isLoading: true,
  isPinAuthenticated: false,

  setSession: (session) => set({ session }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPinAuthenticated: (val) => set({ isPinAuthenticated: val }),

  fetchProfile: async () => {
    try {
      const { data } = await api.get<UserProfile>('/auth/me');
      set({ userProfile: data });
    } catch (err) {
      console.error('[authStore] Failed to fetch user profile:', err);
      set({ userProfile: null });
    }
  },

  hasPermission: (permissionName: string): boolean => {
    const profile = get().userProfile;
    if (!profile?.role) return false;
    return profile.role.permissions.some((p) => p.name === permissionName);
  },

  roleName: (): string | null => {
    return get().userProfile?.role?.name ?? null;
  },
}));

