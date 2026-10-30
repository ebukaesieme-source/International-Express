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
  Printer,
  Radio,
  Globe,
  Compass,
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Shield,
  Award
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
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

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
          {/* ========================================================= */}
          {/* LIVE CARGO TELEMETRY CARD (Matches image_08d2f1eb.png)    */}
          {/* ========================================================= */}
          {(() => {
            const progress = shipment.deliveryProgressPercentage !== undefined
              ? shipment.deliveryProgressPercentage
              : Math.max(15, Math.min(100, Math.round(((getStatusIndex(shipment.status) + 1) / 9) * 100)));

            const destCountry = shipment.recipientCountry || shipment.destinationLocation;
            let destCode = 'CN';
            if (destCountry.toLowerCase().includes('china')) destCode = 'CN';
            else if (destCountry.toLowerCase().includes('united states') || destCountry.toLowerCase().includes('usa') || destCountry.toLowerCase().includes('jfk')) destCode = 'US';
            else if (destCountry.toLowerCase().includes('kingdom') || destCountry.toLowerCase().includes('uk') || destCountry.toLowerCase().includes('london')) destCode = 'GB';
            else if (destCountry.toLowerCase().includes('germany') || destCountry.toLowerCase().includes('frankfurt')) destCode = 'DE';
            else if (destCountry.toLowerCase().includes('israel') || destCountry.toLowerCase().includes('tel aviv')) destCode = 'IL';
            else if (destCountry.toLowerCase().includes('uae') || destCountry.toLowerCase().includes('dubai')) destCode = 'AE';
            else if (destCountry.toLowerCase().includes('canada')) destCode = 'CA';
            else destCode = destCountry.slice(0, 2).toUpperCase();

            const defaultPhotos = [
              {
                id: 'insp-1',
                tag: '#1',
                caption: 'Cargo Inspection Tray #1 - Customs Security & Purity Verification',
                url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80'
              },
              {
                id: 'insp-2',
                tag: '#2',
                caption: 'Cargo Inspection Tray #2 - Precious Goods Seal & Weight Certified',
                url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80'
              },
              {
                id: 'insp-3',
                tag: '#3',
                caption: 'Cargo Inspection Tray #3 - Bonded Gateway Tamper-Evident Enclosure',
                url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80'
              }
            ];

            const inspectionPhotos = (shipment.photos && shipment.photos.length > 0)
              ? shipment.photos.map((p, i) => ({
                  id: p.id || `insp-${i}`,
                  tag: `#${i + 1}`,
                  caption: p.caption || p.name || `Verified Inspection Checkpoint #${i + 1}`,
                  url: p.url
                }))
              : defaultPhotos;

            return (
              <div className="bg-[#101524] text-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#1e2746] relative overflow-hidden">
                {/* Background ambient light */}
                <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header Row */}
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1b233d]">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#1b233d] border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
                      <Radio className="w-5 h-5 animate-pulse text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold tracking-wider text-sm sm:text-base text-gray-100 uppercase">
                          LIVE CARGO TELEMETRY
                        </span>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-300 font-medium flex items-center space-x-1.5 mt-0.5">
                        <span className="text-blue-400">🌐</span>
                        <span className="font-semibold text-gray-200">{shipment.departureLocation}</span>
                        <span className="text-gray-500 font-bold">➔</span>
                        <span className="bg-[#1b233d] text-blue-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                          {destCode}
                        </span>
                        <span className="font-semibold text-gray-200">{shipment.destinationLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pill on Top Right */}
                  <div className="self-start sm:self-center">
                    <div className="inline-flex items-center space-x-2 bg-[#1b233d]/90 border border-amber-400/30 px-3.5 py-2 rounded-2xl shadow-inner">
                      <Compass className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">STATUS:</span>
                        <span className="text-xs font-black text-amber-400 font-mono">
                          At {shipment.currentLocation || shipment.departureLocation}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-Station Moving Timeline & Progress */}
                <div className="py-7 relative">
                  {/* Delivery Moving Progress Bar Track */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                        <Plane className="w-3.5 h-3.5 text-blue-400" />
                        <span>Live Delivery Moving Progress: <strong className="text-white font-mono">{progress}%</strong></span>
                      </span>
                      <span className="text-[11px] text-blue-400 font-mono font-bold">
                        {progress >= 100 ? 'Consignment Delivered' : progress >= 75 ? 'Customs Inspection Station' : progress >= 35 ? 'In Flight Corridor' : 'Origin Terminal Dispatch'}
                      </span>
                    </div>

                    <div className="relative w-full h-3 bg-[#171f36] rounded-full overflow-hidden border border-[#232f50]">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-700 relative shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/70 animate-pulse rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* 3 Stations Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {/* Station 1: ORIGIN */}
                    <div className="relative flex flex-col items-center text-center p-4 rounded-2xl bg-[#141b30]/80 border border-indigo-500/30">
                      {/* Purple Glowing Airplane Icon Box */}
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-[0_0_25px_rgba(147,51,234,0.6)] mb-3 border border-indigo-400/40">
                        <Plane className="w-6 h-6 rotate-45 text-white" />
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-1 mb-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span>AT ORIGIN</span>
                      </div>
                      <div className="text-sm font-black text-white flex items-center space-x-1 mb-2">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>{shipment.departureLocation}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        progress >= 15
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        • ACTIVE
                      </span>
                    </div>

                    {/* Station 2: IN TRANSIT */}
                    <div className="relative flex flex-col items-center text-center p-4 rounded-2xl bg-[#141b30]/80 border border-[#212d50]">
                      <div className="w-13 h-13 rounded-2xl bg-[#1a233f] flex items-center justify-center text-cyan-400 border border-cyan-500/30 shadow-inner mb-3">
                        <Globe className="w-6 h-6 animate-pulse text-cyan-400" />
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                        IN TRANSIT ...
                      </div>
                      <div className="text-sm font-bold text-gray-200 mb-2 truncate max-w-full">
                        {shipment.currentLocation || shipment.departureLocation}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        progress >= 35 && progress < 100
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : progress >= 100
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {progress >= 35 ? (progress >= 100 ? 'TRANSIT COMPLETE' : 'IN FLIGHT') : 'Pending'}
                      </span>
                    </div>

                    {/* Station 3: DESTINATION */}
                    <div className="relative flex flex-col items-center text-center p-4 rounded-2xl bg-[#141b30]/80 border border-[#212d50]">
                      <div className="w-13 h-13 rounded-2xl bg-[#1a233f] flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-inner mb-3">
                        <MapPin className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                        {destCode} • DESTINATION
                      </div>
                      <div className="text-sm font-bold text-gray-200 mb-2 truncate max-w-full">
                        {shipment.destinationLocation}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        progress >= 100
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {progress >= 100 ? 'DELIVERED & SIGNED' : 'Pending Arrival'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2 Middle Cards: CUSTOMS & INSPECTION + DESTINATION STATUS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 mb-6">
                  {/* Card 1: CUSTOMS & INSPECTION */}
                  <div className="bg-[#141b30] p-4 sm:p-5 rounded-2xl border border-[#212d50] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <span>CUSTOMS & INSPECTION</span>
                      </div>
                      <h4 className="text-base font-extrabold text-white leading-snug">
                        {shipment.customsNotes || 'Package Dispatched & Cleared Customs'}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Facility: <span className="text-gray-300 font-medium">{shipment.currentLocation || shipment.departureLocation} Gateway Hub</span>
                      </p>

                      {/* Fee Purpose & Fee Amount Added by Sub Admin */}
                      <div className="mt-3.5 pt-3 border-t border-[#1d2642] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Assessed Fee Purpose:</span>
                          <span className="font-bold text-amber-300 text-right">
                            {shipment.feePurpose || 'Bonded Inspection & Customs Tariffs'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Amount & Status:</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-amber-400 text-sm">
                              {shipment.customsDutyAmount > 0
                                ? `${shipment.customsDutyCurrency} ${shipment.customsDutyAmount.toFixed(2)}`
                                : 'Cleared / Exempt'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              shipment.customsPaymentStatus === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                            }`}>
                              {shipment.customsPaymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pay Button if pending */}
                    {shipment.customsPaymentStatus === 'pending' && shipment.customsDutyAmount > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#1d2642] flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Direct Online Clearance:</span>
                        <button
                          onClick={handlePayDuty}
                          disabled={payingCustoms}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{payingCustoms ? 'Processing...' : `Pay Fee (${shipment.customsDutyCurrency} ${shipment.customsDutyAmount})`}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card 2: DESTINATION STATUS */}
                  <div className="bg-[#141b30] p-4 sm:p-5 rounded-2xl border border-[#212d50] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <span>DESTINATION STATUS</span>
                      </div>
                      <h4 className="text-base font-extrabold text-white leading-snug flex items-center space-x-2">
                        <span className="bg-[#1c2541] text-emerald-400 font-mono text-xs px-2 py-0.5 rounded border border-emerald-500/30">
                          {destCode}
                        </span>
                        <span>En Route to {shipment.destinationLocation}</span>
                      </h4>
                      <p className="text-xs text-gray-400 mt-2">
                        Est. Arrival: <strong className="text-gray-200">{shipment.estimatedDeliveryDate || 'Scheduled Delivery'}</strong>
                      </p>
                      <div className="mt-3.5 pt-3 border-t border-[#1d2642] text-xs text-gray-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Final Consignee:</span>
                          <span className="text-white font-medium">{shipment.recipientName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Address:</span>
                          <span className="text-gray-300 truncate max-w-[200px]">{shipment.recipientAddress}, {shipment.recipientCountry}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1d2642] flex items-center justify-between text-xs text-emerald-400 font-bold">
                      <span className="flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>Dedicated Logistics Escort</span>
                      </span>
                      <span className="font-mono text-gray-400">{shipment.carrier}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: CARGO INSPECTION PHOTOS (Matches image_08d2f1eb.png) */}
                <div className="bg-[#141b30] p-4 sm:p-5 rounded-2xl border border-[#212d50]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-white uppercase tracking-wider">
                            CARGO INSPECTION PHOTOS
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                            • FEED
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {inspectionPhotos.length} verified photos • Click to zoom
                        </p>
                      </div>
                    </div>

                    {/* < > Arrow navigation */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setPhotoIndex(prev => Math.max(0, prev - 1))}
                        disabled={photoIndex === 0}
                        className="p-1.5 rounded-lg bg-[#1a233f] hover:bg-[#232f55] text-gray-300 disabled:opacity-30 cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPhotoIndex(prev => Math.min(inspectionPhotos.length - 1, prev + 1))}
                        disabled={photoIndex >= inspectionPhotos.length - 1}
                        className="p-1.5 rounded-lg bg-[#1a233f] hover:bg-[#232f55] text-gray-300 disabled:opacity-30 cursor-pointer transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Photo Thumbnails with #1, #2, #3 Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {inspectionPhotos.map((photo, pIdx) => (
                      <div
                        key={photo.id}
                        onClick={() => setZoomPhoto(photo.url)}
                        className="group relative rounded-xl overflow-hidden border border-[#232f50] bg-black/40 aspect-[4/3] cursor-pointer hover:border-blue-400 transition-all shadow-md"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* #1 Tag Badge at Top Left (Exact match to screenshot) */}
                        <div className="absolute top-2 left-2 bg-[#101524]/90 backdrop-blur-xs border border-blue-500/30 text-blue-300 font-mono text-xs font-black px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-md">
                          <span className="text-blue-400">❖</span>
                          <span>{photo.tag}</span>
                        </div>

                        {/* Zoom In hover icon */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="p-2 rounded-full bg-white/20 text-white backdrop-blur-xs">
                            <ZoomIn className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-[10px] text-gray-300 truncate">
                          {photo.caption}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

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

      {/* Cargo Inspection Photo Zoom Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="relative bg-[#101524] rounded-3xl max-w-4xl w-full p-4 sm:p-6 border border-[#222e50] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2a48]">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-base text-white">
                  Cargo Inspection Visual Telemetry
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  VERIFIED HIGH-RES
                </span>
              </div>
              <button
                onClick={() => setZoomPhoto(null)}
                className="p-1.5 rounded-xl bg-[#1a233f] hover:bg-[#232f55] text-gray-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black/80 flex items-center justify-center max-h-[70vh]">
              <img
                src={zoomPhoto}
                alt="Zoomed Inspection Photo"
                className="max-h-[68vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-gray-400">
              <span className="font-medium text-gray-300">
                Official Port & Airport Telemetry Verification Log • Authenticated Checkpoint
              </span>
              <button
                onClick={() => window.open(zoomPhoto, '_blank')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Open Full Original</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

