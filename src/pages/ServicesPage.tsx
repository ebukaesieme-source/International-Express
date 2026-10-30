import React from 'react';
import { Plane, Ship, Truck, ShieldAlert, Thermometer, ShieldCheck, ArrowRight, Package } from 'lucide-react';

interface ServicesPageProps {
  openAuthModal: (mode: 'login' | 'register') => void;
  openTrackModal: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ openAuthModal, openTrackModal }) => {
  const services = [
    {
      title: 'Priority Air Freight Charter',
      icon: Plane,
      desc: 'Scheduled air cargo freighters and full aircraft charters for critical, high-value, or oversized cargo consignments.',
      specs: ['Main deck capacity up to 134 tonnes', 'Direct international hubs', 'Express 24-48 hr transit times']
    },
    {
      title: 'Ocean Freight (FCL & LCL)',
      icon: Ship,
      desc: 'Full Container Load and Less-than-Container Load services connecting major maritime ports across Europe, Americas, and Asia.',
      specs: ['20ft & 40ft standard & high cube', 'Port-to-port and door-to-door drayage', 'Automated ocean bill of lading']
    },
    {
      title: 'Customs Clearance & Tariff Compliance',
      icon: ShieldCheck,
      desc: 'Complete bonded customs brokerage, HS classification, tariff duty calculation, and rapid border release processing.',
      specs: ['Bonded warehouse staging', 'Online duty settlement portal', 'Official regulatory release certification']
    },
    {
      title: 'Cold Chain Pharma & Temperature Controlled',
      icon: Thermometer,
      desc: 'Specialized active and passive temperature-controlled air freight containers for pharmaceuticals, vaccines, and perishables.',
      specs: ['-20°C to +25°C continuous logging', 'IATA CEIV Pharma certified', 'Real-time thermal telematics']
    },
    {
      title: 'Heavy Machinery & Project Cargo',
      icon: Truck,
      desc: 'Specialized logistics for energy, oil & gas, infrastructure, and heavy industrial mining machinery.',
      specs: ['Out-of-gauge (OOG) flat racks', 'Heavy-lift crane operations', 'Route survey and escort management']
    },
    {
      title: 'Diplomatic & High-Security Courier',
      icon: ShieldAlert,
      desc: 'Sealed tamper-evident consignment transport with dedicated onboard couriers and GPS asset tracking.',
      specs: ['Tamper-evident security seals', 'Dual-custody verification', 'Continuous armed terminal escort']
    }
  ];

  return (
    <div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Global Cargo Capabilities
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            International Freight & Intermodal Services
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Engineered logistics solutions designed for absolute precision, security, and time-definite worldwide delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((svc, i) => {
            const Icon = svc.icon;
            return (
              <div
                key={i}
                className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{svc.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-6">{svc.desc}</p>
                  <ul className="space-y-2 border-t border-gray-100 pt-4 mb-6">
                    {svc.specs.map((spec, idx) => (
                      <li key={idx} className="flex items-center space-x-2 text-xs text-gray-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => openAuthModal('register')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-gray-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>Book Consignment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
