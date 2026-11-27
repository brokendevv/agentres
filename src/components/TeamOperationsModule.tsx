import React, { useState, useEffect } from 'react';
import {
  TipRecord,
  Member,
  TaskRecord,
  MeetingRecord,
  ChatMessage,
  ChecklistItem,
} from '../domain/types';
import {
  CurrencyCode,
  TipPoolRule,
  toMinorUnits,
  formatMinorCurrency,
  calculateTipDistribution,
} from '../domain/calculations';
import {
  Coins,
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  ClipboardCheck,
  ArrowRight,
  Plus,
  UserMinus,
} from 'lucide-react';
import {
  CopyButton,
  PrintReportButton,
  PrintReportHeader,
  LastUpdatedBadge,
  FormStatusBanner,
  ConfirmDialog,
} from './EnhancementWidgets';

interface TeamOperationsModuleProps {
  orgId: string;
  orgName?: string;
  branchId: string;
  branchName?: string;
  currency: CurrencyCode;
  actorUid: string;
  actorName: string;
  actorRole: string;
  canAddStaff: boolean;
  initialSubTab?: 'tips' | 'staff' | 'meetings_tasks' | 'chat' | 'checklists';
  tips: TipRecord[];
  members: Member[];
  tasks: TaskRecord[];
  meetings: MeetingRecord[];
  messages: ChatMessage[];
  checklists: ChecklistItem[];
  onRecordTip: (tip: TipRecord) => void;
  onUpdateTipStatus: (tipId: string, status: 'allocated' | 'paid_out') => void;
  onInviteMember: (member: Member) => void;
  onRemoveMember?: (memberId: string) => void;
  onCreateTask: (task: TaskRecord) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onCreateMeeting: (meeting: MeetingRecord, generatedTask?: TaskRecord) => void;
  onSendMessage: (msg: ChatMessage) => void;
  onToggleChecklist: (itemId: string) => void;
}

export const TeamOperationsModule: React.FC<TeamOperationsModuleProps> = ({
  orgId,
  orgName = 'Dar Zitouna Hospitality Group',
  branchId,
  branchName = 'Casablanca Maarif Flagship',
  currency,
  actorUid,
  actorName,
  actorRole,
  canAddStaff,
  initialSubTab = 'tips',
  tips,
  members,
  tasks,
  meetings,
  messages,
  checklists,
  onRecordTip,
  onUpdateTipStatus,
  onInviteMember,
  onRemoveMember,
  onCreateTask,
  onToggleTaskStatus,
  onCreateMeeting,
  onSendMessage,
  onToggleChecklist,
}) => {
  const [subTab, setSubTab] = useState<
    'tips' | 'staff' | 'meetings_tasks' | 'chat' | 'checklists'
  >(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [poolRule, setPoolRule] = useState<TipPoolRule>('foh_70_boh_30');
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [statusBanner, setStatusBanner] = useState<{
    status: 'success' | 'error' | 'pending' | null;
    message: string | null;
    nextStep?: string;
  }>({ status: null, message: null });

  // Confirm Dialog for Staff Removal / Suspension
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  // Tip form state
  const [tipMajor, setTipMajor] = useState('650.00');
  const [tipShift, setTipShift] = useState<'morning' | 'afternoon' | 'evening' | 'late'>('evening');
  const [tipEmployee, setTipEmployee] = useState('Evening Shift Pool');
  const [tipMethod, setTipMethod] = useState<'cash' | 'card' | 'pooled'>('card');
  const [tipNotes, setTipNotes] = useState('');

  // Staff invite form
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'manager' | 'finance' | 'inventory' | 'staff'>('staff');

  // Meeting & Task form
  const [mtgTitle, setMtgTitle] = useState('');
  const [mtgDate] = useState('2026-10-21');
  const [mtgTime] = useState('16:00');
  const [mtgAgenda, setMtgAgenda] = useState('');
  const [mtgDecisions, setMtgDecisions] = useState('');
  const [mtgActionTitle, setMtgActionTitle] = useState('');
  const [mtgActionAssignee, setMtgActionAssignee] = useState(
    members[0]?.displayName || 'Amina Benali'
  );

  // Standalone task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee] = useState(members[0]?.displayName || 'Karim Tazi');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('2026-10-22');

  // Chat state
  const [activeChannel, setActiveChannel] = useState<
    'general' | 'kitchen' | 'front_of_house' | 'purchasing' | 'managers'
  >('general');
  const [chatBody, setChatBody] = useState('');

  const tipSummary = calculateTipDistribution({
    tips: tips.map((t) => ({ amountMinor: t.amountMinor, status: t.status })),
    rule: poolRule,
    fohStaffCount: Math.max(1, members.filter((m) => m.role !== 'inventory').length),
    bohStaffCount: Math.max(1, members.filter((m) => m.role === 'inventory').length),
  });

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'open') return t.status !== 'completed';
    if (taskFilter === 'completed') return t.status === 'completed';
    return true;
  });

  const latestTeamUpdatedAt =
    tips[0]?.updatedAt ||
    tasks[0]?.updatedAt ||
    members[0]?.updatedAt ||
    '2026-10-21T08:00:00.000Z';

  const handleAddTip = (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = toMinorUnits(Number(tipMajor) || 0);
    if (amountMinor <= 0) {
      setStatusBanner({
        status: 'error',
        message: 'Tip amount must be greater than zero.',
        nextStep: 'Enter a valid positive shift gratuity amount.',
      });
      return;
    }
    const now = new Date().toISOString();
    const newTip: TipRecord = {
      id: `tip_${Date.now()}`,
      orgId,
      branchId,
      amountMinor,
      currency,
      shift: tipShift,
      date: now.slice(0, 10),
      employeeName: tipEmployee.trim() || 'Shift Team',
      paymentMethod: tipMethod,
      status: 'collected',
      poolRule,
      notes: tipNotes.trim() || 'Recorded shift gratuity',
      recordedBy: actorUid,
      createdAt: now,
      updatedAt: now,
    };
    onRecordTip(newTip);
    setTipNotes('');
    setStatusBanner({
      status: 'success',
      message: `Recorded ${formatMinorCurrency(amountMinor, currency)} in ${tipShift} shift tips (Status: COLLECTED).`,
      nextStep: 'Review and allocate or mark paid out from the tip table.',
    });
  };

  const handleInviteStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddStaff) {
      setStatusBanner({
        status: 'error',
        message: 'Plan staff seat limit reached.',
        nextStep: 'Upgrade your subscription tier in Billing to invite more staff.',
      });
      return;
    }
    if (!staffName.trim() || !staffEmail.trim()) {
      setStatusBanner({
        status: 'error',
        message: 'Employee name and email address are required.',
      });
      return;
    }
    const now = new Date().toISOString();
    const newMember: Member = {
      id: `staff_${Date.now()}`,
      uid: `staff_${Date.now()}`,
      orgId,
      email: staffEmail.trim(),
      displayName: staffName.trim(),
      role: staffRole,
      branchId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    onInviteMember(newMember);
    setStaffName('');
    setStaffEmail('');
    setStatusBanner({
      status: 'success',
      message: `Authorized ${newMember.displayName} (${newMember.role}) in ${orgName}.`,
      nextStep: 'Copy their workspace invite code or email from the directory.',
    });
  };

  const handleCreateMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mtgTitle.trim()) return;
    const now = new Date().toISOString();
    const mtgId = `mtg_${Date.now()}`;
    const newMtg: MeetingRecord = {
      id: mtgId,
      orgId,
      branchId,
      title: mtgTitle.trim(),
      date: mtgDate,
      time: mtgTime,
      participants: members.map((m) => m.displayName).join(', '),
      agenda: mtgAgenda.trim() || 'Operational review',
      decisions: mtgDecisions.trim() || 'Recorded in meeting minutes',
      actionItemSummary: mtgActionTitle.trim() || 'None',
      createdBy: actorUid,
      createdAt: now,
      updatedAt: now,
    };

    let followUpTask: TaskRecord | undefined;
    if (mtgActionTitle.trim()) {
      followUpTask = {
        id: `tsk_mtg_${Date.now()}`,
        orgId,
        branchId,
        title: mtgActionTitle.trim(),
        description: `Created automatically from meeting "${newMtg.title}" decision: ${newMtg.decisions}`,
        assigneeName: mtgActionAssignee,
        priority: 'high',
        status: 'todo',
        dueDate: mtgDate,
        linkedModule: 'meeting',
        linkedRecordId: mtgId,
        createdBy: actorUid,
        createdAt: now,
        updatedAt: now,
      };
    }

    onCreateMeeting(newMtg, followUpTask);
    setMtgTitle('');
    setMtgAgenda('');
    setMtgDecisions('');
    setMtgActionTitle('');
    setStatusBanner({
      status: 'success',
      message: followUpTask
        ? `Saved meeting "${newMtg.title}" and created persistent assigned task for ${followUpTask.assigneeName}.`
        : `Saved meeting "${newMtg.title}".`,
    });
  };

  const handleAddStandaloneTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const now = new Date().toISOString();
    const newTask: TaskRecord = {
      id: `tsk_${Date.now()}`,
      orgId,
      branchId,
      title: taskTitle.trim(),
      description: 'Assigned via operational task board.',
      assigneeName: taskAssignee,
      priority: taskPriority,
      status: 'todo',
      dueDate: taskDueDate,
      linkedModule: 'general',
      linkedRecordId: '',
      createdBy: actorUid,
      createdAt: now,
      updatedAt: now,
    };
    onCreateTask(newTask);
    setTaskTitle('');
    setStatusBanner({
      status: 'success',
      message: `Created task "${newTask.title}" assigned to ${newTask.assigneeName}.`,
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatBody.trim()) return;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      orgId,
      channel: activeChannel,
      senderUid: actorUid,
      senderName: actorName,
      senderRole: actorRole,
      body: chatBody.trim(),
      createdAt: new Date().toISOString(),
    };
    onSendMessage(msg);
    setChatBody('');
  };

  return (
    <div className="space-y-6">
      <PrintReportHeader
        reportTitle="Team Operations, Gratuity Pool & Task Report"
        orgName={orgName}
        branchName={branchName}
        currency={currency}
        lastUpdated={latestTeamUpdatedAt}
        activeFilterSummary={`Active Tab: ${subTab.toUpperCase()}`}
      />

      <ConfirmDialog
        open={Boolean(memberToRemove)}
        title={`Revoke Workspace Access for ${memberToRemove?.displayName || 'Staff Member'}?`}
        description={`You are removing ${memberToRemove?.displayName} (${memberToRemove?.email}) with role "${memberToRemove?.role}" from ${orgName}.`}
        consequenceNote="This staff member will immediately lose access to tenant records under Master Gate Firestore rules. Past audit logs and attributed checklists remain preserved."
        irreversible={false}
        confirmLabel="Confirm Access Revocation"
        onCancel={() => setMemberToRemove(null)}
        onConfirm={() => {
          if (memberToRemove && onRemoveMember) {
            onRemoveMember(memberToRemove.id);
            setStatusBanner({
              status: 'success',
              message: `Revoked active workspace membership for ${memberToRemove.displayName} (${memberToRemove.email}).`,
              nextStep: 'Recorded in the immutable organization audit log.',
            });
          }
          setMemberToRemove(null);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E1E6E1] no-print">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFF2ED] rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('tips')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'tips' ? 'bg-white text-[#18231F] shadow-xs' : 'text-[#68736D]'
            }`}
          >
            Tips & Pool Distribution ({tips.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('staff')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'staff' ? 'bg-white text-[#18231F] shadow-xs' : 'text-[#68736D]'
            }`}
          >
            Staff & RBAC Roles ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('meetings_tasks')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'meetings_tasks' ? 'bg-white text-[#18231F] shadow-xs' : 'text-[#68736D]'
            }`}
          >
            Meetings & Action Tasks ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('chat')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'chat' ? 'bg-white text-[#18231F] shadow-xs' : 'text-[#68736D]'
            }`}
          >
            Team Channels ({messages.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('checklists')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'checklists' ? 'bg-white text-[#18231F] shadow-xs' : 'text-[#68736D]'
            }`}
          >
            Daily Checklists ({checklists.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <LastUpdatedBadge timestamp={latestTeamUpdatedAt} label="Team Ledger Updated" />
          <PrintReportButton label="Print Team Report" />
        </div>
      </div>

      <FormStatusBanner
        status={statusBanner.status}
        message={statusBanner.message}
        nextStep={statusBanner.nextStep}
        onDismiss={() => setStatusBanner({ status: null, message: null })}
      />

      {/* TAB 1: TIPS & DISTRIBUTION */}
      {subTab === 'tips' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-[#E1E6E1]">
                <span className="text-xs text-[#68736D] block">Total Collected</span>
                <span className="text-lg font-bold font-mono tabular-nums text-[#18231F]">
                  {formatMinorCurrency(tipSummary.collectedMinor, currency)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E1E6E1]">
                <span className="text-xs text-[#68736D] block">Allocated</span>
                <span className="text-lg font-bold font-mono tabular-nums text-[#18231F]">
                  {formatMinorCurrency(tipSummary.allocatedMinor, currency)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E1E6E1]">
                <span className="text-xs text-[#68736D] block">Paid Out</span>
                <span className="text-lg font-bold font-mono tabular-nums text-[#176B58]">
                  {formatMinorCurrency(tipSummary.paidOutMinor, currency)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E1E6E1]">
                <span className="text-xs text-[#68736D] block">Awaiting Distribution</span>
                <span className="text-lg font-bold font-mono tabular-nums text-[#18231F]">
                  {formatMinorCurrency(tipSummary.awaitingDistributionMinor, currency)}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E1E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-bold text-[#18231F]">
                  Pool Distribution Preview (
                  {poolRule === 'foh_70_boh_30'
                    ? '70% FOH / 30% BOH'
                    : poolRule === 'equal_split'
                      ? 'Equal Split'
                      : 'Individual'}
                  )
                </div>
                <div className="text-[#68736D] font-mono mt-1">
                  FOH Pool Share: {formatMinorCurrency(tipSummary.fohShareTotalMinor, currency)} ·
                  BOH Pool Share: {formatMinorCurrency(tipSummary.bohShareTotalMinor, currency)}
                </div>
              </div>
              <select
                aria-label="Tip Pool Distribution Rule"
                value={poolRule}
                onChange={(e) => setPoolRule(e.target.value as TipPoolRule)}
                className="px-3 py-1.5 border border-[#E1E6E1] rounded-lg bg-white font-medium no-print"
              >
                <option value="foh_70_boh_30">70% Front-of-House / 30% Back-of-House</option>
                <option value="equal_split">Equal All-Team Split</option>
                <option value="individual">Direct Individual Attribution</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#F7F8F5]">
                  <tr className="border-b border-[#E1E6E1] text-[#68736D] font-semibold">
                    <th className="py-3 px-4">Date & Shift</th>
                    <th className="py-3 px-4">Recipient / Pool</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4 text-right no-print">Approval Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E6E1]">
                  {tips.map((t) => (
                    <tr key={t.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="py-3 px-4 font-mono">
                        {t.date} · <span className="uppercase">{t.shift}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#18231F]">{t.employeeName}</div>
                        <div className="text-[#68736D]">{t.notes}</div>
                      </td>
                      <td className="py-3 px-4 font-mono uppercase text-[#68736D]">
                        {t.paymentMethod}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18231F]">
                        {formatMinorCurrency(t.amountMinor, currency)}
                      </td>
                      <td className="py-3 px-4 font-mono uppercase text-[#176B58] font-semibold">
                        {t.status}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 no-print">
                        {t.status === 'collected' && (
                          <button
                            type="button"
                            onClick={() => onUpdateTipStatus(t.id, 'allocated')}
                            className="px-2.5 py-1 bg-[#18231F] text-white rounded text-xs font-semibold cursor-pointer"
                          >
                            Allocate Pool
                          </button>
                        )}
                        {t.status !== 'paid_out' && (
                          <button
                            type="button"
                            onClick={() => onUpdateTipStatus(t.id, 'paid_out')}
                            className="px-2.5 py-1 bg-[#176B58] hover:bg-[#115644] text-white rounded text-xs font-semibold cursor-pointer"
                          >
                            Mark Paid Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 no-print">
            <form
              onSubmit={handleAddTip}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <Coins className="w-4 h-4 text-[#176B58]" />
                <span>Record Shift Tips</span>
              </div>
              <p className="text-xs text-[#68736D]">
                Tips are never inferred from POS sales totals. Record actual verified cash or card gratuities.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tip-amt" className="block text-xs font-medium text-[#18231F] mb-1">
                    Amount ({currency})
                  </label>
                  <input
                    id="tip-amt"
                    type="number"
                    step="0.01"
                    required
                    value={tipMajor}
                    onChange={(e) => setTipMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="tip-shift" className="block text-xs font-medium text-[#18231F] mb-1">
                    Shift
                  </label>
                  <select
                    id="tip-shift"
                    value={tipShift}
                    onChange={(e) => setTipShift(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="late">Late</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="tip-emp" className="block text-xs font-medium text-[#18231F] mb-1">
                  Team Pool or Employee Name
                </label>
                <input
                  id="tip-emp"
                  type="text"
                  required
                  value={tipEmployee}
                  onChange={(e) => setTipEmployee(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="tip-method" className="block text-xs font-medium text-[#18231F] mb-1">
                  Collection Source
                </label>
                <select
                  id="tip-method"
                  value={tipMethod}
                  onChange={(e) => setTipMethod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                >
                  <option value="card">Card Terminal Gratuity</option>
                  <option value="cash">Cash Tronc</option>
                  <option value="pooled">Combined Shift Pool</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save Tip Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF & RBAC ROLES */}
      {subTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#F7F8F5]">
                <tr className="border-b border-[#E1E6E1] text-[#68736D] font-semibold">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">RBAC Role</th>
                  <th className="py-3 px-4">Branch Scope</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right no-print">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6E1]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F7F8F5] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#18231F]">{m.displayName}</td>
                    <td className="py-3 px-4 font-mono text-[#68736D]">
                      <div className="flex items-center gap-2">
                        <span>{m.email}</span>
                        <CopyButton text={m.email} label="Email" compact />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono uppercase font-semibold text-[#176B58]">
                      {m.role}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#68736D]">{m.branchId}</td>
                    <td className="py-3 px-4 font-mono uppercase text-[#176B58]">{m.status}</td>
                    <td className="py-3 px-4 text-right no-print">
                      {m.role !== 'owner' && onRemoveMember ? (
                        <button
                          type="button"
                          onClick={() => setMemberToRemove(m)}
                          aria-label={`Revoke access for ${m.displayName}`}
                          className="px-2.5 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      ) : (
                        <span className="text-[#68736D] font-mono">Primary Owner</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4 no-print">
            <form
              onSubmit={handleInviteStaff}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <Users className="w-4 h-4 text-[#176B58]" />
                <span>Invite Staff & Assign Role</span>
              </div>
              <div>
                <label htmlFor="stf-name" className="block text-xs font-medium text-[#18231F] mb-1">
                  Full Name
                </label>
                <input
                  id="stf-name"
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Zineb El Idrissi"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="stf-email" className="block text-xs font-medium text-[#18231F] mb-1">
                  Email Address
                </label>
                <input
                  id="stf-email"
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="zineb@darzitouna.ma"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="stf-role" className="block text-xs font-medium text-[#18231F] mb-1">
                  Workspace Role
                </label>
                <select
                  id="stf-role"
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                >
                  <option value="manager">Branch Manager</option>
                  <option value="inventory">Inventory Manager</option>
                  <option value="finance">Finance / Accounting</option>
                  <option value="staff">Front-of-House Staff</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Authorize Employee Membership
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: MEETINGS & ACTION TASKS */}
      {subTab === 'meetings_tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl border border-[#E1E6E1] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#176B58]" />
                  <h3 className="text-sm font-bold text-[#18231F]">
                    Organization Tasks ({tasks.filter((t) => t.status !== 'completed').length} Open)
                  </h3>
                </div>
                <select
                  aria-label="Filter tasks by status"
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value as any)}
                  className="px-2.5 py-1 text-xs bg-white border border-[#E1E6E1] rounded-lg font-medium no-print"
                >
                  <option value="all">All Tasks ({tasks.length})</option>
                  <option value="open">Open Only</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="divide-y divide-[#E1E6E1] text-xs">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div
                        className={`font-semibold ${
                          task.status === 'completed'
                            ? 'line-through text-[#68736D]'
                            : 'text-[#18231F]'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-[#68736D] mt-0.5">{task.description}</div>
                      <div className="text-[#68736D] font-mono mt-1">
                        Assignee: {task.assigneeName} · Priority: {task.priority.toUpperCase()} ·
                        Due: {task.dueDate} · Source: {task.linkedModule}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(task.id)}
                      className={`px-3 py-1 rounded font-semibold shrink-0 cursor-pointer no-print ${
                        task.status === 'completed'
                          ? 'bg-[#EFF2ED] text-[#68736D]'
                          : 'bg-[#176B58] text-white hover:bg-[#115644]'
                      }`}
                    >
                      {task.status === 'completed' ? 'Reopen' : 'Complete'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E1E6E1] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#18231F]">Recorded Team Meetings</h3>
                <Calendar className="w-4 h-4 text-[#176B58]" />
              </div>
              <div className="divide-y divide-[#E1E6E1] text-xs">
                {meetings.map((m) => (
                  <div key={m.id} className="py-3 space-y-1">
                    <div className="font-semibold text-[#18231F]">
                      {m.title} ({m.date} at {m.time})
                    </div>
                    <div className="text-[#68736D]">
                      <strong>Agenda:</strong> {m.agenda}
                    </div>
                    <div className="text-[#68736D]">
                      <strong>Decisions:</strong> {m.decisions}
                    </div>
                    <div className="text-[#176B58] font-mono">
                      Action Item: {m.actionItemSummary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 no-print">
            <form
              onSubmit={handleCreateMeetingSubmit}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                Log Team Meeting & Convert Action Item to Persistent Task
              </div>
              <div>
                <label htmlFor="mtg-title" className="block text-xs font-medium text-[#18231F] mb-1">
                  Meeting Title
                </label>
                <input
                  id="mtg-title"
                  type="text"
                  required
                  value={mtgTitle}
                  onChange={(e) => setMtgTitle(e.target.value)}
                  placeholder="Pre-Service Menu & Allergen Briefing"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="mtg-decisions"
                  className="block text-xs font-medium text-[#18231F] mb-1"
                >
                  Decisions Reached
                </label>
                <input
                  id="mtg-decisions"
                  type="text"
                  required
                  value={mtgDecisions}
                  onChange={(e) => setMtgDecisions(e.target.value)}
                  placeholder="Standardize 280g sea bass portion weight"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="mtg-action"
                  className="block text-xs font-medium text-[#18231F] mb-1"
                >
                  Follow-Up Action Item (Creates Assigned Task)
                </label>
                <input
                  id="mtg-action"
                  type="text"
                  value={mtgActionTitle}
                  onChange={(e) => setMtgActionTitle(e.target.value)}
                  placeholder="Recalibrate kitchen digital portion scales"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="mtg-assignee"
                  className="block text-xs font-medium text-[#18231F] mb-1"
                >
                  Task Assignee
                </label>
                <select
                  id="mtg-assignee"
                  value={mtgActionAssignee}
                  onChange={(e) => setMtgActionAssignee(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.displayName}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#18231F] hover:bg-[#176B58] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save Meeting & Dispatch Task
              </button>
            </form>

            <form
              onSubmit={handleAddStandaloneTask}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <Plus className="w-4 h-4 text-[#176B58]" />
                <span>Create Operational Task</span>
              </div>
              <div>
                <label htmlFor="tsk-title" className="block text-xs font-medium text-[#18231F] mb-1">
                  Task Title
                </label>
                <input
                  id="tsk-title"
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Verify cold room door gasket seal"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tsk-priority"
                    className="block text-xs font-medium text-[#18231F] mb-1"
                  >
                    Priority
                  </label>
                  <select
                    id="tsk-priority"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tsk-due" className="block text-xs font-medium text-[#18231F] mb-1">
                    Due Date
                  </label>
                  <input
                    id="tsk-due"
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Assign Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: INTERNAL TEAM CHANNELS */}
      {subTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-[#E1E6E1] space-y-2">
            <div className="text-xs font-bold text-[#18231F] pb-2 border-b border-[#E1E6E1]">
              Channels
            </div>
            {(['general', 'kitchen', 'front_of_house', 'purchasing', 'managers'] as const).map(
              (ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                    activeChannel === ch
                      ? 'bg-[#176B58] text-white'
                      : 'text-[#18231F] hover:bg-[#EFF2ED]'
                  }`}
                >
                  <span># {ch}</span>
                </button>
              )
            )}
          </div>

          <div className="lg:col-span-9 bg-white rounded-xl border border-[#E1E6E1] flex flex-col h-[420px]">
            <div className="p-4 border-b border-[#E1E6E1] flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#18231F]">
                <MessageSquare className="w-4 h-4 text-[#176B58]" />
                <span>#{activeChannel}</span>
              </div>
              <span className="text-xs text-[#68736D]">Organization-Isolated Channel</span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages
                .filter((m) => m.channel === activeChannel)
                .map((m) => (
                  <div key={m.id} className="p-3 rounded-lg bg-[#F7F8F5] border border-[#E1E6E1]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#18231F]">
                        {m.senderName}{' '}
                        <span className="font-mono text-[#68736D]">({m.senderRole})</span>
                      </span>
                      <span className="font-mono text-[#68736D]">
                        {m.createdAt.slice(11, 16)}
                      </span>
                    </div>
                    <p className="text-[#18231F]">{m.body}</p>
                  </div>
                ))}
            </div>

            <form
              onSubmit={handleSendChat}
              className="p-3 border-t border-[#E1E6E1] flex items-center gap-2 no-print"
            >
              <input
                type="text"
                value={chatBody}
                onChange={(e) => setChatBody(e.target.value)}
                placeholder={`Post operational update to #${activeChannel}...`}
                aria-label="Channel message input"
                className="flex-1 px-3 py-2 text-xs border border-[#E1E6E1] rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
              >
                Send
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: DAILY OPERATING CHECKLISTS */}
      {subTab === 'checklists' && (
        <div className="bg-white rounded-xl border border-[#E1E6E1] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E1E6E1]">
            <div>
              <h3 className="text-sm font-bold text-[#18231F]">
                Daily Opening, Closing, Hygiene & Equipment Checklists
              </h3>
              <p className="text-xs text-[#68736D]">
                Completed items record timestamp and staff member attribution. Can also be queued offline.
              </p>
            </div>
            <ClipboardCheck className="w-5 h-5 text-[#176B58]" />
          </div>

          <div className="divide-y divide-[#E1E6E1] text-xs">
            {checklists.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-[#18231F]">
                    [{item.category.toUpperCase()}] {item.title}
                  </div>
                  <div className="text-[#68736D] font-mono mt-0.5">
                    Required Role: {item.requiredRole}
                    {item.completed && ` · Completed by ${item.completedBy} at ${item.completedAt}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleChecklist(item.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer no-print ${
                    item.completed
                      ? 'bg-[#E6F0E9] text-[#176B58] border border-[#176B58]/30'
                      : 'bg-[#176B58] text-white hover:bg-[#115644]'
                  }`}
                >
                  {item.completed ? 'Completed ✓' : 'Mark Completed'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
