import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/useAppStore';
import { repository } from '../lib/storage';
import { formatCurrency, formatWeight, cn } from '../lib/utils';
import { Plus, Search, MapPin, Phone, Factory, Undo2, FileText, X, ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { Workshop } from '../types';

export default function Workshops() {
  const navigate = useNavigate();
  const { workshops, transactions, refreshData } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [statementWorkshop, setStatementWorkshop] = useState<Workshop | null>(null);
  const [newWorkshop, setNewWorkshop] = useState({ name: '', phone: '', address: '' });

  const handleAdd = async () => {
    if (!newWorkshop.name) return;
    const workshop: Workshop = {
      id: crypto.randomUUID(),
      name: newWorkshop.name,
      phone: newWorkshop.phone,
      address: newWorkshop.address,
      goldBalances: { 18: 0, 21: 0, 22: 0, 24: 0 },
      laborBalance: 0
    };
    await repository.save('workshops', workshop);
    setNewWorkshop({ name: '', phone: '', address: '' });
    setShowModal(false);
    refreshData();
  };

  // Transactions for the selected workshop in statement
  const workshopTransactions = statementWorkshop 
    ? transactions.filter(t => t.entityId === statementWorkshop.id)
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">إدارة الورش</h2>
          <p className="text-xs text-slate-500 mt-0.5">قائمة الورش المصنعة، ومتابعة أرصدة الذهب والأجور وحركات الإرجاع.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/workshop-returns')}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Undo2 className="w-4 h-4 text-amber-600" />
            مرتجع للورشة
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            إضافة ورشة جديدة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workshops.map(w => {
          const totalGoldWeight = Object.values(w.goldBalances || {}).reduce<number>((a, b) => a + (Number(b) || 0), 0);
          const isCreditLabor = w.laborBalance < 0;

          return (
            <div key={w.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                      <Factory className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{w.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {w.phone || '---'}
                      </div>
                    </div>
                  </div>
                  {w.address && (
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {w.address}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">رصيد أجور التصنيع:</span>
                    <span className={cn("font-mono font-bold text-sm", isCreditLabor ? "text-rose-700 bg-rose-50 px-2 py-0.5 rounded" : "text-emerald-800")}>
                      {formatCurrency(w.laborBalance)} ر.ي
                      {isCreditLabor && <small className="text-[9px] mr-1 font-normal">(رصيد دائن للموزع)</small>}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100/80">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[11px] font-bold text-slate-600">أرصدة الذهب حسب العيار</p>
                      <span className="font-mono text-[11px] text-slate-400 font-bold">
                        إجمالي: {formatWeight(totalGoldWeight)} جم
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[18, 21, 22, 24].map((karat) => {
                        const weight = Number((w.goldBalances as Record<number, number>)?.[karat]) || 0;
                        const isNeg = weight < 0;
                        return (
                          <div key={karat} className={cn("p-2 rounded-lg border flex justify-between items-center text-xs", isNeg ? "bg-rose-50/60 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-100")}>
                            <span className="text-[10px] text-slate-500 font-medium">ع {karat}</span>
                            <span className={cn("font-mono font-bold", isNeg ? "text-rose-800" : "text-slate-800")}>
                              {formatWeight(weight)} جم
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => setStatementWorkshop(w)}
                  className="flex-1 text-xs py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  كشف حساب
                </button>
                <button 
                  onClick={() => navigate(`/workshop-returns?workshopId=${w.id}`)}
                  className="flex-1 text-xs py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 border border-amber-200"
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                  مرتجع للورشة
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Workshop Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">إضافة ورشة مصنعة جديدة</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الورشة <span className="text-rose-500">*</span></label>
                <input 
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 outline-none focus:border-amber-500 font-bold text-slate-800"
                  placeholder="مثال: ورشة الأمانة للذهب"
                  value={newWorkshop.name}
                  onChange={e => setNewWorkshop({...newWorkshop, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input 
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 outline-none focus:border-amber-500 font-bold text-slate-800"
                  placeholder="770000000"
                  value={newWorkshop.phone}
                  onChange={e => setNewWorkshop({...newWorkshop, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">العنوان / الموقع</label>
                <input 
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 outline-none focus:border-amber-500 text-slate-800"
                  placeholder="سوق الصاغة - صنعاء"
                  value={newWorkshop.address}
                  onChange={e => setNewWorkshop({...newWorkshop, address: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button 
                  onClick={handleAdd}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-bold cursor-pointer transition-all"
                >
                  حفظ الورشة
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold cursor-pointer transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workshop Statement Modal */}
      {statementWorkshop && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Factory className="w-5 h-5 text-amber-600" />
                  كشف حساب ورشة: {statementWorkshop.name}
                </h3>
                <p className="text-xs text-slate-500">سجل المعاملات وسندات الاستلام والمرتجع والمدفوعات.</p>
              </div>
              <button onClick={() => setStatementWorkshop(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Balances in Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">رصيد الأجور الحالي</span>
                <span className="font-mono font-bold text-amber-900 text-sm">{formatCurrency(statementWorkshop.laborBalance)} ر.ي</span>
              </div>
              {[18, 21, 22, 24].map((k) => (
                <div key={k} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">ذهب عيار {k}</span>
                  <span className="font-mono font-bold text-slate-800">{formatWeight(Number((statementWorkshop.goldBalances as Record<number, number>)?.[k]) || 0)} جم</span>
                </div>
              ))}
            </div>

            {/* Transactions History List */}
            <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
              <span className="font-bold text-slate-700 text-xs block">سجل المعاملات:</span>
              {workshopTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                  لا توجد حركات مسجلة لهذه الورشة بعد.
                </div>
              ) : (
                <div className="space-y-2">
                  {workshopTransactions.map(tx => {
                    const isReturn = tx.type === 'RETURN_TO_WORKSHOP';
                    const isReceive = tx.type === 'RECEIVE_FROM_WORKSHOP';

                    return (
                      <div key={tx.id} className={cn("p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2", isReturn ? "bg-purple-50/50 border-purple-200" : isReceive ? "bg-amber-50/40 border-amber-200" : "bg-slate-50 border-slate-200")}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isReturn ? "bg-purple-100 text-purple-700" : isReceive ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700")}>
                            {isReturn ? <Undo2 className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {isReturn ? 'مرتجع للورشة' : isReceive ? 'استلام بضاعة' : tx.type}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">({tx.id})</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(tx.date).toLocaleDateString('ar-EG')} - {tx.workshopDocNo ? `سند: ${tx.workshopDocNo}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-left font-mono">
                          {tx.certifiedGoldWeightTotal && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">وزن الذهب</span>
                              <span className="font-bold text-amber-900">{formatWeight(tx.certifiedGoldWeightTotal)} جم</span>
                            </div>
                          )}
                          {isReturn && tx.cancelledLaborTotal !== undefined && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">أجور ملغاة</span>
                              <span className="font-bold text-emerald-800">{formatCurrency(tx.cancelledLaborTotal)} ر.ي</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setStatementWorkshop(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
