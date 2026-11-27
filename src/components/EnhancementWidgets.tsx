import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeMode,
  AnnouncementItem,
  DismissedAnnouncementRecord,
  isAnnouncementVisible,
  SearchResultItem,
  FaqItem,
  filterFaqItems,
  buildFaqStructuredDataJsonLd,
  validateCopyPayload,
  shouldShowBackToTop,
  calculateScrollProgress,
  formatPersistedTimestamp,
  UtmAttribution,
  SupportTicketRecord,
  validateSupportTicketInput,
} from '../domain/enhancements';
import {
  Sun,
  Moon,
  Search,
  X,
  ArrowUp,
  Copy,
  Check,
  Printer,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';

/**
 * 12. Skip-to-Content Accessibility Link
 */
export const SkipToContentLink: React.FC<{ targetId?: string }> = ({
  targetId = 'main-content',
}) => {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#176B58] focus:text-white focus:font-bold focus:text-xs focus:rounded-lg focus:shadow-lg no-print"
    >
      Skip to main content
    </a>
  );
};

/**
 * 1. Dark Mode Toggle Button
 */
export const ThemeToggleButton: React.FC<{
  theme: ThemeMode;
  onToggle: () => void;
}> = ({ theme, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="px-2.5 py-1.5 rounded-lg border border-[#E1E6E1] bg-white hover:bg-[#EFF2ED] text-xs font-semibold text-[#18231F] inline-flex items-center gap-1.5 transition-colors cursor-pointer no-print"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-3.5 h-3.5 text-[#58B99A]" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-[#176B58]" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
};

/**
 * 8. Scroll Progress Indicator (for long public/documentation pages)
 */
export const ScrollProgressBar: React.FC = () => {
  const [progress, setProgress] = useState({ visible: false, percentage: 0 });

  useEffect(() => {
    const updateProgress = () => {
      const docEl = document.documentElement;
      const calc = calculateScrollProgress({
        scrollTop: window.scrollY || docEl.scrollTop,
        scrollHeight: docEl.scrollHeight,
        clientHeight: docEl.clientHeight,
        minScrollableThreshold: 200,
      });
      setProgress(calc);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  if (!progress.visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page reading progress"
      aria-valuenow={progress.percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed top-0 left-0 right-0 h-1 bg-[#E1E6E1]/60 z-50 pointer-events-none no-print"
    >
      <div
        className="h-full bg-[#176B58] transition-all duration-75"
        style={{ width: `${progress.percentage}%` }}
      />
    </div>
  );
};

/**
 * 2. Professional Announcement Banner
 */
export const AnnouncementBanner: React.FC<{
  announcements: AnnouncementItem[];
  currentView: 'public' | 'dashboard' | 'restaurant_site';
  dismissedRecords: DismissedAnnouncementRecord[];
  onDismiss: (announcement: AnnouncementItem) => void;
}> = ({ announcements, currentView, dismissedRecords, onDismiss }) => {
  const nowIso = new Date().toISOString();
  const visibleItems = announcements.filter((a) =>
    isAnnouncementVisible({
      announcement: a,
      currentView,
      nowIso,
      dismissedRecords,
    })
  );

  if (visibleItems.length === 0) return null;
  const active = visibleItems[0];

  const toneClasses = {
    info: 'bg-[#18231F] text-[#F0F3F0] border-[#303A35]',
    feature: 'bg-[#176B58] text-white border-[#115644]',
    maintenance: 'bg-[#1C2420] text-[#F0F3F0] border-[#303A35]',
    warning: 'bg-red-950 text-red-100 border-red-800',
  }[active.severity];

  return (
    <div
      role="region"
      aria-label="Platform announcement"
      className={`w-full px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-3 no-print ${toneClasses}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-mono uppercase text-[10px] font-semibold tracking-wider text-[#58B99A] shrink-0">
          [{active.severity}]
        </span>
        <p className="truncate sm:whitespace-normal">
          <strong className="font-semibold text-white">{active.title}:</strong>{' '}
          <span className="opacity-90">{active.message}</span>
        </p>
        {active.ctaLabel && active.ctaHref && (
          <a
            href={active.ctaHref}
            className="underline font-semibold text-[#E6F0E9] hover:text-white shrink-0 inline-flex items-center gap-1"
          >
            <span>{active.ctaLabel}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {active.dismissible && (
        <button
          type="button"
          onClick={() => onDismiss(active)}
          aria-label={`Dismiss announcement: ${active.title}`}
          className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * 9. Reusable Copy-to-Clipboard Button
 */
export const CopyButton: React.FC<{
  text: string;
  label?: string;
  compact?: boolean;
}> = ({ text, label = 'Copy', compact = false }) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const handleCopy = async () => {
    const check = validateCopyPayload(text);
    if (!check.allowed) {
      setStatus('error');
      setErrorReason(check.reason || 'Cannot copy value.');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(check.sanitizedText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = check.sanitizedText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('Clipboard unavailable');
      }
      setStatus('copied');
      setErrorReason(null);
      setTimeout(() => setStatus('idle'), 2200);
    } catch {
      setStatus('error');
      setErrorReason('Clipboard access denied by browser.');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5 no-print">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={status === 'copied' ? `Copied ${label}` : `Copy ${label}`}
        className={`inline-flex items-center gap-1 rounded-md border border-[#E1E6E1] bg-white hover:bg-[#EFF2ED] text-[#18231F] font-semibold transition-colors cursor-pointer ${
          compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
        }`}
      >
        {status === 'copied' ? (
          <>
            <Check className="w-3.5 h-3.5 text-[#176B58]" />
            <span className="text-[#176B58]">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-[#68736D]" />
            <span>{label}</span>
          </>
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === 'copied' ? `${label} copied to clipboard.` : ''}
        {status === 'error' ? errorReason : ''}
      </span>
      {status === 'error' && errorReason && (
        <span className="text-[11px] text-red-600 font-medium">{errorReason}</span>
      )}
    </span>
  );
};

/**
 * 18. Accurate Persisted Last-Updated Badge
 */
export const LastUpdatedBadge: React.FC<{
  timestamp: string | null | undefined;
  label?: string;
  timezone?: string;
  syncStatus?: 'synced' | 'local_session' | 'offline_queued';
}> = ({
  timestamp,
  label = 'Last updated',
  timezone = 'Africa/Casablanca',
  syncStatus = 'synced',
}) => {
  const formatted = formatPersistedTimestamp(timestamp, timezone);

  return (
    <div className="inline-flex flex-wrap items-center gap-2 text-[11px] text-[#68736D] font-mono">
      <span className="inline-flex items-center gap-1">
        <Clock className="w-3 h-3 text-[#68736D] shrink-0" />
        <span>
          {label}: <strong className="text-[#18231F]">{formatted.formatted}</strong>
        </span>
      </span>
      {syncStatus === 'offline_queued' && (
        <span className="px-1.5 py-0.5 rounded bg-[#E6F0E9] text-[#176B58] font-semibold">
          Offline Pending Sync
        </span>
      )}
    </div>
  );
};

/**
 * 10. Print Report Button & Formal Print Header
 */
export const PrintReportButton: React.FC<{ label?: string }> = ({
  label = 'Print Report',
}) => {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label={label}
      className="px-3 py-1.5 rounded-lg border border-[#E1E6E1] bg-white hover:bg-[#EFF2ED] text-xs font-semibold text-[#18231F] inline-flex items-center gap-1.5 cursor-pointer no-print"
    >
      <Printer className="w-3.5 h-3.5 text-[#68736D]" />
      <span>{label}</span>
    </button>
  );
};

export const PrintReportHeader: React.FC<{
  reportTitle: string;
  orgName: string;
  branchName: string;
  currency: string;
  lastUpdated?: string;
  activeFilterSummary?: string;
}> = ({
  reportTitle,
  orgName,
  branchName,
  currency,
  lastUpdated,
  activeFilterSummary = 'All authorized records',
}) => {
  const ts = formatPersistedTimestamp(lastUpdated || '2026-10-21T08:00:00.000Z');
  return (
    <div className="print-only mb-6 pb-4 border-b-2 border-[#18231F]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-black">{reportTitle}</h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Organization: <strong>{orgName}</strong> · Branch: <strong>{branchName}</strong> · Currency:{' '}
            <strong>{currency}</strong>
          </p>
          <p className="text-xs text-[#68736D] mt-0.5">
            Active Filter: {activeFilterSummary} · Record Timestamp: {ts.formatted}
          </p>
        </div>
        <div className="text-right text-[10px] text-[#68736D] max-w-xs">
          <strong>INTERNAL OPERATIONAL REPORT</strong>
          <p>
            Generated by TablePulse OS. Not an official fiscal or tax invoice unless certified by the relevant tax authority.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 6. Reusable Skeleton Loading States
 */
export const SkeletonLoader: React.FC<{
  variant?: 'table' | 'cards' | 'panel';
  rows?: number;
  label?: string;
}> = ({ variant = 'table', rows = 3, label = 'Loading verified records...' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="p-4 rounded-xl border border-[#E1E6E1] bg-white space-y-3"
    >
      <div className="flex items-center gap-2 text-xs text-[#68736D]">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#176B58]" />
        <span>{label}</span>
      </div>
      {variant === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className="h-20 rounded-lg bg-[#EFF2ED] animate-pulse border border-[#E1E6E1]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="h-8 rounded bg-[#EFF2ED] animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 15 & 16. Accessible Form Success, Pending & Error Banner
 */
export const FormStatusBanner: React.FC<{
  status: 'success' | 'error' | 'pending' | null;
  message: string | null;
  nextStep?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ status, message, nextStep, onRetry, onDismiss }) => {
  if (!status || !message) return null;

  if (status === 'pending') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="p-3.5 rounded-lg bg-[#E6F0E9] border border-[#176B58]/30 text-[#18231F] text-xs flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#176B58] shrink-0" />
          <span className="font-semibold">{message}</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        role="alert"
        className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{message}</p>
            {nextStep && <p className="text-red-700 mt-0.5">{nextStep}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2.5 py-1 rounded bg-red-700 text-white font-semibold hover:bg-red-800 cursor-pointer"
            >
              Retry Operation
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss error message"
              className="p-1 text-red-700 hover:text-red-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="p-3.5 rounded-lg bg-[#E6F0E9] border border-[#176B58]/30 text-[#18231F] text-xs flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-[#176B58] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">{message}</p>
          {nextStep && <p className="text-[#68736D] mt-0.5">{nextStep}</p>}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss confirmation message"
          className="p-1 text-[#68736D] hover:text-[#18231F] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * 17. Reusable Accessible Confirmation Dialog
 */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  consequenceNote: string;
  irreversible?: boolean;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  description,
  consequenceNote,
  irreversible = false,
  confirmLabel,
  cancelLabel = 'Keep Current State',
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141A18]/70 backdrop-blur-[2px] p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-[#E1E6E1] bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert
              className={`w-5 h-5 shrink-0 ${
                irreversible ? 'text-red-600' : 'text-[#176B58]'
              }`}
            />
            <h2 id="confirm-dialog-title" className="text-base font-bold text-[#18231F]">
              {title}
            </h2>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
              irreversible
                ? 'bg-red-100 text-red-800'
                : 'bg-[#E6F0E9] text-[#176B58]'
            }`}
          >
            {irreversible ? 'Irreversible Action' : 'Reversible Action'}
          </span>
        </div>

        <p id="confirm-dialog-desc" className="text-xs text-[#68736D] leading-relaxed">
          {description}
        </p>

        <div className="p-3 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1] text-xs text-[#68736D]">
          <strong className="block text-[#18231F] mb-0.5">Operational Consequence:</strong>
          <span>{consequenceNote}</span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-[#E1E6E1] bg-white hover:bg-[#EFF2ED] text-xs font-semibold text-[#18231F] cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer ${
              irreversible
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#176B58] hover:bg-[#115644]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 3. Global Site Search Modal (Public & Authenticated Tenant-Scoped)
 */
export const GlobalSearchModal: React.FC<{
  open: boolean;
  isAuthenticated: boolean;
  orgName?: string;
  results: SearchResultItem[];
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onSelectResult: (item: SearchResultItem) => void;
}> = ({
  open,
  isAuthenticated,
  orgName,
  results,
  query,
  onQueryChange,
  onClose,
  onSelectResult,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(() => setIsSearching(false), 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          results.length > 0 ? (prev - 1 + results.length) % results.length : 0
        );
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        onSelectResult(results[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, onClose, onSelectResult]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global site and workspace search"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#141A18]/70 backdrop-blur-[2px] p-4 pt-16 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#E1E6E1] bg-white shadow-2xl overflow-hidden">
        <div className="p-3.5 border-b border-[#E1E6E1] flex items-center gap-3">
          <Search className="w-4 h-4 text-[#176B58] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              isAuthenticated
                ? `Search authorized records in ${orgName || 'workspace'} (ingredients, POs, recipes, CRM, tasks, FAQs)...`
                : 'Search product features, pricing plans, security architecture, and FAQs...'
            }
            aria-label="Global search query"
            className="w-full text-sm bg-transparent border-0 focus:outline-none text-[#18231F]"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search query"
              className="text-xs text-[#68736D] hover:text-[#18231F] cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close global search"
            className="p-1 text-[#68736D] hover:text-[#18231F] rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 bg-[#F7F8F5] border-b border-[#E1E6E1] flex items-center justify-between text-[11px] text-[#68736D]">
          <span>
            Scope:{' '}
            <strong className="text-[#18231F]">
              {isAuthenticated
                ? `Authorized Tenant (${orgName}) + Public Docs`
                : 'Public Website & FAQs Only (Private Tenant Data Isolated)'}
            </strong>
          </span>
          <span className="font-mono">↑↓ Navigate · Enter Open · Esc Close</span>
        </div>

        <div className="max-h-96 overflow-y-auto p-3">
          {isSearching ? (
            <SkeletonLoader variant="table" rows={2} label="Searching authorized index..." />
          ) : !query.trim() ? (
            <div className="py-8 text-center text-xs text-[#68736D] space-y-2">
              <p className="font-semibold text-[#18231F]">
                Type a keyword to search {isAuthenticated ? 'your restaurant workspace' : 'TablePulse OS'}
              </p>
              <p>
                {isAuthenticated
                  ? 'Try searching "Saffron", "INV-MOG", "Sea Bass", "Leila", "Friday", or "Rizon".'
                  : 'Try searching "Inventory", "Pricing", "Rizon", "OCR", or "Security".'}
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#68736D]">
              No authorized records or pages matched &ldquo;<strong>{query}</strong>&rdquo;.
            </div>
          ) : (
            <ul role="listbox" aria-label="Search results" className="space-y-1">
              {results.map((item, idx) => (
                <li key={item.id} role="option" aria-selected={idx === selectedIndex}>
                  <button
                    type="button"
                    onClick={() => onSelectResult(item)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      idx === selectedIndex
                        ? 'bg-[#E6F0E9] border border-[#176B58]/40'
                        : 'hover:bg-[#EFF2ED] border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#18231F] truncate">{item.title}</div>
                      <div className="text-[11px] text-[#68736D] truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded bg-[#EFF2ED] text-[#18231F] font-mono text-[10px] uppercase shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 4. Back-to-Top Button
 */
export const BackToTopButton: React.FC<{ threshold?: number }> = ({ threshold = 360 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const docEl = document.documentElement;
      const show = shouldShowBackToTop({
        scrollY: window.scrollY || docEl.scrollTop,
        viewportHeight: window.innerHeight || docEl.clientHeight,
        documentHeight: docEl.scrollHeight,
        threshold,
      });
      setVisible(show);
    };

    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [threshold]);

  if (!visible) return null;

  const scrollToTop = () => {
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      title="Back to top"
      className="fixed bottom-20 right-5 z-40 p-2.5 rounded-full bg-[#18231F] hover:bg-[#176B58] text-white shadow-lg border border-[#303A35] transition-colors cursor-pointer no-print"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
};

/**
 * 19. Expandable and Accessible FAQs with Optional Schema.org JSON-LD
 */
export const FaqAccordion: React.FC<{
  faqs: FaqItem[];
  includeJsonLd?: boolean;
}> = ({ faqs, includeJsonLd = false }) => {
  const [openIds, setOpenIds] = useState<string[]>([faqs[0]?.id || '']);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | FaqItem['category']>('all');

  const filtered = filterFaqItems(faqs, query, category);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {includeJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildFaqStructuredDataJsonLd(faqs) }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'operations', 'billing', 'security', 'product'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                category === cat
                  ? 'bg-[#176B58] text-white'
                  : 'bg-[#EFF2ED] text-[#18231F] hover:bg-[#E6F0E9]'
              }`}
            >
              {cat === 'all' ? 'All Topics' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#68736D] absolute left-3 top-2.5" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter FAQ questions..."
            aria-label="Filter FAQ questions"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center rounded-xl border border-[#E1E6E1] bg-white text-xs text-[#68736D]">
          No FAQ questions matched your filter.
        </div>
      ) : (
        <div className="divide-y divide-[#E1E6E1] rounded-xl border border-[#E1E6E1] bg-white overflow-hidden">
          {filtered.map((item) => {
            const isOpen = openIds.includes(item.id);
            const panelId = `faq-panel-${item.id}`;
            const btnId = `faq-btn-${item.id}`;
            return (
              <div key={item.id} className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[#18231F]">
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleItem(item.id)}
                    className="w-full text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span>{item.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#176B58] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#68736D] shrink-0" />
                    )}
                  </button>
                </h3>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    className="mt-3 pt-3 border-t border-[#E1E6E1] text-xs text-[#68736D] leading-relaxed space-y-2"
                  >
                    <p>{item.answer}</p>
                    <LastUpdatedBadge
                      timestamp={item.lastUpdated}
                      label="Verified Documentation Timestamp"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * 14. Privacy-Conscious UTM Campaign Consent & Attribution Bar
 */
export const UtmConsentBanner: React.FC<{
  detectedUtm: UtmAttribution | null;
  consentGranted: boolean | null;
  onSetConsent: (granted: boolean) => void;
}> = ({ detectedUtm, consentGranted, onSetConsent }) => {
  if (!detectedUtm || consentGranted !== null) return null;

  return (
    <div
      role="region"
      aria-label="Campaign attribution privacy preferences"
      className="fixed bottom-4 left-4 z-40 max-w-md rounded-xl border border-[#E1E6E1] bg-white p-4 shadow-xl text-xs space-y-2.5 no-print"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-[#18231F]">
          Privacy-Conscious Campaign Attribution
        </span>
        <span className="px-2 py-0.5 rounded bg-[#EFF2ED] font-mono text-[10px] text-[#18231F]">
          utm_source={detectedUtm.utm_source || 'direct'}
        </span>
      </div>
      <p className="text-[#68736D] leading-relaxed">
        You arrived via a campaign link. With your permission, TablePulse OS stores sanitized campaign parameters (`utm_source`, `utm_medium`, `utm_campaign`) in first-party storage to measure signup attribution. No personal data is shared with third-party ad networks.
      </p>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSetConsent(true)}
          className="px-3 py-1.5 rounded-lg bg-[#176B58] hover:bg-[#115644] text-white font-semibold cursor-pointer"
        >
          Allow Attribution
        </button>
        <button
          type="button"
          onClick={() => onSetConsent(false)}
          className="px-3 py-1.5 rounded-lg border border-[#E1E6E1] bg-white hover:bg-[#EFF2ED] text-[#18231F] font-semibold cursor-pointer"
        >
          Decline
        </button>
      </div>
    </div>
  );
};

/**
 * 20. Floating Contact & Support Widget
 */
export const FloatingSupportWidget: React.FC<{
  orgId: string;
  defaultName?: string;
  defaultEmail?: string;
  faqs: FaqItem[];
  onTicketCreated?: (ticket: SupportTicketRecord) => void;
}> = ({
  orgId,
  defaultName = '',
  defaultEmail = '',
  faqs,
  onTicketCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ticket' | 'faq' | 'contact'>('ticket');
  const [requesterName, setRequesterName] = useState(defaultName);
  const [requesterEmail, setRequesterEmail] = useState(defaultEmail);
  const [category, setCategory] = useState<SupportTicketRecord['category']>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusBanner, setStatusBanner] = useState<{
    status: 'success' | 'error' | 'pending' | null;
    message: string | null;
    nextStep?: string;
  }>({ status: null, message: null });
  const [faqQuery, setFaqQuery] = useState('');

  useEffect(() => {
    if (defaultName && !requesterName) setRequesterName(defaultName);
    if (defaultEmail && !requesterEmail) setRequesterEmail(defaultEmail);
  }, [defaultName, defaultEmail]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSupportTicketInput({
      requesterName,
      requesterEmail,
      subject,
      message,
      honeypot,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setStatusBanner({
        status: 'error',
        message: 'Please correct the highlighted fields before submitting.',
      });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setStatusBanner({
      status: 'pending',
      message: 'Submitting support ticket to TablePulse OS server...',
    });

    try {
      const resp = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          requesterName: requesterName.trim(),
          requesterEmail: requesterEmail.trim(),
          category,
          subject: subject.trim(),
          message: message.trim(),
          contextUrl: window.location.pathname + window.location.hash,
          honeypot,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setFieldErrors(data.fieldErrors || {});
        setStatusBanner({
          status: 'error',
          message: data.error || 'Failed to submit support ticket.',
        });
        return;
      }

      if (data.ticket && onTicketCreated) {
        onTicketCreated(data.ticket);
      }
      setSubject('');
      setMessage('');
      setStatusBanner({
        status: 'success',
        message: `Support request logged (Ticket ID: ${data.ticket?.id}).`,
        nextStep: `Confirmation recorded for ${requesterEmail.trim()}. Our engineering team reviews tickets in queue order.`,
      });
    } catch (err: any) {
      setStatusBanner({
        status: 'error',
        message: err?.message || 'Network error while submitting support request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 no-print">
      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="TablePulse OS Help and Support"
          className="w-80 sm:w-96 rounded-xl border border-[#E1E6E1] bg-white shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 bg-[#18231F] text-white flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold">TablePulse OS Support & Help</h2>
              <p className="text-[11px] text-[#B4C0B8]">
                Verified Ticket Queue & Documentation Search
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Minimize support widget"
              className="p-1 text-[#B4C0B8] hover:text-white rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex border-b border-[#E1E6E1] bg-[#F7F8F5] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('ticket')}
              className={`flex-1 py-2 text-center cursor-pointer ${
                activeTab === 'ticket'
                  ? 'bg-white text-[#176B58] border-b-2 border-[#176B58]'
                  : 'text-[#68736D] hover:text-[#18231F]'
              }`}
            >
              Submit Ticket
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`flex-1 py-2 text-center cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-white text-[#176B58] border-b-2 border-[#176B58]'
                  : 'text-[#68736D] hover:text-[#18231F]'
              }`}
            >
              Help Search
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`flex-1 py-2 text-center cursor-pointer ${
                activeTab === 'contact'
                  ? 'bg-white text-[#176B58] border-b-2 border-[#176B58]'
                  : 'text-[#68736D] hover:text-[#18231F]'
              }`}
            >
              Direct Contact
            </button>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto text-xs space-y-3">
            {activeTab === 'ticket' && (
              <form onSubmit={handleSubmitTicket} className="space-y-3" noValidate>
                <FormStatusBanner
                  status={statusBanner.status}
                  message={statusBanner.message}
                  nextStep={statusBanner.nextStep}
                  onDismiss={() => setStatusBanner({ status: null, message: null })}
                />

                {/* Anti-spam honeypot field */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="support-company-website">Company Website</label>
                  <input
                    id="support-company-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="support-name"
                      className="block font-semibold text-[#18231F] mb-1"
                    >
                      Your Name
                    </label>
                    <input
                      id="support-name"
                      type="text"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="Yasser Rajeb"
                      className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg"
                    />
                    {fieldErrors.requesterName && (
                      <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.requesterName}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="support-email"
                      className="block font-semibold text-[#18231F] mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="support-email"
                      type="email"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      placeholder="owner@darzitouna.ma"
                      className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg"
                    />
                    {fieldErrors.requesterEmail && (
                      <p className="text-[11px] text-red-600 mt-0.5">
                        {fieldErrors.requesterEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="support-category"
                    className="block font-semibold text-[#18231F] mb-1"
                  >
                    Topic Category
                  </label>
                  <select
                    id="support-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg bg-white"
                  >
                    <option value="general">General Operational Question</option>
                    <option value="inventory_ledger">Inventory & Purchase Ledger</option>
                    <option value="billing">Subscription Billing & Rizon Payouts</option>
                    <option value="ai_assistant">AI Assistant & Receipt OCR</option>
                    <option value="website_builder">Website Builder & Custom Domain</option>
                    <option value="security">Security & Multi-Tenant Permissions</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="support-subject"
                    className="block font-semibold text-[#18231F] mb-1"
                  >
                    Subject
                  </label>
                  <input
                    id="support-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Custom domain DNS verification"
                    className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg"
                  />
                  {fieldErrors.subject && (
                    <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.subject}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="support-message"
                    className="block font-semibold text-[#18231F] mb-1"
                  >
                    Details
                  </label>
                  <textarea
                    id="support-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the workflow, invoice reference, or question..."
                    className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg"
                  />
                  {fieldErrors.message && (
                    <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 px-4 rounded-lg bg-[#176B58] hover:bg-[#115644] disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer"
                >
                  {submitting ? 'Submitting Ticket...' : 'Submit Verified Support Ticket'}
                </button>
              </form>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-2.5">
                <input
                  type="search"
                  value={faqQuery}
                  onChange={(e) => setFaqQuery(e.target.value)}
                  placeholder="Search help articles..."
                  aria-label="Search help articles"
                  className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg"
                />
                <div className="space-y-2">
                  {filterFaqItems(faqs, faqQuery).map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-[#E1E6E1] bg-[#F7F8F5] space-y-1"
                    >
                      <p className="font-bold text-[#18231F]">{item.question}</p>
                      <p className="text-[#68736D] leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-3 text-[#68736D] leading-relaxed">
                <p>
                  TablePulse OS provides asynchronous engineering and hospitality onboarding support. We never display simulated live-chat agents.
                </p>
                <div className="p-3 rounded-lg border border-[#E1E6E1] bg-[#F7F8F5] space-y-2">
                  <div className="font-semibold text-[#18231F]">Verified Support Email</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[#18231F]">support@tablepulse.ma</span>
                    <CopyButton text="support@tablepulse.ma" label="Copy Email" compact />
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-[#E1E6E1] bg-[#F7F8F5] space-y-1">
                  <div className="font-semibold text-[#18231F]">Workspace Context</div>
                  <div className="font-mono text-[11px] text-[#68736D]">
                    Tenant Scope: {orgId}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open support and help widget"
          className="px-4 py-2.5 rounded-full bg-[#176B58] hover:bg-[#115644] text-white text-xs font-bold shadow-lg inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Support & Help</span>
        </button>
      )}
    </div>
  );
};
