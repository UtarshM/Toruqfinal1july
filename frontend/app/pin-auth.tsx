import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * PIN Authentication Disabled
 * Staff authenticate exclusively via email OTP.
 * Auto-redirects to dashboard.
 */
export default function PinLoginScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(protected)/dashboard');
  }, [router]);

  return null;
}
