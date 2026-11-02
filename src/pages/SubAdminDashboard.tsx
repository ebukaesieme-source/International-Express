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
  MapPin,
  RefreshCw,
  Send,
  X,
  LogOut,
  Menu,
  Maximize2,
  Minimize2,
  Trash2,
  AlertTriangle,
  Filter,
  Check,
  Bell,
  Navigation,
  AlertCircle,
  ArrowRight,
  Shield,
  Calendar,
  Building,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  UserProfile,
  Shipment,
  Conversation,
  ShipmentStatus,
  CustomsPaymentStatus,
  TrackingEvent,
  AppNotification
} from '../types';
import {
  subscribeToSubAdminCustomers,
  subscribeToSubAdminShipments,
  subscribeToSubAdminConversations,
  subscribeToNotifications,
  markNotificationRead,
  createShipmentForSubAdmin,
  updateShipmentForSubAdmin,
  deleteShipmentForSubAdmin,
  addTrackingCheckpointForSubAdmin,
  getOrCreateConversation,
  getTrackingEvents,
  getStatusTitle
} from '../services/cargoService';
import { ChatComponent } from '../components/ChatComponent';

type SubAdminTab =
  | 'overview'
  | 'customers'
  | 'messages'
  | 'create_delivery'
  | 'deliveries'
  | 'tracking'
  | 'notifications';

export const SubAdminDashboard: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const subAdminId = userProfile?.uid || 'sub_admin_1';
  const subAdminName = userProfile?.fullName || 'Company Support';

  // Navigation & Layout
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [activeTab, setActiveTab] = useState<SubAdminTab>('overview');

  // Real-time Collections
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Chat State
  const [activeChatConversation, setActiveChatConversation] = useState<Conversation | null>(null);

  // Search & Filter States
  const [customerSearch, setCustomerSearch] = useState('');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<string>('all');
  const [shipmentCustomerFilter, setShipmentCustomerFilter] = useState<string>('all');
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');

  // Tracking Control State
  const [selectedTrackingShipmentId, setSelectedTrackingShipmentId] = useState<string>('');
  const [checkpointHistory, setCheckpointHistory] = useState<TrackingEvent[]>([]);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);

  // Tracking Checkpoint Form
  const [checkpointStatus, setCheckpointStatus] = useState<ShipmentStatus>('in_transit');
  const [checkpointTitle, setCheckpointTitle] = useState('');
  const [checkpointLocation, setCheckpointLocation] = useState('');
  const [checkpointNotes, setCheckpointNotes] = useState('');
  const [checkpointProgress, setCheckpointProgress] = useState<number>(50);
  const [checkpointDelayReason, setCheckpointDelayReason] = useState('');
  const [checkpointLat, setCheckpointLat] = useState<string>('');
  const [checkpointLng, setCheckpointLng] = useState<string>('');
  const [checkpointEstArrival, setCheckpointEstArrival] = useState('');
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);

  // Create Delivery Form
  const [deliveryCustomerId, setDeliveryCustomerId] = useState('');
  const [deliveryTrackingNumber, setDeliveryTrackingNumber] = useState('');
  const [deliveryTitle, setDeliveryTitle] = useState('Air Freight Consignment & Heavy Equipment');
  const [deliveryDescription, setDeliveryDescription] = useState('Express high-value consignment with standard customs tariffs.');
  const [deliveryPackageType, setDeliveryPackageType] = useState('Heavy Crate');
  const [deliveryWeightKg, setDeliveryWeightKg] = useState<number>(45);
  const [deliveryPieces, setDeliveryPieces] = useState<number>(1);
  const [deliveryCarrier, setDeliveryCarrier] = useState('Boeing 747-8F Cargo Freighter');
  const [deliverySenderName, setDeliverySenderName] = useState('Global Distribution Ramp 4');
  const [deliverySenderAddress, setDeliverySenderAddress] = useState('Air Cargo Terminal 2');
  const [deliverySenderCountry, setDeliverySenderCountry] = useState('United States');
  const [deliveryRecipientName, setDeliveryRecipientName] = useState('');
  const [deliveryRecipientAddress, setDeliveryRecipientAddress] = useState('');
  const [deliveryRecipientCountry, setDeliveryRecipientCountry] = useState('');
  const [deliveryDeparture, setDeliveryDeparture] = useState('New York (JFK)');
  const [deliveryDestination, setDeliveryDestination] = useState('London (LHR)');
  const [deliveryCurrentLoc, setDeliveryCurrentLoc] = useState('JFK Air Cargo Ramp');
  const [deliveryEstDate, setDeliveryEstDate] = useState(
    new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [deliveryInitialStatus, setDeliveryInitialStatus] = useState<ShipmentStatus>('registered');
  const [deliveryInitialProgress, setDeliveryInitialProgress] = useState<number>(15);
  const [deliveryDutyAmount, setDeliveryDutyAmount] = useState<number>(350);
  const [deliveryDutyCurrency, setDeliveryDutyCurrency] = useState('USD');
  const [deliveryDutyPurpose, setDeliveryDutyPurpose] = useState('Bonded Inspection & Import Tariffs');
  const [creatingDelivery, setCreatingDelivery] = useState(false);

  // Edit Delivery Modal State
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Delivery Modal State
  const [shipmentToDelete, setShipmentToDelete] = useState<Shipment | null>(null);
  const [deletingShipment, setDeletingShipment] = useState(false);

  // Toast Feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Helper to generate fresh AWB code
  const generateNewTrackingCode = () => {
    return `AWB-${Math.floor(100000 + Math.random() * 900000)}-EXP`;
  };

  // Pre-generate tracking code on mount
  useEffect(() => {
    setDeliveryTrackingNumber(generateNewTrackingCode());
  }, []);

  // Set up real-time subscriptions for Sub-Admin
  useEffect(() => {
    setLoading(true);

    // 1. Subscribe to customers strictly assigned to this Sub-Admin
    const unsubCustomers = subscribeToSubAdminCustomers(subAdminId, (assignedList) => {
      setCustomers(assignedList);
      setLoading(false);

      // If active chat customer is no longer assigned, immediately revoke access
      if (activeChatConversation) {
        const stillAssigned = assignedList.some(c => c.uid === activeChatConversation.customerId);
        if (!stillAssigned) {
          setActiveChatConversation(null);
          showToast('Customer assignment updated by Main Admin. Access revoked.', 'info');
        }
      }

      // If delivery form customer is not assigned, update default
      if (assignedList.length > 0 && (!deliveryCustomerId || !assignedList.some(c => c.uid === deliveryCustomerId))) {
        setDeliveryCustomerId(assignedList[0].uid);
        setDeliveryRecipientName(assignedList[0].fullName);
        setDeliveryRecipientAddress(assignedList[0].address || 'Consignee Delivery Address');
        setDeliveryRecipientCountry(assignedList[0].country || 'United Kingdom');
      }
    });

    // 2. Subscribe to shipments belonging to this Sub-Admin
    const unsubShipments = subscribeToSubAdminShipments(subAdminId, (shipmentList) => {
      setShipments(shipmentList);
      if (shipmentList.length > 0 && !selectedTrackingShipmentId) {
        setSelectedTrackingShipmentId(shipmentList[0].id);
      }
    });

    // 3. Subscribe to conversations for this Sub-Admin
    const unsubConversations = subscribeToSubAdminConversations(subAdminId, (convList) => {
      setConversations(convList);
      // Keep active conversation object refreshed
      if (activeChatConversation) {
        const updated = convList.find(c => c.id === activeChatConversation.id);
        if (updated) setActiveChatConversation(updated);
      }
    });

    // 4. Subscribe to notifications for this Sub-Admin
    const unsubNotifications = subscribeToNotifications(subAdminId, (notifList) => {
      setNotifications(notifList);
    });

    return () => {
      unsubCustomers();
      unsubShipments();
      unsubConversations();
      unsubNotifications();
    };
  }, [subAdminId]);

  // Load tracking checkpoints whenever selected tracking shipment changes
  useEffect(() => {
    if (!selectedTrackingShipmentId) {
      setCheckpointHistory([]);
      return;
    }

    const loadCheckpoints = async () => {
      setLoadingCheckpoints(true);
      try {
        const events = await getTrackingEvents(selectedTrackingShipmentId);
        setCheckpointHistory(events || []);

        const ship = shipments.find(s => s.id === selectedTrackingShipmentId);
        if (ship) {
          setCheckpointStatus(ship.status);
          setCheckpointLocation(ship.currentLocation || ship.destinationLocation);
          setCheckpointProgress(ship.deliveryProgressPercentage ?? 50);
          setCheckpointTitle(getStatusTitle(ship.status));
          setCheckpointNotes(ship.statusNotes || '');
          setCheckpointDelayReason(ship.delayExplanation || '');
          if (ship.coordinates) {
            setCheckpointLat(ship.coordinates.latitude.toString());
            setCheckpointLng(ship.coordinates.longitude.toString());
          } else {
            setCheckpointLat('');
            setCheckpointLng('');
          }
        }
      } catch (err) {
        console.warn('Error loading checkpoints:', err);
      } finally {
        setLoadingCheckpoints(false);
      }
    };

    loadCheckpoints();
  }, [selectedTrackingShipmentId, shipments]);

  // When customer is selected in Create Delivery form, pre-populate recipient info
  const handleSelectCustomerForDelivery = (custId: string) => {
    setDeliveryCustomerId(custId);
    const cust = customers.find(c => c.uid === custId);
    if (cust) {
      setDeliveryRecipientName(cust.fullName);
      setDeliveryRecipientAddress(cust.address || 'Consignee Delivery Terminal');
      setDeliveryRecipientCountry(cust.country || 'United Kingdom');
      if (cust.country) {
        setDeliveryDestination(`${cust.country} International Airport Hub`);
      }
    }
  };

  // Metrics
  const totalAssignedCustomers = customers.length;
  const activeConversations = conversations.length;
  const totalUnreadMessages = conversations.reduce((sum, c) => sum + (c.unreadAdminCount || 0), 0);
  const totalDeliveries = shipments.length;
  const pendingDeliveries = shipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length;
  const completedDeliveries = shipments.filter(s => s.status === 'delivered').length;
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Action: Start Conversation with Assigned Customer
  const handleStartConversationWithCustomer = async (cust: UserProfile) => {
    try {
      let conv = conversations.find(c => c.customerId === cust.uid);
      if (!conv) {
        conv = await getOrCreateConversation(
          cust.uid,
          cust.fullName,
          cust.email,
          subAdminId,
          subAdminName
        );
      }
      if (conv) {
        setActiveChatConversation(conv);
        setActiveTab('messages');
        setSidebarOpen(false); // Display chat card fully with no distraction
        showToast(`Private support channel opened with ${cust.fullName}.`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Could not start conversation.', 'error');
    }
  };

  // Action: Create Delivery Submit
  const handleCreateDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryCustomerId) {
      showToast('Please select an assigned customer.', 'error');
      return;
    }
    const selectedCust = customers.find(c => c.uid === deliveryCustomerId);
    if (!selectedCust) {
      showToast('Unauthorized: Selected customer is not assigned to your station.', 'error');
      return;
    }

    setCreatingDelivery(true);
    try {
      const tracking = deliveryTrackingNumber.trim().toUpperCase() || generateNewTrackingCode();

      await createShipmentForSubAdmin(
        subAdminId,
        {
          trackingNumber: tracking,
          customerId: selectedCust.uid,
          customerName: selectedCust.fullName,
          customerEmail: selectedCust.email,
          customerPhone: selectedCust.phoneNumber || selectedCust.phone || '',
          subAdminId,
          subAdminName,
          description: deliveryTitle + ' - ' + deliveryDescription,
          packageType: deliveryPackageType,
          weightKg: Number(deliveryWeightKg) || 10,
          pieces: Number(deliveryPieces) || 1,
          carrier: deliveryCarrier,
          senderName: deliverySenderName,
          senderAddress: deliverySenderAddress,
          senderCountry: deliverySenderCountry,
          recipientName: deliveryRecipientName || selectedCust.fullName,
          recipientAddress: deliveryRecipientAddress || selectedCust.address || '',
          recipientCountry: deliveryRecipientCountry || selectedCust.country || 'United Kingdom',
          departureLocation: deliveryDeparture,
          destinationLocation: deliveryDestination,
          currentLocation: deliveryCurrentLoc || deliveryDeparture,
          status: deliveryInitialStatus,
          deliveryProgressPercentage: Number(deliveryInitialProgress) || 15,
          estimatedDeliveryDate: deliveryEstDate,
          customsDutyAmount: Number(deliveryDutyAmount) || 0,
          customsDutyCurrency: deliveryDutyCurrency,
          customsPaymentStatus: 'pending',
          feePurpose: deliveryDutyPurpose
        },
        subAdminName
      );

      showToast(`Consignment ${tracking} created and assigned to ${selectedCust.fullName}!`);
      // Reset form with fresh tracking code
      setDeliveryTrackingNumber(generateNewTrackingCode());
      setDeliveryTitle('Air Freight Consignment & Electronic Equipment');
      setActiveTab('deliveries');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to create delivery.', 'error');
    } finally {
      setCreatingDelivery(false);
    }
  };

  // Action: Add Checkpoint / Movement Update
  const handleAddCheckpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackingShipmentId) {
      showToast('Please select a consignment to update.', 'error');
      return;
    }

    const ship = shipments.find(s => s.id === selectedTrackingShipmentId);
    if (!ship) {
      showToast('Shipment not found or access revoked.', 'error');
      return;
    }

    if ((checkpointStatus === 'delayed' || checkpointStatus === 'failed') && !checkpointDelayReason.trim()) {
      showToast('Please provide an explanation for the delay or issue.', 'error');
      return;
    }

    setSavingCheckpoint(true);
    try {
      const latNum = parseFloat(checkpointLat);
      const lngNum = parseFloat(checkpointLng);
      const hasCoords = !isNaN(latNum) && !isNaN(lngNum);

      await addTrackingCheckpointForSubAdmin(
        subAdminId,
        {
          shipmentId: ship.id,
          trackingNumber: ship.trackingNumber,
          status: checkpointStatus,
          title: checkpointTitle.trim() || getStatusTitle(checkpointStatus),
          description: checkpointNotes.trim() || (checkpointDelayReason ? `Transit exception: ${checkpointDelayReason}` : `Milestone update recorded at ${checkpointLocation}`),
          location: checkpointLocation.trim() || ship.destinationLocation,
          facility: checkpointLocation.trim() ? `${checkpointLocation.trim()} Logistics Facility` : undefined,
          deliveryProgressPercentage: checkpointProgress,
          delayExplanation: checkpointDelayReason.trim() || undefined,
          coordinates: hasCoords ? { latitude: latNum, longitude: lngNum } : undefined,
          estimatedArrival: checkpointEstArrival || undefined,
          timestamp: new Date().toISOString(),
          recordedBy: subAdminName,
          recordedByRole: 'sub_admin'
        },
        subAdminName
      );

      showToast(`Tracking movement updated for ${ship.trackingNumber}. Customer notified!`);
      // Reload checkpoints
      const events = await getTrackingEvents(ship.id);
      setCheckpointHistory(events || []);
      setCheckpointNotes('');
      setCheckpointDelayReason('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to record tracking update.', 'error');
    } finally {
      setSavingCheckpoint(false);
    }
  };

  // Action: Save Edited Delivery
  const handleSaveEditedShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    setSavingEdit(true);
    try {
      await updateShipmentForSubAdmin(
        subAdminId,
        editingShipment.id,
        {
          description: editingShipment.description,
          packageType: editingShipment.packageType,
          weightKg: Number(editingShipment.weightKg),
          pieces: Number(editingShipment.pieces),
          carrier: editingShipment.carrier,
          senderName: editingShipment.senderName,
          senderAddress: editingShipment.senderAddress,
          recipientName: editingShipment.recipientName,
          recipientAddress: editingShipment.recipientAddress,
          recipientCountry: editingShipment.recipientCountry,
          departureLocation: editingShipment.departureLocation,
          destinationLocation: editingShipment.destinationLocation,
          currentLocation: editingShipment.currentLocation,
          status: editingShipment.status,
          deliveryProgressPercentage: editingShipment.deliveryProgressPercentage,
          estimatedDeliveryDate: editingShipment.estimatedDeliveryDate,
          customsDutyAmount: Number(editingShipment.customsDutyAmount),
          customsDutyCurrency: editingShipment.customsDutyCurrency,
          customsPaymentStatus: editingShipment.customsPaymentStatus,
          feePurpose: editingShipment.feePurpose
        },
        subAdminName
      );

      showToast(`Consignment ${editingShipment.trackingNumber} updated successfully!`);
      setEditingShipment(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update consignment.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Action: Confirm Delete Delivery
  const handleConfirmDelete = async () => {
    if (!shipmentToDelete) return;
    setDeletingShipment(true);
    try {
      await deleteShipmentForSubAdmin(subAdminId, shipmentToDelete.id, subAdminName);
      showToast(`Consignment ${shipmentToDelete.trackingNumber} has been removed.`);
      setShipmentToDelete(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete consignment.', 'error');
    } finally {
      setDeletingShipment(false);
    }
  };

  // Filtered lists
  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phoneNumber && c.phoneNumber.toLowerCase().includes(q)) ||
      c.uid.toLowerCase().includes(q)
    );
  });

  const filteredShipments = shipments.filter(s => {
    const matchesQuery =
      s.trackingNumber.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
      s.customerName.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
      s.destinationLocation.toLowerCase().includes(shipmentSearch.toLowerCase());

    const matchesStatus =
      shipmentStatusFilter === 'all' || s.status === shipmentStatusFilter;

    const matchesCustomer =
      shipmentCustomerFilter === 'all' || s.customerId === shipmentCustomerFilter;

    return matchesQuery && matchesStatus && matchesCustomer;
  });

  const filteredNotifications = notifications.filter(n => {
    if (notificationFilter === 'unread') return !n.read;
    return true;
  });

  const selectedTrackingShipment = shipments.find(s => s.id === selectedTrackingShipmentId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center space-x-2 animate-bounce ${
            toastMessage.type === 'error'
              ? 'bg-red-900 text-white border-red-700'
              : toastMessage.type === 'info'
              ? 'bg-blue-900 text-white border-blue-700'
              : 'bg-emerald-900 text-white border-emerald-700'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-300" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER - Compact Single Row */}
      <header className="bg-[#0b132b] text-white px-3 sm:px-6 py-2.5 border-b border-[#1c2541] shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* Siders Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
              title={sidebarOpen ? 'Full Screen Mode (Hide Sidebar)' : 'Show All Navigation Siders'}
            >
              <Menu className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">{sidebarOpen ? 'Full Screen' : 'All Siders'}</span>
            </button>

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0">
              <Truck className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-xs sm:text-sm font-black text-white truncate">Sub Admin Station</h1>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase shrink-0">
                  Consignee Control
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">
                Station Officer: <strong className="text-gray-200">{subAdminName}</strong> ({userProfile?.email || 'subadmin'})
              </p>
            </div>
          </div>

          {/* Quick Metrics & Sign Out */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setActiveTab('customers')}
              className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'customers' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{totalAssignedCustomers} Customers</span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'messages' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
              title="Customer Support Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Messages</span>
              {totalUnreadMessages > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold animate-pulse">
                  {totalUnreadMessages}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
              )}
            </button>

            <button
              onClick={async () => {
                await logout();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop when sidebar is open on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 lg:p-6 pb-24 lg:pb-8 flex flex-col lg:flex-row gap-4 sm:gap-6 min-w-0 relative">
        {/* SIDEBAR NAVIGATION: Off-canvas drawer on mobile, static on desktop */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white p-4 shadow-2xl flex flex-col space-y-4 transition-transform duration-200
            lg:static lg:z-auto lg:shadow-xs lg:rounded-2xl lg:border lg:border-gray-200 lg:transition-none lg:w-64 lg:h-fit shrink-0
            ${sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden lg:hidden'}
          `}
        >
          <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Dispatch Desk</div>
              <div className="text-xs font-bold text-gray-800">Operational Tools</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            {/* 1. Overview */}
            <button
              onClick={() => {
                setActiveTab('overview');
                setActiveChatConversation(null);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </button>

            {/* 2. My Customers */}
            <button
              onClick={() => {
                setActiveTab('customers');
                setActiveChatConversation(null);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4" />
                <span>My Customers</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  activeTab === 'customers' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-gray-600'
                }`}
              >
                {totalAssignedCustomers}
              </span>
            </button>

            {/* 3. Customer Messages */}
            <button
              onClick={() => {
                setActiveTab('messages');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Customer Messages</span>
              </div>
              {totalUnreadMessages > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold animate-pulse">
                  {totalUnreadMessages}
                </span>
              )}
            </button>

            {/* 4. Create Delivery */}
            <button
              onClick={() => {
                setActiveTab('create_delivery');
                setActiveChatConversation(null);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'create_delivery'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Plus className="w-4 h-4" />
                <span>Create Delivery</span>
              </div>
            </button>

            {/* 5. Delivery Management */}
            <button
              onClick={() => {
                setActiveTab('deliveries');
                setActiveChatConversation(null);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'deliveries'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Package className="w-4 h-4" />
                <span>Delivery Management</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  activeTab === 'deliveries' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-gray-600'
                }`}
              >
                {totalDeliveries}
              </span>
            </button>

            {/* 6. Tracking Control */}
            <button
              onClick={() => {
                setActiveTab('tracking');
                setActiveChatConversation(null);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tracking'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Navigation className="w-4 h-4" />
                <span>Tracking Control</span>
              </div>
            </button>

            {/* 7. Notifications */}
            <button
              onClick={() => {
                setActiveTab('notifications');
                setActiveChatConversation(null);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </nav>

          <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
            <div className="font-bold text-gray-700">Access Scope:</div>
            <p className="text-[10px] leading-tight text-gray-400">
              You only have operational access to customers and deliveries assigned to you by Main Admin.
            </p>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* SECTION 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Total Assigned Customers */}
                <div
                  onClick={() => setActiveTab('customers')}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Assigned Customers</span>
                    <Users className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{totalAssignedCustomers}</div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">Direct Consignees</div>
                </div>

                {/* 2. Active Conversations */}
                <div
                  onClick={() => setActiveTab('messages')}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Conversations</span>
                    <MessageSquare className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{activeConversations}</div>
                  <div className="text-[10px] text-indigo-600 font-bold mt-1">Customer Channels</div>
                </div>

                {/* 3. Unread Messages */}
                <div
                  onClick={() => setActiveTab('messages')}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:border-red-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Unread Messages</span>
                    <Clock className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{totalUnreadMessages}</div>
                  <div className="text-[10px] text-red-600 font-bold mt-1">Requires Response</div>
                </div>

                {/* 4. Total Deliveries */}
                <div
                  onClick={() => setActiveTab('deliveries')}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Deliveries</span>
                    <Package className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{totalDeliveries}</div>
                  <div className="text-[10px] text-gray-500 font-bold mt-1">Waybill Consignments</div>
                </div>

                {/* 5. Pending Deliveries */}
                <div
                  onClick={() => setActiveTab('deliveries')}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Pending Deliveries</span>
                    <Truck className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{pendingDeliveries}</div>
                  <div className="text-[10px] text-amber-600 font-bold mt-1">In Transit / Hub</div>
                </div>

                {/* 6. Completed Deliveries */}
                <div
                  onClick={() => setActiveTab('deliveries')}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Completed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{completedDeliveries}</div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">Delivered & Signed</div>
                </div>
              </div>

              {/* Quick Launchpad Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('create_delivery')}
                  className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between cursor-pointer group text-left"
                >
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider opacity-80">Shipment Booking</div>
                    <div className="text-base font-black">Create Delivery</div>
                    <p className="text-[11px] text-blue-100 mt-1">Book consignment for assigned customer</p>
                  </div>
                  <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform shrink-0" />
                </button>

                <button
                  onClick={() => setActiveTab('tracking')}
                  className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between cursor-pointer group text-left"
                >
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider opacity-80">Movement Control</div>
                    <div className="text-base font-black">Live Tracking Control</div>
                    <p className="text-[11px] text-gray-300 mt-1">Update location checkpoints and progress</p>
                  </div>
                  <Navigation className="w-6 h-6 group-hover:scale-110 transition-transform shrink-0 text-amber-400" />
                </button>

                <button
                  onClick={() => setActiveTab('customers')}
                  className="p-4 bg-white border border-gray-200 text-gray-800 rounded-2xl shadow-xs hover:border-blue-400 transition-all flex items-center justify-between cursor-pointer group text-left"
                >
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-gray-400">Direct Contacts</div>
                    <div className="text-base font-black text-gray-900">Assigned Customers</div>
                    <p className="text-[11px] text-gray-500 mt-1">Start chat, view history, manage deliveries</p>
                  </div>
                  <Users className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
                </button>
              </div>

              {/* Dual Overview Panes: Recent Deliveries & Assigned Customers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Assigned Deliveries */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Active Deliveries</h3>
                      <p className="text-[11px] text-gray-500">Assigned shipments currently in motion</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('deliveries')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {shipments.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No deliveries booked yet. Click "Create Delivery" to book one for an assigned customer.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {shipments.slice(0, 4).map(s => (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl border border-gray-100 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-black text-blue-600 truncate">{s.trackingNumber}</div>
                            <div className="font-bold text-gray-800 truncate">{s.customerName}</div>
                            <div className="text-[10px] text-gray-500 truncate">
                              {s.departureLocation} → {s.destinationLocation}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                s.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'delayed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {s.status.replace(/_/g, ' ')}
                            </span>
                            <div className="text-[10px] text-gray-500 mt-1">
                              Progress: {s.deliveryProgressPercentage ?? 35}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assigned Customers Roster */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-gray-900">My Assigned Customers</h3>
                      <p className="text-[11px] text-gray-500">Direct consignees assigned by Main Admin</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('customers')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <span>Manage All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {customers.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No customers currently assigned to your dispatch station. Contact Main Admin for allocations.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {customers.slice(0, 4).map(c => {
                        const custShipments = shipments.filter(s => s.customerId === c.uid);
                        return (
                          <div
                            key={c.uid}
                            className="p-3 rounded-xl border border-gray-100 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                                {c.photoUrl ? (
                                  <img src={c.photoUrl} alt={c.fullName} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  c.fullName.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 truncate">{c.fullName}</div>
                                <div className="text-[11px] text-gray-500 truncate">{c.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-lg">
                                {custShipments.length} Deliveries
                              </span>
                              <button
                                onClick={() => handleStartConversationWithCustomer(c)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold"
                              >
                                Chat
                              </button>
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

          {/* SECTION 2: MY CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black text-gray-900">My Assigned Customers</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {customers.length} Allocated
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customers assigned specifically to you by Main Admin. Access is automatically synchronized.
                  </p>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer, email, ID..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs space-y-2">
                  <Users className="w-8 h-8 mx-auto text-gray-300" />
                  <div className="font-bold">No assigned customers found</div>
                  <p className="max-w-md mx-auto text-gray-400">
                    {customerSearch
                      ? 'No customer matched your search terms.'
                      : 'You do not have any customers assigned to your station yet. When Main Admin allocates a customer to you, they will appear here in real time.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCustomers.map(cust => {
                    const custShipments = shipments.filter(s => s.customerId === cust.uid);
                    const latestShipment = custShipments[0];

                    return (
                      <div
                        key={cust.uid}
                        className="bg-slate-50/70 border border-gray-200 rounded-2xl p-4 hover:border-blue-400 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                              {cust.photoUrl ? (
                                <img src={cust.photoUrl} alt={cust.fullName} className="w-full h-full rounded-2xl object-cover" />
                              ) : (
                                cust.fullName.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-gray-900 text-sm truncate">{cust.fullName}</div>
                              <div className="text-[11px] text-gray-500 truncate">{cust.email}</div>
                              <div className="text-[10px] text-gray-400 font-mono">ID: {cust.uid}</div>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                              cust.isSuspended
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {cust.isSuspended ? 'Suspended' : 'Active Account'}
                          </span>
                        </div>

                        {/* Contact & Location Info */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white rounded-xl p-2.5 border border-gray-100">
                          <div>
                            <span className="text-gray-400 block text-[9px] uppercase font-bold">Phone</span>
                            <span className="font-bold text-gray-700 truncate block">
                              {cust.phoneNumber || cust.phone || 'Not recorded'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[9px] uppercase font-bold">Country / City</span>
                            <span className="font-bold text-gray-700 truncate block">
                              {cust.country || 'International'} {cust.city ? `(${cust.city})` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Delivery History Summary */}
                        <div className="text-[11px] text-gray-600 bg-blue-50/50 rounded-xl px-3 py-2 border border-blue-100/60 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-blue-900">{custShipments.length}</span> Total Deliveries
                          </div>
                          {latestShipment ? (
                            <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                              Latest: <strong className="text-blue-700 font-mono">{latestShipment.trackingNumber}</strong> ({latestShipment.status})
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-400">No deliveries booked yet</div>
                          )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          {/* 1. Start Conversation Button */}
                          <button
                            onClick={() => handleStartConversationWithCustomer(cust)}
                            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                            title="Open direct private messaging with this customer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Start Conversation</span>
                          </button>

                          {/* 2. Create Delivery Button */}
                          <button
                            onClick={() => {
                              handleSelectCustomerForDelivery(cust.uid);
                              setActiveTab('create_delivery');
                            }}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Create a new delivery for this customer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Delivery</span>
                          </button>

                          {/* 3. View Deliveries Filter */}
                          <button
                            onClick={() => {
                              setShipmentCustomerFilter(cust.uid);
                              setActiveTab('deliveries');
                            }}
                            className="px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-slate-100 text-gray-700 rounded-xl text-xs font-bold"
                            title="View all shipments for this customer"
                          >
                            History
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: CUSTOMER MESSAGES */}
          {activeTab === 'messages' && (
            <div className="animate-fadeIn">
              {activeChatConversation ? (
                /* When chat is open: full view, no other cards appear */
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[750px] flex flex-col">
                  <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                    <button
                      onClick={() => setActiveChatConversation(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <span>← Back to Customers</span>
                    </button>
                    <div className="text-center">
                      <div className="text-xs font-bold text-white">
                        Private Channel: {activeChatConversation.customerName}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Sender Identity: <strong>Company Support</strong>
                      </div>
                    </div>
                    <div className="w-20 text-right text-[10px] text-emerald-400 font-bold">
                      ● Active
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
                    <ChatComponent
                      conversation={activeChatConversation}
                      currentUserProfile={{
                        ...userProfile!,
                        role: 'sub_admin',
                        fullName: 'Company Support'
                      }}
                      onClose={() => setActiveChatConversation(null)}
                    />
                  </div>
                </div>
              ) : (
                /* Conversation selection and initiation view */
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                      <h2 className="text-lg font-black text-gray-900">Customer Support Messages</h2>
                      <p className="text-xs text-gray-500">
                        Private direct messaging with your assigned customers. You can initiate a conversation at any time.
                      </p>
                    </div>

                    {/* Quick Initiate Dropdown */}
                    {customers.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const cust = customers.find(c => c.uid === e.target.value);
                              if (cust) handleStartConversationWithCustomer(cust);
                            }
                          }}
                          defaultValue=""
                          className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold focus:outline-none"
                        >
                          <option value="" disabled>
                            Start Conversation with...
                          </option>
                          {customers.map(c => (
                            <option key={c.uid} value={c.uid}>
                              {c.fullName} ({c.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Conversation List */}
                  {conversations.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-xs space-y-3">
                      <MessageSquare className="w-10 h-10 mx-auto text-gray-300" />
                      <div className="font-bold text-gray-700">No active conversations yet</div>
                      <p className="max-w-md mx-auto">
                        You do not need to wait for a customer to message first! Select any assigned customer above or click "Start Conversation" from My Customers.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversations.map(conv => {
                        const cust = customers.find(c => c.uid === conv.customerId);
                        return (
                          <div
                            key={conv.id}
                            onClick={() => {
                              setActiveChatConversation(conv);
                              setSidebarOpen(false);
                            }}
                            className="p-4 rounded-2xl border border-gray-200 bg-slate-50/70 hover:bg-white hover:border-blue-400 transition-all flex items-center justify-between gap-4 cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center space-x-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                                {conv.customerName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-black text-gray-900 text-xs truncate">{conv.customerName}</h4>
                                  {conv.unreadAdminCount > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                                      {conv.unreadAdminCount} new
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 truncate max-w-md mt-0.5">
                                  {conv.lastMessage || 'Channel active'}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-[10px] text-gray-400 font-mono">
                                {conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                              <span className="text-xs font-bold text-blue-600 group-hover:underline inline-flex items-center space-x-1 mt-1">
                                <span>Open Chat</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: CREATE DELIVERY */}
          {activeTab === 'create_delivery' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Create & Assign New Delivery</h2>
                  <p className="text-xs text-gray-500">
                    Book an official air or ocean consignment. Deliveries are strictly restricted to your assigned customers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeliveryTrackingNumber(generateNewTrackingCode())}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 w-fit"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate New AWB</span>
                </button>
              </div>

              {customers.length === 0 ? (
                <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs space-y-2">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-600" />
                  <div className="font-bold text-sm">No Customers Assigned</div>
                  <p>You cannot create a delivery until Main Admin assigns at least one customer to your dispatch station.</p>
                </div>
              ) : (
                <form onSubmit={handleCreateDeliverySubmit} className="space-y-6">
                  {/* Customer Allocation Dropdown */}
                  <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-blue-900">
                      Select Assigned Consignee (Required) *
                    </label>
                    <select
                      value={deliveryCustomerId}
                      onChange={(e) => handleSelectCustomerForDelivery(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {customers.map(c => (
                        <option key={c.uid} value={c.uid}>
                          {c.fullName} — {c.email} ({c.country || 'International'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-blue-700">
                      The package will appear instantly on this customer's portal and tracking page.
                    </p>
                  </div>

                  {/* Consignment Identification */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Tracking Number (Air Waybill) *
                      </label>
                      <input
                        type="text"
                        value={deliveryTrackingNumber}
                        onChange={(e) => setDeliveryTrackingNumber(e.target.value.toUpperCase())}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Package Type *
                      </label>
                      <select
                        value={deliveryPackageType}
                        onChange={(e) => setDeliveryPackageType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                      >
                        <option value="Heavy Crate">Heavy Crate</option>
                        <option value="Palletized Cargo">Palletized Cargo</option>
                        <option value="Avionics & High Tech Container">Avionics & High Tech Container</option>
                        <option value="Standard Sealed Parcel">Standard Sealed Parcel</option>
                        <option value="Security Document Pouch">Security Document Pouch</option>
                        <option value="Temperature Controlled Medical">Temperature Controlled Medical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Weight (kg) & Pieces *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={deliveryWeightKg}
                          onChange={(e) => setDeliveryWeightKg(parseFloat(e.target.value) || 1)}
                          min="0.1"
                          step="0.1"
                          placeholder="Weight kg"
                          className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                        />
                        <input
                          type="number"
                          value={deliveryPieces}
                          onChange={(e) => setDeliveryPieces(parseInt(e.target.value) || 1)}
                          min="1"
                          placeholder="Pieces"
                          className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consignment Title & Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Delivery Title / Manifest Description *
                      </label>
                      <input
                        type="text"
                        value={deliveryTitle}
                        onChange={(e) => setDeliveryTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Carrier / Freighter Vessel *
                      </label>
                      <input
                        type="text"
                        value={deliveryCarrier}
                        onChange={(e) => setDeliveryCarrier(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Route & Geographic Milestones */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Departure Location (Origin Port) *
                      </label>
                      <input
                        type="text"
                        value={deliveryDeparture}
                        onChange={(e) => setDeliveryDeparture(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Destination Location (Final Port) *
                      </label>
                      <input
                        type="text"
                        value={deliveryDestination}
                        onChange={(e) => setDeliveryDestination(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Initial Current Location *
                      </label>
                      <input
                        type="text"
                        value={deliveryCurrentLoc}
                        onChange={(e) => setDeliveryCurrentLoc(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Sender & Recipient Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Sender / Origin Hub</div>
                      <input
                        type="text"
                        value={deliverySenderName}
                        onChange={(e) => setDeliverySenderName(e.target.value)}
                        placeholder="Sender / Logistics Ramp"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={deliverySenderAddress}
                        onChange={(e) => setDeliverySenderAddress(e.target.value)}
                        placeholder="Origin Address"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Consignee Recipient Destination</div>
                      <input
                        type="text"
                        value={deliveryRecipientName}
                        onChange={(e) => setDeliveryRecipientName(e.target.value)}
                        placeholder="Recipient Name"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={deliveryRecipientAddress}
                        onChange={(e) => setDeliveryRecipientAddress(e.target.value)}
                        placeholder="Consignee Address"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Status, Date & Progress */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Initial Movement Status *
                      </label>
                      <select
                        value={deliveryInitialStatus}
                        onChange={(e) => setDeliveryInitialStatus(e.target.value as ShipmentStatus)}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                      >
                        <option value="registered">Registered & Confirmed</option>
                        <option value="package_received">Package Received at Terminal</option>
                        <option value="picked_up">Picked Up by Courier</option>
                        <option value="processing">Processing & Security Screened</option>
                        <option value="sorting_facility">Arrived at Sorting Facility</option>
                        <option value="in_transit">In Global Transit</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Estimated Delivery Date *
                      </label>
                      <input
                        type="date"
                        value={deliveryEstDate}
                        onChange={(e) => setDeliveryEstDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Initial Progress ({deliveryInitialProgress}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={deliveryInitialProgress}
                        onChange={(e) => setDeliveryInitialProgress(parseInt(e.target.value))}
                        className="w-full mt-2 accent-blue-600"
                      />
                    </div>
                  </div>

                  {/* Customs & Duties (Optional) */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-3">
                    <div className="text-xs font-bold text-gray-800">Customs Clearance & Import Duty (Optional)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold mb-1">Duty Amount</label>
                        <input
                          type="number"
                          value={deliveryDutyAmount}
                          onChange={(e) => setDeliveryDutyAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold mb-1">Currency</label>
                        <input
                          type="text"
                          value={deliveryDutyCurrency}
                          onChange={(e) => setDeliveryDutyCurrency(e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold mb-1">Purpose</label>
                        <input
                          type="text"
                          value={deliveryDutyPurpose}
                          onChange={(e) => setDeliveryDutyPurpose(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end space-x-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('deliveries')}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingDelivery}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
                    >
                      {creatingDelivery ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Booking Consignment...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Generate & Book Delivery</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SECTION 5: DELIVERY MANAGEMENT */}
          {activeTab === 'deliveries' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Delivery Management</h2>
                  <p className="text-xs text-gray-500">
                    Edit, monitor, and control deliveries belonging exclusively to your assigned customers.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('create_delivery')}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs w-fit"
                >
                  <Plus className="w-4 h-4" />
                  <span>Book New Delivery</span>
                </button>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={shipmentSearch}
                    onChange={(e) => setShipmentSearch(e.target.value)}
                    placeholder="Search AWB or consignee..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <select
                  value={shipmentStatusFilter}
                  onChange={(e) => setShipmentStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="all">All Movement Statuses</option>
                  <option value="registered">Registered</option>
                  <option value="package_received">Package Received</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="sorting_facility">Sorting Facility</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="delayed">Delayed</option>
                </select>

                <select
                  value={shipmentCustomerFilter}
                  onChange={(e) => setShipmentCustomerFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="all">All Assigned Customers ({customers.length})</option>
                  {customers.map(c => (
                    <option key={c.uid} value={c.uid}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Table */}
              {filteredShipments.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs space-y-2">
                  <Package className="w-8 h-8 mx-auto text-gray-300" />
                  <div className="font-bold">No deliveries found</div>
                  <p>No shipments match the current filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider text-[10px] border-y border-gray-100">
                      <tr>
                        <th className="py-3 px-4">Tracking AWB & Customer</th>
                        <th className="py-3 px-4">Route (Origin → Destination)</th>
                        <th className="py-3 px-4">Carrier & Package</th>
                        <th className="py-3 px-4">Movement & Progress</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredShipments.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-black text-blue-600">{s.trackingNumber}</div>
                            <div className="font-bold text-gray-900">{s.customerName}</div>
                            <div className="text-[10px] text-gray-400">{s.customerEmail}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-800">
                              {s.departureLocation} → {s.destinationLocation}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Current: <strong className="text-gray-700">{s.currentLocation || s.departureLocation}</strong>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-gray-800 font-bold">{s.carrier}</div>
                            <div className="text-[10px] text-gray-500">
                              {s.packageType} • {s.weightKg} kg
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                s.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'delayed'
                                  ? 'bg-red-100 text-red-800'
                                  : s.status === 'failed'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {s.status.replace(/_/g, ' ')}
                            </span>
                            <div className="w-24 bg-gray-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all"
                                style={{ width: `${s.deliveryProgressPercentage ?? 35}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            {/* Live Tracking Jump */}
                            <button
                              onClick={() => {
                                setSelectedTrackingShipmentId(s.id);
                                setActiveTab('tracking');
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold cursor-pointer"
                              title="Update live tracking checkpoints"
                            >
                              Live Tracking
                            </button>

                            {/* Edit Shipment */}
                            <button
                              onClick={() => setEditingShipment({ ...s })}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer"
                              title="Edit consignment details"
                            >
                              <Edit className="w-3 h-3 inline mr-1" />
                              <span>Edit</span>
                            </button>

                            {/* Delete Shipment */}
                            <button
                              onClick={() => setShipmentToDelete(s)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold cursor-pointer"
                              title="Delete consignment"
                            >
                              <Trash2 className="w-3 h-3 inline" />
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

          {/* SECTION 6: TRACKING CONTROL */}
          {activeTab === 'tracking' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Live Delivery Tracking Control</h2>
                  <p className="text-xs text-gray-500">
                    Update package checkpoints, movement status, location coordinates, and progress. Every update reflects immediately on the assigned customer's tracking page.
                  </p>
                </div>

                {/* Consignment Selector */}
                {shipments.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-gray-500">Consignment:</span>
                    <select
                      value={selectedTrackingShipmentId}
                      onChange={(e) => setSelectedTrackingShipmentId(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:outline-none"
                    >
                      {shipments.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.trackingNumber} ({s.customerName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {!selectedTrackingShipment ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  Please select or create an assigned delivery to manage tracking.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active Consignment Status Banner */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          Active Air Waybill
                        </div>
                        <div className="text-xl font-mono font-black">{selectedTrackingShipment.trackingNumber}</div>
                        <div className="text-xs text-gray-300 mt-0.5">
                          Consignee: <strong>{selectedTrackingShipment.customerName}</strong> ({selectedTrackingShipment.destinationLocation})
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                            selectedTrackingShipment.status === 'delivered'
                              ? 'bg-emerald-500 text-white'
                              : selectedTrackingShipment.status === 'delayed'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {selectedTrackingShipment.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-gray-400 text-[10px] block">Current Location</span>
                        <span className="font-bold text-gray-200">
                          {selectedTrackingShipment.currentLocation || selectedTrackingShipment.departureLocation}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] block">Carrier</span>
                        <span className="font-bold text-gray-200">{selectedTrackingShipment.carrier}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] block">Est. Delivery</span>
                        <span className="font-bold text-gray-200">{selectedTrackingShipment.estimatedDeliveryDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] block">Movement Progress</span>
                        <span className="font-bold text-gray-200">
                          {selectedTrackingShipment.deliveryProgressPercentage ?? 35}% Complete
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Add New Checkpoint Form */}
                  <form onSubmit={handleAddCheckpointSubmit} className="bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center space-x-2">
                        <Navigation className="w-4 h-4 text-blue-600" />
                        <span>Post Live Checkpoint & Movement Update</span>
                      </h3>
                      <span className="text-[10px] text-gray-400">Real Location Data Only</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Movement Status *
                        </label>
                        <select
                          value={checkpointStatus}
                          onChange={(e) => {
                            const newStatus = e.target.value as ShipmentStatus;
                            setCheckpointStatus(newStatus);
                            setCheckpointTitle(getStatusTitle(newStatus));
                          }}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:outline-none"
                        >
                          <option value="picked_up">Picked Up from Consignor</option>
                          <option value="package_received">Package Received at Terminal</option>
                          <option value="processing">Processing & Screening</option>
                          <option value="sorting_facility">Arrived at Sorting Facility</option>
                          <option value="departure">Departed Origin Port</option>
                          <option value="in_transit">In Global Transit</option>
                          <option value="arrival_destination">Arrived at Destination Hub</option>
                          <option value="customs_processing">Customs Inspection Processing</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered & Signed</option>
                          <option value="delayed">Delayed / Transit Exception</option>
                          <option value="failed">Delivery Attempt Failed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Current Location (Actual Location) *
                        </label>
                        <input
                          type="text"
                          value={checkpointLocation}
                          onChange={(e) => setCheckpointLocation(e.target.value)}
                          placeholder="e.g. London Heathrow Hub Ramp 3"
                          required
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Delivery Progress ({checkpointProgress}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={checkpointProgress}
                          onChange={(e) => setCheckpointProgress(parseInt(e.target.value))}
                          className="w-full mt-2 accent-blue-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Checkpoint Title *
                        </label>
                        <input
                          type="text"
                          value={checkpointTitle}
                          onChange={(e) => setCheckpointTitle(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Estimated Arrival (Optional)
                        </label>
                        <input
                          type="text"
                          value={checkpointEstArrival}
                          onChange={(e) => setCheckpointEstArrival(e.target.value)}
                          placeholder="e.g. 24 Hours / Tomorrow 14:00"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Coordinates (Optional Actual GPS) */}
                    <div className="p-3 bg-white rounded-xl border border-gray-200">
                      <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">
                        Actual Coordinates (Optional)
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={checkpointLat}
                          onChange={(e) => setCheckpointLat(e.target.value)}
                          placeholder="Latitude (e.g. 51.4700)"
                          className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          value={checkpointLng}
                          onChange={(e) => setCheckpointLng(e.target.value)}
                          placeholder="Longitude (e.g. -0.4543)"
                          className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Delay Explanation (Required if Delayed or Failed) */}
                    {(checkpointStatus === 'delayed' || checkpointStatus === 'failed') && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-1">
                        <label className="block text-xs font-bold text-red-800">
                          Explanation for Delay or Issue (Required) *
                        </label>
                        <input
                          type="text"
                          value={checkpointDelayReason}
                          onChange={(e) => setCheckpointDelayReason(e.target.value)}
                          placeholder="e.g. Flight delayed due to storm conditions at origin airport"
                          required
                          className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-xs text-red-900 focus:outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Checkpoint Notes & Instructions
                      </label>
                      <textarea
                        value={checkpointNotes}
                        onChange={(e) => setCheckpointNotes(e.target.value)}
                        rows={2}
                        placeholder="Additional details for the consignee..."
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingCheckpoint}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-sm"
                      >
                        {savingCheckpoint ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Broadcasting Checkpoint...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-4 h-4" />
                            <span>Post Checkpoint Update</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Historical Checkpoints Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                      Checkpoint History ({checkpointHistory.length})
                    </h4>

                    {loadingCheckpoints ? (
                      <div className="py-6 text-center text-xs text-gray-400">Loading checkpoint timeline...</div>
                    ) : checkpointHistory.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400">No checkpoints recorded yet.</div>
                    ) : (
                      <div className="space-y-3 pl-4 border-l-2 border-blue-500">
                        {checkpointHistory.map(evt => (
                          <div key={evt.id} className="relative bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1">
                            <div className="absolute -left-[23px] top-4 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                              <span>{new Date(evt.timestamp).toLocaleString()}</span>
                              <span className="font-bold text-blue-600">{evt.status.replace(/_/g, ' ').toUpperCase()}</span>
                            </div>
                            <div className="font-bold text-gray-900">{evt.title}</div>
                            <div className="text-gray-600 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{evt.location}</span>
                            </div>
                            {evt.description && <p className="text-gray-500 text-[11px] pt-1">{evt.description}</p>}
                            {evt.delayExplanation && (
                              <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[10px]">
                                ⚠️ <strong>Exception Reason:</strong> {evt.delayExplanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 7: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Notifications & Dispatch Alerts</h2>
                  <p className="text-xs text-gray-500">
                    Real-time alerts for customer messages, tracking updates, and account events.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setNotificationFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      notificationFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-gray-600'
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotificationFilter('unread')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      notificationFilter === 'unread' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-gray-600'
                    }`}
                  >
                    Unread ({unreadNotificationsCount})
                  </button>
                </div>
              </div>

              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs space-y-2">
                  <Bell className="w-8 h-8 mx-auto text-gray-300" />
                  <div className="font-bold">No notifications to display</div>
                  <p>You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredNotifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 text-xs ${
                        n.read ? 'bg-slate-50 border-gray-200 text-gray-600' : 'bg-blue-50/50 border-blue-200 text-gray-900 font-medium'
                      }`}
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            n.type === 'message'
                              ? 'bg-indigo-100 text-indigo-700'
                              : n.type === 'tracking_event'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {n.type === 'message' ? (
                            <MessageSquare className="w-3.5 h-3.5" />
                          ) : n.type === 'tracking_event' ? (
                            <Navigation className="w-3.5 h-3.5" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-gray-900">{n.title}</div>
                          <div className="text-[11px] text-gray-600 mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {!n.read && (
                          <button
                            onClick={() => markNotificationRead(n.id)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* EDIT SHIPMENT MODAL */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900">
                Edit Consignment: {editingShipment.trackingNumber}
              </h3>
              <button
                onClick={() => setEditingShipment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedShipment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Carrier</label>
                  <input
                    type="text"
                    value={editingShipment.carrier}
                    onChange={(e) => setEditingShipment({ ...editingShipment, carrier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Package Type</label>
                  <input
                    type="text"
                    value={editingShipment.packageType}
                    onChange={(e) => setEditingShipment({ ...editingShipment, packageType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={editingShipment.weightKg}
                    onChange={(e) => setEditingShipment({ ...editingShipment, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Pieces</label>
                  <input
                    type="number"
                    value={editingShipment.pieces || 1}
                    onChange={(e) => setEditingShipment({ ...editingShipment, pieces: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Estimated Date</label>
                  <input
                    type="date"
                    value={editingShipment.estimatedDeliveryDate}
                    onChange={(e) => setEditingShipment({ ...editingShipment, estimatedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Current Location</label>
                  <input
                    type="text"
                    value={editingShipment.currentLocation || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, currentLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Movement Status</label>
                  <select
                    value={editingShipment.status}
                    onChange={(e) => setEditingShipment({ ...editingShipment, status: e.target.value as ShipmentStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="registered">Registered</option>
                    <option value="package_received">Package Received</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="sorting_facility">Sorting Facility</option>
                    <option value="in_transit">In Transit</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Consignment Description</label>
                <textarea
                  value={editingShipment.description}
                  onChange={(e) => setEditingShipment({ ...editingShipment, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {shipmentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-gray-600">
              Are you sure you want to permanently delete consignment{' '}
              <strong className="text-gray-900 font-mono">{shipmentToDelete.trackingNumber}</strong> belonging to{' '}
              <strong className="text-gray-900">{shipmentToDelete.customerName}</strong>?
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShipmentToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingShipment}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                {deletingShipment ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB ADMIN MOBILE BOTTOM APP BAR */}
      <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b132b]/95 backdrop-blur-md border-t border-[#1c2541] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => {
            setActiveTab('overview');
            setActiveChatConversation(null);
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'overview' ? 'text-blue-400 bg-blue-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 mb-0.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('customers');
            setActiveChatConversation(null);
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative cursor-pointer ${
            activeTab === 'customers' ? 'text-blue-400 bg-blue-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Customers</span>
          {totalAssignedCustomers > 0 && (
            <span className="absolute top-0 right-1 bg-blue-500 text-white text-[9px] px-1 rounded-full font-bold">
              {totalAssignedCustomers}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('messages');
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative cursor-pointer ${
            activeTab === 'messages' ? 'text-blue-400 bg-blue-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span>Messages</span>
          {totalUnreadMessages > 0 && (
            <span className="absolute top-0 right-1 bg-red-500 text-white text-[9px] px-1 rounded-full font-bold animate-pulse">
              {totalUnreadMessages}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('deliveries');
            setActiveChatConversation(null);
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative cursor-pointer ${
            activeTab === 'deliveries' ? 'text-blue-400 bg-blue-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span>Deliveries</span>
          <span className="text-[9px] opacity-75">{totalDeliveries}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tracking');
            setActiveChatConversation(null);
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'tracking' ? 'text-blue-400 bg-blue-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Navigation className="w-5 h-5 mb-0.5" />
          <span>Tracking</span>
        </button>
      </nav>
    </div>
  );
};
