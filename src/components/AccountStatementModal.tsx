import React, { useMemo } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { formatCurrency, formatWeight } from '../lib/utils';
import { Shop, Transaction } from '../types';
import {
  X, TrendingDown, TrendingUp, Scale, Coins,
  ArrowDownLeft, ArrowUpRight, Calendar, FileText
} from 'lucide-react';

interface AccountStatementModalProps {
  shop: Shop;
  onClose: () => void;
}

export function AccountStatementModal({ shop, onClose }: AccountStatementModalProps) {
  const { transactions } = useAppStore();

  const shopTxs = useMemo(() =>
    transactions
      .filter(t => t.entityId === shop.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, shop.id]
  );

  // ما أعطيته له (توزيع بضاعة)
  const distributions = shopTxs.filter(t => t.type === 'DISTRIBUTE_TO_SHOP');
  const totalDistributedWeight = distributions.reduce((s, t) =>
    s + (t.items?.reduce((si, i) => si + (i.netWeight || i.weight || 0), 0) || 0), 0);
  const totalDistributedWages = distributions.reduce((s, t) =>
    s + (t.cashAmount || t.items?.reduce((si, i) => si + (i.totalShopWage || 0), 0) || 0), 0);

  // ما استلمته منه (تحصيل)
  const collections = shopTxs.filter(t => t.type === 'COLLECT_FROM_SHOP');
  const totalCollectedCash = collections.reduce((s, t) =>
    s + (t.totalLaborCash || 0) + (t.totalGoldSettlementCash || 0), 0);
  const totalCollectedScrap = collections.reduce((s, t) => {
    if (!t.totalScrapGoldWeight) return s;
    return s + (Object.values(t.totalScrapGoldWeight) as number[]).reduce((a, b) => a + b, 0);
  }, 0);

  // الرصيد الحالي
  const currentLaborBalance = shop.laborBalance;
  const totalGoldBalance = Object.values(shop.goldBalances).reduce((s, v) => s + (v as number), 0);

  const typeLabel = (type: string) => {
    switch (type) {
      case 'DISTRIBUTE_TO_SHOP': return { label: 'توزيع بضاعة', color: 'text-blue-700', bg: 'bg-blue-50', icon: <ArrowDownLeft className="w-3.5 h-3.5" /> };
      case 'COLLECT_FROM_SHOP': return { label: 'سند تحصيل', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <ArrowUpRight className="w-3.5 h-3.5" /> };
      case 'RETURN_FROM_SHOP': return { label: 'مرتجع من محل', color: 'text-orange-700', bg: 'bg-orange-50', icon: <TrendingUp className="w-3.5 h-3.5" /> };
      case 'REVERSE_COLLECTION': return { label: 'سند عكسي', color: 'text-red-700', bg: 'bg-red-50', icon: <X className="w-3.5 h-3.5" /> };
      default: return { label: type, color: 'text-slate-600', bg: 'bg-slate-50', icon: <FileText className="w-3.5 h-3.5" /> };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-l from-slate-50 to-white">
          <div>
            <h2 className="text-lg font-black text-slate-900">{shop.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{shop.phone || 'بدون هاتف'} {shop.address ? `· ${shop.address}` : ''}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Summary Cards */}
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 border-b border-slate-200">
            {/* ما أعطيته */}
            <div className="bg-white rounded-xl p-3.5 border border-blue-200/70 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">أعطيته</span>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-blue-800 font-mono tabular-nums">
                  {formatWeight(totalDistributedWeight)} <span className="text-xs font-normal">جم</span>
                </div>
                <div className="text-[11px] font-bold text-blue-600 font-mono tabular-nums">
                  {formatCurrency(totalDistributedWages)} <span className="font-normal">ر.ي أجور</span>
                </div>
                <div className="text-[9px] text-slate-400">{distributions.length} عملية توزيع</div>
              </div>
            </div>

            {/* ما استلمته */}
            <div className="bg-white rounded-xl p-3.5 border border-emerald-200/70 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">استلمته</span>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-emerald-800 font-mono tabular-nums">
                  {formatCurrency(totalCollectedCash)} <span className="text-xs font-normal">ر.ي</span>
                </div>
                {totalCollectedScrap > 0 && (
                  <div className="text-[11px] font-bold text-amber-700 font-mono tabular-nums">
                    {formatWeight(totalCollectedScrap)} <span className="font-normal">جم كسر</span>
                  </div>
                )}
                <div className="text-[9px] text-slate-400">{collections.length} سند تحصيل</div>
              </div>
            </div>

            {/* الأجور المتبقية */}
            <div className="bg-white rounded-xl p-3.5 border border-red-200/70 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">أجور عليه</span>
              </div>
              <div className="text-lg font-black text-red-700 font-mono tabular-nums">
                {formatCurrency(currentLaborBalance)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">ريال يمني</div>
            </div>

            {/* ذهب عليه */}
            <div className="bg-white rounded-xl p-3.5 border border-amber-200/70 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">ذهب عليه</span>
              </div>
              <div className="text-lg font-black text-amber-700 font-mono tabular-nums">
                {formatWeight(totalGoldBalance)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">جرام صافي</div>
            </div>
          </div>

          {/* Gold Breakdown */}
          {totalGoldBalance > 0 && (
            <div className="px-5 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">تفصيل الذهب بالعيار</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(shop.goldBalances).filter(([, w]) => (w as number) > 0).map(([k, w]) => (
                  <div key={k} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-600">عيار {k}</span>
                    <span className="font-mono font-black text-sm text-amber-900 tabular-nums">{formatWeight(w as number)} جم</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions History */}
          <div className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              سجل جميع الحركات ({shopTxs.length})
            </p>
            {shopTxs.length === 0 ? (
              <div className="text-center text-slate-400 py-8 text-sm">لا توجد حركات مسجلة</div>
            ) : (
              <div className="space-y-2">
                {shopTxs.map(tx => {
                  const meta = typeLabel(tx.type);
                  const weight = tx.items?.reduce((s, i) => s + (i.netWeight || i.weight || 0), 0) || 0;
                  const cash = tx.cashAmount || (tx.totalLaborCash || 0) + (tx.totalGoldSettlementCash || 0);

                  return (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                      <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center ${meta.color} shrink-0`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{tx.id}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(tx.date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                          {' '}·{' '}
                          {new Date(tx.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {weight > 0 && (
                          <div className="text-xs font-bold text-slate-700 font-mono tabular-nums">{formatWeight(weight)} جم</div>
                        )}
                        {cash > 0 && (
                          <div className="text-xs font-bold text-[#C88918] font-mono tabular-nums">{formatCurrency(cash)} ر.ي</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex justify-between items-center bg-slate-50/50">
          <div className="text-xs text-slate-400">
            إجمالي الحركات: <span className="font-bold text-slate-600">{shopTxs.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
