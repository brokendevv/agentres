import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveInitialTheme,
  toggleThemeValue,
  isAnnouncementVisible,
  validateAnnouncementInput,
  executePublicSearch,
  executeAuthenticatedTenantSearch,
  shouldShowBackToTop,
  calculateScrollProgress,
  getAuthorizedNavigationItems,
  validateCopyPayload,
  parseAndSanitizeUtmParams,
  canAssociateAttributionWithConversion,
  validateSupportTicketInput,
  requiresStockAdjustmentConfirmation,
  formatPersistedTimestamp,
  filterFaqItems,
  buildFaqStructuredDataJsonLd,
  DEFAULT_PLATFORM_FAQS,
  AnnouncementItem,
} from './enhancements';
import { buildInitialRestaurantDataset } from './seedData';

test('1. Light/dark theme resolution and persistence toggle', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(undefined, false), 'light');
  assert.equal(toggleThemeValue('light'), 'dark');
  assert.equal(toggleThemeValue('dark'), 'light');
});

test('2. Announcement creation validation, visibility, expiry, and dismissal', () => {
  const validCheck = validateAnnouncementInput({
    title: 'Scheduled Ledger Maintenance',
    message: 'Maintenance window Sunday 03:00 UTC.',
    ctaHref: '#compliance',
  });
  assert.equal(validCheck.valid, true);

  const invalidCheck = validateAnnouncementInput({
    title: 'Hi',
    message: 'Short',
    ctaHref: 'javascript:alert(1)',
  });
  assert.equal(invalidCheck.valid, false);
  assert.ok(invalidCheck.errors.title);
  assert.ok(invalidCheck.errors.ctaHref);

  const sampleAnnouncement: AnnouncementItem = {
    id: 'ann_1',
    orgId: 'org_dar_zitouna_ma',
    title: 'New Receipt OCR Engine',
    message: 'Side-by-side invoice arithmetic verification is live.',
    severity: 'feature',
    scope: 'both',
    published: true,
    dismissible: true,
    expiresAt: '2026-12-31T23:59:59.000Z',
    createdBy: 'usr_owner',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
  };

  // Visible when published, not expired, not dismissed
  assert.equal(
    isAnnouncementVisible({
      announcement: sampleAnnouncement,
      currentView: 'public',
      nowIso: '2026-10-21T10:00:00.000Z',
      dismissedRecords: [],
    }),
    true
  );

  // Hidden after expiry
  assert.equal(
    isAnnouncementVisible({
      announcement: sampleAnnouncement,
      currentView: 'public',
      nowIso: '2027-01-02T00:00:00.000Z',
      dismissedRecords: [],
    }),
    false
  );

  // Hidden when dismissed for the same version
  assert.equal(
    isAnnouncementVisible({
      announcement: sampleAnnouncement,
      currentView: 'dashboard',
      nowIso: '2026-10-21T10:00:00.000Z',
      dismissedRecords: [
        { announcementId: 'ann_1', dismissedAtVersion: '2026-10-21T08:00:00.000Z' },
      ],
    }),
    false
  );
});

test('3. Global search filtering and strict cross-tenant isolation', () => {
  const publicResults = executePublicSearch('Merchant of Record', DEFAULT_PLATFORM_FAQS);
  assert.ok(publicResults.length >= 1);
  assert.ok(publicResults.every((r) => r.category === 'pricing' || r.category === 'faq' || r.category === 'public_page'));

  const tenantA = buildInitialRestaurantDataset(
    'org_tenant_a',
    'usr_a',
    'owner@tenanta.ma',
    'Owner A'
  );
  const tenantB = buildInitialRestaurantDataset(
    'org_tenant_b',
    'usr_b',
    'owner@tenantb.ma',
    'Owner B'
  );
  // Inject a secret ingredient into Tenant B
  tenantB.ingredients[0].name = 'Secret Truffle Caviar Reserve';

  const combinedIngredients = [...tenantA.ingredients, ...tenantB.ingredients];

  // Searching as Tenant A must NEVER return Tenant B's secret ingredient
  const searchAsTenantA = executeAuthenticatedTenantSearch({
    query: 'Secret Truffle Caviar',
    activeOrgId: 'org_tenant_a',
    actorRole: 'owner',
    ingredients: combinedIngredients,
    purchases: tenantA.purchases,
    suppliers: tenantA.suppliers,
    recipes: tenantA.recipes,
    customers: tenantA.customers,
    reservations: tenantA.reservations,
    orders: tenantA.orders,
    reviews: tenantA.reviews,
    meetings: tenantA.meetings,
    tasks: tenantA.tasks,
  });
  assert.equal(searchAsTenantA.length, 0);

  // Searching own ingredient in Tenant A works
  const ownSearch = executeAuthenticatedTenantSearch({
    query: 'Saffron',
    activeOrgId: 'org_tenant_a',
    actorRole: 'owner',
    ingredients: combinedIngredients,
    purchases: tenantA.purchases,
    suppliers: tenantA.suppliers,
    recipes: tenantA.recipes,
    customers: tenantA.customers,
    reservations: tenantA.reservations,
    orders: tenantA.orders,
    reviews: tenantA.reviews,
    meetings: tenantA.meetings,
    tasks: tenantA.tasks,
  });
  assert.ok(ownSearch.some((r) => r.category === 'ingredient' && r.title.includes('Saffron')));

  // Inventory-only role cannot search private customer PII
  const inventoryRoleCustomerSearch = executeAuthenticatedTenantSearch({
    query: tenantA.customers[0].name,
    activeOrgId: 'org_tenant_a',
    actorRole: 'inventory',
    ingredients: tenantA.ingredients,
    purchases: tenantA.purchases,
    suppliers: tenantA.suppliers,
    recipes: tenantA.recipes,
    customers: tenantA.customers,
    reservations: [],
    orders: [],
    reviews: [],
    meetings: [],
    tasks: [],
  });
  assert.equal(inventoryRoleCustomerSearch.length, 0);
});

test('4 & 8. Back-to-top threshold and scroll progress calculation', () => {
  // Short page should never show back-to-top
  assert.equal(
    shouldShowBackToTop({ scrollY: 100, viewportHeight: 900, documentHeight: 1100, threshold: 360 }),
    false
  );
  // Long page scrolled past threshold shows back-to-top
  assert.equal(
    shouldShowBackToTop({ scrollY: 450, viewportHeight: 900, documentHeight: 2800, threshold: 360 }),
    true
  );

  // Scroll progress on short page is hidden
  const shortProgress = calculateScrollProgress({
    scrollTop: 50,
    scrollHeight: 950,
    clientHeight: 900,
  });
  assert.equal(shortProgress.visible, false);

  // Scroll progress halfway down long page is 50%
  const halfProgress = calculateScrollProgress({
    scrollTop: 500,
    scrollHeight: 1900,
    clientHeight: 900,
  });
  assert.equal(halfProgress.visible, true);
  assert.equal(halfProgress.percentage, 50);
});

test('5. Role-based navigation permissions', () => {
  const ownerNav = getAuthorizedNavigationItems('owner');
  assert.equal(ownerNav.length, 5);

  const staffNav = getAuthorizedNavigationItems('staff');
  assert.equal(staffNav.some((n) => n.id === 'intelligence_governance'), false);
  assert.equal(staffNav.some((n) => n.id === 'inventory_purchasing'), false);
  assert.equal(staffNav.some((n) => n.id === 'team_operations'), true);
});

test('9. Clipboard validation blocks sensitive secrets and allows safe references', () => {
  const blockedKey = validateCopyPayload('LEMON_SQUEEZY_API_KEY=secret_12345');
  assert.equal(blockedKey.allowed, false);

  const blockedBearer = validateCopyPayload('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longtoken');
  assert.equal(blockedBearer.allowed, false);

  const allowedInvoice = validateCopyPayload('INV-AM-2026-089');
  assert.equal(allowedInvoice.allowed, true);
  assert.equal(allowedInvoice.sanitizedText, 'INV-AM-2026-089');
});

test('14. UTM campaign tracking sanitization and consent enforcement', () => {
  const parsed = parseAndSanitizeUtmParams(
    '?utm_source=instagram_ma&utm_medium=cpc&utm_campaign=ramadan_2026<script>&plan=ultra&paid=true',
    '2026-10-21T08:30:00.000Z'
  );
  assert.ok(parsed);
  assert.equal(parsed?.utm_source, 'instagram_ma');
  assert.equal(parsed?.utm_campaign, 'ramadan_2026');
  assert.equal((parsed as any).plan, undefined);
  assert.equal((parsed as any).paid, undefined);

  // Without consent, attribution is NOT associated with conversion
  assert.equal(
    canAssociateAttributionWithConversion({
      attribution: parsed,
      analyticsConsentGranted: false,
    }),
    null
  );

  // With consent, attribution is preserved
  const associated = canAssociateAttributionWithConversion({
    attribution: parsed,
    analyticsConsentGranted: true,
  });
  assert.equal(associated?.utm_source, 'instagram_ma');
});

test('16, 17 & 20. Support form validation, spam honeypot, and stock confirmation threshold', () => {
  const spamAttempt = validateSupportTicketInput({
    requesterName: 'Bot',
    requesterEmail: 'bot@example.com',
    subject: 'Spam',
    message: 'Spam message body here',
    honeypot: 'filled-by-bot',
  });
  assert.equal(spamAttempt.valid, false);

  const validTicket = validateSupportTicketInput({
    requesterName: 'Yasser Rajeb',
    requesterEmail: 'yasserrajeb@gmail.com',
    subject: 'Custom domain DNS TXT check',
    message: 'Please verify our CNAME and TXT records for darzitouna.ma.',
  });
  assert.equal(validTicket.valid, true);

  const wasteCheck = requiresStockAdjustmentConfirmation({
    movementType: 'waste',
    quantityDelta: -2,
    unitCostMinor: 1500,
  });
  assert.equal(wasteCheck.required, true);

  const minorCountCheck = requiresStockAdjustmentConfirmation({
    movementType: 'stocktake',
    quantityDelta: -0.5,
    unitCostMinor: 950,
  });
  assert.equal(minorCountCheck.required, false);
});

test('18 & 19. Accurate persisted timestamps and FAQ filtering + JSON-LD', () => {
  const missingTs = formatPersistedTimestamp('');
  assert.equal(missingTs.valid, false);

  const validTs = formatPersistedTimestamp('2026-10-21T08:00:00.000Z', 'Africa/Casablanca');
  assert.equal(validTs.valid, true);
  assert.ok(validTs.formatted.includes('2026'));

  const billingFaqs = filterFaqItems(DEFAULT_PLATFORM_FAQS, 'Rizon', 'billing');
  assert.equal(billingFaqs.length, 1);
  assert.equal(billingFaqs[0].id, 'faq_billing_morocco_rizon');

  const jsonLd = buildFaqStructuredDataJsonLd(DEFAULT_PLATFORM_FAQS);
  const parsedLd = JSON.parse(jsonLd);
  assert.equal(parsedLd['@type'], 'FAQPage');
  assert.equal(parsedLd.mainEntity.length, DEFAULT_PLATFORM_FAQS.length);
});
