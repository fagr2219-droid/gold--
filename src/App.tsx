import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { SideNavBar } from './components/SideNavBar';
import { TopAppBar } from './components/TopAppBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MoreDrawer } from './components/MoreDrawer';
import { QuickActionFAB } from './components/QuickActionFAB';
import LoginPage from './pages/LoginPage';
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
import VoucherSettingsPage from './pages/VoucherSettingsPage';
import QuickDistSettlement from './pages/QuickDistSettlement';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
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

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl"
        style={{ background: 'linear-gradient(135deg, #091225 0%, #0F1B33 40%, #1a2744 70%, #091225 100%)' }}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #E49A0A, #C88918)' }}
          >
            <svg className="w-8 h-8 text-[#091225]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

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
            <Route path="/voucher-settings" element={<VoucherSettingsPage />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/receive-workshop" element={<ReceiveFromWorkshop />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/distribution" element={<DistributionToShop />} />
            <Route path="/quick-settlement" element={<QuickDistSettlement />} />
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
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
