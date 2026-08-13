import React, { useState, useEffect } from 'react';
import { Bell, Check, Loader2, Send } from 'lucide-react';
import {
  checkPushSubscriptionStatus,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  showLocalTestNotification,
} from '../../utils/pushNotifications';

interface PushNotificationToggleProps {
  memberId: string;
  showTestButton?: boolean;
}

export const PushNotificationToggle: React.FC<PushNotificationToggleProps> = ({
  memberId,
  showTestButton = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function initStatus() {
      const status = await checkPushSubscriptionStatus();
      setSupported(status.supported);
      setSubscribed(status.subscribed);
    }
    initStatus();
  }, [memberId]);

  const handleToggle = async () => {
    setLoading(true);
    setStatusMessage(null);

    if (subscribed) {
      const res = await unsubscribeUserFromPush(memberId);
      if (res.success) {
        setSubscribed(false);
        setStatusMessage('Notificările au fost dezactivate.');
      } else {
        setStatusMessage(res.message);
      }
    } else {
      const res = await subscribeUserToPush(memberId);
      if (res.success) {
        setSubscribed(true);
        setStatusMessage('Notificările Push au fost activate cu succes!');
      } else {
        setStatusMessage(res.message);
      }
    }

    setLoading(false);
  };

  const handleTestNotification = async () => {
    setTestLoading(true);
    const ok = await showLocalTestNotification(
      '🌟 Interact Camena — Test Notificare',
      'Aceasta este o notificare de test trimisă prin Service Worker.'
    );
    if (ok) {
      setStatusMessage('Notificare de test trimisă pe ecran!');
    } else {
      setStatusMessage('Permisiunea pentru notificări este necesară.');
    }
    setTestLoading(false);
  };

  if (!supported) {
    return (
      <div className="text-xs text-slate-400 italic">
        Notificările Push nu sunt suportate pe acest browser/dispozitiv.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs tracking-wide transition-all duration-300 shadow-sm ${
            subscribed
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold hover:brightness-110'
          }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : subscribed ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Push Active
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-slate-900" />
              Activează Notificări Push
            </>
          )}
        </button>

        {showTestButton && (
          <button
            onClick={handleTestNotification}
            disabled={testLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {testLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3 h-3 text-[#A0D8EF]" />
            )}
            Testează pe Dispozitiv
          </button>
        )}
      </div>

      {statusMessage && (
        <p className="text-[11px] font-medium text-slate-300 animate-in fade-in duration-300">
          {statusMessage}
        </p>
      )}
    </div>
  );
};
