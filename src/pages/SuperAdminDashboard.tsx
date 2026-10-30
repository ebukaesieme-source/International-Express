import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Package,
  CheckCircle2,
  Clock,
  DollarSign,
  Truck,
  MessageSquare,
  Settings,
  AlertTriangle,
  UserCheck,
  UserX,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  ArrowRightLeft,
  FileText,
  Eye,
  Check,
  X,
  Send,
  Sliders,
  ChevronRight,
  TrendingUp,
  Building,
  LogOut,
  History,
  CreditCard,
  Lock,
  ExternalLink,
  PanelLeft,
  PanelLeftClose,
  UserPlus,
  Menu,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  UserProfile,
  Shipment,
  Conversation,
  ChatMessage,
  AuditLog,
  SystemSettings,
  ShipmentStatus,
  CustomsPaymentStatus,
  PaymentRecord
} from '../types';
import {
  getAllUsers,
  getSubAdmins,
  getCustomers,
  createOrUpdateUserProfile,
  updateUserSuspension,
  transferCustomer,
  deleteUser,
  getAllShipments,
  createShipment,
  updateShipment,
  deleteShipment,
  getAllConversations,
  getOrCreateConversation,
  getPendingModerationMessages,
  moderateMessage,
  editMessage,
  deleteMessage,
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  addAuditLog,
  sendMessage,
  getAllPayments,
  confirmPayment
} from '../services/cargoService';
import { ChatComponent } from '../components/ChatComponent';

export const SuperAdminDashboard: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [activeSection, setActiveSection] = useState<
    | 'overview'
    | 'subadmins'
    | 'customers'
    | 'shipments'
    | 'moderation'
    | 'messages'
    | 'payments'
    | 'payment_methods'
    | 'audit'
    | 'settings'
  >('overview');

  // Core Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subAdmins, setSubAdmins] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubAdminFilter, setSelectedSubAdminFilter] = useState('all');

  // Modals & Forms
  const [showCreateSubAdminModal, setShowCreateSubAdminModal] = useState(false);
  const [subAdminForm, setSubAdminForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    city: '',
    country: 'United States',
    notes: ''
  });

  const [showEditUserModal, setShowEditUserModal] = useState<UserProfile | null>(null);
  const [showTransferModal, setShowTransferModal] = useState<UserProfile | null>(null);
  const [transferTargetSubAdmin, setTransferTargetSubAdmin] = useState('');

  // Shipment Create / Edit Modal
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [shipmentForm, setShipmentForm] = useState({
    trackingNumber: '',
    customerId: '',
    customerName: '',
    customerEmail: '',
    subAdminId: '',
    subAdminName: '',
    description: '',
    packageType: 'Air Cargo Crate',
    weightKg: 25,
    pieces: 1,
    senderName: '',
    senderAddress: '',
    senderCountry: 'United States',
    recipientName: '',
    recipientAddress: '',
    recipientCountry: 'United Kingdom',
    departureLocation: 'JFK Airport, New York',
    destinationLocation: 'Heathrow Airport, London',
    currentLocation: 'JFK Airport Terminal 4',
    carrier: 'Boeing 747-8F Heavy Freight',
    status: 'registered' as ShipmentStatus,
    deliveryProgressPercentage: 35,
    estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    customsDutyAmount: 250,
    customsDutyCurrency: 'USD',
    customsPaymentStatus: 'pending' as CustomsPaymentStatus,
    feePurpose: 'Bonded Inspection & Customs Tariffs',
    customsNotes: ''
  });

  // Active Chat Modal / Drawer
  const [activeChatConversation, setActiveChatConversation] = useState<Conversation | null>(null);

  // Announcement state
  const [announcementText, setAnnouncementText] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        allUsersList,
        subs,
        custs,
        allShipments,
        convs,
        pendingMsgs,
        audits,
        sysSettings,
        allPays
      ] = await Promise.all([
        getAllUsers(),
        getSubAdmins(),
        getCustomers(),
        getAllShipments(),
        getAllConversations(),
        getPendingModerationMessages(),
        getAuditLogs(),
        getSystemSettings(),
        getAllPayments()
      ]);

      setUsers(allUsersList);
      setSubAdmins(subs);
      setCustomers(custs);
      setShipments(allShipments);
      setConversations(convs);
      setPendingMessages(pendingMsgs);
      setAuditLogs(audits);
      setSettings(sysSettings);
      setPayments(allPays || []);
      if (sysSettings?.announcement) {
        setAnnouncementText(sysSettings.announcement);
      }
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculations
  const totalCustomers = customers.length;
  const totalSubAdmins = subAdmins.length;
  const activeShipments = shipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length;
  const deliveredShipments = shipments.filter(s => s.status === 'delivered').length;
  const pendingShipments = shipments.filter(s => s.status === 'registered' || s.status === 'package_received').length;
  const outstandingDutyTotal = shipments
    .filter(s => s.customsPaymentStatus === 'pending')
    .reduce((sum, s) => sum + (s.customsDutyAmount || 0), 0);

  // Sub Admin Account creation
  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subAdminForm.fullName || !subAdminForm.email) return;

    try {
      const newUid = 'subadmin_' + Date.now();
      await createOrUpdateUserProfile({
        uid: newUid,
        email: subAdminForm.email,
        fullName: subAdminForm.fullName,
        role: 'sub_admin',
        phoneNumber: subAdminForm.phoneNumber,
        city: subAdminForm.city,
        country: subAdminForm.country,
        notes: subAdminForm.notes,
        isSuspended: false
      });

      await addAuditLog(
        'sub_admin_created',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Created Sub Admin account: ${subAdminForm.fullName} (${subAdminForm.email}). Generated initial login: ${subAdminForm.email} / ${subAdminForm.password || 'subadmin12345'}`
      );

      setShowCreateSubAdminModal(false);
      setSubAdminForm({
        fullName: '',
        email: '',
        password: '',
        phoneNumber: '',
        city: '',
        country: 'United States',
        notes: ''
      });
      loadAllData();
      alert(`Sub Admin account for ${subAdminForm.fullName} created successfully!`);
    } catch (err) {
      console.error(err);
      alert('Error creating Sub Admin account.');
    }
  };

  // Toggle user suspension
  const handleToggleSuspension = async (user: UserProfile) => {
    const nextState = !user.isSuspended;
    try {
      await updateUserSuspension(user.uid, nextState);
      await addAuditLog(
        nextState ? 'account_suspended' : 'account_reactivated',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `${nextState ? 'Suspended' : 'Reactivated'} account for ${user.fullName} (${user.role})`
      );
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to update account status.');
    }
  };

  // Delete user
  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to permanently delete account ${user.fullName}?`)) return;
    try {
      await deleteUser(user.uid);
      await addAuditLog(
        'account_deleted',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Deleted ${user.role} account for ${user.fullName} (${user.email})`
      );
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  // Transfer customer
  const handleTransferCustomer = async () => {
    if (!showTransferModal || !transferTargetSubAdmin) return;
    const targetSub = subAdmins.find(s => s.uid === transferTargetSubAdmin);
    if (!targetSub) return;

    try {
      await transferCustomer(
        showTransferModal.uid,
        targetSub.uid,
        targetSub.fullName
      );

      await addAuditLog(
        'customer_transferred',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Transferred customer ${showTransferModal.fullName} from previous assignment to Sub Admin ${targetSub.fullName}`
      );

      setShowTransferModal(null);
      setTransferTargetSubAdmin('');
      loadAllData();
      alert(`Customer ${showTransferModal.fullName} reassigned to ${targetSub.fullName}.`);
    } catch (err) {
      console.error(err);
      alert('Failed to transfer customer.');
    }
  };

  // Moderation Approve / Reject
  const handleApproveMessage = async (msg: ChatMessage) => {
    try {
      await moderateMessage(msg.id, 'approved', msg.conversationId, msg.text);
      await addAuditLog(
        'message_approved',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Approved customer message ID ${msg.id} from ${msg.senderName}. Delivered to Sub Admin.`
      );
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to approve message.');
    }
  };

  const handleRejectMessage = async (msg: ChatMessage) => {
    const reason = prompt('Enter rejection reason for customer notification:', 'Policy violation: Unverified freight request');
    if (reason === null) return;

    try {
      await moderateMessage(msg.id, 'rejected', msg.conversationId, msg.text, reason);
      await addAuditLog(
        'message_rejected',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Rejected customer message ID ${msg.id} from ${msg.senderName}. Reason: ${reason}`
      );
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to reject message.');
    }
  };

  // Moderation Toggle
  const handleToggleModeration = async () => {
    if (!settings) return;
    const nextVal = !settings.messageModeration;
    try {
      await updateSystemSettings(
        { messageModeration: nextVal },
        userProfile?.fullName || 'Super Admin'
      );
      await addAuditLog(
        'moderation_setting_changed',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin turned Customer Message Moderation ${nextVal ? 'ON' : 'OFF'}`
      );
      setSettings({ ...settings, messageModeration: nextVal });
    } catch (err) {
      console.error(err);
      alert('Failed to update moderation settings.');
    }
  };

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    try {
      await updateSystemSettings(
        { announcement: announcementText },
        userProfile?.fullName || 'Super Admin'
      );
      await addAuditLog(
        'announcement_broadcasted',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin updated global announcement: "${announcementText}"`
      );
      alert('Global Announcement broadcasted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save announcement.');
    }
  };

  // Shipment Form submit
  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShipment) {
        await updateShipment(
          editingShipment.id,
          {
            ...shipmentForm,
            trackingNumber: shipmentForm.trackingNumber.toUpperCase()
          },
          userProfile?.fullName || 'Super Admin',
          'super_admin'
        );
        await addAuditLog(
          'shipment_updated',
          userProfile?.fullName || 'Super Admin',
          'super_admin',
          `Super Admin updated shipment ${shipmentForm.trackingNumber}. Status: ${shipmentForm.status}`
        );
      } else {
        const tracking = shipmentForm.trackingNumber.trim().toUpperCase() ||
          `IEC-${Math.floor(100000 + Math.random() * 900000)}-EXP`;

        await createShipment(
          {
            ...shipmentForm,
            trackingNumber: tracking
          },
          userProfile?.fullName || 'Super Admin',
          'super_admin'
        );
        await addAuditLog(
          'shipment_created',
          userProfile?.fullName || 'Super Admin',
          'super_admin',
          `Super Admin created new cargo consignment with tracking code ${tracking}`
        );
      }

      setShowShipmentModal(false);
      setEditingShipment(null);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to save shipment.');
    }
  };

  const handleOpenEditShipment = (s: Shipment) => {
    setEditingShipment(s);
    setShipmentForm({
      trackingNumber: s.trackingNumber,
      customerId: s.customerId,
      customerName: s.customerName,
      customerEmail: s.customerEmail,
      subAdminId: s.subAdminId,
      subAdminName: s.subAdminName,
      description: s.description,
      packageType: s.packageType,
      weightKg: s.weightKg,
      pieces: s.pieces || 1,
      senderName: s.senderName,
      senderAddress: s.senderAddress,
      senderCountry: s.senderCountry,
      recipientName: s.recipientName,
      recipientAddress: s.recipientAddress,
      recipientCountry: s.recipientCountry,
      departureLocation: s.departureLocation,
      destinationLocation: s.destinationLocation,
      currentLocation: s.currentLocation || '',
      carrier: s.carrier,
      status: s.status,
      deliveryProgressPercentage: s.deliveryProgressPercentage ?? 35,
      estimatedDeliveryDate: s.estimatedDeliveryDate,
      customsDutyAmount: s.customsDutyAmount,
      customsDutyCurrency: s.customsDutyCurrency,
      customsPaymentStatus: s.customsPaymentStatus,
      feePurpose: s.feePurpose || 'Bonded Inspection & Customs Tariffs',
      customsNotes: s.customsNotes || ''
    });
    setShowShipmentModal(true);
  };

  const handleDeleteShipment = async (s: Shipment) => {
    if (!confirm(`Permanently remove shipment record ${s.trackingNumber}?`)) return;
    try {
      await deleteShipment(s.id);
      await addAuditLog(
        'shipment_deleted',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin deleted consignment record ${s.trackingNumber}`
      );
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete shipment.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Super Admin Command Banner */}
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

          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-black tracking-tight text-white">Super Admin Command Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-amber-400 text-gray-950 tracking-wider">
                Full Control
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-400">
              Authenticated: <strong className="text-white">{userProfile?.fullName}</strong> ({userProfile?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Moderation Toggle Quick Button */}
          <button
            onClick={handleToggleModeration}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-colors cursor-pointer ${
              settings?.messageModeration
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Message Moderation: {settings?.messageModeration ? 'ON' : 'OFF'}</span>
            <span className="md:hidden">Mod: {settings?.messageModeration ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh System Data"
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

      {/* Main Admin Content Layout: Sider Drawer & Full Screen Function Area */}
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
                  <h2 className="font-extrabold text-sm text-gray-900 leading-tight">Admin Panel</h2>
                  <span className="text-[9px] font-extrabold tracking-wider text-gray-400 uppercase">ADMIN</span>
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

            {/* Vertical Menu Items list */}
            <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
              <button
                onClick={() => setActiveSection('overview')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'overview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span className="truncate">Overview</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </button>

              <button
                onClick={() => setActiveSection('shipments')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'shipments'
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
                onClick={() => setActiveSection('subadmins')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'subadmins'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span className="truncate">Sub-Admins</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {subAdmins.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSection('customers')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'customers'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">Customers</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {customers.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSection('moderation')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'moderation'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">Moderation</span>
                </div>
                {pendingMessages.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse shrink-0">
                    {pendingMessages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSection('messages')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'messages'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate">Channels</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {conversations.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSection('payments')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'payments'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Payments</span>
                </div>
                {outstandingDutyTotal > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    ${outstandingDutyTotal}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSection('payment_methods')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'payment_methods'
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
                onClick={() => setActiveSection('audit')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'audit'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <History className="w-4 h-4 shrink-0" />
                  <span className="truncate">Activity Logs</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {auditLogs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'settings'
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
                <span>Full Screen View Active: <strong className="text-blue-600 uppercase">{activeSection}</strong></span>
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
          {/* SECTION 1: OVERVIEW METRICS */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Comprehensive Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Total Customers
                    </span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-gray-900 mt-2">{totalCustomers}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Registered consignees in database</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Sub Admin Accounts
                    </span>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-gray-900 mt-2">{totalSubAdmins}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Regional dispatch managers</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Active Shipments
                    </span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-gray-900 mt-2">{activeShipments}</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {deliveredShipments} Delivered • {pendingShipments} Pending
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Outstanding Duties
                    </span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-600 mt-2">
                    ${outstandingDutyTotal.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Pending customs tariffs</div>
                </div>
              </div>

              {/* Moderation Status Banner */}
              <div className="bg-gradient-to-r from-[#0b132b] to-[#1c2541] rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">Customer Message Approval System</h3>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Moderation mode is currently{' '}
                      <strong className={settings?.messageModeration ? 'text-amber-400' : 'text-emerald-400'}>
                        {settings?.messageModeration ? 'ENABLED (Queue active)' : 'DISABLED (Direct delivery)'}
                      </strong>
                      . {pendingMessages.length} message(s) awaiting review.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleToggleModeration}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Switch Moderation {settings?.messageModeration ? 'OFF' : 'ON'}
                  </button>
                  {pendingMessages.length > 0 && (
                    <button
                      onClick={() => setActiveSection('moderation')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
                    >
                      View Queue ({pendingMessages.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Actions & Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Administrative Audit Activities */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Recent Administrative Activities</span>
                    </h3>
                    <button
                      onClick={() => setActiveSection('audit')}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      View All Logs
                    </button>
                  </div>

                  <div className="space-y-3">
                    {auditLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-gray-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800 uppercase text-[10px]">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1 leading-relaxed text-[11px]">{log.details}</p>
                        <div className="text-[10px] text-gray-400 mt-1">
                          Officer: <strong className="text-gray-700">{log.performedBy}</strong> ({log.performedByRole})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub Admin Overview List */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Sub Admin Roster</span>
                    </h3>
                    <button
                      onClick={() => setShowCreateSubAdminModal(true)}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Sub Admin</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {subAdmins.map((sub) => {
                      const assignedCount = customers.filter(c => c.assignedSubAdminId === sub.uid).length;
                      return (
                        <div
                          key={sub.uid}
                          className="p-3 bg-slate-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-gray-900 flex items-center space-x-2">
                              <span>{sub.fullName}</span>
                              {sub.isSuspended && (
                                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[9px] rounded font-bold">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 text-[11px]">{sub.email} • {sub.city || 'Regional Hub'}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-blue-600 text-xs">
                              {assignedCount} Consignee{assignedCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: SUB ADMIN MANAGEMENT */}
          {activeSection === 'subadmins' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Sub Admin Account Management</h2>
                  <p className="text-xs text-gray-500">
                    Create, configure, suspend, reactivate, or delete Sub Admin accounts.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateSubAdminModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Sub Admin Account</span>
                </button>
              </div>

              {/* Sub Admin Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider text-[10px] border-y border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Sub Admin Name & Email</th>
                      <th className="py-3 px-4">Regional Station</th>
                      <th className="py-3 px-4">Assigned Customers</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subAdmins.map((sub) => {
                      const assignedCusts = customers.filter(c => c.assignedSubAdminId === sub.uid);

                      return (
                        <tr key={sub.uid} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{sub.fullName}</div>
                            <div className="text-gray-500 text-[11px] font-mono">{sub.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600">
                            {sub.city ? `${sub.city}, ${sub.country}` : sub.country || 'Global'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {assignedCusts.length} Active Consignees
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {sub.isSuspended ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700">
                                Suspended
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                                Active Operational
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleSuspension(sub)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                sub.isSuspended
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              {sub.isSuspended ? 'Reactivate' : 'Suspend'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(sub)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                            >
                              Delete
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

          {/* SECTION 3: CUSTOMERS & TRANSFERS */}
          {activeSection === 'customers' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Customer Roster & Dispatch Assignment</h2>
                  <p className="text-xs text-gray-500">
                    View customer profiles, assign or transfer customers between Sub Admins.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={selectedSubAdminFilter}
                    onChange={(e) => setSelectedSubAdminFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                  >
                    <option value="all">All Dispatch Allocations</option>
                    <option value="unassigned">⚡ Unassigned (Awaiting Acceptance)</option>
                    {subAdmins.map((s) => (
                      <option key={s.uid} value={s.uid}>
                        Belongs to: {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider text-[10px] border-y border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Customer Name & Contact</th>
                      <th className="py-3 px-4">Country & Address</th>
                      <th className="py-3 px-4">Assigned Sub Admin</th>
                      <th className="py-3 px-4">Active Shipments</th>
                      <th className="py-3 px-4 text-right">Dispatch Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers
                      .filter((c) => {
                        if (selectedSubAdminFilter === 'all') return true;
                        if (selectedSubAdminFilter === 'unassigned') return !c.assignedSubAdminId || c.assignedSubAdminId === 'unassigned';
                        return c.assignedSubAdminId === selectedSubAdminFilter;
                      })
                      .map((cust) => {
                        const custShipments = shipments.filter(s => s.customerId === cust.uid);
                        const isUnassigned = !cust.assignedSubAdminId || cust.assignedSubAdminId === 'unassigned';

                        return (
                          <tr key={cust.uid} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-gray-900">{cust.fullName}</div>
                              <div className="text-gray-500 text-[11px]">{cust.email}</div>
                              <div className="text-gray-400 text-[10px]">{cust.phoneNumber || cust.phone || 'No phone'}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-gray-800">{cust.country}</div>
                              <div className="text-gray-500 text-[11px] truncate max-w-[180px]">{cust.address}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              {isUnassigned ? (
                                <span className="font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg text-[11px] inline-flex items-center space-x-1.5 shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span>Unassigned (Awaiting Sub Admin)</span>
                                </span>
                              ) : (
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg text-xs">
                                  {cust.assignedSubAdminName}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-gray-700">
                                {custShipments.length} Cargo Consignment(s)
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              {isUnassigned ? (
                                <button
                                  onClick={() => {
                                    setShowTransferModal(cust);
                                    setTransferTargetSubAdmin(subAdmins[0]?.uid || '');
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer inline-flex items-center space-x-1 shadow-xs transition-colors"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Assign Sub Admin</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setShowTransferModal(cust);
                                    setTransferTargetSubAdmin(subAdmins[0]?.uid || '');
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer inline-flex items-center space-x-1 transition-colors"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Transfer</span>
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    let conv = conversations.find(c => c.customerId === cust.uid);
                                    if (!conv) {
                                      conv = await getOrCreateConversation(
                                        cust.uid,
                                        cust.fullName,
                                        cust.email,
                                        cust.assignedSubAdminId,
                                        cust.assignedSubAdminName
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
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-gray-700 hover:bg-slate-200 cursor-pointer transition-colors"
                              >
                                Chat
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

          {/* SECTION 4: ALL SHIPMENTS MANAGEMENT */}
          {activeSection === 'shipments' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Shipment Administration Overview</h2>
                  <p className="text-xs text-gray-500">
                    Super Admin master control of all consignments, customs duties, and delivery statuses.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingShipment(null);
                    setShowShipmentModal(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate New Shipment</span>
                </button>
              </div>

              {/* Shipments Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider text-[10px] border-y border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Waybill # & Carrier</th>
                      <th className="py-3 px-4">Consignee & Dispatcher</th>
                      <th className="py-3 px-4">Corridor (Origin → Dest)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Customs Duty</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shipments.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-black text-gray-900">{s.trackingNumber}</div>
                          <div className="text-gray-500 text-[11px]">{s.carrier}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-800">{s.customerName}</div>
                          <div className="text-gray-400 text-[10px]">Sub Admin: {s.subAdminName}</div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          <div>{s.departureLocation}</div>
                          <div className="text-[11px] text-blue-600 font-semibold">→ {s.destinationLocation}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800">
                            {s.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-amber-600 font-mono">
                            {s.customsDutyCurrency} {s.customsDutyAmount?.toFixed(2)}
                          </div>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                            s.customsPaymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.customsPaymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditShipment(s)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Edit Consignment"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteShipment(s)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete Consignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 5: MESSAGE MODERATION QUEUE */}
          {activeSection === 'moderation' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span>Customer Message Moderation Queue</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Review and verify customer messages prior to delivery to their assigned Sub Admin dispatcher.
                  </p>
                </div>
                <div className="text-xs font-bold text-gray-600">
                  {pendingMessages.length} Pending Review
                </div>
              </div>

              {pendingMessages.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-800">Queue is Clear</h4>
                  <p className="text-xs text-gray-500">
                    All customer messages have been approved and delivered.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-4 bg-slate-50 border border-amber-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-gray-900">{msg.senderName}</span>
                          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Customer
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-800 bg-white p-3 rounded-xl border border-gray-200">
                          {msg.text}
                        </p>
                        {msg.attachmentUrl && (
                          <div className="text-xs text-blue-600 font-medium">
                            Attachment: {msg.attachmentType} ({msg.attachmentName || 'Media File'})
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 self-end md:self-center">
                        <button
                          onClick={() => handleApproveMessage(msg)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Deliver</span>
                        </button>
                        <button
                          onClick={() => handleRejectMessage(msg)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: ALL MESSAGING CHANNELS */}
          {activeSection === 'messages' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Live Customer Communications</h2>
                  <p className="text-xs text-gray-500">
                    Monitor conversations between customers and Sub Admins. Intervene, correct, or announce.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setActiveChatConversation(conv)}
                    className="p-5 bg-slate-50 border border-gray-200 rounded-2xl hover:border-blue-400 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900 group-hover:text-blue-600">
                        {conv.customerName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                      <span>Assigned Sub Admin:</span>
                      <strong className="text-gray-700">{conv.subAdminName || 'None'}</strong>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1 italic bg-white p-2 rounded-lg border border-gray-100">
                      &quot;{conv.lastMessage}&quot;
                    </p>
                    <div className="text-[11px] font-bold text-blue-600 pt-1 flex items-center space-x-1">
                      <span>Open Thread & Intervene as Super Admin</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 7: AUDIT LOGS */}
          {activeSection === 'audit' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Administrative Audit Trail</h2>
                  <p className="text-xs text-gray-500">
                    Immutable security log of all sensitive operations, message edits, deletions, and account alterations.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 border border-gray-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-800 font-medium pt-1">{log.details}</p>
                    <div className="text-[10px] text-gray-500">
                      Performed By: <strong className="text-gray-800">{log.performedBy}</strong> ({log.performedByRole})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: PAYMENTS OVERVIEW */}
          {activeSection === 'payments' && (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <span>Customs Duties & Cargo Payments</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Comprehensive ledger of customs duty settlements, tariff collections, and verified wire transfers.
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="text-gray-500">Pending Duties: </span>
                    <strong className="text-emerald-700">${outstandingDutyTotal} USD</strong>
                  </div>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                  <DollarSign className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  No direct payment transactions recorded yet. Payments will populate automatically as consignees clear customs duties.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-gray-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Reference</th>
                        <th className="p-3">Consignment</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono font-bold text-blue-600">{p.reference}</td>
                          <td className="p-3 font-mono text-gray-700">{p.trackingNumber}</td>
                          <td className="p-3 font-medium text-gray-900">{p.customerName}</td>
                          <td className="p-3 font-bold text-emerald-700">
                            {p.currency} {p.amount.toLocaleString()}
                          </td>
                          <td className="p-3 text-gray-600">{p.paymentMethod}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-400">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            {p.status !== 'confirmed' && (
                              <button
                                onClick={async () => {
                                  await confirmPayment(p.id, p.shipmentId, userProfile?.fullName || 'Super Admin');
                                  await addAuditLog(
                                    'customs_payment_confirmed',
                                    userProfile?.fullName || 'Super Admin',
                                    'super_admin',
                                    `Confirmed payment reference ${p.reference} of $${p.amount} for shipment ${p.trackingNumber}`
                                  );
                                  loadAllData();
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                              >
                                Confirm Settlement
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SECTION: PAYMENT METHODS */}
          {activeSection === 'payment_methods' && (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Configured Payment & Escrow Methods</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Global channels supported for intercontinental cargo clearance, duties, tariffs, and demurrage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Wire Method */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Direct International Wire (SWIFT / IBAN)</h4>
                        <span className="text-[10px] text-gray-400">Primary Bank Escrow</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono space-y-1 bg-white p-3 rounded-xl border border-gray-200">
                    <div>Bank: <strong>International Cargo Central Reserve Bank</strong></div>
                    <div>Account Name: <strong>International Express Cargo Logistics Ltd</strong></div>
                    <div>IBAN: <strong>GB29 IECB 6016 1331 9284 90</strong></div>
                    <div>SWIFT / BIC: <strong>IECBLON2X</strong></div>
                  </div>
                </div>

                {/* Crypto USDT / BTC */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Cryptocurrency Settlement (USDT TRC20 / BTC)</h4>
                        <span className="text-[10px] text-gray-400">Instant Clearing Escrow</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono space-y-1 bg-white p-3 rounded-xl border border-gray-200">
                    <div>USDT (TRC-20): <span className="text-blue-600 break-all">TYZ8m2jA4bKk9X7u1zRtLqWeVx6P2mQas9</span></div>
                    <div>Bitcoin (BTC): <span className="text-amber-600 break-all">bc1q4r8s9zkp2h8m7cxv9t5y3w2q1a0l8k6j4</span></div>
                    <div className="text-[10px] text-gray-400 pt-1">Automated customs release upon 2 blockchain confirmations.</div>
                  </div>
                </div>

                {/* Corporate Credit / Debit Card */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Online Card Gateway (Visa, Mastercard, Amex)</h4>
                        <span className="text-[10px] text-gray-400">Merchant Terminal</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Integrated 3D-Secure checkout enabled for consignees paying duties online directly from their portal.
                  </p>
                </div>

                {/* Station Cash & Bonded Courier */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Destination Hub Desk Settlement</h4>
                        <span className="text-[10px] text-gray-400">On-Site Counter</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      READY
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Bonded customs clearance receipt issued upon delivery by authorized station dispatch officers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: SYSTEM SETTINGS */}
          {activeSection === 'settings' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900">Global Website & Operations Settings</h2>
                <p className="text-xs text-gray-500">
                  Configure corporate carrier identity, contact endpoints, and customer message moderation.
                </p>
              </div>

              <div className="space-y-6 max-w-2xl">
                {/* Moderation Switch */}
                <div className="p-5 bg-slate-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Message Moderation Protocol</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      When active, customer messages must be reviewed and approved by Super Admin before Sub Admins see them.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleModeration}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      settings?.messageModeration
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {settings?.messageModeration ? 'Moderation ON' : 'Moderation OFF'}
                  </button>
                </div>

                {/* Global Announcement */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    System-Wide Announcement Banner
                  </label>
                  <textarea
                    rows={3}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Broadcast an official administrative notice to all customer dashboards..."
                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveAnnouncement}
                    className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Broadcast Announcement
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE SUB ADMIN MODAL */}
      {showCreateSubAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-lg text-gray-900">Create New Sub Admin Account</h3>
              <button
                onClick={() => setShowCreateSubAdminModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name & Station Title *</label>
                <input
                  type="text"
                  required
                  value={subAdminForm.fullName}
                  onChange={(e) => setSubAdminForm({ ...subAdminForm, fullName: e.target.value })}
                  placeholder="e.g. David Sterling (JFK Hub Dispatcher)"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Login Email *</label>
                  <input
                    type="email"
                    required
                    value={subAdminForm.email}
                    onChange={(e) => setSubAdminForm({ ...subAdminForm, email: e.target.value })}
                    placeholder="subadmin@expresscargo.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Initial Password *</label>
                  <input
                    type="text"
                    required
                    value={subAdminForm.password}
                    onChange={(e) => setSubAdminForm({ ...subAdminForm, password: e.target.value })}
                    placeholder="subadmin12345"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Station City</label>
                  <input
                    type="text"
                    value={subAdminForm.city}
                    onChange={(e) => setSubAdminForm({ ...subAdminForm, city: e.target.value })}
                    placeholder="London Heathrow"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={subAdminForm.phoneNumber}
                    onChange={(e) => setSubAdminForm({ ...subAdminForm, phoneNumber: e.target.value })}
                    placeholder="+44 20 7946 0991"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={subAdminForm.notes}
                  onChange={(e) => setSubAdminForm({ ...subAdminForm, notes: e.target.value })}
                  placeholder="Operational responsibilities, corridor coverage..."
                  className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSubAdminModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                >
                  Generate Credentials & Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER CUSTOMER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-lg text-gray-900">Transfer Customer Assignment</h3>
            <p className="text-xs text-gray-500">
              Reassign customer <strong className="text-gray-900">{showTransferModal.fullName}</strong> to another Sub Admin dispatcher.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Select Target Sub Admin</label>
              <select
                value={transferTargetSubAdmin}
                onChange={(e) => setTransferTargetSubAdmin(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold"
              >
                {subAdmins.map((s) => (
                  <option key={s.uid} value={s.uid}>
                    {s.fullName} ({s.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowTransferModal(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferCustomer}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SHIPMENT MODAL */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-lg text-gray-900">
                {editingShipment ? 'Edit Shipment & Customs Information' : 'Create New International Shipment'}
              </h3>
              <button
                onClick={() => {
                  setShowShipmentModal(false);
                  setEditingShipment(null);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShipment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Waybill / Tracking Code</label>
                  <input
                    type="text"
                    value={shipmentForm.trackingNumber}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, trackingNumber: e.target.value.toUpperCase() })}
                    placeholder="Leave empty to auto-generate"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Consignee Customer *</label>
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
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">Select Consignee...</option>
                    {customers.map((c) => (
                      <option key={c.uid} value={c.uid}>
                        {c.fullName} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Managing Sub Admin *</label>
                  <select
                    required
                    value={shipmentForm.subAdminId}
                    onChange={(e) => {
                      const s = subAdmins.find(x => x.uid === e.target.value);
                      setShipmentForm({
                        ...shipmentForm,
                        subAdminId: e.target.value,
                        subAdminName: s?.fullName || ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">Select Sub Admin Dispatcher...</option>
                    {subAdmins.map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Carrier & Flight/Vessel</label>
                  <input
                    type="text"
                    required
                    value={shipmentForm.carrier}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, carrier: e.target.value })}
                    placeholder="e.g. Boeing 747-8F / Flight IEC-890"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cargo Description</label>
                <input
                  type="text"
                  required
                  value={shipmentForm.description}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, description: e.target.value })}
                  placeholder="e.g. Avionics, Microcontrollers & Spare Assemblies"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Sender & Recipient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Origin / Sender</span>
                  <input
                    type="text"
                    required
                    value={shipmentForm.senderName}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, senderName: e.target.value })}
                    placeholder="Sender Name"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs mt-1"
                  />
                  <input
                    type="text"
                    required
                    value={shipmentForm.departureLocation}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, departureLocation: e.target.value })}
                    placeholder="Departure Port / Airport"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs mt-1"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Destination / Recipient</span>
                  <input
                    type="text"
                    required
                    value={shipmentForm.recipientName}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, recipientName: e.target.value })}
                    placeholder="Recipient Name"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs mt-1"
                  />
                  <input
                    type="text"
                    required
                    value={shipmentForm.destinationLocation}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, destinationLocation: e.target.value })}
                    placeholder="Destination Port / Airport"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs mt-1"
                  />
                </div>
              </div>

              {/* Location & Delivery Moving Percentage Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    Current Location (Write Location at Every Change) *
                  </label>
                  <input
                    type="text"
                    required
                    value={shipmentForm.currentLocation}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, currentLocation: e.target.value })}
                    placeholder="e.g. Frankfurt Cargo Hub Terminal 4"
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-indigo-900">
                      Delivery Moving Percentage
                    </label>
                    <span className="font-mono font-bold text-xs text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {shipmentForm.deliveryProgressPercentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={shipmentForm.deliveryProgressPercentage}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, deliveryProgressPercentage: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                  />
                </div>
              </div>

              {/* Status & Customs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={shipmentForm.status}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, status: e.target.value as ShipmentStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="registered">Registered</option>
                    <option value="package_received">Package Received</option>
                    <option value="processing">Processing</option>
                    <option value="departure">Departure</option>
                    <option value="in_transit">In Transit</option>
                    <option value="arrival_destination">Arrival Destination</option>
                    <option value="customs_processing">Customs Processing</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Customs Fee Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={shipmentForm.customsDutyAmount}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, customsDutyAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Customs Status</label>
                  <select
                    value={shipmentForm.customsPaymentStatus}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, customsPaymentStatus: e.target.value as CustomsPaymentStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Purpose of the Fee (Write Custom Purpose)
                </label>
                <input
                  type="text"
                  value={shipmentForm.feePurpose}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, feePurpose: e.target.value })}
                  placeholder="e.g. Airport Terminal Security Clearance & Customs Inspection Tariffs"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowShipmentModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                >
                  Save Consignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAT MODAL (SUPER ADMIN INTERVENTION) */}
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
