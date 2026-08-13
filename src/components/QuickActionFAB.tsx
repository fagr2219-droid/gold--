import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  PlusCircle, 
  Truck, 
  Coins, 
  Undo2, 
  RotateCcw, 
  Flame, 
  X,
  Scale
} from 'lucide-react';

export function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button (Mobile only, placed safely above bottom bar) */}
      <div className="fixed bottom-20 left-4 z-40 md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-2xl bg-[#E49A0A] hover:bg-[#C88918] text-[#091225] shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 border-2 border-white/80 cursor-pointer"
          aria-label="حركة جديدة"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Speed Dial / Quick Actions Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center p-0 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-[#091225]/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsOpen(false)} 
          />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl z-10 border border-[#DDE4EC] space-y-4">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-1" />

            <div className="flex justify-between items-center border-b border-[#DDE4EC] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#101828] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E49A0A]" />
                  تسجيل حركة جديدة سريعة
                </h3>
                <p className="text-[11px] text-[#667085]">اختر المعاملة المحاسبية أو المخزنية المطلوبة</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Receive from Workshop */}
              <button
                onClick={() => handleAction('/receive-workshop')}
                className="p-3.5 rounded-2xl border border-emerald-200 bg-[#EAFBF4] hover:bg-emerald-100/70 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-emerald-950 block">استلام من ورشة</span>
                  <span className="text-[10px] text-emerald-700">سند استلام وأجور تصنيع</span>
                </div>
              </button>

              {/* 2. Distribute to Shop */}
              <button
                onClick={() => handleAction('/distribution')}
                className="p-3.5 rounded-2xl border border-blue-200 bg-[#EEF4FF] hover:bg-blue-100/70 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-[#2864DC] text-white flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-blue-950 block">توزيع لمحل</span>
                  <span className="text-[10px] text-blue-700">صرف بضاعة وربط الأجور</span>
                </div>
              </button>

              {/* 3. Collection / Voucher */}
              <button
                onClick={() => handleAction('/collections')}
                className="p-3.5 rounded-2xl border border-amber-200 bg-[#FFF7E5] hover:bg-amber-100/70 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-[#C88918] text-white flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-amber-950 block">سند تحصيل وقبض</span>
                  <span className="text-[10px] text-amber-800">أجور نقدية / كسر / تسوية</span>
                </div>
              </button>

              {/* 4. Workshop Return */}
              <button
                onClick={() => handleAction('/workshop-returns')}
                className="p-3.5 rounded-2xl border border-purple-200 bg-[#F5F3FF] hover:bg-purple-100/70 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center">
                  <Undo2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-purple-950 block">مرتجع للورشة</span>
                  <span className="text-[10px] text-purple-700">إرجاع بضاعة وإلغاء أجور</span>
                </div>
              </button>

              {/* 5. Shop Return */}
              <button
                onClick={() => handleAction('/returns')}
                className="p-3.5 rounded-2xl border border-purple-200 bg-[#F5F3FF] hover:bg-purple-100/70 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-purple-950 block">مرتجع من محل</span>
                  <span className="text-[10px] text-purple-700">إعادة للمخزن وخصم دين</span>
                </div>
              </button>

              {/* 6. Gold Scrap */}
              <button
                onClick={() => handleAction('/gold-scrap')}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">ذهب الكسر والسبائك</span>
                  <span className="text-[10px] text-slate-500">جرد وتصريف الكسر</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
