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
  ExternalLink,
  UserCheck,
  HeartHandshake
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

        {/* QUICK SATELLITE CONSIGNMENT LOOKUP BAR - Compact & Sleek */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3.5 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">
                Quick Satellite Consignment Lookup
              </h3>
              <p className="text-[11px] text-gray-500">
                Track status across air, ocean, and ground logistics corridors.
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-sm shadow-blue-600/20"
            >
              Track Now
            </button>
          </div>
        </div>
      </section>

      {/* CORE CARGO SERVICES - Compact Cards in Order */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-3">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Plane className="w-3.5 h-3.5 text-blue-400" />
                <span>End-to-End International Logistics</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Comprehensive Cargo Solutions
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('services')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Explore All Shipping Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. Cargo Truck & Ground Fleet */}
            <div className="bg-slate-800/95 border border-gray-700/80 rounded-xl overflow-hidden hover:border-blue-500 transition-all duration-300 group flex flex-col shadow-md">
              <div className="relative w-full h-28 sm:h-32 overflow-hidden bg-slate-900">
                <img
                  src="/assets/cargo_truck.jpg"
                  alt="Modern commercial cargo truck on the highway"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-xs border border-white/10 text-white text-[10px] font-bold flex items-center space-x-1 shadow-xs">
                  <Truck className="w-3 h-3 text-blue-400" />
                  <span>1. Cargo Truck Fleet</span>
                </div>
              </div>
              <div className="p-3.5 sm:p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-400">Ground Freight</span>
                  <span className="text-[9px] text-gray-400">Function 01</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                  Cargo Truck & Highway Express
                </h3>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-3">
                  Modern heavy-duty commercial cargo trucks and scheduled intermodal highway logistics. Delivering industrial consignments across regional transit corridors.
                </p>
                <div className="space-y-1 text-[11px] text-gray-300 border-t border-gray-700/60 pt-2.5 mb-3">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>GPS Satellite Monitored Heavy Trucks</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>Intermodal Haulage & Port Drayage</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>Temperature-Controlled Freight Fleets</span>
                  </div>
                </div>
                <button
                  onClick={() => openTrackModal()}
                  className="mt-auto w-full py-1.5 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  <span>Track Highway Consignment</span>
                </button>
              </div>
            </div>

            {/* 2. Customer Delivery to Older Woman */}
            <div className="bg-slate-800/95 border border-gray-700/80 rounded-xl overflow-hidden hover:border-emerald-500 transition-all duration-300 group flex flex-col shadow-md">
              <div className="relative w-full h-28 sm:h-32 overflow-hidden bg-slate-900">
                <img
                  src="/assets/delivery_older_woman.jpg"
                  alt="Courier delivering package to older woman at doorway"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-xs border border-white/10 text-white text-[10px] font-bold flex items-center space-x-1 shadow-xs">
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  <span>2. Residential Delivery</span>
                </div>
              </div>
              <div className="p-3.5 sm:p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">Doorstep Handover</span>
                  <span className="text-[9px] text-gray-400">Function 02</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                  Customer Delivery to Older Woman
                </h3>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-3">
                  Courteous, verified doorstep delivery to residential recipients and senior customers. Couriers hand-deliver every package with care directly to the front door.
                </p>
                <div className="space-y-1 text-[11px] text-gray-300 border-t border-gray-700/60 pt-2.5 mb-3">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Direct In-Person Handover to Consignee</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Digital Signature & Proof of Delivery</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Senior Care & Priority Handling</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('services')}
                  className="mt-auto w-full py-1.5 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Residential Services</span>
                </button>
              </div>
            </div>

            {/* 3. Woman Delivery to Older Man */}
            <div className="bg-slate-800/95 border border-gray-700/80 rounded-xl overflow-hidden hover:border-amber-500 transition-all duration-300 group flex flex-col shadow-md">
              <div className="relative w-full h-28 sm:h-32 overflow-hidden bg-slate-900">
                <img
                  src="/assets/woman_delivery_older_man.jpg"
                  alt="Female courier delivering package to older man"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-xs border border-white/10 text-white text-[10px] font-bold flex items-center space-x-1 shadow-xs">
                  <HeartHandshake className="w-3 h-3 text-amber-400" />
                  <span>3. White-Glove Handoff</span>
                </div>
              </div>
              <div className="p-3.5 sm:p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400">Personalized Dispatch</span>
                  <span className="text-[9px] text-gray-400">Function 03</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">
                  Woman Delivery to Older Man
                </h3>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-3">
                  Attentive delivery by professional female couriers to senior gentlemen and households, ensuring safe parcel handover, identity verification, and peace of mind.
                </p>
                <div className="space-y-1 text-[11px] text-gray-300 border-t border-gray-700/60 pt-2.5 mb-3">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Female Courier Verification</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>White-Glove Doorstep Parcel Handoff</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Instant Consignee SMS & Dispatch Notice</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('services')}
                  className="mt-auto w-full py-1.5 px-2.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 hover:border-amber-500 text-amber-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <HeartHandshake className="w-3 h-3" />
                  <span>Consignee Protocols</span>
                </button>
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

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 relative">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs mb-3">
              04
            </div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">Final Mile Delivery</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Dispatched via secure ground logistics fleet for final doorstep delivery with digital consignee signature.
            </p>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US - STATS & HIGHLIGHTS (Compact Cards) */}
      <section className="py-12 bg-slate-50 border-t border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>World-Class Logistics Infrastructure</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              Why Leading Global Enterprises Choose Us
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              Backed by wide-body cargo aircraft, bonded terminals, and dedicated dispatch officers.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <Globe className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 mb-0.5">220+</div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1">Global Countries Served</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Direct freight corridors connecting the Americas, Europe, Asia, and Africa.
              </p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 mb-0.5">99.8%</div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1">On-Time Arrival Rate</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Guaranteed time-definite flight schedules with automated transshipment monitoring.
              </p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 mb-0.5">100%</div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1">Customs Compliance</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Full tariff assessment, automated duty settlement, and port clearance stamps.
              </p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 mb-0.5">24/7</div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1">Dedicated Sub Admin Dispatch</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Personalized support with real-time direct chat, photo inspection, and video confirmation.
              </p>
            </div>
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
