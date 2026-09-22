import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/utils/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, requestStaffOtp } = useAuth();

  const [loginMode, setLoginMode] = useState<'staff' | 'admin'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Get OTP Code');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleStaffOtp = async () => {
    if (loading) return;
    if (!email.trim()) {
      shake();
      Alert.alert('Missing Field', 'Please enter your staff email.');
      return;
    }

    if (email.trim().toLowerCase() === 'torqueautoadvisor@gmail.com') {
      setLoginMode('admin');
      Alert.alert('Admin Account', 'torqueautoadvisor@gmail.com is the Admin account. Please sign in with password.');
      return;
    }

    setLoading(true);
    setLoadingText('Dispatching OTP to Admin...');
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
    } catch (e: any) {
      setLoading(false);
      shake();
      Alert.alert('OTP Request Failed', e.message || 'Unable to send OTP. Please contact admin.');
    }
  };

  const handleAdminLogin = async () => {
    if (loading) return;
    if (!email.trim()) {
      shake();
      Alert.alert('Missing Field', 'Please enter admin email.');
      return;
    }
    if (!password) {
      shake();
      Alert.alert('Missing Field', 'Please enter admin password.');
      return;
    }

    setLoading(true);
    setLoadingText('Signing in...');
    try {
      const loggedUser = await login(email.trim(), password);
      setLoadingText('Loading Dashboard...');

      setTimeout(() => {
        if (loggedUser?.requiresOnboardingForm) {
          router.replace('/onboarding');
        } else {
          router.replace('/(protected)/dashboard');
        }
      }, 50);
    } catch (e: any) {
      setLoading(false);
      shake();
      Alert.alert('Login Failed', e.message || 'Invalid admin credentials.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and App Title */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>TORQUE ADVISOR</Text>
          <Text style={styles.tagline}>Enterprise Auto Consulting & Claims</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, loginMode === 'staff' && styles.tabButtonActive]}
            onPress={() => {
              setLoginMode('staff');
              setLoadingText('Get OTP Code');
            }}
          >
            <Ionicons
              name="key-outline"
              size={15}
              color={loginMode === 'staff' ? Colors.white : Colors.textMuted}
            />
            <Text style={[styles.tabText, loginMode === 'staff' && styles.tabTextActive]}>
              Staff OTP Login
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, loginMode === 'admin' && styles.tabButtonActive]}
            onPress={() => {
              setLoginMode('admin');
              setLoadingText('Sign In as Admin');
              if (!email || email.indexOf('@') === -1) {
                setEmail('torqueautoadvisor@gmail.com');
              }
            }}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={loginMode === 'admin' ? Colors.white : Colors.textMuted}
            />
            <Text style={[styles.tabText, loginMode === 'admin' && styles.tabTextActive]}>
              Admin Password
            </Text>
          </Pressable>
        </View>

        {/* Main Card */}
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={styles.welcomeText}>
            {loginMode === 'staff' ? 'Staff Authentication' : 'Admin Sign In'}
          </Text>
          <Text style={styles.instructionText}>
            {loginMode === 'staff'
              ? 'Enter your registered email to receive an approved OTP code.'
              : 'Direct credential sign-in for system administrator.'}
          </Text>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {loginMode === 'staff' ? 'STAFF WORK EMAIL' : 'ADMIN EMAIL'}
            </Text>
            <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailFocused ? Colors.primary : Colors.textLight}
                style={styles.fieldIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder={loginMode === 'staff' ? 'e.g. yourname@torqueautoadvisor.com' : 'torqueautoadvisor@gmail.com'}
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password Field (Admin Only) */}
          {loginMode === 'admin' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADMIN PASSWORD</Text>
              <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={passwordFocused ? Colors.primary : Colors.textLight}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter administrator password"
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.visibilityToggle}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.textLight}
                  />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.infoBanner}>
              <Ionicons name="shield-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoBannerText}>
                No password required. OTP will be sent directly to admin for approval.
              </Text>
            </View>
          )}

          {/* Submit Action Button */}
          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={loginMode === 'staff' ? handleStaffOtp : handleAdminLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonLabel}>
                  {loginMode === 'staff' ? 'Get OTP Code' : 'Sign In as Admin'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Footer info */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerInfo}>
            Shift expiry: 8:00 PM IST daily · Secure Multi-Factor Auth
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoImage: {
    width: 180,
    height: 60,
    marginBottom: Spacing.sm,
  },
  appName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: FontSize.xs,
    color: '#94A3B8',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#334155',
  },
  welcomeText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: FontSize.sm,
    color: '#94A3B8',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#CBD5E1',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: BorderRadius.md,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  fieldIcon: {
    paddingLeft: Spacing.md,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: '#F8FAFC',
  },
  visibilityToggle: {
    padding: Spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 47, 167, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 47, 167, 0.3)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  infoBannerText: {
    fontSize: FontSize.xs,
    color: '#93C5FD',
    flex: 1,
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonLabel: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerInfo: {
    fontSize: FontSize.xs,
    color: '#64748B',
    textAlign: 'center',
  },
});
