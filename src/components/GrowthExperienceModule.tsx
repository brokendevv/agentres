import React, { useState } from 'react';
import {
  CustomerRecord,
  ReservationRecord,
  PosOrder,
  ReviewRecord,
  WebsiteConfig,
  Recipe,
} from '../domain/types';
import {
  CurrencyCode,
  toMinorUnits,
  formatMinorCurrency,
} from '../domain/calculations';
import {
  Users,
  Calendar,
  ShoppingBag,
  Star,
  Globe,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface GrowthExperienceModuleProps {
  orgId: string;
  branchId: string;
  currency: CurrencyCode;
  includesCustomWebsiteService: boolean;
  customers: CustomerRecord[];
  reservations: ReservationRecord[];
  orders: PosOrder[];
  reviews: ReviewRecord[];
  recipes: Recipe[];
  website: WebsiteConfig;
  onAddCustomer: (c: CustomerRecord) => void;
  onRecordCustomerVisit: (customerId: string, spendMinor: number) => void;
  onAddReservation: (r: ReservationRecord) => void;
  onUpdateReservationStatus: (
    resId: string,
    status: 'confirmed' | 'seated' | 'completed' | 'cancelled'
  ) => void;
  onAddPosOrder: (order: PosOrder) => void;
  onApproveReviewReply: (reviewId: string, finalReply: string) => void;
  onUpdateWebsiteConfig: (config: WebsiteConfig) => void;
}

export const GrowthExperienceModule: React.FC<GrowthExperienceModuleProps> = ({
  orgId,
  branchId,
  currency,
  includesCustomWebsiteService,
  customers,
  reservations,
  orders,
  reviews,
  recipes,
  website,
  onAddCustomer,
  onRecordCustomerVisit,
  onAddReservation,
  onUpdateReservationStatus,
  onAddPosOrder,
  onApproveReviewReply,
  onUpdateWebsiteConfig,
}) => {
  const [subTab, setSubTab] = useState<
    'crm' | 'reservations' | 'pos_sales' | 'reviews' | 'website'
  >('crm');
  const [feedback, setFeedback] = useState<string | null>(null);

  // CRM State
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custConsent, setCustConsent] = useState(true);
  const [custDietary, setCustDietary] = useState('');

  // Reservation State
  const [resName, setResName] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resDate, setResDate] = useState(new Date().toISOString().slice(0, 10));
  const [resTime, setResTime] = useState('20:30');
  const [resParty, setResParty] = useState('4');
  const [resTable, setResTable] = useState('T-08');
  const [resNotes, setResNotes] = useState('');

  // POS Order Import State
  const [posExtId, setPosExtId] = useState(`LIGHTS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [posRecipeId, setPosRecipeId] = useState(recipes[0]?.id || '');
  const [posQty, setPosQty] = useState('5');

  // Review Draft edits
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({});

  // Website Builder State
  const [siteHeadline, setSiteHeadline] = useState(website.headline);
  const [siteSubheadline, setSiteSubheadline] = useState(website.subheadline);
  const [siteHours, setSiteHours] = useState(website.openingHours);
  const [siteDomain, setSiteDomain] = useState(website.customDomain);
  const [bespokeNotes, setBespokeNotes] = useState(website.bespokeNotes);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custEmail.trim()) return;
    // Deduplication check by email
    if (customers.some((c) => c.email.toLowerCase() === custEmail.trim().toLowerCase())) {
      setFeedback('Deduplication Guard: A customer with this email already exists in your directory.');
      return;
    }
    const now = new Date().toISOString();
    const newCust: CustomerRecord = {
      id: `cust_${Date.now()}`,
      orgId,
      name: custName.trim(),
      email: custEmail.trim(),
      phone: custPhone.trim() || '+212 600-000000',
      marketingConsent: custConsent,
      visitsCount: 1,
      totalSpendMinor: 0,
      currency,
      lastVisitDate: now.slice(0, 10),
      dietaryNotes: custDietary.trim() || 'None recorded',
      source: 'walk_in',
      createdAt: now,
      updatedAt: now,
    };
    onAddCustomer(newCust);
    setCustName('');
    setCustEmail('');
    setCustPhone('');
    setCustDietary('');
    setFeedback(`Added customer "${newCust.name}" to CRM directory.`);
  };

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim()) return;

    // Conflict check for same table, date, and time
    const hasConflict = reservations.some(
      (r) =>
        r.date === resDate &&
        r.time === resTime &&
        r.tableNumber.toLowerCase() === resTable.trim().toLowerCase() &&
        r.status !== 'cancelled'
    );
    if (hasConflict) {
      setFeedback(
        `Table Conflict Warning: Table ${resTable} is already booked on ${resDate} at ${resTime}. Select another table or time.`
      );
      return;
    }

    const now = new Date().toISOString();
    const newRes: ReservationRecord = {
      id: `res_${Date.now()}`,
      orgId,
      branchId,
      customerName: resName.trim(),
      customerPhone: resPhone.trim() || '+212 600-000000',
      date: resDate,
      time: resTime,
      partySize: Math.max(1, Number(resParty) || 2),
      tableNumber: resTable.trim().toUpperCase(),
      status: 'confirmed',
      specialRequests: resNotes.trim() || 'Standard dining',
      createdAt: now,
      updatedAt: now,
    };
    onAddReservation(newRes);
    setResName('');
    setResPhone('');
    setResNotes('');
    setFeedback(
      `Confirmed reservation for ${newRes.customerName} (${newRes.partySize} guests) at Table ${newRes.tableNumber}.`
    );
  };

  const handleImportPosOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posExtId.trim()) return;

    // Idempotency / duplicate external Order ID check
    if (orders.some((o) => o.externalOrderId === posExtId.trim())) {
      setFeedback(
        `Idempotency Protection: External POS Order ID "${posExtId.trim()}" has already been imported. Duplicate order rejected.`
      );
      return;
    }

    const rec = recipes.find((r) => r.id === posRecipeId) || recipes[0];
    if (!rec) return;
    const qty = Math.max(1, Number(posQty) || 1);
    const totalMinor = rec.sellingPriceMinor * qty;
    const taxMinor = Math.round(totalMinor * 0.1);
    const now = new Date().toISOString();

    const newOrder: PosOrder = {
      id: `pos_${Date.now()}`,
      orgId,
      branchId,
      externalOrderId: posExtId.trim(),
      recipeId: rec.id,
      dishName: rec.dishName,
      quantity: qty,
      totalMinor,
      taxMinor,
      currency,
      source: 'csv_import',
      orderDate: now.slice(0, 10),
      createdAt: now,
    };

    onAddPosOrder(newOrder);
    setPosExtId(`LIGHTS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setFeedback(
      `Imported POS Order ${newOrder.externalOrderId}: ${qty}× ${rec.dishName} (${formatMinorCurrency(totalMinor, currency)}).`
    );
  };

  const handleSaveWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: WebsiteConfig = {
      ...website,
      headline: siteHeadline.trim() || website.headline,
      subheadline: siteSubheadline.trim() || website.subheadline,
      openingHours: siteHours.trim() || website.openingHours,
      customDomain: siteDomain.trim(),
      // Custom domain is never marked verified merely because someone typed it in a field
      domainVerified: false,
      bespokeNotes: bespokeNotes.trim(),
      updatedAt: new Date().toISOString(),
    };
    onUpdateWebsiteConfig(updated);
    setFeedback(
      'Saved website builder configuration. Note: Custom domain requires DNS TXT ownership verification before activation.'
    );
  };

  const handleRequestBespokeWebsite = () => {
    const updated: WebsiteConfig = {
      ...website,
      bespokeRequestStatus: 'requested',
      bespokeNotes:
        bespokeNotes.trim() ||
        'Requested custom hospitality website design & menu photography integration.',
      updatedAt: new Date().toISOString(),
    };
    onUpdateWebsiteConfig(updated);
    setFeedback(
      includesCustomWebsiteService
        ? 'Submitted custom website build request under your Ultra plan entitlement.'
        : 'Submitted custom website service request for administrator quote approval.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('crm')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'crm' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Customer CRM ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('reservations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'reservations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Tables & Reservations ({reservations.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pos_sales')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'pos_sales' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            POS & Sales Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('reviews')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'reviews' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Reviews & Reputation ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('website')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'website' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Website Builder & Custom Service
          </button>
        </div>
      </div>

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

      {/* TAB 1: CUSTOMER CRM */}
      {subTab === 'crm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Customer Directory & Verified Visit History
              </h3>
              <p className="text-xs text-slate-500">
                Customers, orders, reservations, and physical visits are tracked distinctly with explicit source attribution.
              </p>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Guest Name & Contact</th>
                  <th className="py-3 px-4">Dietary / Staff Notes</th>
                  <th className="py-3 px-4 text-right">Verified Visits</th>
                  <th className="py-3 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3 px-4 text-right">Record Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-slate-500 font-mono">
                        {c.email} · {c.phone} · Source: {c.source}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{c.dietaryNotes}</div>
                      <div className="text-slate-400">
                        Consent: {c.marketingConsent ? 'Opted In' : 'Restricted'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {c.visitsCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatMinorCurrency(c.totalSpendMinor, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onRecordCustomerVisit(c.id, 42000);
                          setFeedback(
                            `Recorded completed dining visit (+420.00 ${currency}) for ${c.name}.`
                          );
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        + Log Visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4">
            <form
              onSubmit={handleCreateCustomer}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <Users className="w-4 h-4 text-amber-700" />
                <span>Add Guest Profile</span>
              </div>
              <div>
                <label htmlFor="c-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Guest Full Name
                </label>
                <input
                  id="c-name"
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Nadia Kettani"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="c-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Email (Deduplicated)
                </label>
                <input
                  id="c-email"
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="nadia.kettani@domain.ma"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="c-phone" className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="c-phone"
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+212 661-000000"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label htmlFor="c-notes" className="block text-xs font-medium text-slate-700 mb-1">
                  Allergen & Seating Notes
                </label>
                <input
                  id="c-notes"
                  type="text"
                  value={custDietary}
                  onChange={(e) => setCustDietary(e.target.value)}
                  placeholder="Gluten-free bread preference"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={custConsent}
                  onChange={(e) => setCustConsent(e.target.checked)}
                />
                <span>Explicit marketing & communication consent</span>
              </label>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save Customer Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: RESERVATIONS */}
      {subTab === 'reservations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Guest & Party</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Special Requests</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reservations.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4 font-mono">
                      {r.date} · <strong>{r.time}</strong>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {r.customerName} ({r.partySize} pax)
                      </div>
                      <div className="text-slate-500 font-mono">{r.customerPhone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {r.tableNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.specialRequests}</td>
                    <td className="py-3 px-4 font-mono uppercase font-semibold text-slate-700">
                      {r.status}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {r.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateReservationStatus(r.id, 'seated')}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold cursor-pointer"
                        >
                          Seat
                        </button>
                      )}
                      {r.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => onUpdateReservationStatus(r.id, 'cancelled')}
                          className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4">
            <form
              onSubmit={handleCreateReservation}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>Book Table Reservation</span>
              </div>
              <div>
                <label htmlFor="res-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Guest Name
                </label>
                <input
                  id="res-name"
                  type="text"
                  required
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  placeholder="Karim El Fassi"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="res-date" className="block text-xs font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    id="res-date"
                    type="date"
                    value={resDate}
                    onChange={(e) => setResDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="res-time" className="block text-xs font-medium text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    id="res-time"
                    type="time"
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="res-party" className="block text-xs font-medium text-slate-700 mb-1">
                    Party Size
                  </label>
                  <input
                    id="res-party"
                    type="number"
                    min="1"
                    max="24"
                    value={resParty}
                    onChange={(e) => setResParty(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="res-table" className="block text-xs font-medium text-slate-700 mb-1">
                    Table Assignment
                  </label>
                  <input
                    id="res-table"
                    type="text"
                    value={resTable}
                    onChange={(e) => setResTable(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="res-notes" className="block text-xs font-medium text-slate-700 mb-1">
                  Allergies / Special Requests
                </label>
                <input
                  id="res-notes"
                  type="text"
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="High chair needed"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: POS & SALES ORDERS */}
      {subTab === 'pos_sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Synchronized & Imported POS Sales Orders
              </h3>
              <p className="text-xs text-slate-500">
                Protected by idempotency keys (`externalOrderId`) so repeated CSV or API imports never duplicate revenue or theoretical recipe consumption.
              </p>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">External Order ID</th>
                  <th className="py-3 px-4">Menu Item Sold</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Gross Revenue</th>
                  <th className="py-3 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {o.externalOrderId}
                    </td>
                    <td className="py-3 px-4 text-slate-800">{o.dishName}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{o.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatMinorCurrency(o.totalMinor, currency)}
                    </td>
                    <td className="py-3 px-4 font-mono uppercase text-slate-500">{o.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4">
            <form
              onSubmit={handleImportPosOrder}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <ShoppingBag className="w-4 h-4 text-amber-700" />
                <span>Import / Record POS Batch Order</span>
              </div>
              <div>
                <label htmlFor="pos-id" className="block text-xs font-medium text-slate-700 mb-1">
                  Idempotent External POS Order ID
                </label>
                <input
                  id="pos-id"
                  type="text"
                  required
                  value={posExtId}
                  onChange={(e) => setPosExtId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label htmlFor="pos-rec" className="block text-xs font-medium text-slate-700 mb-1">
                  Menu Recipe Item
                </label>
                <select
                  id="pos-rec"
                  value={posRecipeId}
                  onChange={(e) => setPosRecipeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.dishName} ({formatMinorCurrency(r.sellingPriceMinor, currency)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pos-qty" className="block text-xs font-medium text-slate-700 mb-1">
                  Portions Sold
                </label>
                <input
                  id="pos-qty"
                  type="number"
                  min="1"
                  value={posQty}
                  onChange={(e) => setPosQty(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Import Validated POS Order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: REVIEWS & REPUTATION */}
      {subTab === 'reviews' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Reputation Inbox & Human-Approved Reply Workflow
              </h3>
              <p className="text-slate-500">
                AI drafts suggested responses, but public publication requires explicit owner/manager approval.
              </p>
            </div>
            <span className="font-mono text-slate-600">
              Google Business Profile API: Ready for OAuth Token Mapping
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => {
              const currentDraft =
                editedReplies[rev.id] !== undefined ? editedReplies[rev.id] : rev.draftReply;
              return (
                <div
                  key={rev.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-sm">{rev.authorName}</div>
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-600">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span>{rev.rating}.0 / 5.0</span>
                    </div>
                  </div>
                  <div className="text-slate-400 font-mono">
                    Source: {rev.source} · Date: {rev.publishedAt} · Sentiment:{' '}
                    {rev.sentiment.toUpperCase()}
                  </div>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  <div>
                    <label
                      htmlFor={`reply-${rev.id}`}
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Suggested Public Reply ({rev.replyStatus.replace('_', ' ').toUpperCase()})
                    </label>
                    <textarea
                      id={`reply-${rev.id}`}
                      rows={3}
                      value={currentDraft}
                      onChange={(e) =>
                        setEditedReplies({ ...editedReplies, [rev.id]: e.target.value })
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-mono">
                      Status: {rev.replyStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onApproveReviewReply(rev.id, currentDraft);
                        setFeedback(`Approved and published reply to ${rev.authorName}.`);
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Publish Reply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: RESTAURANT WEBSITE BUILDER & BESPOKE SERVICE */}
      {subTab === 'website' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <form
              onSubmit={handleSaveWebsite}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <Globe className="w-4 h-4 text-amber-700" />
                <span>Self-Service Restaurant Website Builder</span>
              </div>

              <div>
                <label htmlFor="wb-head" className="block font-medium text-slate-700 mb-1">
                  Hero Headline
                </label>
                <input
                  id="wb-head"
                  type="text"
                  value={siteHeadline}
                  onChange={(e) => setSiteHeadline(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="wb-sub" className="block font-medium text-slate-700 mb-1">
                  Subheadline & Terroir Story
                </label>
                <textarea
                  id="wb-sub"
                  rows={2}
                  value={siteSubheadline}
                  onChange={(e) => setSiteSubheadline(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wb-hours" className="block font-medium text-slate-700 mb-1">
                    Opening Hours
                  </label>
                  <input
                    id="wb-hours"
                    type="text"
                    value={siteHours}
                    onChange={(e) => setSiteHours(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="wb-dom" className="block font-medium text-slate-700 mb-1">
                    Custom Domain (DNS Verification Required)
                  </label>
                  <input
                    id="wb-dom"
                    type="text"
                    value={siteDomain}
                    onChange={(e) => setSiteDomain(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-slate-600">
                Domain Ownership Status:{' '}
                <strong className="text-amber-700">
                  {website.domainVerified
                    ? 'VERIFIED'
                    : 'PENDING DNS TXT RECORD (_tablepulse-verify)'}
                </strong>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer"
              >
                Update Public Website Configuration
              </button>
            </form>

            {/* Custom Bespoke Website Service */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="font-bold text-slate-900 text-sm">
                  Professionally Built Custom Website Service
                </div>
                <span className="font-mono uppercase font-semibold text-amber-700">
                  Status: {website.bespokeRequestStatus}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {includesCustomWebsiteService
                  ? 'Your Ultra subscription includes 1 bespoke custom website within the standard hospitality scope (up to 5 pages + 2 revision rounds).'
                  : 'Request a custom quote from our hospitality design & engineering team, or upgrade to the Ultra plan where 1 custom website build is included.'}
              </p>
              <textarea
                rows={2}
                value={bespokeNotes}
                onChange={(e) => setBespokeNotes(e.target.value)}
                placeholder="Describe your branding, photography references, and bilingual (FR/AR/EN) menu requirements..."
                aria-label="Custom website project requirements"
                className="w-full p-2.5 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={handleRequestBespokeWebsite}
                className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Submit Custom Website Project Request
              </button>
            </div>
          </div>

          {/* Live Public Microsite Preview */}
          <div className="lg:col-span-6 bg-slate-900 text-white rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono">{siteDomain || 'darzitouna.tablepulse.app'}</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  Live Preview <ExternalLink className="w-3 h-3" />
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">{siteHeadline}</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">{siteSubheadline}</p>

              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Featured Menu & Pricing (Live from Recipe Ledger)
                </div>
                {recipes.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 border-b border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{r.dishName}</div>
                      <div className="text-slate-400">{r.category}</div>
                    </div>
                    <div className="font-mono font-bold text-amber-400">
                      {formatMinorCurrency(r.sellingPriceMinor, currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
              <div>
                <strong className="text-slate-200">Hours:</strong> {siteHours}
              </div>
              <div>
                <strong className="text-slate-200">Address:</strong> {website.address} ·{' '}
                {website.phone}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
