import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  Menu, 
  PlusCircle, 
  Undo2, 
  Truck, 
  RotateCcw, 
  Coins, 
  ChevronDown, 
  ChevronRight,
  Scale, 
  Flame,
  UserCircle,
  Download,
  Wifi,
  WifiOff,
  Sparkles,
  Database,
  LogOut
} from 'lucide-react';
import { usePwa } from '../lib/usePwa';
import { useAppStore } from '../lib/useAppStore';
import { BackupRestoreModal } from './BackupRestoreModal';
import { SeedConfirmModal } from './SeedConfirmModal';

interface TopAppBarProps {
  onToggleMobileMenu?: () => void;
}

export function TopAppBar({ onToggleMobileMenu }: TopAppBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isOnline, isInstallable, isInstalled, promptInstall } = usePwa();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);

  // Short page titles for mobile app bar
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'لوحة القيادة';
      case '/market-gold': return 'ذهب السوق';
      case '/workshops': return 'الورش المصنعة';
      case '/workshop-returns': return 'مرتجع للورشة';
      case '/shops': return 'دليل المحلات';
      case '/receive-workshop': return 'استلام من ورشة';
      case '/inventory': return 'ذهب المخزون';
      case '/distribution': return 'توزيع لمحل';
      case '/returns': return 'مرتجع من محل';
      case '/collections': return 'سند تحصيل وقبض';
      case '/gold-scrap': return 'ذهب الكسر';
      default: return 'إدارة الذهب';
    }
  };

  const isSubPage = location.pathname !== '/';

  return (
    <>
      <header className="bg-[#0F1B33] text-white border-b border-[#091225] flex justify-between items-center w-full px-4 sm:px-6 h-14 sm:h-16 z-30 shrink-0 select-none">
        {/* Left (RTL Start) on Mobile: Menu / Back + Title */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Back Button on Mobile if on subpage */}
          {isSubPage && (
            <button
              onClick={() => navigate(-1)}
              className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="رجوع"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Page Title & Breadcrumb */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {getPageTitle()}
              </h2>
              {!isOnline && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                  <WifiOff className="w-3 h-3" /> محلي
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#E49A0A] hidden sm:block">
              نظام الإدارة والتوزيع المحاسبي
            </p>
          </div>
        </div>

        {/* Right (RTL End): Actions, Quick Movement, Install PWA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button (Desktop/Tablet) */}
          {isInstallable && !isInstalled && (
            <button
              onClick={promptInstall}
              className="hidden sm:flex bg-[#FFF7E5] hover:bg-[#FFEEC2] text-[#091225] px-3 py-1.5 rounded-xl font-bold text-xs items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#C88918]" />
              <span>تثبيت التطبيق</span>
            </button>
          )}

          {/* Quick Movement Dropdown (Desktop) */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="bg-[#E49A0A] hover:bg-[#C88918] text-[#091225] px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.2]" />
              <span>حركة جديدة</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {showQuickMenu && (
              <div 
                className="absolute left-0 top-full mt-2 w-56 bg-white text-[#101828] rounded-2xl shadow-2xl border border-[#DDE4EC] p-2 z-50 animate-in fade-in slide-in-from-top-2"
                onMouseLeave={() => setShowQuickMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">عمليات الورش</div>
                <button
                  onClick={() => { navigate('/receive-workshop'); setShowQuickMenu(false); }}
                  className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#EAFBF4] hover:text-emerald-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <PlusCircle className="w-3.5 h-3.5" />
                  </div>
                  <span>استلام بضاعة من ورشة</span>
                </button>
                <button
                  onClick={() => { navigate('/workshop-returns'); setShowQuickMenu(false); }}
                  className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#F5F3FF] hover:text-purple-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Undo2 className="w-3.5 h-3.5" />
                  </div>
                  <span>مرتجع للورشة المصنعة</span>
                </button>

                <div className="my-1.5 border-t border-[#DDE4EC]" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">عمليات المحلات والسوق</div>

                <button
                  onClick={() => { navigate('/distribution'); setShowQuickMenu(false); }}
                  className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#EEF4FF] hover:text-blue-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <span>توزيع لمحلات</span>
                </button>
                <button
                  onClick={() => { navigate('/returns'); setShowQuickMenu(false); }}
                  className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#F5F3FF] hover:text-purple-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <span>مرتجع بضاعة من محل</span>
                </button>
                <button
                  onClick={() => { navigate('/collections'); setShowQuickMenu(false); }}
                  className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#FFF7E5] hover:text-amber-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-[#FFF7E5] text-[#C88918] flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <span>سند قبض وتحصيل</span>
                </button>
              </div>
            )}
          </div>

          {/* Backup & Restore Hub Button */}
          <button
            onClick={() => setShowBackupModal(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="مركز النسخ الاحتياطي واسترجاع البيانات"
          >
            <Database className="w-4 h-4 text-[#E49A0A]" />
            <span className="hidden lg:inline text-xs">النسخ والاسترجاع</span>
          </button>

          {/* Demo Seed Data Quick Action */}
          <button
            onClick={() => setShowSeedModal(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="تحميل بيانات تجريبية (مع تأكيد الأمان)"
          >
            <Sparkles className="w-4 h-4 text-[#E49A0A]" />
          </button>

          {/* User Profile & Sign Out */}
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-300 transition-all cursor-pointer group"
            title="تسجيل الخروج"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E49A0A] to-[#C88918] flex items-center justify-center text-[#091225] text-xs font-black">
              {user?.email?.charAt(0).toUpperCase() || '؟'}
            </div>
            <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </header>

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

