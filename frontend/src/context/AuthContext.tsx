import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useCacheStore } from '../store/cacheStore';

const USER_PROFILE_CACHE_KEY = '@torque_user_profile';
const EXPLICIT_LOGOUT_KEY = '@torque_explicit_logout';
const SESSION_EXPIRY_KEY = '@torque_session_expiry';

/**
 * Calculates the upcoming 8:00 PM IST timestamp.
 * IST is UTC + 5 hours 30 minutes.
 * 8:00 PM IST corresponds to 20:00:00 IST = 14:30:00 UTC.
 */
export function getNext8PmIstTimestamp(fromTime = Date.now()): number {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(fromTime + IST_OFFSET_MS);

  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const date = istDate.getUTCDate();

  // 8:00 PM IST corresponds to 14:30:00 UTC on the same calendar day in IST
  const target8PmUtc = Date.UTC(year, month, date, 14, 30, 0, 0);

  if (fromTime >= target8PmUtc) {
    // 8:00 PM IST has already passed for today, so next cutoff is tomorrow's 8:00 PM IST
    return target8PmUtc + 24 * 60 * 60 * 1000;
  }
  return target8PmUtc;
}

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
  updateUser: (updatedFields: Partial<User>) => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  requestStaffOtp: (email: string) => Promise<{ success: boolean; message: string; fullName: string }>;
  verifyStaffOtp: (email: string, otp: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isPinAuthenticated: false,
  setPinAuthenticated: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  updateUser: async () => {},
  login: async () => ({} as User),
  requestStaffOtp: async () => ({ success: false, message: '', fullName: '' }),
  verifyStaffOtp: async () => ({} as User),
});

const LIVE_API_BASE = 'https://admin-panel-delta-steel.vercel.app';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const logoutTimerRef = useRef<any>(null);

  function schedule8PmLogout(expiryMs: number) {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    const msUntil8Pm = expiryMs - Date.now();
    if (msUntil8Pm > 0) {
      logoutTimerRef.current = setTimeout(async () => {
        console.log('[auth] Active 8:00 PM IST cutoff timer fired. Logging out staff user...');
        await logout();
        Alert.alert(
          'Daily Session Ended',
          'Your shift ended at 8:00 PM IST. You have been automatically logged out. You can log in via OTP anytime to continue.'
        );
      }, msUntil8Pm);
    }
  }

  async function checkDailySessionExpiry(currentUser: User | null): Promise<boolean> {
    if (!currentUser) return false;
    const isSuperAdmin = 
      currentUser.role === 'Super Admin' || 
      currentUser.email?.toLowerCase() === 'torqueautoadvisor@gmail.com';

    // Super Admin is exempt from 8:00 PM IST auto-logout
    if (isSuperAdmin) return false;

    const expiryStr = await AsyncStorage.getItem(SESSION_EXPIRY_KEY).catch(() => null);
    if (!expiryStr) {
      console.log('[auth] No session expiry found for staff user. Expiring session...');
      await logout();
      return true;
    }

    const expiryMs = Number(expiryStr);
    if (Date.now() >= expiryMs) {
      console.log('[auth] Session has expired past 8:00 PM IST.');
      await logout();
      Alert.alert(
        'Daily Session Ended',
        'Your daily shift ended at 8:00 PM IST. Please sign in with OTP for today.'
      );
      return true;
    }

    schedule8PmLogout(expiryMs);
    return false;
  }

  useEffect(() => {
    let mounted = true;

    // Load cache globally on app startup
    useCacheStore.getState().loadCache().catch(() => {});

    // Step 1: Check session expiry and restore cached user profile
    AsyncStorage.getItem(USER_PROFILE_CACHE_KEY)
      .then(async (cached) => {
        if (!mounted) return;
        if (cached) {
          try {
            const parsed: User = JSON.parse(cached);
            if (parsed && parsed.id) {
              const isExpired = await checkDailySessionExpiry(parsed);
              if (!isExpired && mounted) {
                if (parsed.email?.toLowerCase() === 'torqueautoadvisor@gmail.com' && (!parsed.role || parsed.role.toUpperCase() === 'EXECUTIVE')) {
                  parsed.role = 'Super Admin';
                  parsed.name = parsed.name || 'Admin';
                  parsed.full_name = parsed.full_name || 'Admin';
                  AsyncStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(parsed)).catch(() => {});
                }
                setUser(parsed);
                setIsLoading(false);
              }
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
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        if (session) {
          const profile = await fetchProfile();
          if (profile && mounted) {
            await checkDailySessionExpiry(profile);
          }
          if (mounted) setIsLoading(false);
        } else {
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
        const flag = await AsyncStorage.getItem(EXPLICIT_LOGOUT_KEY).catch(() => null);
        if (flag === 'true') {
          await AsyncStorage.removeItem(EXPLICIT_LOGOUT_KEY).catch(() => {});
          await AsyncStorage.removeItem(SESSION_EXPIRY_KEY).catch(() => {});
          setUser(null);
          setIsLoading(false);
          return;
        }

        const cached = await AsyncStorage.getItem(USER_PROFILE_CACHE_KEY).catch(() => null);
        if (cached) {
          try {
            const { data: refreshed, error } = await supabase.auth.refreshSession();
            if (refreshed?.session) {
              console.log('[auth] Successfully refreshed session after spurious SIGNED_OUT');
              return;
            }
          } catch {}
          console.warn('[auth] Session recovery failed, keeping cached profile.');
        }
      } else if (session) {
        fetchProfile().then(p => {
          if (p) checkDailySessionExpiry(p);
        }).catch(() => {});
      }
    });

    // Step 3: Handle app state changes (iOS/Android foreground resume)
    const appStateSubscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (prevState.match(/inactive|background/) && nextState === 'active') {
        console.log('[auth] App resumed from background, checking 8:00 PM IST expiry & session...');
        await new Promise(r => setTimeout(r, 1000));
        
        // Read current cached user
        const cached = await AsyncStorage.getItem(USER_PROFILE_CACHE_KEY).catch(() => null);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const expired = await checkDailySessionExpiry(parsed);
            if (expired) return;
          } catch {}
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
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
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const lastProfileFetchTimeRef = useRef<number>(0);

  async function fetchProfile(force = false): Promise<User | null> {
    try {
      const now = Date.now();
      if (!force && lastProfileFetchTimeRef.current && (now - lastProfileFetchTimeRef.current < 45000)) {
        return user;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || !session?.user) {
        return null;
      }

      let data: any = null;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(`${LIVE_API_BASE}/api/v1/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (response.ok) {
          data = await response.json();
          lastProfileFetchTimeRef.current = Date.now();
        } else if (response.status === 401) {
          clearTimeout(timeoutId);
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshedSession && !refreshError) {
            return await fetchProfile(true);
          }
        }
      } catch (fetchErr: any) {
        console.warn('[auth] /auth/me fetch error or timeout:', fetchErr.message);
      } finally {
        clearTimeout(timeoutId);
      }

      let requiresOnboardingForm = false;
      let onboardingRemark = null;
      const obController = new AbortController();
      const obTimeoutId = setTimeout(() => obController.abort(), 4000);
      try {
        const statusRes = await fetch(`${LIVE_API_BASE}/api/v1/onboarding/check-form-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: obController.signal,
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          requiresOnboardingForm = statusData.requiresOnboardingForm === true;
          onboardingRemark = statusData.remark || null;
        }
      } catch (err: any) {
        console.warn('[auth] /check-form-status failed:', err.message);
      } finally {
        clearTimeout(obTimeoutId);
      }

      if (data && data.id) {
        const isSuperAdminEmail = (data.email || session.user.email || '').toLowerCase() === 'torqueautoadvisor@gmail.com';
        const roleName = isSuperAdminEmail ? 'Super Admin' : (data.role?.name || data.role || 'Staff');

        const profileUser: User = {
          id: data.id,
          email: data.email || session.user.email || '',
          full_name: data.fullName || data.name || session.user.user_metadata?.full_name || 'Staff User',
          name: data.fullName || data.name || session.user.user_metadata?.full_name || 'Staff User',
          phone: data.personalMobile || data.phone || session.user.user_metadata?.phone || '',
          role: roleName,
          role_id: data.roleId || null,
          permissions: isSuperAdminEmail ? ['*'] : (data.permissions || []),
          is_active: data.isActive !== false,
          requiresOnboardingForm,
          onboardingRemark,
          highestQualification: data.highestQualification || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
          joiningDate: data.joiningDate || undefined,
          homeMobile: data.homeMobile || undefined,
        };

        setUser(profileUser);
        setIsLoading(false);
        await AsyncStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(profileUser)).catch(() => {});
        return profileUser;
      } else {
        const isSuperAdminEmail = (session.user.email || '').toLowerCase() === 'torqueautoadvisor@gmail.com';
        const fallbackRole = 
          session.user.user_metadata?.role || 
          session.user.app_metadata?.role || 
          (isSuperAdminEmail ? 'Super Admin' : 'Staff');

        const baseUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || (isSuperAdminEmail ? 'Admin' : session.user.email?.split('@')[0] || 'User'),
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || (isSuperAdminEmail ? 'Admin' : session.user.email?.split('@')[0] || 'User'),
          phone: session.user.phone || session.user.user_metadata?.phone || '',
          role: fallbackRole,
          role_id: null,
          permissions: isSuperAdminEmail ? ['*'] : [],
          is_active: true,
          requiresOnboardingForm,
          onboardingRemark,
        };
        setUser(baseUser);
        setIsLoading(false);
        await AsyncStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(baseUser)).catch(() => {});
        return baseUser;
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
      return null;
    }
  }

  async function logout() {
    try {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
      await AsyncStorage.setItem(EXPLICIT_LOGOUT_KEY, 'true').catch(() => {});
      await AsyncStorage.removeItem(USER_PROFILE_CACHE_KEY).catch(() => {});
      await AsyncStorage.removeItem(SESSION_EXPIRY_KEY).catch(() => {});
      await useCacheStore.getState().clearCache();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setUser(null);
  }

  async function refreshUser() {
    await fetchProfile(true);
  }

  async function updateUser(updatedFields: Partial<User>) {
    setUser(prev => {
      if (!prev) return null;
      const nextName = updatedFields.name || updatedFields.full_name || prev.name || prev.full_name;
      const updated: User = {
        ...prev,
        ...updatedFields,
        full_name: nextName,
        name: nextName,
      };
      AsyncStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }

  /**
   * Request OTP for Staff (Email only, no password).
   * Dispatches OTP to torqueotp@yahoo.com.
   */
  async function requestStaffOtp(email: string): Promise<{ success: boolean; message: string; fullName: string }> {
    const res = await fetch(`${LIVE_API_BASE}/api/v1/auth/staff-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });

    let data: any = null;
    const rawText = await res.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Backend service not reachable (${res.status}). Please ensure backend deployment is complete.`);
    }

    if (!res.ok) {
      throw new Error(data.error || 'Failed to send OTP to admin inbox.');
    }

    return {
      success: true,
      message: data.message || 'OTP sent successfully.',
      fullName: data.fullName || '',
    };
  }

  /**
   * Verify Staff 6-digit OTP and establish daily session expiring at 8:00 PM IST.
   */
  async function verifyStaffOtp(email: string, otp: string): Promise<User> {
    const res = await fetch(`${LIVE_API_BASE}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });

    let data: any = null;
    const rawText = await res.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Backend service error (${res.status}). Please try again later.`);
    }

    if (!res.ok) {
      throw new Error(data.error || 'Invalid OTP code.');
    }

    // Exchange tokenHash with Supabase if provided
    if (data.tokenHash) {
      try {
        const { error: vErr } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: 'magiclink',
        });
        if (vErr) {
          await supabase.auth.verifyOtp({
            token_hash: data.tokenHash,
            type: 'email',
          });
        }
      } catch (err) {
        console.warn('[auth] Supabase verifyOtp exchange note:', err);
      }
    }

    const userData = data.user;
    const baseUser: User = {
      id: userData.id,
      email: userData.email,
      full_name: userData.fullName || userData.name || userData.email.split('@')[0],
      name: userData.fullName || userData.name || userData.email.split('@')[0],
      phone: userData.phone || '',
      role: userData.role || 'Staff',
      role_id: userData.role_id || null,
      permissions: userData.permissions || [],
      is_active: true,
      requiresOnboardingForm: false,
    };

    const isSuperAdmin = 
      userData.role === 'Super Admin' || 
      userData.email?.toLowerCase() === 'torqueautoadvisor@gmail.com';

    await AsyncStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(baseUser)).catch(() => {});

    if (isSuperAdmin) {
      // Admin is permanently logged in — no 8 PM cutoff
      await AsyncStorage.removeItem(SESSION_EXPIRY_KEY).catch(() => {});
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    } else {
      // Calculate 8:00 PM IST session expiry for staff
      const expiry = getNext8PmIstTimestamp();
      await AsyncStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString()).catch(() => {});
      // Schedule automatic 8:00 PM IST timer
      schedule8PmLogout(expiry);
    }

    setUser(baseUser);
    setIsLoading(false);

    return baseUser;
  }

  /**
   * Super Admin direct password login (exempt from OTP & 8:00 PM cutoff).
   */
  async function login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned from authentication');

    const isSuperAdminEmail = (data.user.email || email).toLowerCase() === 'torqueautoadvisor@gmail.com';
    const initialRole = 
      data.user.user_metadata?.role || 
      data.user.app_metadata?.role || 
      (isSuperAdminEmail ? 'Super Admin' : 'Staff');

    const baseUser: User = {
      id: data.user.id,
      email: data.user.email || email.trim(),
      full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || (isSuperAdminEmail ? 'Admin' : data.user.email?.split('@')[0] || 'User'),
      name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || (isSuperAdminEmail ? 'Admin' : data.user.email?.split('@')[0] || 'User'),
      phone: data.user.phone || data.user.user_metadata?.phone || '',
      role: initialRole,
      role_id: null,
      permissions: isSuperAdminEmail ? ['*'] : [],
      is_active: true,
      requiresOnboardingForm: false,
      onboardingRemark: null,
    };

    // Super Admin: Remove session expiry so admin stays logged in
    if (isSuperAdminEmail) {
      await AsyncStorage.removeItem(SESSION_EXPIRY_KEY).catch(() => {});
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    } else {
      // Non-admin fallback if password login is used
      const expiry = getNext8PmIstTimestamp();
      await AsyncStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString()).catch(() => {});
      schedule8PmLogout(expiry);
    }

    setUser(baseUser);
    setIsLoading(false);
    await AsyncStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(baseUser)).catch(() => {});

    try {
      const fullUser = await fetchProfile(true);
      return fullUser || baseUser;
    } catch {
      return baseUser;
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isPinAuthenticated, 
      setPinAuthenticated: setIsPinAuthenticated,
      logout, 
      refreshUser,
      updateUser,
      login,
      requestStaffOtp,
      verifyStaffOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
