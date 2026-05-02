import React from 'react';
import { T } from '@/lib/theme';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export default function Modal({ title, onClose, children, width = 520 }: Props) {
  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:T.surface, borderRadius:16, padding:28, width:'100%', maxWidth:width, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:T.text, margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:T.textDim, lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
