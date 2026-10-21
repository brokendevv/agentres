import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toMinorUnits,
  formatMinorCurrency,
  convertUnitQuantity,
  calculatePurchaseTotalMinor,
  calculateStockReceiptImpact,
  calculateRecipeCostMetrics,
  calculateTheoreticalVsActualVariance,
  calculateTipDistribution,
  evaluatePlanEntitlement,
  validateAndReconcileReceiptExtraction,
} from './calculations';

test('toMinorUnits and formatMinorCurrency preserve exact integer minor precision', () => {
  assert.equal(toMinorUnits(145.75), 14575);
  assert.equal(formatMinorCurrency(14575, 'MAD'), '145.75 MAD');
  assert.equal(formatMinorCurrency(3900, 'USD'), '$39.00');
});

test('convertUnitQuantity converts mass and volume accurately and rejects cross-dimension conversion', () => {
  assert.equal(convertUnitQuantity(2.5, 'kg', 'g'), 2500);
  assert.equal(convertUnitQuantity(750, 'g', 'kg'), 0.75);
  assert.equal(convertUnitQuantity(1.2, 'L', 'mL'), 1200);
  assert.throws(() => convertUnitQuantity(1, 'kg', 'L'), /Incompatible unit conversion/);
});

test('calculatePurchaseTotalMinor computes subtotal, tax, and discount accurately', () => {
  const res = calculatePurchaseTotalMinor({
    quantity: 25,
    unitPriceMinor: 1200, // 12.00 MAD
    taxMinor: 6000, // 60.00 MAD
    discountMinor: 1500, // 15.00 MAD
  });
  assert.equal(res.subtotalMinor, 30000);
  assert.equal(res.totalMinor, 34500);
});

test('calculateStockReceiptImpact updates balance and weighted average cost accurately', () => {
  const impact = calculateStockReceiptImpact({
    currentStock: 10,
    currentUnitCostMinor: 1000, // 10.00 MAD/kg
    baseUnit: 'kg',
    receivedQuantity: 10,
    receivedUnit: 'kg',
    receivedUnitPriceMinor: 1400, // 14.00 MAD/kg
  });
  assert.equal(impact.addedBaseQuantity, 10);
  assert.equal(impact.newStockBalance, 20);
  assert.equal(impact.newWeightedUnitCostMinor, 1200); // 12.00 MAD/kg average
});

test('calculateRecipeCostMetrics computes batch cost, portion cost, and food cost percentage', () => {
  const metrics = calculateRecipeCostMetrics({
    portionsYield: 4,
    sellingPriceMinor: 9500, // 95.00 MAD per serving
    ingredientLines: [
      {
        quantity: 800,
        recipeUnit: 'g',
        ingredientBaseUnit: 'kg',
        ingredientBaseUnitCostMinor: 8000, // 80.00 MAD/kg -> 64.00 MAD
      },
      {
        quantity: 200,
        recipeUnit: 'mL',
        ingredientBaseUnit: 'L',
        ingredientBaseUnitCostMinor: 6000, // 60.00 MAD/L -> 12.00 MAD
      },
    ],
  });
  assert.equal(metrics.totalBatchCostMinor, 7600); // 76.00 MAD
  assert.equal(metrics.costPerServingMinor, 1900); // 19.00 MAD
  assert.equal(metrics.foodCostPercentage, 20); // 20.0%
});

test('calculateTheoreticalVsActualVariance compares POS recipe usage against physical stocktake', () => {
  const variance = calculateTheoreticalVsActualVariance({
    completedSalesCount: 50,
    recipeQtyPerPortion: 200,
    recipeUnit: 'g',
    ingredientBaseUnit: 'kg',
    recordedPhysicalConsumptionBase: 11.5, // 11.5 kg actual vs 10.0 kg theoretical
  });
  assert.equal(variance.theoreticalConsumptionBase, 10);
  assert.equal(variance.varianceBase, 1.5);
  assert.equal(variance.variancePercentage, 15);
});

test('calculateTipDistribution separates collected, allocated, paid out, and pool splits', () => {
  const dist = calculateTipDistribution({
    tips: [
      { amountMinor: 50000, status: 'collected' },
      { amountMinor: 30000, status: 'allocated' },
      { amountMinor: 20000, status: 'paid_out' },
    ],
    rule: 'foh_70_boh_30',
    fohStaffCount: 4,
    bohStaffCount: 2,
  });
  assert.equal(dist.collectedMinor, 100000);
  assert.equal(dist.allocatedMinor, 50000);
  assert.equal(dist.paidOutMinor, 20000);
  assert.equal(dist.awaitingDistributionMinor, 80000);
  assert.equal(dist.fohShareTotalMinor, 56000);
  assert.equal(dist.bohShareTotalMinor, 24000);
});

test('evaluatePlanEntitlement enforces downgrade to free limits when subscription expires', () => {
  const activePro = evaluatePlanEntitlement({
    plan: 'pro',
    subscriptionStatus: 'active',
    aiQueriesUsedThisMonth: 25,
    currentBranchCount: 1,
    currentStaffCount: 8,
    currentIngredientCount: 60,
  });
  assert.equal(activePro.effectiveTier, 'pro');
  assert.equal(activePro.canRunAiQuery, true);
  assert.equal(activePro.canAddStaff, true);

  const expiredPro = evaluatePlanEntitlement({
    plan: 'pro',
    subscriptionStatus: 'expired',
    aiQueriesUsedThisMonth: 25,
    currentBranchCount: 1,
    currentStaffCount: 8,
    currentIngredientCount: 60,
  });
  assert.equal(expiredPro.effectiveTier, 'free');
  assert.equal(expiredPro.canRunAiQuery, false); // 25 >= 15 free limit
  assert.equal(expiredPro.canAddStaff, false); // 8 >= 5 free limit
  assert.ok(expiredPro.statusBanner?.includes('expired'));
});

test('validateAndReconcileReceiptExtraction detects arithmetic mismatches in AI OCR output', () => {
  const mismatched = validateAndReconcileReceiptExtraction({
    supplierName: 'Atlas Mills Casablanca',
    invoiceRef: 'INV-2026-881',
    invoiceDate: '2026-10-20',
    currency: 'MAD',
    lineItems: [
      {
        name: 'T55 Artisan Flour',
        quantity: 10,
        unit: 'kg',
        unitPriceMinor: 1100,
        lineTotalMinor: 11000,
      },
    ],
    taxMinor: 2200,
    discountMinor: 0,
    extractedTotalMinor: 19900, // Should be 13200
  });
  assert.equal(mismatched.reconciled, false);
  assert.equal(mismatched.computedTotalMinor, 13200);
  assert.ok(mismatched.warnings.length > 0);
});
