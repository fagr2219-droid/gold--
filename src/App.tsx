import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SideNavBar } from './components/SideNavBar';
import { TopAppBar } from './components/TopAppBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MoreDrawer } from './components/MoreDrawer';
import { QuickActionFAB } from './components/QuickActionFAB';
import Dashboard from './pages/Dashboard';
import ReceiveFromWorkshop from './pages/ReceiveFromWorkshop';
import Workshops from './pages/Workshops';
import Shops from './pages/Shops';
import Inventory from './pages/Inventory';
import DistributionToShop from './pages/DistributionToShop';
import Returns from './pages/Returns';
import Collections from './pages/Collections';
import GoldScrap from './pages/GoldScrap';
import MarketGold from './pages/MarketGold';
import WorkshopReturns from './pages/WorkshopReturns';

function AppContent() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Restore last visited route on first launch if standalone
  useEffect(() => {
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      if (isStandalone && location.pathname === '/') {
        const lastRoute = localStorage.getItem('gold_last_route');
        if (lastRoute && lastRoute !== '/') {
          navigate(lastRoute, { replace: true });
        }
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex text-[#101828]" dir="rtl">
      {/* Side Navigation (Desktop Fixed & Mobile Drawer) */}
      <SideNavBar 
        mobileOpen={mobileDrawerOpen} 
        onCloseMobile={() => setMobileDrawerOpen(false)} 
      />

      {/* Main Container */}
      <div className="flex-1 md:mr-[260px] flex flex-col min-h-screen overflow-x-hidden">
        <TopAppBar onToggleMobileMenu={() => setMobileDrawerOpen(true)} />

        <main className="flex-1 p-3.5 sm:p-5 md:p-6 pb-28 md:pb-12 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/market-gold" element={<MarketGold />} />
            <Route path="/workshops" element={<Workshops />} />
            <Route path="/workshop-returns" element={<WorkshopReturns />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/receive-workshop" element={<ReceiveFromWorkshop />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/distribution" element={<DistributionToShop />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/gold-scrap" element={<GoldScrap />} />
            <Route path="*" element={
              <div className="p-12 text-center card-base max-w-md mx-auto my-12">
                <p className="text-slate-500 font-bold text-sm">الصفحة غير موجودة أو قيد التطوير</p>
                <button 
                  onClick={() => navigate('/')} 
                  className="mt-4 btn-gold text-xs"
                >
                  العودة للرئيسية
                </button>
              </div>
            } />
          </Routes>
        </main>
      </div>

      {/* Mobile Floating Action Button */}
      <QuickActionFAB />

      {/* Mobile Bottom Navigation Bar (5 Items) */}
      <MobileBottomNav onOpenMore={() => setMoreDrawerOpen(true)} />

      {/* Mobile 'More' Drawer */}
      <MoreDrawer 
        isOpen={moreDrawerOpen} 
        onClose={() => setMoreDrawerOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
