import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  Search,
  Plane,
  Ship,
  Truck,
  Box,
  Globe,
  Award,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Headphones,
  Lock,
  Layers,
  Sparkles,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { TrackingSection } from '../components/TrackingSection';

interface PublicHomeProps {
  setActiveTab: (tab: string) => void;
  openAuthModal: (mode: 'login' | 'register') => void;
  openTrackModal: (code?: string) => void;
  onTrackCode?: (code: string) => void;
}

const FAQS = [
  {
    q: 'How does the International Express Cargo tracking system work?',
    a: 'Every consignment booked into our carrier system receives a unique 12-digit Air Waybill or Intermodal tracking code. Our satellite-linked dispatch telematics update milestone events in real time from origin package acceptance, airport departure, transshipment hubs, customs duties assessment, to final doorstep signed delivery.'
  },
  {
    q: 'How are customs duties and international tariffs handled?',
    a: 'Customs duties are automatically calculated by our bonded customs clearance officers based on destination country tariff classifications, harmonized system (HS) codes, and declared commercial invoice values. Customers can view their duties assessment and settle charges directly online via their dashboard or tracking page.'
  },
  {
    q: 'What cargo types and dimensions can be transported?',
    a: 'We operate dedicated Boeing 747-8F and Boeing 777F cargo freighters with capacity for standard pallets, out-of-gauge heavy machinery, temperature-sensitive pharmaceuticals (Cold Chain), automotive parts, and high-value electronics with continuous armed security escort protocols.'
  },
  {
    q: 'How do I communicate with my assigned logistics dispatcher?',
    a: 'Each registered consignee is paired with a dedicated regional Sub Admin dispatch officer. You can send real-time text messages, shipping document PDFs, packaging photographs, and cargo inspection videos directly from your customer portal.'
  }
];

export const PublicHome: React.FC<PublicHomeProps> = ({
  setActiveTab,
  openAuthModal,
  openTrackModal,
  onTrackCode
}) => {
  const [quickTrackCode, setQuickTrackCode] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HERO SECTION - Full unobstructed view of Boeing 747 air cargo freighter */}
      <section className="relative w-full overflow-hidden bg-slate-950">
        <div className="relative w-full h-[260px] sm:h-[380px] md:h-[480px] lg:h-[560px] xl:h-[620px] overflow-hidden">
          <img
            src="/assets/aistudio/image_feede8dc.png"
            alt="International Express Cargo Boeing 747 Freighter Aircraft on Airport Ramp"
            className="w-full h-full object-cover object-center filter brightness-[1.0] contrast-[1.02]"
          />
        </div>
      </section>

      {/* Quick Satellite Consignment Lookup - Cleanly positioned below cargo aircraft */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20 w-full">

        {/* QUICK SATELLITE CONSIGNMENT LOOKUP BAR */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900">
                Quick Satellite Consignment Lookup
              </h3>
              <p className="text-xs text-gray-500">
                Track status across air, ocean and ground logistics corridors.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto flex-1 max-w-lg">
            <div className="relative w-full">
              <input
                type="text"
                value={quickTrackCode}
                onChange={(e) => setQuickTrackCode(e.target.value)}
                placeholder="Enter Waybill # (e.g. IEC-748920-EXP)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={() => {
                const code = quickTrackCode.trim();
                if (code) {
                  if (onTrackCode) onTrackCode(code);
                  else setActiveTab('track');
                } else {
                  openTrackModal();
                }
              }}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-md shadow-blue-600/20"
            >
              Track Now
            </button>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US - STATS & HIGHLIGHTS */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Award className="w-4 h-4 text-blue-600" />
            <span>World-Class Logistics Infrastructure</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            Why Leading Global Enterprises Choose Us
          </h2>
          <p className="mt-3 text-sm text-gray-600">
            Backed by a fleet of wide-body cargo aircraft, bonded airport terminals, and dedicated dispatch officers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
              <Globe className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">220+</div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Global Countries Served</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Direct air freight corridors connecting the Americas, Europe, Asia-Pacific, Middle East, and Africa.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">99.8%</div>
            <h3 className="text-base font-bold text-gray-900 mb-2">On-Time Arrival Rate</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Guaranteed time-definite flight schedules with automated transshipment monitoring.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">100%</div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Customs Compliance</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Full tariff assessment, automated duty settlement, and expedited port clearance stamps.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <Headphones className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">24/7</div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Dedicated Sub Admin Dispatch</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Personalized customer support with real-time direct chat, photo inspection, and video confirmation.
            </p>
          </div>
        </div>
      </section>

      {/* CORE CARGO SERVICES */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Plane className="w-4 h-4 text-blue-400" />
                <span>End-to-End International Logistics</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Comprehensive Cargo Solutions
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('services')}
              className="text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Explore All Shipping Services</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Air Cargo Express */}
            <div className="bg-slate-800/90 border border-gray-700 rounded-3xl p-8 hover:border-blue-500 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Plane className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Priority Air Freight & Charter</h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-6">
                Scheduled departures on Boeing 747-8F and 777F freighters. Ideal for high-priority shipments, aerospace components, and time-critical medical supplies.
              </p>
              <div className="space-y-2 text-xs text-gray-400 border-t border-gray-700/60 pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>24 - 48 Hour Transatlantic Corridor</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>Main Deck Heavy Cargo Pallets</span>
                </div>
              </div>
            </div>

            {/* Ocean & Intermodal Freight */}
            <div className="bg-slate-800/90 border border-gray-700 rounded-3xl p-8 hover:border-blue-500 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Ship className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ocean Freight FCL & LCL</h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-6">
                Full-container-load (FCL) and consolidated less-than-container-load (LCL) maritime freight with integrated port drayage and rail connections.
              </p>
              <div className="space-y-2 text-xs text-gray-400 border-t border-gray-700/60 pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>20ft & 40ft High Cube Containers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>Real-time Reefer Temperature Tracking</span>
                </div>
              </div>
            </div>

            {/* Customs Clearance & Duty Management */}
            <div className="bg-slate-800/90 border border-gray-700 rounded-3xl p-8 hover:border-amber-500 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Bonded Customs Clearance</h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-6">
                Licensed customs brokers manage classification, documentation, payment settlement, and inspection release with national border agencies.
              </p>
              <div className="space-y-2 text-xs text-gray-400 border-t border-gray-700/60 pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Electronic Duties & Tariffs Settlement</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Bonded Warehouse Storage Facilities</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DELIVERY PROCESS TIMELINE */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Precision Operational Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            How Your Consignment Moves Globally
          </h2>
          <p className="mt-3 text-sm text-gray-600">
            From initial cargo registration to final signed doorstep delivery, every step is rigorously monitored.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 relative">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
              01
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">Registration & Waybill</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Consignment is booked, unique tracking code generated, and physical dimensions weighed & banded.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 relative">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
              02
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">Airport Departure</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Security screened pallets are loaded into wide-body cargo aircraft cargo holds for scheduled takeoff.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 relative">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
              03
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">Customs Clearance</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Destination border customs inspects manifests, duties are settled electronically, and release stamp issued.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-4">
              04
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">Final Mile Delivery</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Dispatched via secure ground logistics fleet for final doorstep delivery with digital consignee signature.
            </p>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Frequently Asked Questions
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-gray-500">
              Clear answers regarding cargo dispatching, customs duties, and consignment security.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <span className="font-bold text-sm text-gray-900 pr-4">{faq.q}</span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-blue-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <div className="p-5 text-xs sm:text-sm text-gray-600 leading-relaxed bg-white border-t border-gray-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="bg-gradient-to-r from-[#0b132b] to-[#1c2541] text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Ready to Ship Your Next Consignment?</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white max-w-2xl mx-auto">
            Experience Transparent, Secure International Freight Forwarding
          </h2>

          <p className="text-sm text-gray-300 max-w-xl mx-auto">
            Create an individual or corporate customer account now. Complete your registration to connect immediately with an assigned logistics dispatcher.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => openAuthModal('register')}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
            >
              Register Customer Account
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              Sign In Portal
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
