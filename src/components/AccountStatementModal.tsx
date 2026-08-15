import React, { useMemo, useState } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { formatCurrency, formatWeight } from '../lib/utils';
import { Shop, Transaction } from '../types';
import {
  X, TrendingDown, TrendingUp, Scale, Coins,
  ArrowDownLeft, ArrowUpRight, Calendar, FileText,
  Trash2, Edit3, Check, AlertTriangle
} from 'lucide-react';

interface AccountStatementModalProps {
  shop: Shop;
  onClose: () => void;
}

type ActionMode =
  | { type: 'CANCEL'; tx: Transaction }
  | { type: 'EDIT_WAGE'; tx: Transaction; currentWage: number }
  | null;

export function AccountStatementModal({ shop, onClose }: AccountStatementModalProps) {
  const { transactions, addTransaction } = useAppStore();
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [newWageAmount, setNewWageAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

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
      case 'CANCEL_DISTRIBUTION': return { label: 'إلغاء توزيع', color: 'text-red-700', bg: 'bg-red-50', icon: <Trash2 className="w-3.5 h-3.5" /> };
      case 'EDIT_DISTRIBUTION_WAGE': return { label: 'تعديل أجرة', color: 'text-purple-700', bg: 'bg-purple-50', icon: <Edit3 className="w-3.5 h-3.5" /> };
      default: return { label: type, color: 'text-slate-600', bg: 'bg-slate-50', icon: <FileText className="w-3.5 h-3.5" /> };
    }
  };

  // إلغاء عملية توزيع
  const handleCancelDistribution = async (tx: Transaction) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const cancelTx: Transaction = {
        id: `CANCEL-DIST-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        type: 'RETURN_FROM_SHOP' as const,
        entityId: shop.id,
        entityName: shop.name,
        referenceId: tx.id,
        notes: `إلغاء عملية التوزيع ${tx.id} - اتفاق على الإلغاء`,
        items: tx.items?.map(item => ({
          ...item,
          actualReturnedWeight: item.netWeight,
          returnedPiecesCount: item.count ?? undefined,
          returnWeightDiff: 0,
          returnReason: 'إلغاء عملية التوزيع باتفاق',
        })) || [],
        cashAmount: tx.cashAmount || 0,
      };
      await addTransaction(cancelTx);
      setActionMode(null);
      alert(`✅ تم إلغاء عملية التوزيع ${tx.id} بنجاح وإعادة جميع القيود.`);
    } catch (err) {
      console.error('خطأ في إلغاء التوزيع:', err);
      alert('حدث خطأ أثناء الإلغاء. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  // تعديل الأجرة
  const handleEditWage = async (tx: Transaction, newWage: number) => {
    if (isProcessing) return;
    if (!newWage || newWage < 0) return alert('يرجى إدخال مبلغ الأجرة الجديد');
    const oldWage = tx.cashAmount || 0;
    const wageDiff = newWage - oldWage;

    setIsProcessing(true);
    try {
      // نسجل حركة تعديل تُضاف أو تُخصم من الرصيد
      const editTx: Transaction = {
        id: `EDIT-WAGE-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        type: 'COLLECT_FROM_SHOP' as const,
        entityId: shop.id,
        entityName: shop.name,
        referenceId: tx.id,
        notes: `تعديل أجرة سند التوزيع ${tx.id} - من ${oldWage.toLocaleString()} إلى ${newWage.toLocaleString()} ر.ي`,
        collectionItems: [
          {
            id: crypto.randomUUID(),
            type: 'LABOR_CASH' as const,
            laborCashAmount: Math.abs(wageDiff),
            purpose: 'FOR_LABOR' as const,
          }
        ],
        totalLaborCash: Math.abs(wageDiff),
        totalGoldSettlementCash: 0,
        cashAmount: Math.abs(wageDiff),
      };

      // في حالة التخفيض: نسجل تحصيل بمبلغ الفرق (يقلل من الرصيد المستحق)
      // في حالة الزيادة: نسجل توزيع بالفرق (يزيد الرصيد)
      if (wageDiff < 0) {
        // الأجرة انخفضت - نسجل تحصيل بمقدار الفرق لتقليل ما عليه
        const collectTx: Transaction = {
          id: `EDIT-WAGE-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString(),
          type: 'COLLECT_FROM_SHOP' as const,
          entityId: shop.id,
          entityName: shop.name,
          referenceId: tx.id,
          notes: `تعديل أجرة سند التوزيع ${tx.id}: تخفيض بمقدار ${Math.abs(wageDiff).toLocaleString()} ر.ي (من ${oldWage.toLocaleString()} إلى ${newWage.toLocaleString()} ر.ي)`,
          collectionItems: [
            {
              id: crypto.randomUUID(),
              type: 'LABOR_CASH' as const,
              laborCashAmount: Math.abs(wageDiff),
              purpose: 'FOR_LABOR' as const,
            }
          ],
          totalLaborCash: Math.abs(wageDiff),
          totalGoldSettlementCash: 0,
          cashAmount: Math.abs(wageDiff),
        };
        await addTransaction(collectTx);
      } else {
        // الأجرة زادت - نسجل فارق توزيع
        const additionalTx: Transaction = {
          id: `EDIT-WAGE-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString(),
          type: 'DISTRIBUTE_TO_SHOP' as const,
          entityId: shop.id,
          entityName: shop.name,
          referenceId: tx.id,
          notes: `تعديل أجرة سند التوزيع ${tx.id}: زيادة بمقدار ${wageDiff.toLocaleString()} ر.ي (من ${oldWage.toLocaleString()} إلى ${newWage.toLocaleString()} ر.ي)`,
          items: tx.items?.map(item => ({
            ...item,
            netWeight: 0,
            totalShopWage: wageDiff,
          })) || [],
          cashAmount: wageDiff,
        };
        await addTransaction(additionalTx);
      }

      setActionMode(null);
      alert(`✅ تم تعديل الأجرة بنجاح.\nالأجرة الجديدة: ${newWage.toLocaleString()} ر.ي\nالفرق: ${wageDiff > 0 ? '+' : ''}${wageDiff.toLocaleString()} ر.ي`);
    } catch (err) {
      console.error('خطأ في تعديل الأجرة:', err);
      alert('حدث خطأ أثناء تعديل الأجرة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
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
                  const isDistribution = tx.type === 'DISTRIBUTE_TO_SHOP';

                  return (
                    <div key={tx.id} className="rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
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
                          {tx.notes && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[240px]">{tx.notes}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {weight > 0 && (
                            <div className="text-xs font-bold text-slate-700 font-mono tabular-nums">{formatWeight(weight)} جم</div>
                          )}
                          {cash > 0 && (
                            <div className="text-xs font-bold text-[#C88918] font-mono tabular-nums">{formatCurrency(cash)} ر.ي</div>
                          )}
                        </div>
                        {/* أزرار الإجراءات - فقط لعمليات التوزيع */}
                        {isDistribution && (
                          <div className="flex gap-1.5 shrink-0 mr-1">
                            <button
                              onClick={() => {
                                setNewWageAmount(tx.cashAmount || 0);
                                setActionMode({ type: 'EDIT_WAGE', tx, currentWage: tx.cashAmount || 0 });
                              }}
                              title="تعديل الأجرة"
                              className="w-7 h-7 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActionMode({ type: 'CANCEL', tx })}
                              title="إلغاء العملية"
                              className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Panel - Cancel */}
                      {actionMode?.type === 'CANCEL' && actionMode.tx.id === tx.id && (
                        <div className="border-t border-red-100 bg-red-50 p-3">
                          <div className="flex items-start gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-red-800">تأكيد إلغاء عملية التوزيع</p>
                              <p className="text-[10px] text-red-600 mt-0.5">
                                سيتم عكس جميع القيود المحاسبية وإعادة الأوزان للمخزون. هذه العملية لا يمكن التراجع عنها.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancelDistribution(tx)}
                              disabled={isProcessing}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {isProcessing ? (
                                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                </svg>
                              ) : <Trash2 className="w-3.5 h-3.5" />}
                              تأكيد الإلغاء
                            </button>
                            <button
                              onClick={() => setActionMode(null)}
                              disabled={isProcessing}
                              className="px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              تراجع
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Panel - Edit Wage */}
                      {actionMode?.type === 'EDIT_WAGE' && actionMode.tx.id === tx.id && (
                        <div className="border-t border-purple-100 bg-purple-50 p-3">
                          <div className="flex items-start gap-2 mb-3">
                            <Edit3 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-purple-900">تعديل الأجرة المتفق عليها</p>
                              <p className="text-[10px] text-purple-600 mt-0.5">
                                الأجرة الحالية: <span className="font-mono font-bold">{formatCurrency(actionMode.currentWage)} ر.ي</span>
                                {' '}— أدخل الأجرة الجديدة المتفق عليها
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={newWageAmount || ''}
                              onChange={e => setNewWageAmount(Number(e.target.value))}
                              placeholder="المبلغ الجديد (ر.ي)"
                              className="flex-1 border border-purple-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-right"
                              dir="rtl"
                            />
                            <button
                              onClick={() => handleEditWage(tx, newWageAmount)}
                              disabled={isProcessing || !newWageAmount}
                              className="px-3 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              {isProcessing ? (
                                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                </svg>
                              ) : <Check className="w-3.5 h-3.5" />}
                              تأكيد
                            </button>
                            <button
                              onClick={() => setActionMode(null)}
                              disabled={isProcessing}
                              className="px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                          {newWageAmount > 0 && newWageAmount !== (actionMode.currentWage || 0) && (
                            <div className={`mt-2 text-[10px] font-bold ${newWageAmount < (actionMode.currentWage || 0) ? 'text-emerald-700' : 'text-orange-700'}`}>
                              {newWageAmount < (actionMode.currentWage || 0)
                                ? `↓ تخفيض ${formatCurrency((actionMode.currentWage || 0) - newWageAmount)} ر.ي من رصيد المحل`
                                : `↑ زيادة ${formatCurrency(newWageAmount - (actionMode.currentWage || 0))} ر.ي على رصيد المحل`
                              }
                            </div>
                          )}
                        </div>
                      )}
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
