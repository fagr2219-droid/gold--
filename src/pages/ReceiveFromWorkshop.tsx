import React, { useState } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { calculateWorkshopWageMetrics, resolveWageCalculationWeight } from '../lib/accounting';
import { formatCurrency, formatWeight, formatApprox, cn } from '../lib/utils';
import { 
  Plus, Trash2, CheckCircle, Tag, Calendar, FileText, Image as ImageIcon, 
  Layers, Calculator, Info, Upload, Sparkles, Scale, AlertCircle 
} from 'lucide-react';
import { Karat, TransactionItem, WageCalculationBasis, WorkshopWageInputMode } from '../types';
import { PrintVoucher } from '../components/PrintVoucher';

interface FormItem {
  id: string;
  category: string;
  modelCode: string;
  count: number;
  karat: Karat;
  grossWeight: number;
  netWeight: number;
  weightDifference: number;
  wageCalculationBasis: WageCalculationBasis;
  manualWageWeight?: number;
  workshopWageInputMode: WorkshopWageInputMode;
  totalWageInput: number;
  wagePerGramInput: number;
  notes?: string;
}

export default function ReceiveFromWorkshop() {
  const { workshops, addTransaction } = useAppStore();
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [workshopDocNo, setWorkshopDocNo] = useState('');
  const [workshopDocDate, setWorkshopDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [workshopDocImage, setWorkshopDocImage] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [printData, setPrintData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial item prefilled with testable default
  const [items, setItems] = useState<FormItem[]>([
    {
      id: crypto.randomUUID(),
      category: 'محابس',
      modelCode: 'RNG-360',
      count: 24,
      karat: 21,
      grossWeight: 365.70,
      netWeight: 360.67,
      weightDifference: 5.03,
      wageCalculationBasis: 'NET_WEIGHT',
      workshopWageInputMode: 'TOTAL_WAGE',
      totalWageInput: 541000,
      wagePerGramInput: 1500,
      notes: '',
    }
  ]);

  const addItem = () => {
    const newItem: FormItem = {
      id: crypto.randomUUID(),
      category: '',
      modelCode: '',
      count: 1,
      karat: 21,
      grossWeight: 0,
      netWeight: 0,
      weightDifference: 0,
      wageCalculationBasis: 'NET_WEIGHT',
      workshopWageInputMode: 'TOTAL_WAGE',
      totalWageInput: 0,
      wagePerGramInput: 0,
      notes: '',
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<FormItem>) => {
    setItems(prev => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };

      // Calculate weight difference
      const gross = current.grossWeight || 0;
      const net = current.netWeight || 0;
      current.weightDifference = Number(Math.max(0, gross - net).toFixed(3));

      copy[index] = current;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Helper to compute calculated metrics for an item
  const getItemMetrics = (item: FormItem) => {
    const wageWeight = resolveWageCalculationWeight(
      item.wageCalculationBasis,
      item.grossWeight,
      item.netWeight,
      item.manualWageWeight
    );

    const metrics = calculateWorkshopWageMetrics({
      inputMode: item.workshopWageInputMode,
      wageWeight,
      totalWageInput: item.totalWageInput,
      wagePerGramInput: item.wagePerGramInput,
    });

    return {
      wageWeight,
      ...metrics,
    };
  };

  // Aggregated totals
  const totalGrossWeight = items.reduce((s, i) => s + (i.grossWeight || 0), 0);
  const totalNetWeight = items.reduce((s, i) => s + (i.netWeight || 0), 0);
  const totalWeightDiff = items.reduce((s, i) => s + (i.weightDifference || 0), 0);

  const totalCertifiedWages = items.reduce((s, i) => {
    const m = getItemMetrics(i);
    return s + m.totalWorkshopWage;
  }, 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setWorkshopDocImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!selectedWorkshopId) return alert('يرجى اختيار الورشة الموردة');
    if (items.length === 0) return alert('يرجى إضافة صنف واحد على الأقل');
    setIsSubmitting(true);
    try {

    // Build transaction items
    const txItems: TransactionItem[] = items.map(item => {
      const m = getItemMetrics(item);
      return {
        category: item.category || 'عام',
        modelCode: item.modelCode || 'STD',
        count: item.count || 1,
        karat: item.karat,
        grossWeight: item.grossWeight || 0,
        netWeight: item.netWeight || 0,
        weightDifference: item.weightDifference || 0,
        wageCalculationBasis: item.wageCalculationBasis,
        manualWageWeight: item.manualWageWeight,
        wageCalculationWeight: m.wageWeight,
        workshopWageInputMode: item.workshopWageInputMode,
        totalWorkshopWage: m.totalWorkshopWage, // Exact certified total
        derivedWorkshopWagePerGram: m.derivedWagePerGram,
        roundedDerivedWagePerGram: m.roundedDerivedWagePerGram,
        roundingDifference: m.roundingDifference,
        workshopDocNo: workshopDocNo || undefined,
        workshopDocDate: workshopDocDate || undefined,
        workshopDocImage: workshopDocImage || undefined,
        notes: item.notes || generalNotes || undefined,
      };
    });

    const workshop = workshops.find(w => w.id === selectedWorkshopId);
    const txId = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

    const tx = {
      id: txId,
      date: new Date().toISOString(),
      type: 'RECEIVE_FROM_WORKSHOP' as const,
      entityId: selectedWorkshopId,
      entityName: workshop?.name,
      workshopDocNo,
      workshopDocDate,
      workshopDocImage,
      notes: generalNotes,
      items: txItems,
      cashAmount: totalCertifiedWages,
    };

    await addTransaction(tx);

    setPrintData({
      ...tx,
      companyName: 'نظام إدارة وتوزيع الذهب',
      currency: 'ر.ي',
      items: txItems.map(it => ({
        ...it,
        weight: it.netWeight, // for backward compatibility in print
      }))
    });

    alert('تم حفظ سند استلام البضاعة وتحديث أرصدة الورشة والمخزون بنجاح.');
    setItems([]);
    setWorkshopDocNo('');
    setGeneralNotes('');
    setWorkshopDocImage('');
    } catch (err) {
      console.error('خطأ في اعتماد السند:', err);
      alert('حدث خطأ أثناء اعتماد السند. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {printData && (
        <PrintVoucher 
          title="سند استلام بضاعة من ورشة" 
          type="Thermal80" 
          data={printData} 
          onClose={() => setPrintData(null)} 
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Scale className="w-7 h-7 text-amber-500" />
            استلام بضاعة من ورشة
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            تسجيل سند صرف الورشة، استخراج أجور الجرام تلقائياً، واعتماد إجمالي السند محاسبياً.
          </p>
        </div>
      </div>

      {/* Workshop & Voucher Information */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />
          بيانات سند صرف الورشة الموردة
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">الورشة الموردة *</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={selectedWorkshopId}
              onChange={(e) => setSelectedWorkshopId(e.target.value)}
            >
              <option value="">-- اختر الورشة --</option>
              {workshops.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} (رصيد الأجور: {formatCurrency(w.laborBalance)} ر.ي)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">رقم سند صرف الورشة</label>
            <div className="relative">
              <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pr-9 pl-3 text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="مثال: DOC-5491"
                value={workshopDocNo}
                onChange={(e) => setWorkshopDocNo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">تاريخ سند الورشة</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pr-9 pl-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                value={workshopDocDate}
                onChange={(e) => setWorkshopDocDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">صورة سند الورشة (اختياري)</label>
            <label className="flex items-center justify-center gap-2 w-full bg-slate-50 border border-dashed border-slate-300 hover:border-amber-500 rounded-lg py-2.5 px-3 text-xs font-bold text-slate-600 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-amber-600" />
              <span>{workshopDocImage ? 'تم إرفاق صورة السند' : 'رفع صورة السند'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>

        {workshopDocImage && (
          <div className="pt-2 flex items-center gap-3">
            <img src={workshopDocImage} alt="سند الورشة" className="w-16 h-16 object-cover rounded-lg border" />
            <button 
              onClick={() => setWorkshopDocImage('')} 
              className="text-xs text-red-500 hover:underline"
            >
              حذف الصورة
            </button>
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              أصناف السند (حساب الأجور بدقة السند والتقسيم)
            </h3>
            <p className="text-xs text-slate-500">
              يتم اعتماد الوزن الصافي في رصيد الذهب، ويظل إجمالي السند هو القيمة المحاسبية الأصلية المعتمدة.
            </p>
          </div>
          <button 
            onClick={addItem}
            className="flex items-center gap-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 px-3.5 py-1.5 rounded-lg transition-all font-bold text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة صنف
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {items.map((item, index) => {
            const m = getItemMetrics(item);

            return (
              <div key={item.id} className="p-5 hover:bg-slate-50/50 transition-colors space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {item.category || 'صنف جديد'} {item.modelCode ? `(${item.modelCode})` : ''}
                    </span>
                  </div>
                  {items.length > 1 && (
                    <button 
                      onClick={() => removeItem(index)} 
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Primary item attributes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">نوع البضاعة / الفئة *</label>
                    <input 
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-amber-500"
                      placeholder="مثال: محابس، أساور..."
                      value={item.category}
                      onChange={(e) => updateItem(index, { category: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">الموديل / الكود</label>
                    <input 
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono text-slate-800 outline-none focus:border-amber-500"
                      placeholder="RNG-01"
                      value={item.modelCode}
                      onChange={(e) => updateItem(index, { modelCode: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">العدد (قطعة)</label>
                    <input 
                      type="number"
                      min="1"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono text-center font-bold text-slate-800 outline-none focus:border-amber-500"
                      value={item.count}
                      onChange={(e) => updateItem(index, { count: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">العيار *</label>
                    <select 
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-amber-700 outline-none focus:border-amber-500"
                      value={item.karat}
                      onChange={(e) => updateItem(index, { karat: Number(e.target.value) as Karat })}
                    >
                      <option value={18}>عيار 18</option>
                      <option value={21}>عيار 21</option>
                      <option value={22}>عيار 22</option>
                      <option value={24}>عيار 24</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      الوزن القائم (جم) *
                    </label>
                    <input 
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-800 text-left outline-none focus:border-amber-500"
                      value={item.grossWeight || ''}
                      onChange={(e) => updateItem(index, { grossWeight: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 mb-1">
                      الوزن الصافي (جم) *
                    </label>
                    <input 
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-amber-900 text-left outline-none focus:border-amber-500"
                      value={item.netWeight || ''}
                      onChange={(e) => updateItem(index, { netWeight: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Weights & Wage Calculation Basis Bar */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs">
                  {/* Weight Difference */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">فرق الوزن (فصوص/أحجار):</span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border">
                      {formatWeight(item.weightDifference)} جم
                    </span>
                    <span className="text-[10px] text-slate-400">(لا يدخل في رصيد الذهب)</span>
                  </div>

                  {/* Basis Selection */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">وزن احتساب الأجور:</span>
                    <select 
                      className="bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 outline-none"
                      value={item.wageCalculationBasis}
                      onChange={(e) => updateItem(index, { wageCalculationBasis: e.target.value as WageCalculationBasis })}
                    >
                      <option value="NET_WEIGHT">الوزن الصافي (الافتراضي)</option>
                      <option value="GROSS_WEIGHT">الوزن القائم</option>
                      <option value="MANUAL">وزن يدوي</option>
                    </select>
                  </div>

                  {/* Manual input if selected */}
                  {item.wageCalculationBasis === 'MANUAL' && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">الوزن المعتمد:</span>
                      <input 
                        type="number"
                        step="0.001"
                        placeholder="الوزن"
                        className="w-24 bg-white border border-slate-200 rounded px-2 py-1 font-mono font-bold text-left"
                        value={item.manualWageWeight || ''}
                        onChange={(e) => updateItem(index, { manualWageWeight: Number(e.target.value) })}
                      />
                      <span>جم</span>
                    </div>
                  )}

                  {item.wageCalculationBasis !== 'MANUAL' && (
                    <div className="text-left font-mono font-bold text-slate-700">
                      الوزن المطبق للأجور: {formatWeight(m.wageWeight)} جم
                    </div>
                  )}
                </div>

                {/* Workshop Wage Calculation Engine */}
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        طريقة إدخال أجور الورشة
                      </span>
                    </div>

                    <div className="flex gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
                      <button 
                        type="button"
                        onClick={() => updateItem(index, { workshopWageInputMode: 'TOTAL_WAGE' })}
                        className={cn(
                          "px-3 py-1 rounded text-xs font-bold transition-all",
                          item.workshopWageInputMode === 'TOTAL_WAGE' 
                            ? "bg-amber-500 text-slate-950 shadow-md" 
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        1. إجمالي الأجور من السند (افتراضي)
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateItem(index, { workshopWageInputMode: 'PER_GRAM' })}
                        className={cn(
                          "px-3 py-1 rounded text-xs font-bold transition-all",
                          item.workshopWageInputMode === 'PER_GRAM' 
                            ? "bg-amber-500 text-slate-950 shadow-md" 
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        2. إدخال أجرة الجرام
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Input Side */}
                    {item.workshopWageInputMode === 'TOTAL_WAGE' ? (
                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">
                          إجمالي الأجور المكتوب في سند الورشة (المعتمد محاسبياً) *
                        </label>
                        <div className="relative">
                          <input 
                            type="number"
                            placeholder="مثال: 541000"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-xl font-mono font-bold text-amber-400 text-left outline-none focus:border-amber-400"
                            value={item.totalWageInput || ''}
                            onChange={(e) => updateItem(index, { totalWageInput: Number(e.target.value) })}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            ر.ي
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] text-slate-300 font-bold mb-1">
                          أجرة الورشة لكل جرام (ر.ي/جم) *
                        </label>
                        <div className="relative">
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="مثال: 1500"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-xl font-mono font-bold text-amber-400 text-left outline-none focus:border-amber-400"
                            value={item.wagePerGramInput || ''}
                            onChange={(e) => updateItem(index, { wagePerGramInput: Number(e.target.value) })}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            ر.ي/جم
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Extracted Metrics Side */}
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">أجرة الورشة المستخرجة:</span>
                        <span className="font-mono text-emerald-400 font-bold text-sm">
                          {formatApprox(m.derivedWagePerGram)} <small className="text-[10px] text-slate-400">ر.ي/جم</small>
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>المعروضة مقربة:</span>
                        <span className="font-mono text-slate-300">
                          حوالي {formatCurrency(m.roundedDerivedWagePerGram)} ر.ي/جم
                        </span>
                      </div>
                      {item.workshopWageInputMode === 'TOTAL_WAGE' && (
                        <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-700/60">
                          <span className="text-slate-400">فرق التقريب (للمقارنة):</span>
                          <span className={cn(
                            "font-mono font-bold text-xs",
                            m.roundingDifference === 0 ? "text-slate-400" : "text-amber-300"
                          )}>
                            {m.roundingDifference > 0 ? `+${m.roundingDifference}` : m.roundingDifference} ر.ي
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Certified Accounting Total */}
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                        إجمالي السند المعتمد في الحساب
                      </span>
                      <div className="text-2xl font-mono font-bold text-amber-400" dir="ltr">
                        {formatCurrency(m.totalWorkshopWage)} <small className="text-xs text-white">ر.ي</small>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        لا يتم استبدال إجمالي السند الأصلي بنتيجة التقريب.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Gold Summary by Karat */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-600" />
            ملخص حركة الذهب المضافة للرصيد
          </h4>

          <div className="space-y-2">
            {[18, 21, 22, 24].map(k => {
              const netKaratWeight = items
                .filter(i => i.karat === k)
                .reduce((s, i) => s + (i.netWeight || 0), 0);
              
              if (netKaratWeight === 0) return null;

              return (
                <div key={k} className="flex justify-between items-center border-b border-slate-100 pb-1.5 text-sm">
                  <span className="text-slate-600 font-medium">ذهب عيار {k} (صافي):</span>
                  <span className="font-mono font-bold text-slate-800">{formatWeight(netKaratWeight)} جم</span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>إجمالي الوزن القائم (للمراقبة):</span>
              <span className="font-mono font-bold text-slate-700">{formatWeight(totalGrossWeight)} جم</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي الوزن الصافي (المعتمد):</span>
              <span className="font-mono font-bold text-amber-700">{formatWeight(totalNetWeight)} جم</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي الفصوص والأحجار:</span>
              <span className="font-mono font-bold text-slate-600">{formatWeight(totalWeightDiff)} جم</span>
            </div>
          </div>
        </div>

        {/* Middle: Total Certified Accounting Labor */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-amber-400 block mb-1">
              إجمالي أجور السند المعتمدة محاسبياً
            </span>
            <p className="text-xs text-slate-400">
              سيتم قيد هذا المبلغ الدقيق لحساب الورشة الموردة دون أي تأثر بالتقريب.
            </p>
          </div>

          <div className="my-6">
            <div className="text-3xl sm:text-4xl font-mono font-bold text-amber-400" dir="ltr">
              {formatCurrency(totalCertifiedWages)} <span className="text-sm font-normal text-slate-300">ر.ي</span>
            </div>
          </div>

          <div className="p-2.5 bg-white/5 rounded-lg border border-white/10 text-[11px] text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>عدد الأصناف: {items.length} صنف | إجمالي القطع: {items.reduce((s, i) => s + (i.count || 0), 0)} قطعة</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-2">اعتماد السند وحفظ المخزون</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              عند الاعتماد، سيتم تحديث أرصدة الورشة بالوزن الصافي وقيد إجمالي الأجور، وإضافة الأصناف للمخزون جاهزة للتوزيع.
            </p>
          </div>

          <div className="space-y-2">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/10 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  جاري اعتماد السند...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  اعتماد السند وتحديث المخزون
                </>
              )}
            </button>
            <button 
              onClick={() => {
                if (confirm('هل تريد مسح الحقول وبدء إيصال جديد؟')) {
                  setItems([]);
                  addItem();
                }
              }}
              className="w-full border border-slate-200 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              إعادة تعيين النموذج
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
