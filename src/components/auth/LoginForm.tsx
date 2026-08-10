import { useState } from "react";
import { supabase } from "../../supabase";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface LoginFormProps {
  onSwitch: () => void;
}

export function LoginForm({ onSwitch }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Email sau parolă incorectă.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err: any) {
      setError("Eroare la conectarea cu Google.");
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="font-['Hanken_Grotesk'] text-2xl font-semibold text-brand-accent">Conectează-te</h2>
        <p className="font-['Manrope'] text-sm text-brand-accent/60 mt-1">Bine ai revenit!</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-['Manrope']">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-brand-accent/80 uppercase tracking-wider font-['Manrope']">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white border border-brand-muted/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all font-['Manrope']"
            placeholder="nume@exemplu.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-brand-accent/80 uppercase tracking-wider font-['Manrope']">
            Parolă
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border border-brand-muted/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all font-['Manrope'] pr-12"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-accent/40 hover:text-brand-accent/80 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-brand-accent text-white rounded-xl font-['Hanken_Grotesk'] font-medium hover:bg-brand-accent/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Intră în cont"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-brand-muted/10"></div>
        </div>
        <div className="relative flex justify-center text-sm font-['Manrope']">
          <span className="px-2 bg-white text-brand-accent/40">sau</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        type="button"
        className="w-full py-3 bg-white border border-brand-muted/10 text-brand-accent rounded-xl font-['Hanken_Grotesk'] font-medium hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Google Sign-In
      </button>

      <p className="text-center text-sm font-['Manrope'] text-brand-accent/60">
        Nu ai cont?{" "}
        <button
          onClick={onSwitch}
          className="font-semibold text-brand-primary hover:text-[#7bbce0] transition-colors"
        >
          Creează unul
        </button>
      </p>
    </div>
  );
}
