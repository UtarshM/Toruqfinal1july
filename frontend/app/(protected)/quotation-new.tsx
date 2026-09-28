import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Legacy Quotation Creation module replaced by modern Rate Calculator.
 * Redirects automatically to Rate Calculator.
 */
export default function QuotationNewRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(protected)/rate-calculator');
  }, [router]);

  return null;
}
