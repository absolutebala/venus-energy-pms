import React from 'react';
import Link from 'next/link';
import { T } from '@/lib/theme';

export default function Custom404() {
  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', fontFamily:"'Inter',sans-serif", padding:20 }}>
      <div style={{ width:64, height:64, background:`linear-gradient(135deg,${T.primary},#0F766E)`, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:20, boxShadow:`0 8px 25px ${T.primary}30` }}>⚡</div>
      <h1 style={{ fontSize:72, fontWeight:800, color:T.primary, margin:0, lineHeight:1 }}>404</h1>
      <h2 style={{ fontSize:22, fontWeight:700, color:T.text, margin:'12px 0 8px' }}>Page Not Found</h2>
      <p style={{ fontSize:14, color:T.textMuted, textAlign:'center', maxWidth:360, marginBottom:28 }}>The page you're looking for doesn't exist or has been moved.</p>
      <Link href="/dashboard" style={{ background:T.primary, color:'#fff', borderRadius:9, padding:'11px 24px', fontSize:14, fontWeight:600, textDecoration:'none', boxShadow:`0 4px 14px ${T.primary}40` }}>
        → Back to Dashboard
      </Link>
      <div style={{ marginTop:40, fontSize:11, color:T.textDim, textAlign:'center' }}>
        <div>© 2025 Venus Energy Pvt. Ltd.</div>
        <div style={{ marginTop:4 }}>
          Powered by{' '}
          <a href="https://www.absoluteapplabs.com" target="_blank" rel="noopener noreferrer" style={{ color:T.primary, fontWeight:600, textDecoration:'none' }}>Absolute App Labs</a>
        </div>
      </div>
    </div>
  );
}
