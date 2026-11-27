import { BaseUnit, CurrencyCode, PlanTier, SubscriptionStatus, TipPoolRule } from './calculations';

export type MemberRole = 'owner' | 'manager' | 'finance' | 'inventory' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  activeOrgId: string;
  activeBranchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerUid: string;
  currency: CurrencyCode;
  plan: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  aiQueriesUsedThisMonth: number;
  country: string;
  timezone: string;
  lemonSqueezyCustomerId?: string;
  lemonSqueezySubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  uid: string;
  orgId: string;
  email: string;
  displayName: string;
  role: MemberRole;
  branchId: string;
  status: 'active' | 'invited' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  city: string;
  address: string;
  timezone: string;
  phone: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  id: string;
  orgId: string;
  branchId: string;
  name: string;
  sku: string;
  category: string;
  baseUnit: BaseUnit;
  currentStock: number;
  minStock: number;
  reorderTarget: number;
  unitCostMinor: number;
  currency: CurrencyCode;
  preferredSupplierId: string;
  storageLocation: string;
  expiryDate: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  orgId: string;
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  currency: CurrencyCode;
  paymentTerms: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  orgId: string;
  branchId: string;
  supplierId: string;
  supplierName: string;
  invoiceRef: string;
  status: 'draft' | 'ordered' | 'received' | 'rejected';
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: BaseUnit;
  unitPriceMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: CurrencyCode;
  purchaseDate: string;
  receivedAt: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  orgId: string;
  branchId: string;
  ingredientId: string;
  ingredientName: string;
  movementType:
    | 'opening'
    | 'receipt'
    | 'consumption'
    | 'transfer'
    | 'waste'
    | 'stocktake'
    | 'return'
    | 'correction';
  quantityDelta: number;
  unit: BaseUnit;
  balanceAfter: number;
  referenceId: string;
  reason: string;
  actorUid: string;
  actorName: string;
  createdAt: string;
}

export interface Recipe {
  id: string;
  orgId: string;
  dishName: string;
  category: string;
  portionsYield: number;
  sellingPriceMinor: number;
  estimatedCostMinor: number;
  currency: CurrencyCode;
  primaryIngredientId: string;
  primaryIngredientName: string;
  primaryQuantity: number;
  primaryUnit: BaseUnit;
  instructions: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TipRecord {
  id: string;
  orgId: string;
  branchId: string;
  amountMinor: number;
  currency: CurrencyCode;
  shift: 'morning' | 'afternoon' | 'evening' | 'late';
  date: string;
  employeeName: string;
  paymentMethod: 'cash' | 'card' | 'pooled';
  status: 'collected' | 'allocated' | 'paid_out';
  poolRule: TipPoolRule;
  notes: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRecord {
  id: string;
  orgId: string;
  name: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
  visitsCount: number;
  totalSpendMinor: number;
  currency: CurrencyCode;
  lastVisitDate: string;
  dietaryNotes: string;
  source: 'walk_in' | 'reservation' | 'pos_import';
  createdAt: string;
  updatedAt: string;
}

export interface ReservationRecord {
  id: string;
  orgId: string;
  branchId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  partySize: number;
  tableNumber: string;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  specialRequests: string;
  createdAt: string;
  updatedAt: string;
}

export interface PosOrder {
  id: string;
  orgId: string;
  branchId: string;
  externalOrderId: string;
  recipeId: string;
  dishName: string;
  quantity: number;
  totalMinor: number;
  taxMinor: number;
  currency: CurrencyCode;
  source: 'manual' | 'csv_import' | 'pos_api';
  orderDate: string;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  orgId: string;
  branchId: string;
  source: 'google_business' | 'direct_feedback' | 'tripadvisor_import';
  authorName: string;
  rating: number;
  comment: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  draftReply: string;
  replyStatus: 'pending' | 'draft_ready' | 'approved_published';
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  orgId: string;
  branchId: string;
  title: string;
  description: string;
  assigneeName: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: string;
  linkedModule: 'inventory' | 'meeting' | 'checklist' | 'review' | 'general';
  linkedRecordId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRecord {
  id: string;
  orgId: string;
  branchId: string;
  title: string;
  date: string;
  time: string;
  participants: string;
  agenda: string;
  decisions: string;
  actionItemSummary: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  orgId: string;
  channel: 'general' | 'kitchen' | 'front_of_house' | 'purchasing' | 'managers';
  senderUid: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  orgId: string;
  branchId: string;
  category: 'opening' | 'closing' | 'cleaning' | 'equipment' | 'handover';
  title: string;
  requiredRole: string;
  completed: boolean;
  completedBy: string;
  completedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRule {
  id: string;
  orgId: string;
  name: string;
  triggerType:
    | 'low_stock'
    | 'expiring_lot'
    | 'purchase_received'
    | 'negative_review'
    | 'overdue_task'
    | 'payment_failed';
  actionType: 'create_task' | 'send_notification' | 'prepare_po_draft' | 'draft_review_reply';
  enabled: boolean;
  requiresApproval: boolean;
  lastTriggeredAt: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteConfig {
  id: string;
  orgId: string;
  headline: string;
  subheadline: string;
  aboutText: string;
  openingHours: string;
  address: string;
  phone: string;
  themeColor: string;
  published: boolean;
  customDomain: string;
  domainVerified: boolean;
  bespokeRequestStatus:
    | 'none'
    | 'requested'
    | 'in_review'
    | 'quoted'
    | 'in_production'
    | 'delivered';
  bespokeNotes: string;
  siteAnnouncementText?: string;
  siteAnnouncementEnabled?: boolean;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  orgId: string;
  title: string;
  body: string;
  category: 'stock' | 'review' | 'task' | 'meeting' | 'billing' | 'system';
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  orgId: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface OfflineQueueItem {
  id: string;
  orgId: string;
  operation: 'stocktake_count' | 'checklist_toggle' | 'task_complete';
  summary: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'syncing' | 'synced' | 'conflict';
  createdAt: string;
}
