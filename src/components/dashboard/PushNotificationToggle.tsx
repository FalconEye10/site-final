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
      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 p-2">
        Notificările Push nu sunt suportate pe acest browser/dispozitiv.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold text-xs tracking-wide transition-all duration-300 shadow-sm ${
            subscribed
              ? 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-700'
              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
          }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : subscribed ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              Push Active
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-slate-950" />
              Activează Notificări Push
            </>
          )}
        </button>

        {showTestButton && (
          <button
            onClick={handleTestNotification}
            disabled={testLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-all shadow-sm active:scale-95 shrink-0"
          >
            {testLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
            <span className="text-white font-bold text-xs">Testează pe Dispozitiv</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 animate-in fade-in duration-300 px-1">
          {statusMessage}
        </p>
      )}
    </div>
  );
};
