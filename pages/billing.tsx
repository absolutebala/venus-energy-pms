import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function BillingRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/invoices'); }, [router]);
  return null;
}
