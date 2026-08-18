import React, { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { formatCurrency, formatWeight, cn } from '../lib/utils';
import {
  Scale, CheckCircle, AlertCircle, Clock, FileText,
  Plus, Trash2, ChevronDown, ChevronUp, Info, AlertTriangle,
  ArrowLeftRight, ShieldCheck, ShieldAlert, Wrench
} from 'lucide-react';
import { Transaction, SettlementRow, SettlementData, Karat } from '../types';
import { SensitiveAmount } from '../components/SensitiveAmount';
import { repository } from '../lib/storage';

interface SettlementRowState {
  batchId: string;
  weightBefore: number | '';
  weightAfter: number | '';
  piecesTaken: number | '';
}

export default function QuickDistSettlement() {
  const { transactions, inventory, addTransaction, refreshData } = useAppStore();
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [rows, setRows] = useState<SettlementRowState[]>([]);
  const [tolerance, setTolerance] = useState(0.030);
  const [scaleDiffReason, setScaleDiffReason] = useState('');
  const [scaleDiffWeight, setScaleDiffWeight] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInternal, setShowInternal] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);

  // ── فحص سلامة قيد العميل (هل يوجد items[]?) ──
  const hasLedgerEntry = useCallback((tx: Transaction): boolean => {
    return !!(tx.items && tx.items.length > 0);
  }, []);

  // ── إصلاح قيد العميل المفقود — Idempotent ──
  const repairLedgerEntry = useCallback(async (tx: Transaction) => {
    // فحص Idempotent: إذا items[] موجود، لا شيء يتغير
    if (hasLedgerEntry(tx)) {
      alert('✅ قيد العميل سليم — لا حاجة للإصلاح.');
      return;
    }
    const qd = tx.quickDistData;
    if (!qd) return;

    setRepairing(tx.id);
    try {
      // إعادة قراءة العملية من قاعدة البيانات للتأكد
      const freshTx = await repository.getById('transactions', tx.id);
      if (!freshTx) {
        alert('⚠ لم يتم العثور على العملية في قاعدة البيانات.');
        return;
      }
      // فحص Idempotent مرة ثانية بعد القراءة
      if (freshTx.items && freshTx.items.length > 0) {
        alert('✅ قيد العميل تم إصلاحه مسبقًا — لا حاجة لتكرار الإصلاح.');
        await refreshData();
        return;
      }

      // إنشاء items[] من quickDistData — بدون أي تغيير في الأرصدة
      freshTx.items = [{
        inventoryItemId: '__quick_dist__',
        category: qd.category,
        modelCode: '',
        karat: qd.karat,
        netWeight: qd.totalNetWeight,
        grossWeight: qd.totalNetWeight,
        count: qd.pieceCount ?? null,
        totalShopWage: qd.totalShopWage,
        finalShopWagePerGram: qd.shopWagePerGram,
        sourceType: 'quick_distribution',
        sourceId: tx.id,
      } as any];

      // حفظ مباشر — بدون addTransaction لتجنب تكرار القيود المحاسبية
      await repository.save('transactions', freshTx);
      await refreshData();
      alert('✅ تم إصلاح قيد العميل بنجاح. العملية ستظهر الآن في صفحة المرتجع وكشف الحساب.');
    } catch (err) {
      console.error('خطأ في إصلاح قيد العميل:', err);
      alert('حدث خطأ أثناء الإصلاح.');
    } finally {
      setRepairing(null);
    }
  }, [hasLedgerEntry, refreshData]);

  // Filter pending quick distributions
  const pendingTxs = useMemo(() =>
    transactions.filter(
      tx => tx.type === 'QUICK_DISTRIBUTE' &&
        tx.quickDistData?.settlementStatus === 'PENDING'
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  // Settled transactions for reference
  const settledTxs = useMemo(() =>
    transactions.filter(
      tx => tx.type === 'QUICK_DISTRIBUTE' &&
        tx.quickDistData?.settlementStatus === 'SETTLED'
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  const activeTx = activeTxId
    ? transactions.find(t => t.id === activeTxId)
    : null;

  const activeQd = activeTx?.quickDistData;

  // Available inventory for batch selection
  const availableBatches = inventory.filter(item => {
    const avail = item.availableWeight !== undefined ? item.availableWeight : item.netWeight;
    return avail > 0.0001;
  });

  // Calculate settlement totals
  const rowsWithCalc = rows.map(row => {
    const wb = typeof row.weightBefore === 'number' ? row.weightBefore : 0;
    const wa = typeof row.weightAfter === 'number' ? row.weightAfter : 0;
    const diff = Number(Math.max(0, wb - wa).toFixed(3));
    const batch = inventory.find(b => b.id === row.batchId);
    return { ...row, distributedWeight: diff, batch };
  });

  const totalSettled = rowsWithCalc.reduce((s, r) => s + r.distributedWeight, 0);
  const voucherWeight = activeQd?.totalNetWeight || 0;
  const remaining = Number((voucherWeight - totalSettled - (typeof scaleDiffWeight === 'number' ? scaleDiffWeight : 0)).toFixed(3));
  const isMatched = Math.abs(remaining) <= tolerance;
  const hasScaleDiff = typeof scaleDiffWeight === 'number' && scaleDiffWeight > 0;
  const needsScaleDiffReason = hasScaleDiff && !scaleDiffReason.trim();

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const openSettlement = (txId: string) => {
    setActiveTxId(txId);
    setRows([{ batchId: '', weightBefore: '', weightAfter: '', piecesTaken: '' }]);
    setScaleDiffReason('');
    setScaleDiffWeight('');
  };

  const closeSettlement = () => {
    setActiveTxId(null);
    setRows([]);
  };

  const addRow = () => {
    setRows([...rows, { batchId: '', weightBefore: '', weightAfter: '', piecesTaken: '' }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, updates: Partial<SettlementRowState>) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleApproveSettlement = async () => {
    if (isSubmitting || !activeTx || !activeQd) return;
    if (!isMatched && !hasScaleDiff) {
      return alert('الوزن غير مطابق. يرجى مراجعة الأوزان أو تسجيل فرق الميزان.');
    }
    if (needsScaleDiffReason) {
      return alert('يرجى إدخال سبب فرق الميزان.');
    }
    // Check all rows have batch selected
    const validRows = rowsWithCalc.filter(r => r.batchId && r.distributedWeight > 0.0001);
    if (validRows.length === 0) {
      return alert('يرجى إضافة صف واحد على الأقل مع اختيار الدفعة والأوزان.');
    }

    setIsSubmitting(true);
    try {
      const settlementRows: SettlementRow[] = validRows.map(r => {
        const batch = r.batch!;
        return {
          batchId: r.batchId,
          category: batch.category,
          karat: batch.karat,
          originalBatchWeight: batch.originalNetWeight || batch.netWeight,
          currentBalance: batch.availableWeight,
          weightBefore: typeof r.weightBefore === 'number' ? r.weightBefore : 0,
          weightAfter: typeof r.weightAfter === 'number' ? r.weightAfter : 0,
          distributedWeight: r.distributedWeight,
          piecesTaken: typeof r.piecesTaken === 'number' ? r.piecesTaken : null,
        };
      });

      const sd: SettlementData = {
        originalTxId: activeTx.id,
        rows: settlementRows,
        totalSettledWeight: Number(totalSettled.toFixed(3)),
        tolerance,
        scaleDiffReason: scaleDiffReason.trim() || undefined,
        scaleDiffWeight: typeof scaleDiffWeight === 'number' ? scaleDiffWeight : undefined,
      };

      const settleTx: Transaction = {
        id: `SETTLE-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`,
        date: new Date().toISOString(),
        type: 'SETTLE_QUICK_DISTRIBUTION',
        entityId: activeTx.entityId,
        entityName: activeTx.entityName,
        settlementData: sd,
      };

      await addTransaction(settleTx);
      closeSettlement();
    } catch (err) {
      console.error('خطأ في التسوية:', err);
      alert('حدث خطأ أثناء اعتماد التسوية.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ══════════════════════════════════
  //  الواجهة
  // ══════════════════════════════════
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowLeftRight className="w-7 h-7 text-[#E49A0A]" />
          تسوية التوزيعات السريعة
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          توزيع الوزن على الدفعات وحساب التكلفة والربح للعمليات التي صدرت بسندات سريعة.
        </p>
      </div>

      {/* ══════════════════════════════════ */}
      {/*  نافذة التسوية (إذا كانت مفتوحة) */}
      {/* ══════════════════════════════════ */}
      {activeTx && activeQd && (
        <div className="space-y-5">
          {/* بطاقة معلومات السند */}
          <div className="bg-[#0F1B33] text-white p-5 rounded-xl shadow-lg border border-slate-800">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <div>
                <span className="text-[#E49A0A] text-xs font-bold">تسوية السند:</span>
                <span className="text-white font-mono text-sm mr-2">#{activeTx.id}</span>
              </div>
              <button
                onClick={closeSettlement}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 cursor-pointer"
              >
                ✕ إلغاء
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">العميل:</span>
                <span className="font-bold text-white">{activeTx.entityName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">الصنف:</span>
                <span className="font-bold text-white">{activeQd.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block">العيار:</span>
                <span className="font-bold text-white">{activeQd.karat}</span>
              </div>
              <div>
                <span className="text-slate-400 block">الأجرة:</span>
                <span className="font-bold text-white">{formatCurrency(activeQd.shopWagePerGram)} ر.ي/جم</span>
              </div>
            </div>
          </div>

          {/* شريط المطابقة */}
          <div className={cn(
            'p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
            isMatched
              ? 'bg-emerald-50 border-emerald-400'
              : Math.abs(remaining) > tolerance
                ? 'bg-red-50 border-red-300'
                : 'bg-amber-50 border-amber-300'
          )}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs w-full">
              <div>
                <span className="text-slate-500 block font-bold">وزن سند العميل:</span>
                <span className="font-mono font-black text-slate-900 text-lg">{formatWeight(voucherWeight)} جم</span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">مجموع فروقات الأكياس:</span>
                <span className="font-mono font-black text-blue-700 text-lg">{formatWeight(totalSettled)} جم</span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">الفرق المتبقي:</span>
                <span className={cn(
                  'font-mono font-black text-lg',
                  isMatched ? 'text-emerald-700' : 'text-red-600'
                )}>
                  {remaining >= 0 ? '+' : ''}{formatWeight(remaining)} جم
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">حالة المطابقة:</span>
                <span className={cn(
                  'font-bold text-sm flex items-center gap-1',
                  isMatched ? 'text-emerald-700' : 'text-red-600'
                )}>
                  {isMatched ? (
                    <><CheckCircle className="w-4 h-4" /> مطابق</>
                  ) : (
                    <><AlertCircle className="w-4 h-4" /> غير مطابق</>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* تنبيه الكيس */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span className="font-medium">
              يجب استخدام الكيس أو العبوة نفسها في الوزنين. إذا تغيرت العبوة، أدخل وزنها أو أعد الوزن.
            </span>
          </div>

          {/* صفوف التسوية */}
          <div className="space-y-3">
            {rows.map((row, index) => {
              const calc = rowsWithCalc[index];
              const batch = calc?.batch;
              const isOverWeight = batch && calc.distributedWeight > (batch.availableWeight + 0.001);

              return (
                <div key={index} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#0F1B33] text-white flex items-center justify-center text-xs font-mono font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {batch ? `${batch.category} (${batch.modelCode})` : 'اختر الدفعة'}
                      </span>
                    </span>
                    <button
                      onClick={() => removeRow(index)}
                      className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* اختيار الدفعة */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">اختيار الدفعة *</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 font-bold text-slate-800 text-xs outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={row.batchId}
                        onChange={e => updateRow(index, { batchId: e.target.value })}
                      >
                        <option value="">-- اختر دفعة --</option>
                        {availableBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.category} ({b.modelCode}) — عيار {b.karat} — متاح: {formatWeight(b.availableWeight)} جم
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* معلومات الدفعة */}
                    {batch && (
                      <>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الوزن الأصلي للدفعة:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {formatWeight(batch.originalNetWeight || batch.netWeight)} جم
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الرصيد الصافي الحالي:</span>
                          <span className="font-mono font-bold text-amber-700">
                            {formatWeight(batch.availableWeight)} جم
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* حقول الوزن */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">الوزن القائم قبل (جم) *</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        placeholder="0.000"
                        className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-2.5 font-mono font-bold text-slate-900 text-base text-left outline-none focus:ring-2 focus:ring-blue-400/30"
                        value={row.weightBefore}
                        onChange={e => updateRow(index, { weightBefore: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                    </div>
                    <div className="bg-purple-50/60 p-2.5 rounded-lg border border-purple-200">
                      <label className="block text-[11px] font-bold text-purple-900 mb-1">الوزن القائم بعد (جم) *</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        placeholder="0.000"
                        className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-2.5 font-mono font-bold text-slate-900 text-base text-left outline-none focus:ring-2 focus:ring-purple-400/30"
                        value={row.weightAfter}
                        onChange={e => updateRow(index, { weightAfter: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                    </div>
                    <div className={cn(
                      'p-2.5 rounded-lg border',
                      isOverWeight
                        ? 'bg-red-50 border-red-300'
                        : 'bg-emerald-50/60 border-emerald-200'
                    )}>
                      <span className="block text-[11px] font-bold text-emerald-900 mb-1">الفرق الموزع:</span>
                      <span className={cn(
                        'font-mono font-black text-base block',
                        isOverWeight ? 'text-red-600' : 'text-emerald-800'
                      )}>
                        {formatWeight(calc?.distributedWeight || 0)} جم
                      </span>
                      {isOverWeight && (
                        <span className="text-[10px] text-red-600 font-bold">⚠ يتجاوز المتاح!</span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">عدد القطع (اختياري)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        placeholder="—"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2.5 font-mono font-bold text-slate-900 text-base text-left outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={row.piecesTaken}
                        onChange={e => updateRow(index, { piecesTaken: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* زر إضافة صف */}
            <button
              onClick={addRow}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-bold text-slate-500 hover:border-amber-400 hover:text-amber-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة دفعة / كيس
            </button>
          </div>

          {/* فرق الميزان */}
          {!isMatched && totalSettled > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                تسجيل فرق ميزان
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">وزن الفرق (جم)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2.5 font-mono font-bold text-slate-900 text-sm text-left outline-none focus:ring-2 focus:ring-amber-400/30"
                    value={scaleDiffWeight}
                    onChange={e => setScaleDiffWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">السبب (إلزامي) *</label>
                  <input
                    type="text"
                    placeholder="مثال: فرق ميزان بسبب..."
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400/30"
                    value={scaleDiffReason}
                    onChange={e => setScaleDiffReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="text-xs text-amber-700">
                حد السماح الحالي: ±{formatWeight(tolerance)} جم
                <button
                  onClick={() => {
                    const newVal = prompt('أدخل حد السماح الجديد (بالجرام):', String(tolerance));
                    if (newVal && !isNaN(Number(newVal))) setTolerance(Number(newVal));
                  }}
                  className="mr-2 text-amber-600 underline cursor-pointer"
                >
                  تعديل
                </button>
              </div>
            </div>
          )}

          {/* زر اعتماد التسوية */}
          <button
            onClick={handleApproveSettlement}
            disabled={(!isMatched && !hasScaleDiff) || needsScaleDiffReason || isSubmitting || rowsWithCalc.filter(r => r.batchId && r.distributedWeight > 0.0001).length === 0}
            className="w-full bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg active:scale-[0.99] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                جاري الاعتماد...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                اعتماد التسوية
              </>
            )}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/*  قائمة العمليات بانتظار التسوية  */}
      {/* ══════════════════════════════════ */}
      {!activeTx && (
        <div className="space-y-5">
          {/* بانتظار التسوية */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                عمليات بانتظار التسوية
              </h3>
              <span className="text-xs bg-amber-500/10 text-amber-900 font-bold px-2.5 py-1 rounded-lg border border-amber-500/20">
                {pendingTxs.length} عملية
              </span>
            </div>

            {pendingTxs.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs italic">
                لا توجد عمليات بانتظار التسوية حالياً. جميع التوزيعات السريعة تمت تسويتها.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingTxs.map(tx => {
                  const qd = tx.quickDistData!;
                  const days = daysSince(tx.date);
                  return (
                    <div key={tx.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs w-full">
                        <div>
                          <span className="text-[10px] text-slate-400 block">رقم السند:</span>
                          <span className="font-mono font-bold text-slate-900">{tx.id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">العميل:</span>
                          <span className="font-bold text-slate-800">{tx.entityName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">التاريخ:</span>
                          <span className="font-mono text-slate-700">{new Date(tx.date).toLocaleDateString('ar-YE')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الصنف:</span>
                          <span className="font-bold text-slate-800">{qd.category}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الوزن:</span>
                          <span className="font-mono font-bold text-amber-700">{formatWeight(qd.totalNetWeight)} جم</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الأجرة:</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(qd.shopWagePerGram)} ر.ي</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* مؤشر سلامة القيد */}
                        {hasLedgerEntry(tx) ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> ✓ قيد سليم
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); repairLedgerEntry(tx); }}
                            disabled={repairing === tx.id}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-red-50 text-red-700 border-red-200 flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                          >
                            {repairing === tx.id ? '...' : <><ShieldAlert className="w-3 h-3" /> إصلاح القيد</>}
                          </button>
                        )}
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-1 rounded-lg border',
                          days > 7
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : days > 3
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          {days === 0 ? 'اليوم' : `${days} يوم`}
                        </span>
                        <button
                          onClick={() => openSettlement(tx.id)}
                          className="bg-[#0F1B33] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1a2e4a] transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          تسوية الوزن
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* تمت التسوية */}
          {settledTxs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  تمت التسوية
                </h3>
                <span className="text-xs bg-emerald-500/10 text-emerald-900 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {settledTxs.length} عملية
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {settledTxs.slice(0, 10).map(tx => {
                  const qd = tx.quickDistData!;
                  return (
                    <div key={tx.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1 w-full">
                        <div>
                          <span className="text-[10px] text-slate-400 block">السند:</span>
                          <span className="font-mono font-bold text-slate-800">{tx.id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">العميل:</span>
                          <span className="font-bold text-slate-700">{tx.entityName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الوزن:</span>
                          <span className="font-mono text-slate-700">{formatWeight(qd.totalNetWeight)} جم</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">تاريخ التسوية:</span>
                          <span className="font-mono text-slate-600">{qd.settledAt ? new Date(qd.settledAt).toLocaleDateString('ar-YE') : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الربح:</span>
                          <SensitiveAmount
                            visible={showInternal}
                            value={qd.realProfit !== undefined ? `${formatCurrency(qd.realProfit)} ر.ي` : '—'}
                            className="font-bold text-emerald-700 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* مؤشر سلامة القيد */}
                        {hasLedgerEntry(tx) ? (
                          <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> تمت التسوية
                          </span>
                        ) : (
                          <button
                            onClick={() => repairLedgerEntry(tx)}
                            disabled={repairing === tx.id}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-red-50 text-red-700 border-red-200 flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                          >
                            {repairing === tx.id ? (
                              <span className="flex items-center gap-1">
                                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                جاري الإصلاح...
                              </span>
                            ) : (
                              <><Wrench className="w-3 h-3" /> قيد مفقود — إصلاح</>  
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
