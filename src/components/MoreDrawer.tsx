import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Factory, 
  Undo2, 
  Package, 
  Scale, 
  PlusCircle, 
  RotateCcw, 
  Flame, 
  Download, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  X,
  Sparkles,
  Database,
  ShieldCheck,
  Building2,
  PhoneCall
} from 'lucide-react';
import { usePwa } from '../lib/usePwa';
import { useAppStore } from '../lib/useAppStore';
import { BackupRestoreModal } from './BackupRestoreModal';
import { SeedConfirmModal } from './SeedConfirmModal';

interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoreDrawer({ isOpen, onClose }: MoreDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isInstallable, isInstalled, isOnline, promptInstall } = usePwa();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);

  if (!isOpen) return null;

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const moreItems = [
    {
      title: 'عمليات الذهب والمخزن',
      items: [
        { path: '/market-gold', label: 'ذهب السوق (المحلات)', desc: 'متابعة الذهب المستحق بالعيارات', icon: Scale, color: 'text-amber-600 bg-amber-50' },
        { path: '/inventory', label: 'مخزون الذهب الجاهز', desc: 'تتبع الدفعات والأوزان المتاحة', icon: Package, color: 'text-blue-600 bg-blue-50' },
        { path: '/receive-workshop', label: 'استلام بضاعة من ورشة', desc: 'قيد سند الاستلام وإثبات الأجور', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50' },
        { path: '/gold-scrap', label: 'ذهب الكسر والسبائك', desc: 'مخزن الكسر الفعلي والتحويل', icon: Flame, color: 'text-amber-700 bg-amber-50' },
      ]
    },
    {
      title: 'إدارة الورش والمرتجعات',
      items: [
        { path: '/workshops', label: 'إدارة الورش المصنعة', desc: 'أرصدة الذهب وأجور التصنيع', icon: Factory, color: 'text-slate-700 bg-slate-100' },
        { path: '/workshop-returns', label: 'مرتجع للورشة المصنعة', desc: 'إرجاع بضاعة وإلغاء الأجور', icon: Undo2, color: 'text-purple-700 bg-purple-50' },
        { path: '/returns', label: 'مرتجع بضاعة من محل', desc: 'إعادة للمخزن وخصم المديونية', icon: RotateCcw, color: 'text-purple-600 bg-purple-50' },
      ]
    }
  ];

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-[#091225]/60 backdrop-blur-xs transition-opacity" 
          onClick={onClose} 
        />

        {/* Bottom Sheet Modal */}
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl z-10 overflow-hidden border border-[#DDE4EC]">
          {/* Sheet Handle (Mobile) */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#DDE4EC] flex justify-between items-center bg-[#0F1B33] text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7E5] text-[#C88918] flex items-center justify-center font-bold">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">المزيد من العمليات والخدمات</h3>
                <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                  {isOnline ? (
                    <span className="text-emerald-400 flex items-center gap-1"><Wifi className="w-3 h-3" /> متصل بالإنترنت</span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1"><WifiOff className="w-3 h-3" /> وضع عدم الاتصال (PWA محلي)</span>
                  )}
                </p>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* PWA Install Banner */}
            {isInstallable && !isInstalled && (
              <div className="bg-[#FFF7E5] border border-[#E49A0A] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E49A0A] text-[#091225] flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#091225]">تثبيت تطبيق إدارة الذهب</h4>
                    <p className="text-[10px] text-slate-600">لتشغيل سريع ومستقل دون متصفح</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await promptInstall();
                    onClose();
                  }}
                  className="bg-[#0F1B33] text-white px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 hover:bg-[#091225] transition-all cursor-pointer"
                >
                  تثبيت الآن
                </button>
              </div>
            )}

            {/* Grouped Nav Items */}
            {moreItems.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  {group.title}
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          isActive 
                            ? 'bg-[#FFF7E5] border-[#E49A0A] text-[#091225] shadow-xs' 
                            : 'bg-white border-[#DDE4EC] hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{item.label}</div>
                            <div className="text-[10px] text-slate-500">{item.desc}</div>
                          </div>
                        </div>
                        {isActive && (
                          <CheckCircle2 className="w-4 h-4 text-[#E49A0A]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quick Actions Footer inside Drawer */}
            <div className="pt-2 border-t border-[#DDE4EC] grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowBackupModal(true)}
                className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-blue-700" />
                النسخ والاسترجاع
              </button>

              <button
                onClick={() => setShowSeedModal(true)}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C88918]" />
                بيانات تجريبية
              </button>
            </div>
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
    </>
  );
}

