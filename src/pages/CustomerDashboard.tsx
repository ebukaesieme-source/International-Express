import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  MessageSquare,
  Search,
  User,
  Shield,
  CreditCard,
  MapPin,
  Calendar,
  AlertCircle,
  ExternalLink,
  Printer,
  ChevronRight,
  Phone,
  Mail,
  Send,
  LogOut,
  History,
  Building,
  PanelLeft,
  PanelLeftClose,
  Menu,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Shipment,
  Conversation,
  PaymentRecord,
  SystemSettings
} from '../types';
import {
  getCustomerShipments,
  getOrCreateConversation,
  getShipmentPayments,
  getSystemSettings,
  recordPayment
} from '../services/cargoService';
import { ChatComponent } from '../components/ChatComponent';
import { TrackingSection } from '../components/TrackingSection';

export const CustomerDashboard: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const customerId = userProfile?.uid || 'customer_demo_1';

  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [activeTab, setActiveTab] = useState<
    'shipments' | 'track' | 'customs' | 'payment_methods' | 'chat' | 'activity_logs' | 'profile'
  >('shipments');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedTrackingCode, setSelectedTrackingCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Pay Duty modal
  const [payingShipment, setPayingShipment] = useState<Shipment | null>(null);
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const [myShipments, sysSettings] = await Promise.all([
        getCustomerShipments(customerId),
        getSystemSettings()
      ]);

      setShipments(myShipments);
      setSettings(sysSettings);

      // Get or create customer's conversation with assigned sub admin
      if (userProfile) {
        const conv = await getOrCreateConversation(
          userProfile.uid,
          userProfile.fullName,
          userProfile.email,
          userProfile.assignedSubAdminId,
          userProfile.assignedSubAdminName
        );
        setConversation(conv);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayCustomsDuty = async (s: Shipment) => {
    setPayProcessing(true);
    try {
      const ref = 'DUTY-' + Math.floor(100000 + Math.random() * 900000);
      await recordPayment({
        shipmentId: s.id,
        trackingNumber: s.trackingNumber,
        customerId: s.customerId,
        customerName: s.customerName,
        amount: s.customsDutyAmount,
        currency: s.customsDutyCurrency,
        paymentMethod: 'Consignee Cargo Duty Portal',
        status: 'confirmed',
        reference: ref,
        notes: 'Customs duty settled by customer online.'
      });

      setPayingShipment(null);
      setPaySuccess(true);
      await loadCustomerData();
    } catch (err) {
      console.error(err);
      alert('Payment processing failed. Please retry.');
    } finally {
      setPayProcessing(false);
    }
  };

  const activeShipments = shipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled');
  const deliveredShipments = shipments.filter(s => s.status === 'delivered');
  const outstandingDuties = shipments
    .filter(s => s.customsPaymentStatus === 'pending')
    .reduce((sum, s) => sum + (s.customsDutyAmount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-[#0b132b] text-white px-4 sm:px-6 py-4 border-b border-[#1c2541] shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Top hand corner navigation toggle icon - opens all siders / toggles full screen */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center space-x-2 cursor-pointer shrink-0"
              title={sidebarOpen ? "Full Screen Function (Hide Siders)" : "Click to See All Siders"}
            >
              <Menu className="w-5 h-5 text-white" />
              <span>{sidebarOpen ? 'Full Screen' : 'All Siders'}</span>
            </button>

            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-base sm:text-lg shadow-md shrink-0">
              {userProfile?.fullName?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-xl font-black text-white">{userProfile?.fullName}</h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Verified Consignee
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                Delivery Account: <strong className="text-gray-200">{userProfile?.email}</strong> • {userProfile?.country || 'International'}
              </p>
            </div>
          </div>

          {/* Assigned Sub Admin info card & Top Sign Out */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="bg-[#1c2541] border border-gray-700/80 rounded-2xl px-3.5 py-2 flex items-center space-x-2.5 text-xs">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                  Assigned Logistics Dispatcher
                </div>
                {!userProfile?.assignedSubAdminId || userProfile.assignedSubAdminId === '' ? (
                  <div className="font-bold text-amber-300 text-[11px] flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Awaiting Dispatcher Acceptance</span>
                  </div>
                ) : (
                  <div className="font-bold text-white text-[11px]">
                    {userProfile?.assignedSubAdminName}
                  </div>
                )}
              </div>
              {userProfile?.assignedSubAdminId && (
                <button
                  onClick={() => setActiveTab('chat')}
                  className="ml-2 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Message
                </button>
              )}
            </div>

            <button
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
              className="px-3 py-2 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Announcement if present */}
      {settings?.announcement && (
        <div className="bg-blue-900/40 border-b border-blue-800 text-blue-200 px-6 py-2.5 text-xs text-center font-medium">
          📢 <strong>Notice from Operations:</strong> {settings.announcement}
        </div>
      )}

      {/* Unassigned Welcome Info Banner for New Customers */}
      {(!userProfile?.assignedSubAdminId || userProfile.assignedSubAdminId === '') && (
        <div className="bg-amber-500/10 border-b border-amber-300 text-amber-900 px-6 py-3 text-xs text-center font-medium flex items-center justify-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>
            <strong>Account Registered:</strong> Your consignee account is pending acceptance by a regional Sub Admin dispatcher. You will be connected automatically as soon as an operations manager accepts your consignment file.
          </span>
        </div>
      )}

      {/* Mobile Drawer Backdrop when siders are open on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Layout: Sider Drawer & Full Screen Function Area */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto p-2 sm:p-4 lg:p-6 gap-4 sm:gap-6 min-w-0 relative">
        {/* Navigation Sidebar Drawer */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white p-4 shadow-2xl flex flex-col transition-transform duration-200
            lg:static lg:z-auto lg:shadow-sm lg:rounded-3xl lg:border lg:border-gray-200 lg:transition-none lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto shrink-0
            ${sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden lg:hidden'}
          `}
        >
            {/* Header with Top-Right Collapse Icon */}
            <div className="flex items-center justify-between px-1 py-1 mb-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-gray-900 leading-tight">Customer Portal</h2>
                  <span className="text-[9px] font-extrabold tracking-wider text-gray-400 uppercase">CUSTOMER</span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Collapse Sider"
              >
                <PanelLeftClose className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="h-0.5 bg-gradient-to-r from-blue-500/20 via-blue-500/50 to-transparent rounded-full mb-3" />

            {/* Menu Items */}
            <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
              <button
                onClick={() => setActiveTab('shipments')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'shipments'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Package className="w-4 h-4 shrink-0" />
                  <span className="truncate">Consignments</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {shipments.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('track')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'track'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Search className="w-4 h-4 shrink-0" />
                  <span className="truncate">Live Tracker</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </button>

              <button
                onClick={() => setActiveTab('customs')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'customs'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Duties</span>
                </div>
                {outstandingDuties > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 shrink-0">
                    ${outstandingDuties}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('payment_methods')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'payment_methods'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span className="truncate">Pay Methods</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate">Dispatcher Chat</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('activity_logs')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'activity_logs'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <History className="w-4 h-4 shrink-0" />
                  <span className="truncate">Logs</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <User className="w-4 h-4 shrink-0" />
                  <span className="truncate">Profile</span>
                </div>
              </button>
            </nav>

            {/* Red Sign Out Button at Bottom */}
            <div className="pt-3 mt-auto border-t border-gray-100">
              <button
                onClick={async () => {
                  await logout();
                  window.location.reload();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-600 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

        {/* Function Display Area: Displays full screen well when siders are closed */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          {/* Helpful quick bar when siders are hidden */}
          {!sidebarOpen && (
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Full Screen View Active: <strong className="text-blue-600 uppercase">{activeTab}</strong></span>
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Menu className="w-3.5 h-3.5 text-white" />
                <span>See All Siders</span>
              </button>
            </div>
          )}

        {/* TAB 1: SHIPMENTS OVERVIEW */}
        {activeTab === 'shipments' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Active in Transit
                </span>
                <div className="text-2xl font-black text-blue-600 mt-2">{activeShipments.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">Air cargo packages en route</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Completed Deliveries
                </span>
                <div className="text-2xl font-black text-emerald-600 mt-2">{deliveredShipments.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">Successfully signed for</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Pending Customs Tariffs
                </span>
                <div className="text-2xl font-black text-amber-600 mt-2">${outstandingDuties.toFixed(2)}</div>
                <div className="text-[11px] text-gray-400 mt-1">Settle to expedite release</div>
              </div>
            </div>

            {/* Shipments List */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-black text-base text-gray-900">Your Cargo Consignments</h3>
                <span className="text-xs text-gray-400">{shipments.length} Total Bookings</span>
              </div>

              {shipments.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">
                  No active cargo shipments under your customer profile yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {shipments.map((s) => (
                    <div
                      key={s.id}
                      className="p-5 bg-slate-50 border border-gray-200 rounded-2xl hover:border-blue-400 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-base font-black text-gray-900">
                            {s.trackingNumber}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800">
                            {s.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-gray-700">{s.description}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <span>{s.departureLocation} → {s.destinationLocation}</span>
                          </span>
                          <span>•</span>
                          <span className="text-blue-700 font-bold">
                            Current Location: {s.currentLocation || s.departureLocation}
                          </span>
                          <span>•</span>
                          <span>Carrier: <strong className="text-gray-700">{s.carrier}</strong></span>
                          <span>•</span>
                          <span>Est. Arrival: <strong className="text-gray-700">{s.estimatedDeliveryDate}</strong></span>
                        </div>

                        {/* Delivery Moving Progress Bar */}
                        <div className="pt-2 max-w-md">
                          <div className="flex justify-between text-[11px] font-mono font-bold text-gray-600 mb-1">
                            <span>Delivery Moving Progress</span>
                            <span className="text-blue-600">{s.deliveryProgressPercentage ?? 35}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 rounded-full"
                              style={{ width: `${s.deliveryProgressPercentage ?? 35}%` }}
                            />
                          </div>
                        </div>

                        {/* Fee Purpose & Assessment */}
                        {s.customsDutyAmount > 0 && (
                          <div className="text-xs text-amber-800 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200 inline-block mt-1">
                            <span className="font-bold">Assessed Fee:</span> {s.customsDutyCurrency} {s.customsDutyAmount.toFixed(2)} • <span className="font-semibold text-gray-700">Purpose: {s.feePurpose || 'Bonded Inspection & Customs Tariffs'}</span> ({s.customsPaymentStatus})
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 self-end lg:self-center">
                        {s.customsPaymentStatus === 'pending' && s.customsDutyAmount > 0 && (
                          <button
                            onClick={() => setPayingShipment(s)}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Fee (${s.customsDutyAmount})</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedTrackingCode(s.trackingNumber);
                            setActiveTab('track');
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Track Telemetry</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE WAYBILL TRACKER */}
        {activeTab === 'track' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs animate-fadeIn">
            <TrackingSection initialTrackingNumber={selectedTrackingCode || shipments[0]?.trackingNumber || 'IEC-748920-EXP'} />
          </div>
        )}

        {/* TAB 3: CUSTOMS DUTIES */}
        {activeTab === 'customs' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-black text-lg text-gray-900">Customs Clearance & Duties</h3>
              <p className="text-xs text-gray-500">
                Official tariffs, duties, and inspection fees assessed by destination border authorities.
              </p>
            </div>

            {paySuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Duty settled successfully! Your receipt reference has been recorded in the consignment ledger.</span>
              </div>
            )}

            <div className="space-y-4">
              {shipments.map((s) => (
                <div key={s.id} className="p-5 bg-slate-50 border border-gray-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-gray-900">{s.trackingNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        s.customsPaymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.customsPaymentStatus}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-gray-800">
                      Fee Purpose: <span className="text-amber-800">{s.feePurpose || 'Bonded Inspection & Customs Tariffs'}</span>
                    </div>
                    <p className="text-xs text-gray-600">{s.customsNotes || 'Standard customs clearance inspection.'}</p>
                    {s.customsReference && (
                      <div className="text-[11px] font-mono text-gray-400">Ref: {s.customsReference}</div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Assessed Duty</div>
                      <div className="text-lg font-black text-amber-600 font-mono">
                        {s.customsDutyCurrency} {s.customsDutyAmount?.toFixed(2)}
                      </div>
                    </div>

                    {s.customsPaymentStatus === 'pending' && s.customsDutyAmount > 0 && (
                      <button
                        onClick={() => setPayingShipment(s)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        Settle Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DISPATCHER CHAT */}
        {activeTab === 'chat' && (
          <div className="animate-fadeIn">
            {conversation && userProfile ? (
              <ChatComponent
                conversation={conversation}
                currentUserProfile={userProfile}
              />
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl text-gray-400 text-sm">
                Initializing communication channel with dispatcher...
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && userProfile && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs max-w-2xl space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-black text-lg text-gray-900">Consignee Profile & Account Details</h3>
              <p className="text-xs text-gray-500">
                Your verified identity details used for Air Waybill documentation and border customs verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Legal Name</span>
                <div className="font-bold text-gray-900 mt-0.5 text-sm">{userProfile.fullName}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Email Address</span>
                <div className="font-bold text-gray-900 mt-0.5 text-sm">{userProfile.email}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Phone Number</span>
                <div className="font-bold text-gray-900 mt-0.5 text-sm">{userProfile.phoneNumber || 'Not provided'}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Country of Residence</span>
                <div className="font-bold text-gray-900 mt-0.5 text-sm">{userProfile.country || 'International'}</div>
              </div>

              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-400 uppercase text-[10px]">Delivery Street Address</span>
                <div className="font-bold text-gray-900 mt-0.5 text-sm">{userProfile.address || 'Standard Airport Delivery'}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PAYMENT METHODS */}
        {activeTab === 'payment_methods' && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
            <div className="pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Customs Duties & Cargo Payment Corridors</span>
              </h2>
              <p className="text-xs text-gray-500">
                Direct official international settlement channels accepted for releasing freight through customs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Wire */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Official Bank Wire (SWIFT / IBAN)</h4>
                    <span className="text-[10px] text-gray-400">Escrow Clearance</span>
                  </div>
                </div>
                <div className="text-xs text-gray-700 font-mono space-y-1 bg-white p-3.5 rounded-xl border border-gray-200">
                  <div>Account: <strong>International Express Cargo Logistics Ltd</strong></div>
                  <div>IBAN: <strong>GB29 IECB 6016 1331 9284 90</strong></div>
                  <div>SWIFT: <strong>IECBLON2X</strong></div>
                </div>
              </div>

              {/* Crypto Escrow */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Cryptocurrency Settlement (USDT TRC20)</h4>
                    <span className="text-[10px] text-gray-400">Instant Release</span>
                  </div>
                </div>
                <div className="text-xs text-gray-700 font-mono space-y-1 bg-white p-3.5 rounded-xl border border-gray-200">
                  <div className="text-[10px] text-gray-400">Deposit Address (TRC-20 Network):</div>
                  <div className="text-blue-600 font-bold break-all">TYZ8m2jA4bKk9X7u1zRtLqWeVx6P2mQas9</div>
                  <div className="text-[10px] text-emerald-600 font-semibold pt-1">
                    ✓ Immediate automated release upon payment broadcast
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ACTIVITY LOGS */}
        {activeTab === 'activity_logs' && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
            <div className="pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                <History className="w-5 h-5 text-blue-600" />
                <span>Account & Consignment Activity Logs</span>
              </h2>
              <p className="text-xs text-gray-500">
                Log of your waybill milestones, clearance checks, and communication history.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600 uppercase text-[10px]">Portal Login</span>
                  <span className="text-gray-400 text-[10px]">{new Date().toLocaleString()}</span>
                </div>
                <p className="text-gray-800 font-medium">Consignee session active for {userProfile?.email}.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600 uppercase text-[10px]">Air Freight Synchronization</span>
                  <span className="text-gray-400 text-[10px]">220+ Global Hubs Active</span>
                </div>
                <p className="text-gray-800 font-medium">Consignment telematics updated from cargo freighters.</p>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>

      {/* PAY DUTY MODAL */}
      {payingShipment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-lg text-gray-900">Customs Duty Electronic Settlement</h3>
            <p className="text-xs text-gray-500">
              Settle border tariffs for Waybill <strong className="font-mono text-gray-900">{payingShipment.trackingNumber}</strong>.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Consignment:</span>
                <span className="font-bold text-gray-800">{payingShipment.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Port of Clearance:</span>
                <span className="font-bold text-gray-800">{payingShipment.destinationLocation}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                <span className="font-bold text-gray-900">Total Tariff Amount:</span>
                <span className="font-black text-amber-600 font-mono">
                  {payingShipment.customsDutyCurrency} {payingShipment.customsDutyAmount?.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setPayingShipment(null)}
                className="px-4 py-2 font-bold text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePayCustomsDuty(payingShipment)}
                disabled={payProcessing}
                className="px-5 py-2 font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {payProcessing ? 'Processing...' : 'Authorize Electronic Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
