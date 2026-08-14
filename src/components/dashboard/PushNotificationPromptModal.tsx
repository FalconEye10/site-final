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
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300 font-anthropic">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2px] p-6 sm:p-7 shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-300 font-anthropic">
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-[2px] hover:bg-white/5 transition-colors cursor-pointer"
          title="Închide"
        >
          <X size={16} />
        </button>

        {success ? (
          <div className="py-6 text-center space-y-2.5 animate-in zoom-in-95 duration-300 font-anthropic">
            <div className="w-12 h-12 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-white font-anthropicSerif">Notificări Activate cu Succes!</h3>
            <p className="text-xs text-slate-300 font-anthropic">
              Vei primi alerte instant pe dispozitiv pentru evenimente, voturi și motivări.
            </p>
          </div>
        ) : (
          <div className="space-y-4 font-anthropic">
            {/* Header Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-[2px] bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <Bell size={20} />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase tracking-wider font-title">
                  <Sparkles size={10} /> Recomandat pentru Membri
                </div>
                <h3 className="text-lg font-bold text-white leading-tight font-anthropicSerif">
                  Fii la curent cu activitatea Clubului
                </h3>
              </div>
            </div>

            {/* Description & Benefits */}
            <p className="text-xs text-slate-300 leading-relaxed font-anthropic">
              Pentru a nu rata nicio întâlnire sau decizie importantă, activează alertele directe pe telefon sau PC:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 font-anthropic">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-[2px]">
                <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                <span>Ședințe & Proiecte noi</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-[2px]">
                <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                <span>Răspunsuri la motivări</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-[2px]">
                <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                <span>Voturi & Sondaje oficiale</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-[2px]">
                <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                <span>Aprecieri & Kudos primite</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-1.5 flex flex-col sm:flex-row gap-2.5 font-title">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-[2px] shadow-xs transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Bell size={16} />
                    Activează Notificările
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                disabled={loading}
                className="inline-flex items-center justify-center text-xs font-bold text-slate-400 hover:text-white py-2 px-3 rounded-[2px] hover:bg-white/5 transition-colors cursor-pointer"
              >
                Amintește-mi mai târziu
              </button>
            </div>

            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-anthropic">
              <ShieldCheck size={12} />
              <span>Poți modifica sau dezactiva oricând permisiunea din browser.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
