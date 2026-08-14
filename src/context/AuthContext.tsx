import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../supabase';
import { isBoardMember } from '../utils/permissions';

interface AuthContextType {
  session: any | null;
  user: any | null;
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
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [memberProfile, setMemberProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileById = async (memberId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .maybeSingle();

      if (!error && data) {
        setMemberProfile(data);
        localStorage.setItem('active_member_session', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Eroare la reîmprospătarea profilului:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Verificăm sesiunea activă stocată securizat
    const initSession = async () => {
      try {
        const stored = localStorage.getItem('active_member_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) {
            // Re-validăm existența în baza de date
            const { data: freshMember } = await supabase
              .from('members')
              .select('*')
              .eq('id', parsed.id)
              .maybeSingle();

            if (mounted) {
              const activeMember = freshMember || parsed;
              const usrObj = {
                id: activeMember.id,
                email: activeMember.email,
                role: activeMember.role,
                user_metadata: {
                  name: activeMember.name,
                  role: activeMember.role,
                  username: activeMember.username,
                },
              };
              setMemberProfile(activeMember);
              setUser(usrObj);
              setSession({ user: usrObj, token: `sess_${activeMember.id}` });
            }
          }
        }
      } catch (e) {
        console.warn('Sesiune locală invalidă:', e);
        localStorage.removeItem('active_member_session');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshProfile = async () => {
    if (memberProfile?.id) {
      await fetchProfileById(memberProfile.id);
    }
  };

  const login = async (identifier: string, pass: string) => {
    try {
      const cleanIdentifier = identifier.trim();
      const cleanPassword = pass.trim();

      if (!cleanIdentifier || !cleanPassword) {
        return { error: { message: 'Te rugăm să introduci numele de utilizator și parola.' } };
      }

      // 1. Apelăm funcția securizată RPC din Supabase Database
      const { data, error } = await supabase.rpc('authenticate_member', {
        p_identifier: cleanIdentifier,
        p_password: cleanPassword,
      });

      if (error) {
        console.error('RPC Authentication Error:', error);
        return {
          error: {
            message:
              'Baza de date nu a putut procesa autentificarea. Asigură-te că scriptul SQL a fost rulat în Supabase.',
          },
        };
      }

      if (!data || data.success === false) {
        // Acces strict refuzat dacă parola sau utilizatorul nu se potrivesc
        return {
          error: {
            message: data?.error || 'Nume de utilizator sau parolă incorectă.',
          },
        };
      }

      // Autentificare Reușită
      const member = data.member;
      const usrObj = {
        id: member.id,
        email: member.email,
        role: member.role,
        user_metadata: {
          name: member.name,
          role: member.role,
          username: member.username,
        },
      };

      setMemberProfile(member);
      setUser(usrObj);
      setSession({ user: usrObj, token: `sess_${member.id}` });
      localStorage.setItem('active_member_session', JSON.stringify(member));

      return { error: null };
    } catch (err: any) {
      console.error('Fatal Login Exception:', err);
      return { error: { message: err.message || 'Eroare neașteptată la autentificare.' } };
    }
  };

  const logout = async () => {
    localStorage.removeItem('active_member_session');
    setSession(null);
    setUser(null);
    setMemberProfile(null);
  };

  const isAdmin = Boolean(
    memberProfile?.role?.toLowerCase() === 'admin' ||
    isBoardMember(memberProfile)
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
