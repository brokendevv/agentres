import React, { useEffect, useState } from 'react';
import { Download, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { OfflineQueueItem } from '../domain/types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAOfflineBarProps {
  offlineQueue: OfflineQueueItem[];
  onQueueOfflineSample: () => void;
  onSyncOfflineQueue: () => void;
}

export const PWAOfflineBar: React.FC<PWAOfflineBarProps> = ({
  offlineQueue,
  onQueueOfflineSample,
  onSyncOfflineQueue,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOnline = isOnline && !simulatedOffline;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => setSimulatedOffline((prev) => !prev)}
        className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer ${
          effectiveOnline
            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            : 'bg-amber-100 border-amber-300 text-amber-900'
        }`}
      >
        {effectiveOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-700" />
            <span>Offline Queue Active ({offlineQueue.length})</span>
          </>
        )}
      </button>

      {!effectiveOnline && (
        <button
          type="button"
          onClick={onQueueOfflineSample}
          className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 cursor-pointer"
        >
          + Draft Offline Stock Count
        </button>
      )}

      {offlineQueue.length > 0 && effectiveOnline && (
        <button
          type="button"
          onClick={onSyncOfflineQueue}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold inline-flex items-center gap-1 hover:bg-emerald-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync {offlineQueue.length} Queued Op(s)
        </button>
      )}

      {!isInstalled && deferredPrompt && (
        <button
          type="button"
          onClick={handleInstall}
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-semibold inline-flex items-center gap-1 hover:bg-slate-800 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Install PWA
        </button>
      )}
    </div>
  );
};
