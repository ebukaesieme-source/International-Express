import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PublicHome } from './pages/PublicHome';
import { ServicesPage } from './pages/ServicesPage';
import { FleetPage } from './pages/FleetPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SubAdminDashboard } from './pages/SubAdminDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { AuthModal } from './pages/AuthModal';
import { TrackingSection } from './components/TrackingSection';
import { X, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const { userProfile, isSuperAdmin, isSubAdmin, isCustomer } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackSearchCode, setTrackSearchCode] = useState('IEC-748920-EXP');

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenTrack = (code?: string) => {
    if (code) setTrackSearchCode(code);
    setTrackModalOpen(true);
  };

  const handleNavigateTrack = (code: string) => {
    setTrackSearchCode(code);
    setActiveTab('track');
  };

  const renderContent = () => {
    // Protected Routes
    if (activeTab === 'super_admin') {
      if (!isSuperAdmin) {
        return (
          <div className="py-24 max-w-lg mx-auto text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Restricted Administration Access</h2>
            <p className="text-xs text-gray-500 mt-2 mb-6">
              You must authenticate with authorized Super Administrator credentials to view this area.
            </p>
            <button
              onClick={() => openAuth('login')}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Sign In as Super Admin
            </button>
          </div>
        );
      }
      return <SuperAdminDashboard />;
    }

    if (activeTab === 'sub_admin') {
      if (!isSubAdmin && !isSuperAdmin) {
        return (
          <div className="py-24 max-w-lg mx-auto text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Dispatcher Portal Access</h2>
            <p className="text-xs text-gray-500 mt-2 mb-6">
              This station is designated for licensed Sub Admin dispatch leads.
            </p>
            <button
              onClick={() => openAuth('login')}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Sign In to Dispatch
            </button>
          </div>
        );
      }
      return <SubAdminDashboard />;
    }

    if (activeTab === 'customer') {
      if (!userProfile) {
        return (
          <div className="py-24 max-w-lg mx-auto text-center px-4">
            <h2 className="text-2xl font-black text-gray-900">Customer Consignee Portal</h2>
            <p className="text-xs text-gray-500 mt-2 mb-6">
              Sign in to manage your active air cargo waybills, settle customs tariffs, and message your dispatcher.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => openAuth('login')}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuth('register')}
                className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Register Customer Account
              </button>
            </div>
          </div>
        );
      }
      return <CustomerDashboard />;
    }

    // Public Pages
    switch (activeTab) {
      case 'services':
        return <ServicesPage openAuthModal={openAuth} openTrackModal={() => setTrackModalOpen(true)} />;
      case 'fleet':
        return <FleetPage />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      case 'track':
        return (
          <div className="py-12 bg-slate-50 min-h-screen">
            <TrackingSection initialTrackingNumber={trackSearchCode} />
          </div>
        );
      case 'home':
      default:
        return (
          <PublicHome
            setActiveTab={setActiveTab}
            openAuthModal={openAuth}
            openTrackModal={() => handleOpenTrack()}
            onTrackCode={handleNavigateTrack}
          />
        );
    }
  };

  // Route directly to respective user dashboard on login or session load
  React.useEffect(() => {
    if (userProfile?.role) {
      if (userProfile.role === 'super_admin' && activeTab !== 'super_admin') {
        setActiveTab('super_admin');
      } else if (userProfile.role === 'sub_admin' && activeTab !== 'sub_admin') {
        setActiveTab('sub_admin');
      } else if (userProfile.role === 'customer' && activeTab !== 'customer') {
        setActiveTab('customer');
      }
    } else {
      // If user logs out, return to public homepage
      setActiveTab((prev) =>
        prev === 'super_admin' || prev === 'sub_admin' || prev === 'customer' ? 'home' : prev
      );
    }
  }, [userProfile?.role, userProfile?.uid]);

  const isDashboardView =
    activeTab === 'super_admin' || activeTab === 'sub_admin' || activeTab === 'customer';

  // Do not show public website navbar when logged in inside user dashboard
  const showPublicNavbar = !isDashboardView && !userProfile;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Public Header: hidden inside user dashboard and when user is logged in */}
      {showPublicNavbar && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openAuthModal={openAuth}
          openTrackModal={() => handleOpenTrack()}
        />
      )}

      {/* Main Content */}
      <main className="flex-1">{renderContent()}</main>

      {/* Public Footer (only show on public pages) */}
      {!isDashboardView && !userProfile && (
        <Footer setActiveTab={setActiveTab} openAuthModal={openAuth} />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
        onSuccessNavigate={(tab) => setActiveTab(tab)}
      />

      {/* Quick Track Modal */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative overflow-hidden animate-fadeIn">
            <div className="absolute right-4 top-4 z-10">
              <button
                onClick={() => setTrackModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <TrackingSection
              initialTrackingNumber={trackSearchCode}
              isModal={true}
              onClose={() => setTrackModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
