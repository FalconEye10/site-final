import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthContainer() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF9F5] relative overflow-hidden">
      {/* Decorative blurred background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-brand-muted/10 p-8">
          <div className="text-center mb-8">
            <h1 className="font-['Great_Vibes'] text-4xl text-brand-accent mb-2">Interact Camena</h1>
            <p className="font-['Hanken_Grotesk'] text-sm text-brand-accent/60">Service Above Self</p>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <LoginForm onSwitch={() => setIsLogin(false)} />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <RegisterForm onSwitch={() => setIsLogin(true)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
