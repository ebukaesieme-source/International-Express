import React from 'react';
import { ShieldCheck, Award, Globe, Users, Building, Truck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Company Profile & History
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            About International Express Cargo
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Pioneering intercontinental cargo transportation, licensed customs operations, and bonded supply chain management.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              A Global Infrastructure Built for Speed, Integrity & Scale
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Founded to eliminate friction in international trade, International Express Cargo connects manufacturer origins directly to consumer and industrial destinations across 220+ territories.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Our system unites airport ramp operations, wide-body freighter schedules, bonded border customs checkpoints, and personalized dispatch management through our proprietary four-layer administrative platform.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
                <div className="text-2xl font-black text-blue-600">220+</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Countries & Destinations</div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
                <div className="text-2xl font-black text-indigo-600">1.8M+</div>
                <div className="text-xs font-bold text-gray-700 mt-1">Tonnes Moved Annually</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
            <img
              src="/assets/aistudio/image_feede8dc.png"
              alt="International Cargo Operations"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
