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
  Award,
  Send,
  Check,
  Box,
  Layers,
  Sparkles
} from 'lucide-react';
import { Shipment, TrackingEvent, ShipmentStatus, ItemizedFee } from '../types';
import {
  getShipmentByTrackingNumber,
  getTrackingEvents,
  getStatusTitle,
  payItemizedFee,
  payAllOutstandingFees
} from '../services/cargoService';

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

  // Payment states
  const [payingFee, setPayingFee] = useState<ItemizedFee | null>(null);
  const [payingAllOutstanding, setPayingAllOutstanding] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);
  const [paymentReferenceInput, setPaymentReferenceInput] = useState('');
  const [paymentMethodSelect, setPaymentMethodSelect] = useState('Online Card Checkout (3D-Secure)');

  // Photo viewer modal
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

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

    try {
      const data = await getShipmentByTrackingNumber(code);
      if (data) {
        setShipment(data);
        const evts = await getTrackingEvents(data.id);
        setEvents(evts || []);
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

  // Helper to re-fetch shipment data after payment
  const refreshShipmentData = async (trackingNo: string) => {
    try {
      const data = await getShipmentByTrackingNumber(trackingNo);
      if (data) setShipment(data);
    } catch (err) {
      console.warn('Error refreshing shipment:', err);
    }
  };

  // Settle individual fee
  const handleConfirmSingleFeePayment = async () => {
    if (!shipment || !payingFee) return;
    setPaymentProcessing(true);
    try {
      const ref = paymentReferenceInput.trim() || 'DUTY-' + Math.floor(100000 + Math.random() * 900000);
      await payItemizedFee(shipment.id, payingFee.id, paymentMethodSelect, ref);
      setPaymentSuccessToast(`Payment of $${payingFee.amount.toLocaleString()} for "${payingFee.title}" confirmed!`);
      setPayingFee(null);
      setPaymentReferenceInput('');
      await refreshShipmentData(shipment.trackingNumber);
    } catch (err: any) {
      alert(err.message || 'Payment settlement failed.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Settle all outstanding fees
  const handleConfirmAllOutstandingPayment = async () => {
    if (!shipment) return;
    setPaymentProcessing(true);
    try {
      const ref = paymentReferenceInput.trim() || 'FULL-' + Math.floor(100000 + Math.random() * 900000);
      await payAllOutstandingFees(shipment.id, paymentMethodSelect, ref);
      setPaymentSuccessToast('All outstanding fees successfully settled and cleared!');
      setPayingAllOutstanding(false);
      setPaymentReferenceInput('');
      await refreshShipmentData(shipment.trackingNumber);
    } catch (err: any) {
      alert(err.message || 'Payment settlement failed.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Derived Itemized Fees array
  const fees: ItemizedFee[] = React.useMemo(() => {
    if (!shipment) return [];
    if (shipment.itemizedFees && shipment.itemizedFees.length > 0) {
      return shipment.itemizedFees;
    }
    // Fallback if legacy single fee exists
    if (shipment.customsDutyAmount > 0) {
      return [
        {
          id: 'def_1',
          title: shipment.feePurpose || 'Customs Duty Fee',
          purpose: shipment.customsNotes || 'Standard border clearance inspection. shipment has been assessed duties and taxes totaling.',
          amount: shipment.customsDutyAmount,
          currency: shipment.customsDutyCurrency || 'USD',
          status: shipment.customsPaymentStatus === 'paid' ? 'paid' : 'pending'
        }
      ];
    }
    return [];
  }, [shipment]);

  // Derived Financial Totals
  const totalCharges = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const amountPaid = fees
    .filter(f => f.status === 'paid')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const balanceDue = Math.max(0, totalCharges - amountPaid);

  // Derived Telemetry Progress
  const progress = shipment?.deliveryProgressPercentage !== undefined
    ? shipment.deliveryProgressPercentage
    : (shipment?.status === 'delivered' || shipment?.status === 'arrival_destination' ? 100 : 75);

  // Package inspection / product photos
  const packagePhotos = (shipment?.packageImages && shipment.packageImages.length > 0)
    ? shipment.packageImages
    : (shipment?.photos && shipment.photos.length > 0)
    ? shipment.photos.map(p => p.url)
    : [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80'
      ];

  const originText = shipment?.departureLocation || 'U.K';
  const destinationText = shipment?.destinationLocation || 'U.S.A';
  const currentLocationText = shipment?.currentLocation || destinationText;

  // Format date helper matching screenshot: "Oct 9, 2026, 02:34 PM"
  const formatDateTime = (isoDate?: string) => {
    if (!isoDate) return 'Oct 9, 2026, 02:34 PM';
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ', ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {paymentSuccessToast && (
        <div className="p-3.5 bg-emerald-900 text-white border border-emerald-700 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{paymentSuccessToast}</span>
          </div>
          <button
            onClick={() => setPaymentSuccessToast(null)}
            className="p-1 hover:bg-emerald-800 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SEARCH HEADER BAR */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Enter Waybill or Air Cargo Tracking Code (e.g. IEC-748920-EXP)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Compass className="w-4 h-4 animate-spin" />
                  <span>Tracking...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Consignment</span>
                </>
              )}
            </button>

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-gray-500 cursor-pointer"
                title="Close Window"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Quick Sample Waybill Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
          <span className="font-semibold text-gray-400">Quick Track:</span>
          <button
            type="button"
            onClick={() => {
              setTrackingInput('IEC-748920-EXP');
              handleSearch('IEC-748920-EXP');
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-mono font-bold cursor-pointer transition-colors"
          >
            IEC-748920-EXP (Verified SUV Freight)
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-700 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Waybill Notice</h4>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXACT TRACK CARD LAYOUT MATCHING image_aad53ce1.png                       */}
      {/* ========================================================================= */}
      {shipment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fadeIn">
          {/* ===================================================================== */}
          {/* LEFT COLUMN: ITEMIZED FEE BREAKDOWN + LIVE CARGO TELEMETRY            */}
          {/* ===================================================================== */}
          <div className="space-y-6">
            {/* 1. ITEMIZED FEE BREAKDOWN (Matches exact top-left card in screenshot) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
                    $
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-sm sm:text-base text-gray-900 tracking-tight uppercase">
                        ITEMIZED FEE BREAKDOWN
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-100 text-purple-700 tracking-wider">
                        OFFICIAL BILL
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Click any fee to see account details, upload receipt & submit payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fee Items List */}
              <div className="space-y-3">
                {fees.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs">
                    No clearance charges or customs duties assessed on this consignment.
                  </div>
                ) : (
                  fees.map((fee) => {
                    const isPaid = fee.status === 'paid';
                    return (
                      <div
                        key={fee.id}
                        className={`p-3 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isPaid
                            ? 'bg-slate-50/70 border-gray-100'
                            : 'bg-blue-50/30 border-blue-100 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3 min-w-0">
                          {/* Left icon: Green circle checkmark if paid, Blue document if pending */}
                          {isPaid ? (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 truncate uppercase">
                                {fee.title}
                              </h4>
                              {isPaid && (
                                <span className="px-2 py-0.2 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ PAID
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                              <span className="font-semibold text-gray-600">Reason:</span> {fee.purpose}
                            </p>
                          </div>
                        </div>

                        {/* Right side Amount & Pay Button */}
                        <div className="text-right shrink-0 flex items-center space-x-2.5">
                          {isPaid ? (
                            <div className="text-xs sm:text-sm font-black text-emerald-600 flex items-center space-x-1">
                              <span>${fee.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              <span className="text-[10px] text-emerald-600 font-bold">✓ Paid</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs sm:text-sm font-black text-blue-700 font-mono">
                                ${fee.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPayingFee(fee)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-0.5 cursor-pointer transition-all"
                              >
                                <span>Pay</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Financial Summary Totals (Matches exact 3-column footer in screenshot) */}
              <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center sm:text-left">
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
                    <DollarSign className="w-3 h-3 text-gray-400" />
                    <span>TOTAL CHARGES</span>
                  </div>
                  <div className="text-sm sm:text-lg font-black text-gray-950 mt-1 font-mono">
                    ${totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>AMOUNT PAID</span>
                  </div>
                  <div className="text-sm sm:text-lg font-black text-emerald-600 mt-1 font-mono">
                    ${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    <span>BALANCE DUE</span>
                  </div>
                  <div className="text-sm sm:text-lg font-black text-amber-600 mt-1 font-mono">
                    ${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Outstanding Action Banner (Matches exact pill + button in screenshot) */}
              {balanceDue > 0 ? (
                <div className="mt-2 pt-3 border-t border-amber-100 bg-amber-50/50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      <Clock className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold text-amber-800">
                      Outstanding: <strong className="font-mono">${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      <span>WAITING FOR CUSTOMER TO PAYMENT</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setPayingAllOutstanding(true)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer transition-all"
                    >
                      <span>Pay Outstanding</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 pt-3 border-t border-emerald-100 bg-emerald-50/60 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All itemized consignor fees and border clearance charges settled in full.</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    PAID IN FULL
                  </span>
                </div>
              )}
            </div>

            {/* 2. LIVE CARGO TELEMETRY (Matches exact dark card in screenshot) */}
            <div className="bg-[#0c1427] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-[#1b2640] relative overflow-hidden space-y-5">
              {/* Top Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="font-black text-xs sm:text-sm tracking-wider text-gray-100 uppercase">
                      LIVE CARGO TELEMETRY
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                  </div>
                  <div className="text-xs text-gray-300 font-bold flex items-center space-x-1.5">
                    <span>🌐 {originText}</span>
                    <span className="text-gray-500 font-black">➔</span>
                    <span>🌐 {destinationText}</span>
                  </div>
                </div>

                {/* Top Right Badges: [100% | Arrived] [LOCATION: U.S.A] */}
                <div className="flex items-center space-x-2 self-start sm:self-center">
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-black">
                    {progress}% | {progress >= 100 ? 'Arrived' : 'In Motion'}
                  </span>
                  <div className="px-3 py-1 rounded-full bg-[#13253b] border border-cyan-500/20 text-cyan-300 text-[11px] font-mono font-black flex items-center space-x-1">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>LOCATION: {currentLocationText}</span>
                  </div>
                </div>
              </div>

              {/* Central Glowing Horizontal Movement Track */}
              <div className="py-4 relative">
                {/* Horizontal Bar with Glowing Track Line */}
                <div className="relative flex items-center justify-between">
                  {/* Origin Node (Left) */}
                  <div className="flex flex-col items-center z-10 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-blue-600/90 border-2 border-blue-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-black text-white mt-1.5">{originText}</span>
                    <span className="text-[10px] text-gray-400">{originText}</span>
                    <span className="mt-1 px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300 text-[9px] font-mono font-bold border border-blue-700/50">
                      0% ORIGIN
                    </span>
                  </div>

                  {/* Horizontal Track Background Line */}
                  <div className="flex-1 mx-3 h-2 bg-[#17223b] rounded-full relative overflow-hidden">
                    {/* Glowing Progress Fill Line */}
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_12px_#06b6d4] transition-all duration-700"
                      style={{ width: `${Math.max(5, progress)}%` }}
                    />
                  </div>

                  {/* Destination / Current Arrival Node (Right) */}
                  <div className="flex flex-col items-center z-10 shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                        progress >= 100
                          ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.8)]'
                          : 'bg-cyan-600/90 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                      }`}
                    >
                      {progress >= 100 ? (
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      ) : (
                        <Plane className="w-4 h-4 text-white rotate-45" />
                      )}
                    </div>
                    <span className="text-xs font-black text-white mt-1.5">{destinationText}</span>
                    <span className="text-[10px] text-gray-300 font-bold">{currentLocationText}</span>
                    <span
                      className={`mt-1 px-2 py-0.2 rounded text-[9px] font-mono font-black border ${
                        progress >= 100
                          ? 'bg-emerald-900/70 text-emerald-300 border-emerald-600'
                          : 'bg-cyan-900/70 text-cyan-300 border-cyan-600'
                      }`}
                    >
                      {progress}% {progress >= 100 ? 'ARRIVED' : 'IN TRANSIT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Telemetry Split Status Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Left: TRANSIT CHECKPOINT */}
                <div className="bg-[#121c33] border border-[#1e2a4a] rounded-2xl p-4 space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                    <Send className="w-3.5 h-3.5" />
                    <span>TRANSIT CHECKPOINT</span>
                  </div>
                  <h5 className="font-extrabold text-sm text-white">
                    {events[0]?.title || 'Arrived at Destination Facility'}
                  </h5>
                  <p className="text-[11px] text-gray-400">
                    Facility: {events[0]?.facility || `${destinationText} Final Fulfillment Center`}
                  </p>
                </div>

                {/* Right: DESTINATION STATUS */}
                <div className="bg-[#121c33] border border-[#1e2a4a] rounded-2xl p-4 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>DESTINATION STATUS</span>
                  </div>
                  <h5 className="font-extrabold text-sm text-white flex items-center space-x-1">
                    <span>🌐</span>
                    <span>{shipment.statusNotes || 'Handed over for final doorstep delivery!'}</span>
                  </h5>
                  <p className="text-[11px] text-emerald-400 font-bold">
                    Delivery Completed ({progress}%)
                  </p>
                </div>
              </div>
            </div>

            {/* 3. PRODUCT PACKAGE PHOTOS (Multiple Package Upload View) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <h4 className="font-black text-xs uppercase tracking-wider text-gray-900">
                    Product Package Verification Photos ({packagePhotos.length})
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-gray-400">Click to zoom</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {packagePhotos.map((imgUrl, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setZoomPhoto(imgUrl);
                      setActivePhotoIdx(i);
                    }}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-black/10 cursor-pointer hover:border-blue-500 shadow-2xs"
                  >
                    <img
                      src={imgUrl}
                      alt={`Package Item #${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-mono font-bold">
                      #{i + 1}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT COLUMN: ADDRESS CHIPS + PACKAGE JOURNEY & TRANSIT HISTORY       */}
          {/* ===================================================================== */}
          <div className="space-y-6">
            {/* 1. TOP ADDRESS CHIPS (Matches exact 2 side-by-side cards in screenshot) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pickup Address */}
              <div className="bg-slate-50 border border-gray-200 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                <div className="flex items-center space-x-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>PICKUP ADDRESS</span>
                </div>
                <div className="font-extrabold text-xs sm:text-sm text-gray-900 leading-snug">
                  {shipment.pickupAddress || shipment.senderAddress || 'Washington ; 1000 H St NW'}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-blue-50/50 border border-blue-200/70 rounded-2xl p-3.5 space-y-1 shadow-2xs">
                <div className="flex items-center space-x-1.5 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>DELIVERY ADDRESS</span>
                </div>
                <div className="font-extrabold text-xs sm:text-sm text-gray-900 leading-snug">
                  {shipment.deliveryAddress || `${shipment.recipientAddress}, ${shipment.recipientCountry}` || '40 North 400 West Heber City, Utah 84032'}
                </div>
              </div>
            </div>

            {/* 2. PACKAGE JOURNEY & TRANSIT HISTORY (Matches exact timeline in screenshot) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Box className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-sm sm:text-base text-gray-900 tracking-tight uppercase">
                        PACKAGE JOURNEY & TRANSIT HISTORY
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 tracking-wider">
                        • LIVE LOG
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Chronological tracking of package checkpoints, transit updates & route milestones.
                    </p>
                  </div>
                </div>
              </div>

              {/* Vertical Checkpoints Timeline */}
              {events.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs">
                  Initial manifest confirmed. Awaiting terminal scan checkpoint.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-blue-300">
                  {events.map((evt, idx) => {
                    const isArrival = evt.status === 'arrival_destination' || evt.status === 'delivered' || idx === 0;
                    return (
                      <div key={evt.id || idx} className="relative group">
                        {/* Milestone Circle Icon on the timeline */}
                        <div
                          className={`absolute -left-6 top-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md z-10 ${
                            isArrival
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {isArrival ? (
                            <Box className="w-4 h-4 text-white" />
                          ) : (
                            <Truck className="w-4 h-4 text-white" />
                          )}
                        </div>

                        {/* Milestone Card */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 ml-4 shadow-2xs hover:border-blue-400 transition-all space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              {/* Badge: ARRIVAL CHECKPOINT (purple) or TRANSIT CHECKPOINT (blue) */}
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  isArrival
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {isArrival ? 'ARRIVAL CHECKPOINT' : 'TRANSIT CHECKPOINT'}
                              </span>

                              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900">
                                {evt.title}
                              </h4>
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center space-x-1 text-gray-400 text-[11px] font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatDateTime(evt.timestamp)}</span>
                            </div>
                          </div>

                          {/* Location Pin */}
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-700">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{evt.location}</span>
                          </div>

                          {/* Reason Callout Box (Matches screenshot) */}
                          {evt.description && (
                            <div className="p-3 bg-slate-100/80 rounded-xl border border-gray-200/50 text-xs text-gray-700 leading-relaxed">
                              <span className="font-semibold text-gray-800">Reason:</span> {evt.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAYMENT MODAL (For Individual Fee or Full Outstanding Balance)            */}
      {/* ========================================================================= */}
      {(payingFee || payingAllOutstanding) && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => {
            setPayingFee(null);
            setPayingAllOutstanding(false);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 border border-gray-200 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">
                    {payingFee ? 'Settle Itemized Charge' : 'Settle Total Outstanding Balance'}
                  </h3>
                  <p className="text-[11px] text-gray-500">Official Customs & Consignment Settlement Portal</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPayingFee(null);
                  setPayingAllOutstanding(false);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Waybill Consignment:</span>
                <span className="font-mono font-bold text-gray-900">{shipment?.trackingNumber}</span>
              </div>
              {payingFee && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Charge Title:</span>
                    <span className="font-bold text-gray-900">{payingFee.title}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Assessment Reason:</span>
                    <span className="text-gray-700 italic max-w-[220px] text-right truncate">{payingFee.purpose}</span>
                  </div>
                </>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                <span className="text-xs font-black text-gray-900">Amount Due:</span>
                <span className="text-2xl font-black text-blue-700 font-mono">
                  ${(payingFee ? payingFee.amount : balanceDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700">Select Settlement Method</label>
              <select
                value={paymentMethodSelect}
                onChange={(e) => setPaymentMethodSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="Online Card Checkout (3D-Secure)">Online Card Checkout (Visa, Mastercard, Amex)</option>
                <option value="Bank Wire Transfer / Swift">Bank Wire Transfer (SWIFT / FedWire)</option>
                <option value="Cryptocurrency (USDT / BTC)">Cryptocurrency Bond (USDT-TRC20 / BTC)</option>
                <option value="Airport Bonded Counter Clearance">Airport Bonded Counter Clearance</option>
              </select>
            </div>

            {/* Payment Reference Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700">
                Payment Confirmation Code / Reference (Optional)
              </label>
              <input
                type="text"
                value={paymentReferenceInput}
                onChange={(e) => setPaymentReferenceInput(e.target.value)}
                placeholder="e.g. TXN-892102-BANK or leave blank for auto-receipt"
                className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPayingFee(null);
                  setPayingAllOutstanding(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={payingFee ? handleConfirmSingleFeePayment : handleConfirmAllOutstandingPayment}
                disabled={paymentProcessing}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {paymentProcessing ? (
                  <>
                    <Compass className="w-4 h-4 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Settle Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHOTO ZOOM MODAL                                                          */}
      {/* ========================================================================= */}
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
                  Verified Cargo Product Inspection Photo
                </h3>
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
                alt="Product Package Preview"
                className="max-h-[68vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
