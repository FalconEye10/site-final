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
    <div className="flex flex-col gap-2.5 p-3.5 rounded-[2px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-anthropic">
      <div className="flex flex-wrap items-center gap-2 font-title">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            subscribed
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'btn-civic-primary'
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
              <Bell className="w-3.5 h-3.5" />
              Activează Notificări
            </>
          )}
        </button>

        {showTestButton && subscribed && (
          <button
            onClick={handleTestNotification}
            disabled={testLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[2px] btn-civic-secondary text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
          >
            {testLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            )}
            Test Push
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 font-data">
          {statusMessage}
        </div>
      )}
    </div>
  );
};
