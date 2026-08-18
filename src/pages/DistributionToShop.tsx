import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { calculateDistributionMetrics } from '../lib/accounting';
import { formatCurrency, formatWeight, formatApprox, cn } from '../lib/utils';
import { 
  Package, Truck, Store, CheckCircle, Trash2, Tag, 
  TrendingUp, DollarSign, Calculator, Info, ArrowLeftRight,
  Layers, AlertCircle, Sparkles, Hash, Scale, Eye, EyeOff,
  Zap, FileText, Clock, MessageSquare
} from 'lucide-react';
import { InventoryItem, PricingMode, ShopWageMethod, TransactionItem, Karat, QuickDistributionData } from '../types';
import { VoucherPreviewModal } from '../components/VoucherPreviewModal';
import { useVoucherSettings } from '../lib/useVoucherSettings';
import { buildDistributionVoucherDTO, buildQuickDistributionVoucherDTO, CustomerVoucherDTO } from '../types/voucherTypes';
import { SensitiveAmount } from '../components/SensitiveAmount';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  // تاريخ السند — افتراضي: اليوم، قابل للتعديل يدوياً
  const [voucherDate, setVoucherDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // ── وضع الخصوصية ── الإخفاء دائماً افتراضي، لا يُحفظ في localStorage
  const [showInternal, setShowInternal] = useState(false);

  // ── وضع التوزيع: تفصيلي أو سريع ──
  const [distributionMode, setDistributionMode] = useState<'detailed' | 'quick'>('detailed');

  // ── حالة نموذج التوزيع السريع ──
  const DRAFT_KEY = 'gold_quick_dist_draft';
  const [qShopId, setQShopId] = useState('');
  const [qDate, setQDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [qTime, setQTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [qCategory, setQCategory] = useState('');
  const [qKarat, setQKarat] = useState<Karat>(21);
  const [qWeight, setQWeight] = useState<number | ''>('');
  const [qPieceCount, setQPieceCount] = useState<number | ''>('');
  const [qWagePerGram, setQWagePerGram] = useState<number | ''>('');
  const [qPossibleBatches, setQPossibleBatches] = useState<string[]>([]);
  const [qNote, setQNote] = useState('');
  const [qSubmitting, setQSubmitting] = useState(false);
  const weightInputRef = useRef<HTMLInputElement>(null);

  // إخفاء تلقائي عند مغادرة التبويب أو الصفحة
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') setShowInternal(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      setShowInternal(false); // إخفاء عند unmount (مغادرة الصفحة)
    };
  }, []);

  // ── حفظ مسودة التوزيع السريع تلقائيًا ──
  useEffect(() => {
    if (distributionMode !== 'quick') return;
    const draft = { qShopId, qDate, qTime, qCategory, qKarat, qWeight, qPieceCount, qWagePerGram, qPossibleBatches, qNote };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [distributionMode, qShopId, qDate, qTime, qCategory, qKarat, qWeight, qPieceCount, qWagePerGram, qPossibleBatches, qNote]);

  // ── استعادة المسودة عند الفتح ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.qShopId) setQShopId(d.qShopId);
        if (d.qCategory) setQCategory(d.qCategory);
        if (d.qKarat) setQKarat(d.qKarat);
        if (d.qWeight) setQWeight(d.qWeight);
        if (d.qPieceCount) setQPieceCount(d.qPieceCount);
        if (d.qWagePerGram) setQWagePerGram(d.qWagePerGram);
        if (d.qNote) setQNote(d.qNote);
        if (d.qPossibleBatches) setQPossibleBatches(d.qPossibleBatches);
      }
    } catch {}
  }, []);

  // ── حسابات التوزيع السريع ──
  const qWeightNum = typeof qWeight === 'number' ? qWeight : 0;
  const qWageNum = typeof qWagePerGram === 'number' ? qWagePerGram : 0;
  const qTotalWage = Number((qWeightNum * qWageNum).toFixed(2));

  const handleQuickSubmit = async () => {
    if (qSubmitting) return;
    if (!qShopId) return alert('يرجى اختيار العميل');
    if (!qCategory.trim()) return alert('يرجى إدخال اسم الصنف');
    if (!qWeightNum || qWeightNum <= 0) return alert('يرجى إدخال الوزن الصافي');
    if (!qWageNum || qWageNum <= 0) return alert('يرجى إدخال أجرة الجرام');

    setQSubmitting(true);
    try {
      const shop = shops.find(s => s.id === qShopId);
      const txId = `QD-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

      const quickDistData: QuickDistributionData = {
        category: qCategory.trim(),
        karat: qKarat,
        totalNetWeight: qWeightNum,
        pieceCount: typeof qPieceCount === 'number' ? qPieceCount : null,
        shopWagePerGram: qWageNum,
        totalShopWage: qTotalWage,
        possibleBatchIds: qPossibleBatches.length > 0 ? qPossibleBatches : undefined,
        internalNote: qNote.trim() || undefined,
        settlementStatus: 'PENDING',
        pendingWeight: qWeightNum,
      };

      const dateStr = qDate && qTime
        ? new Date(`${qDate}T${qTime}`).toISOString()
        : qDate
          ? new Date(qDate).toISOString()
          : new Date().toISOString();

      const tx = {
        id: txId,
        date: dateStr,
        type: 'QUICK_DISTRIBUTE' as const,
        entityId: qShopId,
        entityName: shop?.name,
        cashAmount: qTotalWage,
        quickDistData,
      };

      await addTransaction(tx);

      // Build customer-facing voucher
      const identity = getIdentitySnapshot();
      const dto = buildQuickDistributionVoucherDTO(tx, shop, identity);
      setVoucherDto(dto);
      setVoucherTxId(txId);

      // Reset form
      setQCategory('');
      setQWeight('');
      setQPieceCount('');
      setQWagePerGram('');
      setQPossibleBatches([]);
      setQNote('');
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.error('خطأ في التوزيع السريع:', err);
      alert('حدث خطأ أثناء تنفيذ العملية. يرجى المحاولة مرة أخرى.');
    } finally {
      setQSubmitting(false);
    }
  };

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
    if (isSubmitting) return;
    if (!selectedShopId) return alert('يرجى اختيار المحل (الوجهة)');
    if (selectedItems.length === 0) return alert('يرجى اختيار دفعات من المخزون للتوزيع');
    if (hasInvalidWeights) {
      return alert('يوجد خطأ في أوزان التوزيع: تأكد من أن الوزن المراد توزيعه أكبر من صفر ولا يتجاوز الوزن المتاح للدفعة.');
    }
    setIsSubmitting(true);
    try {

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
      date: voucherDate ? new Date(voucherDate).toISOString() : new Date().toISOString(),
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
    } catch (err) {
      console.error('خطأ في تنفيذ عملية التوزيع:', err);
      alert('حدث خطأ أثناء تنفيذ العملية. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
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
            توزيع بضاعة للمحلات — سندات صرف
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {distributionMode === 'detailed'
              ? 'إمكانية توزيع جزء من الدفعة واحتساب تكلفة الورشة والأرباح بدقة النسبة والتناسب مع بقاء الرصيد المتبقي في المخزون.'
              : 'إصدار سند فوري للعميل مع تأجيل توزيع الوزن على الدفعات — للاستخدام السريع داخل المحل.'}
          </p>
        </div>
      </div>

      {/* ── مبدّل وضع التوزيع ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1.5 flex gap-1.5">
        <button
          onClick={() => setDistributionMode('detailed')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer',
            distributionMode === 'detailed'
              ? 'bg-[#0F1B33] text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
          )}
        >
          <Calculator className="w-4 h-4" />
          توزيع تفصيلي
        </button>
        <button
          onClick={() => setDistributionMode('quick')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer',
            distributionMode === 'quick'
              ? 'bg-gradient-to-l from-[#0F1B33] to-[#1a2e4a] text-[#E49A0A] shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
          )}
        >
          <Zap className="w-4 h-4" />
          توزيع سريع وتسوية لاحقًا
        </button>
      </div>

      {/* ══════════════════════════════════════ */}
      {/*  نموذج التوزيع السريع               */}
      {/* ══════════════════════════════════════ */}
      {distributionMode === 'quick' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* العمود الأيسر: النموذج */}
            <div className="lg:col-span-2 space-y-5">
              {/* بطاقة بيانات العملية */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#E49A0A]" />
                  بيانات التوزيع السريع
                </h3>

                {/* العميل */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    العميل (المحل المستلم) *
                  </label>
                  <div className="relative">
                    <Store className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pr-9 pl-3 font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      value={qShopId}
                      onChange={e => setQShopId(e.target.value)}
                    >
                      <option value="">-- اختر العميل --</option>
                      {shops.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* التاريخ والوقت */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">📅 التاريخ *</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-3 font-mono font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                      value={qDate}
                      onChange={e => setQDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">🕐 الوقت</label>
                    <input
                      type="time"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-3 font-mono font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                      value={qTime}
                      onChange={e => setQTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* الصنف والعيار */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      اسم الصنف العام *
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: محابس متنوعة"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-3 font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                      value={qCategory}
                      onChange={e => setQCategory(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">العيار *</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-3 font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                      value={qKarat}
                      onChange={e => setQKarat(Number(e.target.value) as Karat)}
                    >
                      <option value={18}>عيار 18</option>
                      <option value={21}>عيار 21</option>
                      <option value={22}>عيار 22</option>
                      <option value={24}>عيار 24</option>
                    </select>
                  </div>
                </div>

                {/* الوزن وعدد القطع */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                    <label className="block text-xs font-bold text-amber-950 mb-1.5 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-amber-600" />
                      الوزن الصافي الإجمالي (جم) *
                    </label>
                    <input
                      ref={weightInputRef}
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      placeholder="0.000"
                      className="w-full bg-white border border-amber-300 rounded-lg px-3 py-3.5 font-mono font-black text-slate-900 text-xl text-left outline-none focus:ring-2 focus:ring-amber-500/30"
                      value={qWeight}
                      onChange={e => setQWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      onKeyDown={e => { if (e.key === 'Enter') { const next = document.getElementById('q-wage-input'); next?.focus(); } }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      عدد القطع (اختياري)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      placeholder="—"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3.5 font-mono font-bold text-slate-900 text-lg text-left outline-none focus:ring-2 focus:ring-amber-500/20"
                      value={qPieceCount}
                      onChange={e => setQPieceCount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* أجرة الجرام */}
                <div className="bg-white border border-[#0F1B33]/10 p-3 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    أجرة الجرام على العميل (ر.ي/جم) *
                  </label>
                  <input
                    id="q-wage-input"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3.5 font-mono font-black text-slate-900 text-xl text-left outline-none focus:ring-2 focus:ring-amber-500/30"
                    value={qWagePerGram}
                    onChange={e => setQWagePerGram(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                {/* اختيار الدفعات المحتملة */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    الدفعات المحتمل خروج البضاعة منها (اختياري)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableInventory.map(item => {
                      const isSelected = qPossibleBatches.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setQPossibleBatches(prev =>
                              isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                            );
                          }}
                          className={cn(
                            'text-xs px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer',
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          )}
                        >
                          {item.category} ({item.modelCode}) — {formatWeight(item.availableWeight)} جم
                        </button>
                      );
                    })}
                    {availableInventory.length === 0 && (
                      <span className="text-xs text-slate-400 italic">لا توجد دفعات في المخزون</span>
                    )}
                  </div>
                </div>

                {/* ملاحظة داخلية */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    ملاحظة داخلية (اختيارية)
                  </label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                    rows={2}
                    placeholder="ملاحظات لنفسك..."
                    value={qNote}
                    onChange={e => setQNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* العمود الأيمن: الملخص وزر الاعتماد */}
            <div className="space-y-5">
              {/* ملخص العملية */}
              <div className="bg-[#0F1B33] text-white p-6 rounded-xl shadow-xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className="text-xs uppercase font-bold text-[#E49A0A] flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    ملخص التوزيع السريع
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                    <span className="text-slate-400">الصنف:</span>
                    <span className="font-bold text-white text-sm">{qCategory || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                    <span className="text-slate-400">العيار:</span>
                    <span className="font-bold text-white text-sm">{qKarat}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                    <span className="text-slate-400">الوزن الصافي:</span>
                    <span className="font-mono font-bold text-[#E49A0A] text-lg">
                      {qWeightNum > 0 ? formatWeight(qWeightNum) : '0.000'} جم
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                    <span className="text-slate-400">أجرة الجرام:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {qWageNum > 0 ? formatCurrency(qWageNum) : '0'} ر.ي
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="bg-[#E49A0A]/10 border border-[#E49A0A]/20 p-4 rounded-xl text-center space-y-1">
                      <span className="text-[11px] uppercase font-bold text-[#E49A0A] block">إجمالي الأجور</span>
                      <div className="text-3xl font-mono font-black text-[#E49A0A]" dir="ltr">
                        {formatCurrency(qTotalWage)} <small className="text-sm font-normal text-white">ر.ي</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* زر الاعتماد */}
                <button
                  onClick={handleQuickSubmit}
                  disabled={!qShopId || !qCategory.trim() || qWeightNum <= 0 || qWageNum <= 0 || qSubmitting}
                  className="w-full bg-[#E49A0A] disabled:opacity-50 disabled:cursor-not-allowed text-[#091225] py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#C88918] transition-all shadow-lg shadow-[#E49A0A]/10 active:scale-[0.99] cursor-pointer"
                >
                  {qSubmitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      جاري التنفيذ...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      إصدار السند وحفظ التسوية لوقت لاحق
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-500 text-center mt-2">
                  سيصدر سند معتمد للعميل فورًا. يمكنك توزيع الوزن على الدفعات لاحقًا من صفحة التسويات.
                </p>
              </div>

              {/* تنبيه الربح */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <span className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  الربح الداخلي:
                </span>
                <span className="text-sm font-bold text-slate-400 mt-1 block">قيد الاحتساب</span>
                <p className="text-[10px] text-slate-400 mt-1">سيُحسب بعد تسوية الدفعات</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/*  التوزيع التفصيلي (الكود الحالي)     */}
      {/* ══════════════════════════════════════ */}
      {distributionMode === 'detailed' && (
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
                      {/* ── زر وضع الخصوصية ── */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowInternal(v => !v)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all select-none",
                            showInternal
                              ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                              : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                          )}
                          aria-pressed={showInternal}
                        >
                          {showInternal
                            ? <><Eye className="w-3.5 h-3.5" /> إخفاء حساباتي الداخلية</>
                            : <><EyeOff className="w-3.5 h-3.5" /> إظهار حساباتي الداخلية</>
                          }
                        </button>
                      </div>
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
                              <SensitiveAmount
                                visible={showInternal}
                                value={`~${formatApprox(inv.derivedWorkshopWagePerGram)}`}
                                unit="ر.ي/جم"
                                className="font-bold text-slate-700 text-sm block"
                                unitClassName="text-slate-500"
                              />
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
                          <SensitiveAmount
                            visible={showInternal}
                            value={formatCurrency(metrics.allocatedWorkshopCost)}
                            unit="ر.ي"
                            className="font-bold text-blue-700 text-sm block"
                            unitClassName="text-blue-400"
                          />
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
                        <SensitiveAmount
                          visible={showInternal}
                          value={`${formatCurrency(metrics.expectedProfit)} ر.ي`}
                          className="font-bold text-emerald-700 text-sm"
                        />
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

            {/* حقل تاريخ السند */}
            <div>
              <label className="block text-xs uppercase font-bold text-slate-700 mb-1.5">
                📅 تاريخ سند الصرف *
              </label>
              <input
                type="date"
                id="distribution-voucher-date"
                className="w-full bg-slate-50 border border-amber-300 rounded-lg py-2.5 px-3 font-mono font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
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
                <SensitiveAmount
                  visible={showInternal}
                  value={formatCurrency(totalAllocatedWorkshopCost)}
                  unit="ر.ي"
                  className="font-bold text-blue-400 text-base"
                  unitClassName="text-xs text-slate-400"
                />
              </div>

              {/* Net Expected Profit */}
              <div className="pt-2 border-t border-white/10">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center space-y-1.5">
                  <span className="text-[11px] uppercase font-bold text-amber-400 block">
                    إجمالي الربح المتوقع
                  </span>
                  <div className="text-3xl font-mono font-bold text-amber-400" dir="ltr">
                    <SensitiveAmount
                      visible={showInternal}
                      value={formatCurrency(totalExpectedProfit)}
                      unit="ر.ي"
                      className="font-black"
                      unitClassName="text-sm font-normal text-white"
                      dotCount={8}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    محسوب من الإجماليات الدقيقة وفق نسبة الوزن الموزع من إجمالي السند الأصلي.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={selectedItems.length === 0 || !selectedShopId || hasInvalidWeights || isSubmitting}
              className="w-full bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  جاري تنفيذ العملية...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  تأكيد وتنفيذ عملية التوزيع
                </>
              )}
            </button>
          </div>
        </div>
    </div>
      )}
    </div>
  );
}
