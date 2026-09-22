import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { user, isLoading, login, requestStaffOtp } = useAuth();
  const router = useRouter();

  // Mode: 'staff' (OTP) | 'admin' (Password)
  const [loginMode, setLoginMode] = useState<'staff' | 'admin'>('staff');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Splash loader while determining initial session
  if (isLoading || user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // Handle Staff OTP Request
  async function handleStaffOtpRequest() {
    if (loading) return;
    if (!email.trim()) {
      setError('Please enter your staff email ID');
      return;
    }

    if (email.trim().toLowerCase() === 'torqueautoadvisor@gmail.com') {
      setLoginMode('admin');
      setError('torqueautoadvisor@gmail.com is the Admin account. Please sign in with password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await requestStaffOtp(email.trim());
      setLoading(false);
      router.push({
        pathname: '/verify-otp' as any,
        params: {
          email: email.trim(),
          fullName: res.fullName || '',
        },
      });
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Failed to send OTP. Please check your email.';
      setError(msg);
      Alert.alert('OTP Request Failed', msg);
    }
  }

  // Handle Admin Direct Password Login
  async function handleAdminLogin() {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(email.trim(), password);
      setTimeout(() => {
        if (loggedUser?.requiresOnboardingForm) {
          router.replace('/onboarding');
        } else {
          router.replace('/(protected)/dashboard');
        }
      }, 50);
    } catch (e: any) {
      setLoading(false);
      setError(e.message || 'Login failed');
      Alert.alert('Login Failed', e.message || 'Please check your credentials.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Complete Insurance Management</Text>
        </View>

        {/* Tab Switcher: Staff OTP vs Admin Direct */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, loginMode === 'staff' && styles.tabButtonActive]}
            onPress={() => {
              setLoginMode('staff');
              setError('');
            }}
          >
            <Ionicons
              name="key-outline"
              size={16}
              color={loginMode === 'staff' ? Colors.white : Colors.textMuted}
            />
            <Text style={[styles.tabText, loginMode === 'staff' && styles.tabTextActive]}>
              Staff (OTP Login)
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, loginMode === 'admin' && styles.tabButtonActive]}
            onPress={() => {
              setLoginMode('admin');
              setError('');
              if (!email || email.indexOf('@') === -1) {
                setEmail('torqueautoadvisor@gmail.com');
              }
            }}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={loginMode === 'admin' ? Colors.white : Colors.textMuted}
            />
            <Text style={[styles.tabText, loginMode === 'admin' && styles.tabTextActive]}>
              Admin Direct
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email field (Common to both modes) */}
          <Text style={styles.label}>
            {loginMode === 'staff' ? 'STAFF EMAIL ID' : 'ADMIN EMAIL'}
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={loginMode === 'staff' ? 'Enter your staff email' : 'torqueautoadvisor@gmail.com'}
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password field only shown for Admin Direct Login */}
          {loginMode === 'admin' ? (
            <>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter admin password"
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.textMuted}
                  />
                </Pressable>
              </View>

              <Pressable
                style={styles.loginBtn}
                onPress={handleAdminLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In as Admin</Text>
                )}
              </Pressable>
            </>
          ) : (
            /* Staff OTP Action */
            <>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.infoText}>
                  No password required. Tapping below sends a 6-digit OTP to the admin inbox (torqueotp@yahoo.com).
                </Text>
              </View>

              <Pressable
                style={styles.loginBtn}
                onPress={handleStaffOtpRequest}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.loginBtnText}>Get OTP Code</Text>
                    <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                  </View>
                )}
              </Pressable>
            </>
          )}

          <View style={styles.adminNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textLight} />
            <Text style={styles.adminNoteText}>
              Restricted: Only admin-approved accounts can receive an OTP. Contact management to add new users.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Daily shift cutoff: 8:00 PM IST · v2.1.0</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { alignItems: 'center', marginBottom: 20 },
  logoImage: { width: 220, height: 75, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs, fontWeight: '600', letterSpacing: 0.5 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  form: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginTop: Spacing.sm },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, height: 50 },
  inputIcon: { paddingLeft: Spacing.lg },
  input: { flex: 1, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  eyeBtn: { padding: Spacing.lg },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: 8,
  },
  infoText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    flex: 1,
    lineHeight: 16,
  },
  loginBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg },
  loginBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: 6,
  },
  adminNoteText: {
    color: Colors.textLight,
    fontSize: FontSize.xs,
    flex: 1,
    lineHeight: 15,
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.errorBg, padding: Spacing.sm, borderRadius: BorderRadius.sm, gap: Spacing.sm },
  errorText: { color: Colors.error, fontSize: FontSize.xs, flex: 1 },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600', letterSpacing: 0.5 },
});
