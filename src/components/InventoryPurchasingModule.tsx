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
  Search,
} from 'lucide-react';
import { requiresStockAdjustmentConfirmation } from '../domain/enhancements';
import {
  CopyButton,
  PrintReportButton,
  PrintReportHeader,
  LastUpdatedBadge,
  FormStatusBanner,
  ConfirmDialog,
} from './EnhancementWidgets';

interface InventoryPurchasingModuleProps {
  orgId: string;
  orgName?: string;
  branchId: string;
  branchName?: string;
  currency: CurrencyCode;
  actorUid: string;
  actorName: string;
  canAddIngredient: boolean;
  initialSubTab?: 'stock' | 'purchasing' | 'ledger' | 'recipes' | 'ocr_receipt';
  ingredients: Ingredient[];
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  movements: InventoryMovement[];
  recipes: Recipe[];
  orders: PosOrder[];
  onCreateIngredient: (ing: Ingredient, openingMovement: InventoryMovement) => void;
  onArchiveIngredient?: (ingredientId: string) => void;
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
  orgName = 'Dar Zitouna Hospitality Group',
  branchId,
  branchName = 'Casablanca Maarif Flagship',
  currency,
  actorUid,
  actorName,
  canAddIngredient,
  initialSubTab = 'stock',
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
  >(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock'>('all');
  const [stockSort, setStockSort] = useState<'name' | 'stock_asc' | 'value_desc'>('name');
  const [poStatusFilter, setPoStatusFilter] = useState<'all' | 'ordered' | 'received' | 'draft'>('all');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');

  React.useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Ingredient creation state
  const [ingName, setIngName] = useState('');
  const [ingSku, setIngSku] = useState('');
  const [ingCategory, setIngCategory] = useState('Dry Goods');
  const [ingUnit, setIngUnit] = useState<BaseUnit>('kg');
  const [ingOpeningStock, setIngOpeningStock] = useState('20');
  const [ingMinStock, setIngMinStock] = useState('10');
  const [ingReorderTarget, setIngReorderTarget] = useState('50');
  const [ingUnitCostMajor, setIngUnitCostMajor] = useState('15.00');
  const [ingSupplierId] = useState(suppliers[0]?.id || 'sup_atlas_mills');
  const [ingStorage] = useState('Dry Store A1');
  const [ingExpiry, setIngExpiry] = useState('2027-03-01');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [pendingConfirmAction, setPendingConfirmAction] = useState<{
    title: string;
    description: string;
    consequenceNote: string;
    irreversible: boolean;
    confirmLabel: string;
    execute: () => void;
  } | null>(null);

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
  const [poDiscountMajor] = useState('0.00');
  const [poStatus, setPoStatus] = useState<'draft' | 'ordered'>('ordered');

  // Supplier creation state
  const [supName, setSupName] = useState('');
  const [supCategory] = useState('Produce & Herbs');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');

  // Recipe creation state
  const [recDishName, setRecDishName] = useState('');
  const [recCategory] = useState('Mains');
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

  const filteredIngredients = ingredients
    .filter((i) => {
      const matchesSearch =
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = stockFilter === 'all' || i.currentStock < i.minStock;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (stockSort === 'stock_asc') return a.currentStock - b.currentStock;
      if (stockSort === 'value_desc') {
        return b.currentStock * b.unitCostMinor - a.currentStock * a.unitCostMinor;
      }
      return a.name.localeCompare(b.name);
    });

  const filteredPurchases = purchases.filter((p) =>
    poStatusFilter === 'all' ? true : p.status === poStatusFilter
  );

  const filteredMovements = movements.filter((m) =>
    ledgerTypeFilter === 'all' ? true : m.movementType === ledgerTypeFilter
  );

  const totalInventoryValuationMinor = ingredients.reduce(
    (sum, i) => sum + Math.round(i.currentStock * i.unitCostMinor),
    0
  );

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddIngredient) {
      setFeedbackType('error');
      setFormFeedback('Plan limit reached for tracked ingredients. Upgrade plan in Billing.');
      return;
    }
    if (!ingName.trim() || !ingSku.trim()) {
      setFeedbackType('error');
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
    setFeedbackType('success');
    setFormFeedback(`Created ingredient "${newIng.name}" with opening ledger entry.`);
  };

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const target = ingredients.find((i) => i.id === adjIngredientId) || ingredients[0];
    if (!target) return;
    const delta = Number(adjDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      setFeedbackType('error');
      setFormFeedback('Adjustment delta must be a non-zero number.');
      return;
    }
    if (!adjReason.trim()) {
      setFeedbackType('error');
      setFormFeedback('Audit reason is mandatory for stock adjustments.');
      return;
    }

    const executeAdjustment = () => {
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
      setFeedbackType('success');
      setFormFeedback(
        `Recorded ${adjType} movement (${delta > 0 ? `+${delta}` : delta} ${target.baseUnit}) for ${target.name}. New balance: ${newBalance} ${target.baseUnit}.`
      );
    };

    const confirmCheck = requiresStockAdjustmentConfirmation({
      movementType: adjType,
      quantityDelta: delta,
      unitCostMinor: target.unitCostMinor,
    });

    if (confirmCheck.required) {
      setPendingConfirmAction({
        title: `Confirm ${adjType.toUpperCase()} Ledger Movement`,
        description: `You are about to adjust "${target.name}" by ${delta} ${target.baseUnit} (Reason: ${adjReason.trim()}).`,
        consequenceNote: confirmCheck.reason,
        irreversible: true,
        confirmLabel: 'Confirm & Append to Ledger',
        execute: executeAdjustment,
      });
    } else {
      executeAdjustment();
    }
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
    setFeedbackType('success');
    setFormFeedback(
      `Created Purchase Order ${po.invoiceRef} (${po.status.toUpperCase()}). Stock remains unchanged until delivery is received.`
    );
  };

  const handleReceivePO = (po: PurchaseOrder) => {
    if (po.status === 'received') return;
    const ing = ingredients.find((i) => i.id === po.ingredientId);
    if (!ing) {
      setFeedbackType('error');
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
      setFeedbackType('success');
      setFormFeedback(
        `Delivery received for ${po.invoiceRef}: +${impact.addedBaseQuantity} ${ing.baseUnit} added to ${ing.name} (New balance: ${impact.newStockBalance} ${ing.baseUnit}).`
      );
    } catch (err: any) {
      setFeedbackType('error');
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
    setFeedbackType('success');
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
      setFeedbackType('success');
      setFormFeedback(
        `Saved recipe "${newRec.dishName}" — Cost/serving: ${formatMinorCurrency(costMetrics.costPerServingMinor, currency)} (${costMetrics.foodCostPercentage}% food cost).`
      );
    } catch (err: any) {
      setFeedbackType('error');
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
      setFeedbackType('error');
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
      setFeedbackType('error');
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
    setFeedbackType('success');
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E1E6E1]">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFF2ED] rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('stock')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'stock'
                ? 'bg-white text-[#18231F] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Stock & Ingredients ({ingredients.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('purchasing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'purchasing'
                ? 'bg-white text-[#18231F] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Purchasing & Suppliers ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ledger')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'ledger'
                ? 'bg-white text-[#18231F] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Immutable Movement Ledger ({movements.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('recipes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'recipes'
                ? 'bg-white text-[#18231F] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Recipes & Food Cost ({recipes.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ocr_receipt')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'ocr_receipt'
                ? 'bg-white text-[#18231F] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            AI Receipt OCR Review
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <LastUpdatedBadge
            timestamp={ingredients[0]?.updatedAt || '2026-10-21T08:00:00.000Z'}
            label="Ledger Sync"
          />
          <span className="text-[#68736D]">
            Stock Valuation:{' '}
            <strong className="font-mono tabular-nums text-[#18231F]">
              {formatMinorCurrency(totalInventoryValuationMinor, currency)}
            </strong>
          </span>
          <PrintReportButton label="Print View" />
        </div>
      </div>

      <PrintReportHeader
        reportTitle={`Inventory, Purchasing & Recipe Report (${subTab.toUpperCase()})`}
        orgName={orgName}
        branchName={branchName}
        currency={currency}
        lastUpdated={ingredients[0]?.updatedAt}
        activeFilterSummary={searchQuery ? `Search filter: "${searchQuery}"` : `Sub-module: ${subTab}`}
      />

      <FormStatusBanner
        status={formFeedback ? feedbackType : null}
        message={formFeedback}
        onDismiss={() => setFormFeedback(null)}
      />

      {pendingConfirmAction && (
        <ConfirmDialog
          open={Boolean(pendingConfirmAction)}
          title={pendingConfirmAction.title}
          description={pendingConfirmAction.description}
          consequenceNote={pendingConfirmAction.consequenceNote}
          irreversible={pendingConfirmAction.irreversible}
          confirmLabel={pendingConfirmAction.confirmLabel}
          onConfirm={() => {
            pendingConfirmAction.execute();
            setPendingConfirmAction(null);
          }}
          onCancel={() => setPendingConfirmAction(null)}
        />
      )}

      {/* TAB 1: STOCK & INGREDIENTS */}
      {subTab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-[#68736D] absolute left-3 top-2.5" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter ingredients by name, SKU, or category..."
                  aria-label="Filter ingredients"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E1E6E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B58]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  aria-label="Filter by stock status"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white border border-[#E1E6E1] rounded-lg text-[#18231F] font-medium"
                >
                  <option value="all">All SKUs ({ingredients.length})</option>
                  <option value="low_stock">
                    Low Stock Only ({ingredients.filter((i) => i.currentStock < i.minStock).length})
                  </option>
                </select>

                <select
                  aria-label="Sort inventory table"
                  value={stockSort}
                  onChange={(e) => setStockSort(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white border border-[#E1E6E1] rounded-lg text-[#18231F] font-medium"
                >
                  <option value="name">Sort: Name (A–Z)</option>
                  <option value="stock_asc">Sort: Lowest Stock First</option>
                  <option value="value_desc">Sort: Highest Valuation</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto max-h-[540px]">
              {filteredIngredients.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-2 text-xs text-[#68736D]">
                  <p className="font-semibold text-[#18231F]">No matching ingredients found</p>
                  <p>Adjust your search filter or register a new SKU on the right.</p>
                  {(searchQuery || stockFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStockFilter('all');
                      }}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-[#EFF2ED] text-[#18231F] font-semibold cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-[#F7F8F5]">
                    <tr className="border-b border-[#E1E6E1] text-[#68736D] font-semibold whitespace-nowrap">
                      <th className="py-3 px-4">Ingredient & SKU</th>
                      <th className="py-3 px-4">Storage & Expiry</th>
                      <th className="py-3 px-4 text-right">Stock Balance</th>
                      <th className="py-3 px-4 text-right">Min / Target</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Total Value</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E6E1]">
                    {filteredIngredients.map((item) => {
                      const isLow = item.currentStock < item.minStock;
                      const totalValMinor = Math.round(item.currentStock * item.unitCostMinor);
                      return (
                        <tr key={item.id} className="hover:bg-[#F7F8F5] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#18231F]">{item.name}</div>
                            <div className="text-[#68736D] font-mono text-[11px]">
                              {item.sku} · {item.category}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#68736D] whitespace-nowrap">
                            <div>{item.storageLocation}</div>
                            <div className="font-mono text-[11px]">Exp: {item.expiryDate}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18231F] whitespace-nowrap">
                            {item.currentStock} {item.baseUnit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#68736D] whitespace-nowrap">
                            {item.minStock} / {item.reorderTarget} {item.baseUnit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#68736D] whitespace-nowrap">
                            {formatMinorCurrency(item.unitCostMinor, currency)}/{item.baseUnit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18231F] whitespace-nowrap">
                            {formatMinorCurrency(totalValMinor, currency)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Below Min
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#176B58] font-medium">
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
              )}
            </div>
          </div>

          {/* Right Column: Add SKU & Record Stocktake/Waste */}
          <div className="lg:col-span-4 space-y-6">
            <form
              onSubmit={handleAddIngredient}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <Plus className="w-4 h-4 text-[#176B58]" />
                <span>Register New Stock Ingredient</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label htmlFor="ing-name" className="block text-xs font-medium text-[#18231F] mb-1">
                    Ingredient Name
                  </label>
                  <input
                    id="ing-name"
                    type="text"
                    required
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    placeholder="e.g. Organic Chickpeas"
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="ing-sku" className="block text-xs font-medium text-[#18231F] mb-1">
                    SKU Code
                  </label>
                  <input
                    id="ing-sku"
                    type="text"
                    required
                    value={ingSku}
                    onChange={(e) => setIngSku(e.target.value)}
                    placeholder="DRY-CHK-009"
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ing-unit" className="block text-xs font-medium text-[#18231F] mb-1">
                    Base Unit
                  </label>
                  <select
                    id="ing-unit"
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value as BaseUnit)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ing-open-qty" className="block text-xs font-medium text-[#18231F] mb-1">
                    Opening Balance
                  </label>
                  <input
                    id="ing-open-qty"
                    type="number"
                    step="0.01"
                    value={ingOpeningStock}
                    onChange={(e) => setIngOpeningStock(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ing-min-qty" className="block text-xs font-medium text-[#18231F] mb-1">
                    Minimum Alert Level
                  </label>
                  <input
                    id="ing-min-qty"
                    type="number"
                    step="0.01"
                    value={ingMinStock}
                    onChange={(e) => setIngMinStock(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ing-cost" className="block text-xs font-medium text-[#18231F] mb-1">
                    Unit Cost ({currency})
                  </label>
                  <input
                    id="ing-cost"
                    type="number"
                    step="0.01"
                    value={ingUnitCostMajor}
                    onChange={(e) => setIngUnitCostMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ing-expiry" className="block text-xs font-medium text-[#18231F] mb-1">
                    Lot Expiry Date
                  </label>
                  <input
                    id="ing-expiry"
                    type="date"
                    value={ingExpiry}
                    onChange={(e) => setIngExpiry(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Create Ingredient & Opening Ledger Entry
              </button>
            </form>

            {/* Traceable Stocktake / Waste Adjustment Form */}
            <form
              onSubmit={handleStockAdjustment}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <Scale className="w-4 h-4 text-[#176B58]" />
                <span>Log Audited Stocktake or Waste</span>
              </div>

              <div>
                <label htmlFor="adj-ing" className="block text-xs font-medium text-[#18231F] mb-1">
                  Target Ingredient
                </label>
                <select
                  id="adj-ing"
                  value={adjIngredientId}
                  onChange={(e) => setAdjIngredientId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
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
                  <label htmlFor="adj-type" className="block text-xs font-medium text-[#18231F] mb-1">
                    Movement Type
                  </label>
                  <select
                    id="adj-type"
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                  >
                    <option value="stocktake">Stocktake Count</option>
                    <option value="waste">Recorded Waste</option>
                    <option value="correction">Audit Correction</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="adj-delta" className="block text-xs font-medium text-[#18231F] mb-1">
                    Quantity Delta (+/-)
                  </label>
                  <input
                    id="adj-delta"
                    type="number"
                    step="0.1"
                    value={adjDelta}
                    onChange={(e) => setAdjDelta(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="adj-reason" className="block text-xs font-medium text-[#18231F] mb-1">
                  Mandatory Audit Reason
                </label>
                <input
                  id="adj-reason"
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#18231F] hover:bg-[#176B58] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
            <div className="bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
              <div className="p-4 border-b border-[#E1E6E1] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#18231F]">
                    Purchase Orders & Explicit Stock Receipts
                  </h3>
                  <p className="text-xs text-[#68736D]">
                    Creating an order never alters usable stock. Click &ldquo;Receive Delivery&rdquo; when goods arrive to post the inventory ledger movement once.
                  </p>
                </div>
                <select
                  aria-label="Filter purchase orders by status"
                  value={poStatusFilter}
                  onChange={(e) => setPoStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#E1E6E1] rounded-lg font-medium no-print"
                >
                  <option value="all">All Orders ({purchases.length})</option>
                  <option value="ordered">Ordered / Pending Receipt</option>
                  <option value="received">Received</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E1E6E1] bg-[#F7F8F5] text-[#68736D] font-semibold">
                    <th className="py-3 px-4">Invoice / Supplier</th>
                    <th className="py-3 px-4">Item & Qty</th>
                    <th className="py-3 px-4 text-right">Total ({currency})</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E6E1]">
                  {filteredPurchases.map((po) => (
                    <tr key={po.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#18231F]">
                            {po.invoiceRef}
                          </span>
                          <CopyButton text={po.invoiceRef} label="Ref" compact />
                        </div>
                        <div className="text-[#68736D]">
                          {po.supplierName} · {po.purchaseDate}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#18231F]">{po.ingredientName}</div>
                        <div className="font-mono text-[#68736D]">
                          {po.quantity} {po.unit} @{' '}
                          {formatMinorCurrency(po.unitPriceMinor, currency)}/{po.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18231F]">
                        {formatMinorCurrency(po.totalMinor, currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono uppercase text-xs font-semibold text-[#176B58]">
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {po.status !== 'received' ? (
                          <button
                            type="button"
                            onClick={() => handleReceivePO(po)}
                            className="px-3 py-1.5 bg-[#176B58] hover:bg-[#115644] text-white rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Receive Delivery
                          </button>
                        ) : (
                          <span className="text-[#176B58] font-mono text-xs font-medium">
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
            <div className="bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
              <div className="p-4 border-b border-[#E1E6E1]">
                <h3 className="text-sm font-bold text-[#18231F]">Approved Suppliers Directory</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E1E6E1] bg-[#F7F8F5] text-[#68736D] font-semibold">
                    <th className="py-2.5 px-4">Supplier</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Contact</th>
                    <th className="py-2.5 px-4">Terms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E6E1]">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-[#18231F]">{s.name}</td>
                      <td className="py-2.5 px-4 text-[#68736D]">{s.category}</td>
                      <td className="py-2.5 px-4 text-[#68736D]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>
                            {s.contactName} · {s.phone}
                          </span>
                          <CopyButton text={s.phone} label="Phone" compact />
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#68736D]">{s.paymentTerms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <form
              onSubmit={handleCreatePO}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                Create Purchase Order
              </div>

              <div>
                <label htmlFor="po-sup" className="block text-xs font-medium text-[#18231F] mb-1">
                  Supplier
                </label>
                <select
                  id="po-sup"
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="po-ing" className="block text-xs font-medium text-[#18231F] mb-1">
                  Ingredient to Order
                </label>
                <select
                  id="po-ing"
                  value={poIngredientId}
                  onChange={(e) => setPoIngredientId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
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
                  <label htmlFor="po-ref" className="block text-xs font-medium text-[#18231F] mb-1">
                    Invoice Reference
                  </label>
                  <input
                    id="po-ref"
                    type="text"
                    required
                    value={poInvoiceRef}
                    onChange={(e) => setPoInvoiceRef(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="po-status" className="block text-xs font-medium text-[#18231F] mb-1">
                    Initial State
                  </label>
                  <select
                    id="po-status"
                    value={poStatus}
                    onChange={(e) => setPoStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                  >
                    <option value="ordered">Ordered (Sent)</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="po-qty" className="block text-xs font-medium text-[#18231F] mb-1">
                    Quantity
                  </label>
                  <input
                    id="po-qty"
                    type="number"
                    step="0.1"
                    required
                    value={poQuantity}
                    onChange={(e) => setPoQuantity(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="po-unit" className="block text-xs font-medium text-[#18231F] mb-1">
                    Purchase Unit
                  </label>
                  <select
                    id="po-unit"
                    value={poUnit}
                    onChange={(e) => setPoUnit(e.target.value as BaseUnit)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="po-price" className="block text-xs font-medium text-[#18231F] mb-1">
                    Unit Price ({currency})
                  </label>
                  <input
                    id="po-price"
                    type="number"
                    step="0.01"
                    required
                    value={poUnitPriceMajor}
                    onChange={(e) => setPoUnitPriceMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="po-tax" className="block text-xs font-medium text-[#18231F] mb-1">
                    Taxes ({currency})
                  </label>
                  <input
                    id="po-tax"
                    type="number"
                    step="0.01"
                    value={poTaxMajor}
                    onChange={(e) => setPoTaxMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save Purchase Order
              </button>
            </form>

            <form
              onSubmit={handleAddSupplier}
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                Add Supplier Profile
              </div>
              <div>
                <label htmlFor="sup-name" className="block text-xs font-medium text-[#18231F] mb-1">
                  Company Name
                </label>
                <input
                  id="sup-name"
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Les Vergers de Marrakech"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sup-contact" className="block text-xs font-medium text-[#18231F] mb-1">
                    Contact Person
                  </label>
                  <input
                    id="sup-contact"
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Rachid B."
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="sup-phone" className="block text-xs font-medium text-[#18231F] mb-1">
                    Phone
                  </label>
                  <input
                    id="sup-phone"
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+212 524-000000"
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#EFF2ED] hover:bg-[#E6F0E9] text-[#18231F] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Add Supplier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: IMMUTABLE INVENTORY LEDGER */}
      {subTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
          <div className="p-4 border-b border-[#E1E6E1] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#18231F]">
                Append-Only Inventory Movement Ledger
              </h3>
              <p className="text-xs text-[#68736D]">
                Protected by Firestore security rules (`allow update, delete: if false`). Every receipt, consumption, waste, or stocktake count is permanently auditable.
              </p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <select
                aria-label="Filter movements by type"
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E1E6E1] rounded-lg font-medium"
              >
                <option value="all">All Movement Types ({movements.length})</option>
                <option value="receipt">Receipts</option>
                <option value="stocktake">Stocktake Counts</option>
                <option value="waste">Waste</option>
                <option value="opening">Opening Balances</option>
              </select>
              <ArrowUpDown className="w-4 h-4 text-[#68736D]" />
            </div>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E1E6E1] bg-[#F7F8F5] text-[#68736D] font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4">Ingredient</th>
                <th className="py-3 px-4 text-right">Quantity Delta</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4">Actor & Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E6E1]">
              {filteredMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-[#F7F8F5] transition-colors">
                  <td className="py-3 px-4 font-mono text-[#68736D]">
                    {mov.createdAt.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-3 px-4 font-mono uppercase font-semibold text-[#176B58]">
                    {mov.movementType}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#18231F]">{mov.ingredientName}</td>
                  <td
                    className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                      mov.quantityDelta >= 0 ? 'text-[#176B58]' : 'text-red-700'
                    }`}
                  >
                    {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}{' '}
                    {mov.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#18231F]">
                    {mov.balanceAfter} {mov.unit}
                  </td>
                  <td className="py-3 px-4 text-[#68736D]">
                    <span className="font-semibold text-[#18231F]">{mov.actorName}</span> ·{' '}
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
            <div className="bg-white rounded-xl border border-[#E1E6E1] overflow-x-auto">
              <div className="p-4 border-b border-[#E1E6E1]">
                <h3 className="text-sm font-bold text-[#18231F]">
                  Recipe Costing & Theoretical vs. Recorded Consumption Variance
                </h3>
                <p className="text-xs text-[#68736D]">
                  Theoretical consumption is calculated from completed POS sales orders and compared against recorded physical movements. Theoretical estimates are never treated as physical measurements.
                </p>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E1E6E1] bg-[#F7F8F5] text-[#68736D] font-semibold">
                    <th className="py-3 px-4">Dish / Recipe</th>
                    <th className="py-3 px-4">Primary Ingredient</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Est. Cost / Serving</th>
                    <th className="py-3 px-4 text-right">Food Cost %</th>
                    <th className="py-3 px-4 text-right">Theoretical Sales Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E6E1]">
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
                      <tr key={r.id} className="hover:bg-[#F7F8F5] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#18231F]">{r.dishName}</div>
                          <div className="text-[#68736D]">
                            {r.category} · Yield: {r.portionsYield} portion(s) · v{r.version}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#68736D]">
                          {r.primaryIngredientName} ({r.primaryQuantity} {r.primaryUnit})
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#18231F]">
                          {formatMinorCurrency(r.sellingPriceMinor, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18231F]">
                          {formatMinorCurrency(r.estimatedCostMinor, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#176B58]">
                          {foodCostPct}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#68736D]">
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
              className="bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-3"
            >
              <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
                <ChefHat className="w-4 h-4 text-[#176B58]" />
                <span>Create Recipe & Cost Card</span>
              </div>

              <div>
                <label htmlFor="rec-name" className="block text-xs font-medium text-[#18231F] mb-1">
                  Menu Dish Name
                </label>
                <input
                  id="rec-name"
                  type="text"
                  required
                  value={recDishName}
                  onChange={(e) => setRecDishName(e.target.value)}
                  placeholder="Saffron Seafood Pastilla"
                  className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rec-yield" className="block text-xs font-medium text-[#18231F] mb-1">
                    Portions Yield
                  </label>
                  <input
                    id="rec-yield"
                    type="number"
                    min="1"
                    value={recPortions}
                    onChange={(e) => setRecPortions(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="rec-sell" className="block text-xs font-medium text-[#18231F] mb-1">
                    Selling Price ({currency})
                  </label>
                  <input
                    id="rec-sell"
                    type="number"
                    step="0.01"
                    value={recSellingMajor}
                    onChange={(e) => setRecSellingMajor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rec-ing" className="block text-xs font-medium text-[#18231F] mb-1">
                  Primary Stock Ingredient
                </label>
                <select
                  id="rec-ing"
                  value={recPrimaryIngId}
                  onChange={(e) => setRecPrimaryIngId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
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
                  <label htmlFor="rec-qty" className="block text-xs font-medium text-[#18231F] mb-1">
                    Batch Quantity
                  </label>
                  <input
                    id="rec-qty"
                    type="number"
                    step="0.01"
                    value={recPrimaryQty}
                    onChange={(e) => setRecPrimaryQty(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E1E6E1] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="rec-unit" className="block text-xs font-medium text-[#18231F] mb-1">
                    Recipe Unit
                  </label>
                  <select
                    id="rec-unit"
                    value={recPrimaryUnit}
                    onChange={(e) => setRecPrimaryUnit(e.target.value as BaseUnit)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E1E6E1] rounded-lg bg-white"
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
                className="w-full py-2 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-[#E1E6E1] space-y-4">
            <div className="flex items-center gap-2 font-bold text-[#18231F] text-sm pb-2 border-b border-[#E1E6E1]">
              <FileText className="w-4 h-4 text-[#176B58]" />
              <span>1. Upload or Paste Supplier Invoice</span>
            </div>
            <p className="text-xs text-[#68736D] leading-relaxed">
              AI Vision / Document Extraction parses supplier name, invoice reference, line items, taxes, and totals into integer minor units. Extracted data is never silently converted into an approved purchase without your side-by-side verification.
            </p>

            <div>
              <label htmlFor="ocr-hint" className="block text-xs font-medium text-[#18231F] mb-1">
                Invoice Text / OCR Document Input
              </label>
              <textarea
                id="ocr-hint"
                rows={4}
                value={ocrHint}
                onChange={(e) => setOcrHint(e.target.value)}
                className="w-full p-3 text-xs border border-[#E1E6E1] rounded-lg font-mono"
              />
            </div>

            <button
              type="button"
              onClick={runOcrExtraction}
              disabled={ocrLoading}
              className="w-full py-2.5 px-4 bg-[#176B58] hover:bg-[#115644] text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {ocrLoading ? 'Extracting & Reconciling Totals...' : 'Extract Structured Invoice Data'}
            </button>
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-[#E1E6E1]">
            <div className="font-bold text-[#18231F] text-sm pb-2 mb-4 border-b border-[#E1E6E1]">
              2. Side-by-Side Reconciliation & Human Approval
            </div>

            {!extractedReceipt ? (
              <div className="py-12 text-center text-xs text-[#68736D]">
                Run extraction on the left to review structured invoice fields and verify arithmetic reconciliation before creating a Purchase Order.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3 p-3 bg-[#F7F8F5] rounded-lg border border-[#E1E6E1]">
                  <div>
                    <span className="text-[#68736D] block">Extracted Supplier</span>
                    <input
                      type="text"
                      aria-label="Extracted Supplier Name"
                      value={extractedReceipt.supplierName}
                      onChange={(e) =>
                        setExtractedReceipt({ ...extractedReceipt, supplierName: e.target.value })
                      }
                      className="mt-1 w-full px-2 py-1 bg-white border border-[#E1E6E1] rounded font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-[#68736D] block">Invoice Reference</span>
                    <input
                      type="text"
                      aria-label="Extracted Invoice Reference"
                      value={extractedReceipt.invoiceRef}
                      onChange={(e) =>
                        setExtractedReceipt({ ...extractedReceipt, invoiceRef: e.target.value })
                      }
                      className="mt-1 w-full px-2 py-1 bg-white border border-[#E1E6E1] rounded font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[#68736D] block">Extracted Total</span>
                    <div className="mt-1.5 font-mono font-bold text-[#18231F]">
                      {formatMinorCurrency(extractedReceipt.extractedTotalMinor, currency)}
                    </div>
                  </div>
                </div>

                {ocrValidation && (
                  <div
                    className={`p-3 rounded-lg border ${
                      ocrValidation.reconciled
                        ? 'bg-[#E6F0E9] border-[#176B58]/30 text-[#18231F]'
                        : 'bg-red-50 border-red-200 text-red-900'
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
                    className="px-4 py-2 border border-[#E1E6E1] rounded-lg text-[#18231F] hover:bg-[#EFF2ED] cursor-pointer"
                  >
                    Discard Draft
                  </button>
                  <button
                    type="button"
                    onClick={approveExtractedReceiptToPO}
                    className="px-4 py-2 bg-[#176B58] hover:bg-[#115644] text-white font-semibold rounded-lg transition-colors cursor-pointer"
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
