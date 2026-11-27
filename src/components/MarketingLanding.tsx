import React, { useState, useEffect } from 'react';
import {
  DEFAULT_PLAN_ENTITLEMENTS,
  formatMinorCurrency,
  PlanTier,
} from '../domain/calculations';
import {
  ThemeMode,
  AnnouncementItem,
  DismissedAnnouncementRecord,
  FaqItem,
  UtmAttribution,
  SupportTicketRecord,
} from '../domain/enhancements';
import {
  SkipToContentLink,
  ThemeToggleButton,
  ScrollProgressBar,
  AnnouncementBanner,
  FaqAccordion,
  BackToTopButton,
  UtmConsentBanner,
  FloatingSupportWidget,
  LastUpdatedBadge,
} from './EnhancementWidgets';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  Lock,
  Database,
  Sparkles,
  Globe,
  Search,
  Menu,
  X,
  Layers,
  Receipt,
  ChefHat,
  Users,
} from 'lucide-react';

interface MarketingLandingProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  announcements: AnnouncementItem[];
  dismissedAnnouncements: DismissedAnnouncementRecord[];
  onDismissAnnouncement: (ann: AnnouncementItem) => void;
  faqs: FaqItem[];
  detectedUtm: UtmAttribution | null;
  utmConsentGranted: boolean | null;
  onSetUtmConsent: (granted: boolean) => void;
  onOpenGlobalSearch: () => void;
  onOpenAuth: (initialMode: 'login' | 'signup') => void;
  onEnterDemoWorkspace: () => void;
  onSupportTicketCreated?: (ticket: SupportTicketRecord) => void;
}

export const MarketingLanding: React.FC<MarketingLandingProps> = ({
  theme,
  onToggleTheme,
  announcements,
  dismissedAnnouncements,
  onDismissAnnouncement,
  faqs,
  detectedUtm,
  utmConsentGranted,
  onSetUtmConsent,
  onOpenGlobalSearch,
  onOpenAuth,
  onEnterDemoWorkspace,
  onSupportTicketCreated,
}) => {
  const plans: PlanTier[] = ['free', 'pro', 'business', 'ultra'];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#18231F] flex flex-col">
      {/* 12. Skip-to-Content Link */}
      <SkipToContentLink targetId="main-content" />

      {/* 8. Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* 2. Configurable Platform Announcement Banner */}
      <AnnouncementBanner
        announcements={announcements}
        currentView="public"
        dismissedRecords={dismissedAnnouncements}
        onDismiss={onDismissAnnouncement}
      />

      {/* 11. Sticky Top Header with 3-Zone Contract & 5. Responsive Mobile Navigation */}
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#E1E6E1] bg-white sticky top-0 z-30">
        <a
          href="#main-content"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#18231F] whitespace-nowrap shrink-0"
        >
          <span className="w-7 h-7 rounded-lg bg-[#176B58] text-white flex items-center justify-center text-xs font-mono font-bold">
            TP
          </span>
          <span>TablePulse OS</span>
        </a>

        <nav
          aria-label="Primary Marketing Navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#68736D]"
        >
          <a
            href="#operations"
            className="hover:text-[#18231F] transition-colors whitespace-nowrap shrink-0"
          >
            Operations
          </a>
          <a
            href="#ledger"
            className="hover:text-[#18231F] transition-colors whitespace-nowrap shrink-0"
          >
            Inventory Ledger
          </a>
          <a
            href="#ai-agent"
            className="hover:text-[#18231F] transition-colors whitespace-nowrap shrink-0"
          >
            AI Assistant
          </a>
          <a
            href="#pricing"
            className="hover:text-[#18231F] transition-colors whitespace-nowrap shrink-0"
          >
            Pricing
          </a>
          <a
            href="#faq-section"
            className="hover:text-[#18231F] transition-colors whitespace-nowrap shrink-0"
          >
            FAQs
          </a>
          <a
            href="#compliance"
            className="hover:text-[#18231F] transition-colors whitespace-nowrap shrink-0"
          >
            Security
          </a>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* 3. Global Site Search Trigger */}
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            aria-label="Search public documentation, pricing, and FAQs"
            className="px-3 py-1.5 rounded-lg border border-[#E1E6E1] bg-[#F7F8F5] hover:bg-[#EFF2ED] text-xs font-medium text-[#68736D] inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#176B58]" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#E1E6E1] rounded text-[#18231F]">
              Ctrl K
            </kbd>
          </button>

          {/* 1. Dark Mode Toggle */}
          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />

          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-[#18231F] bg-white border border-[#E1E6E1] rounded-lg hover:bg-[#EFF2ED] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => onOpenAuth('signup')}
            className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-white bg-[#176B58] rounded-lg hover:bg-[#115644] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start Workspace
          </button>

          {/* 5. Mobile Navigation Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 rounded-lg border border-[#E1E6E1] text-[#18231F] hover:bg-[#EFF2ED] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 5. Accessible Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="public-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className="lg:hidden fixed inset-0 z-40 bg-[#141A18]/70 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <nav
            aria-label="Mobile Marketing Navigation"
            className="w-72 max-w-full bg-white h-full p-6 border-r border-[#E1E6E1] flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E1E6E1]">
                <span className="font-bold text-[#18231F]">TablePulse OS</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close mobile menu"
                  className="p-1 text-[#68736D] hover:text-[#18231F] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col space-y-2.5 text-sm font-semibold text-[#18231F]">
                <a
                  href="#operations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 hover:text-[#176B58]"
                >
                  Operations Modules
                </a>
                <a
                  href="#ledger"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 hover:text-[#176B58]"
                >
                  Inventory Ledger
                </a>
                <a
                  href="#ai-agent"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 hover:text-[#176B58]"
                >
                  AI Operations Assistant
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 hover:text-[#176B58]"
                >
                  Pricing & Entitlements
                </a>
                <a
                  href="#faq-section"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 hover:text-[#176B58]"
                >
                  Frequently Asked Questions
                </a>
                <a
                  href="#compliance"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 hover:text-[#176B58]"
                >
                  Security & Privacy
                </a>
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-[#E1E6E1]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="w-full py-2.5 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Create Restaurant Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="w-full py-2.5 px-4 bg-white border border-[#E1E6E1] text-[#18231F] text-xs font-semibold rounded-lg cursor-pointer"
              >
                Sign In to Workspace
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Landmark Target for Skip-to-Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-20 focus:outline-none">
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-6 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-mono font-semibold text-[#176B58] uppercase tracking-wider mb-3">
              Multi-Tenant Hospitality Operations · MAD · USD · EUR · GBP Ledger
            </p>
            <h1
              className="text-4xl lg:text-5xl font-bold tracking-tight text-[#18231F] leading-[1.12] mb-6"
              style={{ textWrap: 'balance' }}
            >
              Operational Precision for Purchasing, Inventory Ledgers, Recipe Costs, and Shift Execution.
            </h1>
            <p className="text-base text-[#68736D] leading-relaxed mb-8 max-w-2xl">
              Engineered for independent restaurants, cafés, and multi-branch hospitality groups. TablePulse OS enforces strict separation between purchase orders and verified stock receipts, integer minor-unit accounting, role-scoped tenant isolation, and grounded AI operational workflows.
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="px-5 py-3 text-sm font-semibold text-white bg-[#176B58] hover:bg-[#115644] rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Create Restaurant Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-5 py-3 text-sm font-semibold text-[#18231F] bg-white border border-[#E1E6E1] hover:bg-[#EFF2ED] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In to Workspace
              </button>
              <button
                type="button"
                onClick={onEnterDemoWorkspace}
                className="px-4 py-3 text-sm font-semibold text-[#176B58] hover:text-[#115644] underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Inspect Live Dar Zitouna Workspace
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E1E6E1] flex flex-wrap items-center justify-between gap-3 text-xs text-[#68736D]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span>Firebase Auth (Email & Google)</span>
                <span aria-hidden="true">·</span>
                <span>Zero-Trust Firestore Tenant Isolation</span>
                <span aria-hidden="true">·</span>
                <span>Lemon Squeezy MoR Recurring Billing</span>
              </div>
              <LastUpdatedBadge
                timestamp="2026-10-21T08:00:00.000Z"
                label="Architecture Spec"
              />
            </div>
          </div>

          {/* Right Column: Live Operational Ledger Preview Surface */}
          <div className="lg:col-span-5 bg-[#18231F] text-[#F0F3F0] rounded-xl p-6 border border-[#303A35] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#303A35]">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#58B99A]">
                    Verified System Architecture
                  </p>
                  <h2 className="text-base font-semibold text-white mt-0.5">
                    Operational Integrity Guarantees
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#B4C0B8]">v2026.10</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="p-3.5 rounded-lg bg-[#232C27] border border-[#303A35]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-white">
                      1. Purchase Order vs. Stock Receipt Separation
                    </p>
                    <span className="font-mono text-[10px] text-[#58B99A]">APPEND-ONLY</span>
                  </div>
                  <p className="text-[#B4C0B8] leading-relaxed">
                    Drafting or ordering a Purchase Order never inflates usable stock. Inventory balances and weighted-average unit costs update strictly once upon verified delivery receipt.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#232C27] border border-[#303A35]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-white">
                      2. Integer Minor-Unit Financial Accounting
                    </p>
                    <span className="font-mono text-[10px] text-[#58B99A]">CENTIMES / CENTS</span>
                  </div>
                  <p className="text-[#B4C0B8] leading-relaxed">
                    Every purchase line item, tax, discount, recipe portion cost, and tip pool share is stored in integer minor units to eliminate floating-point drift.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#232C27] border border-[#303A35]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-white">
                      3. Grounded AI Operations & Receipt Verification
                    </p>
                    <span className="font-mono text-[10px] text-[#58B99A]">HUMAN-IN-LOOP</span>
                  </div>
                  <p className="text-[#B4C0B8] leading-relaxed">
                    AI invoice extraction reconciles line totals against invoice totals and requires manager approval before writing purchase or stock records.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#303A35] flex items-center justify-between text-xs text-[#B4C0B8] font-mono tabular-nums">
              <span>Currencies: MAD · USD · EUR · GBP</span>
              <span>RBAC + Tenant Gate</span>
            </div>
          </div>
        </section>

        {/* Core Capabilities Grid */}
        <section id="operations" className="bg-white border-y border-[#E1E6E1] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-mono font-semibold text-[#176B58] uppercase tracking-wider mb-2">
                01 · Connected Domain Modules
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold text-[#18231F]">
                Built for Daily Hospitality Execution, Not Decorative Dashboards
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div id="ledger" className="p-6 rounded-xl border border-[#E1E6E1] bg-[#F7F8F5]">
                <div className="w-9 h-9 rounded-lg bg-[#E6F0E9] text-[#176B58] flex items-center justify-center mb-4">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#18231F] mb-2">
                  Inventory & Purchasing Ledger
                </h3>
                <p className="text-sm text-[#68736D] leading-relaxed">
                  Track SKUs across kg, g, L, mL, and units. Record purchase orders, verify deliveries into append-only stock movements, and log waste or stocktake adjustments with full audit trails.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E1E6E1] bg-[#F7F8F5]">
                <div className="w-9 h-9 rounded-lg bg-[#E6F0E9] text-[#176B58] flex items-center justify-center mb-4">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 id="ai-agent" className="text-base font-semibold text-[#18231F] mb-2">
                  AI Operations & OCR Receipt Review
                </h3>
                <p className="text-sm text-[#68736D] leading-relaxed">
                  Upload supplier invoices for structured extraction with automatic arithmetic reconciliation, or query the AI assistant on real purchasing, stock, tip, and review records.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E1E6E1] bg-[#F7F8F5]">
                <div className="w-9 h-9 rounded-lg bg-[#E6F0E9] text-[#176B58] flex items-center justify-center mb-4">
                  <ChefHat className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#18231F] mb-2">
                  Recipes, Tips, Staff & Checklists
                </h3>
                <p className="text-sm text-[#68736D] leading-relaxed">
                  Calculate exact batch and portion food-cost percentages, manage FOH/BOH tip-pooling rules, assign tasks directly from team meeting decisions, and track opening/closing checklists.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E1E6E1] bg-[#F7F8F5]">
                <div className="w-9 h-9 rounded-lg bg-[#E6F0E9] text-[#176B58] flex items-center justify-center mb-4">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#18231F] mb-2">
                  CRM, Bookings, Reviews & Website
                </h3>
                <p className="text-sm text-[#68736D] leading-relaxed">
                  Maintain a deduplicated customer directory, manage table capacity and reservations, draft human-approved review replies, and publish your restaurant website.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Transparent Pricing & Entitlements */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-mono font-semibold text-[#176B58] uppercase tracking-wider mb-2">
              02 · Subscription Plans & Server-Enforced Entitlements
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#18231F] mb-3">
              Transparent Plans with Morocco-First (MAD) & Global Billing
            </h2>
            <p className="text-sm text-[#68736D]">
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
                      ? 'border-[#176B58] ring-1 ring-[#176B58]/20 bg-white'
                      : 'border-[#E1E6E1] bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-[#18231F]">{plan.name}</h3>
                      <span className="text-xs font-mono text-[#176B58] uppercase font-semibold">
                        {plan.tier}
                      </span>
                    </div>
                    <p className="text-xs text-[#68736D] mb-5 min-h-[36px]">
                      {plan.targetAudience}
                    </p>

                    <div className="mb-6 pb-4 border-b border-[#E1E6E1]">
                      <div className="text-2xl font-bold font-mono tabular-nums text-[#18231F]">
                        {formatMinorCurrency(plan.monthlyPriceMinorMAD, 'MAD')}
                        <span className="text-xs font-normal text-[#68736D]"> / month</span>
                      </div>
                      <p className="text-xs font-mono tabular-nums text-[#68736D] mt-1">
                        or {formatMinorCurrency(plan.monthlyPriceMinorUSD, 'USD')}/mo · Annual:{' '}
                        {formatMinorCurrency(plan.annualPriceMinorMAD, 'MAD')}/yr
                      </p>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#18231F] mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#176B58] shrink-0" />
                        <span>
                          Up to <strong className="font-mono">{plan.maxBranches}</strong> branch(es)
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#176B58] shrink-0" />
                        <span>
                          Up to <strong className="font-mono">{plan.maxStaffMembers}</strong> staff accounts
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#176B58] shrink-0" />
                        <span>
                          <strong className="font-mono">{plan.maxIngredients}</strong> tracked stock items
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#176B58] shrink-0" />
                        <span>
                          <strong className="font-mono">{plan.monthlyAiQueries}</strong> AI queries / month
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#176B58] shrink-0" />
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
                        ? 'bg-[#176B58] text-white hover:bg-[#115644]'
                        : 'bg-[#EFF2ED] text-[#18231F] hover:bg-[#E6F0E9]'
                    }`}
                  >
                    Start with {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 19. Expandable Accessible FAQ Section with JSON-LD */}
        <section id="faq-section" className="bg-white border-t border-[#E1E6E1] py-16">
          <div className="max-w-5xl mx-auto px-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-mono font-semibold text-[#176B58] uppercase tracking-wider mb-2">
                  03 · Verified Product & Architecture FAQs
                </p>
                <h2 className="text-2xl lg:text-3xl font-bold text-[#18231F]">
                  Frequently Asked Questions
                </h2>
              </div>
              <LastUpdatedBadge
                timestamp="2026-10-21T08:00:00.000Z"
                label="FAQ Index Updated"
              />
            </div>

            <FaqAccordion faqs={faqs} includeJsonLd />
          </div>
        </section>

        {/* Security, Privacy & Payment Transparency Section */}
        <section id="compliance" className="bg-[#F7F8F5] border-t border-[#E1E6E1] py-14">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-[#68736D]">
            <div>
              <div className="flex items-center gap-2 font-semibold text-[#18231F] text-sm mb-2">
                <Lock className="w-4 h-4 text-[#176B58]" />
                <span>Authentication & Session Security</span>
              </div>
              <p className="leading-relaxed">
                User registration and sign-in are powered by Firebase Authentication supporting Email/Password and Google OAuth 2.0 Sign-In. Protected workspace routes require an active authenticated session or explicit sandbox inspection.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 font-semibold text-[#18231F] text-sm mb-2">
                <ShieldCheck className="w-4 h-4 text-[#176B58]" />
                <span>Merchant of Record & Rizon Payouts</span>
              </div>
              <p className="leading-relaxed">
                Recurring subscriptions integrate with Lemon Squeezy (Merchant of Record), which supports Morocco-based merchants and settles USD ACH / EUR SEPA payouts compatible with Rizon virtual bank accounts (spendable via Rizon Visa card).
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 font-semibold text-[#18231F] text-sm mb-2">
                <Database className="w-4 h-4 text-[#176B58]" />
                <span>Privacy, CNDP Law 09-08 & GDPR Readiness</span>
              </div>
              <p className="leading-relaxed">
                Customer records track explicit marketing consent, support full JSON/CSV export and erasure workflows, and isolate PII by organization ID and role permissions. First-party UTM attribution respects explicit user consent.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#18231F] text-[#B4C0B8] text-xs py-8 px-6 border-t border-[#303A35]">
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

      {/* 14. Privacy-Conscious UTM Consent Banner */}
      <UtmConsentBanner
        detectedUtm={detectedUtm}
        consentGranted={utmConsentGranted}
        onSetConsent={onSetUtmConsent}
      />

      {/* 4. Back-to-Top Button */}
      <BackToTopButton />

      {/* 20. Floating Contact & Support Widget */}
      <FloatingSupportWidget
        orgId="public_visitor"
        faqs={faqs}
        onTicketCreated={onSupportTicketCreated}
      />
    </div>
  );
};
