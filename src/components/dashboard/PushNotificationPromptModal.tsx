import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, ShieldCheck, X, Sparkles, Loader2 } from 'lucide-react';
import { checkPushSubscriptionStatus, subscribeUserToPush } from '../../utils/pushNotifications';

interface PushNotificationPromptModalProps {
  memberId: string;
}

export const PushNotificationPromptModal: React.FC<PushNotificationPromptModalProps> = ({ memberId }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      // Verificăm dacă utilizatorul a respins bannerul în ultimele 5 zile
      const dismissedTimestamp = localStorage.getItem('interact_push_prompt_dismissed');
      if (dismissedTimestamp) {
        const diffDays = (Date.now() - parseInt(dismissedTimestamp, 10)) / (1000 * 60 * 60 * 24);
        if (diffDays < 5) {
          return;
        }
      }

      const status = await checkPushSubscriptionStatus();
      // Dacă browserul suportă și utilizatorul nu este încă abonat sau permisiunea este default
      if (status.supported && !status.subscribed && status.permission !== 'denied') {
        // Afișăm după 2 secunde de la încărcare pentru o experiență lină
        const timer = setTimeout(() => setIsVisible(true), 2000);
        return () => clearTimeout(timer);
      }
    }

    checkStatus();
  }, [memberId]);

  const handleEnable = async () => {
    setLoading(true);
    const res = await subscribeUserToPush(memberId);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 2200);
    } else {
      // Dacă utilizatorul a refuzat sau a închis popup-ul browserului
      setIsVisible(false);
      localStorage.setItem('interact_push_prompt_dismissed', Date.now().toString());
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('interact_push_prompt_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#A0D8EF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
          title="Închide"
        >
          <X size={18} />
        </button>

        {success ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-white">Notificări Activate cu Succes!</h3>
            <p className="text-sm text-slate-300">
              Vei primi alerte instant pe dispozitiv pentru evenimente, voturi și motivări.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                <Bell size={24} className="animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles size={11} /> Recomandat pentru Membri
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  Fii la curent cu activitatea Clubului
                </h3>
              </div>
            </div>

            {/* Description & Benefits */}
            <p className="text-sm text-slate-300 leading-relaxed">
              Pentru a nu rata nicio întâlnire sau decizie importantă, activează alertele directe pe telefon sau PC:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                <CheckCircle2 size={16} className="text-[#A0D8EF] shrink-0" />
                <span>Ședințe & Proiecte noi</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                <CheckCircle2 size={16} className="text-[#A0D8EF] shrink-0" />
                <span>Răspunsuri la motivări</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                <CheckCircle2 size={16} className="text-[#A0D8EF] shrink-0" />
                <span>Voturi & Sondaje oficiale</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                <CheckCircle2 size={16} className="text-[#A0D8EF] shrink-0" />
                <span>Aprecieri & Kudos primite</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-bold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-amber-500/25 transition-all duration-300"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Bell size={18} />
                    Activează Notificările
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                disabled={loading}
                className="inline-flex items-center justify-center text-xs font-semibold text-slate-400 hover:text-white py-3 px-4 rounded-2xl hover:bg-white/5 transition-colors"
              >
                Amintește-mi mai târziu
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck size={13} />
              <span>Poți modifica sau dezactiva oricând permisiunea din browser.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
