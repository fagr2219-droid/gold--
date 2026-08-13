import React, { useState } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { calculateReturnMetrics } from '../lib/accounting';
import { formatCurrency, formatWeight, formatApprox, cn } from '../lib/utils';
import { 
  RotateCcw, Store, CheckCircle, Package, Scale, 
  AlertTriangle, Calculator, FileText, Info 
} from 'lucide-react';
import { TransactionItem } from '../types';
import { PrintVoucher } from '../components/PrintVoucher';

export default function Returns() {
  const { shops, inventory, transactions, addTransaction } = useAppStore();
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedTxId, setSelectedTxId] = useState('');
  const [returnItemIndex, setReturnItemIndex] = useState<number>(0);
  
  // Return inputs
  const [actualReturnedWeight, setActualReturnedWeight] = useState<number>(0);
  const [returnedPiecesCount, setReturnedPiecesCount] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState('إرجاع بضاعة / تصفية رصيد');
  const [printData, setPrintData] = useState<any>(null);

  // Filter distribution transactions for selected shop
  const shopDistributions = transactions.filter(t => 
    t.type === 'DISTRIBUTE_TO_SHOP' && 
    t.entityId === selectedShopId &&
    t.items && t.items.length > 0
  );

  const selectedTx = shopDistributions.find(t => t.id === selectedTxId);
  const targetItem = selectedTx?.items?.[returnItemIndex];

  const handleSelectTx = (txId: string) => {
    setSelectedTxId(txId);
    setReturnItemIndex(0);
    const tx = shopDistributions.find(t => t.id === txId);
    if (tx && tx.items?.[0]) {
      setActualReturnedWeight(tx.items[0].netWeight);
      setReturnedPiecesCount(tx.items[0].count ?? null);
    }
  };

  const handleSelectItemIndex = (index: number) => {
    setReturnItemIndex(index);
    if (selectedTx?.items?.[index]) {
      setActualReturnedWeight(selectedTx.items[index].netWeight);
      setReturnedPiecesCount(selectedTx.items[index].count ?? null);
    }
  };

  const returnMetrics = targetItem ? calculateReturnMetrics({
    actualReturnedWeight: actualReturnedWeight || 0,
    originalDistributedWeight: targetItem.netWeight,
    originalShopWageTotal: targetItem.totalShopWage || 0,
    originalAllocatedWorkshopCost: targetItem.allocatedWorkshopCost || 0,
  }) : null;

  const handleSubmit = async () => {
    if (!selectedShopId) return alert('يرجى اختيار المحل');
    if (!selectedTx || !targetItem) return alert('يرجى اختيار حركة التوزيع المراد الإرجاع منها');
    if (!actualReturnedWeight || actualReturnedWeight <= 0) return alert('يرجى إدخال وزن الإرجاع الفعلي');

    const shop = shops.find(s => s.id === selectedShopId);
    const txId = `RET-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

    const txItem: TransactionItem = {
      inventoryItemId: targetItem.inventoryItemId,
      category: targetItem.category,
      modelCode: targetItem.modelCode,
      count: returnedPiecesCount,
      karat: targetItem.karat,
      netWeight: actualReturnedWeight,
      grossWeight: actualReturnedWeight,
      originalDistributedWeight: targetItem.netWeight,
      actualReturnedWeight: actualReturnedWeight,
      returnedPiecesCount: returnedPiecesCount,
      returnWeightDiff: returnMetrics?.weightDifference || 0,
      returnReason: returnReason,
      
      // Proportional reversal totals
      totalShopWage: returnMetrics?.returnedShopWage || 0,
      allocatedWorkshopCost: returnMetrics?.returnedWorkshopCost || 0,
      expectedProfit: returnMetrics?.returnedProfit || 0,
    };

    const returnTx = {
      id: txId,
      date: new Date().toISOString(),
      type: 'RETURN_FROM_SHOP' as const,
      entityId: selectedShopId,
      entityName: shop?.name,
      referenceId: selectedTx.id,
      notes: `مرتجع من سند التوزيع ${selectedTx.id} - ${returnReason}`,
      items: [txItem],
      cashAmount: returnMetrics?.returnedShopWage || 0,
    };

    await addTransaction(returnTx);

    setPrintData({
      ...returnTx,
      companyName: 'نظام إدارة وتوزيع الذهب',
      currency: 'ر.ي',
      items: [{
        ...txItem,
        weight: actualReturnedWeight,
      }]
    });

    alert('تم تسجيل عملية الإرجاع بنجاح وتحديث رصيد المحل والمخزون.');
    setSelectedTxId('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {printData && (
        <PrintVoucher 
          title="سند إرجاع بضاعة من محل" 
          type="Thermal80" 
          data={printData} 
          onClose={() => setPrintData(null)} 
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-amber-500" />
            إرجاع بضاعة من محل (إعادة للمخزون وعكس القيد)
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            إرجاع كميات موزعة كلياً أو جزئياً، إعادة الوزن للمخزون، وعكس أجور المحل وتكلفة الورشة بنسبة وتناسب دقيقة.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Shop Picker & Distribution Selection */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Shop Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs uppercase font-bold text-slate-700">
              اختيار المحل المراد الإرجاع منه *
            </label>
            <div className="relative">
              <Store className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pr-9 pl-3 font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                value={selectedShopId}
                onChange={(e) => {
                  setSelectedShopId(e.target.value);
                  setSelectedTxId('');
                }}
              >
                <option value="">-- اختر المحل --</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (رصيد الأجور: {formatCurrency(s.laborBalance)} ر.ي)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Past Distributions Table */}
          {selectedShopId && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  حركات التوزيع السابقة لهذا المحل (اختر الحركة)
                </h3>
                <span className="text-xs text-slate-500 font-bold">
                  {shopDistributions.length} حركة مسجلة
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {shopDistributions.map(tx => (
                  <div 
                    key={tx.id}
                    onClick={() => handleSelectTx(tx.id)}
                    className={cn(
                      "p-3.5 flex justify-between items-center cursor-pointer transition-all text-xs",
                      selectedTxId === tx.id 
                        ? "bg-amber-50 border-r-4 border-amber-500 font-bold" 
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-900">{tx.id}</div>
                      <div className="text-[11px] text-slate-500">
                        التاريخ: {new Date(tx.date).toLocaleDateString('ar-EG')} | الأصناف: {tx.items?.length || 0}
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <div className="font-bold text-slate-800">
                        {formatWeight(tx.items?.reduce((s, i) => s + (i.netWeight || 0), 0) || 0)} جم
                      </div>
                      <div className="text-amber-700 font-bold">
                        {formatCurrency(tx.cashAmount || 0)} ر.ي
                      </div>
                    </div>
                  </div>
                ))}

                {shopDistributions.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    لا توجد حركات توزيع مسجلة لهذا المحل.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Return Configuration Box */}
          {selectedTx && targetItem && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
                <Calculator className="w-4 h-4 text-amber-500" />
                بيانات وتفاصيل الإرجاع الفعلي
              </h3>

              {/* Item Selector if multi-item transaction */}
              {(selectedTx.items?.length || 0) > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">اختر الصنف من السند:</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedTx.items?.map((it, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectItemIndex(idx)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                          returnItemIndex === idx ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-50 text-slate-700"
                        )}
                      >
                        {it.category} ({it.modelCode}) - {formatWeight(it.netWeight)} جم
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Original Item Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">الصنف والموديل:</span>
                  <span className="font-bold text-slate-800">{targetItem.category} ({targetItem.modelCode})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الوزن عند التوزيع:</span>
                  <span className="font-mono font-bold text-slate-800">{formatWeight(targetItem.netWeight)} جم</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">أجور المحل المقيدة:</span>
                  <span className="font-mono font-bold text-amber-800">{formatCurrency(targetItem.totalShopWage || 0)} ر.ي</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">تكلفة الورشة المخصصة:</span>
                  <span className="font-mono font-bold text-blue-800">{formatCurrency(targetItem.allocatedWorkshopCost || 0)} ر.ي</span>
                </div>
              </div>

              {/* Return Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-1">
                  <label className="text-xs font-bold text-amber-950 block">
                    الوزن المرتجع فعلياً (جم) *
                  </label>
                  <input 
                    type="number"
                    step="0.001"
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 text-base outline-none focus:ring-2 focus:ring-amber-500/20"
                    value={actualReturnedWeight || ''}
                    onChange={(e) => setActualReturnedWeight(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-slate-500">
                    إذا كان الإرجاع جزئياً، أدخل الوزن الفعلي المعاد للمخزون.
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    عدد القطع المرتجعة (اختياري)
                  </label>
                  <input 
                    type="number"
                    step="1"
                    placeholder="—"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 text-base outline-none focus:ring-2 focus:ring-amber-500/20"
                    value={returnedPiecesCount !== null ? returnedPiecesCount : ''}
                    onChange={(e) => setReturnedPiecesCount(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">سبب الإرجاع / ملاحظات</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Accounting Reversal Breakdown */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl border border-slate-800 space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-xs uppercase font-bold text-amber-400 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                عكس القيود والأجور المرتجعة
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                تسوية محاسبية
              </span>
            </div>

            {returnMetrics ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-slate-400">الوزن المعاد للمخزون:</span>
                  <span className="font-mono font-bold text-amber-400 text-base">
                    {formatWeight(actualReturnedWeight)} جم
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-slate-400">أجور المحل المعكوسة (المخصومة):</span>
                  <span className="font-mono font-bold text-white text-base">
                    {formatCurrency(returnMetrics.returnedShopWage)} <small className="text-xs text-slate-400">ر.ي</small>
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-slate-400">تكلفة الورشة المعكوسة:</span>
                  <span className="font-mono font-bold text-blue-400 text-base">
                    {formatCurrency(returnMetrics.returnedWorkshopCost)} <small className="text-xs text-slate-400">ر.ي</small>
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-slate-400">الربح المعكوس:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    {formatCurrency(returnMetrics.returnedProfit)} <small className="text-xs text-slate-400">ر.ي</small>
                  </span>
                </div>

                {returnMetrics.weightDifference !== 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px]">
                    فارق وزن الإرجاع عن التوزيع الأصلي: {formatWeight(returnMetrics.weightDifference)} جم
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                حدد حركة التوزيع والصنف لعرض تفاصيل عكس القيد.
              </div>
            )}

            <button 
              onClick={handleSubmit}
              disabled={!selectedShopId || !selectedTx || !actualReturnedWeight || actualReturnedWeight <= 0}
              className="w-full bg-amber-500 disabled:opacity-50 text-slate-950 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 active:scale-[0.99] cursor-pointer"
            >
              <CheckCircle className="w-5 h-5" />
              تأكيد عملية الإرجاع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
