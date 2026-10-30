import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Headphones } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tracking: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            24/7 Global Communications
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            Contact Cargo Dispatch HQ
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Our international flight operations control center and customs inquiry desk are staffed around the clock.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Office Contact Cards */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Americas Air Hub</h4>
                  <p className="text-xs text-gray-500">JFK International Airport Cargo Terminal 4</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">One World Cargo Center, New York, NY 11430</p>
              <div className="mt-2 text-xs font-bold text-blue-600">+1 (800) 555-CARGO</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">EMEA Cargo Hub</h4>
                  <p className="text-xs text-gray-500">Heathrow Logistics Park</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">Terminal 4 Cargo North, London TW6 3XZ, UK</p>
              <div className="mt-2 text-xs font-bold text-indigo-600">+44 20 7946 0991</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Online Customs Support</h4>
                  <p className="text-xs text-gray-500">Fast-track tariff verification</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">customs@internationalexpresscargo.com</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            {submitted ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Inquiry Transmitted</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Your message has been assigned to our central dispatch team. A duty officer will review and reply within 15 minutes.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                >
                  Submit Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-black text-gray-900 mb-2">Direct Message to Operations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tracking Code (Optional)</label>
                    <input
                      type="text"
                      value={formData.tracking}
                      onChange={(e) => setFormData({ ...formData, tracking: e.target.value })}
                      placeholder="IEC-XXXXXX-EXP"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Operational Inquiry / Cargo Details</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Provide details about your shipment or inquiry..."
                    className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmit to Dispatch Officer</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
