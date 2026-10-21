import React from 'react';
import {
  DEFAULT_PLAN_ENTITLEMENTS,
  formatMinorCurrency,
  PlanTier,
} from '../domain/calculations';
import { ShieldCheck, Check, ArrowRight, Lock, Database, Sparkles, Globe } from 'lucide-react';

interface MarketingLandingProps {
  onOpenAuth: (initialMode: 'login' | 'signup') => void;
  onEnterDemoWorkspace: () => void;
}

export const MarketingLanding: React.FC<MarketingLandingProps> = ({
  onOpenAuth,
  onEnterDemoWorkspace,
}) => {
  const plans: PlanTier[] = ['free', 'pro', 'business', 'ultra'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-30">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          TablePulse OS
        </a>

        <nav
          aria-label="Primary Marketing Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#operations"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Operations
          </a>
          <a
            href="#ledger"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Inventory Ledger
          </a>
          <a
            href="#ai-agent"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            AI Assistant
          </a>
          <a
            href="#pricing"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Pricing
          </a>
          <a
            href="#compliance"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Security
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="flex-1">
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-6 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-semibold text-amber-700 tracking-wide mb-3">
              Multi-Tenant Hospitality Operations Platform · MAD / USD / EUR Minor-Unit Ledger
            </p>
            <h1
              className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight mb-6"
              style={{ textWrap: 'balance' }}
            >
              Control Purchasing, Inventory Ledgers, Recipe Costs, and Shift Operations in One Connected Workspace.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed mb-8 max-w-2xl">
              Built for independent restaurants, cafés, and multi-branch hospitality groups. TablePulse OS enforces strict separation between purchase orders and received stock, integer minor-unit monetary precision, role-based tenant isolation, and grounded AI operational assistance.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="px-5 py-3 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Create Restaurant Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In to Existing Workspace
              </button>
              <button
                type="button"
                onClick={onEnterDemoWorkspace}
                className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Inspect Interactive Dar Zitouna Sandbox
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Firebase Auth (Email/Password & Google Sign-In)</span>
              <span aria-hidden="true">·</span>
              <span>Zero-Trust Firestore Tenant Isolation</span>
              <span aria-hidden="true">·</span>
              <span>Lemon Squeezy MoR Recurring Billing</span>
            </div>
          </div>

          {/* Right Column: Live Operational Ledger Preview Card */}
          <div className="lg:col-span-5 bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div>
                  <p className="text-xs text-slate-400">Live Architecture Specification</p>
                  <h2 className="text-base font-semibold text-white">
                    Operational Integrity Guarantees
                  </h2>
                </div>
                <span className="text-xs font-mono text-amber-400">v2026.10</span>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-800/90 border border-slate-700">
                  <p className="font-semibold text-white mb-1">
                    1. Explicit Purchase vs. Stock Receipt Separation
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Drafting or ordering a Purchase Order never inflates usable stock. Inventory balances and weighted-average unit costs update strictly once upon verified delivery receipt.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-800/90 border border-slate-700">
                  <p className="font-semibold text-white mb-1">
                    2. Integer Minor-Unit Financial Accounting
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Every purchase line item, tax, discount, recipe portion cost, and tip pool share is stored in integer minor units (centimes/cents) to prevent floating-point drift.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-800/90 border border-slate-700">
                  <p className="font-semibold text-white mb-1">
                    3. Grounded AI Operations & Receipt Verification
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    AI invoice extraction reconciles line totals against invoice totals and requires human review before creating purchase records.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
              <span>Supported Currencies: MAD · USD · EUR · GBP</span>
              <span>RLS + Master Gate</span>
            </div>
          </div>
        </section>

        {/* Core Capabilities Grid */}
        <section id="operations" className="bg-white border-y border-slate-200 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-amber-700 mb-2">
                01. Connected Domain Modules
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
                Built for Real Restaurant Workflows, Not Decorative Dashboards
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div id="ledger" className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
                <Database className="w-5 h-5 text-amber-700 mb-3" />
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Inventory & Purchasing Ledger
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Track SKUs across kg, g, L, mL, and units. Record purchase orders, verify deliveries into append-only stock movements, and log waste or stocktake adjustments with full audit trails.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
                <Sparkles className="w-5 h-5 text-amber-700 mb-3" />
                <h3 id="ai-agent" className="text-base font-semibold text-slate-900 mb-2">
                  AI Operations & OCR Receipt Review
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload supplier invoices for structured extraction with automatic arithmetic reconciliation, or query the AI assistant on real purchasing, stock, tip, and review records.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
                <ShieldCheck className="w-5 h-5 text-amber-700 mb-3" />
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Recipes, Tips, Staff & Checklists
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Calculate exact batch and portion food-cost percentages, manage FOH/BOH tip-pooling rules, assign tasks directly from team meeting decisions, and track opening/closing checklists.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
                <Globe className="w-5 h-5 text-amber-700 mb-3" />
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  CRM, Bookings, Reviews & Website
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Maintain a deduplicated customer directory, manage table capacity and reservations, draft human-approved review replies, and publish your restaurant website.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Transparent Pricing & Entitlements */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-amber-700 mb-2">
              02. Subscription Plans & Server-Enforced Entitlements
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">
              Configurable Plans with Morocco-First (MAD) & Global Billing
            </h2>
            <p className="text-sm text-slate-600">
              All plan quotas (branches, staff seats, ingredients, monthly AI queries, and custom website entitlements) are enforced server-side. If a subscription expires, workspaces revert cleanly to Free limits without deleting historical records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((tierKey) => {
              const plan = DEFAULT_PLAN_ENTITLEMENTS[tierKey];
              const isHighlighted = tierKey === 'business';
              return (
                <div
                  key={plan.tier}
                  className={`rounded-xl p-6 border flex flex-col justify-between ${
                    isHighlighted
                      ? 'border-slate-900 bg-white shadow-sm'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <span className="text-xs font-mono text-slate-500 uppercase">
                        {plan.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-5 min-h-[36px]">
                      {plan.targetAudience}
                    </p>

                    <div className="mb-6 pb-4 border-b border-slate-100">
                      <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                        {formatMinorCurrency(plan.monthlyPriceMinorMAD, 'MAD')}
                        <span className="text-xs font-normal text-slate-500"> / month</span>
                      </div>
                      <p className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                        or {formatMinorCurrency(plan.monthlyPriceMinorUSD, 'USD')}/mo · Annual:{' '}
                        {formatMinorCurrency(plan.annualPriceMinorMAD, 'MAD')}/yr
                      </p>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-700 mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Up to <strong className="font-mono">{plan.maxBranches}</strong> branch(es)
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Up to <strong className="font-mono">{plan.maxStaffMembers}</strong> staff accounts
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong className="font-mono">{plan.maxIngredients}</strong> tracked stock items
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong className="font-mono">{plan.monthlyAiQueries}</strong> AI queries / month
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {plan.includesCustomWebsiteService
                            ? 'Includes 1 bespoke custom website build'
                            : 'Self-service restaurant website builder'}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    Start with {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Security, Privacy & Payment Transparency Section */}
        <section id="compliance" className="bg-white border-t border-slate-200 py-14">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-slate-600">
            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>Authentication & Session Security</span>
              </div>
              <p className="leading-relaxed">
                User registration and sign-in are powered by Firebase Authentication supporting Email/Password and Google OAuth 2.0 Sign-In. Protected workspace routes require an active authenticated session or explicit sandbox inspection.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Merchant of Record & Rizon Payouts</span>
              </div>
              <p className="leading-relaxed">
                Recurring subscriptions integrate with Lemon Squeezy (Merchant of Record), which supports Morocco-based merchants and settles USD ACH / EUR SEPA payouts compatible with Rizon virtual bank accounts (spendable via Rizon Visa card).
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                <Database className="w-4 h-4 text-amber-700" />
                <span>Privacy, CNDP Law 09-08 & GDPR Readiness</span>
              </div>
              <p className="leading-relaxed">
                Customer records track explicit marketing consent, support full JSON/CSV export and erasure workflows, and isolate PII by organization ID and role permissions.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 text-xs py-8 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>TablePulse OS — Multi-Tenant Hospitality Operations Platform</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
