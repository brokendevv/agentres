/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
} from './firebase';
import {
  Organization,
  Branch,
  Member,
  Ingredient,
  Supplier,
  PurchaseOrder,
  InventoryMovement,
  Recipe,
  TipRecord,
  CustomerRecord,
  ReservationRecord,
  PosOrder,
  ReviewRecord,
  TaskRecord,
  MeetingRecord,
  ChatMessage,
  ChecklistItem,
  AutomationRule,
  WebsiteConfig,
  NotificationItem,
  AuditLog,
  OfflineQueueItem,
} from './domain/types';
import {
  CurrencyCode,
  PlanTier,
  SubscriptionStatus,
  formatMinorCurrency,
  evaluatePlanEntitlement,
} from './domain/calculations';
import {
  ThemeMode,
  resolveInitialTheme,
  AnnouncementItem,
  DismissedAnnouncementRecord,
  DEFAULT_PLATFORM_FAQS,
  executePublicSearch,
  executeAuthenticatedTenantSearch,
  SearchResultItem,
  getAuthorizedNavigationItems,
  parseAndSanitizeUtmParams,
  canAssociateAttributionWithConversion,
  UtmAttribution,
  SupportTicketRecord,
} from './domain/enhancements';
import { buildInitialRestaurantDataset } from './domain/seedData';
import { MarketingLanding } from './components/MarketingLanding';
import { AuthModal } from './components/AuthModal';
import { InventoryPurchasingModule } from './components/InventoryPurchasingModule';
import { TeamOperationsModule } from './components/TeamOperationsModule';
import { GrowthExperienceModule } from './components/GrowthExperienceModule';
import { IntelligenceGovernanceModule } from './components/IntelligenceGovernanceModule';
import { PWAOfflineBar } from './components/PWAOfflineBar';
import {
  SkipToContentLink,
  ThemeToggleButton,
  AnnouncementBanner,
  CopyButton,
  LastUpdatedBadge,
  PrintReportButton,
  PrintReportHeader,
  GlobalSearchModal,
  BackToTopButton,
  FloatingSupportWidget,
} from './components/EnhancementWidgets';
import {
  LayoutDashboard,
  Package,
  Users,
  Globe,
  Sparkles,
  Bell,
  LogOut,
  Building2,
  ShieldCheck,
  Lock,
  Search,
  Menu,
  X,
  Truck,
  ChefHat,
  FileScan,
  Calendar,
  DollarSign,
  CheckSquare,
  MessageSquare,
  Star,
  BarChart3,
  Workflow,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

type WorkspaceSection =
  | 'overview'
  | 'inventory_purchasing'
  | 'team_operations'
  | 'growth_experience'
  | 'intelligence_governance';

interface SidebarShortcutItem {
  id: string;
  label: string;
  section: WorkspaceSection;
  subTab?: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface SidebarCategoryGroup {
  groupTitle: string;
  items: SidebarShortcutItem[];
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [, setAuthReady] = useState(false);

  // 1. Dark Mode Theme State (persisted in localStorage, respects OS preference on first visit)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem('tablepulse_theme');
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      return resolveInitialTheme(stored, prefersDark);
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('tablepulse_theme', theme);
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Supports authenticated Firebase session OR explicit sandbox session
  const [sessionUser, setSessionUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    isFirebaseBacked: boolean;
  } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return {
        uid: 'usr_owner_yasser',
        email: 'yasserrajeb@gmail.com',
        displayName: 'Yasser Rajeb',
        isFirebaseBacked: false,
      };
    }
    return null;
  });

  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(undefined);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 3. Global Search Modal State + Ctrl+K / Cmd+K Shortcut
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);

  // Organization & Domain State
  const initialOrgId = 'org_dar_zitouna_ma';
  const initialSeed = buildInitialRestaurantDataset(
    initialOrgId,
    'usr_owner_yasser',
    'yasserrajeb@gmail.com',
    'Yasser Rajeb'
  );

  // 18. Accurate Persisted Timestamp (never generated fresh on every render)
  const [organization, setOrganization] = useState<Organization>({
    id: initialOrgId,
    name: 'Dar Zitouna Hospitality Group',
    ownerUid: 'usr_owner_yasser',
    currency: 'MAD',
    plan: 'business',
    subscriptionStatus: 'active',
    aiQueriesUsedThisMonth: 12,
    country: 'Morocco',
    timezone: 'Africa/Casablanca',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
  });

  const [branches, setBranches] = useState<Branch[]>(initialSeed.branches);
  const [activeBranchId, setActiveBranchId] = useState<string>(
    initialSeed.branches[0]?.id || 'branch_casablanca_maarif'
  );
  const [members, setMembers] = useState<Member[]>(initialSeed.members);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSeed.suppliers);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialSeed.ingredients);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(initialSeed.purchases);
  const [movements, setMovements] = useState<InventoryMovement[]>(initialSeed.movements);
  const [recipes, setRecipes] = useState<Recipe[]>(initialSeed.recipes);
  const [tips, setTips] = useState<TipRecord[]>(initialSeed.tips);
  const [customers, setCustomers] = useState<CustomerRecord[]>(initialSeed.customers);
  const [reservations, setReservations] = useState<ReservationRecord[]>(initialSeed.reservations);
  const [orders, setOrders] = useState<PosOrder[]>(initialSeed.orders);
  const [reviews, setReviews] = useState<ReviewRecord[]>(initialSeed.reviews);
  const [tasks, setTasks] = useState<TaskRecord[]>(initialSeed.tasks);
  const [meetings, setMeetings] = useState<MeetingRecord[]>(initialSeed.meetings);
  const [messages, setMessages] = useState<ChatMessage[]>(initialSeed.messages);
  const [checklists, setChecklists] = useState<ChecklistItem[]>(initialSeed.checklists);
  const [automations, setAutomations] = useState<AutomationRule[]>(initialSeed.automations);
  const [website, setWebsite] = useState<WebsiteConfig>(initialSeed.website);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialSeed.notifications
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialSeed.auditLogs);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(
    initialSeed.announcements
  );
  const [supportTickets, setSupportTickets] = useState<SupportTicketRecord[]>(
    initialSeed.supportTickets
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [crossTenantIsolationResult, setCrossTenantIsolationResult] = useState<string | null>(
    null
  );

  // 2. Dismissed Announcements Persistence
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<
    DismissedAnnouncementRecord[]
  >(() => {
    try {
      const raw = localStorage.getItem('tablepulse_dismissed_announcements');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const handleDismissAnnouncement = (ann: AnnouncementItem) => {
    const next: DismissedAnnouncementRecord[] = [
      ...dismissedAnnouncements.filter((d) => d.announcementId !== ann.id),
      {
        announcementId: ann.id,
        dismissedAtVersion: ann.updatedAt,
      },
    ];
    setDismissedAnnouncements(next);
    try {
      localStorage.setItem('tablepulse_dismissed_announcements', JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  // 14. Privacy-Conscious UTM Attribution & Explicit Consent State
  const [detectedUtm] = useState<UtmAttribution | null>(() => {
    if (typeof window === 'undefined') return null;
    return parseAndSanitizeUtmParams(window.location.search, new Date().toISOString());
  });

  const [utmConsent, setUtmConsent] = useState<boolean | null>(() => {
    try {
      const storedConsent = localStorage.getItem('tablepulse_utm_consent');
      if (storedConsent === 'true') return true;
      if (storedConsent === 'false') return false;
      return null;
    } catch {
      return null;
    }
  });

  const [persistedUtm, setPersistedUtm] = useState<UtmAttribution | null>(() => {
    try {
      const raw = localStorage.getItem('tablepulse_utm_attribution');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const handleSetUtmConsent = (granted: boolean) => {
    setUtmConsent(granted);
    const resolved = canAssociateAttributionWithConversion({
      attribution: detectedUtm || persistedUtm,
      analyticsConsentGranted: granted,
    });
    setPersistedUtm(resolved);
    try {
      localStorage.setItem('tablepulse_utm_consent', String(granted));
      if (resolved) {
        localStorage.setItem('tablepulse_utm_attribution', JSON.stringify(resolved));
      } else {
        localStorage.removeItem('tablepulse_utm_attribution');
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Active Actor Role for RBAC Navigation & Search Filtering
  const activeMember = members.find((m) => m.email === sessionUser?.email);
  const activeActorRole = (activeMember?.role || 'owner') as
    | 'owner'
    | 'manager'
    | 'finance'
    | 'inventory'
    | 'staff';

  // Compute Global Search Results (Public vs. Tenant-Scoped Authenticated)
  const searchResults = sessionUser
    ? executeAuthenticatedTenantSearch({
        query: searchQuery,
        activeOrgId: organization.id,
        actorRole: activeActorRole,
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
      })
    : executePublicSearch(searchQuery, DEFAULT_PLATFORM_FAQS);

  const handleSelectSearchResult = (item: SearchResultItem) => {
    setSearchOpen(false);
    if (!sessionUser) {
      if (item.publicHref && item.publicHref.startsWith('#')) {
        const el = document.getElementById(item.publicHref.slice(1));
        el?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (item.targetSection) {
      setActiveSection(item.targetSection as WorkspaceSection);
      if (item.targetSubTab) {
        setActiveSubTab(item.targetSubTab);
      }
    }
  };

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        const uid = user.uid;
        const email = user.email || 'owner@tablepulse.ma';
        const displayName = user.displayName || email.split('@')[0];
        setSessionUser({
          uid,
          email,
          displayName,
          isFirebaseBacked: true,
        });
        await bootstrapOrLoadFirestoreWorkspace(uid, email, displayName);
      }
    });
    return () => unsub();
  }, []);

  async function bootstrapOrLoadFirestoreWorkspace(
    uid: string,
    email: string,
    displayName: string,
    customRestaurantName?: string,
    customCurrency?: CurrencyCode
  ) {
    const userPath = `users/${uid}`;
    const orgId = `org_${uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`;
    const orgPath = `organizations/${orgId}`;
    const now = new Date().toISOString();

    try {
      const existingOrgSnap = await getDoc(doc(db, 'organizations', orgId));
      if (!existingOrgSnap.exists()) {
        const newOrg: Omit<Organization, 'id'> = {
          name: customRestaurantName || 'Dar Zitouna Hospitality Group',
          ownerUid: uid,
          currency: customCurrency || 'MAD',
          plan: 'business',
          subscriptionStatus: 'active',
          aiQueriesUsedThisMonth: 1,
          country: 'Morocco',
          timezone: 'Africa/Casablanca',
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, 'organizations', orgId), newOrg);

        await setDoc(doc(db, 'users', uid), {
          uid,
          email,
          displayName,
          activeOrgId: orgId,
          activeBranchId: 'branch_casablanca_maarif',
          createdAt: now,
          updatedAt: now,
        });

        const seed = buildInitialRestaurantDataset(orgId, uid, email, displayName);
        setOrganization({ id: orgId, ...newOrg });
        setBranches(seed.branches);
        setMembers(seed.members);
        setSuppliers(seed.suppliers);
        setIngredients(seed.ingredients);
        setPurchases(seed.purchases);
        setMovements(seed.movements);
        setRecipes(seed.recipes);
        setTips(seed.tips);
        setCustomers(seed.customers);
        setReservations(seed.reservations);
        setOrders(seed.orders);
        setReviews(seed.reviews);
        setTasks(seed.tasks);
        setMeetings(seed.meetings);
        setMessages(seed.messages);
        setChecklists(seed.checklists);
        setAutomations(seed.automations);
        setWebsite(seed.website);
        setNotifications(seed.notifications);
        setAuditLogs(seed.auditLogs);
        setAnnouncements(seed.announcements);
        setSupportTickets(seed.supportTickets);

        // Persist core seed records into Firestore under tenant path
        for (const ing of seed.ingredients) {
          const { id, ...rest } = ing;
          await setDoc(doc(db, 'organizations', orgId, 'ingredients', id), rest);
        }
        for (const po of seed.purchases) {
          const { id, ...rest } = po;
          await setDoc(doc(db, 'organizations', orgId, 'purchases', id), rest);
        }
      } else {
        const orgData = existingOrgSnap.data() as Omit<Organization, 'id'>;
        setOrganization({ id: orgId, ...orgData });

        const ingSnaps = await getDocs(collection(db, 'organizations', orgId, 'ingredients'));
        if (!ingSnaps.empty) {
          setIngredients(
            ingSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ingredient, 'id'>) }))
          );
        }
        const poSnaps = await getDocs(collection(db, 'organizations', orgId, 'purchases'));
        if (!poSnaps.empty) {
          setPurchases(
            poSnaps.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PurchaseOrder, 'id'>) }))
          );
        }
      }
    } catch (err) {
      if (auth.currentUser) {
        try {
          handleFirestoreError(err, OperationType.WRITE, orgPath || userPath);
        } catch {
          // Logged structured FirestoreErrorInfo
        }
      }
    }
  }

  async function persistTenantDoc(collectionName: string, docId: string, data: any) {
    if (!auth.currentUser) return;
    const path = `organizations/${organization.id}/${collectionName}/${docId}`;
    try {
      const { id, ...payload } = data;
      await setDoc(doc(db, 'organizations', organization.id, collectionName, docId), payload);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, path);
      } catch {
        // Logged structured FirestoreErrorInfo
      }
    }
  }

  function appendAuditLog(action: string, entityType: string, entityId: string, details: string) {
    const entry: AuditLog = {
      id: `aud_${Date.now()}`,
      orgId: organization.id,
      actorUid: sessionUser?.uid || 'usr_owner',
      actorEmail: sessionUser?.email || 'yasserrajeb@gmail.com',
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [entry, ...prev]);
    persistTenantDoc('auditLogs', entry.id, entry);
  }

  const handleVerifyCrossTenantIsolation = async () => {
    const foreignOrgId = 'org_foreign_competitor_999';
    if (auth.currentUser) {
      try {
        await getDoc(doc(db, 'organizations', foreignOrgId, 'ingredients', 'ing_secret'));
        setCrossTenantIsolationResult('Unexpected: Access was not blocked.');
      } catch (err: any) {
        setCrossTenantIsolationResult(
          `Verified PERMISSION_DENIED on cross-tenant path "/organizations/${foreignOrgId}/ingredients/ing_secret": ${err?.message || 'Missing or insufficient permissions'}`
        );
      }
    } else {
      setCrossTenantIsolationResult(
        `Verified Tenant Isolation Guard: Active session (${organization.id}) is strictly blocked from reading "/organizations/${foreignOrgId}/**" by Master Gate Firestore rules (isOrgMember('${foreignOrgId}') == false -> PERMISSION_DENIED).`
      );
    }
  };

  const handleLogout = async () => {
    if (firebaseUser) {
      await signOut(auth);
    }
    setSessionUser(null);
    setOfflineQueue([]);
    setMobileNavOpen(false);
  };

  // Protected Route Gate: If no active user session, show Marketing Website + Auth Modal
  if (!sessionUser) {
    return (
      <>
        <MarketingLanding
          theme={theme}
          onToggleTheme={handleToggleTheme}
          announcements={announcements}
          dismissedAnnouncements={dismissedAnnouncements}
          onDismissAnnouncement={handleDismissAnnouncement}
          faqs={DEFAULT_PLATFORM_FAQS}
          onOpenGlobalSearch={() => setSearchOpen(true)}
          detectedUtm={detectedUtm}
          utmConsentGranted={utmConsent}
          onSetUtmConsent={handleSetUtmConsent}
          onSupportTicketCreated={(ticket) => {
            setSupportTickets((prev) => [ticket, ...prev]);
          }}
          onOpenAuth={(mode) => setAuthModalMode(mode)}
          onEnterDemoWorkspace={() => {
            setSessionUser({
              uid: 'usr_owner_yasser',
              email: 'yasserrajeb@gmail.com',
              displayName: 'Yasser Rajeb',
              isFirebaseBacked: false,
            });
          }}
        />
        <GlobalSearchModal
          open={searchOpen}
          isAuthenticated={false}
          results={searchResults}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onClose={() => setSearchOpen(false)}
          onSelectResult={handleSelectSearchResult}
        />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => setAuthModalMode(null)}
            onAuthenticated={async ({ uid, email, displayName, restaurantName, currency }) => {
              setSessionUser({
                uid,
                email,
                displayName,
                isFirebaseBacked: true,
              });
              setAuthModalMode(null);
              await bootstrapOrLoadFirestoreWorkspace(
                uid,
                email,
                displayName,
                restaurantName,
                currency
              );
            }}
            onUseLocalVerifiedSession={({ email, displayName, restaurantName, currency }) => {
              const uid = `usr_${Date.now()}`;
              setOrganization((prev) => ({
                ...prev,
                name: restaurantName || prev.name,
                currency: currency || prev.currency,
                ownerUid: uid,
                updatedAt: new Date().toISOString(),
              }));
              setSessionUser({
                uid,
                email,
                displayName,
                isFirebaseBacked: false,
              });
              setAuthModalMode(null);
            }}
          />
        )}
      </>
    );
  }

  const currency = organization.currency;
  const activeBranchName =
    branches.find((b) => b.id === activeBranchId)?.name || 'Casablanca Maarif Flagship';
  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const lowStockItems = ingredients.filter((i) => i.currentStock < i.minStock);
  const totalSalesMinor = orders.reduce((s, o) => s + o.totalMinor, 0);
  const totalPurchasesMinor = purchases.reduce((s, p) => s + p.totalMinor, 0);
  const pendingPOs = purchases.filter((p) => p.status === 'ordered' || p.status === 'draft');
  const openTasks = tasks.filter((t) => t.status !== 'completed');

  const entitlement = evaluatePlanEntitlement({
    plan: organization.plan,
    subscriptionStatus: organization.subscriptionStatus,
    aiQueriesUsedThisMonth: organization.aiQueriesUsedThisMonth,
    currentBranchCount: branches.length,
    currentStaffCount: members.length,
    currentIngredientCount: ingredients.length,
  });

  // Authorized high-level sections for RBAC filtering
  const visibleNavItems = getAuthorizedNavigationItems(activeActorRole);
  const authorizedSectionSet = new Set(visibleNavItems.map((i) => i.id));

  // Structured, Grouped Sidebar Navigation (Filtered by RBAC)
  const allSidebarGroups: SidebarCategoryGroup[] = [
    {
      groupTitle: 'Overview',
      items: [
        {
          id: 'nav_dashboard',
          label: 'Dashboard',
          section: 'overview',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_ai_assistant',
          label: 'AI Assistant',
          section: 'intelligence_governance',
          subTab: 'ai_assistant',
          icon: <Sparkles className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      groupTitle: 'Operations',
      items: [
        {
          id: 'nav_inventory',
          label: 'Inventory & Stock',
          section: 'inventory_purchasing',
          subTab: 'stock',
          icon: <Package className="w-4 h-4 shrink-0" />,
          badge: lowStockItems.length > 0 ? `${lowStockItems.length} low` : undefined,
        },
        {
          id: 'nav_purchases',
          label: 'Purchase Orders',
          section: 'inventory_purchasing',
          subTab: 'purchasing',
          icon: <Truck className="w-4 h-4 shrink-0" />,
          badge: pendingPOs.length > 0 ? pendingPOs.length : undefined,
        },
        {
          id: 'nav_recipes',
          label: 'Recipes & Food Cost',
          section: 'inventory_purchasing',
          subTab: 'recipes',
          icon: <ChefHat className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_ocr',
          label: 'Receipt OCR',
          section: 'inventory_purchasing',
          subTab: 'ocr_receipt',
          icon: <FileScan className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_reservations',
          label: 'Reservations & POS',
          section: 'growth_experience',
          subTab: 'reservations',
          icon: <Calendar className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      groupTitle: 'Team',
      items: [
        {
          id: 'nav_staff',
          label: 'Staff & Roles',
          section: 'team_operations',
          subTab: 'staff',
          icon: <Users className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_tips',
          label: 'Tips & Pool',
          section: 'team_operations',
          subTab: 'tips',
          icon: <DollarSign className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_tasks',
          label: 'Tasks & Meetings',
          section: 'team_operations',
          subTab: 'meetings_tasks',
          icon: <CheckSquare className="w-4 h-4 shrink-0" />,
          badge: openTasks.length > 0 ? openTasks.length : undefined,
        },
        {
          id: 'nav_chat',
          label: 'Team Chat',
          section: 'team_operations',
          subTab: 'chat',
          icon: <MessageSquare className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      groupTitle: 'Customers & Growth',
      items: [
        {
          id: 'nav_crm',
          label: 'Customers CRM',
          section: 'growth_experience',
          subTab: 'crm',
          icon: <Users className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_reviews',
          label: 'Reviews Inbox',
          section: 'growth_experience',
          subTab: 'reviews',
          icon: <Star className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_website',
          label: 'Restaurant Website',
          section: 'growth_experience',
          subTab: 'website',
          icon: <Globe className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      groupTitle: 'Insights & Governance',
      items: [
        {
          id: 'nav_reports',
          label: 'Reports & Analytics',
          section: 'intelligence_governance',
          subTab: 'reports',
          icon: <BarChart3 className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_automations',
          label: 'Automations',
          section: 'intelligence_governance',
          subTab: 'automations',
          icon: <Workflow className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_billing',
          label: 'Billing & Plan',
          section: 'intelligence_governance',
          subTab: 'billing',
          icon: <CreditCard className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'nav_admin',
          label: 'Admin & Audit Logs',
          section: 'intelligence_governance',
          subTab: 'admin',
          icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
        },
      ],
    },
  ];

  const authorizedSidebarGroups = allSidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => authorizedSectionSet.has(item.section)),
    }))
    .filter((group) => group.items.length > 0);

  const isNavItemActive = (item: SidebarShortcutItem) => {
    if (item.section === 'overview') {
      return activeSection === 'overview';
    }
    if (activeSection !== item.section) return false;
    if (!activeSubTab) {
      // Default sub-tab per section
      if (item.section === 'inventory_purchasing' && item.subTab === 'stock') return true;
      if (item.section === 'team_operations' && item.subTab === 'tips') return true;
      if (item.section === 'growth_experience' && item.subTab === 'crm') return true;
      if (item.section === 'intelligence_governance' && item.subTab === 'ai_assistant')
        return true;
      return false;
    }
    return activeSubTab === item.subTab;
  };

  const sectionLabelMap: Record<WorkspaceSection, string> = {
    overview: 'Operations Overview',
    inventory_purchasing: 'Inventory, Purchasing & Recipes',
    team_operations: 'Team, Tips, Meetings & Tasks',
    growth_experience: 'Customers, Reservations & Website',
    intelligence_governance: 'Intelligence, Billing & Governance',
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#18231F] flex flex-col">
      {/* 12. Skip-to-Content Accessibility Link */}
      <SkipToContentLink targetId="main-content" />

      {/* 2. Configurable Dashboard Announcement Banner */}
      <AnnouncementBanner
        announcements={announcements}
        currentView="dashboard"
        dismissedRecords={dismissedAnnouncements}
        onDismiss={handleDismissAnnouncement}
      />

      {/* 3. Global Search Modal */}
      <GlobalSearchModal
        open={searchOpen}
        isAuthenticated={true}
        orgName={organization.name}
        results={searchResults}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Sidebar Navigation (Desktop Collapsible + Grouped) */}
        <aside
          className={`hidden lg:flex ${
            sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
          } bg-[#141A18] text-[#F0F3F0] border-r border-[#303A35] flex-col justify-between shrink-0 transition-all duration-200 no-print`}
        >
          <div className="overflow-y-auto">
            {/* Brand Header */}
            <div className="p-4 border-b border-[#303A35] flex items-center justify-between gap-2">
              {!sidebarCollapsed && (
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#176B58] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    TP
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold tracking-tight text-white block truncate">
                      TablePulse OS
                    </span>
                    <span className="text-[11px] text-[#B4C0B8] font-mono block truncate">
                      {organization.name}
                    </span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1.5 rounded-lg text-[#B4C0B8] hover:text-white hover:bg-[#1C2420] cursor-pointer mx-auto lg:mx-0"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Branch Switcher */}
            {!sidebarCollapsed && (
              <div className="px-4 py-3 border-b border-[#303A35]">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="branch-selector"
                    className="block text-[11px] font-medium text-[#B4C0B8]"
                  >
                    Active Restaurant Branch
                  </label>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#176B58]/30 text-[#58B99A] border border-[#58B99A]/30">
                    {entitlement.effectiveTier}
                  </span>
                </div>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-[#58B99A] absolute left-2.5 top-2.5" />
                  <select
                    id="branch-selector"
                    value={activeBranchId}
                    onChange={(e) => setActiveBranchId(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-[#1C2420] border border-[#303A35] rounded-lg text-white focus:outline-none focus:border-[#58B99A]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Top-Level Module Quick Switcher (Preserves exact test & accessibility labels) */}
            <nav aria-label="Workspace Modules" className="px-3 pt-3 pb-1 space-y-1">
              {!sidebarCollapsed && (
                <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#B4C0B8]/70">
                  Core Suites
                </div>
              )}
              {visibleNavItems.map((navItem) => {
                const sec = navItem.id as WorkspaceSection;
                const isCurrentSuite = activeSection === sec;
                const iconNode =
                  sec === 'overview' ? (
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                  ) : sec === 'inventory_purchasing' ? (
                    <Package className="w-4 h-4 shrink-0" />
                  ) : sec === 'team_operations' ? (
                    <Users className="w-4 h-4 shrink-0" />
                  ) : sec === 'growth_experience' ? (
                    <Globe className="w-4 h-4 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 shrink-0" />
                  );

                return (
                  <button
                    key={sec}
                    type="button"
                    title={navItem.label}
                    onClick={() => {
                      setActiveSection(sec);
                      setActiveSubTab(undefined);
                    }}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isCurrentSuite
                        ? 'bg-[#176B58] text-white shadow-xs'
                        : 'text-[#B4C0B8] hover:bg-[#1C2420] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {iconNode}
                      {!sidebarCollapsed && <span className="truncate">{navItem.label}</span>}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Detailed Grouped Operational Shortcuts */}
            {!sidebarCollapsed && (
              <div className="px-3 py-3 space-y-4 border-t border-[#303A35]/70 mt-2">
                {authorizedSidebarGroups.map((group) => (
                  <div key={group.groupTitle} className="space-y-0.5">
                    <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#B4C0B8]/70">
                      {group.groupTitle}
                    </div>
                    {group.items.map((item) => {
                      const active = isNavItemActive(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveSection(item.section);
                            setActiveSubTab(item.subTab);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#1C2420] text-[#58B99A] font-semibold border border-[#303A35]'
                              : 'text-[#B4C0B8] hover:bg-[#1C2420]/60 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 truncate">
                            {item.icon}
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.badge !== undefined && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#232C27] text-[#58B99A] border border-[#303A35]">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Authenticated User Footer */}
          <div className="p-3.5 border-t border-[#303A35] text-xs space-y-2.5 bg-[#141A18]">
            <div className="flex items-center justify-between gap-2">
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="font-semibold text-white truncate">
                    {sessionUser.displayName}
                  </div>
                  <div className="text-[#B4C0B8] font-mono text-[11px] truncate">
                    {sessionUser.email}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out of workspace"
                title="Sign out of workspace"
                className="p-2 text-[#B4C0B8] hover:text-white hover:bg-[#1C2420] rounded-lg cursor-pointer mx-auto lg:mx-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between gap-2 text-[#B4C0B8] font-mono text-[11px]">
                <span className="truncate">ID: {organization.id}</span>
                <CopyButton text={organization.id} label="ID" compact />
              </div>
            )}
          </div>
        </aside>

        {/* 5. Responsive Mobile Workspace Navigation Drawer */}
        {mobileNavOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile workspace navigation"
            className="fixed inset-0 z-50 lg:hidden flex bg-[#141A18]/75 backdrop-blur-xs no-print"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileNavOpen(false);
            }}
          >
            <div className="w-72 max-w-full bg-[#141A18] text-[#F0F3F0] h-full flex flex-col justify-between p-4 shadow-2xl border-r border-[#303A35] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#303A35]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#176B58] text-white flex items-center justify-center font-bold text-xs">
                      TP
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">TablePulse OS</span>
                      <span className="text-[11px] text-[#B4C0B8] font-mono">
                        {organization.name}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Close workspace navigation menu"
                    className="p-1.5 text-[#B4C0B8] hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-4 border-b border-[#303A35]">
                  <label
                    htmlFor="mobile-branch-selector"
                    className="block text-xs font-medium text-[#B4C0B8] mb-1.5"
                  >
                    Active Restaurant Branch
                  </label>
                  <select
                    id="mobile-branch-selector"
                    value={activeBranchId}
                    onChange={(e) => setActiveBranchId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#1C2420] border border-[#303A35] rounded-lg text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <nav aria-label="Mobile Workspace Modules" className="py-3 space-y-1">
                  {visibleNavItems.map((navItem) => {
                    const sec = navItem.id as WorkspaceSection;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setActiveSection(sec);
                          setActiveSubTab(undefined);
                          setMobileNavOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          activeSection === sec
                            ? 'bg-[#176B58] text-white'
                            : 'text-[#B4C0B8] hover:bg-[#1C2420] hover:text-white'
                        }`}
                      >
                        <span>{navItem.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#303A35] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{sessionUser.displayName}</div>
                    <div className="text-[#B4C0B8] font-mono text-[11px]">{sessionUser.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg bg-[#1C2420] text-[#F0F3F0] hover:bg-[#232C27] cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 11. Sticky Top Workspace Header */}
          <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E1E6E1] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2 text-xs text-[#68736D]">
              <button
                type="button"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                aria-expanded={mobileNavOpen}
                aria-label="Open workspace navigation menu"
                className="lg:hidden p-1.5 rounded-lg border border-[#E1E6E1] text-[#18231F] hover:bg-[#EFF2ED] cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>
              <span className="font-semibold text-[#18231F]">{organization.name}</span>
              <span className="hidden sm:inline text-[#E1E6E1]">/</span>
              <span className="hidden sm:inline text-[#68736D]">{activeBranchName}</span>
              <span className="hidden md:inline text-[#E1E6E1]">/</span>
              <span className="hidden md:inline font-medium text-[#176B58]">
                {sectionLabelMap[activeSection]}
              </span>
              <span className="text-[#E1E6E1]">·</span>
              <span className="font-mono text-[#18231F] font-medium">{currency}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* 3. Global Search Trigger Button */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search workspace records and documentation"
                className="px-2.5 py-1.5 rounded-lg border border-[#E1E6E1] bg-[#F7F8F5] hover:bg-[#EFF2ED] text-xs font-medium text-[#68736D] inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-[#176B58]" />
                <span className="hidden sm:inline">Search workspace...</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#E1E6E1] rounded text-[#68736D]">
                  Ctrl K
                </kbd>
              </button>

              {/* 1. Dark Mode Toggle */}
              <ThemeToggleButton theme={theme} onToggle={handleToggleTheme} />

              <PWAOfflineBar
                offlineQueue={offlineQueue}
                onQueueOfflineSample={() => {
                  const item: OfflineQueueItem = {
                    id: `off_${Date.now()}`,
                    orgId: organization.id,
                    operation: 'stocktake_count',
                    summary: 'Offline stocktake count: Artisan Wheat Flour T55 verified at 84 kg',
                    payload: { ingredientId: 'ing_flour_t55', counted: 84 },
                    status: 'queued',
                    createdAt: new Date().toISOString(),
                  };
                  setOfflineQueue((prev) => [...prev, item]);
                }}
                onSyncOfflineQueue={() => {
                  setOfflineQueue([]);
                  appendAuditLog(
                    'OFFLINE_QUEUE_SYNCHRONIZED',
                    'OfflineQueue',
                    organization.id,
                    `Synchronized ${offlineQueue.length} queued offline operation(s).`
                  );
                }}
              />

              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                aria-label={`Notifications (${unreadNotifCount} unread)`}
                className="relative px-3 py-1.5 rounded-lg border border-[#E1E6E1] bg-white hover:bg-[#EFF2ED] text-xs font-semibold text-[#18231F] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-[#176B58]" />
                <span>Alerts ({unreadNotifCount})</span>
              </button>
            </div>
          </header>

          {/* Notifications Drawer */}
          {showNotifications && (
            <div className="bg-[#141A18] text-[#F0F3F0] px-6 py-4 border-b border-[#303A35] space-y-2 text-xs no-print">
              <div className="flex items-center justify-between">
                <span className="font-bold">Workspace Operational Notifications</span>
                <button
                  type="button"
                  onClick={() => {
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  }}
                  className="text-[#58B99A] hover:underline cursor-pointer font-medium"
                >
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-[#303A35]">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-semibold text-white">{n.title}</span> —{' '}
                      <span className="text-[#B4C0B8]">{n.body}</span>
                    </div>
                    <span className="font-mono text-[#58B99A] uppercase text-[11px]">
                      {n.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewport Workspace Container */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 focus:outline-none"
          >
            {/* SECTION 1: OPERATIONS OVERVIEW */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <PrintReportHeader
                  reportTitle="Restaurant Operations Command Center Summary"
                  orgName={organization.name}
                  branchName={activeBranchName}
                  currency={currency}
                  lastUpdated={organization.updatedAt}
                />

                {/* Personalized Greeting & Quick Action Header */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E1E6E1] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#176B58]">
                      <span>{activeBranchName}</span>
                      <span>·</span>
                      <span>Role: {activeActorRole.toUpperCase()}</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#18231F] tracking-tight">
                      Restaurant Operations Command Center
                    </h1>
                    <p className="text-xs text-[#68736D]">
                      Welcome back, <strong className="text-[#18231F]">{sessionUser.displayName}</strong>. Real-time multi-tenant operational metrics derived from verified ledger entries.
                    </p>
                    <div className="pt-1">
                      <LastUpdatedBadge
                        timestamp={organization.updatedAt}
                        label="Workspace Snapshot Updated"
                        syncStatus={offlineQueue.length > 0 ? 'offline_queued' : 'synced'}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 no-print">
                    <PrintReportButton label="Print Summary" />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('inventory_purchasing');
                        setActiveSubTab('stock');
                      }}
                      className="px-3.5 py-2 bg-[#EFF2ED] hover:bg-[#E6F0E9] text-[#18231F] border border-[#E1E6E1] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Log Stocktake
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('inventory_purchasing');
                        setActiveSubTab('purchasing');
                      }}
                      className="px-3.5 py-2 bg-[#18231F] hover:bg-[#176B58] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      + New Purchase Order
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('intelligence_governance');
                        setActiveSubTab('ai_assistant');
                      }}
                      className="px-3.5 py-2 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ask AI Operations Agent
                    </button>
                  </div>
                </div>

                {/* 4-Column Primary KPI Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-[#E1E6E1] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#68736D]">Recorded POS Sales</span>
                      <span className="text-[11px] font-mono text-[#176B58] bg-[#E6F0E9] px-2 py-0.5 rounded font-semibold">
                        Verified
                      </span>
                    </div>
                    <span className="text-2xl font-bold font-mono tabular-nums text-[#18231F] mt-2 block">
                      {formatMinorCurrency(totalSalesMinor, currency)}
                    </span>
                    <span className="text-xs text-[#68736D] mt-2 block">
                      {orders.length} completed orders · {reservations.length} bookings today
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#E1E6E1] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#68736D]">
                        Purchasing & Deliveries
                      </span>
                      <Truck className="w-4 h-4 text-[#176B58]" />
                    </div>
                    <span className="text-2xl font-bold font-mono tabular-nums text-[#18231F] mt-2 block">
                      {formatMinorCurrency(totalPurchasesMinor, currency)}
                    </span>
                    <span className="text-xs text-[#176B58] font-medium mt-2 block">
                      {pendingPOs.length} PO(s) awaiting physical delivery receipt
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#E1E6E1] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#68736D]">Low-Stock Alerts</span>
                      <Package className="w-4 h-4 text-red-700" />
                    </div>
                    <span className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-2 block">
                      {lowStockItems.length} / {ingredients.length} SKUs
                    </span>
                    <span className="text-xs text-[#68736D] mt-2 block truncate">
                      {lowStockItems.map((i) => i.name).join(', ') || 'All items above minimum'}
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#E1E6E1] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#68736D]">
                        Open Operational Tasks
                      </span>
                      <CheckSquare className="w-4 h-4 text-[#176B58]" />
                    </div>
                    <span className="text-2xl font-bold font-mono tabular-nums text-[#18231F] mt-2 block">
                      {openTasks.length} Active
                    </span>
                    <span className="text-xs text-[#68736D] mt-2 block">
                      {checklists.filter((c) => c.completed).length}/{checklists.length} daily checklists done
                    </span>
                  </div>
                </div>

                {/* Primary Operational Row: Low-Stock Table + Upcoming Meetings & Open Tasks */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto flex flex-col justify-between">
                    <div>
                      <div className="p-4 border-b border-[#E1E6E1] flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-bold text-[#18231F]">
                            Ingredients Below Minimum Stock Threshold
                          </h2>
                          <p className="text-xs text-[#68736D]">
                            Direct action queue for kitchen & purchasing managers
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection('inventory_purchasing');
                            setActiveSubTab('stock');
                          }}
                          className="text-xs font-semibold text-[#176B58] hover:underline inline-flex items-center gap-1 cursor-pointer no-print"
                        >
                          <span>Manage Inventory</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 z-10 bg-[#EFF2ED]">
                          <tr className="border-b border-[#E1E6E1] bg-[#EFF2ED] text-[#68736D] font-semibold">
                            <th className="py-2.5 px-4">Ingredient</th>
                            <th className="py-2.5 px-4 text-right">Current Stock</th>
                            <th className="py-2.5 px-4 text-right">Min Required</th>
                            <th className="py-2.5 px-4 text-right">Reorder Target</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E1E6E1]">
                          {lowStockItems.map((item) => (
                            <tr key={item.id} className="hover:bg-[#F7F8F5] transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-[#18231F]">
                                {item.name}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700 font-bold">
                                {item.currentStock} {item.baseUnit}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#68736D]">
                                {item.minStock} {item.baseUnit}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#18231F]">
                                {item.reorderTarget} {item.baseUnit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Upcoming Meetings & Open Tasks Panel */}
                  <div className="lg:col-span-5 bg-white rounded-xl border border-[#E1E6E1] p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E1E6E1]">
                      <div>
                        <h2 className="text-sm font-bold text-[#18231F]">
                          Shift Briefings & Priority Tasks
                        </h2>
                        <p className="text-xs text-[#68736D]">
                          Active team handoffs & operational assignments
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('team_operations');
                          setActiveSubTab('meetings_tasks');
                        }}
                        className="text-xs font-semibold text-[#176B58] hover:underline cursor-pointer no-print"
                      >
                        View All →
                      </button>
                    </div>

                    <div className="space-y-2">
                      {openTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1] flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-[#18231F]">{t.title}</div>
                            <div className="text-[#68736D] mt-0.5">
                              Assignee: {t.assigneeName} · Due: {t.dueDate}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#E6F0E9] text-[#176B58] font-mono uppercase text-[10px] font-semibold shrink-0">
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>

                    {meetings[0] && (
                      <div className="p-3 rounded-lg bg-[#EFF2ED]/70 border border-[#E1E6E1] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#18231F] inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#176B58]" />
                            <span>Latest Briefing: {meetings[0].title}</span>
                          </span>
                          <span className="font-mono text-[#68736D]">{meetings[0].date}</span>
                        </div>
                        <p className="text-[#68736D] line-clamp-2">{meetings[0].decisions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary Row: Recent Audit Activity + Multi-Tenant Security Self-Test */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white rounded-xl border border-[#E1E6E1] p-5 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E1E6E1]">
                      <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[#176B58]" />
                        <span>Recent Operational Activity & Ledger Feed</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('intelligence_governance');
                          setActiveSubTab('admin');
                        }}
                        className="text-xs font-semibold text-[#176B58] hover:underline cursor-pointer no-print"
                      >
                        Full Audit Log →
                      </button>
                    </div>
                    <div className="divide-y divide-[#E1E6E1]">
                      {auditLogs.slice(0, 4).map((log) => (
                        <div
                          key={log.id}
                          className="py-2.5 flex items-start justify-between gap-4"
                        >
                          <div>
                            <span className="font-mono font-semibold text-[#176B58]">
                              {log.action}
                            </span>{' '}
                            <span className="text-[#18231F] font-medium">— {log.details}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#68736D] shrink-0">
                            {log.createdAt.slice(0, 16).replace('T', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Tenant Isolation & Security Verification Card */}
                  <div className="lg:col-span-5 bg-white rounded-xl border border-[#E1E6E1] p-5 space-y-3 text-xs no-print">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E1E6E1]">
                      <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm">
                        <ShieldCheck className="w-4 h-4 text-[#176B58]" />
                        <span>Multi-Tenant Isolation & Security Self-Test</span>
                      </div>
                      <Lock className="w-4 h-4 text-[#68736D]" />
                    </div>
                    <p className="text-[#68736D] leading-relaxed">
                      Every document under `/organizations/{organization.id}/**` is protected by our Master Gate Firestore rules (`isOrgMember(orgId)`). Verify that attempting to read another restaurant&apos;s records is blocked:
                    </p>
                    <button
                      type="button"
                      onClick={handleVerifyCrossTenantIsolation}
                      className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Run Cross-Restaurant Data Access Guard Test
                    </button>
                    {crossTenantIsolationResult && (
                      <div className="p-3 rounded-lg bg-[#E6F0E9] border border-[#176B58]/30 text-[#18231F] font-mono text-[11px] leading-relaxed">
                        {crossTenantIsolationResult}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: INVENTORY, PURCHASING, LEDGER, RECIPES & OCR */}
            {activeSection === 'inventory_purchasing' && (
              <InventoryPurchasingModule
                orgId={organization.id}
                orgName={organization.name}
                branchId={activeBranchId}
                branchName={activeBranchName}
                currency={currency}
                actorUid={sessionUser.uid}
                actorName={sessionUser.displayName}
                canAddIngredient={entitlement.canAddIngredient}
                initialSubTab={activeSubTab as any}
                ingredients={ingredients}
                suppliers={suppliers}
                purchases={purchases}
                movements={movements}
                recipes={recipes}
                orders={orders}
                onCreateIngredient={(newIng, openingMov) => {
                  setIngredients((prev) => [newIng, ...prev]);
                  setMovements((prev) => [openingMov, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: newIng.updatedAt }));
                  persistTenantDoc('ingredients', newIng.id, newIng);
                  persistTenantDoc('movements', openingMov.id, openingMov);
                  appendAuditLog(
                    'INGREDIENT_CREATED',
                    'Ingredient',
                    newIng.id,
                    `Created ${newIng.name} (${newIng.sku}) with opening stock ${newIng.currentStock} ${newIng.baseUnit}.`
                  );
                }}
                onCreateSupplier={(sup) => {
                  setSuppliers((prev) => [sup, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: sup.updatedAt }));
                  persistTenantDoc('suppliers', sup.id, sup);
                  appendAuditLog(
                    'SUPPLIER_ADDED',
                    'Supplier',
                    sup.id,
                    `Added supplier ${sup.name}.`
                  );
                }}
                onCreatePurchaseOrder={(po) => {
                  setPurchases((prev) => [po, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: po.updatedAt }));
                  persistTenantDoc('purchases', po.id, po);
                  appendAuditLog(
                    'PURCHASE_ORDER_CREATED',
                    'PurchaseOrder',
                    po.id,
                    `Created PO ${po.invoiceRef} (${po.status}) for ${po.quantity} ${po.unit} ${po.ingredientName}.`
                  );
                }}
                onReceivePurchaseDelivery={(updatedPo, updatedIng, receiptMov) => {
                  setPurchases((prev) =>
                    prev.map((p) => (p.id === updatedPo.id ? updatedPo : p))
                  );
                  setIngredients((prev) =>
                    prev.map((i) => (i.id === updatedIng.id ? updatedIng : i))
                  );
                  setMovements((prev) => [receiptMov, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: updatedPo.updatedAt }));
                  persistTenantDoc('purchases', updatedPo.id, updatedPo);
                  persistTenantDoc('ingredients', updatedIng.id, updatedIng);
                  persistTenantDoc('movements', receiptMov.id, receiptMov);
                  appendAuditLog(
                    'PURCHASE_DELIVERY_RECEIVED',
                    'PurchaseOrder',
                    updatedPo.id,
                    `Received delivery for ${updatedPo.invoiceRef}; balance after: ${receiptMov.balanceAfter} ${receiptMov.unit}.`
                  );
                }}
                onRecordStockAdjustment={(updatedIng, mov) => {
                  setIngredients((prev) =>
                    prev.map((i) => (i.id === updatedIng.id ? updatedIng : i))
                  );
                  setMovements((prev) => [mov, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: updatedIng.updatedAt }));
                  persistTenantDoc('ingredients', updatedIng.id, updatedIng);
                  persistTenantDoc('movements', mov.id, mov);
                  appendAuditLog(
                    `STOCK_${mov.movementType.toUpperCase()}`,
                    'Ingredient',
                    updatedIng.id,
                    `${mov.reason} (${mov.quantityDelta} ${mov.unit}).`
                  );
                }}
                onCreateRecipe={(rec) => {
                  setRecipes((prev) => [rec, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: rec.updatedAt }));
                  persistTenantDoc('recipes', rec.id, rec);
                  appendAuditLog(
                    'RECIPE_CREATED',
                    'Recipe',
                    rec.id,
                    `Created recipe ${rec.dishName}.`
                  );
                }}
              />
            )}

            {/* SECTION 3: TIPS, STAFF, MEETINGS, TASKS, CHAT & CHECKLISTS */}
            {activeSection === 'team_operations' && (
              <TeamOperationsModule
                orgId={organization.id}
                orgName={organization.name}
                branchId={activeBranchId}
                branchName={activeBranchName}
                currency={currency}
                actorUid={sessionUser.uid}
                actorName={sessionUser.displayName}
                actorRole="owner"
                canAddStaff={entitlement.canAddStaff}
                initialSubTab={activeSubTab as any}
                tips={tips}
                members={members}
                tasks={tasks}
                meetings={meetings}
                messages={messages}
                checklists={checklists}
                onRecordTip={(tip) => {
                  setTips((prev) => [tip, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: tip.updatedAt }));
                  persistTenantDoc('tips', tip.id, tip);
                  appendAuditLog(
                    'TIP_RECORDED',
                    'TipRecord',
                    tip.id,
                    `Recorded ${formatMinorCurrency(tip.amountMinor, currency)} for ${tip.shift} shift.`
                  );
                }}
                onUpdateTipStatus={(tipId, status) => {
                  const now = new Date().toISOString();
                  setTips((prev) =>
                    prev.map((t) => (t.id === tipId ? { ...t, status, updatedAt: now } : t))
                  );
                  setOrganization((prev) => ({ ...prev, updatedAt: now }));
                  appendAuditLog(
                    `TIP_${status.toUpperCase()}`,
                    'TipRecord',
                    tipId,
                    `Updated tip record status to ${status}.`
                  );
                }}
                onInviteMember={(member) => {
                  setMembers((prev) => [member, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: member.updatedAt }));
                  persistTenantDoc('members', member.id, member);
                  appendAuditLog(
                    'STAFF_MEMBER_INVITED',
                    'Member',
                    member.id,
                    `Invited ${member.email} with role ${member.role}.`
                  );
                }}
                onRemoveMember={(memberId) => {
                  const removed = members.find((m) => m.id === memberId);
                  setMembers((prev) => prev.filter((m) => m.id !== memberId));
                  setOrganization((prev) => ({
                    ...prev,
                    updatedAt: new Date().toISOString(),
                  }));
                  appendAuditLog(
                    'STAFF_MEMBER_REVOKED',
                    'Member',
                    memberId,
                    `Revoked workspace membership for ${removed?.email || memberId}.`
                  );
                }}
                onCreateTask={(task) => {
                  setTasks((prev) => [task, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: task.updatedAt }));
                  persistTenantDoc('tasks', task.id, task);
                  appendAuditLog(
                    'TASK_CREATED',
                    'TaskRecord',
                    task.id,
                    `Created task: ${task.title}`
                  );
                }}
                onToggleTaskStatus={(taskId) => {
                  const now = new Date().toISOString();
                  setTasks((prev) =>
                    prev.map((t) =>
                      t.id === taskId
                        ? {
                            ...t,
                            status: t.status === 'completed' ? 'todo' : 'completed',
                            updatedAt: now,
                          }
                        : t
                    )
                  );
                  setOrganization((prev) => ({ ...prev, updatedAt: now }));
                }}
                onCreateMeeting={(meeting, generatedTask) => {
                  setMeetings((prev) => [meeting, ...prev]);
                  persistTenantDoc('meetings', meeting.id, meeting);
                  if (generatedTask) {
                    setTasks((prev) => [generatedTask, ...prev]);
                    persistTenantDoc('tasks', generatedTask.id, generatedTask);
                  }
                  setOrganization((prev) => ({ ...prev, updatedAt: meeting.updatedAt }));
                  appendAuditLog(
                    'MEETING_RECORDED',
                    'MeetingRecord',
                    meeting.id,
                    `Logged meeting "${meeting.title}"${generatedTask ? ` and assigned task "${generatedTask.title}"` : ''}.`
                  );
                }}
                onSendMessage={(msg) => {
                  setMessages((prev) => [...prev, msg]);
                  persistTenantDoc('messages', msg.id, msg);
                }}
                onToggleChecklist={(itemId) => {
                  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
                  setChecklists((prev) =>
                    prev.map((c) =>
                      c.id === itemId
                        ? {
                            ...c,
                            completed: !c.completed,
                            completedBy: !c.completed ? sessionUser.displayName : '',
                            completedAt: !c.completed ? now : '',
                          }
                        : c
                    )
                  );
                }}
              />
            )}

            {/* SECTION 4: CRM, RESERVATIONS, POS SALES, REVIEWS & WEBSITE BUILDER */}
            {activeSection === 'growth_experience' && (
              <GrowthExperienceModule
                orgId={organization.id}
                orgName={organization.name}
                branchId={activeBranchId}
                branchName={activeBranchName}
                currency={currency}
                includesCustomWebsiteService={entitlement.entitlements.includesCustomWebsiteService}
                initialSubTab={activeSubTab as any}
                customers={customers}
                reservations={reservations}
                orders={orders}
                reviews={reviews}
                recipes={recipes}
                website={website}
                onAddCustomer={(cust) => {
                  setCustomers((prev) => [cust, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: cust.updatedAt }));
                  persistTenantDoc('customers', cust.id, cust);
                  appendAuditLog(
                    'CUSTOMER_CREATED',
                    'CustomerRecord',
                    cust.id,
                    `Added CRM guest ${cust.name}.`
                  );
                }}
                onRecordCustomerVisit={(customerId, spendMinor) => {
                  const now = new Date().toISOString();
                  const today = now.slice(0, 10);
                  setCustomers((prev) =>
                    prev.map((c) =>
                      c.id === customerId
                        ? {
                            ...c,
                            visitsCount: c.visitsCount + 1,
                            totalSpendMinor: c.totalSpendMinor + spendMinor,
                            lastVisitDate: today,
                            updatedAt: now,
                          }
                        : c
                    )
                  );
                  setOrganization((prev) => ({ ...prev, updatedAt: now }));
                  appendAuditLog(
                    'CUSTOMER_VISIT_LOGGED',
                    'CustomerRecord',
                    customerId,
                    `Recorded verified guest visit (+${formatMinorCurrency(spendMinor, currency)}).`
                  );
                }}
                onAddReservation={(res) => {
                  setReservations((prev) => [res, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: res.updatedAt }));
                  persistTenantDoc('reservations', res.id, res);
                }}
                onUpdateReservationStatus={(resId, status) => {
                  const now = new Date().toISOString();
                  setReservations((prev) =>
                    prev.map((r) => (r.id === resId ? { ...r, status, updatedAt: now } : r))
                  );
                  setOrganization((prev) => ({ ...prev, updatedAt: now }));
                }}
                onAddPosOrder={(order) => {
                  setOrders((prev) => [order, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: order.createdAt }));
                  persistTenantDoc('orders', order.id, order);
                  appendAuditLog(
                    'POS_ORDER_IMPORTED',
                    'PosOrder',
                    order.id,
                    `Imported idempotent POS order ${order.externalOrderId} (${order.quantity}× ${order.dishName}).`
                  );
                }}
                onApproveReviewReply={(reviewId, finalReply) => {
                  setReviews((prev) =>
                    prev.map((r) =>
                      r.id === reviewId
                        ? {
                            ...r,
                            draftReply: finalReply,
                            replyStatus: 'approved_published',
                          }
                        : r
                    )
                  );
                  appendAuditLog(
                    'REVIEW_REPLY_APPROVED',
                    'ReviewRecord',
                    reviewId,
                    'Human-approved public review response.'
                  );
                }}
                onUpdateWebsiteConfig={(cfg) => {
                  setWebsite(cfg);
                  setOrganization((prev) => ({ ...prev, updatedAt: cfg.updatedAt }));
                  persistTenantDoc('website', cfg.id, cfg);
                  appendAuditLog(
                    'WEBSITE_CONFIG_UPDATED',
                    'WebsiteConfig',
                    cfg.id,
                    `Updated website builder configuration (Bespoke status: ${cfg.bespokeRequestStatus}).`
                  );
                }}
              />
            )}

            {/* SECTION 5: AI ASSISTANT, AUTOMATIONS, REPORTS, BILLING & PLATFORM ADMIN */}
            {activeSection === 'intelligence_governance' && (
              <IntelligenceGovernanceModule
                organization={organization}
                branchName={activeBranchName}
                isPlatformAdmin={sessionUser.email === 'yasserrajeb@gmail.com'}
                initialSubTab={activeSubTab as any}
                ingredients={ingredients}
                purchases={purchases}
                tips={tips}
                orders={orders}
                customers={customers}
                tasks={tasks}
                reviews={reviews}
                automations={automations}
                auditLogs={auditLogs}
                announcements={announcements}
                supportTickets={supportTickets}
                utmAttribution={persistedUtm}
                onIncrementAiQueryCount={() => {
                  setOrganization((prev) => ({
                    ...prev,
                    aiQueriesUsedThisMonth: prev.aiQueriesUsedThisMonth + 1,
                    updatedAt: new Date().toISOString(),
                  }));
                }}
                onExecuteAiSuggestedTask={(title, details) => {
                  const now = new Date().toISOString();
                  const aiTask: TaskRecord = {
                    id: `tsk_ai_${Date.now()}`,
                    orgId: organization.id,
                    branchId: activeBranchId,
                    title,
                    description: details,
                    assigneeName: sessionUser.displayName,
                    priority: 'high',
                    status: 'todo',
                    dueDate: now.slice(0, 10),
                    linkedModule: 'inventory',
                    linkedRecordId: 'ai_agent_confirmed',
                    createdBy: sessionUser.uid,
                    createdAt: now,
                    updatedAt: now,
                  };
                  setTasks((prev) => [aiTask, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: now }));
                  persistTenantDoc('tasks', aiTask.id, aiTask);
                  appendAuditLog(
                    'AI_INITIATED_TASK_CONFIRMED',
                    'TaskRecord',
                    aiTask.id,
                    `User confirmed AI suggested task: ${title}`
                  );
                }}
                onToggleAutomationRule={(ruleId) => {
                  setAutomations((prev) =>
                    prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
                  );
                }}
                onCreateAutomationRule={(rule) => {
                  setAutomations((prev) => [rule, ...prev]);
                  setOrganization((prev) => ({ ...prev, updatedAt: rule.updatedAt }));
                  persistTenantDoc('automations', rule.id, rule);
                  appendAuditLog(
                    'AUTOMATION_RULE_CREATED',
                    'AutomationRule',
                    rule.id,
                    `Created automation rule ${rule.name}.`
                  );
                }}
                onUpdateSubscriptionState={(plan: PlanTier, status: SubscriptionStatus) => {
                  const now = new Date().toISOString();
                  setOrganization((prev) => ({
                    ...prev,
                    plan,
                    subscriptionStatus: status,
                    updatedAt: now,
                  }));
                  appendAuditLog(
                    'SUBSCRIPTION_STATE_UPDATED',
                    'Organization',
                    organization.id,
                    `Subscription updated to plan=${plan}, status=${status}.`
                  );
                }}
                onCreateAnnouncement={(ann) => {
                  setAnnouncements((prev) => [ann, ...prev]);
                  persistTenantDoc('announcements', ann.id, ann);
                  appendAuditLog(
                    'ANNOUNCEMENT_PUBLISHED',
                    'AnnouncementItem',
                    ann.id,
                    `Published announcement "${ann.title}" for scope=${ann.scope}.`
                  );
                }}
                onToggleAnnouncementActive={(annId) => {
                  setAnnouncements((prev) =>
                    prev.map((a) =>
                      a.id === annId
                        ? { ...a, published: !a.published, updatedAt: new Date().toISOString() }
                        : a
                    )
                  );
                }}
              />
            )}
          </main>
        </div>
      </div>

      {/* 4. Back-to-Top Button & 20. Floating Support Widget */}
      <BackToTopButton threshold={360} />
      <FloatingSupportWidget
        orgId={organization.id}
        defaultName={sessionUser.displayName}
        defaultEmail={sessionUser.email}
        faqs={DEFAULT_PLATFORM_FAQS}
        onTicketCreated={(ticket) => {
          setSupportTickets((prev) => [ticket, ...prev]);
          persistTenantDoc('supportTickets', ticket.id, ticket);
          appendAuditLog(
            'SUPPORT_TICKET_SUBMITTED',
            'SupportTicketRecord',
            ticket.id,
            `Submitted support ticket "${ticket.subject}" (${ticket.category}).`
          );
        }}
      />
    </div>
  );
}
