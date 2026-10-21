import React, { useState } from 'react';
import {
  DEFAULT_PLAN_DEFINITIONS,
  PlanId,
  CurrencyCode,
  formatMoneyMinor,
} from '../domain/calculations';
import { ArrowRight, ShieldCheck, Layers, Utensils, FileSpreadsheet, Globe, Lock } from 'lucide-react';

interface PublicMarketingSiteProps {
  onEnterWorkspace: () => void;
  onSignInGoogle: () => void;
}

export const PublicMarketingSite: React.FC<PublicMarketingSiteProps> = ({
  onEnterWorkspace,
  onSignInGoogle,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('MAD');
  const [billingCadence, setBillingCadence] = useState<'monthly' | 'annual'>('monthly');
  const [legalModal, setLegalModal] = useState<'none' | 'privacy' | 'terms'>('none');

  const plans: PlanId[] = ['free', 'pro', 'business', 'ultra'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Mandatory 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Brand title, one line */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
        >
          MiseEnPlace OS
        </a>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#modules" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Operations
          </a>
          <a href="#ledger" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Inventory Ledger
          </a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Pricing
          </a>
          <a href="#architecture" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Security
          </a>
          <a href="#faq" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            FAQ
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onEnterWorkspace}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Open Operator Workspace
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="flex-1">
        {/* 2-Column Hero Split with items-stretch */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between py-2">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-3">
                  Multi-Tenant Hospitality Operations Platform · Morocco & International
                </div>
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight font-display"
                  style={{ textWrap: 'balance' }}
                >
                  Control inventory ledgers, purchasing, recipes, tips, and multi-branch teams in one workspace.
                </h1>
                <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-2xl">
                  Built for independent restaurants, cafés, and multi-branch hospitality groups. MiseEnPlace OS separates purchase orders from physical stock receipts, enforces integer minor-unit accounting, and grounds every AI operational answer in your verified restaurant records.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onEnterWorkspace}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Launch Interactive Restaurant Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onSignInGoogle}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Sign In with Google Account</span>
                </button>
              </div>
            </div>

            {/* Right Column: Live Operational Ledger Preview Panel */}
            <div className="lg:col-span-5 bg-slate-900 text-slate-100 rounded-lg p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-xs text-slate-400">Live Tenant Snapshot</div>
                    <div className="text-sm font-semibold text-white mt-0.5">Dar Zitoun Hospitality Group (2 Branches)</div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Currency: MAD</span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                    <span className="text-slate-300">Heritage Durum Flour T65 (Dry Pantry)</span>
                    <span className="font-mono tabular-nums text-emerald-400">42 kg · 12.00 MAD/kg</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                    <span className="text-slate-300">Cold-Pressed Meknès Olive Oil (Low Stock)</span>
                    <span className="font-mono tabular-nums text-amber-400">8.5 L / 12 L min</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                    <span className="text-slate-300">Pending Order INV-MEK-4410 (Not Yet Received)</span>
                    <span className="font-mono tabular-nums text-slate-200">20 L · 2,000.00 MAD</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                    <span className="text-slate-300">Sea Bass Chermoula Recipe Food Cost</span>
                    <span className="font-mono tabular-nums text-emerald-400">25.81% (47.75 / 185.00 MAD)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Strict tenant isolation enforced via Firestore Rules</span>
                <span className="font-mono">tabular-nums</span>
              </div>
            </div>
          </div>

          {/* Full-width 4-column Architectural Guarantees Strip below the hero split */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-slate-200">
            <div className="bg-white p-4 rounded-md border border-slate-200">
              <div className="text-xs text-slate-500">Accounting Precision</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">Integer Minor-Unit Ledger</div>
              <p className="text-xs text-slate-600 mt-1">
                All currency totals stored in centimes/cents and stock in milli-units. Zero floating-point rounding drift.
              </p>
            </div>
            <div className="bg-white p-4 rounded-md border border-slate-200">
              <div className="text-xs text-slate-500">Inventory Control</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">Order vs. Receipt Separation</div>
              <p className="text-xs text-slate-600 mt-1">
                Drafting or ordering from a supplier never inflates usable stock until delivery is verified and received.
              </p>
            </div>
            <div className="bg-white p-4 rounded-md border border-slate-200">
              <div className="text-xs text-slate-500">Grounded Operations AI</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">Server-Side Gemini 3.8 Flash</div>
              <p className="text-xs text-slate-600 mt-1">
                Queries authorized workspace records, reconciles receipt OCR totals, and requires human approval for actions.
              </p>
            </div>
            <div className="bg-white p-4 rounded-md border border-slate-200">
              <div className="text-xs text-slate-500">Multi-Branch Isolation</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">Zero Cross-Tenant Leakage</div>
              <p className="text-xs text-slate-600 mt-1">
                Hardened Firestore security rules and server-side RBAC isolate every restaurant group and branch.
              </p>
            </div>
          </div>
        </section>

        {/* Core Modules Overview */}
        <section id="modules" className="bg-white border-y border-slate-200 py-14">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-slate-900 font-display">
                01. Connected Operational Modules
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Every action updates the shared operational database—from supplier receipt extraction and stock movements to recipe margins, shift tips, and meeting follow-up tasks.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div id="ledger" className="p-5 rounded-md border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <span>Inventory Ledger & Purchasing</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Track ingredients in kg, g, L, mL, and units with weighted-average valuation. Record opening balances, receipts, theoretical POS consumption, waste, transfers, and audited stocktake adjustments.
                </p>
              </div>

              <div className="p-5 rounded-md border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-slate-700" />
                  <span>AI Receipt OCR & Reconciliation</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Upload or paste supplier invoices for server-side Gemini structured extraction. Side-by-side human review verifies line items, taxes, and arithmetic reconciliation before creating purchase orders.
                </p>
              </div>

              <div className="p-5 rounded-md border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <Utensils className="w-4 h-4 text-slate-700" />
                  <span>Recipes, POS Sales & Table Bookings</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Calculate batch and per-serving food cost percentages. Import POS sales with idempotency protection, compare theoretical vs. actual stock usage, and prevent overlapping table reservations.
                </p>
              </div>

              <div className="p-5 rounded-md border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <span>Tips Pool, Staff & Checklists</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Distinguish tips collected, allocated, and paid out with deterministic centime-exact pool distribution. Manage weekly staff schedules, opening/closing checklists, meetings, and team chat.
                </p>
              </div>

              <div className="p-5 rounded-md border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <Globe className="w-4 h-4 text-slate-700" />
                  <span>Website Builder & Custom Web Service</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Publish a mobile-responsive restaurant website with live menus, opening hours, and DNS TXT domain ownership verification—or request the Ultra plan bespoke custom website build.
                </p>
              </div>

              <div className="p-5 rounded-md border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <Lock className="w-4 h-4 text-slate-700" />
                  <span>CRM, Reviews & Workflow Automation</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Maintain a deduplicated guest directory with explicit visit sources, draft human-approved replies for Google Business Profile reviews, and automate low-stock reorder tasks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section reflecting configured plans */}
        <section id="pricing" className="py-14 max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">
                02. Transparent Subscription Plans & Entitlements
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Server-enforced quotas with Morocco-first MAD reporting and multi-currency checkout via Lemon Squeezy (Merchant of Record).
              </p>
            </div>

            {/* Interactive Filter Controls for Currency & Cadence */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
                {(['MAD', 'USD', 'EUR'] as CurrencyCode[]).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setSelectedCurrency(cur)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      selectedCurrency === cur
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
                <button
                  type="button"
                  onClick={() => setBillingCadence('monthly')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    billingCadence === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCadence('annual')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    billingCadence === 'annual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual (2 Months Free)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((pId) => {
              const plan = DEFAULT_PLAN_DEFINITIONS[pId];
              const priceMinor =
                billingCadence === 'monthly'
                  ? plan.monthlyPriceMinor[selectedCurrency]
                  : plan.annualPriceMinor[selectedCurrency];

              return (
                <div
                  key={pId}
                  className="bg-white rounded-md border border-slate-200 p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-bold text-slate-900 font-display">{plan.name}</h3>
                      <span className="text-xs text-slate-500">
                        {pId === 'ultra' ? 'Includes Custom Website' : `Up to ${plan.maxBranches} branch(es)`}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 min-h-[32px]">{plan.targetAudience}</p>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                        {formatMoneyMinor(priceMinor, selectedCurrency)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        per {billingCadence === 'monthly' ? 'month' : 'year'} · taxes calculated at checkout
                      </div>
                    </div>

                    <dl className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-4">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Branches included</dt>
                        <dd className="font-mono tabular-nums font-medium text-slate-900">{plan.maxBranches}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Staff accounts</dt>
                        <dd className="font-mono tabular-nums font-medium text-slate-900">{plan.maxStaffMembers}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Inventory SKUs</dt>
                        <dd className="font-mono tabular-nums font-medium text-slate-900">{plan.maxIngredients}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Monthly AI queries</dt>
                        <dd className="font-mono tabular-nums font-medium text-slate-900">{plan.monthlyAiQueries}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Receipt OCR scans/mo</dt>
                        <dd className="font-mono tabular-nums font-medium text-slate-900">{plan.monthlyReceiptOcrScans}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Bespoke Website Service</dt>
                        <dd className="font-mono tabular-nums font-medium text-slate-900">
                          {plan.customWebsiteIncluded ? `Included (${plan.customWebsiteRevisionLimit} rev)` : 'Add-on quote'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <button
                    type="button"
                    onClick={onEnterWorkspace}
                    className="mt-6 w-full py-2 px-3 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    {pId === 'free' ? 'Start on Free Plan' : `Select ${plan.name} in Workspace`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Architecture, Billing & Legal Readiness */}
        <section id="architecture" className="bg-white border-t border-slate-200 py-12">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                03. Honest Infrastructure, Quotas & Payment Compliance
              </h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                MiseEnPlace OS is engineered without fabricated metrics or simulated checkout handlers. All external service dependencies—Lemon Squeezy Merchant of Record billing, Rizon payout routing, Google Business Profile OAuth, and Gemini AI quotas—are transparently surfaced and verified on the server.
              </p>
              <div className="mt-4 space-y-2 text-xs text-slate-700">
                <div>
                  <strong>Payment Processor Selection:</strong> Lemon Squeezy (Merchant of Record) supports Morocco-based merchants with international card processing, recurring subscriptions, HMAC-SHA256 webhooks, and payouts in USD via international bank wire or PayPal.
                </div>
                <div>
                  <strong>Rizon Payout Verification:</strong> Never enter a 16-digit Rizon Visa card number as a bank payout account. Lemon Squeezy settles proceeds via bank rails (ACH/SEPA/Wire) or PayPal. Rizon virtual USD (ACH) or EUR (SEPA) receiving accounts can only be used if the account-holder name matches your verified Lemon Squeezy merchant identity.
                </div>
              </div>
            </div>

            <div id="faq" className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Frequently Asked Operational Questions</h3>
              <div className="p-3.5 rounded border border-slate-200 bg-slate-50">
                <div className="text-xs font-semibold text-slate-900">
                  What happens to our restaurant records if a subscription expires?
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Your historical purchases, inventory ledger, recipes, and tax records are never deleted upon expiry. Effective workspace quotas gracefully step down to the Free tier until renewal.
                </p>
              </div>
              <div className="p-3.5 rounded border border-slate-200 bg-slate-50">
                <div className="text-xs font-semibold text-slate-900">
                  Does creating a purchase order immediately increase stock on hand?
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  No. Purchasing and receiving stock are separate, audited operations. Usable stock and weighted-average cost update strictly once when an authorized user marks the delivery as received.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 lg:px-12 py-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div>MiseEnPlace OS · Multi-Tenant Restaurant Operations Platform</div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setLegalModal('privacy')}
            className="hover:text-slate-900 underline cursor-pointer"
          >
            Privacy & Data Protection (Law 09-08 / GDPR)
          </button>
          <button
            type="button"
            onClick={() => setLegalModal('terms')}
            className="hover:text-slate-900 underline cursor-pointer"
          >
            Commercial Terms & Cancellation Policy
          </button>
        </div>
      </footer>

      {legalModal !== 'none' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg max-w-lg w-full p-6 border border-slate-200 shadow-lg">
            <h3 className="text-base font-bold text-slate-900">
              {legalModal === 'privacy'
                ? 'Privacy Policy & Tenant Data Isolation'
                : 'Commercial Terms, Subscriptions & Cancellation Policy'}
            </h3>
            <div className="mt-3 text-xs text-slate-600 space-y-2 leading-relaxed">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    1. <strong>Tenant Isolation:</strong> Each restaurant organization’s inventory, financial records, employee schedules, and customer directory are logically isolated in Cloud Firestore and restricted to authorized members of that organization.
                  </p>
                  <p>
                    2. <strong>Minimal Personal Data & Consent:</strong> Customer contact details record explicit marketing consent and visit source attribution. Owners can export (CSV/JSON) or permanently delete customer records upon request in accordance with Moroccan Law 09-08 (CNDP) and GDPR principles.
                  </p>
                  <p>
                    3. <strong>AI Data Processing:</strong> Receipt images and operational queries submitted to the AI assistant are processed server-side via Google Gemini API solely to fulfill the requested extraction or analysis.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    1. <strong>Subscriptions & Billing:</strong> Paid plans (Pro, Business, Ultra) are billed monthly or annually in advance via Lemon Squeezy (Merchant of Record). Plan entitlements activate only upon cryptographic webhook verification (`subscription_created` / `subscription_payment_success`).
                  </p>
                  <p>
                    2. <strong>Cancellation & Retention:</strong> Subscriptions may be cancelled at any time. Upon expiry, workspaces retain read/export access to historical records while operational quotas revert to Free plan limits.
                  </p>
                  <p>
                    3. <strong>Advisory Disclaimer:</strong> Tip pool reports, food-cost calculations, and daily operating checklists are operational management tools and do not constitute certified tax, payroll, or statutory food-safety certification.
                  </p>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal('none')}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
