import React from 'react';
import { Truck, ShieldCheck, Award, Globe2, Phone, Mail, MapPin } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
  openAuthModal: (mode: 'login' | 'register') => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab, openAuthModal }) => {
  return (
    <footer className="bg-[#0b132b] text-gray-300 pt-16 pb-12 border-t border-[#1c2541]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-gray-800">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-black text-white tracking-tight">
                  CARGO <span className="text-blue-500">LOGISTICS</span>
                </span>
                <p className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                  International Express Cargo System
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed pr-6">
              Premier international air cargo freight forwarder, express intermodal logistics,
              and bonded customs clearing network operating across 220+ worldwide destination ports.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1c2541] text-xs text-gray-300 border border-gray-700/60">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>IATA Cargo C-TPAT Certified</span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1c2541] text-xs text-gray-300 border border-gray-700/60">
                <Award className="w-4 h-4 text-amber-400" />
                <span>ISO 9001:2026 Quality</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <button onClick={() => setActiveTab('services')} className="hover:text-blue-400 transition-colors">
                  Air Cargo Express Charter
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('services')} className="hover:text-blue-400 transition-colors">
                  Ocean Freight & Intermodal
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('services')} className="hover:text-blue-400 transition-colors">
                  Customs Duty & Clearance
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('services')} className="hover:text-blue-400 transition-colors">
                  Temperature-Controlled Pharma
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('services')} className="hover:text-blue-400 transition-colors">
                  Heavy Machinery & Out-of-Gauge
                </button>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Portals & Tracking</h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <button onClick={() => setActiveTab('track')} className="hover:text-blue-400 transition-colors">
                  Live Consignment Tracking
                </button>
              </li>
              <li>
                <button onClick={() => openAuthModal('login')} className="hover:text-blue-400 transition-colors">
                  Customer Account Login
                </button>
              </li>
              <li>
                <button onClick={() => openAuthModal('register')} className="hover:text-blue-400 transition-colors">
                  New Customer Registration
                </button>
              </li>
              <li>
                <button onClick={() => openAuthModal('login')} className="hover:text-amber-400 text-amber-400/90 transition-colors font-medium">
                  Sub Admin Access
                </button>
              </li>
              <li>
                <button onClick={() => openAuthModal('login')} className="hover:text-amber-400 text-amber-400/90 transition-colors font-medium">
                  Super Admin Management
                </button>
              </li>
            </ul>
          </div>

          {/* Global Hubs & Contact */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Global Dispatch</h4>
            <ul className="space-y-3 text-xs text-gray-400">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Cargo Terminal 4, JFK International Airport, New York, NY 11430</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>+1 (800) 555-CARGO (24/7)</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>dispatch@internationalexpresscargo.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <Globe2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Global Transit Network: London • Frankfurt • Dubai • Singapore</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 space-y-4 md:space-y-0">
          <div>
            © {new Date().getFullYear()} International Express Cargo. All rights reserved. Worldwide logistics carrier network.
          </div>
          <div className="flex items-center space-x-6 text-gray-400">
            <span>Bill of Lading Terms</span>
            <span>Customs Valuation Policy</span>
            <span>Security Regulations</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
