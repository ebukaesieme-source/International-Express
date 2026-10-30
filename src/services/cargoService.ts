import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  UserProfile,
  Shipment,
  TrackingEvent,
  Conversation,
  ChatMessage,
  PaymentRecord,
  SystemSettings,
  AuditLog,
  CustomsPaymentStatus,
  ShipmentStatus
} from '../types';

/**
 * Strips all undefined properties recursively from an object before writing to Firestore,
 * preventing Firestore "Unsupported field value: undefined" runtime errors.
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanFirestoreData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/* ---------------- USERS ---------------- */

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createOrUpdateUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  const path = `users/${profile.uid}`;
  const now = new Date().toISOString();
  try {
    const existing = await getUserProfile(profile.uid);
    const data: UserProfile = {
      uid: profile.uid,
      email: profile.email || existing?.email || '',
      fullName: profile.fullName || existing?.fullName || 'User',
      role: profile.role || existing?.role || 'customer',
      phoneNumber: profile.phoneNumber ?? existing?.phoneNumber ?? '',
      address: profile.address ?? existing?.address ?? '',
      city: profile.city ?? existing?.city ?? '',
      country: profile.country ?? existing?.country ?? '',
      postalCode: profile.postalCode ?? existing?.postalCode ?? '',
      passportId: profile.passportId ?? existing?.passportId ?? '',
      assignedSubAdminId: profile.assignedSubAdminId ?? existing?.assignedSubAdminId ?? '',
      assignedSubAdminName: profile.assignedSubAdminName ?? existing?.assignedSubAdminName ?? '',
      isSuspended: profile.isSuspended ?? existing?.isSuspended ?? false,
      notes: profile.notes ?? existing?.notes ?? '',
      customPassword: profile.customPassword ?? existing?.customPassword,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'users', profile.uid), cleanFirestoreData(data), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserPassword(uid: string, newPassword: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      customPassword: newPassword,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getSubAdmins(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'sub_admin'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getCustomers(subAdminId?: string): Promise<UserProfile[]> {
  const path = 'users';
  try {
    let q;
    if (subAdminId) {
      q = query(
        collection(db, 'users'),
        where('role', '==', 'customer'),
        where('assignedSubAdminId', '==', subAdminId)
      );
    } else {
      q = query(collection(db, 'users'), where('role', '==', 'customer'));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateUserSuspension(uid: string, isSuspended: boolean): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      isSuspended,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function transferCustomer(
  customerId: string,
  newSubAdminId: string,
  newSubAdminName: string
): Promise<void> {
  const path = `users/${customerId}`;
  try {
    await updateDoc(doc(db, 'users', customerId), {
      assignedSubAdminId: newSubAdminId,
      assignedSubAdminName: newSubAdminName,
      updatedAt: new Date().toISOString()
    });

    // Also update any conversation for this customer
    const convQuery = query(collection(db, 'conversations'), where('customerId', '==', customerId));
    const convSnap = await getDocs(convQuery);
    for (const d of convSnap.docs) {
      await updateDoc(doc(db, 'conversations', d.id), {
        subAdminId: newSubAdminId,
        subAdminName: newSubAdminName,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getUnassignedCustomers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'customer'));
    const snap = await getDocs(q);
    const all = snap.docs.map(d => d.data() as UserProfile);
    return all.filter(c => !c.assignedSubAdminId || c.assignedSubAdminId === '' || c.assignedSubAdminId === 'unassigned');
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function claimCustomer(
  customerId: string,
  subAdminId: string,
  subAdminName: string,
  claimedByRole: string = 'sub_admin'
): Promise<void> {
  const path = `users/${customerId}`;
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'users', customerId), {
      assignedSubAdminId: subAdminId,
      assignedSubAdminName: subAdminName,
      updatedAt: now
    });

    // Update or create active conversation between this customer and the claiming Sub Admin
    const convQuery = query(collection(db, 'conversations'), where('customerId', '==', customerId));
    const convSnap = await getDocs(convQuery);
    if (!convSnap.empty) {
      for (const d of convSnap.docs) {
        await updateDoc(doc(db, 'conversations', d.id), {
          subAdminId: subAdminId,
          subAdminName: subAdminName,
          updatedAt: now
        });
      }
    } else {
      const custDoc = await getDoc(doc(db, 'users', customerId));
      const custData = custDoc.data() as UserProfile | undefined;
      const convId = `conv_${customerId}_${subAdminId}`;
      await setDoc(doc(db, 'conversations', convId), cleanFirestoreData({
        id: convId,
        customerId,
        customerName: custData?.fullName || 'Customer Consignee',
        customerEmail: custData?.email || '',
        subAdminId,
        subAdminName,
        lastMessage: `Dispatch Officer ${subAdminName} accepted this consignee into active management.`,
        lastMessageTime: now,
        unreadCountSuperAdmin: 0,
        unreadCountSubAdmin: 0,
        unreadCountCustomer: 1,
        createdAt: now,
        updatedAt: now
      }));

      // Send greeting message from Sub Admin to customer
      await addDoc(collection(db, 'messages'), cleanFirestoreData({
        conversationId: convId,
        senderId: subAdminId,
        senderName: subAdminName,
        senderRole: 'sub_admin',
        text: `Hello ${custData?.fullName || 'Consignee'}! I am ${subAdminName}, your dedicated logistics dispatch lead. I have accepted your customer account and am now actively managing your air cargo waybills, customs documents, and delivery scheduling. Please feel free to reach out to me here directly.`,
        sharedWithSubAdmin: true,
        moderationStatus: 'approved',
        createdAt: now
      }));
    }

    await addAuditLog(
      'customer_accepted_by_subadmin',
      subAdminName,
      claimedByRole,
      `Sub Admin ${subAdminName} accepted customer (${customerId}) into active dispatch management.`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUser(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* ---------------- SHIPMENTS ---------------- */

export async function getShipmentByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
  const cleanTracking = trackingNumber.trim().toUpperCase();
  const path = 'shipments';
  try {
    const q = query(collection(db, 'shipments'), where('trackingNumber', '==', cleanTracking), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Shipment;
    }
    // Try by document ID
    const directSnap = await getDoc(doc(db, 'shipments', cleanTracking));
    if (directSnap.exists()) {
      return directSnap.data() as Shipment;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getAllShipments(): Promise<Shipment[]> {
  const path = 'shipments';
  try {
    const snap = await getDocs(collection(db, 'shipments'));
    return snap.docs.map(d => d.data() as Shipment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getSubAdminShipments(subAdminId: string): Promise<Shipment[]> {
  const path = 'shipments';
  try {
    const q = query(collection(db, 'shipments'), where('subAdminId', '==', subAdminId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Shipment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getCustomerShipments(customerId: string): Promise<Shipment[]> {
  const path = 'shipments';
  try {
    const q = query(collection(db, 'shipments'), where('customerId', '==', customerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Shipment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createShipment(
  data: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>,
  recordedBy: string,
  recordedByRole: string
): Promise<Shipment> {
  const trackingNumber = data.trackingNumber.trim().toUpperCase();
  const shipmentId = trackingNumber;
  const path = `shipments/${shipmentId}`;
  const now = new Date().toISOString();

  const shipment: Shipment = {
    ...data,
    id: shipmentId,
    trackingNumber,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'shipments', shipmentId), cleanFirestoreData(shipment));

    // Initial milestone tracking event
    await addTrackingEvent({
      shipmentId,
      trackingNumber,
      status: shipment.status,
      title: 'Shipment Registered & Waybill Generated',
      description: `Package registered from ${shipment.departureLocation} to ${shipment.destinationLocation}. Carrier: ${shipment.carrier}`,
      location: shipment.departureLocation,
      timestamp: now,
      recordedBy,
      recordedByRole
    });

    return shipment;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateShipment(
  id: string,
  updates: Partial<Shipment>,
  actorName?: string,
  actorRole?: string
): Promise<void> {
  const path = `shipments/${id}`;
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'shipments', id), cleanFirestoreData({
      ...updates,
      updatedAt: now,
    }));

    // If status changed, automatically log a milestone tracking event
    if (updates.status && actorName && actorRole) {
      const snap = await getDoc(doc(db, 'shipments', id));
      if (snap.exists()) {
        const current = snap.data() as Shipment;
        await addTrackingEvent({
          shipmentId: id,
          trackingNumber: current.trackingNumber,
          status: updates.status,
          title: getStatusTitle(updates.status),
          description: updates.statusNotes || `Shipment status updated to ${updates.status.replace(/_/g, ' ').toUpperCase()}`,
          location: updates.currentLocation || current.destinationLocation,
          timestamp: now,
          recordedBy: actorName,
          recordedByRole: actorRole
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteShipment(id: string): Promise<void> {
  const path = `shipments/${id}`;
  try {
    await deleteDoc(doc(db, 'shipments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* ---------------- TRACKING EVENTS ---------------- */

export async function addTrackingEvent(event: Omit<TrackingEvent, 'id'>): Promise<string> {
  const path = 'tracking_events';
  try {
    const docRef = await addDoc(collection(db, 'tracking_events'), cleanFirestoreData(event));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getTrackingEvents(shipmentId: string): Promise<TrackingEvent[]> {
  const path = 'tracking_events';
  try {
    const q = query(
      collection(db, 'tracking_events'),
      where('shipmentId', '==', shipmentId)
    );
    const snap = await getDocs(q);
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as TrackingEvent));
    // Sort chronologically ascending
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function getStatusTitle(status: ShipmentStatus): string {
  switch (status) {
    case 'registered':
      return 'Shipment Registration & Booking Confirmed';
    case 'package_received':
      return 'Package Received at Logistics Terminal';
    case 'processing':
      return 'Cargo Processing, Weighing & Security Screening';
    case 'departure':
      return 'Departed from Origin International Airport / Port';
    case 'in_transit':
      return 'In Global Transit / Intermodal Route';
    case 'arrival_destination':
      return 'Arrived at Destination Country Terminal';
    case 'customs_processing':
      return 'Customs Inspection & Duties Clearance Processing';
    case 'out_for_delivery':
      return 'Dispatched & Out for Final Doorstep Delivery';
    case 'delivered':
      return 'Package Successfully Delivered & Signed For';
    case 'cancelled':
      return 'Shipment Cancelled / Suspended';
    default:
      return 'Status Update Recorded';
  }
}

/* ---------------- CUSTOMS DUTIES & PAYMENTS ---------------- */

export async function updateCustomsDuty(
  shipmentId: string,
  amount: number,
  currency: string,
  paymentStatus: CustomsPaymentStatus,
  reference?: string,
  notes?: string,
  feePurpose?: string
): Promise<void> {
  const path = `shipments/${shipmentId}`;
  try {
    await updateDoc(doc(db, 'shipments', shipmentId), {
      customsDutyAmount: amount,
      customsDutyCurrency: currency,
      customsPaymentStatus: paymentStatus,
      customsReference: reference || '',
      customsNotes: notes || '',
      feePurpose: feePurpose || 'Customs Clearance & Import Duty',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordPayment(payment: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<string> {
  const path = 'payments';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'payments'), cleanFirestoreData({
      ...payment,
      createdAt: now
    }));

    // Also update shipment payment status if applicable
    if (payment.status === 'confirmed') {
      await updateDoc(doc(db, 'shipments', payment.shipmentId), {
        customsPaymentStatus: 'paid',
        customsReference: payment.reference,
        updatedAt: now
      });
    }
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getShipmentPayments(shipmentId: string): Promise<PaymentRecord[]> {
  const path = 'payments';
  try {
    const q = query(collection(db, 'payments'), where('shipmentId', '==', shipmentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getAllPayments(): Promise<PaymentRecord[]> {
  const path = 'payments';
  try {
    const snap = await getDocs(collection(db, 'payments'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function confirmPayment(paymentId: string, shipmentId: string, confirmedBy: string): Promise<void> {
  const path = `payments/${paymentId}`;
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'payments', paymentId), {
      status: 'confirmed',
      confirmedBy
    });
    await updateDoc(doc(db, 'shipments', shipmentId), {
      customsPaymentStatus: 'paid',
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/* ---------------- MESSAGING & MODERATION ---------------- */

export async function getOrCreateConversation(
  customerId: string,
  customerName: string,
  customerEmail: string,
  subAdminId = '',
  subAdminName = ''
): Promise<Conversation> {
  const convId = `conv_${customerId}`;
  const path = `conversations/${convId}`;
  try {
    const snap = await getDoc(doc(db, 'conversations', convId));
    if (snap.exists()) {
      const existing = snap.data() as Conversation;
      if (subAdminId && !existing.subAdminId) {
        await updateDoc(doc(db, 'conversations', convId), {
          subAdminId,
          subAdminName
        });
        existing.subAdminId = subAdminId;
        existing.subAdminName = subAdminName;
      }
      return existing;
    }

    const newConv: Conversation = {
      id: convId,
      customerId,
      customerName,
      customerEmail,
      subAdminId,
      subAdminName,
      lastMessage: 'Conversation opened',
      lastMessageTime: new Date().toISOString(),
      unreadCustomerCount: 0,
      unreadAdminCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'conversations', convId), newConv);
    return newConv;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getAllConversations(): Promise<Conversation[]> {
  const path = 'conversations';
  try {
    const snap = await getDocs(collection(db, 'conversations'));
    return snap.docs.map(d => d.data() as Conversation);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getSubAdminConversations(subAdminId: string): Promise<Conversation[]> {
  const path = 'conversations';
  try {
    const q = query(collection(db, 'conversations'), where('subAdminId', '==', subAdminId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Conversation);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function sendMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<string> {
  const path = 'messages';
  try {
    const now = new Date().toISOString();
    const dataToSave = cleanFirestoreData({
      ...msg,
      createdAt: now
    });
    const docRef = await addDoc(collection(db, 'messages'), dataToSave);

    // Update conversation last message if approved or not pending moderation
    if (msg.moderationStatus === 'approved') {
      await updateDoc(doc(db, 'conversations', msg.conversationId), {
        lastMessage: msg.text || (msg.attachmentType ? `[${msg.attachmentType.toUpperCase()}]` : 'Sent attachment'),
        lastMessageTime: now,
        updatedAt: now
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToMessages(
  conversationId: string,
  userRole: string,
  callback: (messages: ChatMessage[]) => void
) {
  const path = 'messages';
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      let msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
      
      // If user is sub_admin, only show messages if:
      // - Sent by sub_admin or super_admin
      // - OR customer message where sharedWithSubAdmin is explicitly true (not held by Super Admin)
      if (userRole === 'sub_admin') {
        msgs = msgs.filter(m => {
          if (m.senderRole === 'sub_admin' || m.senderRole === 'super_admin') return true;
          return m.sharedWithSubAdmin === true && m.moderationStatus !== 'rejected';
        });
      }

      // If user is customer, show approved messages, direct admin messages, and their own messages
      if (userRole === 'customer') {
        msgs = msgs.filter(m => m.moderationStatus !== 'rejected');
      }

      // Sort ascending by creation time
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function getPendingModerationMessages(): Promise<ChatMessage[]> {
  const path = 'messages';
  try {
    const q = query(collection(db, 'messages'), where('moderationStatus', '==', 'pending_moderation'));
    const snap = await getDocs(q);
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
    return msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function moderateMessage(
  messageId: string,
  status: 'approved' | 'rejected',
  conversationId: string,
  messageText: string,
  reason?: string
): Promise<void> {
  const path = `messages/${messageId}`;
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'messages', messageId), {
      moderationStatus: status,
      rejectionReason: reason || ''
    });

    if (status === 'approved') {
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: messageText || 'New message approved',
        lastMessageTime: now,
        updatedAt: now
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function editMessage(
  messageId: string,
  newText: string,
  editedBy: string
): Promise<void> {
  const path = `messages/${messageId}`;
  try {
    const snap = await getDoc(doc(db, 'messages', messageId));
    if (!snap.exists()) return;
    const current = snap.data() as ChatMessage;

    await updateDoc(doc(db, 'messages', messageId), {
      customerDisplayText: newText,
      // Original text remains untouched so sub admin continues to see his old message!
      originalText: current.text,
      isEdited: true,
      editedAt: new Date().toISOString(),
      editedBy
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleMessageSubAdminAccess(
  messageId: string,
  allowSubAdmin: boolean
): Promise<void> {
  const path = `messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'messages', messageId), {
      sharedWithSubAdmin: allowSubAdmin,
      moderationStatus: allowSubAdmin ? 'approved' : 'pending_moderation'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMessage(messageId: string, deletedBy: string): Promise<void> {
  const path = `messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'messages', messageId), {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy,
      text: '[This message was deleted by administration in accordance with data retention policy]'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/* ---------------- SYSTEM SETTINGS & AUDIT LOGS ---------------- */

export async function getSystemSettings(): Promise<SystemSettings> {
  const path = 'system_settings/general';
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'general'));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    const defaultSettings: SystemSettings = {
      id: 'general',
      messageModeration: false,
      customerMessagesToSubAdminAutoOn: true,
      companyName: 'International Express Cargo',
      supportEmail: 'support@internationalexpresscargo.com',
      supportPhone: '+1 (800) 555-CARGO',
      announcement: 'Worldwide air and sea cargo services operational 24/7 across 220+ global hub destinations.',
      updatedAt: new Date().toISOString(),
      updatedBy: 'System'
    };
    await setDoc(doc(db, 'system_settings', 'general'), defaultSettings);
    return defaultSettings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateSystemSettings(updates: Partial<SystemSettings>, updatedBy: string): Promise<void> {
  const path = 'system_settings/general';
  try {
    await updateDoc(doc(db, 'system_settings', 'general'), {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addAuditLog(
  action: string,
  performedBy: string,
  performedByRole: string,
  details: string,
  targetId?: string
): Promise<string> {
  const path = 'audit_logs';
  try {
    const log: Omit<AuditLog, 'id'> = {
      action,
      performedBy,
      performedByRole,
      details,
      targetId: targetId || '',
      timestamp: new Date().toISOString()
    };
    const ref = await addDoc(collection(db, 'audit_logs'), log);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const path = 'audit_logs';
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/* ---------------- INITIAL SEED DATA FOR DEMO & TESTING ---------------- */

export async function seedInitialDemoData(): Promise<void> {
  try {
    // 1. Check if super admin already exists
    const superAdminSnap = await getDoc(doc(db, 'users', 'super_admin_seed'));
    if (!superAdminSnap.exists()) {
      await setDoc(doc(db, 'users', 'super_admin_seed'), {
        uid: 'super_admin_seed',
        email: 'admin@gmail.com',
        fullName: 'Executive Super Administrator',
        role: 'super_admin',
        phoneNumber: '+1 (800) 999-CARGO',
        address: 'One World Cargo Center, JFK Airport',
        city: 'New York',
        country: 'United States',
        postalCode: '11430',
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Check if sub admin exists
    const subAdminSnap = await getDoc(doc(db, 'users', 'sub_admin_1'));
    if (!subAdminSnap.exists()) {
      await setDoc(doc(db, 'users', 'sub_admin_1'), {
        uid: 'sub_admin_1',
        email: 'subadmin@expresscargo.com',
        fullName: 'Marcus Vance (Regional Dispatch Lead)',
        role: 'sub_admin',
        phoneNumber: '+44 20 7946 0991',
        address: 'Heathrow Cargo Logistics Hub, Terminal 4',
        city: 'London',
        country: 'United Kingdom',
        postalCode: 'TW6 3XZ',
        isSuspended: false,
        notes: 'Lead dispatch officer for EMEA and transatlantic cargo corridors.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 3. Check sample customer
    const customerSnap = await getDoc(doc(db, 'users', 'customer_demo_1'));
    if (!customerSnap.exists()) {
      await setDoc(doc(db, 'users', 'customer_demo_1'), {
        uid: 'customer_demo_1',
        email: 'customer@apexlogistics.com',
        fullName: 'Elena Rostova (Apex Global Imports)',
        role: 'customer',
        phoneNumber: '+1 (415) 890-3344',
        address: '888 Industrial Parkway, Suite 400',
        city: 'San Francisco',
        country: 'United States',
        postalCode: '94107',
        passportId: 'US-92848102',
        assignedSubAdminId: 'sub_admin_1',
        assignedSubAdminName: 'Marcus Vance (Regional Dispatch Lead)',
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 3b. Sample newly registered unassigned customer waiting for Sub Admin to accept
    const unassignedCustSnap = await getDoc(doc(db, 'users', 'customer_unassigned_demo'));
    if (!unassignedCustSnap.exists()) {
      await setDoc(doc(db, 'users', 'customer_unassigned_demo'), {
        uid: 'customer_unassigned_demo',
        email: 'david@nordiclogistics.com',
        fullName: 'David Kim (Nordic Trading Co)',
        role: 'customer',
        phoneNumber: '+46 8 123 4567',
        address: 'Hamngatan 15, Suite 300',
        city: 'Stockholm',
        country: 'Sweden',
        postalCode: '111 47',
        assignedSubAdminId: '',
        assignedSubAdminName: 'Unassigned (Awaiting Sub Admin Acceptance)',
        isSuspended: false,
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3600 * 1000).toISOString()
      });
    }

    // 4. Sample shipments with authentic tracking numbers
    const sampleTracking = 'IEC-748920-EXP';
    const shipmentSnap = await getDoc(doc(db, 'shipments', sampleTracking));
    if (!shipmentSnap.exists()) {
      const now = new Date();
      const createdDate = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
      const estDelivery = new Date(now.getTime() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0];

      await setDoc(doc(db, 'shipments', sampleTracking), {
        id: sampleTracking,
        trackingNumber: sampleTracking,
        customerId: 'customer_demo_1',
        customerName: 'Elena Rostova (Apex Global Imports)',
        customerEmail: 'customer@apexlogistics.com',
        customerPhone: '+1 (415) 890-3344',
        subAdminId: 'sub_admin_1',
        subAdminName: 'Marcus Vance (Regional Dispatch Lead)',
        description: 'High-Value Aerospace Avionics & Microcontroller Assemblies',
        packageType: 'Air Cargo Heavy Crate',
        weightKg: 142.5,
        pieces: 4,
        dimensions: '120 x 80 x 95 cm',
        senderName: 'Munich Precision Aerospace GmbH',
        senderPhone: '+49 89 2345678',
        senderAddress: 'Flughafenallee 12, Terminal Cargo North',
        senderCountry: 'Germany',
        recipientName: 'Apex Global Imports LLC',
        recipientPhone: '+1 (415) 890-3344',
        recipientAddress: '888 Industrial Parkway, Suite 400',
        recipientCountry: 'United States',
        departureLocation: 'Munich Airport Cargo (MUC), Germany',
        destinationLocation: 'San Francisco International (SFO), USA',
        currentLocation: 'JFK International Airport Cargo Terminal 4, New York',
        carrier: 'Boeing 747-8F Heavy Freight / Flight IEC-890',
        status: 'in_transit',
        statusNotes: 'Aircraft landed at JFK transfer hub. Cleared TSA physical cargo inspection.',
        estimatedDeliveryDate: estDelivery,
        customsDutyAmount: 850.00,
        customsDutyCurrency: 'USD',
        customsPaymentStatus: 'pending',
        customsReference: 'USCBP-2026-9921',
        customsNotes: 'Standard 4.5% tariff applicable on industrial precision avionics.',
        createdAt: createdDate,
        updatedAt: now.toISOString(),
      });

      // Sample events
      await addDoc(collection(db, 'tracking_events'), {
        shipmentId: sampleTracking,
        trackingNumber: sampleTracking,
        status: 'registered',
        title: 'Air Waybill Issued & Booking Confirmed',
        description: 'Electronic documentation processed. Manifest transmitted to airline.',
        location: 'Munich, Germany',
        timestamp: new Date(now.getTime() - 72 * 3600 * 1000).toISOString(),
        recordedBy: 'Marcus Vance',
        recordedByRole: 'sub_admin'
      });

      await addDoc(collection(db, 'tracking_events'), {
        shipmentId: sampleTracking,
        trackingNumber: sampleTracking,
        status: 'package_received',
        title: 'Received at Munich Cargo Logistics Hub',
        description: 'Pallet weighed, scanned, and banded with tamper-evident security seal #SEAL-9982.',
        location: 'Munich Airport Cargo (MUC)',
        timestamp: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
        recordedBy: 'Marcus Vance',
        recordedByRole: 'sub_admin'
      });

      await addDoc(collection(db, 'tracking_events'), {
        shipmentId: sampleTracking,
        trackingNumber: sampleTracking,
        status: 'departure',
        title: 'Departed Munich on Boeing 747-8F',
        description: 'Flight IEC-890 airborne over Atlantic international flight corridor.',
        location: 'Munich Airport (MUC)',
        timestamp: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        recordedBy: 'Marcus Vance',
        recordedByRole: 'sub_admin'
      });

      await addDoc(collection(db, 'tracking_events'), {
        shipmentId: sampleTracking,
        trackingNumber: sampleTracking,
        status: 'in_transit',
        title: 'Transfer Hub Arrival & Transshipment',
        description: 'Cargo unloaded for customs transshipment connection to West Coast dispatch.',
        location: 'JFK Airport Terminal 4, New York, USA',
        timestamp: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
        recordedBy: 'Super Admin HQ',
        recordedByRole: 'super_admin'
      });
    }

    // 5. Sample conversation and message
    const convId = 'conv_customer_demo_1';
    const convSnap = await getDoc(doc(db, 'conversations', convId));
    if (!convSnap.exists()) {
      await setDoc(doc(db, 'conversations', convId), {
        id: convId,
        customerId: 'customer_demo_1',
        customerName: 'Elena Rostova (Apex Global Imports)',
        customerEmail: 'customer@apexlogistics.com',
        subAdminId: 'sub_admin_1',
        subAdminName: 'Marcus Vance (Regional Dispatch Lead)',
        lastMessage: 'Your transatlantic Boeing 747 consignment has touched down safely in JFK transfer.',
        lastMessageTime: new Date().toISOString(),
        unreadCustomerCount: 0,
        unreadAdminCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'messages'), {
        conversationId: convId,
        senderId: 'sub_admin_1',
        senderName: 'Marcus Vance',
        senderRole: 'sub_admin',
        recipientId: 'customer_demo_1',
        recipientRole: 'customer',
        text: 'Hello Elena, welcome to International Express Cargo. I am Marcus, your dedicated logistics dispatcher for this route.',
        moderationStatus: 'approved',
        createdAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString()
      });

      await addDoc(collection(db, 'messages'), {
        conversationId: convId,
        senderId: 'customer_demo_1',
        senderName: 'Elena Rostova',
        senderRole: 'customer',
        recipientId: 'sub_admin_1',
        recipientRole: 'sub_admin',
        text: 'Thank you Marcus! Please let me know when the avionics crate clears New York customs so our receiving team in SFO can be ready.',
        moderationStatus: 'approved',
        createdAt: new Date(Date.now() - 3600 * 1000 * 10).toISOString()
      });
    }
  } catch (err) {
    console.error('Error seeding demo data:', err);
  }
}
