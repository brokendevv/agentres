import React, { useState } from 'react';
import {
  Ingredient,
  Supplier,
  PurchaseOrder,
  InventoryMovement,
  Recipe,
  PosOrder,
} from '../domain/types';
import {
  BaseUnit,
  CurrencyCode,
  toMinorUnits,
  formatMinorCurrency,
  calculatePurchaseTotalMinor,
  calculateStockReceiptImpact,
  calculateRecipeCostMetrics,
  calculateTheoreticalVsActualVariance,
  validateAndReconcileReceiptExtraction,
  ExtractedReceiptSchema,
} from '../domain/calculations';
import {
  Plus,
  Check,
  AlertTriangle,
  FileText,
  ArrowUpDown,
  PackageCheck,
  Scale,
  ChefHat,
  Sparkles,
} from 'lucide-react';

interface InventoryPurchasingModuleProps {
  orgId: string;
  branchId: string;
  currency: CurrencyCode;
  actorUid: string;
  actorName: string;
  canAddIngredient: boolean;
  ingredients: Ingredient[];
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  movements: InventoryMovement[];
  recipes: Recipe[];
  orders: PosOrder[];
  onCreateIngredient: (ing: Ingredient, openingMovement: InventoryMovement) => void;
  onCreateSupplier: (sup: Supplier) => void;
  onCreatePurchaseOrder: (po: PurchaseOrder) => void;
  onReceivePurchaseDelivery: (
    po: PurchaseOrder,
    updatedIngredient: Ingredient,
    receiptMovement: InventoryMovement
  ) => void;
  onRecordStockAdjustment: (
    updatedIngredient: Ingredient,
    movement: InventoryMovement
  ) => void;
  onCreateRecipe: (recipe: Recipe) => void;
}

export const InventoryPurchasingModule: React.FC<InventoryPurchasingModuleProps> = ({
  orgId,
  branchId,
  currency,
  actorUid,
  actorName,
  canAddIngredient,
  ingredients,
  suppliers,
  purchases,
  movements,
  recipes,
  orders,
  onCreateIngredient,
  onCreateSupplier,
  onCreatePurchaseOrder,
  onReceivePurchaseDelivery,
  onRecordStockAdjustment,
  onCreateRecipe,
}) => {
  const [subTab, setSubTab] = useState<
    'stock' | 'purchasing' | 'ledger' | 'recipes' | 'ocr_receipt'
  >('stock');
  const [searchQuery, setSearchQuery] = useState('');

  // Ingredient creation state
  const [ingName, setIngName] = useState('');
  const [ingSku, setIngSku] = useState('');
  const [ingCategory, setIngCategory] = useState('Dry Goods');
  const [ingUnit, setIngUnit] = useState<BaseUnit>('kg');
  const [ingOpeningStock, setIngOpeningStock] = useState('20');
  const [ingMinStock, setIngMinStock] = useState('10');
  const [ingReorderTarget, setIngReorderTarget] = useState('50');
  const [ingUnitCostMajor, setIngUnitCostMajor] = useState('15.00');
  const [ingSupplierId, setIngSupplierId] = useState(suppliers[0]?.id || 'sup_atlas_mills');
  const [ingStorage, setIngStorage] = useState('Dry Store A1');
  const [ingExpiry, setIngExpiry] = useState('2027-03-01');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Stocktake / Waste adjustment state
  const [adjIngredientId, setAdjIngredientId] = useState(ingredients[0]?.id || '');
  const [adjType, setAdjType] = useState<'waste' | 'stocktake' | 'correction'>('stocktake');
  const [adjDelta, setAdjDelta] = useState('-1.5');
  const [adjReason, setAdjReason] = useState('Physical end-of-shift count adjustment');

  // Purchase Order creation state
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poIngredientId, setPoIngredientId] = useState(ingredients[0]?.id || '');
  const [poInvoiceRef, setPoInvoiceRef] = useState('INV-2026-440');
  const [poQuantity, setPoQuantity] = useState('25');
  const [poUnit, setPoUnit] = useState<BaseUnit>('kg');
  const [poUnitPriceMajor, setPoUnitPriceMajor] = useState('12.50');
  const [poTaxMajor, setPoTaxMajor] = useState('31.25');
  const [poDiscountMajor, setPoDiscountMajor] = useState('0.00');
  const [poStatus, setPoStatus] = useState<'draft' | 'ordered'>('ordered');

  // Supplier creation state
  const [supName, setSupName] = useState('');
  const [supCategory, setSupCategory] = useState('Produce & Herbs');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');

  // Recipe creation state
  const [recDishName, setRecDishName] = useState('');
  const [recCategory, setRecCategory] = useState('Mains');
  const [recPortions, setRecPortions] = useState('4');
  const [recSellingMajor, setRecSellingMajor] = useState('140.00');
  const [recPrimaryIngId, setRecPrimaryIngId] = useState(ingredients[0]?.id || '');
  const [recPrimaryQty, setRecPrimaryQty] = useState('1.2');
  const [recPrimaryUnit, setRecPrimaryUnit] = useState<BaseUnit>('kg');
  const [recInstructions, setRecInstructions] = useState('');

  // AI OCR Receipt Extraction state
  const [ocrHint, setOcrHint] = useState(
    'Supplier: Atlantique Marée Fraîche | Invoice INV-AM-7721 | 15 kg Wild Atlantic Sea Bass @ 145.00 MAD/kg + 217.50 MAD VAT'
  );
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedReceipt, setExtractedReceipt] = useState<ExtractedReceiptSchema | null>(null);

  const filteredIngredients = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalInventoryValuationMinor = ingredients.reduce(
    (sum, i) => sum + Math.round(i.currentStock * i.unitCostMinor),
    0
  );

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddIngredient) {
      setFormFeedback('Plan limit reached for tracked ingredients. Upgrade plan in Billing.');
      return;
    }
    if (!ingName.trim() || !ingSku.trim()) {
      setFormFeedback('Ingredient name and SKU are required.');
      return;
    }

    const now = new Date().toISOString();
    const id = `ing_${Date.now()}`;
    const openingQty = Math.max(0, Number(ingOpeningStock) || 0);
    const unitCostMinor = toMinorUnits(Number(ingUnitCostMajor) || 0);

    const newIng: Ingredient = {
      id,
      orgId,
      branchId,
      name: ingName.trim(),
      sku: ingSku.trim().toUpperCase(),
      category: ingCategory,
      baseUnit: ingUnit,
      currentStock: openingQty,
      minStock: Math.max(0, Number(ingMinStock) || 0),
      reorderTarget: Math.max(1, Number(ingReorderTarget) || 20),
      unitCostMinor,
      currency,
      preferredSupplierId: ingSupplierId || suppliers[0]?.id || 'sup_default',
      storageLocation: ingStorage.trim() || 'Main Storage',
      expiryDate: ingExpiry || '2027-01-01',
      updatedBy: actorUid,
      createdAt: now,
      updatedAt: now,
    };

    const openingMovement: InventoryMovement = {
      id: `mov_open_${Date.now()}`,
      orgId,
      branchId,
      ingredientId: id,
      ingredientName: newIng.name,
      movementType: 'opening',
      quantityDelta: openingQty,
      unit: ingUnit,
      balanceAfter: openingQty,
      referenceId: id,
      reason: 'Initial SKU opening balance registration',
      actorUid,
      actorName,
      createdAt: now,
    };

    onCreateIngredient(newIng, openingMovement);
    setIngName('');
    setIngSku('');
    setFormFeedback(`Created ingredient "${newIng.name}" with opening ledger entry.`);
  };

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const target = ingredients.find((i) => i.id === adjIngredientId) || ingredients[0];
    if (!target) return;
    const delta = Number(adjDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      setFormFeedback('Adjustment delta must be a non-zero number.');
      return;
    }
    if (!adjReason.trim()) {
      setFormFeedback('Audit reason is mandatory for stock adjustments.');
      return;
    }

    const now = new Date().toISOString();
    const newBalance = Number(Math.max(0, target.currentStock + delta).toFixed(3));
    const updated: Ingredient = {
      ...target,
      currentStock: newBalance,
      updatedBy: actorUid,
      updatedAt: now,
    };
    const movement: InventoryMovement = {
      id: `mov_adj_${Date.now()}`,
      orgId,
      branchId,
      ingredientId: target.id,
      ingredientName: target.name,
      movementType: adjType,
      quantityDelta: delta,
      unit: target.baseUnit,
      balanceAfter: newBalance,
      referenceId: `adj_${Date.now()}`,
      reason: adjReason.trim(),
      actorUid,
      actorName,
      createdAt: now,
    };

    onRecordStockAdjustment(updated, movement);
    setFormFeedback(
      `Recorded ${adjType} movement (${delta > 0 ? `+${delta}` : delta} ${target.baseUnit}) for ${target.name}. New balance: ${newBalance} ${target.baseUnit}.`
    );
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === poSupplierId) || suppliers[0];
    const ing = ingredients.find((i) => i.id === poIngredientId) || ingredients[0];
    if (!sup || !ing) return;

    const qty = Number(poQuantity);
    const unitPriceMinor = toMinorUnits(Number(poUnitPriceMajor) || 0);
    const taxMinor = toMinorUnits(Number(poTaxMajor) || 0);
    const discountMinor = toMinorUnits(Number(poDiscountMajor) || 0);

    const totals = calculatePurchaseTotalMinor({
      quantity: qty,
      unitPriceMinor,
      taxMinor,
      discountMinor,
    });

    const now = new Date().toISOString();
    const po: PurchaseOrder = {
      id: `po_${Date.now()}`,
      orgId,
      branchId,
      supplierId: sup.id,
      supplierName: sup.name,
      invoiceRef: poInvoiceRef.trim() || `INV-${Date.now()}`,
      status: poStatus,
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity: qty,
      unit: poUnit,
      unitPriceMinor,
      taxMinor: totals.taxMinor,
      discountMinor: totals.discountMinor,
      totalMinor: totals.totalMinor,
      currency,
      purchaseDate: now.slice(0, 10),
      receivedAt: '',
      notes: 'Created as purchase order. Usable stock updates only when explicitly received.',
      createdBy: actorUid,
      createdAt: now,
      updatedAt: now,
    };

    onCreatePurchaseOrder(po);
    setFormFeedback(
      `Created Purchase Order ${po.invoiceRef} (${po.status.toUpperCase()}). Stock remains unchanged until delivery is received.`
    );
  };

  const handleReceivePO = (po: PurchaseOrder) => {
    if (po.status === 'received') return;
    const ing = ingredients.find((i) => i.id === po.ingredientId);
    if (!ing) {
      setFormFeedback('Associated ingredient record not found.');
      return;
    }

    try {
      const impact = calculateStockReceiptImpact({
        currentStock: ing.currentStock,
        currentUnitCostMinor: ing.unitCostMinor,
        baseUnit: ing.baseUnit,
        receivedQuantity: po.quantity,
        receivedUnit: po.unit,
        receivedUnitPriceMinor: po.unitPriceMinor,
      });

      const now = new Date().toISOString();
      const updatedPo: PurchaseOrder = {
        ...po,
        status: 'received',
        receivedAt: now.slice(0, 10),
        updatedAt: now,
      };
      const updatedIng: Ingredient = {
        ...ing,
        currentStock: impact.newStockBalance,
        unitCostMinor: impact.newWeightedUnitCostMinor,
        updatedBy: actorUid,
        updatedAt: now,
      };
      const movement: InventoryMovement = {
        id: `mov_rec_${po.id}`,
        orgId,
        branchId,
        ingredientId: ing.id,
        ingredientName: ing.name,
        movementType: 'receipt',
        quantityDelta: impact.addedBaseQuantity,
        unit: ing.baseUnit,
        balanceAfter: impact.newStockBalance,
        referenceId: po.id,
        reason: `Received PO ${po.invoiceRef} from ${po.supplierName}`,
        actorUid,
        actorName,
        createdAt: now,
      };

      onReceivePurchaseDelivery(updatedPo, updatedIng, movement);
      setFormFeedback(
        `Delivery received for ${po.invoiceRef}: +${impact.addedBaseQuantity} ${ing.baseUnit} added to ${ing.name} (New balance: ${impact.newStockBalance} ${ing.baseUnit}).`
      );
    } catch (err: any) {
      setFormFeedback(err?.message || 'Unit conversion error while receiving delivery.');
    }
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    const now = new Date().toISOString();
    const newSup: Supplier = {
      id: `sup_${Date.now()}`,
      orgId,
      name: supName.trim(),
      category: supCategory,
      contactName: supContact.trim() || 'Account Manager',
      email: supEmail.trim() || 'orders@supplier.ma',
      phone: supPhone.trim() || '+212 522-000000',
      currency,
      paymentTerms: 'Net 30',
      rating: 5.0,
      createdAt: now,
      updatedAt: now,
    };
    onCreateSupplier(newSup);
    setSupName('');
    setSupContact('');
    setSupEmail('');
    setSupPhone('');
    setFormFeedback(`Added supplier "${newSup.name}".`);
  };

  const handleAddRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    const ing = ingredients.find((i) => i.id === recPrimaryIngId) || ingredients[0];
    if (!ing || !recDishName.trim()) return;

    try {
      const portionsYield = Math.max(1, Number(recPortions) || 1);
      const sellingPriceMinor = toMinorUnits(Number(recSellingMajor) || 0);
      const qty = Math.max(0.01, Number(recPrimaryQty) || 0.25);

      const costMetrics = calculateRecipeCostMetrics({
        portionsYield,
        sellingPriceMinor,
        ingredientLines: [
          {
            quantity: qty,
            recipeUnit: recPrimaryUnit,
            ingredientBaseUnit: ing.baseUnit,
            ingredientBaseUnitCostMinor: ing.unitCostMinor,
          },
        ],
      });

      const now = new Date().toISOString();
      const newRec: Recipe = {
        id: `rec_${Date.now()}`,
        orgId,
        dishName: recDishName.trim(),
        category: recCategory,
        portionsYield,
        sellingPriceMinor,
        estimatedCostMinor: costMetrics.costPerServingMinor,
        currency,
        primaryIngredientId: ing.id,
        primaryIngredientName: ing.name,
        primaryQuantity: qty,
        primaryUnit: recPrimaryUnit,
        instructions: recInstructions.trim() || 'Standard kitchen mise-en-place preparation.',
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      onCreateRecipe(newRec);
      setRecDishName('');
      setRecInstructions('');
      setFormFeedback(
        `Saved recipe "${newRec.dishName}" — Cost/serving: ${formatMinorCurrency(costMetrics.costPerServingMinor, currency)} (${costMetrics.foodCostPercentage}% food cost).`
      );
    } catch (err: any) {
      setFormFeedback(err?.message || 'Error computing recipe cost.');
    }
  };

  const runOcrExtraction = async () => {
    setOcrLoading(true);
    setFormFeedback(null);
    try {
      const resp = await fetch('/api/ai/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawTextHint: ocrHint, currency }),
      });
      const data = await resp.json();
      if (data?.extracted) {
        setExtractedReceipt(data.extracted);
      }
    } catch (err: any) {
      setFormFeedback(err?.message || 'Failed to extract receipt.');
    } finally {
      setOcrLoading(false);
    }
  };

  const approveExtractedReceiptToPO = () => {
    if (!extractedReceipt) return;
    const firstLine = extractedReceipt.lineItems[0];
    if (!firstLine) return;
    const matchedIng =
      ingredients.find((i) =>
        i.name.toLowerCase().includes(firstLine.name.toLowerCase().slice(0, 6))
      ) || ingredients[0];
    const matchedSup =
      suppliers.find((s) =>
        s.name.toLowerCase().includes(extractedReceipt.supplierName.toLowerCase().slice(0, 6))
      ) || suppliers[0];

    if (!matchedIng || !matchedSup) return;

    // Duplicate invoice reference check
    if (purchases.some((p) => p.invoiceRef === extractedReceipt.invoiceRef)) {
      setFormFeedback(
        `Duplicate Invoice Blocked: ${extractedReceipt.invoiceRef} has already been imported.`
      );
      return;
    }

    const now = new Date().toISOString();
    const newPo: PurchaseOrder = {
      id: `po_ocr_${Date.now()}`,
      orgId,
      branchId,
      supplierId: matchedSup.id,
      supplierName: extractedReceipt.supplierName,
      invoiceRef: extractedReceipt.invoiceRef,
      status: 'ordered',
      ingredientId: matchedIng.id,
      ingredientName: matchedIng.name,
      quantity: firstLine.quantity,
      unit: (firstLine.unit as BaseUnit) || matchedIng.baseUnit,
      unitPriceMinor: firstLine.unitPriceMinor,
      taxMinor: extractedReceipt.taxMinor,
      discountMinor: extractedReceipt.discountMinor,
      totalMinor: extractedReceipt.extractedTotalMinor,
      currency,
      purchaseDate: extractedReceipt.invoiceDate || now.slice(0, 10),
      receivedAt: '',
      notes: 'Human-reviewed & approved from AI Receipt OCR extraction.',
      createdBy: actorUid,
      createdAt: now,
      updatedAt: now,
    };

    onCreatePurchaseOrder(newPo);
    setExtractedReceipt(null);
    setSubTab('purchasing');
    setFormFeedback(
      `Approved OCR Invoice ${newPo.invoiceRef} as Purchase Order. Click "Receive Delivery" when stock physically arrives.`
    );
  };

  const ocrValidation = extractedReceipt
    ? validateAndReconcileReceiptExtraction(extractedReceipt)
    : null;

  return (
    <div className="space-y-6">
      {/* Sub-Navigation & Valuation Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('stock')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'stock'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock & Ingredients ({ingredients.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('purchasing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'purchasing'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Purchasing & Suppliers ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ledger')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'ledger'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Immutable Movement Ledger ({movements.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('recipes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'recipes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Recipes & Food Cost ({recipes.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ocr_receipt')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'ocr_receipt'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Receipt OCR Review
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">
            Estimated Stock Valuation:{' '}
            <strong className="font-mono tabular-nums text-slate-900">
              {formatMinorCurrency(totalInventoryValuationMinor, currency)}
            </strong>
          </span>
        </div>
      </div>

      {formFeedback && (
        <div className="p-3 rounded-lg bg-slate-900 text-white text-xs flex items-center justify-between">
          <span>{formFeedback}</span>
          <button
            type="button"
            onClick={() => setFormFeedback(null)}
            className="text-slate-300 hover:text-white ml-4 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: STOCK & INGREDIENTS */}
      {subTab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter ingredients by name, SKU, or category..."
                aria-label="Filter ingredients"
                className="w-full max-w-sm px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Showing {filteredIngredients.length} items
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold whitespace-nowrap">
                    <th className="py-3 px-4">Ingredient & SKU</th>
                    <th className="py-3 px-4">Storage & Expiry</th>
                    <th className="py-3 px-4 text-right">Stock Balance</th>
                    <th className="py-3 px-4 text-right">Min / Target</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredIngredients.map((item) => {
                    const isLow = item.currentStock < item.minStock;
                    const totalValMinor = Math.round(item.currentStock * item.unitCostMinor);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-slate-500 font-mono">
                            {item.sku} · {item.category}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          <div>{item.storageLocation}</div>
                          <div className="font-mono text-slate-400">Exp: {item.expiryDate}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {item.currentStock} {item.baseUnit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {item.minStock} / {item.reorderTarget} {item.baseUnit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {formatMinorCurrency(item.unitCostMinor, currency)}/{item.baseUnit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {formatMinorCurrency(totalValMinor, currency)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Below Min
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <Check className="w-3.5 h-3.5" />
                              Nominal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Add SKU & Record Stocktake/Waste */}
          <div className="lg:col-span-4 space-y-6">
            <form
              onSubmit={handleAddIngredient}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <Plus className="w-4 h-4 text-amber-700" />
                <span>Register New Stock Ingredient</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label htmlFor="ing-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Ingredient Name
                  </label>
                  <input
                    id="ing-name"
                    type="text"
                    required
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    placeholder="e.g. Organic Chickpeas"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="ing-sku" className="block text-xs font-medium text-slate-700 mb-1">
                    SKU Code
                  </label>
                  <input
                    id="ing-sku"
                    type="text"
                    required
                    value={ingSku}
                    onChange={(e) => setIngSku(e.target.value)}
                    placeholder="DRY-CHK-009"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ing-unit" className="block text-xs font-medium text-slate-700 mb-1">
                    Base Unit
                  </label>
                  <select
                    id="ing-unit"
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value as BaseUnit)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ing-open-qty" className="block text-xs font-medium text-slate-700 mb-1">
                    Opening Balance
                  </label>
                  <input
                    id="ing-open-qty"
                    type="number"
                    step="0.01"
                    value={ingOpeningStock}
                    onChange={(e) => setIngOpeningStock(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ing-min-qty" className="block text-xs font-medium text-slate-700 mb-1">
                    Minimum Alert Level
                  </label>
                  <input
                    id="ing-min-qty"
                    type="number"
                    step="0.01"
                    value={ingMinStock}
                    onChange={(e) => setIngMinStock(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ing-cost" className="block text-xs font-medium text-slate-700 mb-1">
                    Unit Cost ({currency})
                  </label>
                  <input
                    id="ing-cost"
                    type="number"
                    step="0.01"
                    value={ingUnitCostMajor}
                    onChange={(e) => setIngUnitCostMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ing-expiry" className="block text-xs font-medium text-slate-700 mb-1">
                    Lot Expiry Date
                  </label>
                  <input
                    id="ing-expiry"
                    type="date"
                    value={ingExpiry}
                    onChange={(e) => setIngExpiry(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Create Ingredient & Opening Ledger Entry
              </button>
            </form>

            {/* Traceable Stocktake / Waste Adjustment Form */}
            <form
              onSubmit={handleStockAdjustment}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <Scale className="w-4 h-4 text-amber-700" />
                <span>Log Audited Stocktake or Waste</span>
              </div>

              <div>
                <label htmlFor="adj-ing" className="block text-xs font-medium text-slate-700 mb-1">
                  Target Ingredient
                </label>
                <select
                  id="adj-ing"
                  value={adjIngredientId}
                  onChange={(e) => setAdjIngredientId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.currentStock} {i.baseUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="adj-type" className="block text-xs font-medium text-slate-700 mb-1">
                    Movement Type
                  </label>
                  <select
                    id="adj-type"
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="stocktake">Stocktake Count</option>
                    <option value="waste">Recorded Waste</option>
                    <option value="correction">Audit Correction</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="adj-delta" className="block text-xs font-medium text-slate-700 mb-1">
                    Quantity Delta (+/-)
                  </label>
                  <input
                    id="adj-delta"
                    type="number"
                    step="0.1"
                    value={adjDelta}
                    onChange={(e) => setAdjDelta(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="adj-reason" className="block text-xs font-medium text-slate-700 mb-1">
                  Mandatory Audit Reason
                </label>
                <input
                  id="adj-reason"
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Append Movement to Ledger
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASING & SUPPLIERS */}
      {subTab === 'purchasing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Purchase Orders & Explicit Stock Receipts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Creating an order never alters usable stock. Click &ldquo;Receive Delivery&rdquo; when goods arrive to post the inventory ledger movement once.
                  </p>
                </div>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Invoice / Supplier</th>
                    <th className="py-3 px-4">Item & Qty</th>
                    <th className="py-3 px-4 text-right">Total ({currency})</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {purchases.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-slate-900">
                          {po.invoiceRef}
                        </div>
                        <div className="text-slate-500">
                          {po.supplierName} · {po.purchaseDate}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{po.ingredientName}</div>
                        <div className="font-mono text-slate-500">
                          {po.quantity} {po.unit} @{' '}
                          {formatMinorCurrency(po.unitPriceMinor, currency)}/{po.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatMinorCurrency(po.totalMinor, currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono uppercase text-xs font-semibold text-slate-700">
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {po.status !== 'received' ? (
                          <button
                            type="button"
                            onClick={() => handleReceivePO(po)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Receive Delivery
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-mono text-xs">
                            Received {po.receivedAt}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Suppliers Directory */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">Approved Suppliers Directory</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Supplier</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Contact</th>
                    <th className="py-2.5 px-4">Terms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{s.category}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {s.contactName} · {s.phone}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{s.paymentTerms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <form
              onSubmit={handleCreatePO}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                Create Purchase Order
              </div>

              <div>
                <label htmlFor="po-sup" className="block text-xs font-medium text-slate-700 mb-1">
                  Supplier
                </label>
                <select
                  id="po-sup"
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="po-ing" className="block text-xs font-medium text-slate-700 mb-1">
                  Ingredient to Order
                </label>
                <select
                  id="po-ing"
                  value={poIngredientId}
                  onChange={(e) => setPoIngredientId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.baseUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="po-ref" className="block text-xs font-medium text-slate-700 mb-1">
                    Invoice Reference
                  </label>
                  <input
                    id="po-ref"
                    type="text"
                    required
                    value={poInvoiceRef}
                    onChange={(e) => setPoInvoiceRef(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="po-status" className="block text-xs font-medium text-slate-700 mb-1">
                    Initial State
                  </label>
                  <select
                    id="po-status"
                    value={poStatus}
                    onChange={(e) => setPoStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ordered">Ordered (Sent)</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="po-qty" className="block text-xs font-medium text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    id="po-qty"
                    type="number"
                    step="0.1"
                    required
                    value={poQuantity}
                    onChange={(e) => setPoQuantity(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="po-unit" className="block text-xs font-medium text-slate-700 mb-1">
                    Purchase Unit
                  </label>
                  <select
                    id="po-unit"
                    value={poUnit}
                    onChange={(e) => setPoUnit(e.target.value as BaseUnit)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="po-price" className="block text-xs font-medium text-slate-700 mb-1">
                    Unit Price ({currency})
                  </label>
                  <input
                    id="po-price"
                    type="number"
                    step="0.01"
                    required
                    value={poUnitPriceMajor}
                    onChange={(e) => setPoUnitPriceMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="po-tax" className="block text-xs font-medium text-slate-700 mb-1">
                    Taxes ({currency})
                  </label>
                  <input
                    id="po-tax"
                    type="number"
                    step="0.01"
                    value={poTaxMajor}
                    onChange={(e) => setPoTaxMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save Purchase Order
              </button>
            </form>

            <form
              onSubmit={handleAddSupplier}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                Add Supplier Profile
              </div>
              <div>
                <label htmlFor="sup-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Company Name
                </label>
                <input
                  id="sup-name"
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Les Vergers de Marrakech"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sup-contact" className="block text-xs font-medium text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    id="sup-contact"
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Rachid B."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="sup-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="sup-phone"
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+212 524-000000"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Add Supplier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: IMMUTABLE INVENTORY LEDGER */}
      {subTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Append-Only Inventory Movement Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Protected by Firestore security rules (`allow update, delete: if false`). Every receipt, consumption, waste, or stocktake count is permanently auditable.
              </p>
            </div>
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4">Ingredient</th>
                <th className="py-3 px-4 text-right">Quantity Delta</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4">Actor & Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {movements.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {mov.createdAt.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-3 px-4 font-mono uppercase font-semibold text-slate-700">
                    {mov.movementType}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{mov.ingredientName}</td>
                  <td
                    className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                      mov.quantityDelta >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}{' '}
                    {mov.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                    {mov.balanceAfter} {mov.unit}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="font-semibold text-slate-800">{mov.actorName}</span> ·{' '}
                    {mov.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: RECIPES & FOOD COST */}
      {subTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Recipe Costing & Theoretical vs. Recorded Consumption Variance
                </h3>
                <p className="text-xs text-slate-500">
                  Theoretical consumption is calculated from completed POS sales orders and compared against recorded physical movements. Theoretical estimates are never treated as physical measurements.
                </p>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Dish / Recipe</th>
                    <th className="py-3 px-4">Primary Ingredient</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Est. Cost / Serving</th>
                    <th className="py-3 px-4 text-right">Food Cost %</th>
                    <th className="py-3 px-4 text-right">Theoretical Sales Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recipes.map((r) => {
                    const foodCostPct = (
                      (r.estimatedCostMinor / Math.max(1, r.sellingPriceMinor)) *
                      100
                    ).toFixed(1);
                    const dishSalesCount = orders
                      .filter((o) => o.recipeId === r.id)
                      .reduce((s, o) => s + o.quantity, 0);
                    const ing = ingredients.find((i) => i.id === r.primaryIngredientId);
                    let theoreticalText = '0';
                    if (ing) {
                      try {
                        const v = calculateTheoreticalVsActualVariance({
                          completedSalesCount: dishSalesCount,
                          recipeQtyPerPortion: r.primaryQuantity / Math.max(1, r.portionsYield),
                          recipeUnit: r.primaryUnit,
                          ingredientBaseUnit: ing.baseUnit,
                          recordedPhysicalConsumptionBase: 15,
                        });
                        theoreticalText = `${v.theoreticalConsumptionBase} ${ing.baseUnit} (${dishSalesCount} sold)`;
                      } catch {
                        theoreticalText = `${dishSalesCount} sold`;
                      }
                    }

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{r.dishName}</div>
                          <div className="text-slate-500">
                            {r.category} · Yield: {r.portionsYield} portion(s) · v{r.version}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {r.primaryIngredientName} ({r.primaryQuantity} {r.primaryUnit})
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                          {formatMinorCurrency(r.sellingPriceMinor, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatMinorCurrency(r.estimatedCostMinor, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-700">
                          {foodCostPct}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {theoreticalText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4">
            <form
              onSubmit={handleAddRecipe}
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <ChefHat className="w-4 h-4 text-amber-700" />
                <span>Create Recipe & Cost Card</span>
              </div>

              <div>
                <label htmlFor="rec-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Menu Dish Name
                </label>
                <input
                  id="rec-name"
                  type="text"
                  required
                  value={recDishName}
                  onChange={(e) => setRecDishName(e.target.value)}
                  placeholder="Saffron Seafood Pastilla"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rec-yield" className="block text-xs font-medium text-slate-700 mb-1">
                    Portions Yield
                  </label>
                  <input
                    id="rec-yield"
                    type="number"
                    min="1"
                    value={recPortions}
                    onChange={(e) => setRecPortions(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="rec-sell" className="block text-xs font-medium text-slate-700 mb-1">
                    Selling Price ({currency})
                  </label>
                  <input
                    id="rec-sell"
                    type="number"
                    step="0.01"
                    value={recSellingMajor}
                    onChange={(e) => setRecSellingMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rec-ing" className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Stock Ingredient
                </label>
                <select
                  id="rec-ing"
                  value={recPrimaryIngId}
                  onChange={(e) => setRecPrimaryIngId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({formatMinorCurrency(i.unitCostMinor, currency)}/{i.baseUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rec-qty" className="block text-xs font-medium text-slate-700 mb-1">
                    Batch Quantity
                  </label>
                  <input
                    id="rec-qty"
                    type="number"
                    step="0.01"
                    value={recPrimaryQty}
                    onChange={(e) => setRecPrimaryQty(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="rec-unit" className="block text-xs font-medium text-slate-700 mb-1">
                    Recipe Unit
                  </label>
                  <select
                    id="rec-unit"
                    value={recPrimaryUnit}
                    onChange={(e) => setRecPrimaryUnit(e.target.value as BaseUnit)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Compute Cost & Save Recipe
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: AI RECEIPT & INVOICE OCR EXTRACTION */}
      {subTab === 'ocr_receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-amber-700" />
              <span>1. Upload or Paste Supplier Invoice</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI Vision / Document Extraction parses supplier name, invoice reference, line items, taxes, and totals into integer minor units. Extracted data is never silently converted into an approved purchase without your side-by-side verification.
            </p>

            <div>
              <label htmlFor="ocr-hint" className="block text-xs font-medium text-slate-700 mb-1">
                Invoice Text / OCR Document Input
              </label>
              <textarea
                id="ocr-hint"
                rows={4}
                value={ocrHint}
                onChange={(e) => setOcrHint(e.target.value)}
                className="w-full p-3 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <button
              type="button"
              onClick={runOcrExtraction}
              disabled={ocrLoading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {ocrLoading ? 'Extracting & Reconciling Totals...' : 'Extract Structured Invoice Data'}
            </button>
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 text-sm pb-2 mb-4 border-b border-slate-100">
              2. Side-by-Side Reconciliation & Human Approval
            </div>

            {!extractedReceipt ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Run extraction on the left to review structured invoice fields and verify arithmetic reconciliation before creating a Purchase Order.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Extracted Supplier</span>
                    <input
                      type="text"
                      aria-label="Extracted Supplier Name"
                      value={extractedReceipt.supplierName}
                      onChange={(e) =>
                        setExtractedReceipt({ ...extractedReceipt, supplierName: e.target.value })
                      }
                      className="mt-1 w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block">Invoice Reference</span>
                    <input
                      type="text"
                      aria-label="Extracted Invoice Reference"
                      value={extractedReceipt.invoiceRef}
                      onChange={(e) =>
                        setExtractedReceipt({ ...extractedReceipt, invoiceRef: e.target.value })
                      }
                      className="mt-1 w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block">Extracted Total</span>
                    <div className="mt-1.5 font-mono font-bold text-slate-900">
                      {formatMinorCurrency(extractedReceipt.extractedTotalMinor, currency)}
                    </div>
                  </div>
                </div>

                {ocrValidation && (
                  <div
                    className={`p-3 rounded-lg border ${
                      ocrValidation.reconciled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="font-semibold">
                      {ocrValidation.reconciled
                        ? 'Arithmetic Reconciliation Passed: Line items + tax - discount match document total.'
                        : 'Discrepancy Flagged: Please inspect line totals before approving.'}
                    </div>
                    {ocrValidation.warnings.map((w, idx) => (
                      <div key={idx} className="mt-1">
                        • {w}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setExtractedReceipt(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Discard Draft
                  </button>
                  <button
                    type="button"
                    onClick={approveExtractedReceiptToPO}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer"
                  >
                    Approve & Create Purchase Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
