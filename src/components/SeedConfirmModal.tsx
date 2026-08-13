import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  X, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { useAppStore } from '../lib/useAppStore';

interface SeedConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SeedConfirmModal({ isOpen, onClose, onSuccess }: SeedConfirmModalProps) {
  const { seedData, workshops, shops, inventory, transactions } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const currentCount = workshops.length + shops.length + inventory.length + transactions.length;

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await seedData();
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      console.error('Failed to seed data:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#091225]/75 backdrop-blur-xs" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border border-[#DDE4EC] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0F1B33] text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7E5] text-[#C88918] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">تحميل البيانات النموذجية والتجريبية</h3>
              <p className="text-[11px] text-slate-300">تأكيد استبدال البيانات</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-amber-950 space-y-1">
              <span className="font-bold text-sm block">تنبيه هام</span>
              <p className="leading-relaxed">
                سيقوم هذا الإجراء باستبدال البيانات الحالية بسجلات نموذجية (ورشة الأمل الماسية، محل الزمرد، ودفعة محابس عيار 21).
              </p>
            </div>
          </div>

          {/* Safety guarantee */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-emerald-950 space-y-1">
              <span className="font-bold text-xs block">حماية البيانات والتراجع التلقائي</span>
              <p className="text-[11px] leading-relaxed text-emerald-900">
                سيتكفل النظام تلقائياً بحفظ نسخة أمان احتياطية كاملة من بياناتك الحالية ({currentCount} سجل) في ذاكرة المتصفح، لتتمكن من استرجاعها فوراً في أي وقت بضغطة زر واحدة.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#DDE4EC] bg-[#F8FAFC] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="btn-gold px-5 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'جاري التحميل...' : 'متابعة وتحميل البيانات'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
