import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
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
  EyeOff,
  Check,
  X,
  Send,
  Sliders,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Building,
  LogOut,
  History,
  CreditCard,
  Lock,
  Key,
  Save,
  UserCog,
  ExternalLink,
  PanelLeft,
  PanelLeftClose,
  UserPlus,
  Menu,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  Download
} from 'lucide-react';
import { isImageAttachment, downloadAttachmentFile } from '../utils/mediaCompression';
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
  subscribeToAllCustomers,
  subscribeToAllSubAdmins,
  createOrUpdateUserProfile,
  updateUserPassword,
  updateUserSuspension,
  transferCustomer,
  deleteUser,
  deleteUserDocOnly,
  unmarkAccountDeleted,
  getAllShipments,
  createShipment,
  updateShipment,
  deleteShipment,
  getAllConversations,
  getOrCreateConversation,
  getPendingModerationMessages,
  subscribeToPendingModerationMessages,
  moderateMessage,
  editMessage,
  silentEditSubAdminMessage,
  subscribeToMessages,
  deleteMessage,
  updateSubAdminCanEditMessages,
  updateAllSubAdminsCanEditMessages,
  getSystemSettings,
  subscribeToSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  subscribeToAuditLogs,
  buildAllCustomerDeviceLogins,
  addAuditLog,
  sendMessage,
  getAllPayments,
  confirmPayment
} from '../services/cargoService';
import { ChatComponent } from '../components/ChatComponent';
import { TrackingSection } from '../components/TrackingSection';
import { CustomerDeviceHistoryPanel } from '../components/CustomerDeviceHistoryPanel';
import { isUsaOnlyRestrictedAccount } from '../utils/geoAccess';
import { formatHoursAgoLabel } from '../utils/deviceInfo';

export const SuperAdminDashboard: React.FC = () => {
  const { userProfile, logout, changeSuperAdminPassword, updateSuperAdminProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [activeSection, setActiveSection] = useState<
    | 'overview'
    | 'subadmins'
    | 'subadmin_edit'
    | 'customers'
    | 'devices'
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

  const [showAdminSecurityModal, setShowAdminSecurityModal] = useState(false);
  const [adminProfileForm, setAdminProfileForm] = useState({
    fullName: userProfile?.fullName || 'Executive Super Administrator',
    email: userProfile?.email || 'admin@gmail.com',
    phoneNumber: userProfile?.phoneNumber || '+1 (800) 999-CARGO',
    address: userProfile?.address || 'One World Cargo Center, JFK Airport',
    city: userProfile?.city || 'New York',
    country: userProfile?.country || 'United States',
    notes: userProfile?.notes || 'Supreme Logistics Authority'
  });
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showAdminPassText, setShowAdminPassText] = useState(false);
  const [securityStatusMsg, setSecurityStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // User Edit & Password Reset Modal states (for Sub-Admins & Customers)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    country: '',
    notes: '',
    newPassword: '',
    usaOnlyLogin: false
  });
  const [showUserPassText, setShowUserPassText] = useState(false);
  const [savingEditUser, setSavingEditUser] = useState(false);

  // Dedicated Change & Update Customer Password Modal states
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserProfile | null>(null);
  const [customerNewPassword, setCustomerNewPassword] = useState('');
  const [customerConfirmPassword, setCustomerConfirmPassword] = useState('');
  const [showCustomerPassText, setShowCustomerPassText] = useState(false);
  const [showCurrentCustomerPass, setShowCurrentCustomerPass] = useState(false);
  const [savingCustomerPassword, setSavingCustomerPassword] = useState(false);
  const [customerPasswordError, setCustomerPasswordError] = useState('');

  const [showTransferModal, setShowTransferModal] = useState<UserProfile | null>(null);
  const [transferTargetSubAdmin, setTransferTargetSubAdmin] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [quickAssignSelection, setQuickAssignSelection] = useState<Record<string, string>>({});
  const [assigningCustomerId, setAssigningCustomerId] = useState<string | null>(null);

  // Delete User & Delete Shipment Confirmation Modal & Toast states
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState<Shipment | null>(null);
  const [isDeletingShipment, setIsDeletingShipment] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastNotification({ text, type });
    setTimeout(() => setToastNotification(null), 4000);
  };

  // Delivery tracking preview modal (Super Admin has oversight preview only; delivery management is strictly Sub-Admin)
  const [trackingPreviewCode, setTrackingPreviewCode] = useState<string | null>(null);

  // Active Chat Modal / Drawer
  const [activeChatConversation, setActiveChatConversation] = useState<Conversation | null>(null);

  // Selected Sub-Admin & Customer Chat under Sub-Admin Edit and Channels
  const [selectedEditSubAdminId, setSelectedEditSubAdminId] = useState<string | null>(null);
  const [selectedSilentEditConv, setSelectedSilentEditConv] = useState<Conversation | null>(null);
  const [silentEditMessages, setSilentEditMessages] = useState<ChatMessage[]>([]);
  const [inlineEditingMsgId, setInlineEditingMsgId] = useState<string | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState('');
  const [savingInlineSilentEdit, setSavingInlineSilentEdit] = useState(false);
  const [silentEditFilterOnly, setSilentEditFilterOnly] = useState(false);
  const [selectedChannelSubAdminId, setSelectedChannelSubAdminId] = useState<string | null>(null);

  // Individual Customer Device Login History Modal
  const [deviceHistoryCustomer, setDeviceHistoryCustomer] = useState<UserProfile | null>(null);

  // Announcement state
  const [announcementText, setAnnouncementText] = useState('');

  // Complete customer device login history since website launch (combines live audit_logs + customer profiles + historical records)
  const allCustomerDeviceLogins = useMemo(
    () => buildAllCustomerDeviceLogins(customers, auditLogs),
    [customers, auditLogs]
  );

  const isCustomerUnassigned = (c: UserProfile): boolean => {
    if (!c.assignedSubAdminId || c.assignedSubAdminId === '' || c.assignedSubAdminId === 'unassigned') {
      return true;
    }
    if (subAdmins.length > 0 && !subAdmins.some((s) => s.uid === c.assignedSubAdminId)) {
      return true;
    }
    return false;
  };

  // Newly created customers awaiting Super Admin assignment to a Sub-Admin account
  const unassignedCustomers = useMemo(
    () => customers.filter((c) => isCustomerUnassigned(c)),
    [customers, subAdmins]
  );

  // Real-time message subscription for the selected customer chat inside Sub-Admin Edit
  useEffect(() => {
    if (!selectedSilentEditConv?.id) {
      setSilentEditMessages([]);
      return;
    }
    const unsub = subscribeToMessages(selectedSilentEditConv.id, 'super_admin', (msgs) => {
      setSilentEditMessages(msgs);
    });
    return () => unsub();
  }, [selectedSilentEditConv?.id]);

  // Build deduplicated list of customer chats belonging to a specific Sub-Admin account
  const getCustomerChatsForSubAdmin = (sub: UserProfile) => {
    const map = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        customerEmail: string;
        conversation: Conversation | null;
        lastMessage: string;
        lastMessageTime: string;
      }
    >();

    const subNameLower = (sub.fullName || '').trim().toLowerCase();

    // 1. Add all conversations linked to this Sub-Admin
    conversations.forEach((conv) => {
      const matchesSub =
        conv.subAdminId === sub.uid ||
        (subNameLower && (conv.subAdminName || '').trim().toLowerCase() === subNameLower);
      if (matchesSub) {
        map.set(conv.customerId, {
          customerId: conv.customerId,
          customerName: conv.customerName || 'Customer',
          customerEmail: conv.customerEmail || '',
          conversation: conv,
          lastMessage: conv.lastMessage || conv.subAdminLastMessage || '',
          lastMessageTime: conv.lastMessageTime || conv.updatedAt || ''
        });
      }
    });

    // 2. Add all customers assigned to this Sub-Admin (even if no messages yet, or matching existing conv)
    customers
      .filter((c) => c.assignedSubAdminId === sub.uid)
      .forEach((cust) => {
        const existingConv =
          conversations.find((cv) => cv.customerId === cust.uid) ||
          map.get(cust.uid)?.conversation ||
          null;
        map.set(cust.uid, {
          customerId: cust.uid,
          customerName: cust.fullName || existingConv?.customerName || 'Customer',
          customerEmail: cust.email || existingConv?.customerEmail || '',
          conversation: existingConv,
          lastMessage: existingConv?.lastMessage || existingConv?.subAdminLastMessage || '',
          lastMessageTime: existingConv?.lastMessageTime || existingConv?.updatedAt || ''
        });
      });

    return Array.from(map.values()).sort((a, b) => {
      const tA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const tB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      if (tA !== tB) return tB - tA;
      return a.customerName.localeCompare(b.customerName);
    });
  };

  const handleSelectCustomerChatUnderSubAdmin = async (
    sub: UserProfile,
    entry: {
      customerId: string;
      customerName: string;
      customerEmail: string;
      conversation: Conversation | null;
    },
    openMode: 'full' | 'silent_edit'
  ) => {
    try {
      let conv = entry.conversation;
      if (!conv) {
        conv = await getOrCreateConversation(
          entry.customerId,
          entry.customerName,
          entry.customerEmail,
          sub.uid,
          sub.fullName
        );
        setConversations((prev) => (prev.some((c) => c.id === conv!.id) ? prev : [conv!, ...prev]));
      }
      if (openMode === 'full') {
        setActiveChatConversation(conv);
      } else {
        setSelectedSilentEditConv(conv);
        setInlineEditingMsgId(null);
        setInlineEditDraft('');
      }
    } catch (err) {
      console.error('Failed to open customer chat under Sub-Admin:', err);
      showToast('Could not open customer chat. Please retry.', 'error');
    }
  };

  const handleSaveInlineSilentEdit = async (msgId: string) => {
    const trimmed = inlineEditDraft.trim();
    if (!trimmed || savingInlineSilentEdit) return;
    setSavingInlineSilentEdit(true);
    try {
      const archive = await silentEditSubAdminMessage(
        msgId,
        trimmed,
        userProfile?.fullName || 'Super Admin',
        'super_admin'
      );
      setSilentEditMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                text: trimmed,
                originalText: trimmed,
                customerDisplayText: trimmed,
                isEdited: false,
                showOriginalToCustomer: false,
                editedAt: undefined,
                editedBy: undefined,
                silentOriginalText: archive.silentOriginalText,
                silentEditHistory: archive.silentEditHistory,
                lastSilentEditedAt: archive.lastSilentEditedAt
              }
            : m
        )
      );
      setInlineEditingMsgId(null);
      setInlineEditDraft('');
      showToast('Message updated silently. Old message is saved on the left for Super Admin.');
    } catch (err: any) {
      console.error('Inline silent edit failed:', err);
      showToast(err?.message || 'Failed to update message.', 'error');
    } finally {
      setSavingInlineSilentEdit(false);
    }
  };

  const handleRestoreOldSilentMessage = async (msgId: string, oldText: string) => {
    const trimmed = oldText.trim();
    if (!trimmed || savingInlineSilentEdit) return;
    setSavingInlineSilentEdit(true);
    try {
      const archive = await silentEditSubAdminMessage(
        msgId,
        trimmed,
        userProfile?.fullName || 'Super Admin',
        'super_admin'
      );
      setSilentEditMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                text: trimmed,
                originalText: trimmed,
                customerDisplayText: trimmed,
                isEdited: false,
                showOriginalToCustomer: false,
                editedAt: undefined,
                editedBy: undefined,
                silentOriginalText: archive.silentOriginalText,
                silentEditHistory: archive.silentEditHistory,
                lastSilentEditedAt: archive.lastSilentEditedAt
              }
            : m
        )
      );
      showToast('Old message restored silently.');
    } catch (err: any) {
      console.error('Restore old message failed:', err);
      showToast(err?.message || 'Failed to restore old message.', 'error');
    } finally {
      setSavingInlineSilentEdit(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const unsubSettings = subscribeToSystemSettings((liveSettings) => {
      setSettings(liveSettings);
    });
    const unsubPending = subscribeToPendingModerationMessages((livePending) => {
      setPendingMessages(livePending);
    });
    const unsubAudits = subscribeToAuditLogs((liveAudits) => {
      setAuditLogs(liveAudits);
    });
    const unsubCustomers = subscribeToAllCustomers((liveCustomers) => {
      setCustomers(liveCustomers);
    });
    const unsubSubAdmins = subscribeToAllSubAdmins((liveSubAdmins) => {
      setSubAdmins(liveSubAdmins);
    });
    return () => {
      unsubSettings();
      unsubPending();
      unsubAudits();
      unsubCustomers();
      unsubSubAdmins();
    };
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
      const cleanEmail = subAdminForm.email.trim().toLowerCase();
      const newUid = 'subadmin_' + Date.now();
      const initialPassword = subAdminForm.password.trim() || 'subadmin12345';

      // 1. Delete any accidental customer records that have this same email (without blacklisting the email)
      const allUsers = await getAllUsers();
      for (const u of allUsers) {
        if (u.email && u.email.toLowerCase().trim() === cleanEmail && u.role === 'customer') {
          await deleteUserDocOnly(u.uid);
        }
      }

      // Clear any previous deletion mark when Super Admin explicitly creates a new Sub Admin with this email
      await unmarkAccountDeleted(newUid, cleanEmail);

      // 2. Create the real Sub Admin profile
      await createOrUpdateUserProfile({
        uid: newUid,
        email: cleanEmail,
        fullName: subAdminForm.fullName.trim(),
        role: 'sub_admin',
        customPassword: initialPassword,
        phoneNumber: subAdminForm.phoneNumber.trim(),
        city: subAdminForm.city.trim(),
        country: subAdminForm.country.trim() || 'United Kingdom',
        notes: subAdminForm.notes.trim(),
        isSuspended: false
      });

      await addAuditLog(
        'sub_admin_created',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Created Sub Admin account: ${subAdminForm.fullName} (${cleanEmail}). Generated initial login: ${cleanEmail} / ${initialPassword}`
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
      await loadAllData();
      showToast(`Sub Admin account for ${subAdminForm.fullName} created successfully with full Sub Admin privileges!`);
    } catch (err) {
      console.error(err);
      showToast('Error creating Sub Admin account.', 'error');
    }
  };

  // Save Super Admin Profile Changes
  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSecurity(true);
    setSecurityStatusMsg(null);
    try {
      await updateSuperAdminProfile({
        fullName: adminProfileForm.fullName.trim(),
        email: adminProfileForm.email.trim().toLowerCase(),
        phoneNumber: adminProfileForm.phoneNumber.trim(),
        address: adminProfileForm.address.trim(),
        city: adminProfileForm.city.trim(),
        country: adminProfileForm.country.trim(),
        notes: adminProfileForm.notes.trim()
      });
      setSecurityStatusMsg({ type: 'success', text: 'Administrative profile details updated successfully!' });
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      setSecurityStatusMsg({ type: 'error', text: err.message || 'Failed to update administrative profile.' });
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // Change Super Admin Security Password
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword) {
      setSecurityStatusMsg({ type: 'error', text: 'Please enter your new password.' });
      return;
    }
    if (newAdminPassword.length < 6) {
      setSecurityStatusMsg({ type: 'error', text: 'New password must contain at least 6 characters.' });
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setSecurityStatusMsg({ type: 'error', text: 'Passwords do not match. Please re-enter identical passwords.' });
      return;
    }

    setIsSavingSecurity(true);
    setSecurityStatusMsg(null);
    try {
      await changeSuperAdminPassword(newAdminPassword);
      setSecurityStatusMsg({
        type: 'success',
        text: 'Administrative password updated successfully! You can now use this new password on your next sign-in.'
      });
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      setSecurityStatusMsg({ type: 'error', text: err.message || 'Failed to update administrative password.' });
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // Open Edit User modal (Sub Admin or Customer)
  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditUserForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || user.phone || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || 'United States',
      notes: user.notes || '',
      newPassword: user.customPassword || '',
      usaOnlyLogin: isUsaOnlyRestrictedAccount(user)
    });
  };

  // Save Edited User (Sub Admin or Customer) with optional new password
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEditUser(true);
    try {
      const updates: Partial<UserProfile> = {
        fullName: editUserForm.fullName.trim(),
        email: editUserForm.email.trim().toLowerCase(),
        phoneNumber: editUserForm.phoneNumber.trim(),
        address: editUserForm.address.trim(),
        city: editUserForm.city.trim(),
        country: editUserForm.country.trim(),
        notes: editUserForm.notes.trim(),
        usaOnlyLogin: editUserForm.usaOnlyLogin
      };

      const normalizedEmail = editUserForm.email.trim().toLowerCase();
      const trimmedNewPassword = editUserForm.newPassword.trim();
      const passwordChanged = Boolean(trimmedNewPassword) && trimmedNewPassword !== (editingUser.customPassword || '').trim();

      if (trimmedNewPassword) {
        updates.customPassword = trimmedNewPassword;
        if (passwordChanged) {
          await updateUserPassword(editingUser.uid, trimmedNewPassword, normalizedEmail);
        }
      }

      await createOrUpdateUserProfile({
        ...updates,
        uid: editingUser.uid
      });

      await addAuditLog(
        'user_account_edited',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin updated ${editingUser.role} profile for ${editUserForm.fullName} (${editUserForm.email}). ${passwordChanged ? 'Password was also updated/reset.' : ''}`,
        editingUser.uid
      );

      setEditingUser(null);
      await loadAllData();
      showToast(`Account details for ${editUserForm.fullName} updated successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to update user account.', 'error');
    } finally {
      setSavingEditUser(false);
    }
  };

  // Open dedicated Change & Update Customer Password modal
  const handleOpenCustomerPasswordModal = (user: UserProfile) => {
    setPasswordTargetUser(user);
    setCustomerNewPassword('');
    setCustomerConfirmPassword('');
    setShowCustomerPassText(false);
    setShowCurrentCustomerPass(false);
    setCustomerPasswordError('');
  };

  // Save updated customer password directly from Super Admin Dashboard
  const handleSaveCustomerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;

    const trimmedNew = customerNewPassword.trim();
    const trimmedConfirm = customerConfirmPassword.trim();

    if (trimmedNew.length < 6) {
      setCustomerPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setCustomerPasswordError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setCustomerPasswordError('');
    setSavingCustomerPassword(true);
    try {
      const normalizedEmail = (passwordTargetUser.email || '').trim().toLowerCase();
      await updateUserPassword(passwordTargetUser.uid, trimmedNew, normalizedEmail);

      await addAuditLog(
        'customer_password_updated',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin changed and updated login password for ${passwordTargetUser.fullName} (${passwordTargetUser.email}).`,
        passwordTargetUser.uid
      );

      const now = new Date().toISOString();
      setCustomers(prev =>
        prev.map(c =>
          c.uid === passwordTargetUser.uid
            ? { ...c, customPassword: trimmedNew, passwordUpdatedAt: now, updatedAt: now }
            : c
        )
      );
      setSubAdmins(prev =>
        prev.map(s =>
          s.uid === passwordTargetUser.uid
            ? { ...s, customPassword: trimmedNew, passwordUpdatedAt: now, updatedAt: now }
            : s
        )
      );

      const targetName = passwordTargetUser.fullName;
      setPasswordTargetUser(null);
      setCustomerNewPassword('');
      setCustomerConfirmPassword('');
      await loadAllData();
      showToast(`Password updated for ${targetName}! New password is active immediately.`);
    } catch (err) {
      console.error(err);
      setCustomerPasswordError('Failed to update password. Please try again.');
      showToast('Failed to update customer password.', 'error');
    } finally {
      setSavingCustomerPassword(false);
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
      setCustomers(prev => prev.map(c => c.uid === user.uid ? { ...c, isSuspended: nextState } : c));
      setSubAdmins(prev => prev.map(s => s.uid === user.uid ? { ...s, isSuspended: nextState } : s));
      showToast(`Account for ${user.fullName} is now ${nextState ? 'Suspended' : 'Reactivated'}.`);
      loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update account status.', 'error');
    }
  };

  // Delete user trigger (opens dedicated in-app confirmation modal)
  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
  };

  // Confirm delete user execution
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const deletedEmail = (userToDelete.email || '').toLowerCase().trim();
      await deleteUser(userToDelete.uid, deletedEmail);
      await addAuditLog(
        'account_deleted',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Permanently deleted ${userToDelete.role} account for ${userToDelete.fullName} (${userToDelete.email})`
      );
      setCustomers(prev =>
        prev.filter(
          c => c.uid !== userToDelete.uid && (!deletedEmail || (c.email || '').toLowerCase().trim() !== deletedEmail)
        )
      );
      setSubAdmins(prev =>
        prev.filter(
          s => s.uid !== userToDelete.uid && (!deletedEmail || (s.email || '').toLowerCase().trim() !== deletedEmail)
        )
      );
      setConversations(prev =>
        prev.filter(
          conv =>
            conv.customerId !== userToDelete.uid &&
            conv.id !== `conv_${userToDelete.uid}` &&
            (!deletedEmail || (conv.customerEmail || '').toLowerCase().trim() !== deletedEmail)
        )
      );
      showToast(`Account for ${userToDelete.fullName} permanently deleted.`);
      setUserToDelete(null);
      loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete user account.', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Quick one-click assignment of newly registered customer to a Sub-Admin account
  const handleQuickAssignCustomer = async (cust: UserProfile, targetSubAdminId?: string) => {
    const resolvedSubId = targetSubAdminId || quickAssignSelection[cust.uid] || subAdmins[0]?.uid || '';
    const targetSub = subAdmins.find(s => s.uid === resolvedSubId);
    if (!targetSub) {
      showToast('Please select a Sub Admin account to assign this customer to.', 'error');
      return;
    }

    setAssigningCustomerId(cust.uid);
    try {
      await transferCustomer(cust.uid, targetSub.uid, targetSub.fullName);

      await addAuditLog(
        'customer_assigned_by_super_admin',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin assigned newly registered customer ${cust.fullName} (${cust.email}) to Sub Admin ${targetSub.fullName}`
      );

      setCustomers(prev => prev.map(c => c.uid === cust.uid ? {
        ...c,
        assignedSubAdminId: targetSub.uid,
        assignedSubAdminName: targetSub.fullName
      } : c));

      setQuickAssignSelection(prev => {
        const next = { ...prev };
        delete next[cust.uid];
        return next;
      });
      loadAllData();
      showToast(`${cust.fullName} is now assigned to Sub Admin ${targetSub.fullName}.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to assign customer to Sub Admin.', 'error');
    } finally {
      setAssigningCustomerId(null);
    }
  };

  // Assign or Transfer customer via modal
  const handleTransferCustomer = async () => {
    if (!showTransferModal) return;
    const effectiveTargetId = transferTargetSubAdmin || subAdmins[0]?.uid || '';
    if (!effectiveTargetId) return;
    const targetSub = subAdmins.find(s => s.uid === effectiveTargetId);
    if (!targetSub) return;

    const wasUnassigned = isCustomerUnassigned(showTransferModal);

    try {
      await transferCustomer(
        showTransferModal.uid,
        targetSub.uid,
        targetSub.fullName
      );

      await addAuditLog(
        wasUnassigned ? 'customer_assigned_by_super_admin' : 'customer_transferred',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        wasUnassigned
          ? `Super Admin assigned customer ${showTransferModal.fullName} (${showTransferModal.email}) to Sub Admin ${targetSub.fullName}`
          : `Transferred customer ${showTransferModal.fullName} from previous assignment to Sub Admin ${targetSub.fullName}`
      );

      setCustomers(prev => prev.map(c => c.uid === showTransferModal.uid ? {
        ...c,
        assignedSubAdminId: targetSub.uid,
        assignedSubAdminName: targetSub.fullName
      } : c));

      setShowTransferModal(null);
      setTransferTargetSubAdmin('');
      loadAllData();
      showToast(
        wasUnassigned
          ? `Customer ${showTransferModal.fullName} assigned to ${targetSub.fullName}.`
          : `Customer ${showTransferModal.fullName} reassigned to ${targetSub.fullName}.`
      );
    } catch (err) {
      console.error(err);
      showToast(wasUnassigned ? 'Failed to assign customer.' : 'Failed to transfer customer.', 'error');
    }
  };

  // Moderation Approve / Reject (handles BOTH Sub-Admin -> Customer approval AND Customer -> Sub-Admin access)
  const handleApproveMessage = async (msg: ChatMessage) => {
    const isSubAdminOutgoing = msg.senderRole === 'sub_admin';
    try {
      const summaryText =
        msg.customerDisplayText ||
        msg.text ||
        (msg.attachmentType ? `[${msg.attachmentType.toUpperCase()}] ${msg.attachmentName || 'Photo / Receipt'}` : 'Photo / Receipt');
      await moderateMessage(msg.id, 'approved', msg.conversationId, summaryText);
      await addAuditLog(
        isSubAdminOutgoing ? 'sub_admin_message_approved' : 'message_approved',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        isSubAdminOutgoing
          ? `Super Admin approved Sub-Admin ${msg.attachmentUrl ? 'attachment' : 'message'} ID ${msg.id} for delivery to customer.`
          : `Super Admin granted Sub-Admin access to customer ${msg.attachmentUrl ? 'photo/receipt' : 'message'} ID ${msg.id} from ${msg.senderName}.`
      );
      showToast(
        isSubAdminOutgoing
          ? 'Approved! Message has now been delivered to the customer.'
          : 'Access granted! Delivered to Sub-Admin dashboard.'
      );
    } catch (err) {
      console.error(err);
      showToast(
        isSubAdminOutgoing ? 'Failed to approve Sub-Admin message.' : 'Failed to grant Sub-Admin access.',
        'error'
      );
    }
  };

  const handleRejectMessage = async (msg: ChatMessage) => {
    const isSubAdminOutgoing = msg.senderRole === 'sub_admin';
    try {
      await moderateMessage(msg.id, 'rejected', msg.conversationId, msg.text || '', 'Blocked by Super Admin');
      await addAuditLog(
        isSubAdminOutgoing ? 'sub_admin_message_rejected' : 'message_rejected',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        isSubAdminOutgoing
          ? `Super Admin blocked Sub-Admin ${msg.attachmentUrl ? 'attachment' : 'message'} ID ${msg.id} from being delivered to customer.`
          : `Rejected customer ${msg.attachmentUrl ? 'photo/receipt' : 'message'} ID ${msg.id} from ${msg.senderName}.`
      );
      showToast(
        isSubAdminOutgoing
          ? 'Blocked! Customer will not receive this Sub-Admin message.'
          : 'Blocked from Sub-Admin dashboard.'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to block message.', 'error');
    }
  };

  // Customer Messages to Sub-Admin Auto-Delivery Toggle (stays AUTO ON until manually turned OFF)
  const handleToggleModeration = async () => {
    const currentlyAutoOn = settings ? settings.customerMessagesToSubAdminAutoOn !== false : true;
    const nextAutoOn = !currentlyAutoOn;
    const nextModeration = !nextAutoOn;
    try {
      await updateSystemSettings(
        {
          customerMessagesToSubAdminAutoOn: nextAutoOn,
          messageModeration: nextModeration
        },
        userProfile?.fullName || 'Super Admin'
      );
      await addAuditLog(
        'moderation_setting_changed',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin manually switched Customer Messages to Sub-Admin ${nextAutoOn ? 'AUTO ON' : 'OFF (Manual Approval)'}`
      );
      if (settings) {
        setSettings({
          ...settings,
          messageModeration: nextModeration,
          customerMessagesToSubAdminAutoOn: nextAutoOn
        });
      }
      showToast(
        nextAutoOn
          ? 'Customer messages to Sub-Admin: AUTO ON (Sub-Admins see customer messages automatically).'
          : 'Customer messages to Sub-Admin turned OFF (messages now wait for Super Admin approval).'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update customer message auto-delivery setting.', 'error');
    }
  };

  // Super Admin Feature: Enable/Disable Silent Message Editing for All Sub-Admins
  const handleToggleAllSubAdminEdit = async () => {
    const nextVal = !Boolean(settings?.subAdminCanEditOwnMessages);
    try {
      await updateAllSubAdminsCanEditMessages(nextVal, userProfile?.fullName || 'Super Admin');
      setSettings(prev => (prev ? { ...prev, subAdminCanEditOwnMessages: nextVal } : prev));
      setSubAdmins(prev => prev.map(s => ({ ...s, canEditOwnMessages: nextVal })));
      setUsers(prev => prev.map(u => (u.role === 'sub_admin' ? { ...u, canEditOwnMessages: nextVal } : u)));
      await addAuditLog(
        'subadmin_silent_edit_toggle',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin turned Sub-Admin Silent Message Edit ${nextVal ? 'ON for all Sub-Admins' : 'OFF for all Sub-Admins'}.`
      ).catch(() => {});
      showToast(
        nextVal
          ? 'Sub-Admin Silent Message Edit: ON (Sub-Admins can edit written messages silently).'
          : 'Sub-Admin Silent Message Edit: OFF.'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update Sub-Admin message edit permission.', 'error');
    }
  };

  // Super Admin Feature: Enable/Disable Silent Message Editing for a Single Sub-Admin
  const handleToggleSingleSubAdminEdit = async (sub: UserProfile) => {
    const currentlyEnabled =
      sub.canEditOwnMessages !== undefined
        ? sub.canEditOwnMessages === true
        : Boolean(settings?.subAdminCanEditOwnMessages);
    const nextVal = !currentlyEnabled;
    try {
      await updateSubAdminCanEditMessages(sub.uid, nextVal, sub.email);
      setSubAdmins(prev => prev.map(s => (s.uid === sub.uid ? { ...s, canEditOwnMessages: nextVal } : s)));
      setUsers(prev => prev.map(u => (u.uid === sub.uid ? { ...u, canEditOwnMessages: nextVal } : u)));
      await addAuditLog(
        'subadmin_silent_edit_toggle',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin turned Silent Message Edit ${nextVal ? 'ON' : 'OFF'} for Sub-Admin ${sub.fullName} (${sub.email}).`,
        sub.uid
      ).catch(() => {});
      showToast(
        `${sub.fullName}: Silent Message Edit ${nextVal ? 'ON' : 'OFF'}.`
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update Sub-Admin permission.', 'error');
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
      showToast('Global Announcement broadcasted successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save announcement.', 'error');
    }
  };

  const handleDeleteShipment = (s: Shipment) => {
    setShipmentToDelete(s);
  };

  const handleConfirmDeleteShipment = async () => {
    if (!shipmentToDelete || isDeletingShipment) return;
    const s = shipmentToDelete;
    setIsDeletingShipment(true);
    try {
      await deleteShipment(s.id);
      setShipments(prev => prev.filter(item => item.id !== s.id));
      await addAuditLog(
        'shipment_deleted',
        userProfile?.fullName || 'Super Admin',
        'super_admin',
        `Super Admin deleted consignment record ${s.trackingNumber}`
      ).catch(() => {});
      setShipmentToDelete(null);
      showToast(`Shipment record ${s.trackingNumber} permanently deleted.`);
      loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete shipment.', 'error');
    } finally {
      setIsDeletingShipment(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Super Admin Command Banner */}
      <div className="bg-[#0b132b] text-white px-3 sm:px-6 py-2.5 border-b border-[#1c2541] shadow-md flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-40">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {/* Top hand corner navigation toggle icon - opens all siders / toggles full screen */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
            title={sidebarOpen ? "Full Screen Function (Hide Siders)" : "Click to See All Siders"}
          >
            <Menu className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">{sidebarOpen ? 'Full Screen' : 'All Siders'}</span>
          </button>

          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">Super Admin Command Center</h1>
              <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-amber-400 text-gray-950 tracking-wider shrink-0">
                Full Control
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">
              Authenticated: <strong className="text-white">{userProfile?.fullName || 'Super Admin'}</strong> <span className="hidden md:inline">({userProfile?.email})</span>
            </p>
          </div>
        </div>

        {/* Right Functions Cluster - Arranged in clean logical order without duplication */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Function 1: Change Password & Edit Admin Profile */}
          <button
            onClick={() => {
              setShowAdminSecurityModal(true);
              setAdminProfileForm({
                fullName: userProfile?.fullName || 'Executive Super Administrator',
                email: userProfile?.email || 'admin@gmail.com',
                phoneNumber: userProfile?.phoneNumber || '+1 (800) 999-CARGO',
                address: userProfile?.address || 'One World Cargo Center, JFK Airport',
                city: userProfile?.city || 'New York',
                country: userProfile?.country || 'United States',
                notes: userProfile?.notes || 'Supreme Logistics Authority'
              });
              setSecurityStatusMsg(null);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            title="Change Super Admin Password & Edit Profile"
          >
            <Key className="w-3.5 h-3.5 text-gray-950" />
            <span className="hidden sm:inline">Change Password & Edit</span>
            <span className="sm:hidden">Edit</span>
          </button>

          {/* Function 2: Customer Messages to Sub-Admin Auto-Delivery Quick Button */}
          <button
            onClick={handleToggleModeration}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-colors cursor-pointer ${
              settings?.customerMessagesToSubAdminAutoOn !== false
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
            title={
              settings?.customerMessagesToSubAdminAutoOn !== false
                ? 'Customer messages to Sub-Admin are AUTO ON. Click to manually turn OFF.'
                : 'Customer messages to Sub-Admin are manually OFF. Click to turn AUTO ON.'
            }
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              Sub-Admin Auto: {settings?.customerMessagesToSubAdminAutoOn !== false ? 'ON' : 'OFF'}
            </span>
            <span className="md:hidden">
              {settings?.customerMessagesToSubAdminAutoOn !== false ? 'Auto ON' : 'Auto OFF'}
            </span>
          </button>

          {/* Function 3: Refresh System Data */}
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh System Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Function 4: Sign Out */}
          <button
            onClick={async () => {
              await logout();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
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
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto p-2 sm:p-4 lg:p-6 pb-24 lg:pb-8 gap-4 sm:gap-6 min-w-0 relative">
        {/* Navigation Sidebar Drawer */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white p-4 shadow-2xl flex flex-col overflow-y-auto transition-transform duration-200
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
                onClick={() => {
                  setActiveSection('overview');
                  setSidebarOpen(false);
                }}
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
                onClick={() => {
                  setActiveSection('shipments');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'shipments'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Package className="w-4 h-4 shrink-0" />
                  <span className="truncate">Consignments (Audit)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {shipments.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('subadmins');
                  setSidebarOpen(false);
                }}
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
                onClick={() => {
                  setActiveSection('subadmin_edit');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'subadmin_edit'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Edit className="w-4 h-4 shrink-0" />
                  <span className="truncate">Sub-Admin Edit</span>
                </div>
                {(() => {
                  const enabledCount = subAdmins.filter(s =>
                    s.canEditOwnMessages !== undefined
                      ? s.canEditOwnMessages === true
                      : Boolean(settings?.subAdminCanEditOwnMessages)
                  ).length;
                  const anyOn = enabledCount > 0 || Boolean(settings?.subAdminCanEditOwnMessages);
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                      activeSection === 'subadmin_edit'
                        ? 'bg-white/20 text-white'
                        : anyOn
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {anyOn ? 'ON' : 'OFF'}
                    </span>
                  );
                })()}
              </button>

              <button
                onClick={() => {
                  setActiveSection('customers');
                  setSidebarOpen(false);
                }}
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
                <div className="flex items-center space-x-1 shrink-0">
                  {unassignedCustomers.length > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-white animate-pulse"
                      title={`${unassignedCustomers.length} new customer(s) awaiting Super Admin assignment`}
                    >
                      {unassignedCustomers.length} New
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {customers.length}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveSection('devices');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl sm:rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                  activeSection === 'devices'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span className="truncate">Customer Devices</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeSection === 'devices' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  {allCustomerDeviceLogins.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveSection('moderation');
                  setSidebarOpen(false);
                }}
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
                onClick={() => {
                  setActiveSection('messages');
                  setSidebarOpen(false);
                }}
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
                onClick={() => {
                  setActiveSection('payments');
                  setSidebarOpen(false);
                }}
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
                onClick={() => {
                  setActiveSection('payment_methods');
                  setSidebarOpen(false);
                }}
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
                onClick={() => {
                  setActiveSection('audit');
                  setSidebarOpen(false);
                }}
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
                onClick={() => {
                  setActiveSection('settings');
                  setSidebarOpen(false);
                }}
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
              {/* Comprehensive Stat Cards - Compact & Ordered */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Total Customers
                    </span>
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{totalCustomers}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">Registered consignees</div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Sub Admins
                    </span>
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{totalSubAdmins}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">Dispatch managers</div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Active Shipments
                    </span>
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{activeShipments}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {deliveredShipments} Deliv • {pendingShipments} Pend
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Outstanding Duties
                    </span>
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                    ${outstandingDutyTotal.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">Pending customs tariffs</div>
                </div>
              </div>

              {/* Message Approval & Delivery Control Banner */}
              <div className="bg-gradient-to-r from-[#0b132b] to-[#1c2541] rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl border ${
                    pendingMessages.length > 0
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">Message Approval &amp; Moderation Control</h3>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Every <strong className="text-amber-300">Sub-Admin → Customer</strong> message requires Super Admin approval before the customer can receive it.
                      {' '}Customer → Sub-Admin text is{' '}
                      <strong className={settings?.customerMessagesToSubAdminAutoOn !== false ? 'text-emerald-400' : 'text-amber-400'}>
                        {settings?.customerMessagesToSubAdminAutoOn !== false ? 'AUTO ON' : 'MANUALLY OFF'}
                      </strong>
                      . <strong className="text-white">{pendingMessages.length}</strong> message(s) awaiting Super Admin approval.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                  <button
                    onClick={handleToggleModeration}
                    className={`px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                      settings?.customerMessagesToSubAdminAutoOn !== false
                        ? 'bg-amber-500 hover:bg-amber-400 text-gray-950'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-gray-950'
                    }`}
                  >
                    {settings?.customerMessagesToSubAdminAutoOn !== false ? 'Customer Auto: ON' : 'Customer Auto: OFF'}
                  </button>
                  {pendingMessages.length > 0 && (
                    <button
                      onClick={() => setActiveSection('moderation')}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Approve Queue ({pendingMessages.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Newly Registered Customers Awaiting Super Admin Assignment */}
              {unassignedCustomers.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-amber-950">
                          New Customer Accounts Awaiting Assignment ({unassignedCustomers.length})
                        </h3>
                        <p className="text-[11px] text-amber-800">
                          Assign each newly created customer account to the Sub Admin account it will belong to.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubAdminFilter('unassigned');
                        setActiveSection('customers');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold cursor-pointer transition-colors self-start sm:self-auto"
                    >
                      View in Customers
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {unassignedCustomers.map((cust) => {
                      const selectedSubId = quickAssignSelection[cust.uid] || subAdmins[0]?.uid || '';
                      const isAssigning = assigningCustomerId === cust.uid;
                      return (
                        <div
                          key={cust.uid}
                          className="bg-white rounded-xl border border-amber-200 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-black text-xs text-gray-900">{cust.fullName}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                Awaiting Assignment
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 truncate">
                              {cust.email} • {cust.country || 'International'}
                              {cust.createdAt && ` • Joined ${new Date(cust.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                            {subAdmins.length > 0 ? (
                              <>
                                <select
                                  value={selectedSubId}
                                  onChange={(e) =>
                                    setQuickAssignSelection((prev) => ({
                                      ...prev,
                                      [cust.uid]: e.target.value
                                    }))
                                  }
                                  className="px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                  {subAdmins.map((s) => (
                                    <option key={s.uid} value={s.uid}>
                                      {s.fullName} ({s.email})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={isAssigning || !selectedSubId}
                                  onClick={() => handleQuickAssignCustomer(cust, selectedSubId)}
                                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer transition-colors shadow-xs inline-flex items-center justify-center space-x-1.5"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>{isAssigning ? 'Assigning...' : 'Assign to Sub Admin'}</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] font-bold text-red-600">
                                Create a Sub Admin account first to assign
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                      <th className="py-3 px-4">Edit Written Messages</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subAdmins.map((sub) => {
                      const assignedCusts = customers.filter(c => c.assignedSubAdminId === sub.uid);
                      const canEditOwn =
                        sub.canEditOwnMessages !== undefined
                          ? sub.canEditOwnMessages === true
                          : Boolean(settings?.subAdminCanEditOwnMessages);

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
                            <button
                              type="button"
                              onClick={() => handleToggleSingleSubAdminEdit(sub)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer inline-flex items-center space-x-1.5 border ${
                                canEditOwn
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Allow this Sub Admin to silently edit messages they already wrote (remains like never edited)"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${canEditOwn ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{canEditOwn ? 'Silent Edit: ON' : 'Silent Edit: OFF'}</span>
                            </button>
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
                              onClick={() => handleOpenEditUser(sub)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer inline-flex items-center space-x-1 transition-colors"
                              title="Edit Sub Admin details and set password"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit & Password</span>
                            </button>
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

          {/* SECTION 2B: SUB-ADMIN SILENT MESSAGE EDIT CONTROL */}
          {activeSection === 'subadmin_edit' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">
                      Sub-Admin Silent Message Edit Control
                    </h2>
                    <p className="text-xs text-gray-500">
                      Allow Sub-Admins to edit messages they have already written. After saving, the message updates silently and remains like it was never edited.
                    </p>
                  </div>
                </div>
              </div>

              {/* Master Switch Banner */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-gradient-to-r from-[#0b132b] to-[#1c2541] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${settings?.subAdminCanEditOwnMessages ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <h3 className="font-extrabold text-sm sm:text-base">
                      Master Control: All Sub-Admins Can Edit Written Messages
                    </h3>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
                    When turned <strong className="text-emerald-300">ON</strong>, Sub-Admins see an <strong>Edit Message</strong> button on messages they already sent. Once saved, the message updates directly with <strong>no &ldquo;Edited&rdquo; tag, no edit history badge, and the exact original timestamp</strong> — remaining like it was never edited.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAllSubAdminEdit}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide shadow-md transition-all cursor-pointer shrink-0 self-start md:self-auto ${
                    settings?.subAdminCanEditOwnMessages
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-slate-200 hover:bg-white text-slate-900'
                  }`}
                >
                  {settings?.subAdminCanEditOwnMessages ? 'ALL SUB-ADMINS: ON (Turn OFF)' : 'ALL SUB-ADMINS: OFF (Turn ON)'}
                </button>
              </div>

              {/* Individual Sub-Admin Accounts — Select Any Sub-Admin to View & Edit Their Customer Chats Underneath */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-sm font-extrabold text-gray-900">
                    Individual Sub-Admin Access &amp; Customer Chats ({subAdmins.length})
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Select any Sub-Admin account below to view their customer message chats underneath
                  </span>
                </div>

                {subAdmins.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-gray-200 text-xs text-gray-500">
                    No Sub-Admin accounts found. Create a Sub-Admin account first to assign message edit access.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subAdmins.map((sub) => {
                      const subCustomerChats = getCustomerChatsForSubAdmin(sub);
                      const isEnabled =
                        sub.canEditOwnMessages !== undefined
                          ? sub.canEditOwnMessages === true
                          : Boolean(settings?.subAdminCanEditOwnMessages);
                      const isExpanded = selectedEditSubAdminId === sub.uid;

                      return (
                        <div
                          key={sub.uid}
                          className={`border rounded-2xl overflow-hidden transition-all ${
                            isExpanded
                              ? 'border-blue-400 shadow-sm ring-2 ring-blue-100'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Sub-Admin Account Header Row (Selectable) */}
                          <div
                            onClick={() => {
                              if (isExpanded) {
                                setSelectedEditSubAdminId(null);
                                setSelectedSilentEditConv(null);
                              } else {
                                setSelectedEditSubAdminId(sub.uid);
                                setSelectedSilentEditConv(null);
                              }
                            }}
                            className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isExpanded ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-sm text-gray-900 truncate">
                                  {sub.fullName}
                                </div>
                                <div className="text-[11px] text-gray-500 font-mono truncate">
                                  {sub.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px] inline-flex items-center space-x-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>
                                  {subCustomerChats.length} Customer Chat{subCustomerChats.length !== 1 ? 's' : ''}
                                </span>
                              </span>

                              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                isEnabled
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                <span>{isEnabled ? 'ALLOWED' : 'DISABLED'}</span>
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSingleSubAdminEdit(sub);
                                }}
                                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs ${
                                  isEnabled
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {isEnabled ? 'Turn OFF' : 'Turn ON'}
                              </button>
                            </div>
                          </div>

                          {/* Customer Message Chats Directly Under This Selected Sub-Admin Account */}
                          {isExpanded && (
                            <div className="border-t border-blue-200/80 bg-slate-50/70 p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-extrabold text-gray-800 flex items-center space-x-2">
                                  <Users className="w-4 h-4 text-blue-600" />
                                  <span>Customer Message Chats Under {sub.fullName}</span>
                                </div>
                                <span className="text-[11px] text-gray-500">
                                  Select a customer to view messages &amp; edit Sub-Admin messages silently
                                </span>
                              </div>

                              {subCustomerChats.length === 0 ? (
                                <div className="p-6 text-center rounded-xl bg-white border border-dashed border-gray-200 text-xs text-gray-500">
                                  No customers are currently assigned to {sub.fullName}.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {subCustomerChats.map((entry) => {
                                    const isChatSelected =
                                      selectedSilentEditConv &&
                                      (selectedSilentEditConv.customerId === entry.customerId ||
                                        (entry.conversation && selectedSilentEditConv.id === entry.conversation.id));

                                    return (
                                      <div
                                        key={entry.customerId}
                                        className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                                          isChatSelected
                                            ? 'bg-blue-50 border-blue-400 shadow-xs'
                                            : 'bg-white border-gray-200 hover:border-blue-300'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="font-extrabold text-xs text-gray-900 truncate">
                                              {entry.customerName}
                                            </div>
                                            <div className="text-[11px] text-gray-500 font-mono truncate">
                                              {entry.customerEmail}
                                            </div>
                                          </div>
                                          {entry.lastMessageTime && (
                                            <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                              {new Date(entry.lastMessageTime).toLocaleDateString([], {
                                                month: 'short',
                                                day: 'numeric'
                                              })}{' '}
                                              {new Date(entry.lastMessageTime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-[11px] text-gray-600 line-clamp-1 italic bg-slate-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                          {entry.lastMessage ? `"${entry.lastMessage}"` : 'No messages yet'}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSelectCustomerChatUnderSubAdmin(sub, entry, 'silent_edit')
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold inline-flex items-center space-x-1.5 cursor-pointer transition-colors ${
                                              isChatSelected
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            }`}
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                            <span>{isChatSelected ? 'Viewing Chat Below' : 'View & Silent Edit'}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSelectCustomerChatUnderSubAdmin(sub, entry, 'full')
                                            }
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center space-x-1 cursor-pointer transition-colors"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>Open Full Chat</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Inline Live Chat Thread Under This Sub-Admin Account for Direct Silent Editing & Old Message Comparison */}
                              {selectedSilentEditConv && (() => {
                                const silentlyEditedCount = silentEditMessages.filter(
                                  (m) =>
                                    (m.silentEditHistory && m.silentEditHistory.length > 0) ||
                                    Boolean(m.silentOriginalText && m.silentOriginalText !== m.text)
                                ).length;
                                const displayedSilentMessages = silentEditFilterOnly
                                  ? silentEditMessages.filter(
                                      (m) =>
                                        (m.silentEditHistory && m.silentEditHistory.length > 0) ||
                                        Boolean(m.silentOriginalText && m.silentOriginalText !== m.text)
                                    )
                                  : silentEditMessages;

                                return (
                                  <div className="mt-3 bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-xs">
                                    <div className="px-4 py-3 bg-[#0b132b] text-white flex flex-wrap items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="text-xs font-extrabold flex items-center space-x-2">
                                          <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                                          <span className="truncate">
                                            Chat: {selectedSilentEditConv.customerName} ↔ {sub.fullName}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-gray-300 mt-0.5">
                                          Old messages before silent edits appear on the left side (Super Admin only). Customer &amp; Sub-Admin only see the live message on the right.
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="inline-flex rounded-lg bg-white/10 p-0.5 text-[10px] font-extrabold">
                                          <button
                                            type="button"
                                            onClick={() => setSilentEditFilterOnly(false)}
                                            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                                              !silentEditFilterOnly
                                                ? 'bg-white text-slate-950'
                                                : 'text-gray-200 hover:text-white'
                                            }`}
                                          >
                                            All ({silentEditMessages.length})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setSilentEditFilterOnly(true)}
                                            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                                              silentEditFilterOnly
                                                ? 'bg-amber-400 text-slate-950'
                                                : 'text-amber-300 hover:text-amber-200'
                                            }`}
                                          >
                                            Old / Edited ({silentlyEditedCount})
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setActiveChatConversation(selectedSilentEditConv)}
                                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer"
                                        >
                                          Open Full Chat
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedSilentEditConv(null);
                                            setInlineEditingMsgId(null);
                                            setSilentEditFilterOnly(false);
                                          }}
                                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 cursor-pointer"
                                          title="Close chat preview"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="p-4 max-h-[620px] overflow-y-auto space-y-3.5 bg-slate-50">
                                      {displayedSilentMessages.length === 0 ? (
                                        <div className="text-center py-8 text-xs text-gray-400">
                                          {silentEditFilterOnly
                                            ? 'No silently edited messages in this chat yet. Once a Sub-Admin message is edited silently, its old version will appear here side-by-side.'
                                            : 'No messages in this chat yet.'}
                                        </div>
                                      ) : (
                                        displayedSilentMessages.map((msg) => {
                                          const isCustomerMsg = msg.senderRole === 'customer';
                                          const isSubAdminMsg = msg.senderRole === 'sub_admin';
                                          const isEditingThis = inlineEditingMsgId === msg.id;
                                          const history = msg.silentEditHistory || [];
                                          const hasOldSilentMessage =
                                            history.length > 0 ||
                                            Boolean(msg.silentOriginalText && msg.silentOriginalText !== msg.text);
                                          const oldestText = msg.silentOriginalText || history[0]?.previousText || '';

                                          // Side-by-side layout whenever a message was silently edited:
                                          // LEFT = Old Message Before Silent Edit | RIGHT = Current Live Message (Shown as Never Edited)
                                          if (hasOldSilentMessage) {
                                            return (
                                              <div
                                                key={msg.id}
                                                className="p-3 rounded-2xl bg-white border border-amber-200/90 shadow-2xs space-y-2"
                                              >
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-gray-500 px-0.5">
                                                  <div className="flex items-center space-x-2">
                                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black uppercase tracking-wider">
                                                      Silently Edited ({history.length || 1}x)
                                                    </span>
                                                    <span className="text-gray-700">
                                                      {isSubAdminMsg ? `${sub.fullName} (Sub-Admin)` : msg.senderName}
                                                    </span>
                                                  </div>
                                                  <span className="font-mono text-gray-400">
                                                    Original sent:{' '}
                                                    {new Date(msg.createdAt).toLocaleString([], {
                                                      month: 'short',
                                                      day: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                    })}
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                                                  {/* LEFT SIDE: Old Message Before Silent Edit */}
                                                  <div className="rounded-2xl p-3.5 bg-amber-50 border border-amber-300 text-amber-950 space-y-2.5">
                                                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-200/90">
                                                      <div className="flex items-center space-x-1.5">
                                                        <History className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                                                          Old Message (Before Silent Edit)
                                                        </span>
                                                      </div>
                                                      {msg.lastSilentEditedAt && (
                                                        <span className="text-[10px] font-mono text-amber-700 shrink-0">
                                                          {new Date(msg.lastSilentEditedAt).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                          })}
                                                        </span>
                                                      )}
                                                    </div>

                                                    <div className="text-xs leading-relaxed whitespace-pre-wrap break-words bg-white p-3 rounded-xl border border-amber-200 text-gray-900 font-medium">
                                                      {oldestText}
                                                    </div>

                                                    {history.length > 1 && (
                                                      <div className="space-y-1.5 pt-1 border-t border-amber-200/80">
                                                        <div className="text-[10px] font-extrabold text-amber-900">
                                                          Additional Earlier Versions ({history.length - 1}):
                                                        </div>
                                                        {history.slice(1).map((rev, revIdx) => (
                                                          <div
                                                            key={`${msg.id}_hist_${revIdx}`}
                                                            className="p-2 rounded-lg bg-white/90 border border-amber-200 text-[11px] space-y-1"
                                                          >
                                                            <div className="flex items-center justify-between text-[10px] text-amber-700 font-mono">
                                                              <span>Version #{revIdx + 2} ({rev.editedBy || 'Admin'})</span>
                                                              <span>
                                                                {new Date(rev.editedAt).toLocaleString([], {
                                                                  month: 'short',
                                                                  day: 'numeric',
                                                                  hour: '2-digit',
                                                                  minute: '2-digit'
                                                                })}
                                                              </span>
                                                            </div>
                                                            <div className="whitespace-pre-wrap break-words text-gray-800">
                                                              {rev.previousText}
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}

                                                    {isSubAdminMsg && oldestText && oldestText !== msg.text && (
                                                      <div className="flex justify-end pt-0.5">
                                                        <button
                                                          type="button"
                                                          disabled={savingInlineSilentEdit}
                                                          onClick={() => handleRestoreOldSilentMessage(msg.id, oldestText)}
                                                          className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 text-[10px] font-black cursor-pointer transition-colors disabled:opacity-50"
                                                        >
                                                          Restore Old Message Silently
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* RIGHT SIDE: Current Live Message (Shown to Customer & Sub-Admin as Never Edited) */}
                                                  <div className="rounded-2xl p-3.5 bg-blue-600 text-white space-y-2.5">
                                                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/20">
                                                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">
                                                        Current Live Message (Never-Edited View)
                                                      </span>
                                                      <span className="text-[10px] font-mono text-blue-200">
                                                        Live Now
                                                      </span>
                                                    </div>

                                                    {isEditingThis ? (
                                                      <div className="space-y-3 w-full">
                                                        <textarea
                                                          rows={7}
                                                          value={inlineEditDraft}
                                                          onChange={(e) => setInlineEditDraft(e.target.value)}
                                                          className="w-full min-h-[165px] p-3.5 rounded-xl bg-white text-gray-900 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
                                                        />
                                                        <div className="flex items-center justify-end space-x-2.5">
                                                          <button
                                                            type="button"
                                                            disabled={savingInlineSilentEdit}
                                                            onClick={() => {
                                                              setInlineEditingMsgId(null);
                                                              setInlineEditDraft('');
                                                            }}
                                                            className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold cursor-pointer"
                                                          >
                                                            Cancel
                                                          </button>
                                                          <button
                                                            type="button"
                                                            disabled={savingInlineSilentEdit || !inlineEditDraft.trim()}
                                                            onClick={() => handleSaveInlineSilentEdit(msg.id)}
                                                            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer disabled:opacity-50"
                                                          >
                                                            {savingInlineSilentEdit ? 'Saving...' : 'Save Silently'}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <>
                                                        {msg.text && (
                                                          <div className="text-xs whitespace-pre-wrap break-words leading-relaxed">
                                                            {msg.text}
                                                          </div>
                                                        )}
                                                        {msg.attachmentUrl && (
                                                          <div className="text-[11px] italic opacity-90">
                                                            [Attachment: {msg.attachmentName || msg.attachmentType || 'Media'}]
                                                          </div>
                                                        )}
                                                        {isSubAdminMsg && (
                                                          <div className="pt-1 border-t border-white/20 flex justify-end">
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                setInlineEditingMsgId(msg.id);
                                                                setInlineEditDraft(msg.originalText || msg.text || '');
                                                              }}
                                                              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-extrabold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                                                            >
                                                              <Edit className="w-3 h-3" />
                                                              <span>Edit Silently</span>
                                                            </button>
                                                          </div>
                                                        )}
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div
                                              key={msg.id}
                                              className={`flex flex-col ${isCustomerMsg ? 'items-start' : 'items-end'}`}
                                            >
                                              <div className="text-[10px] font-bold text-gray-500 mb-0.5 px-1 flex items-center space-x-1.5">
                                                <span>
                                                  {isCustomerMsg
                                                    ? msg.senderName || selectedSilentEditConv.customerName
                                                    : isSubAdminMsg
                                                    ? `${sub.fullName} (Sub-Admin)`
                                                    : 'Super Admin'}
                                                </span>
                                                <span className="font-mono text-gray-400">
                                                  {new Date(msg.createdAt).toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                  })}
                                                </span>
                                              </div>

                                              <div
                                                className={`${
                                                  isEditingThis
                                                    ? 'w-full sm:w-[92%] max-w-2xl px-4 py-3.5'
                                                    : 'max-w-[90%] sm:max-w-[78%] px-3.5 py-2.5'
                                                } rounded-2xl text-xs space-y-2.5 ${
                                                  isCustomerMsg
                                                    ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                                    : 'bg-blue-600 text-white rounded-tr-none'
                                                }`}
                                              >
                                                {isEditingThis ? (
                                                  <div className="space-y-3 w-full">
                                                    <textarea
                                                      rows={7}
                                                      value={inlineEditDraft}
                                                      onChange={(e) => setInlineEditDraft(e.target.value)}
                                                      className="w-full min-h-[165px] p-3.5 rounded-xl bg-white text-gray-900 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
                                                    />
                                                    <div className="flex items-center justify-end space-x-2.5">
                                                      <button
                                                        type="button"
                                                        disabled={savingInlineSilentEdit}
                                                        onClick={() => {
                                                          setInlineEditingMsgId(null);
                                                          setInlineEditDraft('');
                                                        }}
                                                        className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold cursor-pointer"
                                                      >
                                                        Cancel
                                                      </button>
                                                      <button
                                                        type="button"
                                                        disabled={savingInlineSilentEdit || !inlineEditDraft.trim()}
                                                        onClick={() => handleSaveInlineSilentEdit(msg.id)}
                                                        className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer disabled:opacity-50"
                                                      >
                                                        {savingInlineSilentEdit ? 'Saving...' : 'Save Silently'}
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>
                                                    {msg.text && (
                                                      <div className="whitespace-pre-wrap break-words leading-relaxed">
                                                        {msg.text}
                                                      </div>
                                                    )}
                                                    {msg.attachmentUrl && (
                                                      <div className="text-[11px] italic opacity-90">
                                                        [Attachment: {msg.attachmentName || msg.attachmentType || 'Media'}]
                                                      </div>
                                                    )}
                                                    {isSubAdminMsg && (
                                                      <div className="pt-1 border-t border-white/20 flex justify-end">
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            setInlineEditingMsgId(msg.id);
                                                            setInlineEditDraft(msg.originalText || msg.text || '');
                                                          }}
                                                          className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-extrabold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                                                        >
                                                          <Edit className="w-3 h-3" />
                                                          <span>Edit Silently</span>
                                                        </button>
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: CUSTOMERS & TRANSFERS */}
          {activeSection === 'customers' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5 animate-fadeIn">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h2 className="text-lg font-black text-gray-900">Customer Roster & Dispatch Assignment</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                      {customers.length} Total Created
                    </span>
                    {unassignedCustomers.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                        {unassignedCustomers.length} Awaiting Assignment
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Every created customer account appears here in real time. Click Assign to place each customer under a Sub Admin account.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Search customer name or email..."
                      className="pl-8 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
                    />
                  </div>
                  <select
                    value={selectedSubAdminFilter}
                    onChange={(e) => setSelectedSubAdminFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                  >
                    <option value="all">All Created Customers ({customers.length})</option>
                    <option value="unassigned">
                      Unassigned — Awaiting Assignment ({unassignedCustomers.length})
                    </option>
                    {subAdmins.map((s) => (
                      <option key={s.uid} value={s.uid}>
                        Belongs to: {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Table — ALL Created Customer Accounts Listed Here (Unassigned & Newest First) */}
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
                    {(() => {
                      const q = customerSearchQuery.trim().toLowerCase();
                      const filteredCustomers = customers
                        .filter((c) => {
                          if (selectedSubAdminFilter === 'unassigned') {
                            if (!isCustomerUnassigned(c)) return false;
                          } else if (selectedSubAdminFilter !== 'all') {
                            if (c.assignedSubAdminId !== selectedSubAdminFilter) return false;
                          }
                          if (q) {
                            const hay = `${c.fullName || ''} ${c.email || ''} ${c.phoneNumber || c.phone || ''} ${c.country || ''} ${c.address || ''}`.toLowerCase();
                            if (!hay.includes(q)) return false;
                          }
                          return true;
                        })
                        .sort((a, b) => {
                          const aUn = isCustomerUnassigned(a);
                          const bUn = isCustomerUnassigned(b);
                          if (aUn !== bUn) return aUn ? -1 : 1;
                          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                          return tB - tA;
                        });

                      if (filteredCustomers.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="py-10 px-4 text-center text-gray-500 font-medium">
                              No customer accounts match the current filter.
                            </td>
                          </tr>
                        );
                      }

                      return filteredCustomers.map((cust) => {
                        const custShipments = shipments.filter(s => s.customerId === cust.uid);
                        const custDevices = allCustomerDeviceLogins.filter(d => d.customerId === cust.uid);
                        const latestDevice = custDevices[0];
                        const isUnassigned = isCustomerUnassigned(cust);

                        return (
                          <tr
                            key={cust.uid}
                            className={`transition-colors ${
                              isUnassigned ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className="font-bold text-gray-900">{cust.fullName}</span>
                                {isUsaOnlyRestrictedAccount(cust) && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                    USA Only Login
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-500 text-[11px]">{cust.email}</div>
                              <div className="text-gray-400 text-[10px]">
                                {cust.phoneNumber || cust.phone || 'No phone'}
                                {cust.createdAt && (
                                  <span>
                                    {' '}• Created {new Date(cust.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              {latestDevice && (
                                <button
                                  type="button"
                                  onClick={() => setDeviceHistoryCustomer(cust)}
                                  className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold cursor-pointer transition-colors max-w-[260px]"
                                  title="View all devices that logged into this customer account"
                                >
                                  <Smartphone className="w-3 h-3 shrink-0 text-indigo-600" />
                                  <span className="truncate">{latestDevice.deviceName}</span>
                                  <span className="text-indigo-500 shrink-0">• {formatHoursAgoLabel(latestDevice.loggedInAt)}</span>
                                </button>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-gray-800">{cust.country || 'Not specified'}</div>
                              <div className="text-gray-500 text-[11px] truncate max-w-[180px]">{cust.address || '—'}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              {isUnassigned ? (
                                <span className="font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg text-[11px] inline-flex items-center space-x-1.5 shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span>Awaiting Super Admin Assignment</span>
                                </span>
                              ) : (
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg text-xs">
                                  {cust.assignedSubAdminName?.replace(/\s*\(Regional Dispatch Lead\)/gi, '') || 'Sub Admin Station'}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-gray-700">
                                {custShipments.length} Cargo Consignment(s)
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end flex-wrap gap-1.5">
                                {/* 0. Device Login History (All devices + hours-ago search) */}
                                <button
                                  type="button"
                                  onClick={() => setDeviceHistoryCustomer(cust)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 cursor-pointer inline-flex items-center space-x-1 transition-colors"
                                  title="View all devices that have logged into this customer account, date/time, and search by hours ago"
                                >
                                  <Smartphone className="w-3 h-3 text-indigo-600" />
                                  <span>Devices ({custDevices.length})</span>
                                </button>

                                {/* 1. Change Password (Quick Reset) */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomerPasswordModal(cust)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 cursor-pointer inline-flex items-center space-x-1 transition-colors"
                                  title="Change and update customer login password"
                                >
                                  <Key className="w-3 h-3 text-amber-600" />
                                  <span>Change Password</span>
                                </button>

                                {/* 2. Edit & Pass */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(cust)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer inline-flex items-center space-x-1 transition-colors"
                                  title="Edit Customer profile and set password"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>

                                {/* 3. Suspend / Reactivate */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspension(cust)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                                    cust.isSuspended
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                                  }`}
                                  title={cust.isSuspended ? 'Reactivate customer account' : 'Suspend customer account'}
                                >
                                  {cust.isSuspended ? 'Reactivate' : 'Suspend'}
                                </button>

                                {/* 4. Delete Customer Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(cust)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 cursor-pointer inline-flex items-center space-x-1 transition-colors"
                                  title="Permanently Delete Customer Account"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                  <span>Delete</span>
                                </button>

                                {/* 5. Assign / Transfer */}
                                {isUnassigned ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowTransferModal(cust);
                                      setTransferTargetSubAdmin(subAdmins[0]?.uid || '');
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer inline-flex items-center space-x-1 shadow-xs transition-colors"
                                    title="Assign this customer account to a Sub Admin"
                                  >
                                    <UserPlus className="w-3 h-3" />
                                    <span>Assign Sub Admin</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowTransferModal(cust);
                                      setTransferTargetSubAdmin(cust.assignedSubAdminId || subAdmins[0]?.uid || '');
                                    }}
                                    className="px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer inline-flex items-center space-x-1 transition-colors"
                                    title="Transfer to another Sub Admin"
                                  >
                                    <ArrowRightLeft className="w-3 h-3" />
                                    <span>Transfer</span>
                                  </button>
                                )}

                                {/* 6. Chat */}
                                <button
                                  type="button"
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
                                        setActiveSection('messages');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      showToast('Could not initialize conversation channel.', 'error');
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-gray-700 hover:bg-slate-200 border border-gray-200 cursor-pointer transition-colors inline-flex items-center space-x-1"
                                  title="Open live chat with customer"
                                >
                                  <MessageSquare className="w-3 h-3 text-gray-500" />
                                  <span>Chat</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
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
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black text-gray-900">Consignments Global Oversight</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                      Managed Exclusively by Sub-Admins
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Global view of active deliveries. Delivery creation, package photos, live movement adjustments, and itemized fee assessments are strictly operated by assigned Sub-Admin dispatchers.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-gray-700 text-xs font-bold font-mono">
                    Total: {shipments.length} Consignment(s)
                  </span>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-start space-x-3 text-xs text-blue-950">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-extrabold text-blue-900 block">Strict Separation of Capabilities:</strong>
                  <p className="text-blue-800">
                    Only Sub-Admins have Delivery Tracking & Management capabilities: creating deliveries, uploading multiple package product images, scrolling movement progress % to any level, entering actual location names, and adding itemized fees with payment purposes. Super Admin maintains customer assignment, dispatcher allocation, and message moderation.
                  </p>
                </div>
              </div>

              {/* Shipments Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-gray-500 uppercase tracking-wider text-[10px] border-y border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Waybill # & Carrier</th>
                      <th className="py-3 px-4">Consignee Customer</th>
                      <th className="py-3 px-4">Assigned Sub-Admin Dispatcher</th>
                      <th className="py-3 px-4">Corridor (Origin → Dest)</th>
                      <th className="py-3 px-4">Status & Movement</th>
                      <th className="py-3 px-4">Itemized Charges</th>
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
                          <div className="text-gray-400 text-[10px]">{s.customerEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {s.subAdminName || 'Assigned Sub-Admin'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          <div>{s.departureLocation}</div>
                          <div className="text-[11px] text-blue-600 font-semibold">→ {s.destinationLocation}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800">
                              {s.status.replace(/_/g, ' ')}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-gray-700">
                              {s.deliveryProgressPercentage ?? 35}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-amber-600 font-mono">
                            {s.customsDutyCurrency || 'USD'} {s.customsDutyAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                            s.customsPaymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.customsPaymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => setTrackingPreviewCode(s.trackingNumber)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer inline-flex items-center space-x-1"
                            title="Preview Customer Live Tracking Card"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Card</span>
                          </button>
                          <button
                            onClick={() => handleDeleteShipment(s)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete Consignment Record"
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

          {/* SECTION 5: MESSAGE APPROVAL & ACCESS QUEUE */}
          {activeSection === 'moderation' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span>Message Approval &amp; Access Queue</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Every message a Sub-Admin sends to a Customer waits here for Super Admin approval before the customer can receive it, along with held customer photos and receipts.
                  </p>
                </div>
                <div className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                  {pendingMessages.length} Awaiting Approval
                </div>
              </div>

              {pendingMessages.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-800">Queue is Clear</h4>
                  <p className="text-xs text-gray-500">
                    No Sub-Admin messages or customer photos/receipts are currently waiting for Super Admin approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingMessages.map((msg) => {
                    const matchedConv = conversations.find(c => c.id === msg.conversationId);
                    const isSubAdminOutgoing = msg.senderRole === 'sub_admin';
                    const subAdminSender = isSubAdminOutgoing
                      ? subAdmins.find(s => s.uid === msg.senderId || (msg.senderEmail && (s.email || '').toLowerCase() === msg.senderEmail.toLowerCase()))
                      : null;
                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border ${
                          isSubAdminOutgoing
                            ? 'bg-blue-50/60 border-blue-200'
                            : 'bg-slate-50 border-amber-200/80'
                        }`}
                      >
                        <div className="space-y-2 flex-1 min-w-0 w-full">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-sm text-gray-900">
                              {isSubAdminOutgoing
                                ? (subAdminSender?.fullName || msg.senderEmail || msg.senderName || 'Sub-Admin')
                                : msg.senderName}
                            </span>
                            {isSubAdminOutgoing ? (
                              <>
                                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-blue-600 text-white">
                                  Sub-Admin → Customer
                                </span>
                                {matchedConv && (
                                  <span className="text-[11px] font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                                    To Customer: {matchedConv.customerName}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Customer → Sub-Admin
                              </span>
                            )}
                            {msg.attachmentUrl && (
                              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                {msg.attachmentType === 'image' ? 'Photo / Receipt' : msg.attachmentType === 'document' ? 'Receipt / Document' : 'Media Attachment'}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 font-mono">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {msg.text && (
                            <p className="text-xs text-gray-800 bg-white p-3 rounded-xl border border-gray-200 whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                          )}

                          {msg.attachmentUrl && (() => {
                            const renderAsImg = isImageAttachment(
                              msg.attachmentUrl,
                              msg.attachmentType,
                              msg.attachmentName
                            );
                            const downloadName =
                              msg.attachmentName ||
                              (renderAsImg ? 'attachment_photo.jpg' : 'attachment_document.pdf');

                            return (
                              <div className="bg-white p-2.5 rounded-xl border border-gray-200 space-y-2">
                                {renderAsImg ? (
                                  <div className="space-y-2">
                                    <img
                                      src={msg.attachmentUrl}
                                      alt={msg.attachmentName || 'Uploaded photo or receipt'}
                                      className="max-h-60 rounded-lg object-contain border border-gray-100 bg-slate-50"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => downloadAttachmentFile(msg.attachmentUrl!, downloadName)}
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5 shrink-0" />
                                      <span>Download Photo / Receipt</span>
                                    </button>
                                  </div>
                                ) : msg.attachmentType === 'video' ? (
                                  <video
                                    src={msg.attachmentUrl}
                                    controls
                                    className="max-h-56 rounded-lg bg-black"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => downloadAttachmentFile(msg.attachmentUrl!, downloadName)}
                                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 cursor-pointer"
                                  >
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{msg.attachmentName || 'Download Receipt Document'}</span>
                                    <Download className="w-3.5 h-3.5 shrink-0" />
                                  </button>
                                )}
                                <div className="text-[11px] text-gray-500 font-medium truncate">
                                  File: {msg.attachmentName || 'Uploaded Media'}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveMessage(msg)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {isSubAdminOutgoing ? 'Approve & Send to Customer' : 'Give Access to Sub-Admin'}
                            </span>
                          </button>
                          {matchedConv && (
                            <button
                              type="button"
                              onClick={() => setActiveChatConversation(matchedConv)}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              Open Chat
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRejectMessage(msg)}
                            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Block</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: ALL MESSAGING CHANNELS — GROUPED UNDER EACH SELECTABLE SUB-ADMIN ACCOUNT */}
          {activeSection === 'messages' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Live Customer Communications</h2>
                  <p className="text-xs text-gray-500">
                    Select any Sub-Admin account below to view and open their customer message chats.
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full self-start sm:self-auto">
                  {subAdmins.length} Sub-Admin{subAdmins.length !== 1 ? 's' : ''} • {conversations.length} Active Chat{conversations.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {subAdmins.map((sub) => {
                  const subChats = getCustomerChatsForSubAdmin(sub);
                  const isSelected = selectedChannelSubAdminId === sub.uid;

                  return (
                    <div
                      key={sub.uid}
                      className={`border rounded-2xl overflow-hidden transition-all ${
                        isSelected
                          ? 'border-blue-400 shadow-sm ring-2 ring-blue-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedChannelSubAdminId(isSelected ? null : sub.uid)}
                        className={`w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isSelected ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm text-gray-900 truncate">
                              {sub.fullName}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono truncate">
                              {sub.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-extrabold text-xs inline-flex items-center space-x-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>
                              {subChats.length} Customer Chat{subChats.length !== 1 ? 's' : ''}
                            </span>
                          </span>
                          <span className="text-xs font-bold text-blue-600">
                            {isSelected ? 'Hide Chats' : 'Select'}
                          </span>
                        </div>
                      </button>

                      {isSelected && (
                        <div className="border-t border-blue-200/80 bg-slate-50/70 p-4">
                          {subChats.length === 0 ? (
                            <div className="p-6 text-center rounded-xl bg-white border border-dashed border-gray-200 text-xs text-gray-500">
                              No customer message chats under {sub.fullName} yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {subChats.map((entry) => (
                                <div
                                  key={entry.customerId}
                                  onClick={() => handleSelectCustomerChatUnderSubAdmin(sub, entry, 'full')}
                                  className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 cursor-pointer transition-all space-y-2 group shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="font-bold text-sm text-gray-900 group-hover:text-blue-600 truncate">
                                        {entry.customerName}
                                      </div>
                                      <div className="text-[11px] text-gray-500 font-mono truncate">
                                        {entry.customerEmail}
                                      </div>
                                    </div>
                                    {entry.lastMessageTime && (
                                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                        {new Date(entry.lastMessageTime).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 line-clamp-1 italic bg-slate-50 p-2 rounded-lg border border-gray-100">
                                    {entry.lastMessage ? `"${entry.lastMessage}"` : 'No messages yet — click to start chat'}
                                  </p>
                                  <div className="text-[11px] font-bold text-blue-600 pt-0.5 flex items-center space-x-1">
                                    <span>Open Chat with {entry.customerName}</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned / Other Chats if any exist outside current Sub-Admin IDs */}
                {(() => {
                  const assignedSubIds = new Set(subAdmins.map((s) => s.uid));
                  const assignedSubNames = new Set(subAdmins.map((s) => (s.fullName || '').trim().toLowerCase()));
                  const unassignedConvs = conversations.filter(
                    (c) =>
                      !assignedSubIds.has(c.subAdminId) &&
                      !assignedSubNames.has((c.subAdminName || '').trim().toLowerCase())
                  );
                  if (unassignedConvs.length === 0) return null;
                  const isUnassignedOpen = selectedChannelSubAdminId === '__unassigned__';
                  return (
                    <div className="border border-amber-200 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedChannelSubAdminId(isUnassignedOpen ? null : '__unassigned__')
                        }
                        className="w-full p-4 bg-amber-50/70 hover:bg-amber-50 flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            {isUnassignedOpen ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-amber-950">
                              Unassigned / Other Customer Chats
                            </div>
                            <div className="text-[11px] text-amber-700">
                              Conversations not yet linked to an active Sub-Admin
                            </div>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-950 font-extrabold text-xs">
                          {unassignedConvs.length} Chat{unassignedConvs.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                      {isUnassignedOpen && (
                        <div className="p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-amber-200">
                          {unassignedConvs.map((conv) => (
                            <div
                              key={conv.id}
                              onClick={() => setActiveChatConversation(conv)}
                              className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 cursor-pointer space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-gray-900">{conv.customerName}</span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-1 italic bg-slate-50 p-2 rounded-lg border border-gray-100">
                                &quot;{conv.lastMessage}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
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

              {/* Super Admin Security & Credentials Settings */}
              <div className="bg-gradient-to-r from-slate-900 to-[#1c2541] text-white p-6 rounded-3xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-700/60">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400 text-gray-950 flex items-center justify-center font-black shadow-md shrink-0">
                      <Key className="w-5 h-5 text-gray-950" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Super Admin Security & Profile Control</h3>
                      <p className="text-xs text-gray-300">
                        Update administrative credentials, change master password, and edit command center details.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 w-fit">
                    Full Administrative Authority
                  </span>
                </div>

                {/* Status Alert if present */}
                {securityStatusMsg && (
                  <div className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
                    securityStatusMsg.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    {securityStatusMsg.type === 'success' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{securityStatusMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Change Password */}
                  <div className="bg-[#12192e] p-5 rounded-2xl border border-gray-700/60 space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-800">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-extrabold text-white">Change Administrative Password</h4>
                    </div>

                    <form onSubmit={handleChangeAdminPassword} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-300 mb-1">
                          New Security Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showAdminPassText ? "text" : "password"}
                            required
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            placeholder="Enter minimum 6 characters"
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassText(!showAdminPassText)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showAdminPassText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-300 mb-1">
                          Confirm New Password *
                        </label>
                        <input
                          type={showAdminPassText ? "text" : "password"}
                          required
                          value={confirmAdminPassword}
                          onChange={(e) => setConfirmAdminPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSavingSecurity}
                          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                        >
                          <Key className="w-4 h-4 text-gray-950" />
                          <span>{isSavingSecurity ? 'Updating Password...' : 'Save New Password'}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 text-center">
                        Upon saving, this password takes effect immediately for all subsequent sign-ins.
                      </p>
                    </form>
                  </div>

                  {/* Right Column: Edit Profile */}
                  <div className="bg-[#12192e] p-5 rounded-2xl border border-gray-700/60 space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-gray-800">
                      <UserCog className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-extrabold text-white">Edit Administrator Profile</h4>
                    </div>

                    <form onSubmit={handleSaveAdminProfile} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-300 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminProfileForm.fullName}
                          onChange={(e) => setAdminProfileForm({ ...adminProfileForm, fullName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-gray-300 mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={adminProfileForm.email}
                            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, email: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={adminProfileForm.phoneNumber}
                            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, phoneNumber: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-gray-300 mb-1">
                            City & Hub
                          </label>
                          <input
                            type="text"
                            value={adminProfileForm.city}
                            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, city: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-300 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            value={adminProfileForm.country}
                            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, country: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-300 mb-1">
                          Headquarters Address
                        </label>
                        <input
                          type="text"
                          value={adminProfileForm.address}
                          onChange={(e) => setAdminProfileForm({ ...adminProfileForm, address: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSavingSecurity}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSavingSecurity ? 'Saving Changes...' : 'Save Profile Details'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="space-y-6 max-w-2xl">
                {/* Customer-to-Sub-Admin Auto-Delivery Switch */}
                <div className="p-4 sm:p-5 bg-slate-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Customer Messages to Sub-Admin (Auto ON)</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Stays AUTO ON so Sub-Admins see customer messages automatically until Super Admin manually turns it OFF. Customer photos & receipts always wait for Super Admin access.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleModeration}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto ${
                      settings?.customerMessagesToSubAdminAutoOn !== false
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                    }`}
                  >
                    {settings?.customerMessagesToSubAdminAutoOn !== false ? 'AUTO ON' : 'OFF (Manual)'}
                  </button>
                </div>

                {/* Sub-Admin Silent Message Edit Switch */}
                <div className="p-4 sm:p-5 bg-slate-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Sub-Admin Silent Edit (Own Written Messages)</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lets Sub-Admins edit messages they already sent. After editing, the message remains like it was never edited (no &ldquo;Edited&rdquo; label, same original time).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAllSubAdminEdit}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto ${
                      settings?.subAdminCanEditOwnMessages
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                        : 'bg-slate-700 hover:bg-slate-800 text-white shadow-md'
                    }`}
                  >
                    {settings?.subAdminCanEditOwnMessages ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
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
          {/* ==================== CUSTOMER DEVICES SECTION ==================== */}
          {activeSection === 'devices' && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-4 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-gray-900">
                      Customer Device Login History
                    </h2>
                    <p className="text-xs text-gray-500">
                      Inspect every device logged into any individual customer account (new & old since launch), exact date/time, and search by hours ago.
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadAllData}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Devices</span>
                </button>
              </div>

              <CustomerDeviceHistoryPanel
                customers={customers}
                allDeviceLogins={allCustomerDeviceLogins}
              />
            </div>
          )}
        </main>
      </div>

      {/* INDIVIDUAL CUSTOMER DEVICE LOGIN HISTORY MODAL */}
      {deviceHistoryCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92dvh] overflow-hidden shadow-2xl border border-gray-200 flex flex-col">
            <div className="bg-gradient-to-r from-[#0A2540] to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-indigo-200" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base truncate">
                    Device Login History — {deviceHistoryCustomer.fullName}
                  </h3>
                  <p className="text-[11px] text-indigo-200 truncate">
                    {deviceHistoryCustomer.email} • All devices logged in since account creation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeviceHistoryCustomer(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0"
                title="Close Device History"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <CustomerDeviceHistoryPanel
                customers={customers}
                allDeviceLogins={allCustomerDeviceLogins}
                lockedCustomer={deviceHistoryCustomer}
              />
            </div>
          </div>
        </div>
      )}

      {/* CREATE SUB ADMIN MODAL */}
      {showCreateSubAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* ASSIGN / TRANSFER CUSTOMER MODAL */}
      {showTransferModal && (() => {
        const isModalCustomerUnassigned = isCustomerUnassigned(showTransferModal);
        const effectiveTargetSubAdmin = transferTargetSubAdmin || subAdmins[0]?.uid || '';
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
            <div className="bg-white rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
              <h3 className="font-black text-lg text-gray-900">
                {isModalCustomerUnassigned ? 'Assign Customer to Sub Admin' : 'Transfer Customer Assignment'}
              </h3>
              <p className="text-xs text-gray-500">
                {isModalCustomerUnassigned ? (
                  <>
                    Select which Sub Admin account newly registered customer{' '}
                    <strong className="text-gray-900">{showTransferModal.fullName}</strong> will belong to.
                  </>
                ) : (
                  <>
                    Reassign customer <strong className="text-gray-900">{showTransferModal.fullName}</strong> to another Sub Admin account.
                  </>
                )}
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Target Sub Admin Account</label>
                {subAdmins.length > 0 ? (
                  <select
                    value={effectiveTargetSubAdmin}
                    onChange={(e) => setTransferTargetSubAdmin(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    {subAdmins.map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.fullName} ({s.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-red-600 font-semibold p-3 bg-red-50 rounded-xl border border-red-200">
                    No Sub Admin accounts exist yet. Please create a Sub Admin account first.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!effectiveTargetSubAdmin || subAdmins.length === 0}
                  onClick={handleTransferCustomer}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 ${
                    isModalCustomerUnassigned
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isModalCustomerUnassigned ? 'Confirm Assignment' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIVE CUSTOMER TRACKING CARD PREVIEW MODAL (Super Admin view only) */}
      {trackingPreviewCode && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-100 rounded-3xl max-w-6xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 bg-white p-4 rounded-2xl shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-gray-900 flex items-center space-x-2">
                    <span>Live Customer Tracking Card (Read-Only Preview)</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-mono font-bold">
                      EXACT CONSIGNEE VIEW
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Waybill: <strong className="font-mono text-gray-800">{trackingPreviewCode}</strong> • Delivery tracking & charges are managed exclusively by the assigned Sub-Admin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackingPreviewCode(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <TrackingSection
              initialTrackingNumber={trackingPreviewCode}
              isModal={true}
              onClose={() => setTrackingPreviewCode(null)}
            />
          </div>
        </div>
      )}

      {/* CHAT MODAL (SUPER ADMIN INTERVENTION) */}
      {activeChatConversation && userProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="max-w-3xl w-full">
            <ChatComponent
              conversation={activeChatConversation}
              currentUserProfile={userProfile}
              onReturn={() => setActiveChatConversation(null)}
              onClose={() => setActiveChatConversation(null)}
            />
          </div>
        </div>
      )}

      {/* QUICK SUPER ADMIN PASSWORD CHANGE & PROFILE EDIT MODAL */}
      {showAdminSecurityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-4 sm:my-8 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">Super Admin Security & Profile</h3>
                  <p className="text-xs text-gray-500">Update your administrative credentials and official details</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAdminSecurityModal(false);
                  setSecurityStatusMsg(null);
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {securityStatusMsg && (
              <div
                className={`mt-4 p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
                  securityStatusMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {securityStatusMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{securityStatusMsg.text}</span>
              </div>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleChangeAdminPassword} className="mt-5 p-4 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-extrabold text-gray-900">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Change Administrator Password</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Set a new password for <strong className="text-gray-800">{userProfile?.email}</strong>. This updates your login credentials immediately.
              </p>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">New Password (min 6 chars)</label>
                  <div className="relative">
                    <input
                      type={showAdminPassText ? 'text' : 'password'}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassText(!showAdminPassText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showAdminPassText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type={showAdminPassText ? 'text' : 'password'}
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingSecurity || !newAdminPassword}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-950 text-xs font-black flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isSavingSecurity ? 'Updating Password...' : 'Save New Password'}</span>
                </button>
              </div>
            </form>

            {/* Edit Profile Form */}
            <form onSubmit={handleSaveAdminProfile} className="mt-5 p-4 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-extrabold text-gray-900">
                <UserCog className="w-4 h-4 text-blue-600" />
                <span>Edit Administrator Profile Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={adminProfileForm.fullName}
                    onChange={(e) => setAdminProfileForm({ ...adminProfileForm, fullName: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={adminProfileForm.email}
                    onChange={(e) => setAdminProfileForm({ ...adminProfileForm, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={adminProfileForm.phoneNumber}
                    onChange={(e) => setAdminProfileForm({ ...adminProfileForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={adminProfileForm.city}
                    onChange={(e) => setAdminProfileForm({ ...adminProfileForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Office / Operations Address</label>
                  <input
                    type="text"
                    value={adminProfileForm.address}
                    onChange={(e) => setAdminProfileForm({ ...adminProfileForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={adminProfileForm.country}
                    onChange={(e) => setAdminProfileForm({ ...adminProfileForm, country: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Administrative Notes / Bio</label>
                  <textarea
                    rows={2}
                    value={adminProfileForm.notes}
                    onChange={(e) => setAdminProfileForm({ ...adminProfileForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-blue-600 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSecurity}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingSecurity ? 'Saving Profile...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER & SET PASSWORD MODAL (SUB-ADMINS & CUSTOMERS) */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">
                    Edit {editingUser.role === 'sub_admin' ? 'Sub-Admin' : 'Customer'} Account
                  </h3>
                  <p className="text-xs text-gray-500">
                    Modify profile information and assign or reset login password
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editUserForm.fullName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editUserForm.phoneNumber}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editUserForm.city}
                    onChange={(e) => setEditUserForm({ ...editUserForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={editUserForm.address}
                    onChange={(e) => setEditUserForm({ ...editUserForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={editUserForm.country}
                    onChange={(e) => setEditUserForm({ ...editUserForm, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={editUserForm.notes}
                    onChange={(e) => setEditUserForm({ ...editUserForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-blue-600 resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-start space-x-3 p-3 rounded-2xl bg-blue-50/70 border border-blue-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserForm.usaOnlyLogin}
                      onChange={(e) => setEditUserForm({ ...editUserForm, usaOnlyLogin: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-blue-950">USA-Only Login Access</div>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Restrict sign-in exclusively to persons or phones located within the United States (USA).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Reset / Set Password Section */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-extrabold text-amber-950">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Set / Reset User Password</span>
                </div>
                <p className="text-[11px] text-amber-900">
                  Enter a new password below to reset this user's password. They can immediately log in with this new password. Leave blank if you do not want to alter their current password.
                </p>

                <div className="relative">
                  <input
                    type={showUserPassText ? 'text' : 'password'}
                    value={editUserForm.newPassword}
                    onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })}
                    placeholder="Enter new password (e.g. Pass123456)"
                    className="w-full px-3 py-2 pr-10 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassText(!showUserPassText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showUserPassText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditUser}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingEditUser ? 'Saving Changes...' : 'Save User Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE & UPDATE CUSTOMER PASSWORD MODAL */}
      {passwordTargetUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="bg-gradient-to-r from-[#0A2540] to-[#12385e] text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Change Customer Password</h3>
                  <p className="text-[11px] text-amber-200 truncate max-w-[230px]">
                    {passwordTargetUser.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordTargetUser(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerPassword} className="p-5 sm:p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-gray-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 font-semibold">Customer:</span>
                  <span className="font-extrabold text-gray-900 text-right">{passwordTargetUser.fullName}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 font-semibold">Login Email:</span>
                  <span className="font-mono font-bold text-blue-700 text-right break-all">{passwordTargetUser.email}</span>
                </div>
                {passwordTargetUser.customPassword && (
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-200">
                    <span className="text-gray-500 font-semibold">Current Password:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-gray-800">
                        {showCurrentCustomerPass ? passwordTargetUser.customPassword : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCurrentCustomerPass(!showCurrentCustomerPass)}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                        title={showCurrentCustomerPass ? 'Hide current password' : 'Show current password'}
                      >
                        {showCurrentCustomerPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {customerPasswordError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                  {customerPasswordError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showCustomerPassText ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={customerNewPassword}
                    onChange={(e) => {
                      setCustomerNewPassword(e.target.value);
                      if (customerPasswordError) setCustomerPasswordError('');
                    }}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full px-3 py-2.5 pr-10 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerPassText(!showCustomerPassText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    title={showCustomerPassText ? 'Hide password' : 'Show password'}
                  >
                    {showCustomerPassText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showCustomerPassText ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={customerConfirmPassword}
                  onChange={(e) => {
                    setCustomerConfirmPassword(e.target.value);
                    if (customerPasswordError) setCustomerPasswordError('');
                  }}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-amber-500"
                />
              </div>

              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                Updating takes effect immediately across all devices. The old password will stop working right away.
              </p>

              <div className="flex justify-end space-x-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomerPassword}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-md cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{savingCustomerPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Confirm Permanent Deletion
                </h3>
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider">
                  {userToDelete.role === 'sub_admin' ? 'Sub Admin Account' : 'Customer Account'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs space-y-1.5">
              <div>Name: <strong className="text-gray-900">{userToDelete.fullName}</strong></div>
              <div>Email: <strong className="text-gray-900">{userToDelete.email}</strong></div>
              <div>Role: <span className="font-mono font-bold uppercase text-blue-600">{userToDelete.role}</span></div>
              {userToDelete.country && <div>Country: <span className="text-gray-700">{userToDelete.country}</span></div>}
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              ⚠️ <strong>Warning:</strong> Are you sure you want to permanently delete this user account? This action cannot be reversed.
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-md cursor-pointer transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingUser ? 'Deleting Account...' : 'Yes, Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SHIPMENT CONFIRMATION MODAL */}
      {shipmentToDelete && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn"
          onClick={() => !isDeletingShipment && setShipmentToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Delete Shipment Record?
                </h3>
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider font-mono">
                  {shipmentToDelete.trackingNumber}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs space-y-1.5">
              <div>Recipient: <strong className="text-gray-900">{shipmentToDelete.recipientName || shipmentToDelete.customerName}</strong></div>
              <div>Route: <strong className="text-gray-900">{shipmentToDelete.departureLocation} → {shipmentToDelete.destinationLocation}</strong></div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeletingShipment}
                onClick={() => setShipmentToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingShipment}
                onClick={handleConfirmDeleteShipment}
                className="px-5 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-md cursor-pointer transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingShipment ? 'Deleting...' : 'Yes, Delete Shipment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toastNotification && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold text-white transition-all transform animate-fadeIn border backdrop-blur-md bg-slate-900/95 border-slate-700">
          <span className={`w-2 h-2 rounded-full ${toastNotification.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
          <span>{toastNotification.text}</span>
        </div>
      )}

      {/* SUPER ADMIN MOBILE BOTTOM APP BAR */}
      <nav aria-label="Super Admin Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b132b]/95 backdrop-blur-md border-t border-[#1c2541] px-1.5 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => {
            setActiveSection('overview');
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeSection === 'overview' ? 'text-amber-400 bg-amber-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 mb-0.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => {
            setActiveSection('subadmins');
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative cursor-pointer ${
            activeSection === 'subadmins' ? 'text-amber-400 bg-amber-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShieldCheck className="w-5 h-5 mb-0.5" />
          <span>Sub-Admins</span>
          <span className="text-[9px] opacity-75">{subAdmins.length}</span>
        </button>

        <button
          onClick={() => {
            setActiveSection('customers');
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative cursor-pointer ${
            activeSection === 'customers' ? 'text-amber-400 bg-amber-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Customers</span>
          <span className="text-[9px] opacity-75">{customers.length}</span>
        </button>

        <button
          onClick={() => {
            setActiveSection('messages');
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative cursor-pointer ${
            activeSection === 'messages' ? 'text-amber-400 bg-amber-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span>Chat Hub</span>
          {conversations.length > 0 && (
            <span className="absolute top-0 right-1 bg-amber-500 text-gray-950 text-[9px] px-1 rounded-full font-bold">
              {conversations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveSection('shipments');
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all relative cursor-pointer ${
            activeSection === 'shipments' ? 'text-amber-400 bg-amber-500/15' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span>Shipments</span>
          <span className="text-[9px] opacity-75">{shipments.length}</span>
        </button>
      </nav>
    </div>
  );
};
