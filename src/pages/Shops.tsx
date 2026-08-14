import React, { useState } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { repository } from '../lib/storage';
import { formatCurrency, formatWeight } from '../lib/utils';
import { Plus, Store, Phone, MapPin, X, FileBarChart2, Pencil, Scale, Coins } from 'lucide-react';
import { Shop } from '../types';
import { AccountStatementModal } from '../components/AccountStatementModal';

export default function Shops() {
  const { shops, refreshData } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [newShop, setNewShop] = useState({ name: '', phone: '', address: '' });
  const [statementShop, setStatementShop] = useState<Shop | null>(null);

  const handleAdd = async () => {
    if (!newShop.name) return;
    const shop: Shop = {
      id: crypto.randomUUID(),
      name: newShop.name,
      phone: newShop.phone,
      address: newShop.address,
      goldBalances: { 18: 0, 21: 0, 22: 0, 24: 0 },
      laborBalance: 0,
      workshopDueBalance: 0,
      profitBalance: 0
    };
    await repository.save('shops', shop);
    setNewShop({ name: '', phone: '', address: '' });
    setShowModal(false);
    refreshData();
  };

  const totalLaborAll = shops.reduce((s, sh) => s + sh.laborBalance, 0);
  const totalGoldAll = shops.reduce((s, sh) =>
    s + Object.values(sh.goldBalances).reduce<number>((g, v) => g + (Number(v) || 0), 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Account Statement Modal */}
      {statementShop && (
        <AccountStatementModal shop={statementShop} onClose={() => setStatementShop(null)} />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4
                      bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-[#C88918]" />
            دليل العملاء والمحلات
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {shops.length} محل مسجل · إجمالي الأجور المستحقة:
            <span className="font-bold text-red-600 font-mono mr-1">{formatCurrency(totalLaborAll)} ر.ي</span>
            · ذهب عليهم:
            <span className="font-bold text-amber-700 font-mono mr-1">{formatWeight(totalGoldAll)} جم</span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0F1B33] text-white px-4 py-2.5 rounded-xl
                     text-sm font-bold hover:bg-[#1a2d52] transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          إضافة محل جديد
        </button>
      </div>

      {/* Shops Grid */}
      {shops.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Store className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">لا توجد محلات مسجلة بعد</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 text-sm text-[#C88918] font-bold hover:underline">
            أضف أول محل
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shops.map(shop => {
            const totalGold = Object.values(shop.goldBalances)
              .reduce<number>((s, v) => s + (Number(v) || 0), 0);
            const hasDebt = shop.laborBalance > 0 || totalGold > 0;

            return (
              <div key={shop.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs
                           hover:shadow-md hover:border-slate-300 transition-all flex flex-col">

                {/* Shop Identity */}
                <div className="p-5 flex items-start gap-3 border-b border-slate-100">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF7E5] flex items-center
                                  justify-center text-[#C88918] shrink-0 border border-[#E49A0A]/20">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base leading-tight truncate">
                      {shop.name}
                    </h3>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {shop.phone && (
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 shrink-0" />{shop.phone}
                        </span>
                      )}
                      {shop.address && (
                        <span className="text-xs text-slate-400 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />{shop.address}
                        </span>
                      )}
                    </div>
                  </div>
                  {hasDebt && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50
                                     text-red-600 border border-red-200 shrink-0">
                      له رصيد
                    </span>
                  )}
                </div>

                {/* Balances */}
                <div className="p-4 space-y-3 flex-1">
                  {/* Labor Balance */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">مديونية الأجور</span>
                    </div>
                    <span className={`font-mono font-black text-sm tabular-nums
                      ${shop.laborBalance > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {formatCurrency(shop.laborBalance)} <span className="text-xs font-normal">ر.ي</span>
                    </span>
                  </div>

                  {/* Gold Balances */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">أرصدة الذهب</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[18, 21, 22, 24].map(k => {
                        const w = shop.goldBalances[k as keyof typeof shop.goldBalances] as number || 0;
                        return (
                          <div key={k} className={`rounded-lg p-2 text-center border
                            ${w > 0
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-slate-50 border-slate-100'}`}>
                            <div className="text-[9px] font-bold text-slate-400 mb-0.5">{k}K</div>
                            <div className={`text-xs font-black font-mono tabular-nums
                              ${w > 0 ? 'text-amber-800' : 'text-slate-300'}`}>
                              {formatWeight(w)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 pt-0 flex gap-2">
                  <button
                    onClick={() => setStatementShop(shop)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                               bg-[#0F1B33] text-white text-xs font-bold hover:bg-[#1a2d52]
                               transition-colors cursor-pointer"
                  >
                    <FileBarChart2 className="w-3.5 h-3.5" />
                    كشف حساب
                  </button>
                  <button
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl
                               bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200
                               transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Shop Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">إضافة محل جديد</h3>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم المحل *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm
                             outline-none focus:ring-2 focus:ring-[#C88918]/30 focus:border-[#C88918]"
                  placeholder="مثال: محل أبو علي للذهب"
                  value={newShop.name}
                  onChange={e => setNewShop({ ...newShop, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">رقم الهاتف</label>
                <input
                  className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm
                             font-mono outline-none focus:ring-2 focus:ring-[#C88918]/30 focus:border-[#C88918]"
                  placeholder="777XXXXXXX"
                  value={newShop.phone}
                  onChange={e => setNewShop({ ...newShop, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">العنوان</label>
                <input
                  className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm
                             outline-none focus:ring-2 focus:ring-[#C88918]/30 focus:border-[#C88918]"
                  placeholder="مثال: شارع الذهب، صنعاء"
                  value={newShop.address}
                  onChange={e => setNewShop({ ...newShop, address: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAdd}
                  disabled={!newShop.name}
                  className="flex-1 bg-[#0F1B33] text-white py-3 rounded-xl font-bold text-sm
                             hover:bg-[#1a2d52] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  حفظ المحل
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
