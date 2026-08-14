import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Factory, 
  Users, 
  Package, 
  Truck, 
  Coins, 
  RotateCcw, 
  Scale, 
  Undo2,
  Flame,
  PlusCircle,
  Download,
  X,
  Sparkles,
  Wifi,
  WifiOff,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePwa } from '../lib/usePwa';
import { useAppStore } from '../lib/useAppStore';

const navSections = [
  {
    title: 'العمليات الأساسية',
    items: [
      { path: '/', label: 'لوحة القيادة', icon: LayoutDashboard },
      { path: '/market-gold', label: 'ذهب السوق', icon: Scale },
      { path: '/distribution', label: 'توزيع للمحلات', icon: Truck },
      { path: '/collections', label: 'تحصيل وقبض', icon: Coins },
      { path: '/inventory', label: 'ذهب المخزون', icon: Package },
    ]
  },
  {
    title: 'الورش والمرتجعات',
    items: [
      { path: '/receive-workshop', label: 'استلام من ورشة', icon: PlusCircle },
      { path: '/workshops', label: 'حسابات الورش', icon: Factory },
      { path: '/workshop-returns', label: 'مرتجع للورشة', icon: Undo2 },
      { path: '/returns', label: 'مرتجع من محل', icon: RotateCcw },
      { path: '/gold-scrap', label: 'ذهب الكسر', icon: Flame },
      { path: '/shops', label: 'دليل المحلات', icon: Users },
    ]
  },
  {
    title: 'الهوية والسندات',
    items: [
      { path: '/voucher-settings', label: 'بياناتي وهوية السند', icon: FileText },
    ]
  }
];

interface SideNavBarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function SideNavBar({ mobileOpen = false, onCloseMobile }: SideNavBarProps) {
  const { isInstallable, isInstalled, promptInstall, isOnline } = usePwa();
  const { seedData } = useAppStore();
  const navigate = useNavigate();

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0F1B33] text-white border-l border-[#091225]">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] via-[#E49A0A] to-[#C88918] flex items-center justify-center text-[#091225] font-black text-lg shadow-md shadow-[#C88918]/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight">إدارة الذهب</h1>
            <p className="text-[11px] text-[#E49A0A] font-medium">نظام توزيع المجوهرات</p>
          </div>
        </div>
        {mobileOpen && onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 hover:text-white flex items-center justify-center md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-5">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-160 text-xs font-bold select-none",
                  isActive 
                    ? "bg-[#FFF7E5] text-[#091225] shadow-xs" 
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#C88918]" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="mr-auto w-1.5 h-1.5 rounded-full bg-[#C88918]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer / PWA & Backup Status */}
      <div className="p-4 border-t border-white/10 bg-[#091225]/60 space-y-2.5">
        {isInstallable && !isInstalled && (
          <button
            onClick={promptInstall}
            className="w-full bg-[#FFF7E5] hover:bg-[#FFEEC2] text-[#091225] p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-[#C88918]" />
            تثبيت التطبيق (PWA)
          </button>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1">
            {isOnline ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                متصل
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                محلي (بدون نت)
              </span>
            )}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">v2.5.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block fixed top-0 right-0 h-full w-[260px] z-40 shadow-xl">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div 
            className="fixed inset-0 bg-[#091225]/70 backdrop-blur-xs transition-opacity" 
            onClick={onCloseMobile} 
          />
          <div className="relative w-[280px] h-full shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
