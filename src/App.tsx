import { lazy, Suspense, useEffect } from 'react';
import { WelcomeLogin } from './components/auth/WelcomeLogin';
import { Toaster } from './components/ui/Toast';
import { seedDatabase } from './data/seedDatabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MAINTENANCE_MODE } from './config/maintenance';
import { MaintenanceScreen } from './components/maintenance/MaintenanceScreen';
import { PushNotificationPromptModal } from './components/dashboard/PushNotificationPromptModal';

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

function MainApp() {
  const { session, memberProfile, user, loading, logout } = useAuth();

  useEffect(() => {
    // Seed initial database structure if empty
    seedDatabase().catch((e) => {
      console.error('Eroare la verificarea inițială a bazei de date:', e);
    });
  }, []);

  if (loading) {
    return <DashboardFallback />;
  }

  // Not Logged In View (Strict JWT verification check - no raw localStorage fallback)
  if (!session || !user) {
    return (
      <>
        <div className="animate-in fade-in zoom-in-95 duration-1000">
          <WelcomeLogin onLoginSuccess={() => {}} />
        </div>
        <Toaster />
      </>
    );
  }

  const username = memberProfile?.username || user.email?.split('@')[0] || 'user';

  // Logged In View (Dashboard) with active Supabase Auth JWT Session
  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Suspense fallback={<DashboardFallback />}>
          <Dashboard username={username} onLogout={logout} />
        </Suspense>
      </div>
      <PushNotificationPromptModal memberId={memberProfile?.id || user.id} />
      <Toaster />
    </>
  );
}

export default function App() {
  if (MAINTENANCE_MODE) {
    return <MaintenanceScreen />;
  }

  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
