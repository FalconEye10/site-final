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
      // 1. Căutăm după user_id UUID
      let { data } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      // 2. Dacă nu e găsit după user_id, căutăm după email sau username prefix
      if (!data && authUser.email) {
        const usernamePrefix = authUser.email.split('@')[0];
        const { data: match } = await supabase
          .from('members')
          .select('*')
          .or(`email.eq.${authUser.email},username.ilike.${usernamePrefix}`)
          .maybeSingle();

        data = match;

        if (data && !data.user_id) {
          await supabase
            .from('members')
            .update({ user_id: authUser.id })
            .eq('id', data.id);
          data.user_id = authUser.id;
        }
      }

      if (data) {
        setMemberProfile(data);
        localStorage.setItem('active_member_session', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Eroare la încărcarea profilului:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Verificăm exclusiv sesiunea oficială Supabase Auth (fără bypass sau token-uri fictive)
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      if (currentSession && currentSession.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchProfileForUser(currentSession.user);
      } else {
        setSession(null);
        setUser(null);
        setMemberProfile(null);
        localStorage.removeItem('active_member_session');
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      if (newSession && newSession.user) {
        setSession(newSession);
        setUser(newSession.user);
        await fetchProfileForUser(newSession.user);
      } else {
        setSession(null);
        setUser(null);
        setMemberProfile(null);
        localStorage.removeItem('active_member_session');
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
      const cleanIdentifier = identifier.trim();
      const lowerIdent = cleanIdentifier.toLowerCase();

      // Construim lista de adrese posibile de email asociate membrului
      const candidateEmails: string[] = [];

      if (lowerIdent.includes('@')) {
        candidateEmails.push(lowerIdent);
      } else {
        // Căutăm întâi în tabela members adresa exactă de email înregistrată
        try {
          const { data: member } = await supabase
            .from('members')
            .select('email, username, id')
            .or(`username.ilike.${lowerIdent},id.ilike.${cleanIdentifier}`)
            .maybeSingle();

          if (member?.email) {
            candidateEmails.push(member.email.trim().toLowerCase());
          }
        } catch {
          // ignore lookup error
        }

        candidateEmails.push(`${lowerIdent}@interact-camena.internal`);
        candidateEmails.push(`${lowerIdent}@club.ro`);
      }

      // Încercăm autentificarea strictă prin Supabase Auth
      let lastAuthError: any = null;
      let authenticatedData: any = null;

      for (const email of candidateEmails) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });

        if (!authErr && authData?.session) {
          authenticatedData = authData;
          lastAuthError = null;
          break;
        } else if (authErr) {
          lastAuthError = authErr;
        }
      }

      if (!authenticatedData || !authenticatedData.session) {
        // Nicio adresă nu s-a putut autentifica cu parola furnizată
        return {
          error: lastAuthError || new Error('Nume de utilizator sau parolă incorectă.')
        };
      }

      // Autentificare validă prin Supabase Auth
      setSession(authenticatedData.session);
      setUser(authenticatedData.user);
      if (authenticatedData.user) {
        await fetchProfileForUser(authenticatedData.user);
      }

      return { error: null };
    } catch (err: any) {
      console.error('Fatal Login Error:', err);
      return { error: err };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('active_member_session');
    setSession(null);
    setUser(null);
    setMemberProfile(null);
  };

  const isAdmin = Boolean(
    memberProfile?.role?.toLowerCase() === 'admin' ||
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin'
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
