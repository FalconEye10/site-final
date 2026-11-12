import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, ArrowLeft, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoginStoryPanel } from './LoginStoryPanel';

interface WelcomeLoginProps {
  onLoginSuccess: (username: string) => void;
}

export function WelcomeLogin({ onLoginSuccess }: WelcomeLoginProps) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier) {
      setError('Introduceți numele de utilizator sau ID-ul de membru.');
      return;
    }
    if (!cleanPassword) {
      setError('Introduceți parola de acces.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: loginErr } = await login(cleanIdentifier, cleanPassword);

      if (loginErr) {
        if (loginErr.message?.includes('Invalid login credentials')) {
          setError('Nume de utilizator sau parolă incorectă.');
        } else {
          setError(loginErr.message || 'Eroare la autentificare.');
        }
      } else {
        onLoginSuccess(cleanIdentifier.toLowerCase());
      }
    } catch (err: any) {
      console.error('Supabase Login Error:', err);
      setError(`Eroare tehnică: ${err.message || 'Conexiunea a eșuat.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0D1117] text-slate-100 flex flex-col md:grid md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-[1.15fr_0.85fr] xl:grid-cols-[1.2fr_0.8fr] md:h-screen md:overflow-hidden font-headings selection:bg-sky-500 selection:text-slate-950">
      
      {/* 1. STÂNGA: Scena Narativă Rotary & Roata de Aur Continuă */}
      <div className="w-full h-auto md:h-full order-1 md:order-1 flex md:overflow-y-auto">
        <LoginStoryPanel />
      </div>

      {/* 2. DREAPTA: Cardul de Autentificare Disciplinat & Echilibrat */}
      <div className="w-full flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 order-2 md:order-2 bg-[#090D14] relative md:overflow-y-auto">
        
        {/* Glow discret arhitectural de fundal */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,_rgba(56,189,248,0.03),transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[420px] sm:max-w-[440px] md:max-w-[420px] lg:max-w-[450px] bg-[#161B22] rounded-[2px] p-6 sm:p-8 border border-slate-800 shadow-[0_16px_48px_rgba(0,0,0,0.5)] relative z-10 my-auto"
        >
          {/* Logo Oficial Interact Camena */}
          <div className="mb-5 sm:mb-6 flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="bg-white p-2 sm:p-2.5 rounded-[2px] border border-slate-200 shadow-sm inline-flex items-center justify-center mb-3 sm:mb-4">
              <img
                src="/logo.png"
                alt="Interact Club Camena Piatra-Neamț"
                className="h-8 sm:h-9 w-auto max-h-[42px] object-contain block"
              />
            </div>

            <div className="w-full">
              {/* Kicker Subtitlu */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="text-[10px] font-title uppercase tracking-widest text-sky-400 font-bold px-2 py-0.5 rounded-[2px] bg-sky-950/60 border border-sky-800/60">
                  Portal Securizat
                </span>
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-[11px] text-slate-400 font-title font-medium">
                  Membri & Consiliu
                </span>
              </div>

              {/* Titlu Principal */}
              <h1 className="text-2xl sm:text-3xl font-bold font-anthropicSerif text-white tracking-tight mt-1">
                Autentificare Portal
              </h1>

              {/* Descriere */}
              <p className="text-xs sm:text-[13px] text-slate-400 font-anthropic mt-1 leading-relaxed">
                Introduceți credențialele oficiale pentru a accesa registrul financiar, prezențele și deliberările interne Camena.
              </p>
            </div>
          </div>

          {/* Formular Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Câmp Utilizator */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5 font-title uppercase tracking-wider">
                Utilizator sau ID Membru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Ex: stan.stefan sau M061"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  autoComplete="username"
                  autoCapitalize="none"
                  className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-[2px] border text-sm font-medium transition-all bg-[#0D1117] border-slate-700/80 text-white placeholder:text-slate-500 focus:bg-[#0D1117] focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 focus:outline-none font-anthropic"
                  required
                />
              </div>
            </div>

            {/* Câmp Parolă */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 font-title uppercase tracking-wider">
                  Parolă de acces
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-[2px] border text-sm font-medium transition-all bg-[#0D1117] border-slate-700/80 text-white placeholder:text-slate-500 focus:bg-[#0D1117] focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 focus:outline-none font-anthropic"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? 'Ascunde parola' : 'Arată parola'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Notificare de eroare */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 p-3 rounded-[2px] bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-medium font-anthropic">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div className="leading-snug">{error}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buton Submit Principal */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-[2px] bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-title"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Se verifică datele...</span>
                </>
              ) : (
                <span>Accesează Contul</span>
              )}
            </button>

            {/* Buton Întoarcere la Site */}
            <button
              type="button"
              onClick={() => {
                window.location.hash = '';
              }}
              className="w-full py-2.5 px-4 rounded-[2px] border border-slate-700/80 hover:border-slate-600 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-title uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Înapoi la Site-ul Public</span>
            </button>
          </form>

          {/* Bară Informații Securitate */}
          <div className="mt-6 pt-3.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-data">
            <div className="flex items-center gap-1.5 font-title">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Autentificare Criptată</span>
            </div>
            <span className="text-slate-400">D2241 • Piatra-Neamț</span>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
