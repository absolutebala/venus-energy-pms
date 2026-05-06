import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { Profile, UserPermissions, AppModule } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/lib/permissions';

interface AuthContextValue {
  user:             User | null;
  profile:          Profile | null;
  permissions:      UserPermissions;
  loading:          boolean;
  signIn:           (email: string, password: string) => Promise<{ error: string | null }>;
  signOut:          () => Promise<void>;
  refreshProfile:   () => Promise<void>;
  getAccessToken:   () => Promise<string | null>;
  can:              (module: AppModule, action: 'create' | 'read' | 'edit' | 'delete') => boolean;
  isVendor:         boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading,     setLoading]     = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data as Profile);
      await fetchPermissions(data.role);
    }
  }, []);

  const fetchPermissions = async (role: string) => {
    const { data } = await supabase.from('role_permissions').select('*').eq('role', role);
    if (data && data.length > 0) {
      const map: UserPermissions = {};
      data.forEach((p: any) => {
        map[p.module] = { module:p.module, can_create:p.can_create, can_read:p.can_read, can_edit:p.can_edit, can_delete:p.can_delete };
      });
      setPermissions(map);
    } else {
      const defaults = DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS];
      if (defaults) {
        const map: UserPermissions = {};
        Object.entries(defaults).forEach(([mod, perm]) => { map[mod] = perm; });
        setPermissions(map);
      }
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // Reliable token getter — always reads fresh from supabase client
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setPermissions({}); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setPermissions({});
  };

  const can = (module: AppModule, action: 'create' | 'read' | 'edit' | 'delete'): boolean => {
    if (profile?.role === 'super_admin') return true;
    const p = permissions[module];
    if (!p) return false;
    return action === 'create' ? p.can_create : action === 'read' ? p.can_read : action === 'edit' ? p.can_edit : p.can_delete;
  };

  const isVendor = profile?.role === 'vendor';

  return (
    <AuthContext.Provider value={{ user, profile, permissions, loading, signIn, signOut, refreshProfile, getAccessToken, can, isVendor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
