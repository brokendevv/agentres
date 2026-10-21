/**
 * Pure domain calculations for TablePulse OS.
 *
 * All monetary amounts are represented as integer minor units (e.g., centimes for MAD, cents for USD/EUR)
 * to eliminate IEEE-754 floating-point drift in financial and inventory workflows.
 */

export type BaseUnit = 'kg' | 'g' | 'L' | 'mL' | 'unit';
export type CurrencyCode = 'MAD' | 'USD' | 'EUR' | 'GBP';
export type PlanTier = 'free' | 'pro' | 'business' | 'ultra';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
export type TipPoolRule = 'individual' | 'equal_split' | 'foh_70_boh_30';

export interface PlanEntitlements {
  tier: PlanTier;
  name: string;
  targetAudience: string;
  monthlyPriceMinorMAD: number;
  annualPriceMinorMAD: number;
  monthlyPriceMinorUSD: number;
  maxBranches: number;
  maxStaffMembers: number;
  maxIngredients: number;
  monthlyAiQueries: number;
  maxAutomations: number;
  includesCustomWebsiteService: boolean;
  includesMultiLocationConsolidation: boolean;
}

export const DEFAULT_PLAN_ENTITLEMENTS: Record<PlanTier, PlanEntitlements> = {
  free: {
    tier: 'free',
    name: 'Free',
    targetAudience: 'For single-site independent kitchens starting digital ledger tracking',
    monthlyPriceMinorMAD: 0,
    annualPriceMinorMAD: 0,
    monthlyPriceMinorUSD: 0,
    maxBranches: 1,
    maxStaffMembers: 5,
    maxIngredients: 50,
    monthlyAiQueries: 15,
    maxAutomations: 2,
    includesCustomWebsiteService: false,
    includesMultiLocationConsolidation: false,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    targetAudience: 'For active restaurants managing inventory, recipes, tips, and reviews',
    monthlyPriceMinorMAD: 39000, // 390.00 MAD
    annualPriceMinorMAD: 390000, // 3,900.00 MAD
    monthlyPriceMinorUSD: 3900, // $39.00
    maxBranches: 2,
    maxStaffMembers: 20,
    maxIngredients: 350,
    monthlyAiQueries: 150,
    maxAutomations: 10,
    includesCustomWebsiteService: false,
    includesMultiLocationConsolidation: false,
  },
  business: {
    tier: 'business',
    name: 'Business',
    targetAudience: 'For multi-branch operators requiring consolidated reporting and POS sync',
    monthlyPriceMinorMAD: 89000, // 890.00 MAD
    annualPriceMinorMAD: 890000, // 8,900.00 MAD
    monthlyPriceMinorUSD: 8900, // $89.00
    maxBranches: 8,
    maxStaffMembers: 80,
    maxIngredients: 2000,
    monthlyAiQueries: 600,
    maxAutomations: 35,
    includesCustomWebsiteService: false,
    includesMultiLocationConsolidation: true,
  },
  ultra: {
    tier: 'ultra',
    name: 'Ultra',
    targetAudience: 'For hospitality groups seeking full AI operations and a bespoke website',
    monthlyPriceMinorMAD: 189000, // 1,890.00 MAD
    annualPriceMinorMAD: 1890000, // 18,900.00 MAD
    monthlyPriceMinorUSD: 18900, // $189.00
    maxBranches: 30,
    maxStaffMembers: 300,
    maxIngredients: 10000,
    monthlyAiQueries: 2500,
    maxAutomations: 150,
    includesCustomWebsiteService: true,
    includesMultiLocationConsolidation: true,
  },
};

/**
 * Converts a major decimal value (e.g. 125.50) to integer minor units (12550).
 */
export function toMinorUnits(majorAmount: number): number {
  if (!Number.isFinite(majorAmount)) {
    throw new Error('Invalid monetary amount');
  }
  return Math.round(majorAmount * 100);
}

/**
 * Formats integer minor units into a human-readable currency string with tabular precision.
 */
export function formatMinorCurrency(minorAmount: number, currency: CurrencyCode = 'MAD'): string {
  const safeMinor = Number.isFinite(minorAmount) ? Math.round(minorAmount) : 0;
  const major = (safeMinor / 100).toFixed(2);
  const parts = major.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = `${parts[0]}.${parts[1]}`;

  switch (currency) {
    case 'MAD':
      return `${formattedNumber} MAD`;
    case 'USD':
      return `$${formattedNumber}`;
    case 'EUR':
      return `€${formattedNumber}`;
    case 'GBP':
      return `£${formattedNumber}`;
    default:
      return `${formattedNumber} ${currency}`;
  }
}

/**
 * Converts quantity from one unit to a compatible target unit.
 * Throws if trying to convert between incompatible dimensions (e.g. kg -> L).
 */
export function convertUnitQuantity(quantity: number, fromUnit: BaseUnit, toUnit: BaseUnit): number {
  if (!Number.isFinite(quantity)) {
    throw new Error('Quantity must be a finite number');
  }
  if (fromUnit === toUnit) return quantity;

  if (fromUnit === 'kg' && toUnit === 'g') return quantity * 1000;
  if (fromUnit === 'g' && toUnit === 'kg') return quantity / 1000;
  if (fromUnit === 'L' && toUnit === 'mL') return quantity * 1000;
  if (fromUnit === 'mL' && toUnit === 'L') return quantity / 1000;

  throw new Error(`Incompatible unit conversion from ${fromUnit} to ${toUnit}`);
}

/**
 * Calculates purchase order total in integer minor units:
 * (quantity * unitPriceMinor) + taxMinor - discountMinor
 */
export function calculatePurchaseTotalMinor(params: {
  quantity: number;
  unitPriceMinor: number;
  taxMinor?: number;
  discountMinor?: number;
}): {
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
} {
  const { quantity, unitPriceMinor, taxMinor = 0, discountMinor = 0 } = params;
  if (quantity <= 0) {
    throw new Error('Purchase quantity must be greater than zero');
  }
  if (unitPriceMinor < 0 || taxMinor < 0 || discountMinor < 0) {
    throw new Error('Monetary values cannot be negative');
  }

  const subtotalMinor = Math.round(quantity * unitPriceMinor);
  const totalMinor = Math.max(0, subtotalMinor + Math.round(taxMinor) - Math.round(discountMinor));

  return {
    subtotalMinor,
    taxMinor: Math.round(taxMinor),
    discountMinor: Math.round(discountMinor),
    totalMinor,
  };
}

/**
 * Computes the new stock balance and weighted average unit cost (in minor units)
 * when a purchase delivery is explicitly received.
 * Note: Creating a draft or ordered PO NEVER alters stock; only `receivePurchaseDelivery` does.
 */
export function calculateStockReceiptImpact(params: {
  currentStock: number;
  currentUnitCostMinor: number;
  baseUnit: BaseUnit;
  receivedQuantity: number;
  receivedUnit: BaseUnit;
  receivedUnitPriceMinor: number;
}): {
  addedBaseQuantity: number;
  newStockBalance: number;
  newWeightedUnitCostMinor: number;
} {
  const addedBaseQuantity = convertUnitQuantity(
    params.receivedQuantity,
    params.receivedUnit,
    params.baseUnit
  );

  if (addedBaseQuantity <= 0) {
    throw new Error('Received quantity must be positive');
  }

  const safeCurrentStock = Math.max(0, params.currentStock);
  const newStockBalance = Number((safeCurrentStock + addedBaseQuantity).toFixed(4));

  // Price per base unit of incoming delivery
  const unitFactor = convertUnitQuantity(1, params.receivedUnit, params.baseUnit);
  const incomingBaseUnitCostMinor = Math.round(params.receivedUnitPriceMinor / unitFactor);

  const existingValueMinor = safeCurrentStock * params.currentUnitCostMinor;
  const incomingValueMinor = addedBaseQuantity * incomingBaseUnitCostMinor;

  const newWeightedUnitCostMinor =
    newStockBalance > 0
      ? Math.round((existingValueMinor + incomingValueMinor) / newStockBalance)
      : incomingBaseUnitCostMinor;

  return {
    addedBaseQuantity,
    newStockBalance,
    newWeightedUnitCostMinor,
  };
}

/**
 * Calculates recipe food cost per serving and food-cost percentage.
 */
export function calculateRecipeCostMetrics(params: {
  portionsYield: number;
  sellingPriceMinor: number;
  ingredientLines: Array<{
    quantity: number;
    recipeUnit: BaseUnit;
    ingredientBaseUnit: BaseUnit;
    ingredientBaseUnitCostMinor: number;
  }>;
}): {
  totalBatchCostMinor: number;
  costPerServingMinor: number;
  grossMarginMinor: number;
  foodCostPercentage: number;
} {
  if (params.portionsYield <= 0) {
    throw new Error('Portions yield must be greater than zero');
  }
  if (params.sellingPriceMinor <= 0) {
    throw new Error('Selling price must be greater than zero');
  }

  let totalBatchCostMinor = 0;
  for (const line of params.ingredientLines) {
    const qtyInBase = convertUnitQuantity(line.quantity, line.recipeUnit, line.ingredientBaseUnit);
    totalBatchCostMinor += Math.round(qtyInBase * line.ingredientBaseUnitCostMinor);
  }

  const costPerServingMinor = Math.round(totalBatchCostMinor / params.portionsYield);
  const grossMarginMinor = params.sellingPriceMinor - costPerServingMinor;
  const foodCostPercentage = Number(
    ((costPerServingMinor / params.sellingPriceMinor) * 100).toFixed(1)
  );

  return {
    totalBatchCostMinor,
    costPerServingMinor,
    grossMarginMinor,
    foodCostPercentage,
  };
}

/**
 * Calculates theoretical ingredient consumption from completed POS orders and compares
 * against recorded physical usage to highlight discrepancies without claiming theoretical = physical.
 */
export function calculateTheoreticalVsActualVariance(params: {
  completedSalesCount: number;
  recipeQtyPerPortion: number;
  recipeUnit: BaseUnit;
  ingredientBaseUnit: BaseUnit;
  recordedPhysicalConsumptionBase: number;
}): {
  theoreticalConsumptionBase: number;
  recordedPhysicalConsumptionBase: number;
  varianceBase: number;
  variancePercentage: number;
} {
  const perPortionBase = convertUnitQuantity(
    params.recipeQtyPerPortion,
    params.recipeUnit,
    params.ingredientBaseUnit
  );
  const theoreticalConsumptionBase = Number(
    (params.completedSalesCount * perPortionBase).toFixed(3)
  );
  const varianceBase = Number(
    (params.recordedPhysicalConsumptionBase - theoreticalConsumptionBase).toFixed(3)
  );
  const variancePercentage =
    theoreticalConsumptionBase > 0
      ? Number(((varianceBase / theoreticalConsumptionBase) * 100).toFixed(1))
      : 0;

  return {
    theoreticalConsumptionBase,
    recordedPhysicalConsumptionBase: params.recordedPhysicalConsumptionBase,
    varianceBase,
    variancePercentage,
  };
}

/**
 * Calculates tip summary and pool distribution breakdown in integer minor units,
 * ensuring exact minor-unit conservation (no lost or invented centimes).
 */
export function calculateTipDistribution(params: {
  tips: Array<{
    amountMinor: number;
    status: 'collected' | 'allocated' | 'paid_out';
  }>;
  rule: TipPoolRule;
  fohStaffCount: number;
  bohStaffCount: number;
}): {
  collectedMinor: number;
  allocatedMinor: number;
  paidOutMinor: number;
  awaitingDistributionMinor: number;
  fohShareTotalMinor: number;
  bohShareTotalMinor: number;
  perFohEmployeeMinor: number;
  perBohEmployeeMinor: number;
} {
  let collectedMinor = 0;
  let allocatedMinor = 0;
  let paidOutMinor = 0;

  for (const t of params.tips) {
    const amt = Math.max(0, Math.round(t.amountMinor));
    if (t.status === 'collected') {
      collectedMinor += amt;
    } else if (t.status === 'allocated') {
      collectedMinor += amt;
      allocatedMinor += amt;
    } else if (t.status === 'paid_out') {
      collectedMinor += amt;
      allocatedMinor += amt;
      paidOutMinor += amt;
    }
  }

  const awaitingDistributionMinor = Math.max(0, collectedMinor - paidOutMinor);
  const fohCount = Math.max(1, params.fohStaffCount);
  const bohCount = Math.max(0, params.bohStaffCount);

  let fohShareTotalMinor = awaitingDistributionMinor;
  let bohShareTotalMinor = 0;

  if (params.rule === 'equal_split' && bohCount > 0) {
    const totalStaff = fohCount + bohCount;
    fohShareTotalMinor = Math.round((awaitingDistributionMinor * fohCount) / totalStaff);
    bohShareTotalMinor = awaitingDistributionMinor - fohShareTotalMinor;
  } else if (params.rule === 'foh_70_boh_30' && bohCount > 0) {
    fohShareTotalMinor = Math.round(awaitingDistributionMinor * 0.7);
    bohShareTotalMinor = awaitingDistributionMinor - fohShareTotalMinor;
  }

  const perFohEmployeeMinor = Math.floor(fohShareTotalMinor / fohCount);
  const perBohEmployeeMinor = bohCount > 0 ? Math.floor(bohShareTotalMinor / bohCount) : 0;

  return {
    collectedMinor,
    allocatedMinor,
    paidOutMinor,
    awaitingDistributionMinor,
    fohShareTotalMinor,
    bohShareTotalMinor,
    perFohEmployeeMinor,
    perBohEmployeeMinor,
  };
}

/**
 * Evaluates subscription entitlement and quota enforcement on the server/domain layer.
 * If a subscription is `expired` or `canceled`, the effective tier falls back to `free` limits
 * without deleting existing customer records.
 */
export function evaluatePlanEntitlement(params: {
  plan: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  aiQueriesUsedThisMonth: number;
  currentBranchCount: number;
  currentStaffCount: number;
  currentIngredientCount: number;
}): {
  effectiveTier: PlanTier;
  entitlements: PlanEntitlements;
  canRunAiQuery: boolean;
  canAddBranch: boolean;
  canAddStaff: boolean;
  canAddIngredient: boolean;
  remainingAiQueries: number;
  statusBanner: string | null;
} {
  const isEntitledToPaidTier =
    params.subscriptionStatus === 'active' || params.subscriptionStatus === 'trialing';
  const effectiveTier: PlanTier = isEntitledToPaidTier ? params.plan : 'free';
  const entitlements = DEFAULT_PLAN_ENTITLEMENTS[effectiveTier];

  const remainingAiQueries = Math.max(
    0,
    entitlements.monthlyAiQueries - params.aiQueriesUsedThisMonth
  );

  let statusBanner: string | null = null;
  if (params.subscriptionStatus === 'past_due') {
    statusBanner =
      'Subscription payment is past due. Workspace is operating under Free tier limits until billing is resolved. Existing records are preserved.';
  } else if (params.subscriptionStatus === 'expired' || params.subscriptionStatus === 'canceled') {
    if (params.plan !== 'free') {
      statusBanner =
        'Subscription has expired. Plan entitlements have reverted to Free tier limits while preserving all historical data.';
    }
  }

  return {
    effectiveTier,
    entitlements,
    canRunAiQuery: remainingAiQueries > 0,
    canAddBranch: params.currentBranchCount < entitlements.maxBranches,
    canAddStaff: params.currentStaffCount < entitlements.maxStaffMembers,
    canAddIngredient: params.currentIngredientCount < entitlements.maxIngredients,
    remainingAiQueries,
    statusBanner,
  };
}

/**
 * Validates AI receipt extraction payloads and checks mathematical reconciliation
 * between extracted line items and the invoice total.
 */
export interface ExtractedReceiptSchema {
  supplierName: string;
  invoiceRef: string;
  invoiceDate: string;
  currency: CurrencyCode;
  lineItems: Array<{
    name: string;
    quantity: number;
    unit: BaseUnit;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
  taxMinor: number;
  discountMinor: number;
  extractedTotalMinor: number;
}

export function validateAndReconcileReceiptExtraction(
  payload: ExtractedReceiptSchema
): {
  valid: boolean;
  reconciled: boolean;
  computedTotalMinor: number;
  discrepancyMinor: number;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!payload.supplierName || payload.supplierName.trim().length === 0) {
    warnings.push('Missing supplier name on extracted document.');
  }
  if (!Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
    warnings.push('No line items detected.');
  }

  let itemsSumMinor = 0;
  for (const item of payload.lineItems || []) {
    const expectedLineTotal = Math.round(item.quantity * item.unitPriceMinor);
    if (Math.abs(expectedLineTotal - item.lineTotalMinor) > 2) {
      warnings.push(
        `Line item "${item.name}" quantity × unit price (${expectedLineTotal}) differs from line total (${item.lineTotalMinor}).`
      );
    }
    itemsSumMinor += item.lineTotalMinor;
  }

  const computedTotalMinor =
    itemsSumMinor + Math.round(payload.taxMinor || 0) - Math.round(payload.discountMinor || 0);
  const discrepancyMinor = Math.abs(computedTotalMinor - payload.extractedTotalMinor);
  const reconciled = discrepancyMinor <= 5; // Within 0.05 minor rounding tolerance

  if (!reconciled) {
    warnings.push(
      `Invoice total discrepancy detected: sum of lines + tax - discount is ${computedTotalMinor} minor units, but document total states ${payload.extractedTotalMinor}. Human review required.`
    );
  }

  return {
    valid: Boolean(payload.supplierName && payload.lineItems && payload.lineItems.length > 0),
    reconciled,
    computedTotalMinor,
    discrepancyMinor,
    warnings,
  };
}
