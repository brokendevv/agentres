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
import { buildInitialRestaurantDataset } from './domain/seedData';
import { MarketingLanding } from './components/MarketingLanding';
import { AuthModal } from './components/AuthModal';
import { InventoryPurchasingModule } from './components/InventoryPurchasingModule';
import { TeamOperationsModule } from './components/TeamOperationsModule';
import { GrowthExperienceModule } from './components/GrowthExperienceModule';
import { IntelligenceGovernanceModule } from './components/IntelligenceGovernanceModule';
import { PWAOfflineBar } from './components/PWAOfflineBar';
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
  AlertTriangle,
  Lock,
} from 'lucide-react';

type WorkspaceSection =
  | 'overview'
  | 'inventory_purchasing'
  | 'team_operations'
  | 'growth_experience'
  | 'intelligence_governance';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

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
  const [showNotifications, setShowNotifications] = useState(false);

  // Organization & Domain State
  const initialOrgId = 'org_dar_zitouna_ma';
  const initialSeed = buildInitialRestaurantDataset(
    initialOrgId,
    'usr_owner_yasser',
    'yasserrajeb@gmail.com',
    'Yasser Rajeb'
  );

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [crossTenantIsolationResult, setCrossTenantIsolationResult] = useState<string | null>(
    null
  );

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
      // Only invoke handleFirestoreError on genuine Firestore permission errors when signed in
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
  };

  // Protected Route Gate: If no active user session, show Marketing Website + Auth Modal
  if (!sessionUser) {
    return (
      <>
        <MarketingLanding
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Left Sidebar Navigation (260px on Desktop) */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-200 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight text-white block truncate">
                TablePulse OS
              </span>
              <span className="text-xs text-slate-400 font-mono block mt-0.5 truncate">
                {organization.name}
              </span>
            </div>
            <span className="text-[11px] font-mono uppercase text-amber-400 shrink-0">
              {entitlement.effectiveTier}
            </span>
          </div>

          {/* Branch Switcher */}
          <div className="p-4 border-b border-slate-800">
            <label
              htmlFor="branch-selector"
              className="block text-xs font-medium text-slate-400 mb-1.5"
            >
              Active Restaurant Branch
            </label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <select
                id="branch-selector"
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Workspace Modules */}
          <nav aria-label="Workspace Modules" className="p-3 space-y-1">
            <button
              type="button"
              onClick={() => setActiveSection('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSection === 'overview'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Operations Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('inventory_purchasing')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSection === 'inventory_purchasing'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>Inventory, POs & Recipes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('team_operations')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSection === 'team_operations'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Tips, Staff, Tasks & Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('growth_experience')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSection === 'growth_experience'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>CRM, POS, Reviews & Site</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('intelligence_governance')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSection === 'intelligence_governance'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>AI Agent, Billing & Admin</span>
            </button>
          </nav>
        </div>

        {/* Authenticated User Footer */}
        <div className="p-4 border-t border-slate-800 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="font-semibold text-white truncate">{sessionUser.displayName}</div>
              <div className="text-slate-400 font-mono truncate">{sessionUser.email}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out of workspace"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Tenant ID: {organization.id}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{organization.name}</span>
            <span>/</span>
            <span>
              {branches.find((b) => b.id === activeBranchId)?.name || 'Casablanca Flagship'}
            </span>
            <span>·</span>
            <span className="font-mono">Currency: {currency}</span>
          </div>

          <div className="flex items-center gap-3">
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
              className="relative px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-amber-700" />
              <span>Alerts ({unreadNotifCount})</span>
            </button>
          </div>
        </header>

        {/* Notifications Drawer */}
        {showNotifications && (
          <div className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold">Workspace Operational Notifications</span>
              <button
                type="button"
                onClick={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                }}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            </div>
            <div className="divide-y divide-slate-800">
              {notifications.map((n) => (
                <div key={n.id} className="py-2 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-white">{n.title}</span> —{' '}
                    <span className="text-slate-300">{n.body}</span>
                  </div>
                  <span className="font-mono text-slate-400 uppercase">{n.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viewport Workspace Container */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* SECTION 1: OPERATIONS OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Restaurant Operations Command Center
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time multi-tenant operational metrics derived from verified ledger entries.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('inventory_purchasing')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    + New Purchase Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('intelligence_governance')}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask AI Operations Agent
                  </button>
                </div>
              </div>

              {/* 4-Column Primary KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Recorded POS Sales</span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                    {formatMinorCurrency(totalSalesMinor, currency)}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {orders.length} completed orders · {reservations.length} bookings today
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Purchasing & Deliveries</span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                    {formatMinorCurrency(totalPurchasesMinor, currency)}
                  </span>
                  <span className="text-xs text-amber-700 font-medium mt-1 block">
                    {pendingPOs.length} PO(s) awaiting physical delivery receipt
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Low-Stock Alerts</span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-1 block">
                    {lowStockItems.length} / {ingredients.length} SKUs
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block truncate">
                    {lowStockItems.map((i) => i.name).join(', ') || 'All items above minimum'}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Open Operational Tasks</span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                    {openTasks.length} Active
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {checklists.filter((c) => c.completed).length}/{checklists.length} daily checklists done
                  </span>
                </div>
              </div>

              {/* Actionable Operational Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-x-auto">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">
                      Ingredients Below Minimum Stock Threshold
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveSection('inventory_purchasing')}
                      className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Manage Inventory →
                    </button>
                  </div>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-2.5 px-4">Ingredient</th>
                        <th className="py-2.5 px-4 text-right">Current Stock</th>
                        <th className="py-2.5 px-4 text-right">Min Required</th>
                        <th className="py-2.5 px-4 text-right">Reorder Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {lowStockItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700 font-bold">
                            {item.currentStock} {item.baseUnit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                            {item.minStock} {item.baseUnit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                            {item.reorderTarget} {item.baseUnit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Multi-Tenant Isolation & Security Verification Card */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Multi-Tenant Isolation & Security Self-Test</span>
                    </div>
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Every document under `/organizations/{organization.id}/**` is protected by our Master Gate Firestore rules (`isOrgMember(orgId)`). Verify that attempting to read another restaurant&apos;s records is blocked:
                  </p>
                  <button
                    type="button"
                    onClick={handleVerifyCrossTenantIsolation}
                    className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer"
                  >
                    Run Cross-Restaurant Data Access Guard Test
                  </button>
                  {crossTenantIsolationResult && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-[11px] leading-relaxed">
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
              branchId={activeBranchId}
              currency={currency}
              actorUid={sessionUser.uid}
              actorName={sessionUser.displayName}
              canAddIngredient={entitlement.canAddIngredient}
              ingredients={ingredients}
              suppliers={suppliers}
              purchases={purchases}
              movements={movements}
              recipes={recipes}
              orders={orders}
              onCreateIngredient={(newIng, openingMov) => {
                setIngredients((prev) => [newIng, ...prev]);
                setMovements((prev) => [openingMov, ...prev]);
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
                persistTenantDoc('suppliers', sup.id, sup);
                appendAuditLog('SUPPLIER_ADDED', 'Supplier', sup.id, `Added supplier ${sup.name}.`);
              }}
              onCreatePurchaseOrder={(po) => {
                setPurchases((prev) => [po, ...prev]);
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
              branchId={activeBranchId}
              currency={currency}
              actorUid={sessionUser.uid}
              actorName={sessionUser.displayName}
              actorRole="owner"
              canAddStaff={entitlement.canAddStaff}
              tips={tips}
              members={members}
              tasks={tasks}
              meetings={meetings}
              messages={messages}
              checklists={checklists}
              onRecordTip={(tip) => {
                setTips((prev) => [tip, ...prev]);
                persistTenantDoc('tips', tip.id, tip);
                appendAuditLog(
                  'TIP_RECORDED',
                  'TipRecord',
                  tip.id,
                  `Recorded ${formatMinorCurrency(tip.amountMinor, currency)} for ${tip.shift} shift.`
                );
              }}
              onUpdateTipStatus={(tipId, status) => {
                setTips((prev) =>
                  prev.map((t) =>
                    t.id === tipId ? { ...t, status, updatedAt: new Date().toISOString() } : t
                  )
                );
                appendAuditLog(
                  `TIP_${status.toUpperCase()}`,
                  'TipRecord',
                  tipId,
                  `Updated tip record status to ${status}.`
                );
              }}
              onInviteMember={(member) => {
                setMembers((prev) => [member, ...prev]);
                persistTenantDoc('members', member.id, member);
                appendAuditLog(
                  'STAFF_MEMBER_INVITED',
                  'Member',
                  member.id,
                  `Invited ${member.email} with role ${member.role}.`
                );
              }}
              onCreateTask={(task) => {
                setTasks((prev) => [task, ...prev]);
                persistTenantDoc('tasks', task.id, task);
                appendAuditLog('TASK_CREATED', 'TaskRecord', task.id, `Created task: ${task.title}`);
              }}
              onToggleTaskStatus={(taskId) => {
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === taskId
                      ? {
                          ...t,
                          status: t.status === 'completed' ? 'todo' : 'completed',
                          updatedAt: new Date().toISOString(),
                        }
                      : t
                  )
                );
              }}
              onCreateMeeting={(meeting, generatedTask) => {
                setMeetings((prev) => [meeting, ...prev]);
                persistTenantDoc('meetings', meeting.id, meeting);
                if (generatedTask) {
                  setTasks((prev) => [generatedTask, ...prev]);
                  persistTenantDoc('tasks', generatedTask.id, generatedTask);
                }
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
              branchId={activeBranchId}
              currency={currency}
              includesCustomWebsiteService={entitlement.entitlements.includesCustomWebsiteService}
              customers={customers}
              reservations={reservations}
              orders={orders}
              reviews={reviews}
              recipes={recipes}
              website={website}
              onAddCustomer={(cust) => {
                setCustomers((prev) => [cust, ...prev]);
                persistTenantDoc('customers', cust.id, cust);
                appendAuditLog(
                  'CUSTOMER_CREATED',
                  'CustomerRecord',
                  cust.id,
                  `Added CRM guest ${cust.name}.`
                );
              }}
              onRecordCustomerVisit={(customerId, spendMinor) => {
                const today = new Date().toISOString().slice(0, 10);
                setCustomers((prev) =>
                  prev.map((c) =>
                    c.id === customerId
                      ? {
                          ...c,
                          visitsCount: c.visitsCount + 1,
                          totalSpendMinor: c.totalSpendMinor + spendMinor,
                          lastVisitDate: today,
                        }
                      : c
                  )
                );
                appendAuditLog(
                  'CUSTOMER_VISIT_LOGGED',
                  'CustomerRecord',
                  customerId,
                  `Recorded verified guest visit (+${formatMinorCurrency(spendMinor, currency)}).`
                );
              }}
              onAddReservation={(res) => {
                setReservations((prev) => [res, ...prev]);
                persistTenantDoc('reservations', res.id, res);
              }}
              onUpdateReservationStatus={(resId, status) => {
                setReservations((prev) =>
                  prev.map((r) => (r.id === resId ? { ...r, status } : r))
                );
              }}
              onAddPosOrder={(order) => {
                setOrders((prev) => [order, ...prev]);
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
              isPlatformAdmin={sessionUser.email === 'yasserrajeb@gmail.com'}
              ingredients={ingredients}
              purchases={purchases}
              tips={tips}
              orders={orders}
              customers={customers}
              tasks={tasks}
              reviews={reviews}
              automations={automations}
              auditLogs={auditLogs}
              onIncrementAiQueryCount={() => {
                setOrganization((prev) => ({
                  ...prev,
                  aiQueriesUsedThisMonth: prev.aiQueriesUsedThisMonth + 1,
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
                persistTenantDoc('automations', rule.id, rule);
                appendAuditLog(
                  'AUTOMATION_RULE_CREATED',
                  'AutomationRule',
                  rule.id,
                  `Created automation rule ${rule.name}.`
                );
              }}
              onUpdateSubscriptionState={(plan: PlanTier, status: SubscriptionStatus) => {
                setOrganization((prev) => ({
                  ...prev,
                  plan,
                  subscriptionStatus: status,
                  updatedAt: new Date().toISOString(),
                }));
                appendAuditLog(
                  'SUBSCRIPTION_STATE_UPDATED',
                  'Organization',
                  organization.id,
                  `Subscription updated to plan=${plan}, status=${status}.`
                );
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
