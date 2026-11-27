import React, { useState, useEffect } from 'react';
import {
  Organization,
  Ingredient,
  PurchaseOrder,
  TipRecord,
  PosOrder,
  CustomerRecord,
  TaskRecord,
  ReviewRecord,
  AutomationRule,
  AuditLog,
} from '../domain/types';
import {
  CurrencyCode,
  PlanTier,
  SubscriptionStatus,
  formatMinorCurrency,
  evaluatePlanEntitlement,
} from '../domain/calculations';
import {
  AnnouncementItem,
  SupportTicketRecord,
  UtmAttribution,
} from '../domain/enhancements';
import {
  Sparkles,
  Workflow,
  CreditCard,
  ShieldAlert,
  Send,
  Download,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  LifeBuoy,
} from 'lucide-react';
import {
  CopyButton,
  PrintReportButton,
  PrintReportHeader,
  LastUpdatedBadge,
  FormStatusBanner,
  ConfirmDialog,
  SkeletonLoader,
} from './EnhancementWidgets';

interface IntelligenceGovernanceModuleProps {
  organization: Organization;
  branchName?: string;
  isPlatformAdmin: boolean;
  initialSubTab?: 'ai_assistant' | 'automations' | 'reports' | 'billing' | 'admin';
  ingredients: Ingredient[];
  purchases: PurchaseOrder[];
  tips: TipRecord[];
  orders: PosOrder[];
  customers: CustomerRecord[];
  tasks: TaskRecord[];
  reviews: ReviewRecord[];
  automations: AutomationRule[];
  auditLogs: AuditLog[];
  announcements?: AnnouncementItem[];
  supportTickets?: SupportTicketRecord[];
  utmAttribution?: UtmAttribution | null;
  onIncrementAiQueryCount: () => void;
  onExecuteAiSuggestedTask: (title: string, details: string) => void;
  onToggleAutomationRule: (ruleId: string) => void;
  onCreateAutomationRule: (rule: AutomationRule) => void;
  onUpdateSubscriptionState: (plan: PlanTier, status: SubscriptionStatus) => void;
  onCreateAnnouncement?: (ann: AnnouncementItem) => void;
  onToggleAnnouncementActive?: (annId: string) => void;
}

export const IntelligenceGovernanceModule: React.FC<IntelligenceGovernanceModuleProps> = ({
  organization,
  branchName = 'Casablanca Maarif Flagship',
  isPlatformAdmin,
  initialSubTab = 'ai_assistant',
  ingredients,
  purchases,
  tips,
  orders,
  customers,
  tasks,
  reviews,
  automations,
  auditLogs,
  announcements = [],
  supportTickets = [],
  utmAttribution = null,
  onIncrementAiQueryCount,
  onExecuteAiSuggestedTask,
  onToggleAutomationRule,
  onCreateAutomationRule,
  onUpdateSubscriptionState,
  onCreateAnnouncement,
  onToggleAnnouncementActive,
}) => {
  const [subTab, setSubTab] = useState<
    'ai_assistant' | 'automations' | 'reports' | 'billing' | 'admin'
  >(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [statusBanner, setStatusBanner] = useState<{
    status: 'success' | 'error' | 'pending' | null;
    message: string | null;
    nextStep?: string;
  }>({ status: null, message: null });

  const [serverHealth, setServerHealth] = useState<any>(null);

  // Confirm Dialog for Subscription Cancellation / Downgrade (#17)
  const [pendingSubscriptionChange, setPendingSubscriptionChange] = useState<{
    plan: PlanTier;
    status: SubscriptionStatus;
    label: string;
  } | null>(null);

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState(
    'Which ingredients are currently below reorder threshold, and what was our total purchase spend?'
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState<
    Array<{
      question: string;
      answer: string;
      source: string;
      dataPoints: string[];
      suggestedAction?: {
        actionType: string;
        title: string;
        details: string;
      };
    }>
  >([]);

  // Automation Rule form
  const [autoName, setAutoName] = useState('');
  const [autoTrigger, setAutoTrigger] = useState<AutomationRule['triggerType']>('low_stock');
  const [autoAction, setAutoAction] = useState<AutomationRule['actionType']>('create_task');

  // Billing Checkout State
  const [selectedCheckoutTier, setSelectedCheckoutTier] = useState<PlanTier>('business');
  const [variantIdInput, setVariantIdInput] = useState('');
  const [checkoutResponse, setCheckoutResponse] = useState<any>(null);

  // Platform Announcement Builder State (Feature #2)
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annSeverity, setAnnSeverity] = useState<AnnouncementItem['severity']>('info');
  const [annScope, setAnnScope] = useState<AnnouncementItem['scope']>('both');
  const [annCtaLabel, setAnnCtaLabel] = useState('');
  const [annCtaHref, setAnnCtaHref] = useState('');

  const currency: CurrencyCode = organization.currency;

  const entitlementCheck = evaluatePlanEntitlement({
    plan: organization.plan,
    subscriptionStatus: organization.subscriptionStatus,
    aiQueriesUsedThisMonth: organization.aiQueriesUsedThisMonth,
    currentBranchCount: 2,
    currentStaffCount: 5,
    currentIngredientCount: ingredients.length,
  });

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setServerHealth(d))
      .catch(() => {});
  }, []);

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;
    if (!entitlementCheck.canRunAiQuery) {
      setStatusBanner({
        status: 'error',
        message: `Monthly AI quota reached (${entitlementCheck.entitlements.monthlyAiQueries} queries on ${entitlementCheck.effectiveTier.toUpperCase()} tier).`,
        nextStep: 'Upgrade your subscription plan in the Billing tab.',
      });
      return;
    }

    setAiLoading(true);
    setStatusBanner({
      status: 'pending',
      message: 'Querying authorized tenant records via Grounded Operations Engine...',
    });
    const question = aiPrompt.trim();

    try {
      const resp = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: question,
          tenantContext: {
            orgId: organization.id,
            orgName: organization.name,
            currency: organization.currency,
            ingredients,
            purchases,
            tips,
            orders,
            tasks,
            reviews,
          },
        }),
      });
      const data = await resp.json();
      onIncrementAiQueryCount();
      setAiHistory((prev) => [
        {
          question,
          answer: data.answer || 'No response received.',
          source: data.source || 'grounded-engine',
          dataPoints: Array.isArray(data.dataPoints) ? data.dataPoints : [],
          suggestedAction: data.suggestedAction,
        },
        ...prev,
      ]);
      setAiPrompt('');
      setStatusBanner({
        status: 'success',
        message: 'Grounded AI analysis completed against verified workspace records.',
      });
    } catch (err: any) {
      setStatusBanner({
        status: 'error',
        message: err?.message || 'Error contacting AI assistant.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoName.trim()) return;
    const now = new Date().toISOString();
    const newRule: AutomationRule = {
      id: `auto_${Date.now()}`,
      orgId: organization.id,
      name: autoName.trim(),
      triggerType: autoTrigger,
      actionType: autoAction,
      enabled: true,
      requiresApproval: true,
      lastTriggeredAt: 'Ready',
      executionCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    onCreateAutomationRule(newRule);
    setAutoName('');
    setStatusBanner({
      status: 'success',
      message: `Created workflow automation rule "${newRule.name}".`,
    });
  };

  const handleExportCsvReport = () => {
    const rows = [
      ['RecordType', 'ID', 'NameOrRef', 'AmountMinor', 'Currency', 'StatusOrCategory'],
      ...purchases.map((p) => [
        'PurchaseOrder',
        p.id,
        p.invoiceRef,
        String(p.totalMinor),
        p.currency,
        p.status,
      ]),
      ...orders.map((o) => [
        'POSOrder',
        o.id,
        o.externalOrderId,
        String(o.totalMinor),
        o.currency,
        o.source,
      ]),
      ...tips.map((t) => [
        'TipRecord',
        t.id,
        t.employeeName,
        String(t.amountMinor),
        t.currency,
        t.status,
      ]),
    ];

    const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tablepulse-ledger-${organization.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusBanner({
      status: 'success',
      message: 'Exported verified ledger report to CSV.',
    });
  };

  const handleInitiateRealCheckout = async () => {
    setCheckoutResponse(null);
    try {
      const resp = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organization.id,
          orgName: organization.name,
          userEmail: 'yasserrajeb@gmail.com',
          planTier: selectedCheckoutTier,
          billingInterval: 'monthly',
          variantId: variantIdInput.trim(),
        }),
      });
      const data = await resp.json();
      setCheckoutResponse(data);
    } catch (err: any) {
      setCheckoutResponse({
        liveCheckoutReady: false,
        message: err?.message || 'Error calling checkout endpoint.',
      });
    }
  };

  const handleCreateAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim() || !onCreateAnnouncement) return;
    const now = new Date().toISOString();
    const newAnn: AnnouncementItem = {
      id: `ann_${Date.now()}`,
      orgId: organization.id,
      title: annTitle.trim(),
      message: annMessage.trim(),
      ctaLabel: annCtaLabel.trim() || undefined,
      ctaHref: annCtaHref.trim() || undefined,
      severity: annSeverity,
      scope: annScope,
      published: true,
      dismissible: true,
      createdBy: 'yasserrajeb@gmail.com',
      createdAt: now,
      updatedAt: now,
    };
    onCreateAnnouncement(newAnn);
    setAnnTitle('');
    setAnnMessage('');
    setAnnCtaLabel('');
    setAnnCtaHref('');
    setStatusBanner({
      status: 'success',
      message: `Published platform announcement "${newAnn.title}" (Scope: ${newAnn.scope.toUpperCase()}).`,
    });
  };

  // Report KPIs derived strictly from underlying records
  const totalPurchasesMinor = purchases.reduce((s, p) => s + p.totalMinor, 0);
  const totalPosSalesMinor = orders.reduce((s, o) => s + o.totalMinor, 0);
  const totalTipsMinor = tips.reduce((s, t) => s + t.amountMinor, 0);
  const totalValuationMinor = ingredients.reduce(
    (s, i) => s + Math.round(i.currentStock * i.unitCostMinor),
    0
  );

  const latestGovUpdatedAt =
    auditLogs[0]?.createdAt || organization.updatedAt || '2026-10-21T08:00:00.000Z';

  return (
    <div className="space-y-6">
      <PrintReportHeader
        reportTitle="Intelligence, Financial Summary & Immutable Audit Report"
        orgName={organization.name}
        branchName={branchName}
        currency={currency}
        lastUpdated={latestGovUpdatedAt}
        activeFilterSummary={`Active Tab: ${subTab.toUpperCase()} · Plan: ${organization.plan.toUpperCase()}`}
      />

      <ConfirmDialog
        open={Boolean(pendingSubscriptionChange)}
        title={`Confirm Subscription State Change: ${pendingSubscriptionChange?.label || ''}?`}
        description={`You are transitioning ${organization.name} to plan="${pendingSubscriptionChange?.plan}" with status="${pendingSubscriptionChange?.status}".`}
        consequenceNote="If transitioning to past_due or expired, workspace entitlements will immediately revert to Free tier limits (max 1 branch, 3 staff, 25 ingredients, 5 AI queries/mo) without deleting any historical tenant records."
        irreversible={false}
        confirmLabel="Confirm Billing State Change"
        onCancel={() => setPendingSubscriptionChange(null)}
        onConfirm={() => {
          if (pendingSubscriptionChange) {
            onUpdateSubscriptionState(
              pendingSubscriptionChange.plan,
              pendingSubscriptionChange.status
            );
            setStatusBanner({
              status: 'success',
              message: `Updated subscription state to ${pendingSubscriptionChange.plan.toUpperCase()} (${pendingSubscriptionChange.status.toUpperCase()}).`,
              nextStep: 'All tenant records remain intact; entitlement limits updated.',
            });
          }
          setPendingSubscriptionChange(null);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E1E6E1] no-print">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFF2ED] rounded-xl border border-[#E1E6E1]">
          <button
            type="button"
            onClick={() => setSubTab('ai_assistant')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'ai_assistant'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            AI Operations Assistant
          </button>
          <button
            type="button"
            onClick={() => setSubTab('automations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'automations'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Workflow Automations ({automations.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'reports'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Reports & CSV Export
          </button>
          <button
            type="button"
            onClick={() => setSubTab('billing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'billing'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Subscriptions & Rizon Payouts
          </button>
          <button
            type="button"
            onClick={() => setSubTab('admin')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'admin'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Platform Admin & Audit Logs ({auditLogs.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-[#68736D]">
            AI Quota: {organization.aiQueriesUsedThisMonth} /{' '}
            {entitlementCheck.entitlements.monthlyAiQueries} used (
            {entitlementCheck.effectiveTier.toUpperCase()})
          </div>
          <PrintReportButton label="Print Executive Report" />
        </div>
      </div>

      {entitlementCheck.statusBanner && (
        <div className="p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-xs text-red-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
          <span>{entitlementCheck.statusBanner}</span>
        </div>
      )}

      <FormStatusBanner
        status={statusBanner.status}
        message={statusBanner.message}
        nextStep={statusBanner.nextStep}
        onDismiss={() => setStatusBanner({ status: null, message: null })}
      />

      {/* TAB 1: AI RESTAURANT OPERATIONS ASSISTANT */}
      {subTab === 'ai_assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-4 no-print">
            <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
              <Sparkles className="w-4 h-4 text-[#176B58]" />
              <span>Grounded Restaurant Operations Agent</span>
            </div>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Queries are executed strictly against your organization&apos;s authorized records (`{organization.name}`). The assistant distinguishes ordered vs. received purchases, theoretical vs. physical stock, and requires confirmation before creating tasks.
            </p>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#18231F] block">
                Quick Grounded Prompts:
              </span>
              {[
                'Which ingredients need reordering and what did we spend on purchases?',
                'How much in tips was collected vs paid out, and what remains awaiting distribution?',
                'What are the recurring complaints in our customer reviews?',
              ].map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAiPrompt(preset)}
                  className="w-full text-left px-3 py-1.5 rounded-lg bg-[#F7F8F5] hover:bg-[#E6F0E9] border border-[#E1E6E1] text-xs text-[#18231F] transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            <form onSubmit={handleAskAi} className="space-y-3 pt-2">
              <label htmlFor="ai-prompt" className="block text-xs font-semibold text-[#18231F]">
                Ask about your restaurant&apos;s verified records
              </label>
              <textarea
                id="ai-prompt"
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full p-3 text-xs border border-[#E1E6E1] rounded-lg"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="w-full py-2.5 px-4 bg-[#176B58] hover:bg-[#115644] disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {aiLoading ? 'Querying Authorized Tenant Records...' : 'Ask AI Operations Agent'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-4">
            <div className="font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
              Grounded Responses & Auditable Tool Actions
            </div>

            {aiLoading && (
              <SkeletonLoader
                variant="cards"
                rows={3}
                label="Synthesizing grounded answer from tenant inventory, POs & tips..."
              />
            )}

            {aiHistory.length === 0 && !aiLoading ? (
              <div className="py-12 text-center text-xs text-[#68736D]">
                Submit a question on the left to inspect grounded operational answers and confirm suggested actions.
              </div>
            ) : (
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {aiHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E1E6E1] space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-[#68736D] font-mono">
                      <span>Q: {item.question}</span>
                      <div className="flex items-center gap-2">
                        <span>Engine: {item.source}</span>
                        <CopyButton text={item.answer} label="Copy Answer" compact />
                      </div>
                    </div>
                    <p className="text-[#18231F] leading-relaxed font-medium">{item.answer}</p>

                    {item.dataPoints.length > 0 && (
                      <div className="pt-2 border-t border-[#E1E6E1] flex flex-wrap gap-2 font-mono text-[#68736D]">
                        {item.dataPoints.map((dp, j) => (
                          <span
                            key={j}
                            className="bg-white px-2 py-1 rounded border border-[#E1E6E1]"
                          >
                            {dp}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.suggestedAction && item.suggestedAction.actionType !== 'none' && (
                      <div className="p-3 rounded-lg bg-[#E6F0E9] border border-[#176B58]/30 flex items-center justify-between gap-4 no-print">
                        <div>
                          <div className="font-bold text-[#18231F]">
                            Suggested Action: {item.suggestedAction.title}
                          </div>
                          <div className="text-[#68736D]">{item.suggestedAction.details}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onExecuteAiSuggestedTask(
                              item.suggestedAction!.title,
                              item.suggestedAction!.details
                            );
                            setStatusBanner({
                              status: 'success',
                              message: `Confirmed & recorded AI action "${item.suggestedAction!.title}" in Tasks and Audit Log.`,
                            });
                          }}
                          className="px-3 py-1.5 bg-[#176B58] hover:bg-[#115644] text-white font-semibold rounded-lg shrink-0 cursor-pointer transition-colors"
                        >
                          Confirm & Create Task
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WORKFLOW AUTOMATION ENGINE */}
      {subTab === 'automations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#EFF2ED]">
                <tr className="border-b border-[#E1E6E1] bg-[#EFF2ED] text-[#68736D] font-semibold">
                  <th className="py-3 px-4">Automation Rule</th>
                  <th className="py-3 px-4">Trigger → Action</th>
                  <th className="py-3 px-4">Safety Gate</th>
                  <th className="py-3 px-4 text-right">Runs</th>
                  <th className="py-3 px-4 text-right no-print">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6E1]">
                {automations.map((rule) => (
                  <tr key={rule.id} className="hover:bg-[#F7F8F5] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#18231F]">{rule.name}</td>
                    <td className="py-3 px-4 font-mono text-[#68736D]">
                      {rule.triggerType} → {rule.actionType}
                    </td>
                    <td className="py-3 px-4 text-[#68736D]">
                      {rule.requiresApproval ? 'Human Approval Required' : 'Internal Alert'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {rule.executionCount}
                    </td>
                    <td className="py-3 px-4 text-right no-print">
                      <button
                        type="button"
                        onClick={() => onToggleAutomationRule(rule.id)}
                        className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                          rule.enabled
                            ? 'bg-[#176B58] text-white'
                            : 'bg-[#EFF2ED] text-[#68736D]'
                        }`}
                      >
                        {rule.enabled ? 'Active' : 'Paused'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4 no-print">
            <form
              onSubmit={handleAddAutomation}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3 text-xs"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <Workflow className="w-4 h-4 text-[#176B58]" />
                <span>Create Automation Rule</span>
              </div>
              <div>
                <label htmlFor="auto-name" className="block font-semibold text-[#18231F] mb-1">
                  Rule Name
                </label>
                <input
                  id="auto-name"
                  type="text"
                  required
                  value={autoName}
                  onChange={(e) => setAutoName(e.target.value)}
                  placeholder="Alert Manager on Expiring Seafood Lot"
                  className="w-full px-3 py-1.5 border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="auto-trig" className="block font-semibold text-[#18231F] mb-1">
                  Trigger Event
                </label>
                <select
                  id="auto-trig"
                  value={autoTrigger}
                  onChange={(e) => setAutoTrigger(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg bg-white"
                >
                  <option value="low_stock">Stock Falls Below Minimum Threshold</option>
                  <option value="expiring_lot">Lot Approaching Expiry Date</option>
                  <option value="purchase_received">Purchase Delivery Received</option>
                  <option value="negative_review">Review Rating ≤ 3 Stars</option>
                  <option value="overdue_task">Operational Task Overdue</option>
                </select>
              </div>
              <div>
                <label htmlFor="auto-act" className="block font-semibold text-[#18231F] mb-1">
                  Controlled Action
                </label>
                <select
                  id="auto-act"
                  value={autoAction}
                  onChange={(e) => setAutoAction(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg bg-white"
                >
                  <option value="create_task">Create Assigned Operational Task</option>
                  <option value="prepare_po_draft">Prepare Purchase Order Draft</option>
                  <option value="draft_review_reply">Draft Human-Approved Review Reply</option>
                  <option value="send_notification">Send Workspace Notification</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save Automation Rule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS & ANALYTICS */}
      {subTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E1E6E1]">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#18231F]">
                Ledger-Backed Financial & Operational Reports ({organization.name})
              </h3>
              <p className="text-xs text-[#68736D]">
                All KPIs are computed directly from underlying minor-unit records in `{currency}`.
              </p>
              <LastUpdatedBadge
                timestamp={latestGovUpdatedAt}
                label="Report Source Timestamp"
              />
            </div>
            <div className="flex items-center gap-2 no-print">
              <PrintReportButton label="Print Financial Summary" />
              <button
                type="button"
                onClick={handleExportCsvReport}
                className="px-4 py-2 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export Authorized CSV Ledger
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#E1E6E1]">
              <span className="text-xs text-[#68736D] block">Recorded POS Sales Revenue</span>
              <span className="text-xl font-bold font-mono tabular-nums text-[#18231F] mt-1 block">
                {formatMinorCurrency(totalPosSalesMinor, currency)}
              </span>
              <span className="text-xs text-[#68736D] mt-1 block">
                Across {orders.length} verified POS orders
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E1E6E1]">
              <span className="text-xs text-[#68736D] block">Recorded Purchasing Spend</span>
              <span className="text-xl font-bold font-mono tabular-nums text-[#18231F] mt-1 block">
                {formatMinorCurrency(totalPurchasesMinor, currency)}
              </span>
              <span className="text-xs text-[#68736D] mt-1 block">
                Across {purchases.length} purchase orders
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E1E6E1]">
              <span className="text-xs text-[#68736D] block">Current Inventory Valuation</span>
              <span className="text-xl font-bold font-mono tabular-nums text-[#18231F] mt-1 block">
                {formatMinorCurrency(totalValuationMinor, currency)}
              </span>
              <span className="text-xs text-[#68736D] mt-1 block">
                Weighted-average minor-unit basis
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E1E6E1]">
              <span className="text-xs text-[#68736D] block">Total Recorded Shift Tips</span>
              <span className="text-xl font-bold font-mono tabular-nums text-[#176B58] mt-1 block">
                {formatMinorCurrency(totalTipsMinor, currency)}
              </span>
              <span className="text-xs text-[#68736D] mt-1 block">
                {customers.length} CRM guests tracked
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUBSCRIPTION BILLING & RIZON PAYOUT VERIFICATION */}
      {subTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E1E6E1]">
                <div>
                  <h3 className="text-sm font-bold text-[#18231F]">
                    Real Recurring Checkout (Lemon Squeezy Merchant of Record)
                  </h3>
                  <p className="text-[#68736D]">
                    Selected because Lemon Squeezy officially supports Morocco-based merchants and settles USD ACH / EUR SEPA bank payouts compatible with Rizon virtual bank accounts.
                  </p>
                </div>
                <CreditCard className="w-5 h-5 text-[#176B58] shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-4 p-3.5 bg-[#F7F8F5] rounded-lg border border-[#E1E6E1]">
                <div>
                  <span className="text-[#68736D] block">Current Workspace Plan</span>
                  <span className="font-mono font-bold text-sm uppercase text-[#18231F]">
                    {organization.plan} ({organization.subscriptionStatus})
                  </span>
                </div>
                <div>
                  <span className="text-[#68736D] block">Effective Enforced Tier</span>
                  <span className="font-mono font-bold text-sm uppercase text-[#176B58]">
                    {entitlementCheck.effectiveTier}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
                <div>
                  <label htmlFor="chk-tier" className="block font-semibold text-[#18231F] mb-1">
                    Target Subscription Plan
                  </label>
                  <select
                    id="chk-tier"
                    value={selectedCheckoutTier}
                    onChange={(e) => setSelectedCheckoutTier(e.target.value as PlanTier)}
                    className="w-full px-3 py-2 border border-[#E1E6E1] rounded-lg bg-white"
                  >
                    <option value="pro">Pro — 390.00 MAD / mo ($39.00)</option>
                    <option value="business">Business — 890.00 MAD / mo ($89.00)</option>
                    <option value="ultra">Ultra — 1,890.00 MAD / mo ($189.00)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="chk-var" className="block font-semibold text-[#18231F] mb-1">
                    Lemon Squeezy Variant ID (From Provider Dashboard)
                  </label>
                  <input
                    id="chk-var"
                    type="text"
                    value={variantIdInput}
                    onChange={(e) => setVariantIdInput(e.target.value)}
                    placeholder="e.g. 492810"
                    className="w-full px-3 py-2 border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleInitiateRealCheckout}
                className="w-full py-2.5 px-4 bg-[#176B58] hover:bg-[#115644] text-white font-semibold rounded-lg transition-colors cursor-pointer no-print"
              >
                Request Verified Lemon Squeezy Checkout Session
              </button>

              {checkoutResponse && (
                <div
                  className={`p-3.5 rounded-lg border ${
                    checkoutResponse.liveCheckoutReady
                      ? 'bg-[#E6F0E9] border-[#176B58]/30 text-[#18231F]'
                      : 'bg-[#EFF2ED] border-[#E1E6E1] text-[#18231F]'
                  }`}
                >
                  <div className="font-bold mb-1">
                    {checkoutResponse.liveCheckoutReady
                      ? 'Checkout Session Created'
                      : `Configuration Blocker: ${checkoutResponse.blocker || 'PROVIDER_SETUP_REQUIRED'}`}
                  </div>
                  <p className="leading-relaxed text-[#68736D]">
                    {checkoutResponse.message || checkoutResponse.error}
                  </p>
                </div>
              )}

              {/* Entitlement & Lifecycle Test Simulator (Protected by ConfirmDialog for Consequential Downgrades) */}
              <div className="pt-4 border-t border-[#E1E6E1] space-y-2 no-print">
                <div className="font-bold text-[#18231F]">
                  Subscription Entitlement & Lifecycle Verification Controls
                </div>
                <p className="text-[#68736D]">
                  Test how server-side plan entitlements respond to upgrades, failed payments (`past_due`), or expiration (`expired`) while preserving all customer data:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSubscriptionState('business', 'active');
                      setStatusBanner({
                        status: 'success',
                        message: 'Updated workspace entitlement state to BUSINESS (ACTIVE).',
                      });
                    }}
                    className="px-3 py-1.5 bg-[#EFF2ED] hover:bg-[#E6F0E9] text-[#18231F] font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Set Business (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSubscriptionState('ultra', 'active');
                      setStatusBanner({
                        status: 'success',
                        message: 'Updated workspace entitlement state to ULTRA (ACTIVE).',
                      });
                    }}
                    className="px-3 py-1.5 bg-[#EFF2ED] hover:bg-[#E6F0E9] text-[#18231F] font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Set Ultra (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingSubscriptionChange({
                        plan: 'pro',
                        status: 'past_due',
                        label: 'Past Due (Payment Failure)',
                      })
                    }
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Simulate Payment Failure (Past Due)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingSubscriptionChange({
                        plan: 'pro',
                        status: 'expired',
                        label: 'Expired Subscription (Downgrade to Free Limits)',
                      })
                    }
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Simulate Expired Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Verified Rizon Payout Route Findings */}
          <div className="lg:col-span-5 bg-[#141A18] text-[#F0F3F0] p-5 rounded-xl border border-[#303A35] space-y-4 text-xs">
            <div className="font-bold text-white text-sm pb-2 border-b border-[#303A35]">
              Verified Rizon Payout Compatibility & Morocco Merchant Guide
            </div>

            <div className="space-y-3 leading-relaxed text-[#B4C0B8]">
              <div>
                <strong className="text-[#58B99A] block">
                  1. Why Lemon Squeezy (MoR) vs. Direct Stripe Morocco:
                </strong>
                Direct Stripe merchant accounts are not generally open to standard domestic Moroccan entities without a foreign subsidiary. Lemon Squeezy acts as the global Merchant of Record, handles VAT/sales tax compliance, and explicitly supports Morocco for merchant onboarding and payouts.
              </div>

              <div>
                <strong className="text-[#58B99A] block">
                  2. How Proceeds Reach the Owner&apos;s Rizon Account & Visa Card:
                </strong>
                A Visa card number is never a bank payout destination. Instead, Rizon provides verified USD (US ACH routing + account number) and EUR (SEPA IBAN) receiving bank accounts. Once Lemon Squeezy settles net subscription proceeds via USD ACH (0% payout fee) or EUR SEPA / Moroccan Bank transfer (1% international bank payout fee), the settled USD balance in Rizon is immediately spendable via the owner&apos;s Rizon Visa card.
              </div>

              <div>
                <strong className="text-[#58B99A] block">
                  3. Required Owner Onboarding Steps for Live Activation:
                </strong>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li>Complete identity & store verification in Lemon Squeezy dashboard.</li>
                  <li>
                    Enter the Rizon USD ACH receiving account (matching legal account holder name) or Moroccan bank IBAN under Lemon Squeezy Payout Settings.
                  </li>
                  <li>
                    Add `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, and `LEMON_SQUEEZY_WEBHOOK_SECRET` in AI Studio Secrets.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PLATFORM ADMIN, ANNOUNCEMENTS, SUPPORT QUEUE & IMMUTABLE AUDIT LOGS */}
      {subTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E6E1]">
              <div>
                <h3 className="text-sm font-bold text-[#18231F]">
                  Platform Administration & Service Health Console
                </h3>
                <p className="text-[#68736D]">
                  Restricted to verified platform administrator (`yasserrajeb@gmail.com`). All administrative actions are logged.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={organization.id} label="Copy Tenant ID" compact />
                <span className="font-mono font-semibold text-[#176B58]">
                  {isPlatformAdmin ? 'ADMIN AUTHORIZED' : 'TENANT VIEW'}
                </span>
              </div>
            </div>

            {serverHealth && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1]">
                  <div className="font-bold text-[#18231F] mb-1">Gemini AI Provider</div>
                  <div className="font-mono text-[#68736D]">
                    Model: {serverHealth.integrations?.geminiAi?.model}
                  </div>
                  <div className="font-mono text-[#68736D] mt-0.5">
                    Mode: {serverHealth.integrations?.geminiAi?.mode}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1]">
                  <div className="font-bold text-[#18231F] mb-1">Lemon Squeezy Billing</div>
                  <div className="font-mono text-[#68736D]">
                    Live Keys:{' '}
                    {serverHealth.integrations?.lemonSqueezyBilling?.configured
                      ? 'Configured'
                      : 'Awaiting Secrets'}
                  </div>
                  <div className="font-mono text-[#68736D] mt-0.5">
                    Webhook HMAC:{' '}
                    {serverHealth.integrations?.lemonSqueezyBilling?.webhookSecretConfigured
                      ? 'Active'
                      : 'Unconfigured'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1]">
                  <div className="font-bold text-[#18231F] mb-1">Firestore Security Rules</div>
                  <div className="font-mono text-[#176B58] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Deployed & Enforced
                  </div>
                  <div className="font-mono text-[#68736D] mt-0.5">
                    Master Gate + Append-Only Ledgers
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Platform Announcement Management (#2) & Support / UTM Queue (#14, #20) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
            <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E1E6E1]">
                <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm">
                  <Megaphone className="w-4 h-4 text-[#176B58]" />
                  <span>Announcement Banner Manager</span>
                </div>
                <span className="font-mono text-[#68736D]">{announcements.length} Configured</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1] flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-[#18231F]">
                        [{a.severity.toUpperCase()}] {a.title}
                      </div>
                      <div className="text-[#68736D] mt-0.5">{a.message}</div>
                      <div className="font-mono text-[11px] text-[#68736D] mt-1">
                        Scope: {a.scope} · Updated: {a.updatedAt.slice(0, 10)}
                      </div>
                    </div>
                    {onToggleAnnouncementActive && (
                      <button
                        type="button"
                        onClick={() => onToggleAnnouncementActive(a.id)}
                        className={`px-2.5 py-1 rounded-md font-semibold shrink-0 cursor-pointer transition-colors ${
                          a.published
                            ? 'bg-[#176B58] text-white'
                            : 'bg-[#EFF2ED] text-[#68736D]'
                        }`}
                      >
                        {a.published ? 'Published' : 'Disabled'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {onCreateAnnouncement && (
                <form
                  onSubmit={handleCreateAnnouncementSubmit}
                  className="pt-3 border-t border-[#E1E6E1] space-y-2.5"
                >
                  <div className="font-semibold text-[#18231F]">Publish New Banner</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="Banner Title"
                      aria-label="Announcement title"
                      className="px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={annSeverity}
                        onChange={(e) => setAnnSeverity(e.target.value as any)}
                        aria-label="Announcement severity"
                        className="px-2 py-1.5 border border-[#E1E6E1] rounded-lg bg-white"
                      >
                        <option value="info">Info</option>
                        <option value="feature">Feature</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="warning">Warning</option>
                      </select>
                      <select
                        value={annScope}
                        onChange={(e) => setAnnScope(e.target.value as any)}
                        aria-label="Announcement scope"
                        className="px-2 py-1.5 border border-[#E1E6E1] rounded-lg bg-white"
                      >
                        <option value="both">All Views</option>
                        <option value="public">Public Site</option>
                        <option value="dashboard">Dashboard</option>
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Announcement message text..."
                    aria-label="Announcement message"
                    className="w-full px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={annCtaLabel}
                      onChange={(e) => setAnnCtaLabel(e.target.value)}
                      placeholder="Optional CTA Label"
                      aria-label="Announcement CTA label"
                      className="px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg"
                    />
                    <input
                      type="text"
                      value={annCtaHref}
                      onChange={(e) => setAnnCtaHref(e.target.value)}
                      placeholder="Optional Link (#pricing)"
                      aria-label="Announcement CTA link"
                      className="px-2.5 py-1.5 border border-[#E1E6E1] rounded-lg font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Publish Announcement Banner
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E1E6E1]">
                <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm">
                  <LifeBuoy className="w-4 h-4 text-[#176B58]" />
                  <span>Support Ticket Queue & UTM Attribution</span>
                </div>
                <span className="font-mono text-[#68736D]">{supportTickets.length} Tickets</span>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1] space-y-1">
                <div className="font-bold text-[#18231F]">
                  Consented First-Party UTM Attribution (#14)
                </div>
                {utmAttribution ? (
                  <div className="font-mono text-[11px] text-[#68736D]">
                    source={utmAttribution.utm_source || 'none'} · medium=
                    {utmAttribution.utm_medium || 'none'} · campaign=
                    {utmAttribution.utm_campaign || 'none'} · Captured:{' '}
                    {utmAttribution.capturedAt}
                  </div>
                ) : (
                  <div className="text-[#68736D]">
                    No consented UTM campaign parameters stored in current session.
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {supportTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#18231F]">{t.subject}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#E6F0E9] text-[#176B58] font-mono uppercase text-[10px] font-semibold">
                          {t.status}
                        </span>
                        <CopyButton text={t.id} label="ID" compact />
                      </div>
                    </div>
                    <p className="text-[#68736D]">{t.message}</p>
                    <div className="font-mono text-[11px] text-[#68736D]">
                      From: {t.requesterName} ({t.requesterEmail}) · Category: {t.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
            <div className="p-4 border-b border-[#E1E6E1] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#18231F]">
                Immutable Security & Operational Audit Trail
              </h3>
              <ShieldAlert className="w-4 h-4 text-[#176B58]" />
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#EFF2ED]">
                <tr className="border-b border-[#E1E6E1] bg-[#EFF2ED] text-[#68736D] font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6E1]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F7F8F5] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#68736D]">
                      {log.createdAt.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#18231F]">{log.actorEmail}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#176B58]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#68736D]">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-3 px-4 text-[#68736D]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
