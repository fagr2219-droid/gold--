import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { 
  suggestCollectionSplit, 
  calculateScrapEquivalent, 
  calculateGoldSettlementMetrics 
} from '../lib/accounting';
import { 
  formatCurrency, 
  formatWeight, 
  formatApprox, 
  cn 
} from '../lib/utils';
import { 
  Coins, 
  User, 
  CreditCard, 
  ArrowRightLeft, 
  CheckCircle, 
  Scale, 
  Plus, 
  Trash2, 
  Receipt, 
  Printer, 
  FileText, 
  Clock, 
  Building2, 
  RotateCcw,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import { PrintVoucher } from '../components/PrintVoucher';
import { 
  Karat, 
  CollectionItem, 
  CollectionItemType, 
  CollectionPurpose, 
  GoldSettlementInputMode, 
  PriceUnit,
  Transaction
} from '../types';

export default function Collections() {
  const { shops, transactions, addTransaction } = useAppStore();
  const [selectedShopId, setSelectedShopId] = useState('s1');
  const [printData, setPrintData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'NEW_VOUCHER' | 'HISTORY'>('NEW_VOUCHER');
  const [voucherNotes, setVoucherNotes] = useState('');

  // Compound Collection Items State
  const [items, setItems] = useState<CollectionItem[]>([
    {
      id: crypto.randomUUID(),
      type: 'LABOR_CASH',
      purpose: 'FOR_LABOR',
      laborCashAmount: 100000,
      paymentMethod: 'CASH',
    },
    {
      id: crypto.randomUUID(),
      type: 'SCRAP_GOLD',
      purpose: 'ACTUAL_SCRAP_GOLD',
      actualScrapWeight: 100,
      declaredScrapKarat: 21,
      dueKarat: 21,
      certifiedEquivalentWeight: 100,
      pureGoldWeight: 87.5,
    }
  ]);

  const selectedShop = shops.find(s => s.id === selectedShopId);

  // Shop Balances Before Transaction
  const currentGoldBalances = useMemo(() => {
    return selectedShop ? { ...selectedShop.goldBalances } : { 18: 0, 21: 0, 22: 0, 24: 0 };
  }, [selectedShop]);

  const currentLaborBalance = selectedShop ? selectedShop.laborBalance : 0;
  const workshopDue = selectedShop ? selectedShop.workshopDueBalance : 0;
  const profitDue = selectedShop ? selectedShop.profitBalance : 0;

  // Real-time Sums of the Compound Voucher
  const summaryMetrics = useMemo(() => {
    let totalLaborCash = 0;
    let totalGoldSettlementCash = 0;
    const totalDeductedGold: Record<Karat, number> = { 18: 0, 21: 0, 22: 0, 24: 0 };
    const scrapReceivedGold: Record<Karat, number> = { 18: 0, 21: 0, 22: 0, 24: 0 };

    for (const item of items) {
      if (item.type === 'LABOR_CASH') {
        totalLaborCash += item.laborCashAmount || 0;
      } else if (item.type === 'SCRAP_GOLD') {
        const k = item.dueKarat || 21;
        const w = item.certifiedEquivalentWeight || item.actualScrapWeight || 0;
        totalDeductedGold[k] = (totalDeductedGold[k] || 0) + w;
        scrapReceivedGold[item.declaredScrapKarat || 21] = (scrapReceivedGold[item.declaredScrapKarat || 21] || 0) + (item.actualScrapWeight || 0);
      } else if (item.type === 'CASH_GOLD_SETTLEMENT') {
        const k = item.dueKarat || 21;
        const w = item.settledGoldWeight || 0;
        totalDeductedGold[k] = (totalDeductedGold[k] || 0) + w;
        totalGoldSettlementCash += item.goldSettlementCashAmount || 0;
      } else if (item.type === 'THIRD_PARTY_SETTLEMENT') {
        const k = item.dueKarat || 21;
        if (item.thirdPartyType === 'CASH_FOR_GOLD') {
          const w = item.settledGoldWeight || 0;
          totalDeductedGold[k] = (totalDeductedGold[k] || 0) + w;
          if (!item.directSettlementNoTreasury) {
            totalGoldSettlementCash += item.goldSettlementCashAmount || 0;
          }
        } else {
          const w = item.certifiedEquivalentWeight || item.actualScrapWeight || 0;
          totalDeductedGold[k] = (totalDeductedGold[k] || 0) + w;
          scrapReceivedGold[item.declaredScrapKarat || 21] = (scrapReceivedGold[item.declaredScrapKarat || 21] || 0) + (item.actualScrapWeight || 0);
        }
      }
    }

    // Projected balances after
    const projectedLaborBalance = Math.max(0, currentLaborBalance - totalLaborCash);
    const projectedGoldBalances: Record<Karat, number> = {
      18: Math.max(0, Number(((currentGoldBalances[18] || 0) - (totalDeductedGold[18] || 0)).toFixed(3))),
      21: Math.max(0, Number(((currentGoldBalances[21] || 0) - (totalDeductedGold[21] || 0)).toFixed(3))),
      22: Math.max(0, Number(((currentGoldBalances[22] || 0) - (totalDeductedGold[22] || 0)).toFixed(3))),
      24: Math.max(0, Number(((currentGoldBalances[24] || 0) - (totalDeductedGold[24] || 0)).toFixed(3))),
    };

    // Split strictly for labor cash
    const laborSplit = suggestCollectionSplit(totalLaborCash, workshopDue, profitDue);

    return {
      totalLaborCash,
      totalGoldSettlementCash,
      totalDeductedGold,
      scrapReceivedGold,
      projectedLaborBalance,
      projectedGoldBalances,
      laborSplit
    };
  }, [items, currentLaborBalance, currentGoldBalances, workshopDue, profitDue]);

  // Add Item to Compound Voucher
  const handleAddItem = (type: CollectionItemType) => {
    let newItem: CollectionItem;
    if (type === 'LABOR_CASH') {
      newItem = {
        id: crypto.randomUUID(),
        type: 'LABOR_CASH',
        purpose: 'FOR_LABOR',
        laborCashAmount: 0,
        paymentMethod: 'CASH',
      };
    } else if (type === 'SCRAP_GOLD') {
      newItem = {
        id: crypto.randomUUID(),
        type: 'SCRAP_GOLD',
        purpose: 'ACTUAL_SCRAP_GOLD',
        actualScrapWeight: 0,
        declaredScrapKarat: 21,
        dueKarat: 21,
        certifiedEquivalentWeight: 0,
        pureGoldWeight: 0,
      };
    } else if (type === 'CASH_GOLD_SETTLEMENT') {
      newItem = {
        id: crypto.randomUUID(),
        type: 'CASH_GOLD_SETTLEMENT',
        purpose: 'FOR_GOLD_SETTLEMENT',
        settlementInputMode: 'WEIGHT_AND_PRICE',
        settledGoldWeight: 0,
        goldPricePerGram: 65000,
        priceUnit: 'PER_GRAM',
        dueKarat: 21,
        pricedKarat: 21,
        goldSettlementCashAmount: 0,
        pricingDateTime: new Date().toISOString().slice(0, 16),
      };
    } else {
      newItem = {
        id: crypto.randomUUID(),
        type: 'THIRD_PARTY_SETTLEMENT',
        purpose: 'THIRD_PARTY',
        thirdPartyType: 'CASH_FOR_GOLD',
        settledGoldWeight: 0,
        goldPricePerGram: 65000,
        goldSettlementCashAmount: 0,
        dueKarat: 21,
        thirdPartyName: '',
      };
    }
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<CollectionItem>) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };

      // Auto-recalculate Scrap Gold equivalent if weight / karat / assay changed
      if (updated.type === 'SCRAP_GOLD') {
        const res = calculateScrapEquivalent({
          actualWeight: updated.actualScrapWeight || 0,
          declaredKarat: updated.declaredScrapKarat || 21,
          dueKarat: updated.dueKarat || 21,
          assayPerMille: updated.assayPerMille,
        });
        updated.pureGoldWeight = res.pureGoldWeight;
        updated.certifiedEquivalentWeight = res.certifiedEquivalentWeight;
      }

      // Auto-recalculate Cash Gold Settlement if mode/weight/price/amount changed
      if (updated.type === 'CASH_GOLD_SETTLEMENT' || (updated.type === 'THIRD_PARTY_SETTLEMENT' && updated.thirdPartyType === 'CASH_FOR_GOLD')) {
        const mode = updated.settlementInputMode || 'WEIGHT_AND_PRICE';
        const res = calculateGoldSettlementMetrics({
          inputMode: mode,
          weightInput: updated.settledGoldWeight,
          priceInput: updated.goldPricePerGram,
          amountInput: updated.goldSettlementCashAmount,
          priceUnit: updated.priceUnit,
          customUnitGrams: updated.customUnitGrams,
        });
        if (mode === 'WEIGHT_AND_PRICE') {
          updated.goldSettlementCashAmount = res.totalCashAmount;
        } else if (mode === 'AMOUNT_AND_PRICE') {
          updated.settledGoldWeight = res.settledWeight;
        } else if (mode === 'WEIGHT_AND_TOTAL') {
          updated.goldPricePerGram = res.effectivePricePerGram;
        }
      }

      return updated;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  // Submit Compound Voucher
  const handleSubmitVoucher = async () => {
    if (!selectedShopId) {
      alert('يرجى اختيار المحل أولاً');
      return;
    }

    if (items.length === 0) {
      alert('يرجى إضافة بند تحصيل واحد على الأقل في السند');
      return;
    }

    // Validation
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      if (it.type === 'LABOR_CASH' && (!it.laborCashAmount || it.laborCashAmount <= 0)) {
        alert(`البند #${idx + 1} (أجور نقدية): يرجى إدخال مبلغ صحيح`);
        return;
      }
      if (it.type === 'SCRAP_GOLD' && (!it.actualScrapWeight || it.actualScrapWeight <= 0)) {
        alert(`البند #${idx + 1} (ذهب كسر): يرجى إدخال وزن صحيح`);
        return;
      }
      if (it.type === 'CASH_GOLD_SETTLEMENT' && (!it.settledGoldWeight || it.settledGoldWeight <= 0 || !it.goldSettlementCashAmount || it.goldSettlementCashAmount <= 0)) {
        alert(`البند #${idx + 1} (تسوية ذهب نقدًا): يرجى التأكد من إدخال الوزن والمبلغ`);
        return;
      }
    }

    // Determine voucher type
    let voucherType: 'LABOR_ONLY' | 'SCRAP_ONLY' | 'GOLD_SETTLEMENT_ONLY' | 'COMPOSITE' = 'COMPOSITE';
    if (items.every(i => i.type === 'LABOR_CASH')) voucherType = 'LABOR_ONLY';
    else if (items.every(i => i.type === 'SCRAP_GOLD')) voucherType = 'SCRAP_ONLY';
    else if (items.every(i => i.type === 'CASH_GOLD_SETTLEMENT')) voucherType = 'GOLD_SETTLEMENT_ONLY';

    const tx: Transaction = {
      id: `COL-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      type: 'COLLECT_FROM_SHOP',
      entityId: selectedShopId,
      entityName: selectedShop?.name,
      paymentMethod: 'COMPOSITE',
      collectionItems: items,
      voucherType,
      notes: voucherNotes,
      totalLaborCash: summaryMetrics.totalLaborCash,
      totalGoldSettlementCash: summaryMetrics.totalGoldSettlementCash,
      totalScrapGoldWeight: summaryMetrics.totalDeductedGold,
      workshopLaborShare: summaryMetrics.laborSplit.workshopPart,
      distributorProfitShare: summaryMetrics.laborSplit.distributionPart,
      balancesBefore: {
        goldBalances: currentGoldBalances,
        laborBalance: currentLaborBalance,
      },
      balancesAfter: {
        goldBalances: summaryMetrics.projectedGoldBalances,
        laborBalance: summaryMetrics.projectedLaborBalance,
      },
      cashAmount: summaryMetrics.totalLaborCash + summaryMetrics.totalGoldSettlementCash,
    };

    await addTransaction(tx);

    setPrintData({
      ...tx,
      companyName: 'مؤسسة الذهب والمجوهرات',
    });

    alert('تم حفظ وترحيل سند التحصيل بنجاح');
    setItems([]);
    setVoucherNotes('');
  };

  // Reverse Transaction Handler (سند عكسي)
  const handleReverseTransaction = async (originalTx: Transaction) => {
    if (!window.confirm(`هل أنت متأكد من إنشاء سند عكسي لإلغاء السند رقم ${originalTx.id}؟ سيتم إعادة الأرصدة بدقة.`)) {
      return;
    }

    const reverseTx: Transaction = {
      id: `REV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      type: 'REVERSE_COLLECTION',
      entityId: originalTx.entityId,
      entityName: originalTx.entityName,
      referenceId: originalTx.id,
      paymentMethod: 'COMPOSITE',
      collectionItems: originalTx.collectionItems,
      notes: `سند عكسي لإلغاء السند المرجعي رقم ${originalTx.id}`,
      totalLaborCash: originalTx.totalLaborCash,
      totalGoldSettlementCash: originalTx.totalGoldSettlementCash,
      workshopLaborShare: originalTx.workshopLaborShare,
      distributorProfitShare: originalTx.distributorProfitShare,
    };

    await addTransaction(reverseTx);
    alert(`تم إصدار السند العكسي ${reverseTx.id} وإلغاء أثر التحصيل بنجاح.`);
  };

  const collectionTransactions = transactions.filter(
    t => t.type === 'COLLECT_FROM_SHOP' || t.type === 'REVERSE_COLLECTION'
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Print Voucher Modal */}
      {printData && (
        <PrintVoucher 
          title="سند قبض"
          type="Thermal80" 
          data={printData} 
          onClose={() => setPrintData(null)} 
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Receipt className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">سندات التحصيل</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            فصل مستقل بين رصيد الذهب (جرام) ورصيد الأجور (ريال).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('NEW_VOUCHER')}
            className={cn(
              "px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5",
              activeTab === 'NEW_VOUCHER'
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Plus className="w-4 h-4" />
            سند قبض جديد
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={cn(
              "px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5",
              activeTab === 'HISTORY'
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Clock className="w-4 h-4" />
            سجل السندات ({collectionTransactions.length})
          </button>
        </div>
      </div>

      {activeTab === 'NEW_VOUCHER' ? (
        <div className="space-y-6">
          {/* Shop Selector Card & Real-time Live Balances Header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="w-full md:w-80">
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">
                  المحل
                </label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 appearance-none font-bold text-slate-900 text-sm"
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                  >
                    <option value="">-- اختر محلاً --</option>
                    {shops.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone || 'بدون هاتف'})
                      </option>
                    ))}
                  </select>
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {selectedShop && (
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">العنوان:</span>
                    <span className="font-bold text-slate-800">{selectedShop.address || 'غير محدد'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">الهاتف:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedShop.phone || '---'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Comprehensive Independent Balances Inspector Header */}
            {selectedShop && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    موقف الأرصدة
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    تحديث لحظي
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Gold Balance Before */}
                  <div className="bg-amber-50/50 border border-amber-200/70 p-4 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-amber-900">
                      <span className="text-[11px] font-bold">رصيد الذهب (قبل)</span>
                      <Scale className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="space-y-0.5 font-mono">
                      {[18, 21, 22, 24].map((k) => {
                        const val = currentGoldBalances[k as Karat] || 0;
                        if (val === 0 && k !== 21) return null;
                        return (
                          <div key={k} className="text-xs font-bold text-amber-950 flex justify-between">
                            <span>عيار {k}:</span>
                            <span>{formatWeight(val)} جم</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Labor Balance Before */}
                  <div className="bg-emerald-50/50 border border-emerald-200/70 p-4 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-emerald-900">
                      <span className="text-[11px] font-bold">رصيد الأجور (قبل)</span>
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xl font-mono font-black text-emerald-950">
                      {formatCurrency(currentLaborBalance)} <small className="text-xs font-normal">ر.ي</small>
                    </div>
                    <div className="text-[10px] text-emerald-700 flex justify-between">
                      <span>ورش: {formatCurrency(workshopDue)}</span>
                      <span>ربح: {formatCurrency(profitDue)}</span>
                    </div>
                  </div>

                  {/* Card 3: Voucher Movement (Received in this voucher) */}
                  <div className="bg-blue-50/50 border border-blue-200/70 p-4 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-blue-900">
                      <span className="text-[11px] font-bold">المستلم في السند</span>
                      <Receipt className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-xs space-y-1 text-blue-950">
                      <div className="flex justify-between font-mono font-bold">
                        <span>الأجور:</span>
                        <span className="text-emerald-700">{formatCurrency(summaryMetrics.totalLaborCash)} ر.ي</span>
                      </div>
                      <div className="flex justify-between font-mono font-bold">
                        <span>الكسر:</span>
                        <span className="text-amber-800">
                          {formatWeight((Object.values(summaryMetrics.totalDeductedGold) as number[]).reduce((a, b) => a + b, 0))} جم
                        </span>
                      </div>
                      {summaryMetrics.totalGoldSettlementCash > 0 && (
                        <div className="flex justify-between font-mono font-bold">
                          <span>تسوية ذهب:</span>
                          <span className="text-blue-700">{formatCurrency(summaryMetrics.totalGoldSettlementCash)} ر.ي</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Balances After Transaction */}
                  <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1.5 border border-slate-800">
                    <div className="flex justify-between items-center text-amber-400">
                      <span className="text-[11px] font-bold">الرصيد المتبقي (بعد)</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ذهب ع21:</span>
                        <span className="font-bold text-amber-300">
                          {formatWeight(summaryMetrics.projectedGoldBalances[21])} جم
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الأجور:</span>
                        <span className="font-bold text-emerald-300">
                          {formatCurrency(summaryMetrics.projectedLaborBalance)} ر.ي
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Layout: Voucher Builder (Left) + Split & Summary (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6 items-start">
            {/* Left Column: Compound Items Builder */}
            <div className="space-y-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-600" />
                      بنود السند ({items.length})
                    </h2>
                  </div>

                  {/* Add Item Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAddItem('LABOR_CASH')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      الأجور
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem('SCRAP_GOLD')}
                      className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      الكسر
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem('CASH_GOLD_SETTLEMENT')}
                      className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      تسوية ذهب
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem('THIRD_PARTY_SETTLEMENT')}
                      className="px-3 py-1.5 bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      طرف ثالث
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {items.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-slate-500 text-sm font-medium">السند فارغ حالياً</p>
                    <p className="text-slate-400 text-xs">اضغط على أحد الأزرار بالأعلى لإضافة بند إلى السند.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-4 rounded-xl border transition-all space-y-4",
                          item.type === 'LABOR_CASH' ? "bg-emerald-50/20 border-emerald-200" :
                          item.type === 'SCRAP_GOLD' ? "bg-amber-50/20 border-amber-200" :
                          item.type === 'CASH_GOLD_SETTLEMENT' ? "bg-blue-50/20 border-blue-200" :
                          "bg-purple-50/20 border-purple-200"
                        )}
                      >
                        {/* Item Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[11px] flex items-center justify-center font-bold">
                              {index + 1}
                            </span>
                            <span className="font-bold text-xs text-slate-900">
                              {item.type === 'LABOR_CASH' && 'تحصيل الأجور'}
                              {item.type === 'SCRAP_GOLD' && 'الكسر'}
                              {item.type === 'CASH_GOLD_SETTLEMENT' && 'تسوية ذهب'}
                              {item.type === 'THIRD_PARTY_SETTLEMENT' && 'طرف ثالث'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                            title="حذف البند"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* CASE 1: LABOR CASH */}
                        {item.type === 'LABOR_CASH' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                  المبلغ المستلم (ر.ي) *
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-emerald-300 rounded-lg py-2 px-3 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    placeholder="0.00"
                                    value={item.laborCashAmount || ''}
                                    onChange={(e) => handleUpdateItem(item.id, { laborCashAmount: Number(e.target.value) })}
                                  />
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">ر.ي</span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">طريقة الدفع</label>
                                <select
                                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 outline-none"
                                  value={item.paymentMethod || 'CASH'}
                                  onChange={(e) => handleUpdateItem(item.id, { paymentMethod: e.target.value as any })}
                                >
                                  <option value="CASH">نقدي</option>
                                  <option value="TRANSFER">تحويل بنكي / صرافة</option>
                                </select>
                              </div>
                            </div>

                            {item.paymentMethod === 'TRANSFER' && (
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">رقم الحوالة / المرجع</label>
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none"
                                  placeholder="رقم الإشعار أو الحوالة"
                                  value={item.transferRef || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { transferRef: e.target.value })}
                                />
                              </div>
                            )}

                            <div className="text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded-lg flex items-center justify-between border border-emerald-200">
                              <span>يُخصم من رصيد الأجور فقط.</span>
                              <span className="font-bold font-mono">الخصم: -{formatCurrency(item.laborCashAmount || 0)} ر.ي</span>
                            </div>
                          </div>
                        )}

                        {/* CASE 2: SCRAP GOLD (ذهب كسر فعلي) */}
                        {item.type === 'SCRAP_GOLD' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                  الوزن المستلم (جم) *
                                </label>
                                <input
                                  type="number"
                                  step="0.001"
                                  className="w-full bg-white border border-amber-300 rounded-lg py-2 px-3 font-mono font-bold text-slate-900 outline-none"
                                  placeholder="0.000"
                                  value={item.actualScrapWeight || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { actualScrapWeight: Number(e.target.value) })}
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">العيار</label>
                                <select
                                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 outline-none"
                                  value={item.declaredScrapKarat || 21}
                                  onChange={(e) => handleUpdateItem(item.id, { declaredScrapKarat: Number(e.target.value) as Karat })}
                                >
                                  <option value={18}>عيار 18</option>
                                  <option value={21}>عيار 21</option>
                                  <option value={22}>عيار 22</option>
                                  <option value={24}>عيار 24</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">الخصم من عيار</label>
                                <select
                                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 outline-none"
                                  value={item.dueKarat || 21}
                                  onChange={(e) => handleUpdateItem(item.id, { dueKarat: Number(e.target.value) as Karat })}
                                >
                                  <option value={18}>عيار 18</option>
                                  <option value={21}>عيار 21 (الافتراضي)</option>
                                  <option value={22}>عيار 22</option>
                                  <option value={24}>عيار 24</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">التحليل بالألف (اختياري)</label>
                                <input
                                  type="number"
                                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 font-mono text-xs outline-none"
                                  placeholder="مثال: 875 أو 750"
                                  value={item.assayPerMille || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { assayPerMille: e.target.value ? Number(e.target.value) : undefined })}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">رقم السند / التحليل</label>
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none"
                                  placeholder="رقم السند إن وجد"
                                  value={item.receiptDocNo || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { receiptDocNo: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">ملاحظات الكسر</label>
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none"
                                  placeholder="سلاسل، خواتم..."
                                  value={item.notes || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                                />
                              </div>
                            </div>

                            {/* Live Equivalent Calculation Preview */}
                            <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-slate-500 block text-[10px]">الذهب الخالص ع24:</span>
                                  <span className="font-mono font-bold text-amber-900">{formatWeight(item.pureGoldWeight || 0)} جم</span>
                                </div>
                                <div className="border-r border-amber-200 pr-4">
                                  <span className="text-slate-500 block text-[10px]">الوزن المعتمد (ع{item.dueKarat || 21}):</span>
                                  <span className="font-mono font-black text-emerald-900 text-sm">{formatWeight(item.certifiedEquivalentWeight || 0)} جم</span>
                                </div>
                              </div>

                              <div className="text-[10px] text-amber-800 font-medium">
                                يُخصم {formatWeight(item.certifiedEquivalentWeight || 0)} جم من رصيد الذهب فقط.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CASE 3: CASH GOLD SETTLEMENT (قطع/تسوية الذهب نقدًا) */}
                        {item.type === 'CASH_GOLD_SETTLEMENT' && (
                          <div className="space-y-3">
                            {/* Input Mode Selector */}
                            <div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                {[
                                  { mode: 'WEIGHT_AND_PRICE', label: 'الوزن + سعر الجرام' },
                                  { mode: 'AMOUNT_AND_PRICE', label: 'المبلغ + سعر الجرام' },
                                  { mode: 'WEIGHT_AND_TOTAL', label: 'الوزن + المبلغ' },
                                ].map((m) => (
                                  <button
                                    key={m.mode}
                                    type="button"
                                    onClick={() => handleUpdateItem(item.id, { settlementInputMode: m.mode as GoldSettlementInputMode })}
                                    className={cn(
                                      "py-1.5 px-2 rounded-lg font-bold border text-center transition-all text-xs cursor-pointer",
                                      item.settlementInputMode === m.mode
                                        ? "bg-blue-900 text-white border-blue-900"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"
                                    )}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Settled Gold Weight */}
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                  الوزن المسوى (جم) *
                                </label>
                                <input
                                  type="number"
                                  step="0.001"
                                  disabled={item.settlementInputMode === 'AMOUNT_AND_PRICE'}
                                  className={cn(
                                    "w-full rounded-lg py-2 px-3 font-mono font-bold outline-none",
                                    item.settlementInputMode === 'AMOUNT_AND_PRICE'
                                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                                      : "bg-white border border-blue-300 text-slate-900"
                                  )}
                                  placeholder="0.000"
                                  value={item.settledGoldWeight || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { settledGoldWeight: Number(e.target.value) })}
                                />
                              </div>

                              {/* Price per Gram */}
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                  سعر الجرام (ر.ي) *
                                </label>
                                <input
                                  type="number"
                                  disabled={item.settlementInputMode === 'WEIGHT_AND_TOTAL'}
                                  className={cn(
                                    "w-full rounded-lg py-2 px-3 font-mono font-bold outline-none",
                                    item.settlementInputMode === 'WEIGHT_AND_TOTAL'
                                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                                      : "bg-white border border-blue-300 text-slate-900"
                                  )}
                                  placeholder="65000"
                                  value={item.goldPricePerGram || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { goldPricePerGram: Number(e.target.value) })}
                                />
                              </div>

                              {/* Total Cash Amount */}
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                  المبلغ المستلم (ر.ي) *
                                </label>
                                <input
                                  type="number"
                                  disabled={item.settlementInputMode === 'WEIGHT_AND_PRICE'}
                                  className={cn(
                                    "w-full rounded-lg py-2 px-3 font-mono font-bold outline-none",
                                    item.settlementInputMode === 'WEIGHT_AND_PRICE'
                                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                                      : "bg-white border border-blue-300 text-slate-900"
                                  )}
                                  placeholder="0.00"
                                  value={item.goldSettlementCashAmount || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { goldSettlementCashAmount: Number(e.target.value) })}
                                />
                              </div>
                            </div>

                            {/* Settlement Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">العيار</label>
                                <select
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 outline-none"
                                  value={item.dueKarat || 21}
                                  onChange={(e) => handleUpdateItem(item.id, { dueKarat: Number(e.target.value) as Karat, pricedKarat: Number(e.target.value) as Karat })}
                                >
                                  <option value={18}>عيار 18</option>
                                  <option value={21}>عيار 21 (الافتراضي)</option>
                                  <option value={22}>عيار 22</option>
                                  <option value={24}>عيار 24</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">الموافق</label>
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none"
                                  placeholder="اسم الشخص"
                                  value={item.agreedByPerson || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { agreedByPerson: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">الوقت والتاريخ</label>
                                <input
                                  type="datetime-local"
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none font-mono"
                                  value={item.pricingDateTime || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { pricingDateTime: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 flex justify-between items-center text-xs">
                              <span className="text-blue-950 font-medium">
                                خصم <strong>{formatWeight(item.settledGoldWeight || 0)} جم ع{item.dueKarat || 21}</strong> + توريد <strong>{formatCurrency(item.goldSettlementCashAmount || 0)} ر.ي</strong> للخزينة.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* CASE 4: THIRD PARTY SETTLEMENT */}
                        {item.type === 'THIRD_PARTY_SETTLEMENT' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">الطرف الثالث *</label>
                                <input
                                  type="text"
                                  className="w-full bg-white border border-purple-300 rounded-lg py-2 px-3 text-xs font-bold outline-none"
                                  placeholder="اسم المحل أو التاجر"
                                  value={item.thirdPartyName || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { thirdPartyName: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">نوع التسوية</label>
                                <select
                                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 outline-none"
                                  value={item.thirdPartyType || 'CASH_FOR_GOLD'}
                                  onChange={(e) => handleUpdateItem(item.id, { thirdPartyType: e.target.value as any })}
                                >
                                  <option value="CASH_FOR_GOLD">استلام نقد بدل الذهب</option>
                                  <option value="ACTUAL_GOLD">استلام ذهب فعلي</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">الوزن المسوى (جم)</label>
                                <input
                                  type="number"
                                  step="0.001"
                                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 font-mono font-bold outline-none"
                                  placeholder="0.000"
                                  value={item.settledGoldWeight || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { settledGoldWeight: Number(e.target.value) })}
                                />
                              </div>
                            </div>

                            {item.thirdPartyType === 'CASH_FOR_GOLD' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">المبلغ المستلم (ر.ي)</label>
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 font-mono font-bold outline-none"
                                    placeholder="0.00"
                                    value={item.goldSettlementCashAmount || ''}
                                    onChange={(e) => handleUpdateItem(item.id, { goldSettlementCashAmount: Number(e.target.value) })}
                                  />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                  <input
                                    type="checkbox"
                                    id={`direct-${item.id}`}
                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                    checked={item.directSettlementNoTreasury || false}
                                    onChange={(e) => handleUpdateItem(item.id, { directSettlementNoTreasury: e.target.checked })}
                                  />
                                  <label htmlFor={`direct-${item.id}`} className="text-xs text-slate-700 cursor-pointer">
                                    تسوية مباشرة بين المحلين (لا يدخل نقد في الخزينة)
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Voucher Notes */}
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">ملاحظات السند</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="ملاحظات اختيارية..."
                    value={voucherNotes}
                    onChange={(e) => setVoucherNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Accounting Split (strictly for labor) & Final Confirmation */}
            <div className="space-y-5">
              {/* Accounting Split Widget: strictly on Labor Cash */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <span className="text-amber-400">⚡</span> التقسيم المحاسبي
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold">
                    للأجور فقط
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">إجمالي نقد الأجور:</span>
                    <span className="text-2xl font-mono font-black text-white">
                      {formatCurrency(summaryMetrics.totalLaborCash)} <small className="text-xs font-normal">ر.ي</small>
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Workshop Due Share */}
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">حصة الورشة:</span>
                        <span className="text-blue-400 font-mono font-bold">
                          {((summaryMetrics.laborSplit.workshopPart / (summaryMetrics.totalLaborCash || 1)) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-lg font-mono font-bold text-blue-400">
                        {formatCurrency(summaryMetrics.laborSplit.workshopPart)} <small className="text-[10px]">ر.ي</small>
                      </div>
                    </div>

                    {/* Distributor Profit Share */}
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">ربح التوزيع:</span>
                        <span className="text-amber-400 font-mono font-bold">
                          {((summaryMetrics.laborSplit.distributionPart / (summaryMetrics.totalLaborCash || 1)) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-lg font-mono font-bold text-amber-400">
                        {formatCurrency(summaryMetrics.laborSplit.distributionPart)} <small className="text-[10px]">ر.ي</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card and Submit Button */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">ملخص السند</h4>

                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">نقد الأجور:</span>
                    <span className="font-mono font-bold text-emerald-800">{formatCurrency(summaryMetrics.totalLaborCash)} ر.ي</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-500">الكسر (ع21):</span>
                    <span className="font-mono font-bold text-amber-900">{formatWeight(summaryMetrics.totalDeductedGold[21])} جم</span>
                  </div>
                  {summaryMetrics.totalGoldSettlementCash > 0 && (
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">تسوية الذهب:</span>
                      <span className="font-mono font-bold text-blue-900">{formatCurrency(summaryMetrics.totalGoldSettlementCash)} ر.ي</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 font-bold text-slate-900">
                    <span>إجمالي النقد المورّد:</span>
                    <span className="font-mono text-sm">
                      {formatCurrency(summaryMetrics.totalLaborCash + summaryMetrics.totalGoldSettlementCash)} ر.ي
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitVoucher}
                  disabled={items.length === 0}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]",
                    items.length > 0
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20 cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <CheckCircle className="w-5 h-5" />
                  حفظ وترحيل السند
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History & Audit Trail Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-base">سجل سندات التحصيل</h3>
              <p className="text-slate-500 text-xs">سجل تاريخي مع إمكانية الطباعة وإصدار سند عكسي.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-3.5">رقم السند</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">المحل</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">الأجور</th>
                  <th className="p-3.5">الكسر / التسوية</th>
                  <th className="p-3.5">نقد التسوية</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collectionTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      لا توجد سندات تحصيل مسجلة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  collectionTransactions.map((tx) => (
                    <tr key={tx.id} className={cn("hover:bg-slate-50/80 transition-colors", tx.type === 'REVERSE_COLLECTION' && "bg-red-50/40")}>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{tx.id}</td>
                      <td className="p-3.5 text-slate-600">{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                      <td className="p-3.5 font-bold text-slate-800">{tx.entityName || '---'}</td>
                      <td className="p-3.5">
                        {tx.type === 'REVERSE_COLLECTION' ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                            سند عكسي
                          </span>
                        ) : (
                          <span className={cn(
                            "px-2 py-0.5 rounded font-bold text-[10px]",
                            tx.voucherType === 'LABOR_ONLY' ? "bg-emerald-100 text-emerald-800" :
                            tx.voucherType === 'SCRAP_ONLY' ? "bg-amber-100 text-amber-900" :
                            tx.voucherType === 'GOLD_SETTLEMENT_ONLY' ? "bg-blue-100 text-blue-900" :
                            "bg-purple-100 text-purple-900"
                          )}>
                            {tx.voucherType === 'LABOR_ONLY' ? 'أجور' :
                             tx.voucherType === 'SCRAP_ONLY' ? 'كسر' :
                             tx.voucherType === 'GOLD_SETTLEMENT_ONLY' ? 'تسوية' : 'مركب'}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-800">
                        {tx.totalLaborCash ? `${formatCurrency(tx.totalLaborCash)} ر.ي` : '---'}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-amber-900">
                        {tx.totalScrapGoldWeight && (Object.values(tx.totalScrapGoldWeight) as number[]).some(v => v > 0)
                          ? `${formatWeight((Object.values(tx.totalScrapGoldWeight) as number[]).reduce((a, b) => a + b, 0))} جم`
                          : '---'}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-blue-800">
                        {tx.totalGoldSettlementCash ? `${formatCurrency(tx.totalGoldSettlementCash)} ر.ي` : '---'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPrintData(tx)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="طباعة السند"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {tx.type === 'COLLECT_FROM_SHOP' && (
                            <button
                              onClick={() => handleReverseTransaction(tx)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="إصدار سند عكسي لإلغاء التحصيل"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
