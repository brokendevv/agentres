import {
  Ingredient,
  Supplier,
  PurchaseOrder,
  Recipe,
  CustomerRecord,
  ReservationRecord,
  PosOrder,
  ReviewRecord,
  TaskRecord,
  MeetingRecord,
  MemberRole,
} from './types';

export type ThemeMode = 'light' | 'dark';

export interface AnnouncementItem {
  id: string;
  orgId: string;
  title: string;
  message: string;
  severity: 'info' | 'feature' | 'maintenance' | 'warning';
  scope: 'public' | 'dashboard' | 'both' | 'restaurant_site';
  ctaLabel?: string;
  ctaHref?: string;
  published: boolean;
  dismissible: boolean;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DismissedAnnouncementRecord {
  announcementId: string;
  dismissedAtVersion: string;
}

export interface SearchResultItem {
  id: string;
  category:
    | 'public_page'
    | 'faq'
    | 'pricing'
    | 'ingredient'
    | 'purchase'
    | 'supplier'
    | 'customer'
    | 'review'
    | 'meeting'
    | 'task'
    | 'recipe'
    | 'reservation'
    | 'order';
  title: string;
  subtitle: string;
  badge?: string;
  targetSection?:
    | 'overview'
    | 'inventory_purchasing'
    | 'team_operations'
    | 'growth_experience'
    | 'intelligence_governance';
  targetSubTab?: string;
  publicHref?: string;
}

export interface FaqItem {
  id: string;
  category: 'product' | 'billing' | 'security' | 'operations';
  question: string;
  answer: string;
  lastUpdated: string;
}

export interface UtmAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  capturedAt: string;
}

export interface SupportTicketRecord {
  id: string;
  orgId: string;
  requesterName: string;
  requesterEmail: string;
  category: 'billing' | 'inventory_ledger' | 'ai_assistant' | 'website_builder' | 'security' | 'general';
  subject: string;
  message: string;
  contextUrl: string;
  status: 'received' | 'in_review' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

/**
 * 1. Dark Mode Theme Resolution & Persistence Helpers
 */
export function resolveInitialTheme(
  savedPreference: string | null | undefined,
  systemPrefersDark: boolean
): ThemeMode {
  if (savedPreference === 'dark' || savedPreference === 'light') {
    return savedPreference;
  }
  return systemPrefersDark ? 'dark' : 'light';
}

export function toggleThemeValue(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * 2. Announcement Visibility, Expiry, Scope & Dismissal Evaluation
 */
export function isAnnouncementVisible(params: {
  announcement: AnnouncementItem;
  currentView: 'public' | 'dashboard' | 'restaurant_site';
  nowIso: string;
  dismissedRecords: DismissedAnnouncementRecord[];
}): boolean {
  const { announcement, currentView, nowIso, dismissedRecords } = params;

  if (!announcement.published) {
    return false;
  }

  // Scope check
  if (currentView === 'public' && announcement.scope !== 'public' && announcement.scope !== 'both') {
    return false;
  }
  if (
    currentView === 'dashboard' &&
    announcement.scope !== 'dashboard' &&
    announcement.scope !== 'both'
  ) {
    return false;
  }
  if (currentView === 'restaurant_site' && announcement.scope !== 'restaurant_site') {
    return false;
  }

  // Expiry check
  if (announcement.expiresAt && announcement.expiresAt.trim() !== '') {
    const expiryTime = Date.parse(announcement.expiresAt);
    const nowTime = Date.parse(nowIso);
    if (!Number.isNaN(expiryTime) && !Number.isNaN(nowTime) && nowTime > expiryTime) {
      return false;
    }
  }

  // Dismissal check (re-shows if announcement was updated after dismissal)
  if (announcement.dismissible) {
    const dismissed = dismissedRecords.find((d) => d.announcementId === announcement.id);
    if (dismissed && dismissed.dismissedAtVersion === announcement.updatedAt) {
      return false;
    }
  }

  return true;
}

export function validateAnnouncementInput(input: {
  title: string;
  message: string;
  ctaHref?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input.title || input.title.trim().length < 3) {
    errors.title = 'Announcement title must be at least 3 characters.';
  }
  if (!input.message || input.message.trim().length < 8) {
    errors.message = 'Announcement message must be at least 8 characters.';
  }
  if (input.ctaHref && input.ctaHref.trim() !== '') {
    const href = input.ctaHref.trim();
    if (!href.startsWith('#') && !href.startsWith('/') && !href.startsWith('https://')) {
      errors.ctaHref = 'Link must start with #, /, or https://';
    }
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * 3. Public vs. Authenticated Tenant-Isolated Global Search
 */
export const PUBLIC_SEARCH_INDEX: SearchResultItem[] = [
  {
    id: 'pub_ops',
    category: 'public_page',
    title: 'Connected Restaurant Operations Overview',
    subtitle: 'Inventory, Purchasing, Recipes, Tips, Staff, CRM, and AI Operations',
    badge: 'Section',
    publicHref: '#operations',
  },
  {
    id: 'pub_ledger',
    category: 'public_page',
    title: 'Immutable Inventory & Purchase Ledger',
    subtitle: 'Strict separation between Purchase Orders and Received Stock in minor units',
    badge: 'Feature',
    publicHref: '#ledger',
  },
  {
    id: 'pub_ai',
    category: 'public_page',
    title: 'Grounded AI Operations Assistant & Receipt OCR',
    subtitle: 'Invoice arithmetic reconciliation and tenant-scoped operational queries',
    badge: 'AI Module',
    publicHref: '#ai-agent',
  },
  {
    id: 'pub_pricing',
    category: 'pricing',
    title: 'Subscription Plans: Free, Pro, Business & Ultra',
    subtitle: 'MAD & USD pricing with Lemon Squeezy Merchant of Record and Rizon payouts',
    badge: 'Pricing',
    publicHref: '#pricing',
  },
  {
    id: 'pub_security',
    category: 'public_page',
    title: 'Zero-Trust Firestore Rules & CNDP / GDPR Privacy',
    subtitle: 'Multi-tenant Master Gate isolation, Firebase Auth, and audit logging',
    badge: 'Security',
    publicHref: '#compliance',
  },
];

export function executePublicSearch(query: string, faqs: FaqItem[]): SearchResultItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const pageMatches = PUBLIC_SEARCH_INDEX.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
  );

  const faqMatches: SearchResultItem[] = faqs
    .filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    )
    .map((f) => ({
      id: `faq_${f.id}`,
      category: 'faq',
      title: f.question,
      subtitle: f.answer.slice(0, 120) + (f.answer.length > 120 ? '...' : ''),
      badge: 'FAQ',
      publicHref: '#faq-section',
    }));

  return [...pageMatches, ...faqMatches].slice(0, 12);
}

export function executeAuthenticatedTenantSearch(params: {
  query: string;
  activeOrgId: string;
  actorRole: MemberRole;
  ingredients: Ingredient[];
  purchases: PurchaseOrder[];
  suppliers: Supplier[];
  recipes: Recipe[];
  customers: CustomerRecord[];
  reservations: ReservationRecord[];
  orders: PosOrder[];
  reviews: ReviewRecord[];
  meetings: MeetingRecord[];
  tasks: TaskRecord[];
}): SearchResultItem[] {
  const {
    query,
    activeOrgId,
    actorRole,
    ingredients,
    purchases,
    suppliers,
    recipes,
    customers,
    reservations,
    orders,
    reviews,
    meetings,
    tasks,
  } = params;

  const q = query.trim().toLowerCase();
  if (!q || !activeOrgId) return [];

  const results: SearchResultItem[] = [];

  // Strictly filter every collection by activeOrgId to guarantee tenant isolation
  for (const ing of ingredients) {
    if (ing.orgId !== activeOrgId) continue;
    if (
      ing.name.toLowerCase().includes(q) ||
      ing.sku.toLowerCase().includes(q) ||
      ing.category.toLowerCase().includes(q)
    ) {
      results.push({
        id: ing.id,
        category: 'ingredient',
        title: `${ing.name} (${ing.sku})`,
        subtitle: `Stock: ${ing.currentStock} ${ing.baseUnit} · Storage: ${ing.storageLocation}`,
        badge: 'Ingredient',
        targetSection: 'inventory_purchasing',
        targetSubTab: 'stock',
      });
    }
  }

  for (const po of purchases) {
    if (po.orgId !== activeOrgId) continue;
    if (
      po.invoiceRef.toLowerCase().includes(q) ||
      po.ingredientName.toLowerCase().includes(q) ||
      po.supplierName.toLowerCase().includes(q)
    ) {
      results.push({
        id: po.id,
        category: 'purchase',
        title: `PO ${po.invoiceRef} — ${po.ingredientName}`,
        subtitle: `Supplier: ${po.supplierName} · Status: ${po.status.toUpperCase()}`,
        badge: 'Purchase Order',
        targetSection: 'inventory_purchasing',
        targetSubTab: 'purchasing',
      });
    }
  }

  for (const sup of suppliers) {
    if (sup.orgId !== activeOrgId) continue;
    if (
      sup.name.toLowerCase().includes(q) ||
      sup.category.toLowerCase().includes(q) ||
      sup.contactName.toLowerCase().includes(q)
    ) {
      results.push({
        id: sup.id,
        category: 'supplier',
        title: sup.name,
        subtitle: `${sup.category} · Contact: ${sup.contactName}`,
        badge: 'Supplier',
        targetSection: 'inventory_purchasing',
        targetSubTab: 'purchasing',
      });
    }
  }

  for (const rec of recipes) {
    if (rec.orgId !== activeOrgId) continue;
    if (
      rec.dishName.toLowerCase().includes(q) ||
      rec.category.toLowerCase().includes(q) ||
      rec.primaryIngredientName.toLowerCase().includes(q)
    ) {
      results.push({
        id: rec.id,
        category: 'recipe',
        title: rec.dishName,
        subtitle: `Recipe (${rec.category}) · Primary: ${rec.primaryIngredientName}`,
        badge: 'Recipe',
        targetSection: 'inventory_purchasing',
        targetSubTab: 'recipes',
      });
    }
  }

  // Customer PII records only returned to owner, manager, or finance/staff with CRM access (blocked for inventory-only role)
  if (actorRole !== 'inventory') {
    for (const cust of customers) {
      if (cust.orgId !== activeOrgId) continue;
      if (
        cust.name.toLowerCase().includes(q) ||
        cust.email.toLowerCase().includes(q) ||
        cust.dietaryNotes.toLowerCase().includes(q)
      ) {
        results.push({
          id: cust.id,
          category: 'customer',
          title: cust.name,
          subtitle: `${cust.visitsCount} visits · Dietary: ${cust.dietaryNotes}`,
          badge: 'Customer',
          targetSection: 'growth_experience',
          targetSubTab: 'crm',
        });
      }
    }
  }

  for (const res of reservations) {
    if (res.orgId !== activeOrgId) continue;
    if (
      res.customerName.toLowerCase().includes(q) ||
      res.tableNumber.toLowerCase().includes(q) ||
      res.specialRequests.toLowerCase().includes(q)
    ) {
      results.push({
        id: res.id,
        category: 'reservation',
        title: `Booking: ${res.customerName} (Table ${res.tableNumber})`,
        subtitle: `${res.date} at ${res.time} · Party of ${res.partySize} · ${res.status}`,
        badge: 'Reservation',
        targetSection: 'growth_experience',
        targetSubTab: 'reservations',
      });
    }
  }

  for (const ord of orders) {
    if (ord.orgId !== activeOrgId) continue;
    if (
      ord.externalOrderId.toLowerCase().includes(q) ||
      ord.dishName.toLowerCase().includes(q)
    ) {
      results.push({
        id: ord.id,
        category: 'order',
        title: `POS Order ${ord.externalOrderId}`,
        subtitle: `${ord.quantity}× ${ord.dishName} (${ord.orderDate})`,
        badge: 'POS Sale',
        targetSection: 'growth_experience',
        targetSubTab: 'pos_sales',
      });
    }
  }

  for (const rev of reviews) {
    if (rev.orgId !== activeOrgId) continue;
    if (
      rev.authorName.toLowerCase().includes(q) ||
      rev.comment.toLowerCase().includes(q)
    ) {
      results.push({
        id: rev.id,
        category: 'review',
        title: `Review by ${rev.authorName} (${rev.rating}/5)`,
        subtitle: rev.comment.slice(0, 90),
        badge: 'Review',
        targetSection: 'growth_experience',
        targetSubTab: 'reviews',
      });
    }
  }

  for (const mtg of meetings) {
    if (mtg.orgId !== activeOrgId) continue;
    if (
      mtg.title.toLowerCase().includes(q) ||
      mtg.decisions.toLowerCase().includes(q) ||
      mtg.agenda.toLowerCase().includes(q)
    ) {
      results.push({
        id: mtg.id,
        category: 'meeting',
        title: mtg.title,
        subtitle: `${mtg.date} · Decision: ${mtg.decisions.slice(0, 80)}`,
        badge: 'Meeting',
        targetSection: 'team_operations',
        targetSubTab: 'meetings_tasks',
      });
    }
  }

  for (const tsk of tasks) {
    if (tsk.orgId !== activeOrgId) continue;
    if (
      tsk.title.toLowerCase().includes(q) ||
      tsk.assigneeName.toLowerCase().includes(q) ||
      tsk.description.toLowerCase().includes(q)
    ) {
      results.push({
        id: tsk.id,
        category: 'task',
        title: tsk.title,
        subtitle: `Assignee: ${tsk.assigneeName} · Priority: ${tsk.priority.toUpperCase()} · ${tsk.status}`,
        badge: 'Task',
        targetSection: 'team_operations',
        targetSubTab: 'meetings_tasks',
      });
    }
  }

  return results.slice(0, 20);
}

/**
 * 4. Back-to-Top & 8. Scroll Progress Calculations
 */
export function shouldShowBackToTop(params: {
  scrollY: number;
  viewportHeight: number;
  documentHeight: number;
  threshold?: number;
}): boolean {
  const threshold = params.threshold ?? 360;
  const scrollableDistance = params.documentHeight - params.viewportHeight;
  if (scrollableDistance < threshold) {
    return false;
  }
  return params.scrollY >= threshold;
}

export function calculateScrollProgress(params: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  minScrollableThreshold?: number;
}): { visible: boolean; percentage: number } {
  const minThreshold = params.minScrollableThreshold ?? 200;
  const scrollable = params.scrollHeight - params.clientHeight;
  if (scrollable < minThreshold || scrollable <= 0) {
    return { visible: false, percentage: 0 };
  }
  const raw = (params.scrollTop / scrollable) * 100;
  const clamped = Math.max(0, Math.min(100, Math.round(raw)));
  return { visible: true, percentage: clamped };
}

/**
 * 5. Role-Based Navigation Permissions
 */
export interface AuthorizedNavItem {
  id:
    | 'overview'
    | 'inventory_purchasing'
    | 'team_operations'
    | 'growth_experience'
    | 'intelligence_governance';
  label: string;
  allowedRoles: MemberRole[];
}

export const WORKSPACE_NAV_ITEMS: AuthorizedNavItem[] = [
  {
    id: 'overview',
    label: 'Operations Overview',
    allowedRoles: ['owner', 'manager', 'finance', 'inventory', 'staff'],
  },
  {
    id: 'inventory_purchasing',
    label: 'Inventory, POs & Recipes',
    allowedRoles: ['owner', 'manager', 'finance', 'inventory'],
  },
  {
    id: 'team_operations',
    label: 'Tips, Staff, Tasks & Chat',
    allowedRoles: ['owner', 'manager', 'finance', 'inventory', 'staff'],
  },
  {
    id: 'growth_experience',
    label: 'CRM, POS, Reviews & Site',
    allowedRoles: ['owner', 'manager', 'finance', 'staff'],
  },
  {
    id: 'intelligence_governance',
    label: 'AI Agent, Billing & Admin',
    allowedRoles: ['owner', 'manager', 'finance'],
  },
];

export function getAuthorizedNavigationItems(role: MemberRole): AuthorizedNavItem[] {
  return WORKSPACE_NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));
}

/**
 * 9. Copy-to-Clipboard Guard (Prevents copying secrets)
 */
const FORBIDDEN_SECRET_PATTERNS = [
  /LEMON_SQUEEZY_API_KEY/i,
  /GEMINI_API_KEY/i,
  /AIzaSy[a-zA-Z0-9_-]{33}/,
  /-----BEGIN PRIVATE KEY-----/,
  /Bearer\s+[a-zA-Z0-9._-]{25,}/i,
];

export function validateCopyPayload(rawText: string): {
  allowed: boolean;
  reason?: string;
  sanitizedText: string;
} {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    return { allowed: false, reason: 'Nothing to copy.', sanitizedText: '' };
  }
  for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'Security Policy: Sensitive credentials and private keys cannot be copied to clipboard.',
        sanitizedText: '',
      };
    }
  }
  return { allowed: true, sanitizedText: trimmed };
}

/**
 * 14. Privacy-Conscious UTM Campaign Tracking
 */
const ALLOWED_UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export function sanitizeUtmValue(raw: string): string {
  return raw
    .replace(/<[^>]*>?/gm, '')
    .replace(/[^a-zA-Z0-9_.\-\s/]/g, '')
    .trim()
    .slice(0, 100);
}

export function parseAndSanitizeUtmParams(
  searchString: string,
  nowIso: string = new Date().toISOString()
): UtmAttribution | null {
  const params = new URLSearchParams(searchString);
  const result: Partial<UtmAttribution> = {};
  let foundAny = false;

  for (const key of ALLOWED_UTM_KEYS) {
    const val = params.get(key);
    if (val) {
      const cleaned = sanitizeUtmValue(val);
      if (cleaned.length > 0) {
        result[key] = cleaned;
        foundAny = true;
      }
    }
  }

  if (!foundAny) return null;
  return {
    ...result,
    capturedAt: nowIso,
  };
}

export function canAssociateAttributionWithConversion(params: {
  attribution: UtmAttribution | null;
  analyticsConsentGranted: boolean;
}): UtmAttribution | null {
  if (!params.analyticsConsentGranted || !params.attribution) {
    return null;
  }
  return params.attribution;
}

/**
 * 16 & 20. Form Validation & Support Ticket Sanitization
 */
export function validateSupportTicketInput(input: {
  requesterName: string;
  requesterEmail: string;
  subject: string;
  message: string;
  honeypot?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (input.honeypot && input.honeypot.trim() !== '') {
    errors.form = 'Automated spam submission rejected.';
    return { valid: false, errors };
  }
  if (!input.requesterName || input.requesterName.trim().length < 2) {
    errors.requesterName = 'Please enter your name (at least 2 characters).';
  }
  if (
    !input.requesterEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.requesterEmail.trim())
  ) {
    errors.requesterEmail = 'Please enter a valid contact email address.';
  }
  if (!input.subject || input.subject.trim().length < 4) {
    errors.subject = 'Subject must be at least 4 characters long.';
  }
  if (!input.message || input.message.trim().length < 10) {
    errors.message = 'Please describe your issue or question (at least 10 characters).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * 17. Confirmation Dialog Consequence Evaluation
 */
export function requiresStockAdjustmentConfirmation(params: {
  movementType: 'waste' | 'stocktake' | 'correction';
  quantityDelta: number;
  unitCostMinor: number;
}): { required: boolean; reason: string } {
  const absDelta = Math.abs(params.quantityDelta);
  const financialImpactMinor = Math.round(absDelta * params.unitCostMinor);

  if (params.movementType === 'waste' && absDelta > 0) {
    return {
      required: true,
      reason: `Recording ${absDelta} unit(s) of waste permanently deducts usable inventory and appends an immutable ledger entry.`,
    };
  }
  if (absDelta >= 5 || financialImpactMinor >= 20000) {
    return {
      required: true,
      reason: `This adjustment modifies stock by ${params.quantityDelta} units and writes an irreversible audit movement.`,
    };
  }
  return { required: false, reason: '' };
}

/**
 * 18. Accurate Last-Updated Timestamp Formatting
 */
export function formatPersistedTimestamp(
  isoTimestamp: string | null | undefined,
  timezone: string = 'Africa/Casablanca'
): { formatted: string; valid: boolean } {
  if (!isoTimestamp || typeof isoTimestamp !== 'string' || isoTimestamp.trim() === '') {
    return { formatted: 'No recorded update timestamp', valid: false };
  }
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return { formatted: 'No recorded update timestamp', valid: false };
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    });
    return { formatted: formatter.format(parsed), valid: true };
  } catch {
    return {
      formatted: parsed.toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
      valid: true,
    };
  }
}

/**
 * 19. Accessible FAQs & Structured Data
 */
export const DEFAULT_PLATFORM_FAQS: FaqItem[] = [
  {
    id: 'faq_purchase_vs_stock',
    category: 'operations',
    question: 'Does creating a Purchase Order immediately increase my ingredient stock balance?',
    answer:
      'No. TablePulse OS strictly separates purchasing commitments from physical inventory. Creating a Draft or Ordered Purchase Order records your financial commitment, supplier reference, and expected quantity. Stock balances and weighted-average unit costs only update when an authorized team member clicks "Receive Delivery" after verifying the physical delivery.',
    lastUpdated: '2026-10-21T08:00:00.000Z',
  },
  {
    id: 'faq_billing_morocco_rizon',
    category: 'billing',
    question: 'How do recurring subscriptions and Rizon payouts work for Morocco-based restaurants?',
    answer:
      'TablePulse OS integrates with Lemon Squeezy as our global Merchant of Record, which supports Morocco-based businesses and handles international VAT compliance. Because payment processors settle merchant payouts via bank rails rather than direct Visa card numbers, Lemon Squeezy settles net subscription revenue to your Rizon USD (US ACH) or EUR (SEPA) virtual receiving bank account, or your Moroccan bank IBAN, making funds spendable on your Rizon Visa card.',
    lastUpdated: '2026-10-21T08:00:00.000Z',
  },
  {
    id: 'faq_downgrade_data_safety',
    category: 'billing',
    question: 'What happens to my restaurant records if my subscription expires or I downgrade to Free?',
    answer:
      'Your historical data is never deleted when a subscription expires or downgrades. Workspaces automatically revert to Free tier creation quotas (1 branch, up to 3 staff members, 25 tracked ingredients, and 15 monthly AI queries) while preserving read and export access to your existing ledgers.',
    lastUpdated: '2026-10-21T08:00:00.000Z',
  },
  {
    id: 'faq_tenant_isolation',
    category: 'security',
    question: 'Can another restaurant or public visitor search my customers, recipes, or financial records?',
    answer:
      'Never. Every operational document is scoped under /organizations/{orgId} and protected by Zero-Trust Firestore Master Gate security rules (isOrgMember(orgId)). Public search only queries published marketing pages and FAQs, while authenticated search strictly filters by your active organization ID and staff role.',
    lastUpdated: '2026-10-21T08:00:00.000Z',
  },
  {
    id: 'faq_ai_grounding',
    category: 'product',
    question: 'Does the AI Operations Assistant automatically modify stock or post public review replies?',
    answer:
      'No. The AI Operations Assistant is grounded strictly in your organization’s verified ledger metrics and never executes silent mutations. Any suggested task, draft purchase order, or customer review reply requires explicit human review and confirmation before saving.',
    lastUpdated: '2026-10-21T08:00:00.000Z',
  },
  {
    id: 'faq_custom_website_service',
    category: 'product',
    question: 'What is the difference between the Self-Service Website Builder and the Custom Website Service?',
    answer:
      'All plans include the self-service restaurant website builder for publishing your menu, opening hours, and reservation details. The Business and Ultra plans additionally include 1 bespoke Custom Website Service build, where you submit your brand brief and track the build status from Requested -> In Review -> Quoted -> In Production -> Delivered.',
    lastUpdated: '2026-10-21T08:00:00.000Z',
  },
];

export function filterFaqItems(
  faqs: FaqItem[],
  query: string,
  category: 'all' | FaqItem['category'] = 'all'
): FaqItem[] {
  const q = query.trim().toLowerCase();
  return faqs.filter((item) => {
    const matchesCategory = category === 'all' || item.category === category;
    const matchesQuery =
      !q ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });
}

export function buildFaqStructuredDataJsonLd(faqs: FaqItem[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
  return JSON.stringify(schema);
}
