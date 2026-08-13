import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/useAppStore';
import { formatWeight, formatCurrency, formatApprox, cn } from '../lib/utils';
import { computeBatchStatus } from '../lib/accounting';
import { MetricCard } from '../components/ui/MetricCard';
import { MobileFilterSheet } from '../components/ui/MobileFilterSheet';
import { 
  Package, 
  Search, 
  Filter, 
  Layers, 
  FileText, 
  PieChart, 
  Undo2, 
  Truck,
  PlusCircle,
  Tag
} from 'lucide-react';
import { Karat } from '../types';

export default function Inventory() {
  const navigate = useNavigate();
  const { inventory, workshops } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKarat, setSelectedKarat] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'PARTIAL' | 'EXHAUSTED'>('ALL');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filteredItems = inventory.filter(item => {
    const originalWeight = item.originalNetWeight || item.netWeight || 0;
    const distributed = item.distributedWeight || 0;
    const returned = item.returnedWeight || 0;
    const returnedToWs = item.returnedToWorkshopWeight || 0;
    const available = item.availableWeight !== undefined ? item.availableWeight : Math.max(0, originalWeight - distributed + returned - returnedToWs);

    const matchesSearch = 
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.modelCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.workshopDocNo || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKarat = selectedKarat === 'ALL' || item.karat.toString() === selectedKarat;

    let matchesStatus = true;
    if (statusFilter === 'AVAILABLE') {
      matchesStatus = available > 0.001;
    } else if (statusFilter === 'PARTIAL') {
      matchesStatus = distributed > 0.001 && available > 0.001;
    } else if (statusFilter === 'EXHAUSTED') {
      matchesStatus = available <= 0.001;
    }

    return matchesSearch && matchesKarat && matchesStatus;
  });

  const totalOriginalNet = inventory.reduce((s, i) => s + (i.originalNetWeight || i.netWeight || 0), 0);
  const totalDistributedNet = inventory.reduce((s, i) => s + (i.distributedWeight || 0), 0);
  const totalAvailableNet = inventory.reduce((s, i) => s + (i.availableWeight !== undefined ? i.availableWeight : i.netWeight || 0), 0);

  const activeFiltersCount = (selectedKarat !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0);

  const resetFilters = () => {
    setSelectedKarat('ALL');
    setStatusFilter('ALL');
    setSearchTerm('');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-4">
      {/* Header */}
      <div className="card-base p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7E5] text-[#C88918] flex items-center justify-center font-bold shrink-0 border border-[#E49A0A]/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F1B33]">ذهب المخزون والدفعات</h1>
            <p className="text-[#667085] text-xs mt-0.5">
              متابعة دقيقة لأوزان الدفعات المستلمة، الكميات الموزعة، والرصيد الفعلي المتاح للتوزيع بالخزينة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button 
            onClick={() => navigate('/receive-workshop')}
            className="btn-gold flex-1 sm:flex-initial text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>استلام دفعة جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <MetricCard
          level="prominent"
          title="صافي الذهب المتاح للتوزيع"
          value={formatWeight(totalAvailableNet)}
          unit="جم صافي"
          subValue="الذهب الجاهز المتواجد بالخزينة"
          icon={<Package className="w-5 h-5 text-[#C88918]" />}
          colorType="gold"
        />

        <MetricCard
          level="standard"
          title="الذهب الموزع للمحلات"
          value={formatWeight(totalDistributedNet)}
          unit="جم موزع"
          subValue="بضاعة خرجت للسوق"
          icon={<PieChart className="w-5 h-5 text-[#2864DC]" />}
          colorType="blue"
        />

        <MetricCard
          level="standard"
          title="إجمالي الدفعات المستلمة"
          value={formatWeight(totalOriginalNet)}
          unit="جم أصلي"
          subValue="إجمالي استلامات الورش"
          icon={<Layers className="w-5 h-5 text-[#0F1B33]" />}
          colorType="navy"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="card-base p-3.5 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] w-4 h-4" />
          <input 
            className="w-full bg-white border border-[#DDE4EC] rounded-xl py-2 pr-9 pl-3 text-xs font-bold text-[#101828] outline-none focus:border-[#C88918] focus:ring-1 focus:ring-[#C88918]" 
            placeholder="بحث بالفئة، كود الموديل، أو رقم سند الورشة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-2">
          <select 
            className="bg-white border border-[#DDE4EC] rounded-xl py-2 px-3 text-xs font-bold text-[#101828] outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">جميع الحالات</option>
            <option value="AVAILABLE">المتاح فقط</option>
            <option value="PARTIAL">الموزع جزئياً</option>
            <option value="EXHAUSTED">المكتمل توزيعه</option>
          </select>

          <select 
            className="bg-white border border-[#DDE4EC] rounded-xl py-2 px-3 text-xs font-bold text-[#101828] outline-none cursor-pointer"
            value={selectedKarat}
            onChange={(e) => setSelectedKarat(e.target.value)}
          >
            <option value="ALL">جميع العيارات</option>
            <option value="18">عيار 18</option>
            <option value="21">عيار 21</option>
            <option value="22">عيار 22</option>
            <option value="24">عيار 24</option>
          </select>
        </div>

        {/* Mobile Filter Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="flex-1 py-2 px-3 rounded-xl border border-[#DDE4EC] bg-white text-xs font-bold text-slate-800 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Filter className="w-4 h-4 text-[#C88918]" />
            <span>تصفية الدفعات</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#E49A0A] text-[#091225] font-black text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Batches Table & Mobile Cards */}
      <div className="card-base overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-[#F3F6FA] text-[#667085] font-bold border-b border-[#DDE4EC]">
              <tr>
                <th className="p-3.5">الفئة والموديل</th>
                <th className="p-3.5 text-center">العيار</th>
                <th className="p-3.5 text-center">الوزن الأصلي</th>
                <th className="p-3.5 text-center">الموزع</th>
                <th className="p-3.5 text-center">مرتجع للورشة</th>
                <th className="p-3.5 text-center text-[#091225] bg-[#FFF7E5]">الوزن المتاح</th>
                <th className="p-3.5 text-center">القطع</th>
                <th className="p-3.5">الورشة والسند</th>
                <th className="p-3.5 text-center">أجرة الورشة</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE4EC]">
              {filteredItems.map(item => {
                const workshop = workshops.find(w => w.id === item.workshopId);
                const originalWeight = item.originalNetWeight || item.netWeight || 0;
                const distributed = item.distributedWeight || 0;
                const returned = item.returnedWeight || 0;
                const returnedToWs = item.returnedToWorkshopWeight || 0;
                const available = item.availableWeight !== undefined ? item.availableWeight : Math.max(0, originalWeight - distributed + returned - returnedToWs);
                const derivedWage = item.derivedWorkshopWagePerGram || 0;

                const statusInfo = computeBatchStatus({
                  originalNetWeight: originalWeight,
                  netWeight: item.netWeight,
                  distributedWeight: distributed,
                  returnedWeight: returned,
                  returnedToWorkshopWeight: returnedToWs,
                  availableWeight: available,
                });

                const canReturn = available > 0.001;

                return (
                  <tr key={item.id} className={cn("transition-colors", available <= 0.001 ? "bg-slate-50/70 opacity-60" : "hover:bg-slate-50/60")}>
                    <td className="p-3.5">
                      <div className="font-bold text-[#101828] text-sm">{item.category}</div>
                      <div className="font-mono text-[11px] text-[#667085]">{item.modelCode || 'STD'}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-[#FFF7E5] text-[#091225] rounded-lg text-xs font-bold border border-[#E49A0A]/40">
                        ع{item.karat}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-[#667085]">
                      {formatWeight(originalWeight)} جم
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-[#2864DC]">
                      {distributed > 0 ? `${formatWeight(distributed)} جم` : '—'}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-[#7C3AED]">
                      {returnedToWs > 0 ? `${formatWeight(returnedToWs)} جم` : '—'}
                    </td>
                    <td className="p-3.5 text-center font-mono font-black text-[#091225] text-sm bg-[#FFF7E5]">
                      {formatWeight(available)} جم
                    </td>
                    <td className="p-3.5 text-center font-mono text-[#101828]">
                      {item.count !== null && item.count !== undefined 
                        ? `${item.availableCount ?? item.count} / ${item.count}` 
                        : '—'}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#101828]">{workshop?.name || '---'}</div>
                      {item.workshopDocNo && (
                        <div className="font-mono text-[10px] text-[#667085] flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          #{item.workshopDocNo}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-[#C88918]">
                      ~{formatApprox(derivedWage)} <small className="text-[10px] font-normal text-[#667085]">ر.ي/جم</small>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canReturn && (
                          <button
                            onClick={() => navigate(`/workshop-returns?batchId=${item.id}`)}
                            className="py-1 px-2 bg-[#F5F3FF] hover:bg-purple-100 text-[#7C3AED] rounded-lg transition-colors border border-purple-200 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="إرجاع للورشة"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>مرتجع</span>
                          </button>
                        )}
                        {canReturn && (
                          <button
                            onClick={() => navigate('/distribution')}
                            className="py-1 px-2 bg-[#EEF4FF] hover:bg-blue-100 text-[#2864DC] rounded-lg transition-colors border border-blue-200 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="توزيع للمحلات"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>توزيع</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-[#667085]">
                    لا توجد مصوغات أو دفعات مطابقة في المخزون.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Batch Cards */}
        <div className="md:hidden divide-y divide-[#DDE4EC]">
          {filteredItems.map(item => {
            const workshop = workshops.find(w => w.id === item.workshopId);
            const originalWeight = item.originalNetWeight || item.netWeight || 0;
            const distributed = item.distributedWeight || 0;
            const returned = item.returnedWeight || 0;
            const returnedToWs = item.returnedToWorkshopWeight || 0;
            const available = item.availableWeight !== undefined ? item.availableWeight : Math.max(0, originalWeight - distributed + returned - returnedToWs);
            const canReturn = available > 0.001;

            const statusInfo = computeBatchStatus({
              originalNetWeight: originalWeight,
              netWeight: item.netWeight,
              distributedWeight: distributed,
              returnedWeight: returned,
              returnedToWorkshopWeight: returnedToWs,
              availableWeight: available,
            });

            return (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-[#101828]">{item.category}</h4>
                    <div className="text-[11px] text-[#667085] flex items-center gap-2 mt-0.5">
                      <span>الورشة: {workshop?.name || '---'}</span>
                      {item.workshopDocNo && <span className="font-mono">#{item.workshopDocNo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-[#FFF7E5] text-[#091225] rounded-lg text-xs font-bold border border-[#E49A0A]/40">
                      ع{item.karat}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", statusInfo.color)}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <div className="bg-[#FFF7E5] border border-[#E49A0A]/40 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-[#C88918] block">الوزن المتاح للتوزيع</span>
                    <span className="text-xs text-slate-500">من أصل {formatWeight(originalWeight)} جم</span>
                  </div>
                  <div className="text-lg font-mono font-black text-[#091225]" dir="ltr">
                    {formatWeight(available)} <small className="text-xs font-bold text-[#C88918]">جم</small>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  {canReturn && (
                    <button
                      onClick={() => navigate(`/workshop-returns?batchId=${item.id}`)}
                      className="py-2 px-3 bg-[#F5F3FF] hover:bg-purple-100 text-[#7C3AED] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-purple-200 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>مرتجع للورشة</span>
                    </button>
                  )}
                  {canReturn && (
                    <button
                      onClick={() => navigate('/distribution')}
                      className="py-2 px-3 bg-[#EEF4FF] hover:bg-blue-100 text-[#2864DC] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>توزيع لمحل</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-[#667085] text-xs">
              لا توجد دفعات مطابقة في المخزون.
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      <MobileFilterSheet
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        onReset={resetFilters}
        activeCount={activeFiltersCount}
        title="تصفية دفعات المخزون"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">حالة الدفعة</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-white border border-[#DDE4EC] rounded-xl p-2.5 text-xs text-slate-800 font-bold"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="AVAILABLE">المتاح فقط</option>
              <option value="PARTIAL">الموزع جزئياً</option>
              <option value="EXHAUSTED">المكتمل توزيعه</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">العيار</label>
            <select
              value={selectedKarat}
              onChange={(e) => setSelectedKarat(e.target.value)}
              className="w-full bg-white border border-[#DDE4EC] rounded-xl p-2.5 text-xs text-slate-800 font-bold"
            >
              <option value="ALL">جميع العيارات</option>
              <option value="18">عيار 18</option>
              <option value="21">عيار 21</option>
              <option value="22">عيار 22</option>
              <option value="24">عيار 24</option>
            </select>
          </div>
        </div>
      </MobileFilterSheet>
    </div>
  );
}
