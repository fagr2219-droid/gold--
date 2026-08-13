import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Truck, 
  Coins, 
  Store, 
  MoreHorizontal
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

export function MobileBottomNav({ onOpenMore }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'الرئيسية', icon: LayoutDashboard },
    { path: '/distribution', label: 'التوزيع', icon: Truck },
    { path: '/collections', label: 'التحصيل', icon: Coins },
    { path: '/shops', label: 'المحلات', icon: Store },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#DDE4EC] shadow-[0_-4px_20px_rgba(15,27,51,0.06)] md:hidden">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-150 cursor-pointer active:scale-95 ${
                isActive 
                  ? 'text-[#C88918]' 
                  : 'text-[#667085] hover:text-[#101828]'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-[#FFF7E5]' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              </div>
              <span className={`text-[11px] font-bold mt-0.5 tracking-tight ${isActive ? 'text-[#091225]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Button */}
        <button
          onClick={onOpenMore}
          className="flex-1 flex flex-col items-center justify-center py-1 transition-all duration-150 text-[#667085] hover:text-[#101828] cursor-pointer active:scale-95"
        >
          <div className="p-1 rounded-xl">
            <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
          </div>
          <span className="text-[11px] font-bold mt-0.5 tracking-tight">
            المزيد
          </span>
        </button>
      </div>
    </nav>
  );
}
