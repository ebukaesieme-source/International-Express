import React, { useState, useEffect } from 'react';
import {
  Users,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  MessageSquare,
  Plus,
  Edit,
  Search,
  FileText,
  Upload,
  Camera,
  ChevronRight,
  Shield,
  CreditCard,
  Building,
  MapPin,
  RefreshCw,
  Send,
  X,
  TrendingUp,
  LogOut,
  History,
  Settings,
  PanelLeft,
  PanelLeftClose,
  UserCheck,
  UserPlus,
  ChevronLeft,
  Menu,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  UserProfile,
  Shipment,
  Conversation,
  PaymentRecord,
  ShipmentStatus,
  CustomsPaymentStatus
} from '../types';
import {
  getCustomers,
  getUnassignedCustomers,
  claimCustomer,
  getSubAdminShipments,
  getSubAdminConversations,
  getOrCreateConversation,
  createShipment,
  updateShipment,
  updateCustomsDuty,
  getAllPayments,
  confirmPayment,
  addTrackingEvent,
  addAuditLog
} from '../services/cargoService';
import { ChatComponent } from '../components/ChatComponent';

export const SubAdminDashboard: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const subAdminId = userProfile?.uid || 'sub_admin_1';

  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [activeTab, setActiveTab] = useState<
    'overview' | 'customers' | 'shipments' | 'customs' | 'messages' | 'payment_methods' | 'activity_logs' | 'settings'
  >('overview');
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [unassignedCustomers, setUnassignedCustomers] = useState<UserProfile[]>([]);
  const [customerSubTab, setCustomerSubTab] = useState<'assigned' | 'unassigned'>('assigned');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);

  // Active chat
  const [activeChatConversation, setActiveChatConversation] = useState<Conversation | null>(null);

  // Milestone Event form
  const [showMilestoneModal, setShowMilestoneModal] = useState<Shipment | null>(null);
  const [milestoneStatus, setMilestoneStatus] = useState<ShipmentStatus>('in_transit');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneLocation, setMilestoneLocation] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneProgress, setMilestoneProgress] = useState<number>(50);

  // Customs Duty update state
  const [showCustomsModal, setShowCustomsModal] = useState<Shipment | null>(null);
  const [dutyAmount, setDutyAmount] = useState(0);
  const [dutyCurrency, setDutyCurrency] = useState('USD');
  const [dutyStatus, setDutyStatus] = useState<CustomsPaymentStatus>('pending');
  const [dutyPurpose, setDutyPurpose] = useState('');
  const [dutyRef, setDutyRef] = useState('');
  const [dutyNotes, setDutyNotes] = useState('');

  // Shipment Form
  const [shipmentForm, setShipmentForm] = useState({
    trackingNumber: '',
    customerId: '',
    customerName: '',
    customerEmail: '',
    description: '',
    packageType: 'Heavy Crate',
    weightKg: 45,
    pieces: 1,
    senderName: '',
    senderAddress: '',
    senderCountry: 'United States',
    recipientName: '',
    recipientAddress: '',
    recipientCountry: 'United Kingdom',
    departureLocation: 'New York (JFK)',
    destinationLocation: 'London (LHR)',
    currentLocation: 'JFK Airport Ramp',
    carrier: 'Boeing 747-8F',
    status: 'registered' as ShipmentStatus,
    estimatedDeliveryDate: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
    customsDutyAmount: 350,
    customsDutyCurrency: 'USD',
    customsPaymentStatus: 'pending' as CustomsPaymentStatus,
    customsNotes: ''
  });

  useEffect(() => {
    loadSubAdminData();
  }, [subAdminId]);

  const loadSubAdminData = async () => {
    setLoading(true);
    try {
      const [custs, unassigned, ships, convs, allPays] = await Promise.all([
        getCustomers(subAdminId),
        getUnassignedCustomers(),
        getSubAdminShipments(subAdminId),
        getSubAdminConversations(subAdminId),
        getAllPayments()
      ]);

      setCustomers(custs);
      setUnassignedCustomers(unassigned);
      setShipments(ships);
      setConversations(convs);
      setPayments(allPays.filter(p => ships.some(s => s.id === p.shipmentId)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCustomer = async (cust: UserProfile) => {
    setAcceptingId(cust.uid);
    try {
      await claimCustomer(
        cust.uid,
        subAdminId,
        userProfile?.fullName || 'Regional Dispatcher',
        'sub_admin'
      );
      setAcceptSuccess(`Successfully accepted ${cust.fullName}! You are now their assigned dispatch administrator.`);
      setTimeout(() => setAcceptSuccess(null), 6000);
      await loadSubAdminData();
      setCustomerSubTab('assigned');
    } catch (err) {
      console.error(err);
      alert('Failed to accept customer account.');
    } finally {
      setAcceptingId(null);
    }
  };

  // Metrics
  const totalAssignedCustomers = customers.length;
  const activeShipmentsCount = shipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length;
  const pendingDeliveries = shipments.filter(s => s.status !== 'delivered').length;
  const completedDeliveries = shipments.filter(s => s.status === 'delivered').length;
  const outstandingDutyTotal = shipments
    .filter(s => s.customsPaymentStatus === 'pending')
    .reduce((sum, s) => sum + (s.customsDutyAmount || 0), 0);

  // Save or update shipment
  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShipment) {
        await updateShipment(
          editingShipment.id,
          {
            ...shipmentForm,
            subAdminId,
            subAdminName: userProfile?.fullName || 'Sub Admin'
          },
          userProfile?.fullName || 'Sub Admin',
          'sub_admin'
        );
      } else {
        const tracking = shipmentForm.trackingNumber.trim().toUpperCase() ||
          `IEC-${Math.floor(100000 + Math.random() * 900000)}-EXP`;

        await createShipment(
          {
            ...shipmentForm,
            trackingNumber: tracking,
            subAdminId,
            subAdminName: userProfile?.fullName || 'Sub Admin'
          },
          userProfile?.fullName || 'Sub Admin',
          'sub_admin'
        );
      }

      setShowShipmentModal(false);
      setEditingShipment(null);
      loadSubAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to save shipment.');
    }
  };

  // Add Milestone Event (Location, moving percentage, and checkpoint)
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMilestoneModal) return;

    try {
      await addTrackingEvent({
        shipmentId: showMilestoneModal.id,
        trackingNumber: showMilestoneModal.trackingNumber,
        status: milestoneStatus,
        title: milestoneTitle || `Consignment checkpoint: ${milestoneStatus.replace(/_/g, ' ')}`,
        description: milestoneDesc,
        location: milestoneLocation || showMilestoneModal.destinationLocation,
        facility: milestoneLocation ? `${milestoneLocation} Gateway Hub` : undefined,
        deliveryProgressPercentage: milestoneProgress,
        timestamp: new Date().toISOString(),
        recordedBy: userProfile?.fullName || 'Sub Admin',
        recordedByRole: 'sub_admin'
      });

      // Update shipment status, location at every change, and delivery moving percentage
      await updateShipment(
        showMilestoneModal.id,
        {
          status: milestoneStatus,
          currentLocation: milestoneLocation || showMilestoneModal.currentLocation,
          deliveryProgressPercentage: milestoneProgress,
          statusNotes: milestoneDesc
        },
        userProfile?.fullName || 'Sub Admin',
        'sub_admin'
      );

      setShowMilestoneModal(null);
      setMilestoneTitle('');
      setMilestoneLocation('');
      setMilestoneDesc('');
      loadSubAdminData();
      alert('Checkpoint recorded: Location & delivery moving progress updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to add milestone.');
    }
  };

  // Customs fee & purpose update
  const handleSaveCustoms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCustomsModal) return;

    try {
      await updateCustomsDuty(
        showCustomsModal.id,
        dutyAmount,
        dutyCurrency,
        dutyStatus,
        dutyRef,
        dutyNotes,
        dutyPurpose
      );

      await addAuditLog(
        'customs_duty_updated',
        userProfile?.fullName || 'Sub Admin',
        'sub_admin',
        `Sub Admin updated fee on ${showCustomsModal.trackingNumber}: ${dutyCurrency} ${dutyAmount} (Purpose: "${dutyPurpose || 'Bonded Inspection'}") [${dutyStatus}]`
      );

      setShowCustomsModal(null);
      loadSubAdminData();
      alert(`Customs fee updated: ${dutyCurrency} ${dutyAmount} recorded with purpose "${dutyPurpose || 'Customs Clearance'}".`);
    } catch (err) {
      console.error(err);
      alert('Failed to update customs fee.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-[#0b132b] text-white px-4 sm:px-6 py-4 border-b border-[#1c2541] shadow-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
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

          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-black tracking-tight text-white">Sub Admin Logistics Station</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-blue-500 text-white tracking-wider">
                Route Manager
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-400">
              Station Officer: <strong className="text-white">{userProfile?.fullName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {unassignedCustomers.length > 0 && (
            <button
              onClick={() => {
                setActiveTab('customers');
                setCustomerSubTab('unassigned');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center space-x-1.5 animate-pulse cursor-pointer"
              title="New Customer Registrations Awaiting Acceptance"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{unassignedCustomers.length} Awaiting Dispatch</span>
            </button>
          )}

          <button
            onClick={loadSubAdminData}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

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
                  <h2 className="font-extrabold text-sm text-gray-900 leading-tight">Dispatch Station</h2>
                  <span className="text-[9px] font-extrabold tracking-wider text-gray-400 uppercase">SUB ADMIN</span>
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
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span className="truncate">Overview</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'customers'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">Customers</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  {unassignedCustomers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white animate-pulse" title="Unassigned Registrations">
                      +{unassignedCustomers.length}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {customers.length}
                  </span>
                </div>
              </button>

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
                  <span className="truncate">Shipments</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {shipments.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate">Messages</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {conversations.length}
                </span>
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
                  <span className="truncate">Customs</span>
                </div>
                {outstandingDutyTotal > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    ${outstandingDutyTotal}
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
                  <span className="truncate">Payments</span>
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
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="truncate">Settings</span>
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
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Unassigned Registrations Notification Banner */}
              {unassignedCustomers.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-orange-500/10 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-950">
                        {unassignedCustomers.length} New Customer Registration(s) Awaiting Dispatcher
                      </h4>
                      <p className="text-xs text-amber-800">
                        New consignees have registered. Any Sub Admin can accept them into their dispatch station to begin serving them.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('customers');
                      setCustomerSubTab('unassigned');
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors"
                  >
                    View & Accept Registrations
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Assigned Consignees
                  </span>
                  <div className="text-2xl font-black text-gray-900 mt-2">{totalAssignedCustomers}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Managed under your dispatch queue</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Active Consignments
                  </span>
                  <div className="text-2xl font-black text-blue-600 mt-2">{activeShipmentsCount}</div>
                  <div className="text-[11px] text-gray-400 mt-1">In transit or airport processing</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Completed Deliveries
                  </span>
                  <div className="text-2xl font-black text-emerald-600 mt-2">{completedDeliveries}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Successfully signed doorstep handoffs</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Outstanding Tariffs
                  </span>
                  <div className="text-2xl font-black text-amber-600 mt-2">${outstandingDutyTotal.toLocaleString()}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Unsettled customs fees</div>
                </div>
              </div>

              {/* Quick Actions & Recent Shipments */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-base text-gray-900">Recent Route Shipments</h3>
                  <button
                    onClick={() => {
                      setEditingShipment(null);
                      setShowShipmentModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Book Consignment</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {shipments.slice(0, 5).map((s) => (
                    <div key={s.id} className="p-4 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-gray-900">{s.trackingNumber}</div>
                        <div className="text-gray-500 text-[11px]">{s.customerName} • {s.description}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                          {s.status.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={() => {
                            setShowMilestoneModal(s);
                            setMilestoneStatus(s.status);
                          }}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-gray-800 font-bold rounded-lg cursor-pointer"
                        >
                          Log Milestone
                        </button>
                      </div>
                    </div>
                  ))}
                  {shipments.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No shipments recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMERS MANAGEMENT (ASSIGNED + UNASSIGNED ACCEPTANCE) */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4">
              {acceptSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{acceptSuccess}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-black text-base text-gray-900">Consignee Customer Management</h3>
                  <p className="text-xs text-gray-500">
                    Accept newly registered customers into your dispatch station or manage existing relationships.
                  </p>
                </div>

                {/* Sub tabs: My Assigned vs Available Registrations */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setCustomerSubTab('assigned')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      customerSubTab === 'assigned'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    My Consignees ({customers.length})
                  </button>
                  <button
                    onClick={() => setCustomerSubTab('unassigned')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      customerSubTab === 'unassigned'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>Available Registrations</span>
                    {unassignedCustomers.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                        {unassignedCustomers.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Subtab 1: Available Unclaimed Registrations (Any Sub Admin Can Accept) */}
              {customerSubTab === 'unassigned' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2.5">
                    <UserPlus className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Self-Service Dispatch Allocation:</strong> When a new customer registers on the website, any Sub Admin can accept them. Clicking <em>"Accept Customer into My Dispatch"</em> immediately assigns that customer to you, binds your dispatcher-customer relationship, and opens your private messaging channel.
                    </div>
                  </div>

                  {unassignedCustomers.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                      <UserCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <h4 className="font-bold text-sm text-gray-800">No Unclaimed Registrations</h4>
                      <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                        All registered customers are currently claimed and operating with dispatchers. New consignee registrations will immediately appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Consignee Name & Company</th>
                            <th className="py-3 px-4">Contact Info</th>
                            <th className="py-3 px-4">Country & Address</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {unassignedCustomers.map((c) => (
                            <tr key={c.uid} className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <div className="font-bold text-gray-900">{c.fullName}</div>
                                <div className="text-[11px] text-gray-500">{c.companyName || 'Individual Consignee'}</div>
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                <div>{c.email}</div>
                                <div className="text-[11px] text-gray-400">{c.phone || c.phoneNumber || 'No phone recorded'}</div>
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                <div className="font-semibold">{c.country || 'International'}</div>
                                <div className="text-[11px] text-gray-500 truncate max-w-xs">{c.address || c.city || 'Standard Depot'}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Awaiting Dispatcher
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleAcceptCustomer(c)}
                                  disabled={acceptingId === c.uid}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 ml-auto shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>{acceptingId === c.uid ? 'Accepting...' : 'Accept Customer'}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Subtab 2: Currently Assigned Customers */}
              {customerSubTab === 'assigned' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Consignee Name</th>
                        <th className="py-3 px-4">Email & Phone</th>
                        <th className="py-3 px-4">Delivery Country</th>
                        <th className="py-3 px-4 text-right">Direct Dispatch Chat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customers.map((c) => (
                        <tr key={c.uid} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">{c.fullName}</div>
                            <div className="text-[11px] text-gray-500">{c.companyName}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            <div>{c.email}</div>
                            <div className="text-[11px] text-gray-400">{c.phone || c.phoneNumber}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{c.country}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  let conv = conversations.find(x => x.customerId === c.uid);
                                  if (!conv) {
                                    conv = await getOrCreateConversation(
                                      c.uid,
                                      c.fullName,
                                      c.email,
                                      c.assignedSubAdminId,
                                      c.assignedSubAdminName
                                    );
                                    if (conv) {
                                      setConversations(prev => [...prev, conv!]);
                                    }
                                  }
                                  if (conv) {
                                    setActiveChatConversation(conv);
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert('Could not initialize conversation channel.');
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              Open Chat
                            </button>
                          </td>
                        </tr>
                      ))}
                      {customers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400">
                            No customers currently assigned to your dispatch station. Click <em>"Available Registrations"</em> above to accept registered customers.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        {/* TAB 3: SHIPMENTS MANAGEMENT */}
        {activeTab === 'shipments' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-gray-900">Station Shipments & Waybills</h3>
              <button
                onClick={() => {
                  setEditingShipment(null);
                  setShowShipmentModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Book New Consignment</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Tracking Code & Consignee</th>
                    <th className="py-3 px-4">Route & Current Location</th>
                    <th className="py-3 px-4">Delivery Moving Progress</th>
                    <th className="py-3 px-4">Customs Fee & Purpose</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shipments.map((s) => {
                    const prog = s.deliveryProgressPercentage ?? 35;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-gray-900">{s.trackingNumber}</div>
                          <div className="text-[11px] text-gray-600 font-medium">{s.customerName}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-100 text-blue-800">
                            {s.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-gray-700 font-semibold">{s.departureLocation} → {s.destinationLocation}</div>
                          <div className="text-[11px] text-blue-700 font-bold flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>Location: {s.currentLocation || s.departureLocation}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 min-w-[150px]">
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-700 mb-1">
                            <span>Moving Track</span>
                            <span className="text-blue-600">{prog}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
                              style={{ width: `${prog}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-amber-700 font-mono text-xs">
                            {s.customsDutyCurrency} {s.customsDutyAmount?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-[10px] text-gray-600 truncate max-w-[170px]" title={s.feePurpose}>
                            {s.feePurpose || 'Standard Clearance Fee'}
                          </div>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            s.customsPaymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.customsPaymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setShowMilestoneModal(s);
                              setMilestoneStatus(s.status);
                              setMilestoneLocation(s.currentLocation || s.departureLocation);
                              setMilestoneProgress(s.deliveryProgressPercentage ?? 35);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg cursor-pointer text-xs transition-colors"
                            title="Control delivery percentage & write location"
                          >
                            Progress & Location
                          </button>
                          <button
                            onClick={() => {
                              setShowCustomsModal(s);
                              setDutyAmount(s.customsDutyAmount || 0);
                              setDutyCurrency(s.customsDutyCurrency || 'USD');
                              setDutyStatus(s.customsPaymentStatus || 'pending');
                              setDutyRef(s.customsReference || '');
                              setDutyNotes(s.customsNotes || '');
                              setDutyPurpose(s.feePurpose || 'Bonded Inspection & Customs Tariffs');
                            }}
                            className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold rounded-lg cursor-pointer text-xs transition-colors"
                            title="Add any fee amount & write purpose"
                          >
                            Fee & Purpose
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMS DUTIES */}
        {activeTab === 'customs' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="font-black text-base text-gray-900">Customs Duty Management</h3>
            <p className="text-xs text-gray-500">
              Manage tariff assessments, currency options, payment references, and payment verification.
            </p>

            <div className="space-y-3">
              {shipments.map((s) => (
                <div key={s.id} className="p-4 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-gray-900 font-mono">{s.trackingNumber} - {s.customerName}</div>
                    <div className="text-gray-500">{s.customsNotes || 'Standard customs clearance verification.'}</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-bold text-amber-600 font-mono text-sm">
                        {s.customsDutyCurrency} {s.customsDutyAmount?.toFixed(2)}
                      </div>
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        {s.customsPaymentStatus}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setShowCustomsModal(s);
                        setDutyAmount(s.customsDutyAmount || 0);
                        setDutyCurrency(s.customsDutyCurrency || 'USD');
                        setDutyStatus(s.customsPaymentStatus || 'pending');
                        setDutyRef(s.customsReference || '');
                        setDutyNotes(s.customsNotes || '');
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                    >
                      Update Tariffs
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MESSAGES */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="font-black text-base text-gray-900">Customer Communication Channels</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveChatConversation(conv)}
                  className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:border-blue-400 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900">{conv.customerName}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1 italic">{conv.lastMessage}</p>
                  <div className="text-[11px] font-bold text-blue-600 pt-1">Open Chat Room →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: PAYMENT METHODS */}
        {activeTab === 'payment_methods' && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
            <div className="pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Station Duty Escrow & Payment Methods</span>
              </h2>
              <p className="text-xs text-gray-500">
                Official payment corridors accepted for customs tariffs and air freight charges at your station.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-gray-900 text-sm">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>Central Corporate Bank Wire (SWIFT / IBAN)</span>
                </div>
                <p className="text-xs text-gray-600 font-mono bg-white p-3 rounded-xl border border-gray-200">
                  Beneficiary: International Express Cargo Ltd<br />
                  IBAN: GB29 IECB 6016 1331 9284 90<br />
                  SWIFT: IECBLON2X
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-gray-900 text-sm">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>Station Crypto Tariff Escrow (USDT TRC20)</span>
                </div>
                <p className="text-xs text-gray-600 font-mono bg-white p-3 rounded-xl border border-gray-200 break-all">
                  Deposit: TYZ8m2jA4bKk9X7u1zRtLqWeVx6P2mQas9
                </p>
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
                <span>Dispatcher Activity Logs</span>
              </h2>
              <p className="text-xs text-gray-500">
                Audit record of route updates, milestone scans, customs duties issued, and consignee interactions.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600 uppercase text-[10px]">Session Active</span>
                  <span className="text-gray-400 text-[10px]">{new Date().toLocaleString()}</span>
                </div>
                <p className="text-gray-800 font-medium">Station dispatcher {userProfile?.fullName} logged into terminal.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600 uppercase text-[10px]">Route Monitoring</span>
                  <span className="text-gray-400 text-[10px]">Synchronized</span>
                </div>
                <p className="text-gray-800 font-medium">Active tracking feed linked to global air cargo freighters.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: STATION SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
            <div className="pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>Station Dispatcher Profile</span>
              </h2>
              <p className="text-xs text-gray-500">
                Your assigned station, dispatch credentials, and regional forwarding corridor details.
              </p>
            </div>

            <div className="space-y-4 max-w-xl text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-2">
                <div>Dispatcher Name: <strong className="text-gray-900">{userProfile?.fullName}</strong></div>
                <div>Station Email: <strong className="text-gray-900">{userProfile?.email}</strong></div>
                <div>Station Role: <strong className="text-blue-600 uppercase">Sub Admin / Dispatch Lead</strong></div>
                <div>Station City: <strong className="text-gray-900">{userProfile?.city || 'Global Cargo Center'}</strong></div>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>

      {/* MILESTONE, LOCATION & MOVING PERCENTAGE MODAL */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base text-gray-900">
                  Update Location & Delivery Progress
                </h3>
                <p className="text-[11px] text-gray-500">
                  Tracking: <strong className="font-mono text-blue-600">{showMilestoneModal.trackingNumber}</strong>
                </p>
              </div>
              <button onClick={() => setShowMilestoneModal(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4 text-xs">
              {/* 1. WRITE LOCATION AT EVERY CHANGE */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <label className="font-black text-blue-900 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Write Location at this Change *</span>
                </label>
                <input
                  type="text"
                  required
                  value={milestoneLocation}
                  onChange={(e) => setMilestoneLocation(e.target.value)}
                  placeholder="e.g. Frankfurt Gateway Terminal 4, Germany"
                  className="w-full p-2.5 bg-white border border-blue-300 rounded-xl font-bold text-gray-900"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-500 font-semibold self-center">Suggestions:</span>
                  {[
                    showMilestoneModal.departureLocation,
                    showMilestoneModal.destinationLocation,
                    'JFK Cargo Hub, New York',
                    'Heathrow Express Terminal, London',
                    'Frankfurt Main Hub 2',
                    'Dubai Al Maktoum Airport'
                  ].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setMilestoneLocation(loc)}
                      className="px-2 py-0.5 bg-white hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md text-[10px] font-bold cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. CONTROL PERCENTAGE WHICH DELIVERY IS MOVING */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-indigo-950 flex items-center space-x-1.5">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>Control Delivery Moving Percentage</span>
                  </label>
                  <span className="font-mono font-black text-base text-indigo-700 px-2 py-0.5 rounded-lg bg-white border border-indigo-200">
                    {milestoneProgress}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={milestoneProgress}
                  onChange={(e) => setMilestoneProgress(parseInt(e.target.value, 10))}
                  className="w-full h-2.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-1">
                  {[
                    { label: '15% Origin', val: 15, st: 'package_received' as ShipmentStatus },
                    { label: '35% Depart', val: 35, st: 'departure' as ShipmentStatus },
                    { label: '55% Flight', val: 55, st: 'in_transit' as ShipmentStatus },
                    { label: '75% Customs', val: 75, st: 'customs_processing' as ShipmentStatus },
                    { label: '90% Courier', val: 90, st: 'out_for_delivery' as ShipmentStatus },
                    { label: '100% Done', val: 100, st: 'delivered' as ShipmentStatus }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => {
                        setMilestoneProgress(preset.val);
                        setMilestoneStatus(preset.st);
                      }}
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        milestoneProgress === preset.val
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status and Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Official Status Stage</label>
                  <select
                    value={milestoneStatus}
                    onChange={(e) => setMilestoneStatus(e.target.value as ShipmentStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold mt-1"
                  >
                    <option value="package_received">Package Received at Terminal</option>
                    <option value="processing">Cargo Screening & Palletizing</option>
                    <option value="departure">Departed Airport Ramp</option>
                    <option value="in_transit">In Global Flight Corridor</option>
                    <option value="arrival_destination">Arrived Destination Airport</option>
                    <option value="customs_processing">Customs Clearance Inspection</option>
                    <option value="out_for_delivery">Out for Final Delivery</option>
                    <option value="delivered">Successfully Delivered & Signed</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700">Milestone Heading</label>
                  <input
                    type="text"
                    required
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    placeholder="e.g. Scanned into Regional Hub"
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700">Checkpoint Log Details & Telematics Notes</label>
                <textarea
                  rows={2}
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  placeholder="Security seal verified, pallet loaded on freighter cargo hold..."
                  className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(null)}
                  className="px-4 py-2 font-bold text-gray-600 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                >
                  Save Location & Moving Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMS DUTY & FEE PURPOSE UPDATE MODAL */}
      {showCustomsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base text-gray-900">
                  Assess Customs Duty & Purpose of Fee
                </h3>
                <p className="text-[11px] text-gray-500">
                  Tracking: <strong className="font-mono text-amber-600">{showCustomsModal.trackingNumber}</strong>
                </p>
              </div>
              <button onClick={() => setShowCustomsModal(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCustoms} className="space-y-4 text-xs">
              {/* 1. ADD ANY AMOUNT & CURRENCY */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <label className="font-black text-amber-950 flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>Add Any Fee Amount (Customs / Clearance / Tariff) *</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={dutyAmount}
                      onChange={(e) => setDutyAmount(parseFloat(e.target.value) || 0)}
                      placeholder="Enter any amount e.g. 450.00"
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-mono font-bold text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <select
                      value={dutyCurrency}
                      onChange={(e) => setDutyCurrency(e.target.value)}
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-gray-900 text-sm"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="ILS">ILS (₪)</option>
                      <option value="NGN">NGN (₦)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. WRITE PURPOSE OF THE FEE */}
              <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl space-y-2">
                <label className="font-black text-gray-900 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Write Purpose of the Fee *</span>
                </label>
                <input
                  type="text"
                  required
                  value={dutyPurpose}
                  onChange={(e) => setDutyPurpose(e.target.value)}
                  placeholder="e.g. Airport Terminal Security Clearance & Customs Inspection Tariffs"
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-500 font-semibold self-center">Quick Templates:</span>
                  {[
                    'Bonded Inspection & Customs Tariffs',
                    'Airport Terminal Clearance Fee',
                    'Precious Cargo Security Escort Tariff',
                    'International Quarantine & Sanitary Inspection',
                    'Port Release & Express Waybill Clearance'
                  ].map((template) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setDutyPurpose(template)}
                      className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-gray-200 hover:border-amber-300 text-gray-700 rounded-md text-[10px] font-semibold cursor-pointer"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Status & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Settlement Status</label>
                  <select
                    value={dutyStatus}
                    onChange={(e) => setDutyStatus(e.target.value as CustomsPaymentStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold mt-1"
                  >
                    <option value="pending">Pending Settlement (Customer Must Pay)</option>
                    <option value="paid">Confirmed Paid / Settled</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="waived">Waived / Exempt</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700">Customs Reference Code</label>
                  <input
                    type="text"
                    value={dutyRef}
                    onChange={(e) => setDutyRef(e.target.value)}
                    placeholder="e.g. CBP-2026-WAY-9921"
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700">Official Tariff & Clearance Notes</label>
                <textarea
                  rows={2}
                  value={dutyNotes}
                  onChange={(e) => setDutyNotes(e.target.value)}
                  placeholder="Official classification and border release instructions..."
                  className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCustomsModal(null)}
                  className="px-4 py-2 font-bold text-gray-600 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md cursor-pointer"
                >
                  Save Fee Amount & Purpose
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SHIPMENT MODAL */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-black text-base text-gray-900">
                Book Consignment Waybill
              </h3>
              <button onClick={() => setShowShipmentModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSaveShipment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700">Select Consignee Customer *</label>
                <select
                  required
                  value={shipmentForm.customerId}
                  onChange={(e) => {
                    const c = customers.find(x => x.uid === e.target.value);
                    setShipmentForm({
                      ...shipmentForm,
                      customerId: e.target.value,
                      customerName: c?.fullName || '',
                      customerEmail: c?.email || '',
                      recipientName: c?.fullName || shipmentForm.recipientName,
                      recipientAddress: c?.address || shipmentForm.recipientAddress,
                      recipientCountry: c?.country || shipmentForm.recipientCountry
                    });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1 font-bold"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.uid} value={c.uid}>
                      {c.fullName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700">Consignment Description *</label>
                <input
                  type="text"
                  required
                  value={shipmentForm.description}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, description: e.target.value })}
                  placeholder="e.g. Industrial Electronics, Medical Supplies"
                  className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Weight (kg)</label>
                  <input
                    type="number"
                    value={shipmentForm.weightKg}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Carrier</label>
                  <input
                    type="text"
                    value={shipmentForm.carrier}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, carrier: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Origin Port</label>
                  <input
                    type="text"
                    value={shipmentForm.departureLocation}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, departureLocation: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Destination Port</label>
                  <input
                    type="text"
                    value={shipmentForm.destinationLocation}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, destinationLocation: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShipmentModal(false)}
                  className="px-4 py-2 font-bold text-gray-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                >
                  Issue Consignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {activeChatConversation && userProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full">
            <ChatComponent
              conversation={activeChatConversation}
              currentUserProfile={userProfile}
              onClose={() => setActiveChatConversation(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
