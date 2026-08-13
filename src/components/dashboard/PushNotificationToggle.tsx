import React, { useState, useEffect } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import {
  checkPushSubscriptionStatus,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from '../../utils/pushNotifications';

interface PushNotificationToggleProps {
  memberId: string;
}

export const PushNotificationToggle: React.FC<PushNotificationToggleProps> = ({ memberId }) => {
  const [loading, setLoading] = useState(false);
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
        setStatusMessage(res.message);
      } else {
        setStatusMessage(res.message);
      }
    }

    setLoading(false);
  };

  if (!supported) {
    return (
      <div className="text-xs text-slate-400 italic">
        Notificările Push nu sunt suportate pe acest browser/dispozitiv.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-xs tracking-wide transition-all duration-300 shadow-sm ${
          subscribed
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            : 'bg-text-executive_dark text-white hover:bg-slate-800'
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : subscribed ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            Notificări Push Active
          </>
        ) : (
          <>
            <Bell className="w-4 h-4 text-amber-400" />
            Activează Notificările Push
          </>
        )}
      </button>

      {statusMessage && (
        <p className={`text-[11px] font-medium ${subscribed ? 'text-emerald-600' : 'text-slate-500'}`}>
          {statusMessage}
        </p>
      )}
    </div>
  );
};
