import React, { useEffect, useState } from 'react';
import { Download, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowGuide(true);
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        aria-label="Install MiseEnPlace OS App"
      >
        <Download className="w-3.5 h-3.5 text-slate-600" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 border border-slate-200 shadow-lg">
            <h3 id="pwa-install-title" className="text-base font-semibold text-slate-900">
              Install MiseEnPlace OS for Offline Kitchen & Pass Operations
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {isIOS
                ? 'On iPhone or iPad: tap the Share button in Safari, then select "Add to Home Screen" to launch MiseEnPlace OS in full-screen standalone mode.'
                : 'In Chrome, Edge, or Brave: click the install icon in your browser address bar (or open the browser menu and choose "Install MiseEnPlace OS") to pin the workspace as a standalone desktop or tablet app.'}
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600">
              Offline capabilities: Stocktake counts, opening/closing checklist completions, and task updates are queued in a persistent local operation ledger and synchronized when connectivity returns.
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface OfflineQueuedOp {
  id: string;
  orgId: string;
  opType: 'stocktake_count' | 'checklist_toggle';
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'queued' | 'synced' | 'conflict';
}

const OFFLINE_QUEUE_KEY = 'miseenplace_offline_queue_v1';

export function loadOfflineQueue(orgId: string): OfflineQueuedOp[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineQueuedOp[];
    return parsed.filter((item) => item.orgId === orgId);
  } catch {
    return [];
  }
}

export function enqueueOfflineOp(op: Omit<OfflineQueuedOp, 'id' | 'createdAt' | 'status'>): OfflineQueuedOp {
  const newOp: OfflineQueuedOp = {
    ...op,
    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    status: 'queued',
  };
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const list: OfflineQueuedOp[] = raw ? JSON.parse(raw) : [];
    list.unshift(newOp);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
  return newOp;
}

export function clearSyncedOfflineOps(orgId: string): void {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const list: OfflineQueuedOp[] = JSON.parse(raw);
    const remaining = list.filter((item) => item.orgId !== orgId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }
}

export const OfflineQueueBanner: React.FC<{
  orgId: string;
  queuedOps: OfflineQueuedOp[];
  onFlushQueue: () => void;
}> = ({ queuedOps, onFlushQueue }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && queuedOps.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-4 text-xs text-amber-900">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
        <span>
          {!isOnline
            ? 'Offline Mode Active — Stocktake counts and checklist actions are saved to your local operation queue.'
            : `${queuedOps.length} offline operation(s) queued locally and ready for server verification.`}
        </span>
      </div>
      {queuedOps.length > 0 && (
        <button
          type="button"
          onClick={onFlushQueue}
          className="flex items-center gap-1.5 px-3 py-1 bg-amber-900 text-white rounded font-medium hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Synchronize Queue ({queuedOps.length})</span>
        </button>
      )}
    </div>
  );
};
