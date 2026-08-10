import { lazy, Suspense, useEffect, useState } from 'react';
import { WelcomeLogin } from './components/auth/WelcomeLogin';
import { Toaster } from './components/ui/Toast';
import { seedDatabase } from './data/seedDatabase';

// Dashboard-ul (toate view-urile, export PDF/Excel, finanțe) e încărcat abia
// după login — vizitatorii paginii publice nu plătesc acest cost la prima încărcare.
const Dashboard = lazy(() =>
  import('./components/dashboard/Dashboard').then((m) => ({ default: m.Dashboard }))
);

function DashboardFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
      <div className="w-10 h-10 border-4 border-[#28FAFC] border-t-transparent rounded-full animate-spin shadow-glow"></div>
    </div>
  );
}

interface UserState {
  username: string;
}

export default function App() {
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Rulăm verificarea și popularea bazei de date (doar dacă e goală)
    seedDatabase().then(() => {
      // 2. Citim sesiunea logată anterior din memorie
      const savedUser = localStorage.getItem('currentUser');

      if (savedUser) {
        setUser({ username: savedUser });
      }
      setLoading(false);
    }).catch(e => {
      console.error("Eroare severă la startup:", e);
      setLoading(false);
    });
  }, []);

  const handleLoginSuccess = (username: string) => {
    // Salvăm utilizatorul în browser
    localStorage.setItem('currentUser', username);
    setUser({ username });
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
        <div className="w-10 h-10 border-4 border-[#28FAFC] border-t-transparent rounded-full animate-spin shadow-glow"></div>
      </div>
    );
  }

  // Not Logged In View
  if (!user) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-1000">
        <WelcomeLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Logged In View (Dashboard)
  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Suspense fallback={<DashboardFallback />}>
          <Dashboard username={user.username} onLogout={handleLogout} />
        </Suspense>
      </div>
      <Toaster />
    </>
  );
}
