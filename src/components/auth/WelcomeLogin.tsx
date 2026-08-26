import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveBackground } from '../ui/LiveBackground';
import { useAuth } from '../../context/AuthContext';

interface WelcomeLoginProps {
  onLoginSuccess: (username: string) => void;
}

export function WelcomeLogin({ onLoginSuccess }: WelcomeLoginProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Hide intro after 2.4 seconds
    const timer = setTimeout(() => setShowIntro(false), 2400);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formattedUser = username.trim().toLowerCase();

    try {
      const { error: loginErr } = await login(formattedUser, password);

      if (loginErr) {
        if (loginErr.message?.includes('Invalid login credentials')) {
          setError('Utilizator sau parolă incorecte.');
        } else {
          setError(loginErr.message || 'Eroare la autentificare.');
        }
      } else {
        onLoginSuccess(formattedUser);
      }
    } catch (err: any) {
      console.error("Supabase Login Error:", err);
      setError(`EROARE TEHNICĂ: ${err.message || 'Ceva s-a stricat.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Emil Kowalski style easings
  const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1];
  const easeInOut: [number, number, number, number] = [0.77, 0, 0.175, 1];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-6 bg-[#FAF9F5] dark:bg-[#070A0F] font-anthropic text-slate-900 dark:text-white overflow-y-auto overflow-x-hidden relative transition-colors duration-300">
      
      {/* Dynamic Animated Ambient Background */}
      <LiveBackground themeColor="#89cff0" />
      
      {/* Decorative blurred background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-400/20 dark:bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Floating 3D Geometric Shape 1: Glass Torus/Ring (Top Left) */}
      <motion.div
        className="absolute top-[12%] left-[15%] w-28 h-28 rounded-full border border-white/20 dark:border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md shadow-[0_8px_32px_rgba(137,207,240,0.15)] flex items-center justify-center pointer-events-none hidden md:flex z-10"
        animate={{
          y: [0, -15, 0],
          rotateY: [0, 360],
          rotateZ: [0, 90, 0]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <svg width="64" height="64" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
          <circle cx="30" cy="30" r="20" stroke="url(#paint0_linear)" strokeWidth="2" strokeDasharray="4 4"/>
          <ellipse cx="30" cy="30" rx="20" ry="8" stroke="url(#paint1_linear)" strokeWidth="1.5" transform="rotate(-30 30 30)"/>
          <ellipse cx="30" cy="30" rx="20" ry="8" stroke="url(#paint2_linear)" strokeWidth="1.5" transform="rotate(45 30 30)"/>
          <defs>
            <linearGradient id="paint0_linear" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#89cff0"/>
              <stop offset="1" stopColor="#ffeacd"/>
            </linearGradient>
            <linearGradient id="paint1_linear" x1="10" y1="20" x2="50" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0F172A"/>
              <stop offset="1" stopColor="#89cff0"/>
            </linearGradient>
            <linearGradient id="paint2_linear" x1="20" y1="10" x2="40" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffeacd"/>
              <stop offset="1" stopColor="#475569"/>
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
 
      {/* Floating 3D Geometric Shape 2: Isometric Glass Cube (Bottom Right) */}
      <motion.div
        className="absolute bottom-[15%] right-[12%] w-28 h-28 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-sm flex items-center justify-center pointer-events-none hidden md:flex z-10"
        animate={{
          y: [0, 18, 0],
          rotateX: [0, 360],
          rotateY: [360, 0]
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
          <path d="M40 15L65 28L40 41L15 28L40 15Z" fill="url(#cube_top)" stroke="#ffeacd" strokeWidth="1"/>
          <path d="M15 28V58L40 71V41L15 28Z" fill="url(#cube_left)" stroke="#89cff0" strokeWidth="1"/>
          <path d="M40 41V71L65 58V28L40 41Z" fill="url(#cube_right)" stroke="#475569" strokeWidth="1"/>
          <defs>
            <linearGradient id="cube_top" x1="40" y1="15" x2="40" y2="41" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffeacd" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#ffeacd" stopOpacity="0.05"/>
            </linearGradient>
            <linearGradient id="cube_left" x1="15" y1="28" x2="40" y2="71" gradientUnits="userSpaceOnUse">
              <stop stopColor="#89cff0" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#89cff0" stopOpacity="0.05"/>
            </linearGradient>
            <linearGradient id="cube_right" x1="65" y1="28" x2="40" y2="71" gradientUnits="userSpaceOnUse">
              <stop stopColor="#475569" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#475569" stopOpacity="0.05"/>
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
 
      {/* Floating 3D Geometric Shape 3: Glossy Glass Frame (Middle Right) */}
      <motion.div
        className="absolute top-[40%] right-[20%] w-16 h-16 rounded-[2px] bg-slate-100/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 backdrop-blur-sm pointer-events-none hidden lg:block z-0"
        animate={{
          y: [0, -25, 0],
          x: [0, 15, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
 
      {/* Floating 3D Geometric Shape 4: Glass Tetrahedron/Pyramid (Bottom Left) */}
      <motion.div
        className="absolute bottom-[25%] left-[18%] w-16 h-16 flex items-center justify-center pointer-events-none hidden lg:flex z-0"
        animate={{
          y: [0, 20, 0],
          rotate: 360
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      >
        <svg width="50" height="50" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
          <path d="M20 2L38 32H2L20 2Z" stroke="#ffeacd" strokeWidth="1.2" fill="url(#tetra_grad)"/>
          <defs>
            <linearGradient id="tetra_grad" x1="20" y1="2" x2="20" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffeacd" stopOpacity="0.2"/>
              <stop offset="1" stopColor="#0F172A" stopOpacity="0.05"/>
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Intro Animation Overlay (Loading/Welcome Page) */}
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF9F5] dark:bg-[#070A0F] font-anthropic text-slate-900 dark:text-white"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
            transition={{ duration: 1.4, ease: easeInOut }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.8, ease: easeOut, delay: 0.2 }}
              className="flex items-center justify-center mb-6"
            >
              <div className="w-14 h-14 rounded-[2px] bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center border border-slate-800 dark:border-slate-200 shadow-md">
                <span className="font-anthropicSerif text-2xl font-bold">IC</span>
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.8, ease: easeOut, delay: 0.5 }}
              className="font-anthropicSerif text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white"
            >
              Interact Camena
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ duration: 1.8, ease: easeOut, delay: 1.0 }}
              className="mt-3 font-title text-xs tracking-[0.2em] uppercase text-slate-600 dark:text-slate-300 font-bold"
            >
              Service Above Self
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={!showIntro ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.2, ease: easeOut, delay: showIntro ? 0 : 0.3 }}
        className="w-full max-w-[480px] bg-white/95 dark:bg-[#0E131F]/95 backdrop-blur-md rounded-[2px] p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 relative z-10 flex flex-col items-center animate-in fade-in duration-700 font-anthropic text-slate-900 dark:text-white"
      >
        {/* Logo */}
        <div className="relative z-20 pointer-events-none mt-1 mb-3 bg-white/80 dark:bg-white/10 p-2.5 rounded-[2px] border border-slate-200/60 dark:border-white/10 shadow-xs backdrop-blur-sm">
          <img 
            src="/logo.png" 
            alt="Interact Logo" 
            className="w-full h-auto max-h-[75px] object-contain dark:brightness-110" 
            referrerPolicy="no-referrer" 
          />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold font-anthropicSerif text-slate-900 dark:text-white text-center mb-0.5">Interact Camena</h2>
        <p className="text-xs font-title uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 text-center mb-3">Portal Administrație</p>

        {/* Copywriting */}
        <p className="text-xs text-slate-600 dark:text-slate-300 font-anthropic text-center leading-relaxed max-w-[380px] mb-6 px-2">
          Arhitectura schimbării locale începe prin organizare. Unificăm membrii, inițiativele și resursele comunității sub deviza <span className="font-bold text-slate-900 dark:text-sky-400">Service Above Self</span>.
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-4 font-anthropic">
          {/* Username Input */}
          <div>
            <label className="block text-[10px] font-bold font-title uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Utilizator</label>
            <input
              type="text"
              placeholder="Ex: ITC"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-[2px] border transition-all font-anthropic text-xs font-medium bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none dark:bg-[#141A28] dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#1A2234] dark:focus:border-sky-400"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[10px] font-bold font-title uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Parolă</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-[2px] border transition-all font-anthropic text-xs font-medium bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none dark:bg-[#141A28] dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#1A2234] dark:focus:border-sky-400"
              required
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5, height: 0 }} 
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -5, height: 0 }}
                className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-medium font-anthropic overflow-hidden text-center rounded-[2px] p-2.5"
              >
                <div>{error}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 rounded-[2px] font-title font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Se conectează...' : 'Autentificare'}
          </button>

          {/* Back to Site Button */}
          <button
            type="button"
            onClick={() => {
              window.location.hash = '';
            }}
            className="w-full py-2 border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-200 dark:hover:text-white dark:bg-slate-800/40 dark:hover:bg-slate-800 rounded-[2px] text-xs font-bold font-title transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer group"
          >
            <svg 
              width="13" 
              height="13" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="transition-transform group-hover:-translate-x-1"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Înapoi la site
          </button>
        </form>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-6 font-anthropic leading-relaxed">
          © {new Date().getFullYear()} Interact Camena Piatra Neamț.<br />
          Serviciu Digital Securizat.
        </p>
      </motion.div>
    </div>
  );
}
