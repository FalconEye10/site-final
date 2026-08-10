import { useState } from "react";
import { supabase } from "../../supabase";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface RegisterFormProps {
  onSwitch: () => void;
}

export function RegisterForm({ onSwitch }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Parola trebuie să conțină minim 6 caractere.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "A apărut o eroare la înregistrare.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="font-['Hanken_Grotesk'] text-2xl font-semibold text-brand-accent">Creează un cont</h2>
        <p className="font-['Manrope'] text-sm text-brand-accent/60 mt-1">Alătură-te comunității noastre</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
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
            Parolă (Minim 6 caractere)
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
          className="w-full py-3 bg-brand-primary text-brand-accent rounded-xl font-['Hanken_Grotesk'] font-bold hover:bg-[#7bbce0] transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center mt-2 shadow-[0_4px_14px_rgba(40,250,252,0.39)]"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Înregistrează-te"}
        </button>
      </form>

      <p className="text-center text-sm font-['Manrope'] text-brand-accent/60">
        Ai deja cont?{" "}
        <button
          onClick={onSwitch}
          className="font-semibold text-brand-primary hover:text-[#7bbce0] transition-colors"
        >
          Conectează-te
        </button>
      </p>
    </div>
  );
}
