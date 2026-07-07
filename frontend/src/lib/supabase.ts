// NOTE: Do NOT import 'react-native-url-polyfill/auto' — React Native 0.81 has native URL support
// and the polyfill breaks it, causing network request crashes.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Hardcoded for production builds — env vars are NOT available inside APKs
const supabaseUrl = 'https://ugwklaxdyibldmgdadyc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnd2tsYXhkeWlibGRtZ2RhZHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDA1OTYsImV4cCI6MjA5OTAxNjU5Nn0.0RtbYyt4FgFhXZfrfv5TmFBSf7wlmlGkgsj6jF0Bzys';

const isWeb = Platform.OS === 'web';
const storage = isWeb ? (typeof window !== 'undefined' ? window.localStorage : undefined) : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});
