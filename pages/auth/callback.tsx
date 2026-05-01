import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
      else router.replace('/login');
    });
  }, [router]);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#F8FAFC', gap:16 }}>
      <div style={{ width:48, height:48, background:'linear-gradient(135deg,#0D9488,#0F766E)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff' }}>⚡</div>
      <div className="spinner" />
      <p style={{ fontSize:13, color:'#64748B' }}>Setting up your account…</p>
    </div>
  );
}
