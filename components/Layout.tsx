import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { T } from '@/lib/theme';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display:'flex', height:'100vh', background:T.bg, overflow:'hidden' }}>
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(c => !c)} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Header />
        <main style={{ flex:1, overflowY:'auto', padding:24 }}>
          {children}
        </main>
        {/* Footer */}
        <div style={{ borderTop:`1px solid ${T.border}`, padding:'10px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', background:T.surface, flexShrink:0 }}>
          <div style={{ fontSize:11, color:T.textDim }}>© 2025 Venus Energy Pvt. Ltd. · Telecom Infrastructure Management</div>
          <div style={{ fontSize:11, color:T.textDim }}>
            Powered by{' '}
            <a href="https://www.absoluteapplabs.com" target="_blank" rel="noopener noreferrer" style={{ color:T.primary, fontWeight:600, textDecoration:'none' }}>
              Absolute App Labs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
