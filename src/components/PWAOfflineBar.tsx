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
        className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
          effectiveOnline
            ? 'bg-white border-[#E1E6E1] text-[#18231F] hover:bg-[#EFF2ED]'
            : 'bg-[#E6F0E9] border-[#176B58]/40 text-[#18231F]'
        }`}
      >
        {effectiveOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-[#176B58]" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-[#176B58]" />
            <span>Offline Queue Active ({offlineQueue.length})</span>
          </>
        )}
      </button>

      {!effectiveOnline && (
        <button
          type="button"
          onClick={onQueueOfflineSample}
          className="px-2.5 py-1.5 rounded-lg bg-[#176B58] text-white font-semibold hover:bg-[#115644] transition-colors cursor-pointer"
        >
          + Draft Offline Stock Count
        </button>
      )}

      {offlineQueue.length > 0 && effectiveOnline && (
        <button
          type="button"
          onClick={onSyncOfflineQueue}
          className="px-2.5 py-1.5 rounded-lg bg-[#176B58] text-white font-semibold inline-flex items-center gap-1 hover:bg-[#115644] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync {offlineQueue.length} Queued Op(s)
        </button>
      )}

      {!isInstalled && deferredPrompt && (
        <button
          type="button"
          onClick={handleInstall}
          className="px-2.5 py-1.5 rounded-lg bg-[#18231F] text-white font-semibold inline-flex items-center gap-1 hover:bg-[#115644] transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Install PWA
        </button>
      )}
    </div>
  );
};
