import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { verifyStaffOtp, requestStaffOtp } = useAuth();
  const params = useLocalSearchParams<{ email: string; fullName: string }>();

  const email = params.email || '';
  const fullName = params.fullName || 'Staff User';

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Refs for the 6 input boxes
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // 60-second countdown for Resend OTP
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Handle single digit change or paste
  const handleDigitChange = (value: string, index: number) => {
    // If user pasted multi-digit code (e.g. "625269")
    if (value.length > 1) {
      const cleanDigits = value.replace(/[^0-9]/g, '').slice(0, 6);
      if (cleanDigits.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = cleanDigits[i] || '';
        }
        setOtpDigits(newDigits);
        const nextFocusIndex = Math.min(cleanDigits.length, 5);
        inputRefs.current[nextFocusIndex]?.focus();
        if (cleanDigits.length === 6) {
          submitOtp(cleanDigits);
        }
        return;
      }
    }

    const clean = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);
    setError('');

    // Advance focus to next input if digit entered
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    const completeOtp = newDigits.join('');
    if (completeOtp.length === 6 && !newDigits.includes('')) {
      submitOtp(completeOtp);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const submitOtp = async (codeToVerify?: string) => {
    const otp = codeToVerify || otpDigits.join('');
    if (otp.length < 6) {
      shake();
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const loggedUser = await verifyStaffOtp(email, otp);
      setTimeout(() => {
        if (loggedUser?.requiresOnboardingForm) {
          router.replace('/onboarding');
        } else {
          router.replace('/(protected)/dashboard');
        }
      }, 50);
    } catch (err: any) {
      setLoading(false);
      shake();
      const msg = err.message || 'Verification failed. Please check the OTP.';
      setError(msg);
      Alert.alert('Verification Failed', msg);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await requestStaffOtp(email);
      setTimer(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('OTP Resent', 'A new OTP has been dispatched.');
    } catch (err: any) {
      Alert.alert('Resend Failed', err.message || 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>Enter the 6-digit verification code</Text>
        </View>

        {/* User Badge Info */}
        <View style={styles.userBadge}>
          <Ionicons name="person-circle-outline" size={24} color={Colors.primary} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.userName}>{fullName}</Text>
            <Text style={styles.userEmail}>{email}</Text>
          </View>
        </View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 6 Digit Segmented Input Boxes */}
        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
          {otpDigits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                inputRefs.current[index]?.isFocused() ? styles.otpBoxFocused : null,
              ]}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              textAlign="center"
              autoFocus={index === 0}
            />
          ))}
        </Animated.View>

        {/* Verify Button */}
        <Pressable
          style={[styles.verifyButton, loading && styles.buttonDisabled]}
          onPress={() => submitOtp()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.verifyButtonText}>Verify OTP & Sign In</Text>
          )}
        </Pressable>

        {/* Resend Timer & Action */}
        <View style={styles.resendContainer}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              Resend OTP in <Text style={{ fontWeight: '700', color: Colors.primary }}>{timer}s</Text>
            </Text>
          ) : (
            <Pressable onPress={handleResend} disabled={resending}>
              <Text style={styles.resendActionText}>
                {resending ? 'Sending...' : 'Resend OTP to Admin'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Back to Login */}
        <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
          <Ionicons name="arrow-back" size={16} color={Colors.textMuted} />
          <Text style={styles.backButtonText}>Use a different email address</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 140,
    height: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  inboxNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
    gap: 6,
  },
  inboxNoticeText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    width: '100%',
    gap: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    flex: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.xl,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceMuted,
  },
  otpBoxFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  resendContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  timerText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  resendActionText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: 6,
  },
  backButtonText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
