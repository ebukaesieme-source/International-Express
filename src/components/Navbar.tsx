import React, { useState } from 'react';
import {
  Truck,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  Package,
  Layers,
  Sparkles,
  PhoneCall,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './LanguageSelector';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
  openTrackModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openAuthModal,
  openTrackModal,
}) => {
  const { userProfile, logout, quickLoginAsRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const getDashboardTab = () => {
    if (!userProfile) return 'home';
    if (userProfile.role === 'super_admin') return 'super_admin';
    if (userProfile.role === 'sub_admin') return 'sub_admin';
    return 'customer';
  };

  const getRoleLabel = () => {
    if (!userProfile) return '';
    if (userProfile.role === 'super_admin') return 'Super Admin';
    if (userProfile.role === 'sub_admin') return 'Sub Admin';
    return 'Customer';
  };

  const getRoleBadgeStyle = () => {
    if (!userProfile) return '';
    if (userProfile.role === 'super_admin') return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    if (userProfile.role === 'sub_admin') return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      {/* Top micro bar */}
      <div className="bg-[#0b132b] text-gray-300 text-xs px-4 py-2 flex flex-wrap justify-between items-center border-b border-[#1c2541]">
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1 font-medium text-amber-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Official Carrier Portal</span>
          </span>
          <span className="hidden md:inline text-gray-500">|</span>
          <span className="hidden md:flex items-center space-x-1 text-gray-300">
            <PhoneCall className="w-3 h-3 text-blue-400" />
            <span>24/7 Global Dispatch: +1 (800) 555-CARGO</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center space-x-4 text-[11px] text-gray-400">
          <span>IATA Cargo C-TPAT Certified</span>
          <span className="text-gray-600">•</span>
          <span>ISO 9001:2026 Quality</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - Matching screenshot style */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#4f46e5] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-gray-900 flex items-center space-x-1">
                <span>CARGO</span>
                <span className="text-blue-600">LOGISTICS</span>
              </div>
              <p className="text-[10px] tracking-widest uppercase font-semibold text-gray-400">
                International Express
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <button
              onClick={() => setActiveTab('home')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'home'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'services'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('fleet')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'fleet'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Fleet
            </button>
            <button
              onClick={() => {
                if (openTrackModal) openTrackModal();
                else setActiveTab('track');
              }}
              className={`text-sm font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                activeTab === 'track'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'about'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              About Us
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'contact'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Right Action Cluster */}
          <div className="hidden sm:flex items-center space-x-4">
            {/* Google Translate Selector */}
            <LanguageSelector />

            {/* Auth Buttons or User Profile */}
            {userProfile ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab(getDashboardTab())}
                  className="flex items-center space-x-2 bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeStyle()}`}>
                    {getRoleLabel()}
                  </span>
                  <span className="max-w-[120px] truncate">{userProfile.fullName}</span>
                </button>

                <button
                  onClick={async () => {
                    await logout();
                    setActiveTab('home');
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => openAuthModal('login')}
                  className="text-sm font-semibold text-gray-700 hover:text-blue-600 px-3 py-2 cursor-pointer transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex items-center space-x-2 sm:hidden">
            <LanguageSelector />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 hover:text-blue-600 rounded-md cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200 px-4 pt-3 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-gray-100">
            <button
              onClick={() => {
                setActiveTab('home');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Home
            </button>
            <button
              onClick={() => {
                setActiveTab('services');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Services
            </button>
            <button
              onClick={() => {
                setActiveTab('fleet');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Fleet
            </button>
            <button
              onClick={() => {
                setActiveTab('track');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Track Package
            </button>
            <button
              onClick={() => {
                setActiveTab('about');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              About Us
            </button>
            <button
              onClick={() => {
                setActiveTab('contact');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Contact Us
            </button>
          </div>

          {userProfile ? (
            <div className="pt-2 space-y-2">
              <div className="text-xs text-gray-500">
                Logged in as <strong className="text-gray-900">{userProfile.fullName}</strong> ({getRoleLabel()})
              </div>
              <button
                onClick={() => {
                  setActiveTab(getDashboardTab());
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-semibold text-center"
              >
                Go to {getRoleLabel()} Dashboard
              </button>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-red-600 bg-red-50 py-2 rounded-lg text-sm font-semibold text-center"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={() => {
                  openAuthModal('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  openAuthModal('register');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 text-sm font-semibold text-white bg-[#4f46e5] rounded-lg shadow-sm"
              >
                Create Account (Register)
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
