import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toMinorUnits,
  formatMinorCurrency,
  calculatePurchaseTotalMinor,
  calculateRecipeCostMetrics,
} from './index';

test('pure domain barrel export exposes core ledger primitives without browser dependencies', () => {
  assert.equal(toMinorUnits(42.5), 4250);
  assert.equal(formatMinorCurrency(4250, 'MAD'), '42.50 MAD');

  const po = calculatePurchaseTotalMinor({
    quantity: 10,
    unitPriceMinor: 1500,
    taxMinor: 1500,
    discountMinor: 500,
  });
  assert.equal(po.totalMinor, 16000);

  const recipe = calculateRecipeCostMetrics({
    portionsYield: 4,
    sellingPriceMinor: 12000,
    ingredientLines: [
      {
        quantity: 500,
        recipeUnit: 'g',
        ingredientBaseUnit: 'kg',
        ingredientBaseUnitCostMinor: 24000,
      },
    ],
  });
  assert.equal(recipe.costPerServingMinor, 3000);
  assert.equal(recipe.foodCostPercentage, 25);
});
