import React, { useState, useEffect } from 'react';
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
  Megaphone,
} from 'lucide-react';
import {
  CopyButton,
  PrintReportButton,
  PrintReportHeader,
  LastUpdatedBadge,
  FormStatusBanner,
  ConfirmDialog,
} from './EnhancementWidgets';

interface GrowthExperienceModuleProps {
  orgId: string;
  orgName?: string;
  branchId: string;
  branchName?: string;
  currency: CurrencyCode;
  includesCustomWebsiteService: boolean;
  initialSubTab?: 'crm' | 'reservations' | 'pos_sales' | 'reviews' | 'website';
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
  orgName = 'Dar Zitouna Hospitality Group',
  branchId,
  branchName = 'Casablanca Maarif Flagship',
  currency,
  includesCustomWebsiteService,
  initialSubTab = 'crm',
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

  // Confirmation Dialogs (#17)
  const [reservationToCancel, setReservationToCancel] = useState<ReservationRecord | null>(null);
  const [confirmTogglePublish, setConfirmTogglePublish] = useState(false);

  // CRM State
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custConsent, setCustConsent] = useState(true);
  const [custDietary, setCustDietary] = useState('');

  // Reservation State
  const [resName, setResName] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resDate, setResDate] = useState('2026-10-21');
  const [resTime, setResTime] = useState('20:30');
  const [resParty, setResParty] = useState('4');
  const [resTable, setResTable] = useState('T-08');
  const [resNotes, setResNotes] = useState('');

  // POS Order Import State
  const [posExtId, setPosExtId] = useState('LIGHTS-2026-8841');
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
  const [siteAnnouncementText, setSiteAnnouncementText] = useState(
    website.siteAnnouncementText || ''
  );
  const [siteAnnouncementEnabled, setSiteAnnouncementEnabled] = useState(
    Boolean(website.siteAnnouncementEnabled)
  );

  const latestGrowthUpdatedAt =
    website.updatedAt ||
    reservations[0]?.updatedAt ||
    customers[0]?.updatedAt ||
    '2026-10-21T08:00:00.000Z';

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custEmail.trim()) {
      setStatusBanner({
        status: 'error',
        message: 'Guest full name and email address are required.',
      });
      return;
    }
    // Deduplication check by email
    if (customers.some((c) => c.email.toLowerCase() === custEmail.trim().toLowerCase())) {
      setStatusBanner({
        status: 'error',
        message: 'Deduplication Guard: A customer with this email already exists in your directory.',
        nextStep: 'Log a new dining visit on the existing guest profile instead.',
      });
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
    setStatusBanner({
      status: 'success',
      message: `Added customer "${newCust.name}" to CRM directory.`,
      nextStep: 'Guest profile is now available for reservation matching and visit logging.',
    });
  };

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim()) {
      setStatusBanner({
        status: 'error',
        message: 'Guest name is required to confirm a table booking.',
      });
      return;
    }

    // Conflict check for same table, date, and time
    const hasConflict = reservations.some(
      (r) =>
        r.date === resDate &&
        r.time === resTime &&
        r.tableNumber.toLowerCase() === resTable.trim().toLowerCase() &&
        r.status !== 'cancelled'
    );
    if (hasConflict) {
      setStatusBanner({
        status: 'error',
        message: `Table Conflict Warning: Table ${resTable} is already booked on ${resDate} at ${resTime}.`,
        nextStep: 'Select another table assignment or adjust the reservation time.',
      });
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
    setStatusBanner({
      status: 'success',
      message: `Confirmed reservation for ${newRes.customerName} (${newRes.partySize} guests) at Table ${newRes.tableNumber}.`,
    });
  };

  const handleImportPosOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posExtId.trim()) return;

    // Idempotency / duplicate external Order ID check
    if (orders.some((o) => o.externalOrderId === posExtId.trim())) {
      setStatusBanner({
        status: 'error',
        message: `Idempotency Protection: External POS Order ID "${posExtId.trim()}" has already been imported.`,
        nextStep: 'Duplicate POS order rejected so revenue and recipe consumption are never double-counted.',
      });
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
    setStatusBanner({
      status: 'success',
      message: `Imported POS Order ${newOrder.externalOrderId}: ${qty}× ${rec.dishName} (${formatMinorCurrency(totalMinor, currency)}).`,
      nextStep: 'Theoretical ingredient consumption has been updated in the variance engine.',
    });
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
      siteAnnouncementText: siteAnnouncementText.trim(),
      siteAnnouncementEnabled,
      updatedAt: new Date().toISOString(),
    };
    onUpdateWebsiteConfig(updated);
    setStatusBanner({
      status: 'success',
      message: 'Saved website builder configuration and microsite announcement bar.',
      nextStep: 'Custom domain requires DNS TXT ownership verification before live routing.',
    });
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
    setStatusBanner({
      status: 'success',
      message: includesCustomWebsiteService
        ? 'Submitted custom website build request under your Ultra plan entitlement.'
        : 'Submitted custom website service request for administrator quote approval.',
    });
  };

  const publicSiteUrl = `https://${siteDomain || 'darzitouna.tablepulse.app'}`;

  return (
    <div className="space-y-6">
      <PrintReportHeader
        reportTitle="Guest CRM, Reservations, POS Sales & Reputation Report"
        orgName={orgName}
        branchName={branchName}
        currency={currency}
        lastUpdated={latestGrowthUpdatedAt}
        activeFilterSummary={`Active Tab: ${subTab.toUpperCase()}`}
      />

      {/* Confirmation Dialog: Cancel Reservation */}
      <ConfirmDialog
        open={Boolean(reservationToCancel)}
        title={`Cancel Reservation for ${reservationToCancel?.customerName || 'Guest'}?`}
        description={`You are canceling the booking for ${reservationToCancel?.customerName} (${reservationToCancel?.partySize} guests) on ${reservationToCancel?.date} at ${reservationToCancel?.time} (Table ${reservationToCancel?.tableNumber}).`}
        consequenceNote="Table assignment will be released for new bookings. The cancellation record remains in the reservation log."
        irreversible={false}
        confirmLabel="Confirm Cancellation"
        onCancel={() => setReservationToCancel(null)}
        onConfirm={() => {
          if (reservationToCancel) {
            onUpdateReservationStatus(reservationToCancel.id, 'cancelled');
            setStatusBanner({
              status: 'success',
              message: `Cancelled reservation for ${reservationToCancel.customerName} (Table ${reservationToCancel.tableNumber} released).`,
            });
          }
          setReservationToCancel(null);
        }}
      />

      {/* Confirmation Dialog: Publish / Unpublish Website */}
      <ConfirmDialog
        open={confirmTogglePublish}
        title={website.published ? 'Unpublish Public Restaurant Website?' : 'Publish Restaurant Website Live?'}
        description={
          website.published
            ? `Unpublishing will place ${publicSiteUrl} into maintenance mode for public visitors.`
            : `Publishing will make your menu, hours, and reservation widget publicly accessible at ${publicSiteUrl}.`
        }
        consequenceNote="Changes take effect immediately on your public microsite."
        irreversible={false}
        confirmLabel={website.published ? 'Unpublish Website' : 'Publish Website Live'}
        onCancel={() => setConfirmTogglePublish(false)}
        onConfirm={() => {
          const updated: WebsiteConfig = {
            ...website,
            published: !website.published,
            updatedAt: new Date().toISOString(),
          };
          onUpdateWebsiteConfig(updated);
          setStatusBanner({
            status: 'success',
            message: updated.published
              ? `Published restaurant website live at ${publicSiteUrl}.`
              : 'Unpublished restaurant website (now in draft mode).',
          });
          setConfirmTogglePublish(false);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E1E6E1] no-print">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFF2ED] rounded-xl border border-[#E1E6E1]">
          <button
            type="button"
            onClick={() => setSubTab('crm')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'crm'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Customer CRM ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('reservations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'reservations'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Tables & Reservations ({reservations.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pos_sales')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'pos_sales'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            POS & Sales Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('reviews')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'reviews'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Reviews & Reputation ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('website')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'website'
                ? 'bg-white text-[#18231F] shadow-xs border border-[#E1E6E1]'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Website Builder & Custom Service
          </button>
        </div>

        <div className="flex items-center gap-3">
          <LastUpdatedBadge timestamp={latestGrowthUpdatedAt} label="Growth Records Updated" />
          <PrintReportButton label="Print Growth Report" />
        </div>
      </div>

      <FormStatusBanner
        status={statusBanner.status}
        message={statusBanner.message}
        nextStep={statusBanner.nextStep}
        onDismiss={() => setStatusBanner({ status: null, message: null })}
      />

      {/* TAB 1: CUSTOMER CRM */}
      {subTab === 'crm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
            <div className="p-4 border-b border-[#E1E6E1]">
              <h3 className="text-sm font-bold text-[#18231F]">
                Customer Directory & Verified Visit History
              </h3>
              <p className="text-xs text-[#68736D]">
                Customers, orders, reservations, and physical visits are tracked distinctly with explicit source attribution.
              </p>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#EFF2ED]">
                <tr className="border-b border-[#E1E6E1] bg-[#EFF2ED] text-[#68736D] font-semibold">
                  <th className="py-3 px-4">Guest Name & Contact</th>
                  <th className="py-3 px-4">Dietary / Staff Notes</th>
                  <th className="py-3 px-4 text-right">Verified Visits</th>
                  <th className="py-3 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3 px-4 text-right no-print">Record Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6E1]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F7F8F5] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#18231F]">{c.name}</div>
                      <div className="text-[#68736D] font-mono flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{c.email}</span>
                        <CopyButton text={c.email} label="Email" compact />
                        <span>· {c.phone}</span>
                        <CopyButton text={c.phone} label="Phone" compact />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#68736D]">
                      <div className="text-[#18231F]">{c.dietaryNotes}</div>
                      <div className="text-[#68736D]">
                        Consent: {c.marketingConsent ? 'Opted In' : 'Restricted'} · Source: {c.source}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18231F]">
                      {c.visitsCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18231F]">
                      {formatMinorCurrency(c.totalSpendMinor, currency)}
                    </td>
                    <td className="py-3 px-4 text-right no-print">
                      <button
                        type="button"
                        onClick={() => {
                          onRecordCustomerVisit(c.id, 42000);
                          setStatusBanner({
                            status: 'success',
                            message: `Recorded completed dining visit (+420.00 ${currency}) for ${c.name}.`,
                          });
                        }}
                        className="px-2.5 py-1 bg-[#176B58] hover:bg-[#115644] text-white rounded-md text-xs font-semibold cursor-pointer transition-colors"
                      >
                        + Log Visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4 no-print">
            <form
              onSubmit={handleCreateCustomer}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <Users className="w-4 h-4 text-[#176B58]" />
                <span>Add Guest Profile</span>
              </div>
              <div>
                <label htmlFor="c-name" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Guest Full Name
                </label>
                <input
                  id="c-name"
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Nadia Kettani"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="c-email" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Email (Deduplicated)
                </label>
                <input
                  id="c-email"
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="nadia.kettani@domain.ma"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="c-phone" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Phone Number
                </label>
                <input
                  id="c-phone"
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+212 661-000000"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                />
              </div>
              <div>
                <label htmlFor="c-notes" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Allergen & Seating Notes
                </label>
                <input
                  id="c-notes"
                  type="text"
                  value={custDietary}
                  onChange={(e) => setCustDietary(e.target.value)}
                  placeholder="Gluten-free bread preference"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#18231F]">
                <input
                  type="checkbox"
                  checked={custConsent}
                  onChange={(e) => setCustConsent(e.target.checked)}
                />
                <span>Explicit marketing & communication consent</span>
              </label>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#EFF2ED]">
                <tr className="border-b border-[#E1E6E1] bg-[#EFF2ED] text-[#68736D] font-semibold">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Guest & Party</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Special Requests</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6E1]">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F7F8F5] transition-colors">
                    <td className="py-3 px-4 font-mono">
                      {r.date} · <strong>{r.time}</strong>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#18231F]">
                        {r.customerName} ({r.partySize} pax)
                      </div>
                      <div className="text-[#68736D] font-mono flex items-center gap-2">
                        <span>{r.customerPhone}</span>
                        <CopyButton text={r.customerPhone} label="Phone" compact />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#18231F]">
                      {r.tableNumber}
                    </td>
                    <td className="py-3 px-4 text-[#68736D]">{r.specialRequests}</td>
                    <td className="py-3 px-4 font-mono uppercase font-semibold text-[#18231F]">
                      {r.status}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 no-print">
                      {r.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateReservationStatus(r.id, 'seated')}
                          className="px-2.5 py-1 bg-[#176B58] hover:bg-[#115644] text-white rounded-md text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Seat
                        </button>
                      )}
                      {r.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => setReservationToCancel(r)}
                          className="px-2.5 py-1 bg-[#EFF2ED] hover:bg-red-100 text-[#18231F] hover:text-red-800 rounded-md text-xs font-semibold cursor-pointer transition-colors"
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

          <div className="lg:col-span-4 no-print">
            <form
              onSubmit={handleCreateReservation}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <Calendar className="w-4 h-4 text-[#176B58]" />
                <span>Book Table Reservation</span>
              </div>
              <div>
                <label htmlFor="res-name" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Guest Name
                </label>
                <input
                  id="res-name"
                  type="text"
                  required
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  placeholder="Karim El Fassi"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="res-date" className="block text-xs font-semibold text-[#18231F] mb-1">
                    Date
                  </label>
                  <input
                    id="res-date"
                    type="date"
                    value={resDate}
                    onChange={(e) => setResDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="res-time" className="block text-xs font-semibold text-[#18231F] mb-1">
                    Time
                  </label>
                  <input
                    id="res-time"
                    type="time"
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="res-party" className="block text-xs font-semibold text-[#18231F] mb-1">
                    Party Size
                  </label>
                  <input
                    id="res-party"
                    type="number"
                    min="1"
                    max="24"
                    value={resParty}
                    onChange={(e) => setResParty(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="res-table" className="block text-xs font-semibold text-[#18231F] mb-1">
                    Table Assignment
                  </label>
                  <input
                    id="res-table"
                    type="text"
                    value={resTable}
                    onChange={(e) => setResTable(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="res-notes" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Allergies / Special Requests
                </label>
                <input
                  id="res-notes"
                  type="text"
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="High chair needed"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
            <div className="p-4 border-b border-[#E1E6E1]">
              <h3 className="text-sm font-bold text-[#18231F]">
                Synchronized & Imported POS Sales Orders
              </h3>
              <p className="text-xs text-[#68736D]">
                Protected by idempotency keys (`externalOrderId`) so repeated CSV or API imports never duplicate revenue or theoretical recipe consumption.
              </p>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#EFF2ED]">
                <tr className="border-b border-[#E1E6E1] bg-[#EFF2ED] text-[#68736D] font-semibold">
                  <th className="py-3 px-4">External Order ID</th>
                  <th className="py-3 px-4">Menu Item Sold</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Gross Revenue</th>
                  <th className="py-3 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6E1]">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F7F8F5] transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#18231F]">
                      <div className="flex items-center gap-2">
                        <span>{o.externalOrderId}</span>
                        <CopyButton text={o.externalOrderId} label="Order ID" compact />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#18231F]">{o.dishName}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{o.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18231F]">
                      {formatMinorCurrency(o.totalMinor, currency)}
                    </td>
                    <td className="py-3 px-4 font-mono uppercase text-[#68736D]">{o.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4 no-print">
            <form
              onSubmit={handleImportPosOrder}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <ShoppingBag className="w-4 h-4 text-[#176B58]" />
                <span>Import / Record POS Batch Order</span>
              </div>
              <div>
                <label htmlFor="pos-id" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Idempotent External POS Order ID
                </label>
                <input
                  id="pos-id"
                  type="text"
                  required
                  value={posExtId}
                  onChange={(e) => setPosExtId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                />
              </div>
              <div>
                <label htmlFor="pos-rec" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Menu Recipe Item
                </label>
                <select
                  id="pos-rec"
                  value={posRecipeId}
                  onChange={(e) => setPosRecipeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.dishName} ({formatMinorCurrency(r.sellingPriceMinor, currency)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pos-qty" className="block text-xs font-semibold text-[#18231F] mb-1">
                  Portions Sold
                </label>
                <input
                  id="pos-qty"
                  type="number"
                  min="1"
                  value={posQty}
                  onChange={(e) => setPosQty(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
          <div className="bg-white p-4 rounded-xl border border-[#E1E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="text-sm font-bold text-[#18231F]">
                Reputation Inbox & Human-Approved Reply Workflow
              </h3>
              <p className="text-[#68736D]">
                AI drafts suggested responses, but public publication requires explicit owner/manager approval.
              </p>
            </div>
            <span className="font-mono text-[#176B58] font-medium">
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
                  className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#18231F] text-sm">{rev.authorName}</div>
                    <div className="flex items-center gap-1 font-mono font-bold text-[#176B58]">
                      <Star className="w-4 h-4 fill-[#176B58] text-[#176B58]" />
                      <span>{rev.rating}.0 / 5.0</span>
                    </div>
                  </div>
                  <div className="text-[#68736D] font-mono">
                    Source: {rev.source} · Date: {rev.publishedAt} · Sentiment:{' '}
                    {rev.sentiment.toUpperCase()}
                  </div>
                  <p className="text-[#18231F] leading-relaxed bg-[#F7F8F5] p-3 rounded-lg border border-[#E1E6E1]">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor={`reply-${rev.id}`}
                        className="font-semibold text-[#18231F]"
                      >
                        Suggested Public Reply ({rev.replyStatus.replace('_', ' ').toUpperCase()})
                      </label>
                      <CopyButton text={currentDraft} label="Copy Reply" compact />
                    </div>
                    <textarea
                      id={`reply-${rev.id}`}
                      rows={3}
                      value={currentDraft}
                      onChange={(e) =>
                        setEditedReplies({ ...editedReplies, [rev.id]: e.target.value })
                      }
                      className="w-full p-2.5 border border-[#E1E6E1] rounded-lg text-[#18231F]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#68736D] font-mono">Status: {rev.replyStatus}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onApproveReviewReply(rev.id, currentDraft);
                        setStatusBanner({
                          status: 'success',
                          message: `Approved and published reply to ${rev.authorName}.`,
                        });
                      }}
                      className="px-3 py-1.5 bg-[#176B58] hover:bg-[#115644] text-white font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors no-print"
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
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E1E6E1]">
                <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm">
                  <Globe className="w-4 h-4 text-[#176B58]" />
                  <span>Self-Service Restaurant Website Builder</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmTogglePublish(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    website.published
                      ? 'bg-[#E6F0E9] text-[#176B58] hover:bg-[#d5e6da]'
                      : 'bg-[#EFF2ED] text-[#18231F] hover:bg-[#E1E6E1]'
                  }`}
                >
                  {website.published ? 'Published Live (Click to Unpublish)' : 'Draft Mode (Click to Publish)'}
                </button>
              </div>

              <div>
                <label htmlFor="wb-head" className="block font-semibold text-[#18231F] mb-1">
                  Hero Headline
                </label>
                <input
                  id="wb-head"
                  type="text"
                  value={siteHeadline}
                  onChange={(e) => setSiteHeadline(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#E1E6E1] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="wb-sub" className="block font-semibold text-[#18231F] mb-1">
                  Subheadline & Terroir Story
                </label>
                <textarea
                  id="wb-sub"
                  rows={2}
                  value={siteSubheadline}
                  onChange={(e) => setSiteSubheadline(e.target.value)}
                  className="w-full p-2.5 border border-[#E1E6E1] rounded-lg"
                />
              </div>

              {/* Restaurant-Site Announcement Banner Config (Feature #2) */}
              <div className="p-3 rounded-lg bg-[#E6F0E9]/70 border border-[#176B58]/25 space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="wb-ann"
                    className="font-semibold text-[#18231F] inline-flex items-center gap-1.5"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-[#176B58]" />
                    <span>Public Restaurant Announcement Bar</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[#18231F] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteAnnouncementEnabled}
                      onChange={(e) => setSiteAnnouncementEnabled(e.target.checked)}
                    />
                    <span>Show on Microsite</span>
                  </label>
                </div>
                <input
                  id="wb-ann"
                  type="text"
                  value={siteAnnouncementText}
                  onChange={(e) => setSiteAnnouncementText(e.target.value)}
                  placeholder="e.g. Autumn Truffle & Wild Sea Bass Tasting Menu — Reserve for Friday Evening"
                  className="w-full px-3 py-1.5 border border-[#E1E6E1] rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wb-hours" className="block font-semibold text-[#18231F] mb-1">
                    Opening Hours
                  </label>
                  <input
                    id="wb-hours"
                    type="text"
                    value={siteHours}
                    onChange={(e) => setSiteHours(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E1E6E1] rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="wb-dom" className="block font-semibold text-[#18231F] mb-1">
                    Custom Domain (DNS Verification Required)
                  </label>
                  <input
                    id="wb-dom"
                    type="text"
                    value={siteDomain}
                    onChange={(e) => setSiteDomain(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#F7F8F5] rounded-lg border border-[#E1E6E1] font-mono text-[#68736D] flex items-center justify-between gap-2">
                <span>
                  Domain Ownership Status:{' '}
                  <strong className="text-[#176B58]">
                    {website.domainVerified
                      ? 'VERIFIED'
                      : 'PENDING DNS TXT RECORD (_tablepulse-verify)'}
                  </strong>
                </span>
                <CopyButton text={publicSiteUrl} label="Copy URL" compact />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Update Public Website Configuration
              </button>
            </form>

            {/* Custom Bespoke Website Service */}
            <div className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E1E6E1]">
                <div className="font-bold text-[#18231F] text-sm">
                  Professionally Built Custom Website Service
                </div>
                <span className="font-mono uppercase font-semibold text-[#176B58]">
                  Status: {website.bespokeRequestStatus}
                </span>
              </div>
              <p className="text-[#68736D] leading-relaxed">
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
                className="w-full p-2.5 border border-[#E1E6E1] rounded-lg"
              />
              <button
                type="button"
                onClick={handleRequestBespokeWebsite}
                className="w-full py-2 px-4 bg-[#18231F] hover:bg-[#176B58] text-white font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Submit Custom Website Project Request
              </button>
            </div>
          </div>

          {/* Live Public Microsite Preview */}
          <div className="lg:col-span-6 bg-[#141A18] text-[#F0F3F0] rounded-xl p-6 border border-[#303A35] flex flex-col justify-between">
            <div>
              {siteAnnouncementEnabled && siteAnnouncementText.trim() && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-[#176B58]/25 border border-[#58B99A]/40 text-[#E6F0E9] text-xs flex items-center gap-2">
                  <Megaphone className="w-3.5 h-3.5 text-[#58B99A] shrink-0" />
                  <span>{siteAnnouncementText}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#303A35] text-xs text-[#B4C0B8]">
                <span className="font-mono">{siteDomain || 'darzitouna.tablepulse.app'}</span>
                <span className="inline-flex items-center gap-1 text-[#58B99A] font-medium">
                  {website.published ? 'Live Microsite Preview' : 'Draft Preview'}{' '}
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">{siteHeadline}</h2>
              <p className="text-sm text-[#B4C0B8] leading-relaxed mb-6">{siteSubheadline}</p>

              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#58B99A]">
                  Featured Menu & Pricing (Live from Recipe Ledger)
                </div>
                {recipes.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2.5 border-b border-[#303A35] text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{r.dishName}</div>
                      <div className="text-[#B4C0B8]">{r.category}</div>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-[#58B99A]">
                      {formatMinorCurrency(r.sellingPriceMinor, currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#303A35] text-xs text-[#B4C0B8] space-y-1">
              <div>
                <strong className="text-white">Hours:</strong> {siteHours}
              </div>
              <div>
                <strong className="text-white">Address:</strong> {website.address} ·{' '}
                {website.phone}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
