import React, { useState } from 'react';
import { calculatePureWeight, convertPureToKarat } from '../lib/accounting';
import { formatWeight } from '../lib/utils';
import { RefreshCw, ArrowRight, Scale } from 'lucide-react';
import { Karat } from '../types';

export default function GoldScrap() {
  const [sourceWeight, setSourceWeight] = useState(0);
  const [sourceKarat, setSourceKarat] = useState<Karat>(18);
  const [targetKarat, setTargetKarat] = useState<Karat>(21);

  const pureWeight = calculatePureWeight(sourceWeight, sourceKarat);
  const targetWeight = convertPureToKarat(pureWeight, targetKarat);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">تحويل العيارات والكسر</h2>
        <p className="text-slate-500 text-sm">حساب الأوزان المكافئة بدقة هندسية.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-6 items-center">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Scale className="w-4 h-4 text-amber-600" />
            الذهب المصدر
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">الوزن الحالي</label>
              <div className="relative">
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-4 px-4 text-3xl font-mono font-bold text-slate-800 text-center outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  type="number"
                  value={sourceWeight}
                  onChange={(e) => setSourceWeight(Number(e.target.value))}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">G</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">العيار الحالي</label>
              <div className="flex gap-2">
                {[18, 21, 22, 24].map(k => (
                  <button 
                    key={k}
                    onClick={() => setSourceKarat(k as Karat)}
                    className={`flex-1 py-2 rounded-lg border font-bold transition-all text-sm ${
                      sourceKarat === k ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20 animate-pulse">
            <RefreshCw className="w-6 h-6" />
          </div>
          <ArrowRight className="w-6 h-6 text-slate-300 rotate-90 md:rotate-0" />
        </div>

        <div className="bg-slate-900 p-6 rounded-xl shadow-xl text-white space-y-6 border border-slate-800">
          <h3 className="font-bold text-sm flex items-center gap-2 text-amber-500 border-b border-white/10 pb-3">
            <Scale className="w-4 h-4" />
            الوزن المكافئ
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">العيار المستهدف</label>
              <div className="flex gap-2">
                {[18, 21, 22, 24].map(k => (
                  <button 
                    key={k}
                    onClick={() => setTargetKarat(k as Karat)}
                    className={`flex-1 py-2 rounded-lg border font-bold transition-all text-xs ${
                      targetKarat === k ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
               <div className="flex justify-between items-center mb-4 bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">الذهب الخالص (24)</span>
                  <span className="font-mono font-bold text-green-400 text-lg">{formatWeight(pureWeight)} <small className="text-[10px]">G</small></span>
               </div>
               <div className="text-center mt-6">
                 <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">الوزن المعادل لعيار {targetKarat}</p>
                 <div className="text-5xl font-mono font-black text-amber-400 drop-shadow-lg" dir="ltr">
                    {formatWeight(targetWeight)}
                    <span className="text-xl ml-2 font-normal opacity-50">g</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
