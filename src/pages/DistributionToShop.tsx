import React, { useState } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { calculateDistributionMetrics } from '../lib/accounting';
import { formatCurrency, formatWeight, formatApprox, cn } from '../lib/utils';
import { 
  Package, Truck, Store, CheckCircle, Trash2, Tag, 
  TrendingUp, DollarSign, Calculator, Info, ArrowLeftRight,
  Layers, AlertCircle, Sparkles, Hash, Scale
} from 'lucide-react';
import { InventoryItem, PricingMode, ShopWageMethod, TransactionItem } from '../types';
import { VoucherPreviewModal } from '../components/VoucherPreviewModal';
import { useVoucherSettings } from '../lib/useVoucherSettings';
import { buildDistributionVoucherDTO, CustomerVoucherDTO } from '../types/voucherTypes';

interface SelectedDistributionItem {
  inventoryItem: InventoryItem;
  
  // Weights and counts
  distributedNetWeight: number; // الوزن المراد توزيعه للمحل (يدوي مستقل)
  distributedCount: number | null; // عدد القطع المراد توزيعها (اختياري)
  
  // Pricing configuration
  wageMethod: ShopWageMethod; // طريقة احتساب الأجور للمحل (جرام / قطعة / إجمالي يدوي)
  pricingMode: PricingMode; // تسعير الجرام: أجرة بيع نهائية أو هامش ربح
  finalShopWagePerGram: number; // أجرة الجرام على المحل
  shopWagePerPiece: number; // أجرة القطعة على المحل
  manualShopWageTotal: number; // إجمالي أجور يدوي
  profitMarginInput: number; // هامش الربح المطلوب للجرام
}

export default function DistributionToShop() {
  const { shops, inventory, addTransaction } = useAppStore();
  const { getIdentitySnapshot } = useVoucherSettings();
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedDistributionItem[]>([]);
  const [voucherDto, setVoucherDto] = useState<CustomerVoucherDTO | null>(null);
  const [voucherTxId, setVoucherTxId] = useState<string>('');

  // Available inventory batches (only items with available weight > 0)
  const availableInventory = inventory.filter(item => {
    const avail = item.availableWeight !== undefined ? item.availableWeight : item.netWeight;
    return avail > 0.0001;
  });

  const toggleInventoryItem = (item: InventoryItem) => {
    const exists = selectedItems.find(i => i.inventoryItem.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.inventoryItem.id !== item.id));
    } else {
      const availWeight = item.availableWeight !== undefined ? item.availableWeight : item.netWeight;
      const defaultFinalWage = item.finalShopWagePerGram || Math.round((item.derivedWorkshopWagePerGram || 1500) + 300);
      
      // Default: manual input initial weight is the available batch weight (or user can customize)
      setSelectedItems([
        ...selectedItems,
        {
          inventoryItem: item,
          distributedNetWeight: availWeight,
          distributedCount: item.availableCount !== undefined && item.availableCount !== null ? item.availableCount : null,
          wageMethod: 'PER_GRAM',
          pricingMode: 'FINAL_PRICE',
          finalShopWagePerGram: defaultFinalWage,
          shopWagePerPiece: 0,
          manualShopWageTotal: 0,
          profitMarginInput: 300,
        }
      ]);
    }
  };

  const updateSelectedItem = (index: number, updates: Partial<SelectedDistributionItem>) => {
    setSelectedItems(prev => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };

      const derivedWage = current.inventoryItem.derivedWorkshopWagePerGram || 0;

      // Handle pricing mode calculations
      if (updates.pricingMode === 'PROFIT_MARGIN' || (current.pricingMode === 'PROFIT_MARGIN' && updates.profitMarginInput !== undefined)) {
        current.finalShopWagePerGram = Number((derivedWage + (current.profitMarginInput || 0)).toFixed(2));
      }

      if (updates.pricingMode === 'FINAL_PRICE' || (current.pricingMode === 'FINAL_PRICE' && updates.finalShopWagePerGram !== undefined)) {
        current.profitMarginInput = Number(((current.finalShopWagePerGram || 0) - derivedWage).toFixed(2));
      }

      copy[index] = current;
      return copy;
    });
  };

  const removeSelectedItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Helper to compute distribution metrics for a selected item using the exact accounting formula
  const getItemDistMetrics = (item: SelectedDistributionItem) => {
    const inv = item.inventoryItem;
    const originalBatchWageWeight = inv.wageCalculationWeight || inv.originalNetWeight || inv.netWeight;
    
    return calculateDistributionMetrics({
      distributedWageWeight: item.distributedNetWeight,
      totalOriginalWageWeight: originalBatchWageWeight,
      originalTotalWorkshopWage: inv.totalWorkshopWage,
      wageMethod: item.wageMethod,
      finalShopWagePerGram: item.finalShopWagePerGram,
      count: item.distributedCount,
      shopWagePerPiece: item.shopWagePerPiece,
      manualShopWageTotal: item.manualShopWageTotal,
    });
  };

  // Aggregate totals
  const totalDistributedNetWeight = selectedItems.reduce((s, i) => s + (i.distributedNetWeight || 0), 0);
  const totalShopWages = selectedItems.reduce((s, i) => s + getItemDistMetrics(i).totalShopWage, 0);
  const totalAllocatedWorkshopCost = selectedItems.reduce((s, i) => s + getItemDistMetrics(i).allocatedWorkshopCost, 0);
  const totalExpectedProfit = selectedItems.reduce((s, i) => s + getItemDistMetrics(i).expectedProfit, 0);

  // Validation
  const hasInvalidWeights = selectedItems.some(item => {
    const availWeight = item.inventoryItem.availableWeight !== undefined ? item.inventoryItem.availableWeight : item.inventoryItem.netWeight;
    return !item.distributedNetWeight || item.distributedNetWeight <= 0 || item.distributedNetWeight > availWeight + 0.0001;
  });

  const handleSubmit = async () => {
    if (!selectedShopId) return alert('يرجى اختيار المحل (الوجهة)');
    if (selectedItems.length === 0) return alert('يرجى اختيار دفعات من المخزون للتوزيع');
    if (hasInvalidWeights) {
      return alert('يوجد خطأ في أوزان التوزيع: تأكد من أن الوزن المراد توزيعه أكبر من صفر ولا يتجاوز الوزن المتاح للدفعة.');
    }

    const shop = shops.find(s => s.id === selectedShopId);
    const txId = `DIST-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

    const txItems: TransactionItem[] = selectedItems.map(item => {
      const metrics = getItemDistMetrics(item);
      const inv = item.inventoryItem;

      return {
        inventoryItemId: inv.id,
        category: inv.category,
        modelCode: inv.modelCode,
        count: item.distributedCount,
        karat: inv.karat,
        grossWeight: inv.grossWeight,
        netWeight: item.distributedNetWeight,
        weightDifference: inv.weightDifference,
        wageCalculationBasis: inv.wageCalculationBasis,
        wageCalculationWeight: item.distributedNetWeight,
        workshopWageInputMode: inv.workshopWageInputMode,
        totalWorkshopWage: inv.totalWorkshopWage,
        derivedWorkshopWagePerGram: inv.derivedWorkshopWagePerGram,
        roundedDerivedWagePerGram: inv.roundedDerivedWagePerGram,
        roundingDifference: inv.roundingDifference,
        workshopDocNo: inv.workshopDocNo,
        workshopDocDate: inv.workshopDocDate,
        
        // Distribution specs
        originalBatchNetWeight: inv.originalNetWeight || inv.netWeight,
        originalBatchWageWeight: inv.wageCalculationWeight || inv.netWeight,
        originalBatchTotalWorkshopWage: inv.totalWorkshopWage,
        
        wageMethod: item.wageMethod,
        pricingMode: item.pricingMode,
        finalShopWagePerGram: item.finalShopWagePerGram,
        shopWagePerPiece: item.shopWagePerPiece,
        manualShopWageTotal: item.manualShopWageTotal,
        profitMarginPerGram: metrics.profitMarginPerGram,
        
        totalShopWage: metrics.totalShopWage, // إجمالي أجور المحل
        allocatedWorkshopCost: metrics.allocatedWorkshopCost, // تكلفة الورشة الفعلية المخصصة
        expectedProfit: metrics.expectedProfit, // إجمالي الربح المتوقع
      };
    });

    const tx = {
      id: txId,
      date: new Date().toISOString(),
      type: 'DISTRIBUTE_TO_SHOP' as const,
      entityId: selectedShopId,
      entityName: shop?.name,
      items: txItems,
      cashAmount: totalShopWages,
    };

    await addTransaction(tx);

    // Build customer-facing DTO (no internal costs/profits)
    const identity = getIdentitySnapshot();
    const dto = buildDistributionVoucherDTO(tx, shop, identity);
    setVoucherDto(dto);
    setVoucherTxId(txId);

    setSelectedItems([]);
    setSelectedShopId('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {voucherDto && (
        <VoucherPreviewModal
          transactionId={voucherTxId}
          dto={voucherDto}
          onClose={() => setVoucherDto(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-7 h-7 text-amber-500" />
            توزيع بضاعة للمحلات (دعم التوزيع الجزئي من الدفعات)
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            إمكانية توزيع جزء من الدفعة واحتساب تكلفة الورشة والأرباح بدقة النسبة والتناسب مع بقاء الرصيد المتبقي في المخزون.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Inventory Picker & Partial Distribution Configuration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Inventory Batch Selector Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                دفعات المخزون المتاحة للتوزيع (انقر لاختيار الدفعة)
              </h3>
              <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded">
                {availableInventory.length} دفعة متوفرة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {availableInventory.map(item => {
                const isSelected = !!selectedItems.find(i => i.inventoryItem.id === item.id);
                const originalWeight = item.originalNetWeight || item.netWeight;
                const distributedWeight = item.distributedWeight || 0;
                const returnedWeight = item.returnedWeight || 0;
                const availableWeight = item.availableWeight !== undefined ? item.availableWeight : item.netWeight;
                
                const isPartiallyDistributed = distributedWeight > 0;

                return (
                  <button 
                    key={item.id}
                    onClick={() => toggleInventoryItem(item)}
                    className={cn(
                      "text-right p-3.5 rounded-xl border transition-all flex flex-col justify-between text-xs relative overflow-hidden",
                      isSelected 
                        ? "border-amber-500 bg-amber-50/60 shadow-sm ring-2 ring-amber-500/20" 
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/50"
                    )}
                  >
                    {isPartiallyDistributed && (
                      <div className="absolute top-0 left-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-br">
                        موزعة جزئياً
                      </div>
                    )}

                    <div className="flex justify-between items-start w-full mb-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {item.category} ({item.modelCode})
                        </div>
                        {item.workshopDocNo && (
                          <span className="text-[10px] text-slate-400 font-mono">سند ورشة: {item.workshopDocNo}</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-white text-slate-800 rounded-full border border-slate-200 text-[10px] font-bold shadow-xs">
                        عيار {item.karat}
                      </span>
                    </div>

                    {/* Stock Metrics Breakdown */}
                    <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">الوزن المتاح حالياً:</span>
                        <span className="font-mono font-bold text-amber-900 text-xs">
                          {formatWeight(availableWeight)} جم
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">الوزن الأصلي للدفعة:</span>
                        <span className="font-mono text-slate-600">
                          {formatWeight(originalWeight)} جم
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">وُزّع سابقاً:</span>
                        <span className="font-mono text-slate-600">
                          {distributedWeight > 0 ? `${formatWeight(distributedWeight)} جم` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">عدد القطع المتاح:</span>
                        <span className="font-mono text-slate-700 font-bold">
                          {item.availableCount !== null && item.availableCount !== undefined ? `${item.availableCount} قطعة` : '—'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {availableInventory.length === 0 && (
                <div className="col-span-2 text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  لا توجد دفعات متوفرة في المخزون حالياً. يرجى استلام بضاعة من ورشة أولاً.
                </div>
              )}
            </div>
          </div>

          {/* Selected Batches Distribution Configuration Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-500" />
                  تفاصيل وتخصيص كميات التوزيع للمحل
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدخل الوزن المراد توزيعه يدويًا لكل صنف. يتم احتساب الوزن المتبقي وتكلفة الورشة تلقائيًا.
                </p>
              </div>
              <span className="text-xs bg-amber-500/10 text-amber-900 border border-amber-500/20 font-bold px-2.5 py-1 rounded-lg">
                {selectedItems.length} دفعة محددة للتوزيع
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {selectedItems.map((item, index) => {
                const inv = item.inventoryItem;
                const metrics = getItemDistMetrics(item);

                const originalWeight = inv.originalNetWeight || inv.netWeight;
                const distributedPreviously = inv.distributedWeight || 0;
                const returnedWeight = inv.returnedWeight || 0;
                const availableWeight = inv.availableWeight !== undefined ? inv.availableWeight : inv.netWeight;

                // Remaining weight after this proposed distribution
                const remainingWeightAfterDist = Math.max(0, availableWeight - (item.distributedNetWeight || 0));
                
                // Remaining pieces count after this proposed distribution
                const hasPieceCount = inv.availableCount !== null && inv.availableCount !== undefined;
                const remainingPiecesAfterDist = hasPieceCount && item.distributedCount !== null
                  ? Math.max(0, (inv.availableCount || 0) - (item.distributedCount || 0))
                  : null;

                const isOverDistributing = (item.distributedNetWeight || 0) > availableWeight + 0.0001;

                return (
                  <div key={inv.id} className="p-4 space-y-4 hover:bg-slate-50/40 transition-colors">
                    
                    {/* Batch Header Bar */}
                    <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          {inv.category} ({inv.modelCode}) - عيار {inv.karat}
                        </span>
                        {inv.workshopDocNo && (
                          <span className="text-xs text-slate-500 font-mono bg-white px-2 py-0.5 rounded border">
                            سند ورشة: {inv.workshopDocNo}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => removeSelectedItem(index)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 flex items-center gap-1 text-xs"
                        title="إلغاء التحديد"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>إلغاء</span>
                      </button>
                    </div>

                    {/* Batch Provenance Card: Original, Previous Dist, Available */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100/70 p-3 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">الوزن الأصلي للدفعة:</span>
                        <span className="font-mono font-bold text-slate-800">{formatWeight(originalWeight)} جم</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">الوزن الموزع سابقاً:</span>
                        <span className="font-mono font-bold text-slate-700">{formatWeight(distributedPreviously)} جم</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-900 block font-bold">الوزن المتاح حالياً:</span>
                        <span className="font-mono font-bold text-amber-700 text-sm">{formatWeight(availableWeight)} جم</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">القطع الأصلية / المتاحة:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {inv.count !== null && inv.count !== undefined ? `${inv.count} / ${inv.availableCount ?? inv.count}` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Distribution Input Fields (Manual Weight, Optional Count, Wage Method) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      
                      {/* 1. Weight to Distribute (Manual Input) */}
                      <div className={cn(
                        "p-3 rounded-xl border space-y-1.5 transition-all",
                        isOverDistributing 
                          ? "bg-red-50 border-red-300 ring-2 ring-red-500/20" 
                          : "bg-amber-50/60 border-amber-200"
                      )}>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-amber-600" />
                            الوزن المراد توزيعه للمحل (جم) *
                          </label>
                          <button
                            type="button"
                            onClick={() => updateSelectedItem(index, { distributedNetWeight: availableWeight })}
                            className="text-[10px] text-amber-700 hover:underline font-bold"
                          >
                            كامل المتاح
                          </button>
                        </div>
                        <input 
                          type="number"
                          step="0.001"
                          max={availableWeight}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 text-base text-left outline-none focus:ring-2 focus:ring-amber-500/20"
                          value={item.distributedNetWeight || ''}
                          onChange={(e) => updateSelectedItem(index, { distributedNetWeight: Number(e.target.value) })}
                        />
                        {isOverDistributing && (
                          <span className="text-[10px] text-red-600 font-bold block">
                            تنبيه: الوزن يتجاوز المتاح ({formatWeight(availableWeight)} جم)
                          </span>
                        )}
                      </div>

                      {/* 2. Pieces Count (Optional Input) */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-slate-500" />
                          عدد القطع الموزعة (اختياري)
                        </label>
                        <input 
                          type="number"
                          step="1"
                          placeholder="—"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 text-base text-left outline-none focus:ring-2 focus:ring-amber-500/20"
                          value={item.distributedCount !== null && item.distributedCount !== undefined ? item.distributedCount : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateSelectedItem(index, { distributedCount: val === '' ? null : Number(val) });
                          }}
                        />
                        <span className="text-[10px] text-slate-400 block">
                          اتركه فارغاً إذا لم ترغب بتحديد عدد القطع.
                        </span>
                      </div>

                      {/* 3. Remaining Weight & Pieces Preview */}
                      <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex flex-col justify-between">
                        <span className="text-xs font-bold text-emerald-900 block">الرصيد المتبقي بعد التوزيع</span>
                        <div className="space-y-1 my-auto">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[11px] text-emerald-700">الوزن المتبقي:</span>
                            <span className="font-mono font-bold text-emerald-950 text-sm">
                              {formatWeight(remainingWeightAfterDist)} جم
                            </span>
                          </div>
                          {hasPieceCount && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-[11px] text-emerald-700">القطع المتبقية:</span>
                              <span className="font-mono font-bold text-emerald-950 text-xs">
                                {remainingPiecesAfterDist !== null ? `${remainingPiecesAfterDist} قطعة` : '—'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Wage Calculation Mode & Pricing Controls */}
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-700">طريقة احتساب أجور المحل:</span>
                        
                        <div className="flex items-center gap-3 text-xs">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-800">
                            <input 
                              type="radio" 
                              name={`wageMethod-${inv.id}`}
                              checked={item.wageMethod === 'PER_GRAM'}
                              onChange={() => updateSelectedItem(index, { wageMethod: 'PER_GRAM' })}
                            />
                            حسب الجرام (الافتراضي)
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-800">
                            <input 
                              type="radio" 
                              name={`wageMethod-${inv.id}`}
                              checked={item.wageMethod === 'PER_PIECE'}
                              onChange={() => updateSelectedItem(index, { wageMethod: 'PER_PIECE' })}
                            />
                            حسب القطعة
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-800">
                            <input 
                              type="radio" 
                              name={`wageMethod-${inv.id}`}
                              checked={item.wageMethod === 'MANUAL_TOTAL'}
                              onChange={() => updateSelectedItem(index, { wageMethod: 'MANUAL_TOTAL' })}
                            />
                            إجمالي يدوي
                          </label>
                        </div>
                      </div>

                      {/* Pricing Inputs Grid based on wage method */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        
                        {/* Per Gram Mode */}
                        {item.wageMethod === 'PER_GRAM' && (
                          <>
                            <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                              <label className="text-[11px] font-bold text-amber-900 block mb-1">
                                أجرة الجرام على المحل (ر.ي/جم)
                              </label>
                              <input 
                                type="number"
                                step="1"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-900 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                                value={item.finalShopWagePerGram || ''}
                                onChange={(e) => updateSelectedItem(index, { finalShopWagePerGram: Number(e.target.value) })}
                              />
                            </div>

                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[11px] text-slate-500 block mb-1">أجرة الورشة المستخرجة:</span>
                              <span className="font-mono font-bold text-slate-700 text-sm block">
                                ~{formatApprox(inv.derivedWorkshopWagePerGram)} <small>ر.ي/جم</small>
                              </span>
                            </div>
                          </>
                        )}

                        {/* Per Piece Mode */}
                        {item.wageMethod === 'PER_PIECE' && (
                          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                            <label className="text-[11px] font-bold text-amber-900 block mb-1">
                              أجرة القطعة الواحدة (ر.ي/قطعة)
                            </label>
                            <input 
                              type="number"
                              step="1"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-900 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                              value={item.shopWagePerPiece || ''}
                              onChange={(e) => updateSelectedItem(index, { shopWagePerPiece: Number(e.target.value) })}
                            />
                          </div>
                        )}

                        {/* Manual Total Mode */}
                        {item.wageMethod === 'MANUAL_TOTAL' && (
                          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                            <label className="text-[11px] font-bold text-amber-900 block mb-1">
                              إجمالي الأجور المطلوب (ر.ي)
                            </label>
                            <input 
                              type="number"
                              step="1"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-900 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                              value={item.manualShopWageTotal || ''}
                              onChange={(e) => updateSelectedItem(index, { manualShopWageTotal: Number(e.target.value) })}
                            />
                          </div>
                        )}

                        {/* Allocated Workshop Cost for this distributed portion */}
                        <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                          <span className="text-[11px] text-blue-900 font-bold block mb-1">
                            تكلفة الورشة المخصصة للكمية:
                          </span>
                          <span className="font-mono font-bold text-blue-700 text-sm block">
                            {formatCurrency(metrics.allocatedWorkshopCost)} <small>ر.ي</small>
                          </span>
                        </div>

                        {/* Total Shop Wage & Expected Profit */}
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                          <span className="text-[11px] text-emerald-900 font-bold block mb-1">
                            إجمالي أجور المحل المحتسبة:
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            {formatCurrency(metrics.totalShopWage)} <small>ر.ي</small>
                          </span>
                        </div>
                      </div>

                      {/* Profit Callout */}
                      <div className="flex justify-between items-center bg-emerald-50 px-3 py-1.5 rounded-lg text-xs border border-emerald-100">
                        <span className="text-emerald-800 font-medium">صافي الربح المتوقع من هذه الكمية الموزعة:</span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          {formatCurrency(metrics.expectedProfit)} ر.ي
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}

              {selectedItems.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-xs italic">
                  لم تقم باختيار أي دفعة من المخزون بعد. انقر على الدفعات بالأعلى لبدء التوزيع.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Destination Shop & Accounting Summary */}
        <div className="space-y-6">
          {/* Shop Destination Picker */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs uppercase font-bold text-slate-700">
              اختيار المحل المستلم (الوجهة) *
            </label>
            <div className="relative">
              <Store className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pr-9 pl-3 font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
              >
                <option value="">-- اختر المحل المستلم --</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (رصيد الأجور: {formatCurrency(s.laborBalance)} ر.ي)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Distribution Accounting Summary Card */}
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl border border-slate-800 space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-xs uppercase font-bold text-amber-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                ملخص أجور وأرباح التوزيع
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                محاسبة دقيقة
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Distributed Weight */}
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="text-slate-400">إجمالي الذهب الموزع (صافي):</span>
                <span className="font-mono font-bold text-amber-400 text-base">
                  {formatWeight(totalDistributedNetWeight)} جم
                </span>
              </div>

              {/* Total Required from Shop */}
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="text-slate-400">إجمالي أجور المحل المطلوبة:</span>
                <span className="font-mono font-bold text-white text-base">
                  {formatCurrency(totalShopWages)} <small className="text-xs text-slate-400">ر.ي</small>
                </span>
              </div>

              {/* Allocated Workshop Cost */}
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="text-slate-400">تكلفة الورشة المخصصة للكمية:</span>
                <span className="font-mono font-bold text-blue-400 text-base">
                  {formatCurrency(totalAllocatedWorkshopCost)} <small className="text-xs text-slate-400">ر.ي</small>
                </span>
              </div>

              {/* Net Expected Profit */}
              <div className="pt-2 border-t border-white/10">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center space-y-1.5">
                  <span className="text-[11px] uppercase font-bold text-amber-400 block">
                    إجمالي الربح المتوقع
                  </span>
                  <div className="text-3xl font-mono font-bold text-amber-400" dir="ltr">
                    {formatCurrency(totalExpectedProfit)} <span className="text-sm font-normal text-white">ر.ي</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    محسوب من الإجماليات الدقيقة وفق نسبة الوزن الموزع من إجمالي السند الأصلي.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={selectedItems.length === 0 || !selectedShopId || hasInvalidWeights}
              className="w-full bg-amber-500 disabled:opacity-50 text-slate-950 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 active:scale-[0.99] cursor-pointer"
            >
              <CheckCircle className="w-5 h-5" />
              تأكيد وتنفيذ عملية التوزيع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
