import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Legacy Quotations module replaced by modern Rate Calculator.
 * Redirects automatically to Rate Calculator.
 */
export default function QuotationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(protected)/rate-calculator');
  }, [router]);

  return null;
}
