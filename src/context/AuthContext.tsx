import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  memberProfile: any | null;
  loading: boolean;
  isAdmin: boolean;
  login: (identifier: string, pass: string) => Promise<{ error?: any }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  memberProfile: null,
  loading: true,
  isAdmin: false,
  login: async () => ({}),
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [memberProfile, setMemberProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileForUser = async (authUser: User) => {
    try {
      // 1. Încercăm potrivirea după user_id UUID
      let { data } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      // 2. Dacă nu e găsit după user_id, căutăm după email sau username
      if (!data && authUser.email) {
        const { data: emailMatch } = await supabase
          .from('members')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();

        data = emailMatch;

        // Dacă l-am găsit după email, asociem automat user_id-ul pentru RLS
        if (data && !data.user_id) {
          await supabase
            .from('members')
            .update({ user_id: authUser.id })
            .eq('id', data.id);
          data.user_id = authUser.id;
        }
      }

      setMemberProfile(data || null);
    } catch (err) {
      console.error('Error fetching member profile:', err);
      setMemberProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Citim sesiunea inițială din Supabase Auth SDK (JWT token verificat)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileForUser(session.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Ascultăm schimbările de stare de autentificare (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfileForUser(session.user);
      } else {
        setMemberProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileForUser(user);
    }
  };

  const login = async (identifier: string, pass: string) => {
    try {
      let emailToUse = identifier.trim();

      // Dacă utilizatorul a introdus username (ex: stan.stefan), folosim adresa implicită @club.ro
      if (!emailToUse.includes('@')) {
        emailToUse = `${emailToUse.toLowerCase()}@club.ro`;
      }

      // Autentificare nativă prin engine-ul Supabase Auth (verificare JWT & Hash)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: pass,
      });

      if (error) {
        return { error };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        if (data.user) {
          await fetchProfileForUser(data.user);
        }
      }

      return { error: null };
    } catch (err: any) {
      console.error('Login error:', err);
      return { error: err };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setMemberProfile(null);
  };

  const isAdmin = Boolean(
    memberProfile?.role?.toLowerCase() === 'admin' ||
    user?.app_metadata?.role === 'admin'
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        memberProfile,
        loading,
        isAdmin,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
