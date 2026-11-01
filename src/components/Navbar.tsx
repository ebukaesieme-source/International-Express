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
  Search,
  Home,
  Plane,
  Building2,
  ChevronRight,
  Globe,
  ArrowRight
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
  const { userProfile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTrackInput, setMobileTrackInput] = useState('');

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

  const homePages = [
    {
      num: '01',
      id: 'home',
      name: 'Home',
      icon: Home,
      description: 'Global cargo freighters, live waybill search & network metrics'
    },
    {
      num: '02',
      id: 'services',
      name: 'Services',
      icon: Layers,
      description: 'Boeing 747 air freight, ocean containers & bonded customs clearance'
    },
    {
      num: '03',
      id: 'fleet',
      name: 'Fleet & Network',
      icon: Plane,
      description: 'Scheduled cargo freighters, global corridors & airport ramp facilities'
    },
    {
      num: '04',
      id: 'track',
      name: 'Track Cargo',
      icon: Search,
      description: 'Live cargo telemetry, checkpoint inspection photos & progress tracker',
      action: () => {
        if (openTrackModal) openTrackModal();
        else setActiveTab('track');
      }
    },
    {
      num: '05',
      id: 'about',
      name: 'About Us',
      icon: Building2,
      description: 'Certified intercontinental logistics carrier operating across 220+ territories'
    },
    {
      num: '06',
      id: 'contact',
      name: 'Contact & Dispatch',
      icon: PhoneCall,
      description: '24/7 round-the-clock air cargo operations & emergency shipment support'
    }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs">
      {/* Top micro announcement bar */}
      <div className="bg-[#0b132b] text-gray-300 text-xs px-3 sm:px-6 py-1.5 sm:py-2 flex justify-between items-center border-b border-[#1c2541]">
        <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] truncate">
          <span className="flex items-center space-x-1 font-bold text-amber-400 shrink-0">
            <Shield className="w-3.5 h-3.5" />
            <span className="truncate">Official Carrier Portal</span>
          </span>
          <span className="hidden md:inline text-gray-500">|</span>
          <span className="hidden md:flex items-center space-x-1 text-gray-300">
            <PhoneCall className="w-3 h-3 text-blue-400" />
            <span>24/7 Global Dispatch: +1 (800) 555-CARGO</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-gray-400 shrink-0">
          <span className="hidden xs:inline">IATA C-TPAT Certified</span>
          <span className="hidden xs:inline text-gray-600">•</span>
          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Flight Ops Live</span>
          </span>
        </div>
      </div>

      {/* Main Navbar - Compact Sleek Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Logo */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-2 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#4f46e5] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-black tracking-tight text-gray-900 flex items-center space-x-1 leading-tight">
                <span>CARGO</span>
                <span className="text-blue-600">LOGISTICS</span>
              </div>
              <p className="text-[8px] sm:text-[9px] tracking-widest uppercase font-semibold text-gray-400 leading-none">
                International Express
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (Visible on desktop lg+) */}
          <nav className="hidden lg:flex items-center space-x-5 xl:space-x-7">
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

          {/* Desktop Right Action Cluster (Visible on desktop lg+) */}
          <div className="hidden lg:flex items-center space-x-4">
            <LanguageSelector />

            {userProfile ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab(getDashboardTab())}
                  className="flex items-center space-x-2 bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
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
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="text-xs font-bold text-gray-700 hover:text-blue-600 px-3 py-1.5 cursor-pointer transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Action Cluster with Direct Login & 3-Line Hamburger Menu Button (Visible on < lg) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 lg:hidden">
            {/* Compact Language Selector */}
            <LanguageSelector />

            {/* Direct Login Button on Mobile Bar for instant 1-tap sign-in */}
            {!userProfile && (
              <button
                onClick={() => openAuthModal('login')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
              >
                Login
              </button>
            )}

            {/* 3 SIGN DIGITS LINE (3-Line Hamburger Menu Button) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
              title="Click to see all top home pages"
              aria-label="Toggle navigation menu with all top home pages"
            >
              {mobileMenuOpen ? (
                <>
                  <X className="w-4 h-4 text-white" />
                  <span className="text-xs font-bold">Close</span>
                </>
              ) : (
                <>
                  {/* 3 sign digits line icon: 3 horizontal lines */}
                  <div className="flex flex-col justify-center space-y-1 w-4 h-4 shrink-0">
                    <span className="block h-0.5 w-full bg-white rounded-full"></span>
                    <span className="block h-0.5 w-full bg-white rounded-full"></span>
                    <span className="block h-0.5 w-full bg-white rounded-full"></span>
                  </div>
                  <span className="text-xs font-bold">Pages</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Full-Screen Overlay Menu - Shows ALL Top Home Pages and Login/Register */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex flex-col justify-start p-3 sm:p-5">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full mx-auto my-auto overflow-hidden flex flex-col p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header in Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
                  <Menu className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 leading-tight">
                    Top Home Navigation Pages
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Browse all portal features & account login
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors cursor-pointer shrink-0"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* PROMINENT LOGIN & REGISTER BAR (AT VERY TOP FOR EASY ACCESS) */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 rounded-2xl border border-blue-200/80 shrink-0">
              {userProfile ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {userProfile.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {userProfile.fullName}
                        </div>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${getRoleBadgeStyle()}`}>
                          {getRoleLabel()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await logout();
                        setMobileMenuOpen(false);
                        setActiveTab('home');
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab(getDashboardTab());
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-[#0b132b] hover:bg-[#1c2541] text-white py-2.5 rounded-xl text-xs font-bold text-center shadow-md flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                  >
                    <span>Open {getRoleLabel()} Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-950 flex items-center space-x-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span>Account Portal & Access</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">Consignee & Dispatch</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        openAuthModal('login');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-center py-2.5 text-xs font-black text-gray-800 bg-white hover:bg-slate-100 border border-gray-200 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Sign In / Login
                    </button>
                    <button
                      onClick={() => {
                        openAuthModal('register');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-center py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
                    >
                      Register
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of ALL Top Home Pages */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 block">
                Top Navigation Pages (Ordered 01 - 06)
              </span>

              {homePages.map((page) => {
                const IconComponent = page.icon;
                const isCurrent = activeTab === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => {
                      if (page.action) {
                        page.action();
                      } else {
                        setActiveTab(page.id);
                      }
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50/90 border border-blue-500 shadow-xs'
                        : 'bg-slate-50/80 hover:bg-slate-100 border border-gray-200/80'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded shrink-0">
                        {page.num}
                      </span>
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold flex items-center space-x-1.5 ${
                          isCurrent ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          <span className="truncate">{page.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-blue-600 text-white shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">
                          {page.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ml-2 ${
                      isCurrent ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Quick Waybill Search Bar Inside Mobile Drawer */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Instant Waybill Checkpoint Track
              </span>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={mobileTrackInput}
                    onChange={(e) => setMobileTrackInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (openTrackModal) openTrackModal();
                        else setActiveTab('track');
                        setMobileMenuOpen(false);
                      }
                    }}
                    placeholder="e.g. IEC-748920-EXP"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono uppercase"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={() => {
                    if (openTrackModal) openTrackModal();
                    else setActiveTab('track');
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                >
                  Track
                </button>
              </div>
            </div>

            {/* 24/7 Dispatch Hotline */}
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-blue-900 font-bold">
                <PhoneCall className="w-4 h-4 text-blue-600 shrink-0" />
                <span>24/7 Global Air Cargo Helpline</span>
              </div>
              <a
                href="tel:+18005552274"
                className="font-mono font-bold text-blue-700 hover:underline"
              >
                +1 (800) 555-CARGO
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

