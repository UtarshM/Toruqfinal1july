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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auto-detect Admin email
  const isAdmin = email.trim().toLowerCase() === 'torqueautoadvisor@gmail.com';

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
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email ID');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await requestStaffOtp(cleanEmail);
      setLoading(false);
      router.push({
        pathname: '/verify-otp' as any,
        params: {
          email: cleanEmail,
          fullName: res.fullName || '',
        },
      });
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Failed to send OTP. Please check your email.';
      setError(msg);
      Alert.alert('Unable to Request OTP', msg);
    }
  }

  // Handle Admin Direct Password Login
  async function handleAdminLogin() {
    if (loading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(cleanEmail, password);
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
          <Text style={styles.subtitle}>Internal APK</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email field (Common) */}
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter registered email"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={(txt) => {
                setEmail(txt);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password field automatically shown only for Admin */}
          {isAdmin ? (
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
                  autoFocus={true}
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
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Internal APK · v2.1.0</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { alignItems: 'center', marginBottom: 28 },
  logoImage: { width: 220, height: 75, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs, fontWeight: '600', letterSpacing: 0.5 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginTop: Spacing.xs },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceMuted, height: 50 },
  inputIcon: { paddingLeft: Spacing.lg },
  input: { flex: 1, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  eyeBtn: { padding: Spacing.lg },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight || '#FEE2E2',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 0.5 },
});
