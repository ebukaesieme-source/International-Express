import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  Plane,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Building,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Printer
} from 'lucide-react';
import { Shipment, TrackingEvent, ShipmentStatus } from '../types';
import {
  getShipmentByTrackingNumber,
  getTrackingEvents,
  getStatusTitle,
  recordPayment
} from '../services/cargoService';

const statusSequence: ShipmentStatus[] = [
  'registered',
  'package_received',
  'processing',
  'departure',
  'in_transit',
  'arrival_destination',
  'customs_processing',
  'out_for_delivery',
  'delivered'
];

interface TrackingSectionProps {
  initialTrackingNumber?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const TrackingSection: React.FC<TrackingSectionProps> = ({
  initialTrackingNumber = '',
  onClose,
  isModal = false
}) => {
  const [trackingInput, setTrackingInput] = useState(initialTrackingNumber);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payingCustoms, setPayingCustoms] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (initialTrackingNumber) {
      handleSearch(initialTrackingNumber);
    }
  }, [initialTrackingNumber]);

  const handleSearch = async (num?: string) => {
    const code = (num || trackingInput).trim();
    if (!code) {
      setError('Please enter a valid tracking or waybill number');
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentSuccess(false);

    try {
      const data = await getShipmentByTrackingNumber(code);
      if (data) {
        setShipment(data);
        const evts = await getTrackingEvents(data.id);
        setEvents(evts);
      } else {
        setShipment(null);
        setEvents([]);
        setError(`No consignment record found for tracking code "${code}". Please verify and re-try.`);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch tracking details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayDuty = async () => {
    if (!shipment) return;
    setPayingCustoms(true);
    try {
      const ref = 'DUTY-PAY-' + Math.floor(100000 + Math.random() * 900000);
      await recordPayment({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        customerId: shipment.customerId,
        customerName: shipment.customerName,
        amount: shipment.customsDutyAmount,
        currency: shipment.customsDutyCurrency,
        paymentMethod: 'Electronic Cargo Clearance Portal',
        status: 'confirmed',
        reference: ref,
        notes: 'Customs duty settled via online tracking portal.'
      });

      setShipment({
        ...shipment,
        customsPaymentStatus: 'paid',
        customsReference: ref
      });
      setPaymentSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Payment processing error. Please contact dispatcher.');
    } finally {
      setPayingCustoms(false);
    }
  };

  const getStatusIndex = (currentStatus: ShipmentStatus) => {
    return statusSequence.indexOf(currentStatus);
  };

  return (
    <div className={`w-full ${isModal ? 'p-6 max-h-[85vh] overflow-y-auto' : 'py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto'}`}>
      {/* Title & Search Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Real-Time International Telematics & Waybill Tracking</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b132b] tracking-tight">
          Track Your Cargo Consignment
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your 10 to 14 digit Air Waybill (AWB) or Container Tracking Code for instantaneous satellite checkpoint verification.
        </p>

        {/* Search Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. IEC-748920-EXP"
              className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-gray-200 focus:border-blue-600 rounded-xl text-base font-mono uppercase tracking-wider shadow-sm focus:outline-none transition-all"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Track Cargo</span>
              </>
            )}
          </button>
        </div>

        {/* Demo Quick Search Buttons */}
        <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-gray-500">
          <span>Quick Sample:</span>
          <button
            onClick={() => {
              setTrackingInput('IEC-748920-EXP');
              handleSearch('IEC-748920-EXP');
            }}
            className="text-blue-600 hover:underline font-mono font-medium cursor-pointer"
          >
            IEC-748920-EXP (In Transit Boeing 747-8F)
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Tracking Notice</h4>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Shipment Results */}
      {shipment && (
        <div className="space-y-8 animate-fadeIn">
          {/* Main Shipment Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Top Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-100 gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-2xl font-black text-gray-900 tracking-wider">
                    {shipment.trackingNumber}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                    {shipment.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Air Cargo Consignment • Carrier: <strong className="text-gray-800">{shipment.carrier}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Waybill</span>
                </button>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                    Est. Arrival
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {shipment.estimatedDeliveryDate || 'Scheduled in Flight'}
                  </div>
                </div>
              </div>
            </div>

            {/* Origin -> Destination Route Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 items-center">
              {/* Origin */}
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1">
                  <Plane className="w-3.5 h-3.5 text-blue-600 rotate-45" />
                  <span>Origin Port</span>
                </div>
                <div className="text-base font-extrabold text-gray-900 mt-1">
                  {shipment.departureLocation}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  Sender: <span className="font-medium">{shipment.senderName}</span>
                </div>
                <div className="text-[11px] text-gray-400 truncate">{shipment.senderAddress}, {shipment.senderCountry}</div>
              </div>

              {/* Transit Details */}
              <div className="text-center px-4">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center justify-center space-x-1">
                  <span>Current Hub</span>
                </div>
                <div className="text-sm font-bold text-gray-800 mt-1 bg-blue-50 py-1.5 px-3 rounded-lg border border-blue-100">
                  {shipment.currentLocation || shipment.destinationLocation}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Weight: <strong className="text-gray-900">{shipment.weightKg} kg</strong> • Pieces: <strong className="text-gray-900">{shipment.pieces || 1}</strong>
                </div>
              </div>

              {/* Destination */}
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Destination Port</span>
                </div>
                <div className="text-base font-extrabold text-gray-900 mt-1">
                  {shipment.destinationLocation}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  Recipient: <span className="font-medium">{shipment.recipientName}</span>
                </div>
                <div className="text-[11px] text-gray-400 truncate">{shipment.recipientAddress}, {shipment.recipientCountry}</div>
              </div>
            </div>

            {/* Customs Duty & Clearance Card */}
            <div className="mt-6 bg-gradient-to-r from-slate-900 to-[#1c2541] text-white p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-amber-400">
                      Customs Duty & Tariffs Assessment
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      shipment.customsPaymentStatus === 'paid'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-400 text-gray-900'
                    }`}>
                      {shipment.customsPaymentStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">
                    {shipment.customsNotes || 'Official customs tariff inspection fee applicable for clearance at arrival.'}
                    {shipment.customsReference && ` (Ref: ${shipment.customsReference})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end md:self-center">
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Duty Amount</div>
                  <div className="text-xl font-black text-amber-300">
                    {shipment.customsDutyAmount > 0
                      ? `${shipment.customsDutyCurrency} ${shipment.customsDutyAmount.toFixed(2)}`
                      : 'None / Cleared'}
                  </div>
                </div>

                {shipment.customsPaymentStatus === 'pending' && shipment.customsDutyAmount > 0 && (
                  <button
                    onClick={handlePayDuty}
                    disabled={payingCustoms}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{payingCustoms ? 'Processing...' : 'Pay Duty Now'}</span>
                  </button>
                )}

                {paymentSuccess && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Duty Settled!</span>
                  </span>
                )}
              </div>
            </div>

            {/* Visual 9-Step Progress Tracker */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
                Official Journey Progression Stages
              </h4>

              {/* Progress Steps for desktop & tablet */}
              <div className="hidden lg:grid grid-cols-9 gap-1 text-center relative">
                {statusSequence.map((stepStatus, idx) => {
                  const currentIdx = getStatusIndex(shipment.status);
                  const isCompleted = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={stepStatus} className="flex flex-col items-center group relative">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110 shadow-md'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] mt-2 font-bold leading-tight ${
                          isCurrent
                            ? 'text-blue-700'
                            : isCompleted
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {stepStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Stepper Bar */}
              <div className="lg:hidden flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
                  <span className="text-xs font-bold text-gray-900">
                    Stage {getStatusIndex(shipment.status) + 1} of 9: {shipment.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-xs font-mono text-blue-600 font-bold">
                  {Math.round(((getStatusIndex(shipment.status) + 1) / 9) * 100)}% Complete
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Milestones Timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Verified Milestones & Checkpoint History</span>
              </h3>
              <span className="text-xs text-gray-500">
                {events.length} Recorded Checkpoint{events.length !== 1 ? 's' : ''}
              </span>
            </div>

            {events.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                Initial waybill logged. Waiting for first airport scan checkpoint.
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
                {events.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative group">
                    {/* Bullet marker */}
                    <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    </div>

                    <div className="bg-slate-50 border border-gray-200/80 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="text-sm font-bold text-gray-900">
                          {evt.title || getStatusTitle(evt.status)}
                        </h4>
                        <div className="text-xs font-mono text-gray-500">
                          {new Date(evt.timestamp).toLocaleString()}
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 pt-2 border-t border-gray-200/50">
                        <span className="flex items-center space-x-1 font-medium text-gray-700">
                          <MapPin className="w-3 h-3 text-blue-500" />
                          <span>{evt.location}</span>
                        </span>
                        <span>•</span>
                        <span>
                          Officer / Hub: <strong className="text-gray-700">{evt.recordedBy}</strong> ({evt.recordedByRole})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
