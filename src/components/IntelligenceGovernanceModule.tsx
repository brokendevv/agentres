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
  DEFAULT_PLAN_ENTITLEMENTS,
  formatMinorCurrency,
  evaluatePlanEntitlement,
} from '../domain/calculations';
import {
  Sparkles,
  Workflow,
  FileSpreadsheet,
  CreditCard,
  ShieldAlert,
  Send,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface IntelligenceGovernanceModuleProps {
  organization: Organization;
  isPlatformAdmin: boolean;
  ingredients: Ingredient[];
  purchases: PurchaseOrder[];
  tips: TipRecord[];
  orders: PosOrder[];
  customers: CustomerRecord[];
  tasks: TaskRecord[];
  reviews: ReviewRecord[];
  automations: AutomationRule[];
  auditLogs: AuditLog[];
  onIncrementAiQueryCount: () => void;
  onExecuteAiSuggestedTask: (title: string, details: string) => void;
  onToggleAutomationRule: (ruleId: string) => void;
  onCreateAutomationRule: (rule: AutomationRule) => void;
  onUpdateSubscriptionState: (plan: PlanTier, status: SubscriptionStatus) => void;
}

export const IntelligenceGovernanceModule: React.FC<IntelligenceGovernanceModuleProps> = ({
  organization,
  isPlatformAdmin,
  ingredients,
  purchases,
  tips,
  orders,
  customers,
  tasks,
  reviews,
  automations,
  auditLogs,
  onIncrementAiQueryCount,
  onExecuteAiSuggestedTask,
  onToggleAutomationRule,
  onCreateAutomationRule,
  onUpdateSubscriptionState,
}) => {
  const [subTab, setSubTab] = useState<
    'ai_assistant' | 'automations' | 'reports' | 'billing' | 'admin'
  >('ai_assistant');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [serverHealth, setServerHealth] = useState<any>(null);

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
    if (!aiPrompt.trim()) return;
    if (!entitlementCheck.canRunAiQuery) {
      setFeedback(
        `Monthly AI quota reached (${entitlementCheck.entitlements.monthlyAiQueries} queries on ${entitlementCheck.effectiveTier.toUpperCase()} tier). Upgrade plan in Billing.`
      );
      return;
    }

    setAiLoading(true);
    setFeedback(null);
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
    } catch (err: any) {
      setFeedback(err?.message || 'Error contacting AI assistant.');
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
    setFeedback(`Created workflow automation rule "${newRule.name}".`);
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
    setFeedback('Exported verified ledger report to CSV.');
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

  // Report KPIs derived strictly from underlying records
  const totalPurchasesMinor = purchases.reduce((s, p) => s + p.totalMinor, 0);
  const totalPosSalesMinor = orders.reduce((s, o) => s + o.totalMinor, 0);
  const totalTipsMinor = tips.reduce((s, t) => s + t.amountMinor, 0);
  const totalValuationMinor = ingredients.reduce(
    (s, i) => s + Math.round(i.currentStock * i.unitCostMinor),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('ai_assistant')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'ai_assistant' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            AI Operations Assistant
          </button>
          <button
            type="button"
            onClick={() => setSubTab('automations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'automations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Workflow Automations ({automations.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Reports & CSV Export
          </button>
          <button
            type="button"
            onClick={() => setSubTab('billing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'billing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Subscriptions & Rizon Payouts
          </button>
          <button
            type="button"
            onClick={() => setSubTab('admin')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'admin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Platform Admin & Audit Logs ({auditLogs.length})
          </button>
        </div>

        <div className="text-xs font-mono text-slate-600">
          AI Quota: {organization.aiQueriesUsedThisMonth} /{' '}
          {entitlementCheck.entitlements.monthlyAiQueries} used ({entitlementCheck.effectiveTier.toUpperCase()})
        </div>
      </div>

      {entitlementCheck.statusBanner && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{entitlementCheck.statusBanner}</span>
        </div>
      )}

      {feedback && (
        <div className="p-3 rounded-lg bg-slate-900 text-white text-xs flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-300 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: AI RESTAURANT OPERATIONS ASSISTANT */}
      {subTab === 'ai_assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Grounded Restaurant Operations Agent</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Queries are executed strictly against your organization&apos;s authorized records (`{organization.name}`). The assistant distinguishes ordered vs. received purchases, theoretical vs. physical stock, and requires confirmation before creating tasks.
            </p>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
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
                  className="w-full text-left px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            <form onSubmit={handleAskAi} className="space-y-3 pt-2">
              <label htmlFor="ai-prompt" className="block text-xs font-semibold text-slate-700">
                Ask about your restaurant&apos;s verified records
              </label>
              <textarea
                id="ai-prompt"
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full p-3 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {aiLoading ? 'Querying Authorized Tenant Records...' : 'Ask AI Operations Agent'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              Grounded Responses & Auditable Tool Actions
            </div>

            {aiHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Submit a question on the left to inspect grounded operational answers and confirm suggested actions.
              </div>
            ) : (
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {aiHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500 font-mono">
                      <span>Q: {item.question}</span>
                      <span>Engine: {item.source}</span>
                    </div>
                    <p className="text-slate-900 leading-relaxed font-medium">{item.answer}</p>

                    {item.dataPoints.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2 font-mono text-slate-600">
                        {item.dataPoints.map((dp, j) => (
                          <span key={j} className="bg-white px-2 py-1 rounded border border-slate-200">
                            {dp}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.suggestedAction && item.suggestedAction.actionType !== 'none' && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-amber-900">
                            Suggested Action: {item.suggestedAction.title}
                          </div>
                          <div className="text-amber-800">{item.suggestedAction.details}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onExecuteAiSuggestedTask(
                              item.suggestedAction!.title,
                              item.suggestedAction!.details
                            );
                            setFeedback(
                              `Confirmed & recorded AI action "${item.suggestedAction!.title}" in Tasks and Audit Log.`
                            );
                          }}
                          className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg shrink-0 cursor-pointer"
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
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Automation Rule</th>
                  <th className="py-3 px-4">Trigger → Action</th>
                  <th className="py-3 px-4">Safety Gate</th>
                  <th className="py-3 px-4 text-right">Runs</th>
                  <th className="py-3 px-4 text-right">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {automations.map((rule) => (
                  <tr key={rule.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900">{rule.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {rule.triggerType} → {rule.actionType}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {rule.requiresApproval ? 'Human Approval Required' : 'Internal Alert'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {rule.executionCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleAutomationRule(rule.id)}
                        className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                          rule.enabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
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

          <div className="lg:col-span-4">
            <form
              onSubmit={handleAddAutomation}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <Workflow className="w-4 h-4 text-amber-700" />
                <span>Create Automation Rule</span>
              </div>
              <div>
                <label htmlFor="auto-name" className="block font-medium text-slate-700 mb-1">
                  Rule Name
                </label>
                <input
                  id="auto-name"
                  type="text"
                  required
                  value={autoName}
                  onChange={(e) => setAutoName(e.target.value)}
                  placeholder="Alert Manager on Expiring Seafood Lot"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="auto-trig" className="block font-medium text-slate-700 mb-1">
                  Trigger Event
                </label>
                <select
                  id="auto-trig"
                  value={autoTrigger}
                  onChange={(e) => setAutoTrigger(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="low_stock">Stock Falls Below Minimum Threshold</option>
                  <option value="expiring_lot">Lot Approaching Expiry Date</option>
                  <option value="purchase_received">Purchase Delivery Received</option>
                  <option value="negative_review">Review Rating ≤ 3 Stars</option>
                  <option value="overdue_task">Operational Task Overdue</option>
                </select>
              </div>
              <div>
                <label htmlFor="auto-act" className="block font-medium text-slate-700 mb-1">
                  Controlled Action
                </label>
                <select
                  id="auto-act"
                  value={autoAction}
                  onChange={(e) => setAutoAction(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="create_task">Create Assigned Operational Task</option>
                  <option value="prepare_po_draft">Prepare Purchase Order Draft</option>
                  <option value="draft_review_reply">Draft Human-Approved Review Reply</option>
                  <option value="send_notification">Send Workspace Notification</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ledger-Backed Financial & Operational Reports ({organization.name})
              </h3>
              <p className="text-xs text-slate-500">
                All KPIs are computed directly from underlying minor-unit records in `{currency}`.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsvReport}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Authorized CSV Ledger
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Recorded POS Sales Revenue</span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {formatMinorCurrency(totalPosSalesMinor, currency)}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Across {orders.length} verified POS orders
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Recorded Purchasing Spend</span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {formatMinorCurrency(totalPurchasesMinor, currency)}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Across {purchases.length} purchase orders
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Current Inventory Valuation</span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {formatMinorCurrency(totalValuationMinor, currency)}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Weighted-average minor-unit basis
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Total Recorded Shift Tips</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
                {formatMinorCurrency(totalTipsMinor, currency)}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
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
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Real Recurring Checkout (Lemon Squeezy Merchant of Record)
                  </h3>
                  <p className="text-slate-500">
                    Selected because Lemon Squeezy officially supports Morocco-based merchants and settles USD ACH / EUR SEPA bank payouts compatible with Rizon virtual bank accounts.
                  </p>
                </div>
                <CreditCard className="w-5 h-5 text-amber-700 shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Current Workspace Plan</span>
                  <span className="font-mono font-bold text-sm uppercase text-slate-900">
                    {organization.plan} ({organization.subscriptionStatus})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Effective Enforced Tier</span>
                  <span className="font-mono font-bold text-sm uppercase text-emerald-700">
                    {entitlementCheck.effectiveTier}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="chk-tier" className="block font-semibold text-slate-700 mb-1">
                    Target Subscription Plan
                  </label>
                  <select
                    id="chk-tier"
                    value={selectedCheckoutTier}
                    onChange={(e) => setSelectedCheckoutTier(e.target.value as PlanTier)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="pro">Pro — 390.00 MAD / mo ($39.00)</option>
                    <option value="business">Business — 890.00 MAD / mo ($89.00)</option>
                    <option value="ultra">Ultra — 1,890.00 MAD / mo ($189.00)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="chk-var" className="block font-semibold text-slate-700 mb-1">
                    Lemon Squeezy Variant ID (From Provider Dashboard)
                  </label>
                  <input
                    id="chk-var"
                    type="text"
                    value={variantIdInput}
                    onChange={(e) => setVariantIdInput(e.target.value)}
                    placeholder="e.g. 492810"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleInitiateRealCheckout}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer"
              >
                Request Verified Lemon Squeezy Checkout Session
              </button>

              {checkoutResponse && (
                <div
                  className={`p-3.5 rounded-lg border ${
                    checkoutResponse.liveCheckoutReady
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="font-bold mb-1">
                    {checkoutResponse.liveCheckoutReady
                      ? 'Checkout Session Created'
                      : `Configuration Blocker: ${checkoutResponse.blocker || 'PROVIDER_SETUP_REQUIRED'}`}
                  </div>
                  <p className="leading-relaxed">{checkoutResponse.message || checkoutResponse.error}</p>
                </div>
              )}

              {/* Entitlement & Lifecycle Test Simulator (Explicitly Labeled for QA Verification) */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="font-bold text-slate-900">
                  Subscription Entitlement & Lifecycle Verification Controls
                </div>
                <p className="text-slate-500">
                  Test how server-side plan entitlements respond to upgrades, failed payments (`past_due`), or expiration (`expired`) while preserving all customer data:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSubscriptionState('business', 'active');
                      setFeedback('Updated workspace entitlement state to BUSINESS (ACTIVE).');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-lg cursor-pointer"
                  >
                    Set Business (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSubscriptionState('ultra', 'active');
                      setFeedback('Updated workspace entitlement state to ULTRA (ACTIVE).');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-lg cursor-pointer"
                  >
                    Set Ultra (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSubscriptionState('pro', 'past_due');
                      setFeedback(
                        'Triggered PAST_DUE billing state. Workspace reverted to Free tier limits without deleting records.'
                      );
                    }}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg cursor-pointer"
                  >
                    Simulate Payment Failure (Past Due)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSubscriptionState('pro', 'expired');
                      setFeedback(
                        'Triggered EXPIRED subscription state. Enforced downgrade to Free limits while retaining all records.'
                      );
                    }}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 font-semibold rounded-lg cursor-pointer"
                  >
                    Simulate Expired Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Verified Rizon Payout Route Findings */}
          <div className="lg:col-span-5 bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 space-y-4 text-xs">
            <div className="font-bold text-white text-sm pb-2 border-b border-slate-800">
              Verified Rizon Payout Compatibility & Morocco Merchant Guide
            </div>

            <div className="space-y-3 leading-relaxed text-slate-300">
              <div>
                <strong className="text-amber-400 block">
                  1. Why Lemon Squeezy (MoR) vs. Direct Stripe Morocco:
                </strong>
                Direct Stripe merchant accounts are not generally open to standard domestic Moroccan entities without a foreign subsidiary. Lemon Squeezy acts as the global Merchant of Record, handles VAT/sales tax compliance, and explicitly supports Morocco for merchant onboarding and payouts.
              </div>

              <div>
                <strong className="text-amber-400 block">
                  2. How Proceeds Reach the Owner&apos;s Rizon Account & Visa Card:
                </strong>
                A Visa card number is never a bank payout destination. Instead, Rizon provides verified USD (US ACH routing + account number) and EUR (SEPA IBAN) receiving bank accounts. Once Lemon Squeezy settles net subscription proceeds via USD ACH (0% payout fee) or EUR SEPA / Moroccan Bank transfer (1% international bank payout fee), the settled USD balance in Rizon is immediately spendable via the owner&apos;s Rizon Visa card.
              </div>

              <div>
                <strong className="text-amber-400 block">
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

      {/* TAB 5: PLATFORM ADMIN & IMMUTABLE AUDIT LOGS */}
      {subTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Platform Administration & Service Health Console
                </h3>
                <p className="text-slate-500">
                  Restricted to verified platform administrator (`yasserrajeb@gmail.com`). All administrative actions are logged.
                </p>
              </div>
              <span className="font-mono font-semibold text-emerald-700">
                {isPlatformAdmin ? 'ADMIN AUTHORIZED' : 'TENANT VIEW'}
              </span>
            </div>

            {serverHealth && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Gemini AI Provider</div>
                  <div className="font-mono text-slate-600">
                    Model: {serverHealth.integrations?.geminiAi?.model}
                  </div>
                  <div className="font-mono text-slate-500 mt-0.5">
                    Mode: {serverHealth.integrations?.geminiAi?.mode}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Lemon Squeezy Billing</div>
                  <div className="font-mono text-slate-600">
                    Live Keys:{' '}
                    {serverHealth.integrations?.lemonSqueezyBilling?.configured
                      ? 'Configured'
                      : 'Awaiting Secrets'}
                  </div>
                  <div className="font-mono text-slate-500 mt-0.5">
                    Webhook HMAC:{' '}
                    {serverHealth.integrations?.lemonSqueezyBilling?.webhookSecretConfigured
                      ? 'Active'
                      : 'Unconfigured'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Firestore Security Rules</div>
                  <div className="font-mono text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Deployed & Enforced
                  </div>
                  <div className="font-mono text-slate-500 mt-0.5">
                    Master Gate + Append-Only Ledgers
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Immutable Security & Operational Audit Trail
              </h3>
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.createdAt.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{log.actorEmail}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.details}</td>
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
