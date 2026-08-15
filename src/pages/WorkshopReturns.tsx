import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/useAppStore';
import { calculateWorkshopReturnMetrics, computeBatchStatus } from '../lib/accounting';
import { formatCurrency, formatWeight, formatApprox, cn } from '../lib/utils';
import { 
  Undo2, 
  Factory, 
  Package, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  History, 
  ArrowRight, 
  HelpCircle, 
  FileText, 
  Image, 
  Search, 
  Filter, 
  Info,
  Calendar,
  Layers,
  ChevronLeft,
  CheckCircle,
  Percent,
  Coins,
  DollarSign
} from 'lucide-react';
import { 
  Transaction, 
  TransactionItem, 
  WorkshopReturnReason, 
  WorkshopReturnLaborTreatment, 
  WeightDiffTreatment, 
  Karat, 
  InventoryItem 
} from '../types';
import { PrintVoucher } from '../components/PrintVoucher';

export default function WorkshopReturns() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workshops, inventory, transactions, addTransaction, loading } = useAppStore();

  // Mode: Form vs History
  const [activeTab, setActiveTab] = useState<'NEW_RETURN' | 'HISTORY'>('NEW_RETURN');

  // Form State
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  // Weights
  const [grossWeightOnReturn, setGrossWeightOnReturn] = useState<number>(0);
  const [actualNetWeight, setActualNetWeight] = useState<number>(0);
  const [certifiedWeight, setCertifiedWeight] = useState<number>(0);
  const [piecesCount, setPiecesCount] = useState<number | null>(null);

  // Reasons & Conditions
  const [returnReason, setReturnReason] = useState<WorkshopReturnReason>('UNSOLD');
  const [reasonCustomText, setReasonCustomText] = useState<string>('');
  const [itemCondition, setItemCondition] = useState<string>('سليمة وجديدة تماماً');
  const [recipientName, setRecipientName] = useState<string>('');
  const [weightDiffTreatment, setWeightDiffTreatment] = useState<WeightDiffTreatment>('WORKSHOP_ACCEPTED');
  const [notes, setNotes] = useState<string>('');
  const [mockImageUrl, setMockImageUrl] = useState<string>('');

  // Labor Treatment
  const [laborTreatment, setLaborTreatment] = useState<WorkshopReturnLaborTreatment>('CANCEL_FULL');
  const [partialCancelType, setPartialCancelType] = useState<'AMOUNT' | 'PERCENTAGE' | 'PER_GRAM'>('AMOUNT');
  const [partialCancelValue, setPartialCancelValue] = useState<number>(0);
  const [keptLaborReason, setKeptLaborReason] = useState<string>('');

  // Stepper on mobile / guided
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Print voucher modal
  const [printData, setPrintData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History search/filters
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyWorkshopFilter, setHistoryWorkshopFilter] = useState<string>('ALL');

  // Parse URL query params (e.g. from Inventory or Workshops page: ?workshopId=... or ?batchId=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wId = params.get('workshopId');
    const bId = params.get('batchId');

    if (bId) {
      const batch = inventory.find(i => i.id === bId);
      if (batch) {
        setSelectedWorkshopId(batch.workshopId);
        setSelectedBatchId(batch.id);
        const avail = batch.availableWeight !== undefined ? batch.availableWeight : Math.max(0, (batch.originalNetWeight || batch.netWeight) - (batch.distributedWeight || 0) + (batch.returnedWeight || 0));
        setGrossWeightOnReturn(avail);
        setActualNetWeight(avail);
        setCertifiedWeight(avail);
        setPiecesCount(batch.availableCount ?? null);
      }
    } else if (wId) {
      setSelectedWorkshopId(wId);
    }
  }, [location.search, inventory]);

  // Selected Workshop & Selected Batch
  const selectedWorkshop = useMemo(() => {
    return workshops.find(w => w.id === selectedWorkshopId);
  }, [workshops, selectedWorkshopId]);

  // Available batches for selected workshop (only batches with availableWeight > 0.001)
  const workshopBatches = useMemo(() => {
    if (!selectedWorkshopId) return [];
    return inventory.filter(item => {
      if (item.workshopId !== selectedWorkshopId) return false;
      const originalWeight = item.originalNetWeight || item.netWeight || 0;
      const distributed = item.distributedWeight || 0;
      const returnedFromShop = item.returnedWeight || 0;
      const returnedToWs = item.returnedToWorkshopWeight || 0;
      const available = item.availableWeight !== undefined ? item.availableWeight : Math.max(0, originalWeight - distributed + returnedFromShop - returnedToWs);
      return available > 0.001;
    });
  }, [inventory, selectedWorkshopId]);

  const selectedBatch = useMemo(() => {
    return inventory.find(i => i.id === selectedBatchId);
  }, [inventory, selectedBatchId]);

  // Handle batch selection
  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    const batch = inventory.find(i => i.id === batchId);
    if (batch) {
      const orig = batch.originalNetWeight || batch.netWeight || 0;
      const dist = batch.distributedWeight || 0;
      const retFromShop = batch.returnedWeight || 0;
      const retToWs = batch.returnedToWorkshopWeight || 0;
      const avail = batch.availableWeight !== undefined ? batch.availableWeight : Math.max(0, orig - dist + retFromShop - retToWs);
      
      setGrossWeightOnReturn(avail);
      setActualNetWeight(avail);
      setCertifiedWeight(avail);
      setPiecesCount(batch.availableCount ?? null);
    }
  };

  // Metrics for the batch
  const batchMetrics = useMemo(() => {
    if (!selectedBatch) return null;
    const origWeight = selectedBatch.originalNetWeight || selectedBatch.netWeight || 0;
    const distWeight = selectedBatch.distributedWeight || 0;
    const retFromShop = selectedBatch.returnedWeight || 0;
    const retToWs = selectedBatch.returnedToWorkshopWeight || 0;
    const availWeight = selectedBatch.availableWeight !== undefined 
      ? selectedBatch.availableWeight 
      : Math.max(0, origWeight - distWeight + retFromShop - retToWs);

    const originalTotalLabor = selectedBatch.totalWorkshopWage || 0;
    const originalWageWeight = selectedBatch.wageCalculationWeight || origWeight || 1;
    const derivedWagePerGram = origWeight > 0 ? (originalTotalLabor / originalWageWeight) : 0;
    const availablePortionCost = originalWageWeight > 0 ? (originalTotalLabor * (availWeight / originalWageWeight)) : 0;

    return {
      origWeight,
      distWeight,
      retFromShop,
      retToWs,
      availWeight,
      originalTotalLabor,
      originalWageWeight,
      derivedWagePerGram,
      availablePortionCost,
    };
  }, [selectedBatch]);

  // Quick weight percentage setters
  const handleSetReturnPercentage = (pct: number) => {
    if (!batchMetrics) return;
    const target = Number((batchMetrics.availWeight * (pct / 100)).toFixed(3));
    setGrossWeightOnReturn(target);
    setActualNetWeight(target);
    setCertifiedWeight(target);
    if (selectedBatch?.availableCount) {
      setPiecesCount(Math.round(selectedBatch.availableCount * (pct / 100)));
    }
  };

  // Live Return Metrics Calculation
  const returnMetrics = useMemo(() => {
    if (!selectedBatch || !batchMetrics || !selectedWorkshop) return null;

    const certWeight = certifiedWeight || 0;
    const expWeight = batchMetrics.availWeight;
    const goldBefore = selectedWorkshop.goldBalances[selectedBatch.karat] || 0;
    const laborBefore = selectedWorkshop.laborBalance || 0;

    return calculateWorkshopReturnMetrics({
      certifiedReturnWeight: certWeight,
      expectedNetWeight: expWeight,
      originalBatchWageWeight: batchMetrics.originalWageWeight,
      originalBatchTotalWorkshopLabor: batchMetrics.originalTotalLabor,
      laborTreatment,
      partialCancelType,
      partialCancelValue,
      workshopGoldBalanceBefore: goldBefore,
      workshopLaborBalanceBefore: laborBefore,
      distributedWeight: batchMetrics.distWeight,
      finalShopWagePerGram: selectedBatch.finalShopWagePerGram || 1800,
    });
  }, [selectedBatch, batchMetrics, selectedWorkshop, certifiedWeight, laborTreatment, partialCancelType, partialCancelValue]);

  // Return reasons labels
  const RETURN_REASONS_MAP: Record<WorkshopReturnReason, string> = {
    UNSOLD: 'لم تُبع في السوق',
    NO_MARKET_DEMAND: 'لا يوجد طلب من المحلات على هذا الصنف',
    OLD_MODEL: 'موديل قديم يراد استبداله بموديلات حديثة',
    MANUFACTURING_DEFECT: 'وجود عيب مصنعي في القطع',
    WEIGHT_DISCREPANCY: 'اختلاف في الوزن عن المواصفات',
    KARAT_DISCREPANCY: 'اختلاف في فحص العيار',
    WORKSHOP_REQUEST: 'بناءً على طلب الورشة لإعادة التدوير / التعديل',
    OTHER: 'سبب آخر (موضح في الملاحظات)',
  };

  // Submit Handler
  const handleSubmitReturn = async () => {
    if (isSubmitting) return;
    if (!selectedWorkshopId) return alert('يرجى اختيار الورشة أولاً');
    if (!selectedBatchId || !selectedBatch) return alert('يرجى اختيار الدفعة الأصلية المراد الإرجاع منها');
    if (!certifiedWeight || certifiedWeight <= 0) return alert('يرجى إدخال الوزن المعتمد للإرجاع');
    setIsSubmitting(true);
    try {
    
    if (batchMetrics && certifiedWeight > batchMetrics.availWeight + 0.001) {
      return alert(`الوزن المعتمد (${certifiedWeight} جم) أكبر من الوزن المتاح فعلياً في المخزون (${batchMetrics.availWeight} جم)`);
    }

    if (selectedBatch.availableCount !== null && selectedBatch.availableCount !== undefined && piecesCount && piecesCount > selectedBatch.availableCount) {
      return alert(`عدد القطع (${piecesCount}) يتجاوز العدد المتاح في المخزون (${selectedBatch.availableCount})`);
    }

    if (laborTreatment === 'CANCEL_PARTIAL' && !partialCancelValue) {
      return alert('يرجى إدخال قيمة الأجور المراد إلغاؤها');
    }

    const txId = `RET-WS-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
    const reasonText = reasonCustomText ? `${RETURN_REASONS_MAP[returnReason]} - ${reasonCustomText}` : RETURN_REASONS_MAP[returnReason];

    const goldBeforeMap = { ...(selectedWorkshop?.goldBalances || { 18: 0, 21: 0, 22: 0, 24: 0 }) };
    const laborBefore = selectedWorkshop?.laborBalance || 0;

    const goldAfterMap = { ...goldBeforeMap };
    goldAfterMap[selectedBatch.karat] = returnMetrics?.goldBalanceAfter ?? Number(((goldBeforeMap[selectedBatch.karat] || 0) - certifiedWeight).toFixed(3));
    const laborAfter = returnMetrics?.laborBalanceAfter ?? Number((laborBefore - (returnMetrics?.cancelledLabor || 0)).toFixed(2));

    const item: TransactionItem = {
      category: selectedBatch.category,
      modelCode: selectedBatch.modelCode,
      count: piecesCount,
      karat: selectedBatch.karat,
      grossWeight: grossWeightOnReturn,
      netWeight: certifiedWeight,
      inventoryItemId: selectedBatch.id,
      originalBatchNetWeight: selectedBatch.originalNetWeight || selectedBatch.netWeight,
      originalBatchWageWeight: selectedBatch.wageCalculationWeight,
      originalBatchTotalWorkshopWage: selectedBatch.totalWorkshopWage,
      
      // Return details
      grossWeightOnReturn,
      expectedNetWeight: batchMetrics?.availWeight,
      actualNetWeightOnReturn: actualNetWeight,
      certifiedWeightByWorkshop: certifiedWeight,
      workshopReturnReason: returnReason,
      workshopReturnReasonText: reasonText,
      itemCondition,
      weightDiffTreatment,
      weightDifference: returnMetrics?.weightDifference || 0,
      recipientName,
      laborTreatment,
      partialCancelType,
      partialCancelValue,
      originalCostOfReturnedPart: returnMetrics?.originalCostOfReturnedPart || 0,
      cancelledLaborAmount: returnMetrics?.cancelledLabor || 0,
      keptLaborAmount: returnMetrics?.keptLabor || 0,
      keptLaborReason,
      notes: notes || undefined,
      itemImage: mockImageUrl || undefined,
    };

    const transaction: Transaction = {
      id: txId,
      date: new Date().toISOString(),
      type: 'RETURN_TO_WORKSHOP',
      entityId: selectedWorkshopId,
      entityName: selectedWorkshop?.name,
      workshopDocNo: selectedBatch.workshopDocNo,
      workshopDocDate: selectedBatch.workshopDocDate,
      workshopReturnReason: returnReason,
      workshopReturnReasonText: reasonText,
      recipientName,
      laborTreatment,
      cancelledLaborTotal: returnMetrics?.cancelledLabor || 0,
      keptLaborTotal: returnMetrics?.keptLabor || 0,
      certifiedGoldWeightTotal: certifiedWeight,
      isPrepaidCredit: (returnMetrics?.isCreditGold || returnMetrics?.isCreditLabor) || false,
      creditGoldDueFromWorkshop: returnMetrics?.creditGoldDueFromWorkshop || 0,
      creditLaborDueFromWorkshop: returnMetrics?.creditLaborDueFromWorkshop || 0,
      notes: notes ? `مرتجع للورشة: ${notes}` : `مرتجع للورشة من سند ${selectedBatch.workshopDocNo || ''}`,
      items: [item],
      balancesBefore: {
        goldBalances: goldBeforeMap,
        laborBalance: laborBefore,
      },
      balancesAfter: {
        goldBalances: goldAfterMap,
        laborBalance: laborAfter,
      }
    };

    await addTransaction(transaction);

    // Open print voucher
    setPrintData(transaction);

    // Reset Form
    setSelectedBatchId('');
    setGrossWeightOnReturn(0);
    setActualNetWeight(0);
    setCertifiedWeight(0);
    setPiecesCount(null);
    setNotes('');
    setReasonCustomText('');
    setCurrentStep(1);
    } catch (err) {
      console.error('خطأ في اعتماد المرتجع:', err);
      alert('حدث خطأ أثناء اعتماد المرتجع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Workshop Returns History
  const workshopReturnTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'RETURN_TO_WORKSHOP').filter(t => {
      const matchWs = historyWorkshopFilter === 'ALL' || t.entityId === historyWorkshopFilter;
      const matchSearch = !historySearch || 
        (t.id || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.entityName || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.workshopDocNo || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.items?.[0]?.category || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.items?.[0]?.modelCode || '').toLowerCase().includes(historySearch.toLowerCase());
      return matchWs && matchSearch;
    });
  }, [transactions, historyWorkshopFilter, historySearch]);

  const totalReturnedWeightHistory = useMemo(() => {
    return workshopReturnTransactions.reduce((sum, t) => sum + (t.certifiedGoldWeightTotal || t.items?.[0]?.netWeight || 0), 0);
  }, [workshopReturnTransactions]);

  const totalCancelledLaborHistory = useMemo(() => {
    return workshopReturnTransactions.reduce((sum, t) => sum + (t.cancelledLaborTotal || 0), 0);
  }, [workshopReturnTransactions]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-800 text-xs font-bold rounded-lg border border-amber-500/20">
              حركة مستقلة
            </span>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Undo2 className="w-6 h-6 text-amber-600" />
              مرتجع للورشة
            </h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            إعادة البضاعة غير الموزعة أو الراكدة من الخزينة إلى الورشة، مع خصم رصيد الذهب وتحديث أجور التصنيع تلقائياً.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('NEW_RETURN')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'NEW_RETURN'
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Undo2 className="w-4 h-4 text-amber-600" />
            سند إرجاع جديد
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'HISTORY'
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <History className="w-4 h-4 text-blue-600" />
            سجل المرتجعات ({workshopReturnTransactions.length})
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">إجمالي الذهب المرتجع للورش</span>
            <span className="text-xl font-mono font-bold text-amber-900 mt-1 block">
              {formatWeight(totalReturnedWeightHistory)} جم
            </span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">إجمالي الأجور الملغاة</span>
            <span className="text-xl font-mono font-bold text-emerald-800 mt-1 block">
              {formatCurrency(totalCancelledLaborHistory)} ر.ي
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-200">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">عدد سندات المرتجع</span>
            <span className="text-xl font-mono font-bold text-slate-800 mt-1 block">
              {workshopReturnTransactions.length} سند
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-200">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">دفعات بالمخزون قابلة للإرجاع</span>
            <span className="text-xl font-mono font-bold text-purple-800 mt-1 block">
              {inventory.filter(i => (i.availableWeight ?? i.netWeight) > 0.001).length} دفعة
            </span>
          </div>
          <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 border border-purple-200">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {activeTab === 'NEW_RETURN' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Step 1: Selection of Workshop and Batch */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">1</span>
                  <h2 className="text-sm font-bold text-slate-900">اختيار الورشة والدفعة الأصلية</h2>
                </div>
                <span className="text-xs text-slate-400">الخطوة الأولى</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الورشة المستلم منها البضاعة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 transition-colors"
                    value={selectedWorkshopId}
                    onChange={(e) => {
                      setSelectedWorkshopId(e.target.value);
                      setSelectedBatchId('');
                      setCertifiedWeight(0);
                    }}
                  >
                    <option value="">-- اختر الورشة --</option>
                    {workshops.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} (أجور مستحقة: {formatCurrency(w.laborBalance)} ر.ي)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الدفعة الأصلية وسند الاستلام <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={!selectedWorkshopId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
                    value={selectedBatchId}
                    onChange={(e) => handleSelectBatch(e.target.value)}
                  >
                    <option value="">-- {selectedWorkshopId ? 'اختر الدفعة الأصلية' : 'اختر الورشة أولاً'} --</option>
                    {workshopBatches.map(b => {
                      const avail = b.availableWeight !== undefined ? b.availableWeight : Math.max(0, (b.originalNetWeight || b.netWeight) - (b.distributedWeight || 0));
                      return (
                        <option key={b.id} value={b.id}>
                          {b.category} - {b.modelCode} (عيار {b.karat}) | متاح: {formatWeight(avail)} جم | سند: {b.workshopDocNo || 'بدون'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Selected Batch Interactive Card */}
              {selectedBatch && batchMetrics && (
                <div className="mt-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-amber-600" />
                      <span className="font-bold text-xs text-slate-900">
                        {selectedBatch.category} - موديل: {selectedBatch.modelCode} (عيار {selectedBatch.karat})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      سند صرف رقم: {selectedBatch.workshopDocNo || 'غير محدد'}
                    </span>
                  </div>

                  {/* Batch Lifecycle Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">الوزن الأصلي المستلم</span>
                      <span className="font-mono font-bold text-slate-800">{formatWeight(batchMetrics.origWeight)} جم</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">الموزع للمحلات</span>
                      <span className="font-mono font-bold text-blue-700">{formatWeight(batchMetrics.distWeight)} جم</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">مرتجع سابقاً للورشة</span>
                      <span className="font-mono font-bold text-purple-700">{formatWeight(batchMetrics.retToWs)} جم</span>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 col-span-2 sm:col-span-2">
                      <span className="text-[10px] text-emerald-800 font-bold block">الصافي المتاح حالياً للإرجاع</span>
                      <span className="font-mono font-bold text-emerald-900 text-sm">{formatWeight(batchMetrics.availWeight)} جم</span>
                      {selectedBatch.availableCount !== null && (
                        <span className="text-[10px] text-emerald-700 block mt-0.5">({selectedBatch.availableCount} قطعة متاحة)</span>
                      )}
                    </div>
                  </div>

                  {/* Original Labor Info */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-700 pt-1 border-t border-amber-200/40">
                    <div>
                      <span>إجمالي أجور السند الأصلي: </span>
                      <span className="font-mono font-bold">{formatCurrency(batchMetrics.originalTotalLabor)} ر.ي</span>
                    </div>
                    <div>
                      <span>أجرة الجرام المستخرجة: </span>
                      <span className="font-mono font-bold">{formatApprox(batchMetrics.derivedWagePerGram)} ر.ي/جم</span>
                    </div>
                    <div>
                      <span>تكلفة المتاح حالياً: </span>
                      <span className="font-mono font-bold text-amber-900">{formatCurrency(batchMetrics.availablePortionCost)} ر.ي</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Return Weights & Quick Buttons */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">2</span>
                  <h2 className="text-sm font-bold text-slate-900">أوزان الإرجاع والكميات</h2>
                </div>
                {batchMetrics && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 text-[11px]">تحديد سريع:</span>
                    <button 
                      type="button" 
                      onClick={() => handleSetReturnPercentage(100)} 
                      className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] cursor-pointer"
                    >
                      كامل المتاح (100%)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleSetReturnPercentage(50)} 
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                    >
                      50%
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleSetReturnPercentage(25)} 
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                    >
                      25%
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوزن القائم عند الإرجاع (جم)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold font-mono text-slate-800 outline-none focus:border-amber-500"
                    placeholder="0.000"
                    value={grossWeightOnReturn || ''}
                    onChange={(e) => setGrossWeightOnReturn(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوزن الصافي الفعلي (جم)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold font-mono text-slate-800 outline-none focus:border-amber-500"
                    placeholder="0.000"
                    value={actualNetWeight || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setActualNetWeight(v);
                      setCertifiedWeight(v);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    الوزن المعتمد من الورشة (جم) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    className="w-full bg-amber-50/60 border-2 border-amber-400 rounded-xl p-3 text-xs font-bold font-mono text-amber-950 outline-none focus:border-amber-500"
                    placeholder="0.000"
                    value={certifiedWeight || ''}
                    onChange={(e) => setCertifiedWeight(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Pieces Count and Weight Difference Treatment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد القطع المرتجعة (اختياري)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    placeholder={selectedBatch?.availableCount ? `المتاح: ${selectedBatch.availableCount}` : 'أدخل عدد القطع إن وجد'}
                    value={piecesCount ?? ''}
                    onChange={(e) => setPiecesCount(e.target.value ? Number(e.target.value) : null)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة البضاعة المرتجعة
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                  >
                    <option value="سليمة وجديدة تماماً">سليمة وجديدة تماماً</option>
                    <option value="سليمة بدون تغليف">سليمة بدون تغليف</option>
                    <option value="بها خدوش طفيفة">بها خدوش طفيفة</option>
                    <option value="معيبة مصنعياً">معيبة مصنعياً</option>
                    <option value="تحتاج إعادة صب">تحتاج إعادة صب</option>
                  </select>
                </div>
              </div>

              {/* Weight Difference Alert & Treatment */}
              {returnMetrics && returnMetrics.weightDifference !== 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      يوجد فرق وزن قدره: {formatWeight(Math.abs(returnMetrics.weightDifference))} جم ({returnMetrics.weightDifference > 0 ? 'زيادة' : 'نقص'})
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      طريقة معالجة فرق الوزن:
                    </label>
                    <select
                      className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                      value={weightDiffTreatment}
                      onChange={(e) => setWeightDiffTreatment(e.target.value as WeightDiffTreatment)}
                    >
                      <option value="WORKSHOP_ACCEPTED">فرق مقبول ومعتمد من الورشة</option>
                      <option value="DISTRIBUTOR_LOSS">فاقد محسوب على الموزع</option>
                      <option value="UNDER_REVIEW">قيد المراجعة وإعادة الفحص</option>
                      <option value="FUTURE_SETTLEMENT">تسوية ذهب لاحقة</option>
                      <option value="WEIGHT_ERROR">خطأ قياس يحتاج ميزان دقيق</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Return Reason & Workshop Recipient */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">3</span>
                  <h2 className="text-sm font-bold text-slate-900">أسباب الإرجاع وبيانات الاستلام</h2>
                </div>
                <span className="text-xs text-slate-400">توثيق السند</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    سبب الإرجاع للورشة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as WorkshopReturnReason)}
                  >
                    {Object.entries(RETURN_REASONS_MAP).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم مستلم الورشة (المعتمد)
                  </label>
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    placeholder="مثال: المعلم أحمد / فني الاستلام"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  تفاصيل إضافية أو ملاحظات على السند
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-amber-500"
                  placeholder="اكتب أي ملاحظات أو اتفاقات خاصة بالإرجاع..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Labor Treatment Options (معالجة الأجور) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">4</span>
                  <h2 className="text-sm font-bold text-slate-900">معالجة أجور التصنيع (أجور الورشة)</h2>
                </div>
                <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  تأثير محاسبي دقيق
                </span>
              </div>

              {/* 3 Labor Options Radio Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: CANCEL_FULL (Default) */}
                <div
                  onClick={() => setLaborTreatment('CANCEL_FULL')}
                  className={cn(
                    "p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                    laborTreatment === 'CANCEL_FULL'
                      ? "border-emerald-500 bg-emerald-50/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">إلغاء الأجور بالكامل</span>
                      {laborTreatment === 'CANCEL_FULL' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      خصم كامل أجور الجزء المرتجع من حساب الورشة (الخيار الافتراضي العادل).
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-emerald-800 font-mono font-bold">
                    إلغاء: {formatCurrency(returnMetrics?.originalCostOfReturnedPart || 0)} ر.ي
                  </div>
                </div>

                {/* Option 2: CANCEL_PARTIAL */}
                <div
                  onClick={() => setLaborTreatment('CANCEL_PARTIAL')}
                  className={cn(
                    "p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                    laborTreatment === 'CANCEL_PARTIAL'
                      ? "border-blue-500 bg-blue-50/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">إلغاء جزء من الأجور</span>
                      {laborTreatment === 'CANCEL_PARTIAL' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      خصم جزء وإبقاء جزء مستحقاً للورشة (مثلاً تعويض جهد التصنيع).
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-blue-800 font-mono font-bold">
                    تحديد يدوي / نسبة
                  </div>
                </div>

                {/* Option 3: KEEP_DUE */}
                <div
                  onClick={() => setLaborTreatment('KEEP_DUE')}
                  className={cn(
                    "p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                    laborTreatment === 'KEEP_DUE'
                      ? "border-rose-500 bg-rose-50/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">الأجور تبقى مستحقة</span>
                      {laborTreatment === 'KEEP_DUE' && (
                        <CheckCircle2 className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      إرجاع الذهب فقط دون خصم أي أجور من الورشة.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-rose-800 font-mono font-bold">
                    إلغاء: 0.00 ر.ي
                  </div>
                </div>
              </div>

              {/* Sub-inputs if CANCEL_PARTIAL */}
              {laborTreatment === 'CANCEL_PARTIAL' && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        طريقة تحديد الإلغاء
                      </label>
                      <select
                        className="w-full bg-white border border-blue-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        value={partialCancelType}
                        onChange={(e) => setPartialCancelType(e.target.value as any)}
                      >
                        <option value="AMOUNT">مبلغ مقطوع (ر.ي)</option>
                        <option value="PERCENTAGE">نسبة مئوية (%)</option>
                        <option value="PER_GRAM">أجرة للجرام المرتجع (ر.ي/جم)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        القيمة المراد إلغاؤها {partialCancelType === 'PERCENTAGE' ? '(%)' : '(ر.ي)'}
                      </label>
                      <input
                        type="number"
                        className="w-full bg-white border border-blue-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-800"
                        placeholder="0"
                        value={partialCancelValue || ''}
                        onChange={(e) => setPartialCancelValue(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      سبب إبقاء جزء من الأجور مستحقاً للورشة
                    </label>
                    <input
                      className="w-full bg-white border border-blue-300 rounded-lg p-2 text-xs text-slate-800"
                      placeholder="مثال: خصم 200 ر.ي/جم مقابل تكاليف الصياغة والتشطيب..."
                      value={keptLaborReason}
                      onChange={(e) => setKeptLaborReason(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Warning if KEEP_DUE */}
              {laborTreatment === 'KEEP_DUE' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">تنبيه محاسبي:</span>
                    سيتم خصم وزن الذهب فقط ({formatWeight(certifiedWeight)} جم) من رصيد الورشة، بينما ستبقى كامل أجور التصنيع ({formatCurrency(returnMetrics?.originalCostOfReturnedPart || 0)} ر.ي) مسجلة كمستحق للورشة.
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Summary & Live Impact Preview (4 Columns) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5 sticky top-20">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  الأثر المحاسبي الفوري
                </h3>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  معاينة مباشرة
                </span>
              </div>

              {/* Summary Items */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-600">الوزن المعتمد للإرجاع:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatWeight(certifiedWeight || 0)} جم
                  </span>
                </div>

                <div className="flex justify-between items-center bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-emerald-800 font-bold">الأجور الملغاة من الورشة:</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm">
                    {formatCurrency(returnMetrics?.cancelledLabor || 0)} ر.ي
                  </span>
                </div>

                {(returnMetrics?.keptLabor || 0) > 0 && (
                  <div className="flex justify-between items-center bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                    <span className="text-amber-800">الأجور المتبقية مستحقة:</span>
                    <span className="font-mono font-bold text-amber-900">
                      {formatCurrency(returnMetrics?.keptLabor || 0)} ر.ي
                    </span>
                  </div>
                )}
              </div>

              {/* Before & After Balances Breakdown */}
              {selectedWorkshop && selectedBatch && (
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                  <span className="text-[11px] font-bold text-slate-700 block border-b border-slate-200 pb-1.5">
                    تحديث رصيد ورشة ({selectedWorkshop.name})
                  </span>

                  {/* Gold Balance */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>رصيد الذهب (ع{selectedBatch.karat}) قبل:</span>
                      <span className="font-mono">{formatWeight(selectedWorkshop.goldBalances[selectedBatch.karat] || 0)} جم</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold">
                      <span>رصيد الذهب الجديد:</span>
                      <span className="font-mono text-amber-900">
                        {formatWeight(returnMetrics?.goldBalanceAfter || 0)} جم
                      </span>
                    </div>
                  </div>

                  {/* Labor Balance */}
                  <div className="space-y-1 text-xs pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>رصيد الأجور قبل:</span>
                      <span className="font-mono">{formatCurrency(selectedWorkshop.laborBalance || 0)} ر.ي</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold">
                      <span>رصيد الأجور الجديد:</span>
                      <span className="font-mono text-emerald-900">
                        {formatCurrency(returnMetrics?.laborBalanceAfter || 0)} ر.ي
                      </span>
                    </div>
                  </div>

                  {/* Credit Balance Alert (إذا كان للموزع رصيد دائن) */}
                  {(returnMetrics?.isCreditGold || returnMetrics?.isCreditLabor) && (
                    <div className="mt-2 p-2 bg-amber-100 rounded-lg border border-amber-300 text-[11px] text-amber-950 font-bold leading-snug">
                      تنبيه: تحول حساب الورشة إلى رصيد دائن لصالح الموزع
                      {returnMetrics.isCreditGold && ` (${formatWeight(returnMetrics.creditGoldDueFromWorkshop)} جم ذهب مستحق)`}
                      {returnMetrics.isCreditLabor && ` (${formatCurrency(returnMetrics.creditLaborDueFromWorkshop)} ر.ي أجور مستردة)`}
                    </div>
                  )}
                </div>
              )}

              {/* Distributed Portion Profit Integrity Indicator */}
              {batchMetrics && batchMetrics.distWeight > 0.001 && returnMetrics && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 space-y-1">
                  <span className="font-bold block flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    حماية أرباح الجزء الموزع سابقاً:
                  </span>
                  <p className="text-[10px] text-blue-800">
                    الجزء الموزع ({formatWeight(batchMetrics.distWeight)} جم) يحتفظ بربحه المستحق ({formatCurrency(returnMetrics.distributedNetProfit)} ر.ي) دون أي تأثر بالمرتجع.
                  </p>
                </div>
              )}

              {/* Submit & Print Button */}
              <button
                type="button"
                onClick={handleSubmitReturn}
                disabled={!selectedWorkshopId || !selectedBatchId || !certifiedWeight || certifiedWeight <= 0 || isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    جاري اعتماد المرتجع...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    اعتماد المرتجع وطباعة السند
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History & Audit Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">سجل حركات المرتجع للورش</h2>
              <p className="text-xs text-slate-500">سجل كامل بجميع سندات إرجاع البضاعة للورش مع التفاصيل والأثر المالي.</p>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pr-9 pl-3 text-xs font-bold outline-none focus:border-amber-500"
                  placeholder="بحث برقم السند، الورشة، الصنف..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              <select
                className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 outline-none"
                value={historyWorkshopFilter}
                onChange={(e) => setHistoryWorkshopFilter(e.target.value)}
              >
                <option value="ALL">جميع الورش</option>
                {workshops.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          {workshopReturnTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Undo2 className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">لا توجد سندات مرتجع للورش حتى الآن</p>
              <p className="text-xs text-slate-400">يمكنك إنشاء سند إرجاع جديد بالضغط على زر "سند إرجاع جديد" بالأعلى.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">رقم السند والتاريخ</th>
                    <th className="p-3">الورشة</th>
                    <th className="p-3">الصنف والموديل</th>
                    <th className="p-3">العيار</th>
                    <th className="p-3">الوزن المعتمد</th>
                    <th className="p-3">الأجور الملغاة</th>
                    <th className="p-3">سبب الإرجاع</th>
                    <th className="p-3">مستلم الورشة</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workshopReturnTransactions.map(tx => {
                    const item = tx.items?.[0];
                    const certWeight = tx.certifiedGoldWeightTotal || item?.certifiedWeightByWorkshop || item?.netWeight || 0;
                    const cancelledLabor = tx.cancelledLaborTotal || item?.cancelledLaborAmount || 0;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono">
                          <span className="font-bold text-slate-900 block">{tx.id}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(tx.date).toLocaleDateString('ar-EG')}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {tx.entityName || '---'}
                          {tx.workshopDocNo && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              سند أصلي: {tx.workshopDocNo}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {item?.category || '---'}
                          {item?.modelCode && <span className="text-slate-400 text-[10px] mr-1">({item.modelCode})</span>}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          ع{item?.karat || 21}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-900">
                          {formatWeight(certWeight)} جم
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-800">
                          {formatCurrency(cancelledLabor)} ر.ي
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          {tx.workshopReturnReasonText || item?.workshopReturnReasonText || '---'}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          {tx.recipientName || item?.recipientName || '---'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setPrintData(tx)}
                            className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg transition-colors cursor-pointer"
                            title="طباعة السند"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Print Voucher Modal */}
      {printData && (
        <PrintVoucher
          title="سند مرتجع للورشة"
          type="Thermal80"
          data={printData}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
}
