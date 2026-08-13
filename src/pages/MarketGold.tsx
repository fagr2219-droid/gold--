import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { calculateMarketGoldMetrics, ShopMarketGoldDetail } from '../lib/accounting';
import { formatCurrency, formatWeight, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { MobileFilterSheet } from '../components/ui/MobileFilterSheet';
import { 
  Scale, 
  Store, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Printer, 
  Eye, 
  ShieldCheck, 
  Coins, 
  RefreshCw, 
  X,
  Phone,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import { Karat, Transaction } from '../types';

export default function MarketGold() {
  const { shops, transactions, loading } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKarat, setSelectedKarat] = useState<Karat | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'NORMAL' | 'FOLLOW_UP' | 'OVERDUE'>('ALL');
  const [onlyWithGold, setOnlyWithGold] = useState(true);

  // Mobile Filter Sheet Open state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Selected shop for Gold Statement modal
  const [statementShop, setStatementShop] = useState<ShopMarketGoldDetail | null>(null);
  // Safe Client View Modal
  const [safeViewShop, setSafeViewShop] = useState<ShopMarketGoldDetail | null>(null);

  const metrics = useMemo(() => {
    return calculateMarketGoldMetrics(shops, transactions, 21);
  }, [shops, transactions]);

  const filteredShops = useMemo(() => {
    return metrics.shopDetails.filter((s) => {
      if (onlyWithGold && s.netRemainingTotalRaw <= 0.001) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = s.shopName.toLowerCase().includes(q);
        const matchPhone = s.phone?.toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
      if (selectedKarat !== 'ALL') {
        const remainingForKarat = s.totalRemainingByKarat[selectedKarat] || 0;
        if (remainingForKarat <= 0.001) return false;
      }
      return true;
    });
  }, [metrics.shopDetails, searchQuery, selectedStatus, selectedKarat, onlyWithGold]);

  // Count active filters for badge
  const activeFiltersCount = (selectedKarat !== 'ALL' ? 1 : 0) + (selectedStatus !== 'ALL' ? 1 : 0) + (!onlyWithGold ? 1 : 0);

  const resetFilters = () => {
    setSelectedKarat('ALL');
    setSelectedStatus('ALL');
    setOnlyWithGold(true);
    setSearchQuery('');
  };

  if (loading) {
    return <div className="p-12 text-center text-[#667085] font-bold text-sm">جاري تحميل بيانات ذهب السوق...</div>;
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-6">
      {/* Header */}
      <div className="card-base p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7E5] text-[#C88918] flex items-center justify-center font-bold shrink-0 border border-[#E49A0A]/30">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F1B33]">ذهب السوق</h1>
            <p className="text-[#667085] text-xs mt-0.5">
              متابعة أوزان الذهب المستحقة لدى المحلات بالجرام الصافي لكل عيار بشكل مستقل عن الأجور.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button 
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial btn-navy text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة تقرير ذهب السوق</span>
          </button>
        </div>
      </div>

      {/* Top Main KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Outstanding Gold by Karat (Main Hero Card) */}
        <div className="lg:col-span-2 card-prominent p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-[#C88918] uppercase tracking-wider block">
                ذهب السوق المستحق
              </span>
              <span className="text-[11px] text-slate-600">
                صافي الذمة الذهبية غير المسواة
              </span>
            </div>
            <div className="text-left bg-[#E49A0A] text-[#091225] font-black px-3 py-1.5 rounded-xl shadow-xs">
              <div className="text-[10px] font-medium leading-none">إجمالي مكافئ عيار 21</div>
              <div className="text-lg sm:text-xl font-mono font-black" dir="ltr">
                {formatWeight(metrics.totalEquivalentReferenceKarat)} <small className="text-xs">جم</small>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#E49A0A]/30">
            {([18, 21, 22, 24] as Karat[]).map((k) => {
              const weight = metrics.outstandingByKarat[k] || 0;
              return (
                <div key={k} className="bg-white/90 border border-[#E49A0A]/30 rounded-xl p-2 sm:p-2.5 text-center shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-600">عيار {k}</div>
                  <div className="text-sm sm:text-base font-mono font-black text-[#091225] mt-0.5" dir="ltr">
                    {formatWeight(weight)}
                  </div>
                  <div className="text-[9px] text-slate-400">جرام</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Market Exposure & Aging */}
        <div className="card-base p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center text-[#667085] text-xs font-bold mb-1">
              <span>المحلات الملتزمة بالذهب</span>
              <Store className="w-4 h-4 text-[#2864DC]" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#0F1B33]">
              {metrics.shopsWithGoldCount} <small className="text-xs font-normal text-[#667085]">محل</small>
            </div>
            <p className="text-[11px] text-[#667085] mt-1 line-clamp-1">
              عملاء في ذمتهم أرصدة ذهب حالية
            </p>
          </div>

          <div className="pt-2 border-t border-[#DDE4EC] flex items-center justify-between text-xs font-bold">
            <span className="text-[#667085] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D64545]" />
              أرصدة متأخرة (&gt;60 يوم):
            </span>
            <span className="font-mono text-[#D64545] bg-[#FFF0F0] px-2 py-0.5 rounded-lg border border-red-200">
              {metrics.overdueGoldCount} محلات
            </span>
          </div>
        </div>

        {/* Collections Timeframes */}
        <div className="card-base p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center text-[#667085] text-xs font-bold mb-1">
              <span>المحصل والمسترد</span>
              <Coins className="w-4 h-4 text-[#07875F]" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#07875F]" dir="ltr">
              {formatWeight(metrics.goldCollectedToday)} <small className="text-xs font-normal">جم اليوم</small>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-[#DDE4EC] text-[11px]">
            <div className="flex justify-between text-[#667085]">
              <span>خلال الأسبوع:</span>
              <span className="font-mono font-bold text-[#101828]">{formatWeight(metrics.goldCollectedThisWeek)} جم</span>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>خلال الشهر:</span>
              <span className="font-mono font-bold text-[#101828]">{formatWeight(metrics.goldCollectedThisMonth)} جم</span>
            </div>
          </div>
        </div>
      </div>

      {/* Macro Accounting Movement Flow */}
      <div className="card-base p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#DDE4EC] pb-2.5">
          <div>
            <h3 className="font-bold text-sm text-[#101828] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E49A0A]" />
              معادلة وتدفق ذهب السوق
            </h3>
            <p className="text-xs text-[#667085]">
              الذهب المستحق = الموزع - المرتجع - الكسر المستلم - التسوية النقدية
            </p>
          </div>
          <span className="text-[10px] bg-[#EEF4FF] text-[#2864DC] border border-blue-200 px-2.5 py-1 rounded-full font-bold">
            دفتر الأستاذ المعتمد
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {/* 1. Distributed */}
          <div className="bg-[#EEF4FF] border border-blue-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#2864DC]">
              <span>1. ذهب خرج للتوزيع</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-mono font-bold text-blue-950" dir="ltr">
              {formatWeight(
                ([18, 21, 22, 24] as Karat[]).reduce((s, k) => s + (metrics.marketByKarat[k]?.distributed || 0), 0)
              )} <small className="text-[10px]">جم</small>
            </div>
            <p className="text-[10px] text-blue-700/80 line-clamp-1">إجمالي البضاعة الموزعة</p>
          </div>

          {/* 2. Returned Goods */}
          <div className="bg-[#F5F3FF] border border-purple-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#7C3AED]">
              <span>2. بضاعة مرتجعة</span>
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-mono font-bold text-purple-950" dir="ltr">
              {formatWeight(
                ([18, 21, 22, 24] as Karat[]).reduce((s, k) => s + (metrics.marketByKarat[k]?.returned || 0), 0)
              )} <small className="text-[10px]">جم</small>
            </div>
            <p className="text-[10px] text-purple-700/80 line-clamp-1">عادت للمخزن وخفضت المديونية</p>
          </div>

          {/* 3. Scrap Received */}
          <div className="bg-[#EAFBF4] border border-emerald-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#07875F]">
              <span>3. كسر مستلم</span>
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-mono font-bold text-emerald-950" dir="ltr">
              {formatWeight(
                ([18, 21, 22, 24] as Karat[]).reduce((s, k) => s + (metrics.marketByKarat[k]?.scrapReceived || 0), 0)
              )} <small className="text-[10px]">جم</small>
            </div>
            <p className="text-[10px] text-emerald-700/80 line-clamp-1">ذهب كسر في الخزينة</p>
          </div>

          {/* 4. Cash Settled */}
          <div className="bg-[#FFF7E5] border border-amber-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#C88918]">
              <span>4. تسوية نقدية</span>
              <Coins className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-mono font-bold text-amber-950" dir="ltr">
              {formatWeight(
                ([18, 21, 22, 24] as Karat[]).reduce((s, k) => s + (metrics.marketByKarat[k]?.cashSettled || 0), 0)
              )} <small className="text-[10px]">جم</small>
            </div>
            <p className="text-[10px] text-amber-700/80 line-clamp-1">نقد مقابل ذهب (لا يضاف للكسر)</p>
          </div>

          {/* 5. Remaining Market Gold */}
          <div className="col-span-2 md:col-span-1 bg-[#E49A0A] text-[#091225] rounded-xl p-3 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>5. المتبقي في السوق</span>
              <Scale className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-mono font-black" dir="ltr">
              {formatWeight(metrics.totalEquivalentReferenceKarat)} <small className="text-[10px]">جم (21)</small>
            </div>
            <p className="text-[10px] font-medium line-clamp-1">صافي الذهب المستحق</p>
          </div>
        </div>
      </div>

      {/* Main Filter & Content Section */}
      <div className="card-base overflow-hidden space-y-0">
        {/* Filters bar */}
        <div className="p-3.5 sm:p-4 border-b border-[#DDE4EC] bg-slate-50/70 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#667085]" />
            <input 
              type="text"
              placeholder="البحث باسم المحل أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-[#DDE4EC] text-xs bg-white focus:outline-none focus:border-[#C88918] focus:ring-1 focus:ring-[#C88918]"
            />
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            {/* Karat Filter */}
            <div className="flex items-center gap-1 bg-white border border-[#DDE4EC] rounded-xl p-1 text-xs">
              <span className="text-[10px] text-[#667085] font-bold px-1.5">العيار:</span>
              <button
                onClick={() => setSelectedKarat('ALL')}
                className={cn("px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer", selectedKarat === 'ALL' ? "bg-[#0F1B33] text-white" : "text-slate-600 hover:bg-slate-100")}
              >
                الكل
              </button>
              {([18, 21, 22, 24] as Karat[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKarat(k)}
                  className={cn("px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer", selectedKarat === k ? "bg-[#E49A0A] text-[#091225]" : "text-slate-600 hover:bg-slate-100")}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-white border border-[#DDE4EC] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="NORMAL">طبيعي (&lt; 30 يوم)</option>
              <option value="FOLLOW_UP">يحتاج متابعة (30-60 يوم)</option>
              <option value="OVERDUE">متأخر (&gt; 60 يوم)</option>
            </select>

            {/* Only With Gold Toggle */}
            <label className="flex items-center gap-1.5 bg-white border border-[#DDE4EC] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={onlyWithGold} 
                onChange={(e) => setOnlyWithGold(e.target.checked)}
                className="rounded text-[#C88918] focus:ring-[#C88918] w-3.5 h-3.5 cursor-pointer"
              />
              <span className="font-bold">المدينِة فقط</span>
            </label>
          </div>

          {/* Mobile Filter Button (Triggers Bottom Sheet) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl border border-[#DDE4EC] bg-white text-xs font-bold text-slate-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Filter className="w-4 h-4 text-[#C88918]" />
              <span>تصفية الفلاتر</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#E49A0A] text-[#091225] font-black text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600"
              >
                إلغاء الفلترة
              </button>
            )}
          </div>
        </div>

        {/* Desktop Detailed Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#F3F6FA] border-b border-[#DDE4EC] text-[#667085] font-bold">
                <th className="p-3.5">اسم المحل وبياناته</th>
                <th className="p-3.5 text-center">الرصيد حسب العيار (جم)</th>
                <th className="p-3.5 text-center">إجمالي الموزع</th>
                <th className="p-3.5 text-center">مرتجع بضاعة</th>
                <th className="p-3.5 text-center">كسر مستلم</th>
                <th className="p-3.5 text-center">تسوية نقدية</th>
                <th className="p-3.5 text-center font-bold text-[#091225] bg-[#FFF7E5]">المتبقي على المحل</th>
                <th className="p-3.5 text-center">أيام بالسوق</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE4EC]">
              {filteredShops.map((shop) => (
                <tr key={shop.shopId} className="hover:bg-slate-50/70 transition-colors">
                  {/* Shop info */}
                  <td className="p-3.5">
                    <div className="font-bold text-[#101828] text-sm">{shop.shopName}</div>
                    <div className="text-[11px] text-[#667085] flex items-center gap-2 mt-0.5">
                      {shop.phone && <span>هاتف: {shop.phone}</span>}
                    </div>
                  </td>

                  {/* Per Karat breakdown */}
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-1 font-mono text-[11px]">
                      {([18, 21, 22, 24] as Karat[]).map((k) => {
                        const w = shop.totalRemainingByKarat[k] || 0;
                        return (
                          <span 
                            key={k} 
                            className={cn(
                              "px-1.5 py-0.5 rounded-lg border text-[10px]",
                              w > 0 ? "bg-[#FFF7E5] border-amber-200 text-amber-950 font-bold" : "bg-slate-50 border-slate-100 text-slate-300"
                            )}
                          >
                            ع{k}: {formatWeight(w)}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* Distributed */}
                  <td className="p-3.5 text-center font-mono font-bold text-[#2864DC]">
                    {shop.totalDistributed > 0 ? `${formatWeight(shop.totalDistributed)} جم` : '---'}
                  </td>

                  {/* Returned */}
                  <td className="p-3.5 text-center font-mono font-bold text-[#7C3AED]">
                    {shop.totalReturned > 0 ? `${formatWeight(shop.totalReturned)} جم` : '---'}
                  </td>

                  {/* Scrap */}
                  <td className="p-3.5 text-center font-mono font-bold text-[#07875F]">
                    {shop.totalScrapReceived > 0 ? `${formatWeight(shop.totalScrapReceived)} جم` : '---'}
                  </td>

                  {/* Cash Settled */}
                  <td className="p-3.5 text-center font-mono font-bold text-[#C88918]">
                    {shop.totalCashSettled > 0 ? `${formatWeight(shop.totalCashSettled)} جم` : '---'}
                  </td>

                  {/* Net Remaining Balance */}
                  <td className="p-3.5 text-center bg-[#FFF7E5]">
                    <div className="font-mono font-black text-[#091225] text-sm" dir="ltr">
                      {formatWeight(shop.totalRemainingEquivalent21)} <small className="text-[10px]">جم</small>
                    </div>
                    <div className="text-[9px] text-[#C88918] font-bold">(مكافئ عيار 21)</div>
                  </td>

                  {/* Days in market */}
                  <td className="p-3.5 text-center font-mono font-bold text-[#101828]">
                    {shop.daysInMarket > 0 ? `${shop.daysInMarket} يوم` : '---'}
                  </td>

                  {/* Status Badge */}
                  <td className="p-3.5 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                      shop.status === 'OVERDUE' ? "bg-[#FFF0F0] text-[#D64545] border-red-200" :
                      shop.status === 'FOLLOW_UP' ? "bg-[#FFF7E5] text-[#C88918] border-amber-200" :
                      "bg-[#EAFBF4] text-[#07875F] border-emerald-200"
                    )}>
                      {shop.status === 'OVERDUE' ? 'متأخر' : shop.status === 'FOLLOW_UP' ? 'متابعة' : 'طبيعي'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setStatementShop(shop)}
                        className="bg-[#FFF7E5] text-[#091225] border border-[#E49A0A]/40 hover:bg-[#FFEEC2] px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                        title="كشف حركة الذهب التفصيلي"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#C88918]" />
                        كشف الذهب
                      </button>
                      <button
                        onClick={() => setSafeViewShop(shop)}
                        className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                        title="العرض الآمن لصاحب المحل"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        عرض آمن
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredShops.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#667085] font-medium">
                    لا توجد محلات تطابق شروط الفلتر المحددة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Shop Cards (Complete UX instead of horizontal scrolling) */}
        <div className="md:hidden divide-y divide-[#DDE4EC]">
          {filteredShops.map((shop) => (
            <div key={shop.shopId} className="p-4 space-y-3">
              {/* Top Row: Shop name, phone, status */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-bold text-sm text-[#101828]">{shop.shopName}</h4>
                  {shop.phone && (
                    <div className="text-[11px] text-[#667085] flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="w-3 h-3 text-[#C88918]" />
                      <span>{shop.phone}</span>
                    </div>
                  )}
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0",
                  shop.status === 'OVERDUE' ? "bg-[#FFF0F0] text-[#D64545] border-red-200" :
                  shop.status === 'FOLLOW_UP' ? "bg-[#FFF7E5] text-[#C88918] border-amber-200" :
                  "bg-[#EAFBF4] text-[#07875F] border-emerald-200"
                )}>
                  {shop.status === 'OVERDUE' ? 'متأخر' : shop.status === 'FOLLOW_UP' ? 'متابعة' : 'طبيعي'}
                  <span className="text-slate-400 font-normal mr-1">({shop.daysInMarket} يوم)</span>
                </span>
              </div>

              {/* Main Metric Box: Remaining Gold */}
              <div className="bg-[#FFF7E5] border border-[#E49A0A]/40 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-[#C88918] block">صافي الذهب المتبقي</span>
                  <span className="text-xs text-slate-500 font-medium">(مكافئ عيار 21)</span>
                </div>
                <div className="text-lg font-mono font-black text-[#091225]" dir="ltr">
                  {formatWeight(shop.totalRemainingEquivalent21)} <small className="text-xs font-bold text-[#C88918]">جم</small>
                </div>
              </div>

              {/* Karats Breakdown Pills */}
              <div className="grid grid-cols-4 gap-1 font-mono text-center">
                {([18, 21, 22, 24] as Karat[]).map((k) => {
                  const w = shop.totalRemainingByKarat[k] || 0;
                  return (
                    <div key={k} className={cn(
                      "py-1 rounded-lg border text-[10px]",
                      w > 0 ? "bg-white border-amber-200 font-bold text-[#091225]" : "bg-slate-50 border-slate-100 text-slate-300"
                    )}>
                      <div className="text-[9px] text-slate-400">ع{k}</div>
                      <div>{formatWeight(w)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStatementShop(shop)}
                  className="flex-1 py-2 rounded-xl bg-[#0F1B33] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#E49A0A]" />
                  <span>كشف الذهب</span>
                </button>
                <button
                  onClick={() => setSafeViewShop(shop)}
                  className="py-2 px-3 rounded-xl border border-[#DDE4EC] bg-white text-slate-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>عرض آمن</span>
                </button>
              </div>
            </div>
          ))}

          {filteredShops.length === 0 && (
            <div className="p-8 text-center text-[#667085] text-xs font-medium">
              لا توجد محلات تطابق شروط الفلتر.
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
        title="تصفية محلات ذهب السوق"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">تصفية حسب العيار</label>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => setSelectedKarat('ALL')}
                className={cn(
                  "py-2 rounded-xl text-xs font-bold border transition-colors",
                  selectedKarat === 'ALL' ? "bg-[#0F1B33] text-white border-[#0F1B33]" : "bg-white text-slate-700 border-[#DDE4EC]"
                )}
              >
                الكل
              </button>
              {([18, 21, 22, 24] as Karat[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKarat(k)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-bold border transition-colors",
                    selectedKarat === k ? "bg-[#E49A0A] text-[#091225] border-[#E49A0A]" : "bg-white text-slate-700 border-[#DDE4EC]"
                  )}
                >
                  ع{k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">حالة المديونية والمدة</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full bg-white border border-[#DDE4EC] rounded-xl p-2.5 text-xs text-slate-800 font-bold"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="NORMAL">طبيعي (&lt; 30 يوم)</option>
              <option value="FOLLOW_UP">يحتاج متابعة (30-60 يوم)</option>
              <option value="OVERDUE">متأخر (&gt; 60 يوم)</option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#DDE4EC] bg-slate-50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={onlyWithGold} 
              onChange={(e) => setOnlyWithGold(e.target.checked)}
              className="rounded text-[#C88918] focus:ring-[#C88918] w-4 h-4"
            />
            <span className="text-xs font-bold text-slate-800">عرض المحلات التي في ذمتها ذهب فقط</span>
          </label>
        </div>
      </MobileFilterSheet>

      {/* Modal 1: Comprehensive Shop Gold Movement Statement */}
      {statementShop && (
        <ShopGoldStatementModal 
          shopDetail={statementShop}
          allTransactions={transactions}
          onClose={() => setStatementShop(null)}
        />
      )}

      {/* Modal 2: Safe Shopkeeper View */}
      {safeViewShop && (
        <SafeShopkeeperModal
          shopDetail={safeViewShop}
          allTransactions={transactions}
          onClose={() => setSafeViewShop(null)}
        />
      )}
    </div>
  );
}

/**
 * Modal: كشف حركة الذهب الكامل للمحل مع إشارات الحركة (+ / -)
 */
function ShopGoldStatementModal({ 
  shopDetail, 
  allTransactions, 
  onClose 
}: { 
  shopDetail: ShopMarketGoldDetail; 
  allTransactions: Transaction[]; 
  onClose: () => void; 
}) {
  const shopTxs = useMemo(() => {
    return allTransactions
      .filter(t => t.entityId === shopDetail.shopId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allTransactions, shopDetail.shopId]);

  return (
    <Modal
      isOpen={Boolean(shopDetail)}
      onClose={onClose}
      title={`كشف حركة الذهب: ${shopDetail.shopName}`}
      subtitle={shopDetail.phone ? `هاتف: ${shopDetail.phone}` : 'بيان تفصيلي بالأرصدة والحركات'}
      icon={<Scale className="w-5 h-5 text-[#C88918]" />}
      maxWidth="4xl"
      actions={
        <div className="flex w-full justify-between items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-navy text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            طباعة الكشف
          </button>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Prominent Card: الذهب المتبقي علينا استلامه من هذا المحل */}
        <div className="card-prominent p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="text-xs font-bold text-[#C88918] uppercase tracking-wider block">
                الذهب المتبقي في ذمة المحل
              </span>
              <span className="text-[11px] text-slate-600">
                صافي الذهب المستحق لكل عيار بشكل منفصل
              </span>
            </div>
            <div className="bg-[#E49A0A] text-[#091225] font-black px-3 py-1.5 rounded-xl shadow-xs">
              <div className="text-[10px] leading-none">إجمالي مكافئ عيار 21</div>
              <div className="text-lg font-mono font-black" dir="ltr">
                {formatWeight(shopDetail.totalRemainingEquivalent21)} <small className="text-xs">جم</small>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E49A0A]/30">
            {([18, 21, 22, 24] as Karat[]).map((k) => {
              const weight = shopDetail.totalRemainingByKarat[k] || 0;
              return (
                <div key={k} className="bg-white border border-[#E49A0A]/30 rounded-xl p-2.5 text-center shadow-2xs">
                  <div className="text-xs font-bold text-slate-700">عيار {k}</div>
                  <div className="text-base font-mono font-bold text-[#091225] mt-0.5" dir="ltr">
                    {formatWeight(weight)} <small className="text-xs">جم</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Movements History */}
        <div className="card-base overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-[#DDE4EC] font-bold text-xs text-slate-800">
            سجل الحركات الزمنية للذهب
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F3F6FA] border-b border-[#DDE4EC] text-[#667085] font-bold">
                <tr>
                  <th className="p-3">التاريخ والبيان</th>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3 text-center">العيار</th>
                  <th className="p-3 text-center">تأثير الحركة</th>
                  <th className="p-3 text-center">المستند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE4EC]">
                {shopTxs.map((tx) => {
                  const isDist = tx.type === 'DISTRIBUTE_TO_SHOP';
                  const isReturn = tx.type === 'RETURN_FROM_SHOP';
                  const isCollect = tx.type === 'COLLECT_FROM_SHOP';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="p-3">
                        <div className="font-mono text-slate-700">
                          {new Date(tx.date).toLocaleDateString('ar-EG')}
                        </div>
                        <div className="text-[10px] text-[#667085]">
                          {tx.notes || (isDist ? 'توزيع بضاعة معتمدة' : isReturn ? 'إرجاع بضاعة للمخزن' : 'سند تحصيل وقبض')}
                        </div>
                      </td>

                      <td className="p-3 font-bold text-[#101828]">
                        {isDist && <span className="text-[#2864DC]">توزيع بضاعة للمحل</span>}
                        {isReturn && <span className="text-[#7C3AED]">مرتجع بضاعة</span>}
                        {isCollect && <span className="text-[#C88918]">سند تحصيل وقبض</span>}
                      </td>

                      <td className="p-3 text-center font-mono">
                        {isDist && tx.items?.map((item, i) => (
                          <span key={i} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1">
                            ع{item.karat}
                          </span>
                        ))}
                        {isReturn && tx.items?.map((item, i) => (
                          <span key={i} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1">
                            ع{item.karat}
                          </span>
                        ))}
                        {isCollect && tx.collectionItems?.map((item, i) => (
                          <span key={i} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1">
                            ع{item.dueKarat || 21}
                          </span>
                        ))}
                      </td>

                      <td className="p-3 text-center">
                        {isDist && tx.items && (
                          <span className="font-mono font-bold text-[#2864DC] bg-[#EEF4FF] px-2 py-0.5 rounded-lg text-xs">
                            +{formatWeight(tx.items.reduce((s, i) => s + i.netWeight, 0))} جم
                          </span>
                        )}
                        {isReturn && tx.items && (
                          <span className="font-mono font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-lg text-xs">
                            -{formatWeight(tx.items.reduce((s, i) => s + (i.actualReturnedWeight || i.netWeight), 0))} جم
                          </span>
                        )}
                        {isCollect && tx.collectionItems && (
                          <div className="space-y-1">
                            {tx.collectionItems.map((item, idx) => {
                              if (item.type === 'SCRAP_GOLD') {
                                const w = item.certifiedEquivalentWeight !== undefined ? item.certifiedEquivalentWeight : (item.actualScrapWeight || 0);
                                return (
                                  <div key={idx} className="font-mono font-bold text-[#07875F] bg-[#EAFBF4] px-2 py-0.5 rounded-lg text-[11px]">
                                    -{formatWeight(w)} جم كسر
                                  </div>
                                );
                              }
                              if (item.type === 'CASH_GOLD_SETTLEMENT') {
                                return (
                                  <div key={idx} className="font-mono font-bold text-[#C88918] bg-[#FFF7E5] px-2 py-0.5 rounded-lg text-[11px]">
                                    -{formatWeight(item.settledGoldWeight || 0)} جم تسوية
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center font-mono text-[10px] text-slate-500">
                        {tx.workshopDocNo || tx.referenceId || tx.id.slice(0, 8)}
                      </td>
                    </tr>
                  );
                })}

                {shopTxs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#667085]">
                      لا توجد حركات مسجلة لهذا المحل.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Modal: العرض الآمن لصاحب المحل
 */
function SafeShopkeeperModal({ 
  shopDetail, 
  allTransactions, 
  onClose 
}: { 
  shopDetail: ShopMarketGoldDetail; 
  allTransactions: Transaction[]; 
  onClose: () => void; 
}) {
  const shopTxs = useMemo(() => {
    return allTransactions
      .filter(t => t.entityId === shopDetail.shopId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, shopDetail.shopId]);

  return (
    <Modal
      isOpen={Boolean(shopDetail)}
      onClose={onClose}
      title={`كشف حساب العميل: ${shopDetail.shopName}`}
      subtitle="بيان الأرصدة والتعاملات الخاصة بالمحل فقط"
      icon={<ShieldCheck className="w-5 h-5 text-[#07875F]" />}
      maxWidth="3xl"
      actions={
        <div className="flex w-full justify-between items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-navy text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            طباعة سند العميل
          </button>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Dual Balances (Gold & Labor) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Gold Balance */}
          <div className="bg-[#FFF7E5] border border-[#E49A0A]/40 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#C88918]">رصيد الذهب المستحق</span>
              <Scale className="w-4 h-4 text-[#C88918]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([18, 21, 22, 24] as Karat[]).map((k) => (
                <div key={k} className="bg-white p-2 rounded-xl border border-amber-200/60 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">ع{k}:</span>
                  <span className="font-mono font-black text-[#091225]">
                    {formatWeight(shopDetail.totalRemainingByKarat[k] || 0)} جم
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center text-xs">
              <span className="text-slate-600 font-bold">المكافئ الإجمالي (عيار 21):</span>
              <span className="font-mono font-black text-[#091225] text-sm">
                {formatWeight(shopDetail.totalRemainingEquivalent21)} جم
              </span>
            </div>
          </div>

          {/* Labor Balance */}
          <div className="bg-[#EEF4FF] border border-blue-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#2864DC]">رصيد الأجور المستحقة</span>
              <Coins className="w-4 h-4 text-[#2864DC]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#0F1B33]">
              {formatCurrency(shopDetail.laborBalance)} <small className="text-xs font-normal">ر.ي</small>
            </div>
            <p className="text-[11px] text-blue-700/80 pt-2 border-t border-blue-200">
              مديونية أجور التصنيع والتوزيع المستحقة نقدياً
            </p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="card-base overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-[#DDE4EC] font-bold text-xs text-slate-800">
            سجل العمليات المعتمدة
          </div>
          <div className="divide-y divide-[#DDE4EC] max-h-60 overflow-y-auto">
            {shopTxs.map((tx) => (
              <div key={tx.id} className="p-3 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-[#101828]">
                    {tx.type === 'DISTRIBUTE_TO_SHOP' ? 'استلام بضاعة' :
                     tx.type === 'RETURN_FROM_SHOP' ? 'إرجاع بضاعة' : 'سند سداد وتحصيل'}
                  </div>
                  <div className="text-[10px] text-[#667085] font-mono">
                    {new Date(tx.date).toLocaleDateString('ar-EG')}
                  </div>
                </div>
                <div className="text-left font-mono font-bold">
                  {tx.type === 'DISTRIBUTE_TO_SHOP' && (
                    <span className="text-[#2864DC]">+{formatWeight(tx.items?.reduce((s, i) => s + i.netWeight, 0) || 0)} جم</span>
                  )}
                  {tx.type === 'RETURN_FROM_SHOP' && (
                    <span className="text-[#7C3AED]">-{formatWeight(tx.items?.reduce((s, i) => s + (i.actualReturnedWeight || i.netWeight), 0) || 0)} جم</span>
                  )}
                  {tx.type === 'COLLECT_FROM_SHOP' && (
                    <span className="text-[#07875F]">سند تحصيل معتمد</span>
                  )}
                </div>
              </div>
            ))}
            {shopTxs.length === 0 && (
              <div className="p-6 text-center text-[#667085] text-xs">
                لا توجد حركات مسجلة.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
