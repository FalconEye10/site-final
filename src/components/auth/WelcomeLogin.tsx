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
    <div className="min-h-screen w-full bg-[#070B14] text-slate-100 flex flex-col md:grid md:grid-cols-[1fr_1fr] lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.15fr_0.95fr] 2xl:grid-cols-[1.2fr_0.9fr] md:h-screen md:overflow-hidden font-headings selection:bg-amber-400 selection:text-slate-900">
      
      {/* 1. STÂNGA: Scena Narativă Rotary & Roata de Aur Continuă */}
      <div className="w-full h-auto md:h-full order-1 md:order-1 flex md:overflow-y-auto">
        <LoginStoryPanel />
      </div>

      {/* 2. DREAPTA: Cardul de Autentificare Disciplinat & Echilibrat Spațial */}
      <div className="w-full flex items-center justify-center p-4 sm:p-6 md:p-6 lg:p-8 xl:p-12 order-2 md:order-2 bg-[#050811] relative md:overflow-y-auto">
        
        {/* Glow discret de fundal pentru a elimina senzația de vid pe monitoare mari */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,_rgba(245,158,11,0.035),transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-[420px] sm:max-w-[440px] md:max-w-[420px] lg:max-w-[460px] xl:max-w-[490px] bg-[#0A101D] rounded-xl sm:rounded-2xl p-5 sm:p-7 md:p-6 lg:p-8 xl:p-9 border border-slate-800/90 shadow-[0_12px_40px_rgba(0,0,0,0.6)] relative z-10 my-auto"
        >
          {/* Logo Oficial Interact Camena pe fundal alb curat, 100% vizibil */}
          <div className="mb-4 sm:mb-5 md:mb-5 lg:mb-6 flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-sm inline-flex items-center justify-center mb-3 sm:mb-3.5">
              <img
                src="/logo.png"
                alt="Interact Club Camena Piatra-Neamț"
                className="h-8 sm:h-10 md:h-9 lg:h-11 w-auto max-h-[46px] object-contain block"
              />
            </div>

            <div className="w-full">
              {/* Kicker Subtitlu: font-title (Google Sans) */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] font-title uppercase tracking-wider text-amber-400 font-bold">
                  Autentificare
                </span>
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-[11px] sm:text-xs text-slate-400 font-title font-medium">
                  Portal Membri & Conducere
                </span>
              </div>

              {/* Titlu Principal: font-display (Playfair Display / Newsreader) */}
              <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold font-display text-white tracking-tight mt-1">
                Bine ați revenit
              </h1>

              {/* Descriere: font-headings (Inter) */}
              <p className="text-[11px] sm:text-xs md:text-xs lg:text-[13px] text-slate-400 font-headings mt-1 leading-relaxed">
                Introduceți credențialele oficiale pentru a accesa registrul financiar, evidența cotizațiilor și deciziile interne.
              </p>
            </div>
          </div>

          {/* Formular Login */}
          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-3.5 md:space-y-3.5 lg:space-y-4">
            
            {/* Câmp Utilizator */}
            <div>
              {/* Etichetă: font-title (Google Sans) */}
              <label className="block text-[11px] sm:text-xs font-bold text-slate-300 mb-1 font-title uppercase tracking-wide">
                Utilizator / ID Membru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                {/* Input text: font-headings (Inter) */}
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
                  className="w-full pl-10 pr-3.5 py-2.5 sm:py-2.5 md:py-2.5 lg:py-3 rounded-lg border text-sm font-medium transition-all bg-[#0F172A] border-slate-700 text-white placeholder:text-slate-500 focus:bg-[#131D36] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none font-headings"
                  required
                />
              </div>
            </div>

            {/* Câmp Parolă */}
            <div>
              <div className="flex items-center justify-between mb-1">
                {/* Etichetă: font-title (Google Sans) */}
                <label className="text-[11px] sm:text-xs font-bold text-slate-300 font-title uppercase tracking-wide">
                  Parolă de acces
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                {/* Input parolă: font-headings (Inter) */}
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 sm:py-2.5 md:py-2.5 lg:py-3 rounded-lg border text-sm font-medium transition-all bg-[#0F172A] border-slate-700 text-white placeholder:text-slate-500 focus:bg-[#131D36] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none font-headings"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
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

            {/* Notificare de eroare: font-headings (Inter) */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-medium font-headings">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div className="leading-snug">{error}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buton Submit Principal: font-title (Google Sans) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 sm:py-3 lg:py-3.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-title"
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

            {/* Buton Întoarcere la Site: font-title (Google Sans) */}
            <button
              type="button"
              onClick={() => {
                window.location.hash = '';
              }}
              className="w-full py-2 sm:py-2.5 lg:py-3 px-4 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-title uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-900/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Înapoi la Site</span>
            </button>
          </form>

          {/* Bară Informații Securitate: font-title & font-data */}
          <div className="mt-4 sm:mt-5 md:mt-5 lg:mt-6 pt-3 sm:pt-4 border-t border-slate-800/60 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-title">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Conexiune Securizată</span>
            </div>
            <span className="font-title">Piatra-Neamț</span>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
