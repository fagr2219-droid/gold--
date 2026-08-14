import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/useAppStore';
import { formatCurrency, formatWeight, cn } from '../lib/utils';
import { calculateMarketGoldMetrics } from '../lib/accounting';
import { MetricCard } from '../components/ui/MetricCard';
import { BackupRestoreModal } from '../components/BackupRestoreModal';
import { SeedConfirmModal } from '../components/SeedConfirmModal';
import { VoucherPreviewModal } from '../components/VoucherPreviewModal';
import { useVoucherSettings } from '../lib/useVoucherSettings';
import { buildDistributionVoucherDTO, buildCollectionVoucherDTO, CustomerVoucherDTO } from '../types/voucherTypes';
import { 
  Package, 
  Users, 
  PlusCircle, 
  Scale, 
  ShieldCheck,
  Coins, 
  ArrowDownLeft, 
  RefreshCw, 
  ChevronLeft,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Database,
  RotateCcw,
  FileText
} from 'lucide-react';
import { Karat } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { workshops, shops, inventory, transactions, undoPreDemoSeed, getSnapshots, loading } = useAppStore();
  const { getIdentitySnapshot } = useVoucherSettings();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<{ dto: CustomerVoucherDTO; txId: string } | null>(null);

  const openVoucher = (tx: any) => {
    const identity = getIdentitySnapshot();
    const shop = shops.find(s => s.id === tx.entityId);
    if (!shop) return;
    let dto: CustomerVoucherDTO;
    if (tx.type === 'DISTRIBUTE_TO_SHOP') {
      dto = buildDistributionVoucherDTO(tx, shop, identity);
    } else if (tx.type === 'COLLECT_FROM_SHOP') {
      dto = buildCollectionVoucherDTO(tx, shop, identity);
    } else return;
    setActiveVoucher({ dto, txId: tx.id });
  };

  const snapshots = useMemo(() => getSnapshots(), [getSnapshots]);
  const preDemoSnapshot = snapshots.find(s => s.isPreDemoSeed);

  const metrics = useMemo(() => {
    return calculateMarketGoldMetrics(shops, transactions, 21);
  }, [shops, transactions]);

  const handleQuickUndo = async () => {
    const success = await undoPreDemoSeed();
    if (success) {
      setRestoreSuccess('تم استرجاع بياناتك السابقة بنجاح وبكافة تفاصيلها.');
    } else {
      setShowBackupModal(true);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[#667085] font-bold text-sm">
        جاري تحميل المؤشرات والبيانات...
      </div>
    );
  }

  // 1. Finished Gold Inventory (ذهب المخزون)
  const totalInventoryNetWeight = inventory.reduce(
    (sum, item) => sum + (item.availableWeight !== undefined ? item.availableWeight : (item.netWeight || item.weight || 0)), 
    0
  );
  
  // 5. Outstanding Labor Due from Shops (الأجور المتبقية)
  const totalShopLaborDue = shops.reduce((sum, s) => sum + s.laborBalance, 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-4">
      {/* Pre-Demo Seed Undo Notification Banner */}
      {preDemoSnapshot && (
        <div className="bg-[#FFF7E5] border-2 border-[#E49A0A] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E49A0A] text-[#091225] flex items-center justify-center font-bold shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-[#091225]">
                هل تريد استرجاع البيانات التي قمت بإضافتها قبل تحميل البيانات التجريبية؟
              </h4>
              <p className="text-[11px] text-slate-700 mt-0.5">
                توجد نسخة احتياطية محفوظة تلقائياً تحتوي على ({preDemoSnapshot.counts.workshops} ورش، {preDemoSnapshot.counts.shops} محلات، {preDemoSnapshot.counts.inventory} مخزون، {preDemoSnapshot.counts.transactions} حركة).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleQuickUndo}
              className="flex-1 sm:flex-initial bg-[#0F1B33] hover:bg-[#091225] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#E49A0A]" />
              <span>استرجاع بياناتي السابقة</span>
            </button>
            <button
              onClick={() => setShowBackupModal(true)}
              className="bg-white border border-[#DDE4EC] text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              عرض السجل
            </button>
          </div>
        </div>
      )}

      {restoreSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-2 text-emerald-900 text-xs font-bold">
          <span>{restoreSuccess}</span>
          <button onClick={() => setRestoreSuccess(null)} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1B33] flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#C88918]" />
            لوحة القيادة والمؤشرات المحاسبية
          </h2>
          <p className="text-[#667085] text-xs mt-0.5">
            فصل مستقل بين رصيد الذهب بالجرام، ذهب السوق، ذهب الكسر، والأجور النقدية بالريال اليمني.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/market-gold')}
            className="btn-gold flex-1 sm:flex-initial text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span>ذهب السوق</span>
          </button>
          <button 
            onClick={() => setShowBackupModal(true)}
            className="flex-1 sm:flex-initial bg-white border border-[#DDE4EC] text-[#0F1B33] hover:bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title="النسخ الاحتياطي واسترجاع البيانات"
          >
            <Database className="w-4 h-4 text-[#C88918]" />
            <span>النسخ والاسترجاع</span>
          </button>
          <button 
            onClick={() => setShowSeedModal(true)}
            className="flex-1 sm:flex-initial bg-white border border-[#DDE4EC] text-[#0F1B33] hover:bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#C88918]" />
            <span>بيانات تجريبية</span>
          </button>
        </div>
      </div>

      {/* Hero Stat: ذهب السوق عند المحلات (Full Width on Mobile, 2 cols on Large) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Prominent Market Gold Card */}
        <div 
          onClick={() => navigate('/market-gold')}
          className="lg:col-span-2 card-prominent p-4 sm:p-5 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#C88918] uppercase tracking-wider block">
                  ذهب السوق
                </span>
                <span className="text-[10px] bg-[#E49A0A] text-[#091225] font-black px-2 py-0.5 rounded-full">
                  المؤشر الأهم
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                صافي الذمة الذهبية غير المسواة في ذمة المحلات
              </p>
            </div>
            <div className="p-2 bg-[#E49A0A] text-[#091225] rounded-xl group-hover:scale-105 transition-transform shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1" dir="ltr">
              <div className="text-2xl sm:text-4xl font-mono font-black text-[#091225]">
                {formatWeight(metrics.totalEquivalentReferenceKarat)} <small className="text-sm font-bold text-[#C88918]">جم</small>
              </div>
              <span className="text-[11px] font-bold text-[#091225] bg-white/80 border border-[#E49A0A]/40 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                إجمالي مكافئ عيار 21
              </span>
            </div>

            {/* Per Karat breakdown */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#E49A0A]/30">
              {([18, 21, 22, 24] as Karat[]).map((k) => (
                <div key={k} className="bg-white/90 border border-[#E49A0A]/40 py-1.5 px-1 rounded-xl text-center shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-600">عيار {k}</div>
                  <div className="text-xs sm:text-sm font-mono font-black text-[#091225] mt-0.5" dir="ltr">
                    {formatWeight(metrics.outstandingByKarat[k] || 0)}
                  </div>
                  <div className="text-[9px] text-slate-400">جم</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-[#091225] pt-1">
              <span>{metrics.shopsWithGoldCount} محلات في ذمتها ذهب</span>
              <span className="flex items-center gap-1 text-[#C88918] group-hover:text-[#091225] transition-colors">
                عرض كشف تفصيلي <ChevronLeft className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 1: ذهب المخزون */}
        <MetricCard
          level="standard"
          title="ذهب المخزون"
          value={formatWeight(totalInventoryNetWeight)}
          unit="جم صافي"
          subValue="الذهب الجاهز المتاح فعلياً في الخزينة للتوزيع"
          icon={<Package className="w-5 h-5 text-[#2864DC]" />}
          colorType="blue"
          onClick={() => navigate('/inventory')}
          breakdown={
            <div className="flex gap-1.5 text-[10px] font-mono text-[#667085] pt-1 overflow-x-auto no-scrollbar">
              {([18, 21, 22, 24] as Karat[]).map((k) => {
                const w = inventory
                  .filter(i => i.karat === k)
                  .reduce((s, i) => s + (i.availableWeight ?? i.netWeight ?? 0), 0);
                return (
                  <span key={k} className="bg-[#EEF4FF] text-[#2864DC] px-1.5 py-0.5 rounded-md border border-blue-200 font-bold shrink-0">
                    ع{k}: {formatWeight(w)}
                  </span>
                );
              })}
            </div>
          }
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 3: الكسر المستلم */}
        <MetricCard
          level="standard"
          title="الكسر المستلم"
          value={formatWeight(metrics.totalPhysicalScrapWeight)}
          unit="جم بحوزتي"
          subValue="ذهب كسر فعلي مستلم في الخزينة"
          icon={<ArrowDownLeft className="w-4 h-4 text-[#07875F]" />}
          colorType="green"
          onClick={() => navigate('/gold-scrap')}
        />

        {/* Card 4: تسوية نقدية */}
        <MetricCard
          level="standard"
          title="تسوية نقدية"
          value={formatWeight(metrics.totalCashSettledGoldWeight)}
          unit="جم مقطوع"
          subValue={
            metrics.totalCashSettledMoneyAmount > 0 
              ? `${formatCurrency(metrics.totalCashSettledMoneyAmount)} ر.ي نقد` 
              : "تسوية ذهب نقداً"
          }
          icon={<RefreshCw className="w-4 h-4 text-[#7C3AED]" />}
          colorType="purple"
        />

        {/* Card 5: الأجور المتبقية */}
        <MetricCard
          level="standard"
          title="الأجور المتبقية"
          value={formatCurrency(totalShopLaborDue)}
          unit="ر.ي"
          subValue="مديونية نقدية مستحقة من المحلات"
          icon={<Users className="w-4 h-4 text-[#0F1B33]" />}
          colorType="navy"
          onClick={() => navigate('/shops')}
        />

        {/* Card 6: تحصيل الأجور */}
        <MetricCard
          level="standard"
          title="تحصيل الأجور"
          value={formatCurrency(metrics.totalLaborCashCollected)}
          unit="ر.ي"
          subValue="مقبوضات خُصمت حصرًا من الأجور"
          icon={<Coins className="w-4 h-4 text-[#07875F]" />}
          colorType="green"
          onClick={() => navigate('/collections')}
        />
      </div>

      {/* Main Content Split: Recent Transactions + Inventory Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions (Desktop Table + Mobile Cards) */}
        <div className="lg:col-span-2 card-base overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#DDE4EC] flex items-center justify-between bg-slate-50/70">
            <h3 className="font-bold text-[#101828] text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E49A0A]" />
              آخر الحركات والسندات المعتمدة
            </h3>
            <span className="text-[11px] text-[#667085] font-mono font-medium">
              {transactions.length} حركة مسجلة
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-[#F3F6FA] border-b border-[#DDE4EC] text-[#667085] font-bold">
                <tr>
                  <th className="p-3">نوع الحركة والسند</th>
                  <th className="p-3">الطرف</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3 text-center">الوزن الصافي</th>
                  <th className="p-3 text-center">إجمالي الأجور</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">سند العميل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE4EC]">
                {transactions.slice(0, 7).map((tx) => {
                  const netWeight = tx.items?.reduce((s, i) => s + (i.netWeight || i.weight || 0), 0) || 0;
                  const totalWages = tx.cashAmount || tx.items?.reduce((s, i) => s + (i.totalShopWage || i.totalWorkshopWage || 0), 0) || 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-[#101828]">
                          {tx.type === 'RECEIVE_FROM_WORKSHOP' ? 'استلام من ورشة' : 
                           tx.type === 'RETURN_TO_WORKSHOP' ? 'مرتجع للورشة' :
                           tx.type === 'DISTRIBUTE_TO_SHOP' ? 'توزيع لمحل' : 
                           tx.type === 'COLLECT_FROM_SHOP' ? 'سند تحصيل وقبض' : 
                           tx.type === 'RETURN_FROM_SHOP' ? 'مرتجع من محل' : 'تسوية'}
                        </div>
                        {tx.workshopDocNo && (
                          <div className="text-[10px] text-[#667085] font-mono">سند #{tx.workshopDocNo}</div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-[#101828]">
                        {tx.entityName || '---'}
                      </td>
                      <td className="p-3 font-mono text-[#667085]">
                        {new Date(tx.date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-[#0F1B33]">
                        {netWeight > 0 ? `${formatWeight(netWeight)} جم` : '---'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-[#C88918]">
                        {totalWages > 0 ? `${formatCurrency(totalWages)} ر.ي` : '---'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 bg-[#EAFBF4] text-[#07875F] font-bold">
                          معتمد محاسبياً
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {(tx.type === 'DISTRIBUTE_TO_SHOP' || tx.type === 'COLLECT_FROM_SHOP') && (
                          <button
                            onClick={() => openVoucher(tx)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FFF7E5] border border-[#E49A0A]/30 text-[#C88918] text-[10px] font-bold hover:bg-[#E49A0A] hover:text-[#091225] transition-all cursor-pointer mx-auto"
                            title="عرض سند العميل"
                          >
                            <FileText className="w-3 h-3" />
                            سند العميل
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#667085]">
                      لا توجد حركات مسجلة حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (Instead of squished table) */}
          <div className="sm:hidden divide-y divide-[#DDE4EC]">
            {transactions.slice(0, 6).map((tx) => {
              const netWeight = tx.items?.reduce((s, i) => s + (i.netWeight || i.weight || 0), 0) || 0;
              const totalWages = tx.cashAmount || tx.items?.reduce((s, i) => s + (i.totalShopWage || i.totalWorkshopWage || 0), 0) || 0;

              return (
                <div key={tx.id} className="p-3.5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-xs text-[#101828] block">
                        {tx.type === 'RECEIVE_FROM_WORKSHOP' ? 'استلام من ورشة' : 
                         tx.type === 'RETURN_TO_WORKSHOP' ? 'مرتجع للورشة' :
                         tx.type === 'DISTRIBUTE_TO_SHOP' ? 'توزيع لمحل' : 
                         tx.type === 'COLLECT_FROM_SHOP' ? 'سند تحصيل وقبض' : 
                         tx.type === 'RETURN_FROM_SHOP' ? 'مرتجع من محل' : 'تسوية'}
                      </span>
                      <span className="text-[11px] text-[#667085] font-medium">{tx.entityName}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAFBF4] text-[#07875F] font-bold border border-emerald-200">
                      معتمد
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-mono">
                    <span className="text-slate-500 text-[10px]">{new Date(tx.date).toLocaleDateString('ar-EG')}</span>
                    <div className="flex gap-2.5 items-center">
                      {netWeight > 0 && (
                        <span className="font-bold text-[#0F1B33]">{formatWeight(netWeight)} جم</span>
                      )}
                      {totalWages > 0 && (
                        <span className="font-bold text-[#C88918]">{formatCurrency(totalWages)} ر.ي</span>
                      )}
                      {(tx.type === 'DISTRIBUTE_TO_SHOP' || tx.type === 'COLLECT_FROM_SHOP') && (
                        <button
                          onClick={() => openVoucher(tx)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FFF7E5] border border-[#E49A0A]/30 text-[#C88918] text-[9px] font-bold hover:bg-[#E49A0A] hover:text-[#091225] transition-all cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          سند
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div className="p-6 text-center text-[#667085] text-xs">
                لا توجد حركات مسجلة حتى الآن.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inventory Breakdown & Accounting Rules */}
        <div className="space-y-4">
          {/* Inventory Breakdown by Karat */}
          <div className="card-base p-4 sm:p-5 space-y-3.5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#101828] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C88918]" />
                توزيع مخزون الذهب الجاهز
              </h3>
              <span className="text-[10px] text-[#667085]">بالخزينة</span>
            </div>

            <div className="space-y-3">
              {[18, 21, 22, 24].map((k) => {
                const weight = inventory
                  .filter(i => i.karat === k)
                  .reduce((s, i) => s + (i.availableWeight ?? i.netWeight ?? i.weight ?? 0), 0);
                const percentage = totalInventoryNetWeight > 0 ? (weight / totalInventoryNetWeight) * 100 : 0;
                
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#667085] font-bold">عيار {k}</span>
                      <span className="font-mono font-bold text-[#101828]">{formatWeight(weight)} جم</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#C88918] to-[#E49A0A] transition-all duration-500 rounded-full" 
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Separation Rule Callout */}
          <div className="bg-[#0F1B33] text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-[#091225] space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase font-bold text-[#E49A0A] flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                قواعد الفصل المحاسبي
              </h4>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">نظام الذهب والأجور</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              لا يُخصم النقد المقبوض مقابل الأجور من رصيد الذهب، ولا يُضاف نقد تسوية الذهب لمخزون الكسر الفعلي. كل حركة تحافظ على دقة وسلامة دفتر الأستاذ.
            </p>
          </div>
        </div>
      </div>

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onOpenSeedConfirm={() => setShowSeedModal(true)}
      />

      {/* Seed Confirm Modal */}
      <SeedConfirmModal
        isOpen={showSeedModal}
        onClose={() => setShowSeedModal(false)}
      />

      {/* Customer Voucher Preview */}
      {activeVoucher && (
        <VoucherPreviewModal
          transactionId={activeVoucher.txId}
          dto={activeVoucher.dto}
          onClose={() => setActiveVoucher(null)}
        />
      )}
    </div>
  );
}
