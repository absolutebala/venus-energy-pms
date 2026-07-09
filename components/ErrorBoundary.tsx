import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Venus Energy PMS Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const isNetworkError =
        this.state.error?.message?.toLowerCase().includes('fetch') ||
        this.state.error?.message?.toLowerCase().includes('network') ||
        this.state.error?.message?.toLowerCase().includes('supabase') ||
        this.state.error?.message?.toLowerCase().includes('failed');

      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
          background:'#F8FAFC', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'40px 48px', maxWidth:480,
            boxShadow:'0 4px 24px rgba(0,0,0,0.08)', textAlign:'center', border:'1px solid #E2E8F0' }}>

            <div style={{ width:64, height:64, borderRadius:16,
              background: isNetworkError ? '#FEF3C7' : '#FEF2F2',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 20px', fontSize:28 }}>
              {isNetworkError ? '🔌' : '⚠️'}
            </div>

            <div style={{ fontSize:20, fontWeight:700, color:'#1E293B', marginBottom:8 }}>
              {isNetworkError ? 'Connection Error' : 'Something went wrong'}
            </div>

            <div style={{ fontSize:14, color:'#64748B', lineHeight:1.6, marginBottom:24 }}>
              {isNetworkError
                ? 'Unable to connect to the server. Please check your internet connection and try again.'
                : 'An unexpected error occurred. Our team has been notified.'}
            </div>

            {this.state.error?.message && (
              <div style={{ background:'#F1F5F9', borderRadius:8, padding:'10px 14px',
                marginBottom:24, fontSize:11, color:'#64748B', textAlign:'left',
                fontFamily:'monospace', wordBreak:'break-word' as const }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{ padding:'10px 20px', background:'#fff', border:'1.5px solid #0D9488',
                  borderRadius:9, color:'#0D9488', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                style={{ padding:'10px 20px', background:'#0D9488', border:'none',
                  borderRadius:9, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                Go to Dashboard
              </button>
            </div>

            <div style={{ marginTop:20, fontSize:11, color:'#94A3B8' }}>
              Venus Energy PMS · Powered by ஐDataOne
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
