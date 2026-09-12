import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { useCacheStore } from '../store/cacheStore';

const USER_PROFILE_CACHE_KEY = '@torque_user_profile';
const EXPLICIT_LOGOUT_KEY = '@torque_explicit_logout';

interface User {
  id: string;
  email: string;
  full_name: string;
  name: string;         // alias for full_name — used by dashboard UI
  phone: string;
  role: string;         // role name string e.g. "Admin"
  role_id: string | null;
  permissions: string[];
  is_active: boolean;
  requiresOnboardingForm?: boolean;
  onboardingRemark?: string | null;
  highestQualification?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  homeMobile?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isPinAuthenticated: boolean;
  setPinAuthenticated: (val: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isPinAuthenticated: false,
  setPinAuthenticated: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  login: async () => {},
});

const LIVE_API_BASE = 'https://admin-panel-delta-steel.vercel.app';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let mounted = true;

    // Load cache globally on app startup
    useCacheStore.getState().loadCache().catch(() => {});

    // Step 1: Instantly restore cached user profile if available
    AsyncStorage.getItem(USER_PROFILE_CACHE_KEY)
      .then((cached) => {
        if (!mounted) return;
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id) {
              setUser(parsed);
              setIsLoading(false); // Dashboard shows immediately!
            }
          } catch (err) {
            console.warn('Failed to parse cached profile:', err);
          }
        }
      })
      .catch(() => {});

    // Safety timeout: never stay loading forever
    const safetyTimeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 4000);

    // Step 2: In parallel, check Supabase session & fetch updated profile in background
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (session) {
          fetchProfile().finally(() => {
            if (mounted) setIsLoading(false);
          });
        } else {
          // Genuinely no session: only clear if nothing cached
          AsyncStorage.getItem(USER_PROFILE_CACHE_KEY).then(c => {
            if (!c && mounted) {
              setUser(null);
            }
          }).catch(() => {});
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('getSession error:', err);
        if (mounted) setIsLoading(false);
      });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        // Check if this is an explicit logout
        const flag = await AsyncStorage.getItem(EXPLICIT_LOGOUT_KEY).catch(() => null);
        if (flag === 'true') {
          // ====== EXPLICIT LOGOUT: Clear everything ======
          await AsyncStorage.removeItem(EXPLICIT_LOGOUT_KEY).catch(() => {});
          await AsyncStorage.removeItem(USER_PROFILE_CACHE_KEY).catch(() => {});
          setUser(null);
        } else {
          // ====== UNEXPECTED SIGNED_OUT (app backgrounded, multi-device race, etc.) ======
          // Do NOT clear user state immediately. Attempt recovery.
          console.warn('[auth] Unexpected SIGNED_OUT — attempting silent recovery...');
          
          // Wait a moment for Supabase to settle
          await new Promise(r => setTimeout(r, 2000));
          
          try {
            const { data: { session: recoveredSession } } = await supabase.auth.getSession();
            if (recoveredSession?.user) {
              console.log('[auth] Session recovered after unexpected SIGNED_OUT');
              fetchProfile().catch(() => {});
              return;
            }
          } catch {}

          // Try an active refresh as last resort
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (data?.session?.user && !error) {
              console.log('[auth] Session recovered via active refresh');
              fetchProfile().catch(() => {});
              return;
            }
          } catch {}

          // Even if all recovery failed, keep the cached profile.
          // The user won't be kicked out, but API calls may fail with 401.
          console.warn('[auth] Session recovery failed, keeping cached profile.');
        }
      } else if (session) {
        fetchProfile().catch(() => {});
      }
    });

    // Step 3: Handle app state changes (iOS/Android backgrounding)
    const appStateSubscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // App came back to foreground from background/inactive
      if (prevState.match(/inactive|background/) && nextState === 'active') {
        console.log('[auth] App resumed from background, refreshing session...');
        // Wait a moment for network to stabilize
        await new Promise(r => setTimeout(r, 1500));
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Check if token is expiring soon and refresh proactively
            const nowSec = Math.floor(Date.now() / 1000);
            if (session.expires_at && session.expires_at - nowSec < 120) {
              await supabase.auth.refreshSession();
            }
            fetchProfile().catch(() => {});
          }
        } catch (err) {
          console.warn('[auth] Background resume session check failed:', err);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  let lastProfileFetchTime = 0;

  async function fetchProfile(force = false) {
    try {
      const now = Date.now();
      if (!force && lastProfileFetchTime && (now - lastProfileFetchTime < 45000)) {
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        return;
      }

      const response = await fetch(`${LIVE_API_BASE}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Attempt to refresh token on 401
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshedSession && !refreshError) {
            await fetchProfile(true);
            return;
          }
        }
        return;
      }

      lastProfileFetchTime = Date.now();

      const data = await response.json();

      let requiresOnboardingForm = false;
      let onboardingRemark = null;
      try {
        const statusRes = await fetch(`${LIVE_API_BASE}/api/v1/onboarding/check-form-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          requiresOnboardingForm = statusData.requiresForm;
          onboardingRemark = statusData.onboardingRemark;
        }
      } catch (err) {
        console.warn('onboarding status check error:', err);
      }

      if (data && data.id) {
        const profileUser: User = {
          id: data.id,
          email: data.email,
          full_name: data.full_name || data.fullName || '',
          name: data.full_name || data.fullName || '',
          phone: data.phone || data.personalMobile || '',
          role: data.role?.name || '',
          role_id: data.roleId || data.role_id || null,
          permissions: (data.role?.permissions || []).map((p: any) => p.name),
          is_active: data.is_active ?? data.isActive ?? true,
          requiresOnboardingForm,
          onboardingRemark,
          highestQualification: data.highestQualification || '',
          dateOfBirth: data.dateOfBirth || '',
          joiningDate: data.joiningDate || '',
          homeMobile: data.homeMobile || '',
        };
        setUser(profileUser);
        await AsyncStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(profileUser)).catch(() => {});
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  }

  async function logout() {
    try {
      // Set explicit logout flag BEFORE signing out
      // so onAuthStateChange knows to clear everything
      await AsyncStorage.setItem(EXPLICIT_LOGOUT_KEY, 'true').catch(() => {});
      await AsyncStorage.removeItem(USER_PROFILE_CACHE_KEY).catch(() => {});
      await useCacheStore.getState().clearCache();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setUser(null);
  }

  async function refreshUser() {
    await fetchProfile();
  }

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // fetchProfile will be called by onAuthStateChange
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isPinAuthenticated, 
      setPinAuthenticated: setIsPinAuthenticated,
      logout, 
      refreshUser,
      login
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
