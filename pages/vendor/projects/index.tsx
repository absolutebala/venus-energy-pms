import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Redirect() {
  const router = useRouter();
  useEffect(() => {
    const { id } = router.query;
    router.replace(id ? `/projects/${id}` : '/projects');
  }, [router]);
  return null;
}
