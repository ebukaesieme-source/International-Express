import React from 'react';
import { Plane, Ship, Truck, Award, Shield, CheckCircle2 } from 'lucide-react';

export const FleetPage: React.FC = () => {
  const fleet = [
    {
      name: 'Boeing 747-8 Freighter (Queen of the Skies)',
      type: 'Air Cargo Heavy Long-Haul',
      payload: '137,700 kg (303,700 lbs)',
      range: '8,130 km (4,390 nmi)',
      features: ['Nose cargo door for ultra-long out-of-gauge equipment', 'Main deck capacity: 34 pallets', 'Lower deck container positions: 14 LD-1'],
      image: '/assets/aistudio/image_87dab548.png'
    },
    {
      name: 'Boeing 777F (Triple Seven Freighter)',
      type: 'Twin-Engine High Efficiency Cargo',
      payload: '102,000 kg (224,900 lbs)',
      range: '9,200 km (4,970 nmi)',
      features: ['Lowest emissions per tonne of cargo in wide-body class', 'Temperature controlled main compartment', 'Direct transatlantic & transpacific nonstop range'],
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80'
    },
    {
      name: 'Airbus A330-200F',
      type: 'Medium to Long-Range Freighter',
      payload: '70,000 kg (154,000 lbs)',
      range: '7,400 km (4,000 nmi)',
      features: ['Versatile pallet configuration', 'Optimal for express package consolidation', 'Enhanced cargo loading automation'],
      image: 'https://images.unsplash.com/photo-1570710891163-6d3b5c47248b?auto=format&fit=crop&w=1200&q=80'
    },
    {
      name: 'Intermodal Container Maritime Vessels',
      type: 'Ocean Cargo Carriers',
      payload: 'Up to 18,000 TEU',
      range: 'Global Seaways',
      features: ['Equipped with 1,200 refrigerated reefer plugs', 'Satellite telemetry for container seal monitoring', 'GPS waypoint tracking'],
      image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80'
    }
  ];

  return (
    <div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Modern Aviation & Maritime Assets
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            Our Dedicated Global Cargo Fleet
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Purpose-built wide-body freighters and intermodal assets maintained to the highest FAA, EASA, and ICAO airworthiness standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {fleet.map((craft, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl overflow-hidden border border-gray-200/80 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="h-64 overflow-hidden relative">
                <img
                  src={craft.image}
                  alt={craft.name}
                  className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white">
                  {craft.type}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <h3 className="text-xl font-black text-gray-900">{craft.name}</h3>

                <div className="grid grid-cols-2 gap-4 my-4 p-4 bg-slate-50 rounded-2xl border border-gray-100">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Cargo Payload</div>
                    <div className="text-sm font-bold text-gray-800">{craft.payload}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Operational Range</div>
                    <div className="text-sm font-bold text-gray-800">{craft.range}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {craft.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
