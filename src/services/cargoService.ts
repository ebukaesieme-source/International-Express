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
  onSnapshot,
  arrayUnion,
  arrayRemove,
  deleteField
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  UserProfile,
  UserRole,
  Shipment,
  TrackingEvent,
  Conversation,
  ChatMessage,
  PaymentRecord,
  SystemSettings,
  AuditLog,
  CustomsPaymentStatus,
  ShipmentStatus,
  AppNotification,
  ItemizedFee,
  DeviceLoginRecord
} from '../types';
import { detectCurrentDeviceInfoAsync } from '../utils/deviceInfo';

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
      passwordVersion: profile.passwordVersion ?? existing?.passwordVersion,
      passwordUpdatedAt: profile.passwordUpdatedAt ?? existing?.passwordUpdatedAt,
      lastLoginAt: profile.lastLoginAt ?? existing?.lastLoginAt,
      lastDeviceName: profile.lastDeviceName ?? existing?.lastDeviceName,
      lastDeviceType: profile.lastDeviceType ?? existing?.lastDeviceType,
      deviceLogins: profile.deviceLogins ?? existing?.deviceLogins,
      usaOnlyLogin: profile.usaOnlyLogin ?? existing?.usaOnlyLogin,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'users', profile.uid), cleanFirestoreData(data), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserPassword(uid: string, newPassword: string, email?: string): Promise<void> {
  const path = `users/${uid}`;
  const trimmedPassword = newPassword.trim();
  const now = new Date().toISOString();
  try {
    const payload: Record<string, any> = {
      customPassword: trimmedPassword,
      passwordUpdatedAt: now,
      updatedAt: now
    };
    if (uid === 'super_admin_seed') {
      payload.passwordVersion = 'zara_v1';
    }

    // Read existing doc to discover email if not passed in
    let normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      try {
        const primarySnap = await getDoc(doc(db, 'users', uid));
        if (primarySnap.exists()) {
          normalizedEmail = ((primarySnap.data() as UserProfile).email || '').trim().toLowerCase();
        }
      } catch {}
    }

    await setDoc(doc(db, 'users', uid), payload, { merge: true });

    // Also synchronize any duplicate user documents sharing the same uid field or normalized email
    // so login checks never hit a stale password record on any device.
    try {
      const snap = await getDocs(collection(db, 'users'));
      const syncTargets = snap.docs.filter((d) => {
        if (d.id === uid) return false;
        const data = d.data() as UserProfile;
        const docEmail = (data.email || '').trim().toLowerCase();
        return data.uid === uid || (Boolean(normalizedEmail) && docEmail === normalizedEmail);
      });
      await Promise.all(
        syncTargets.map((d) => setDoc(doc(db, 'users', d.id), payload, { merge: true }))
      );
    } catch (syncErr) {
      console.warn('Secondary user password sync warning:', syncErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserPresence(uid: string, isOnline: boolean): Promise<void> {
  if (!uid) return;
  const now = new Date().toISOString();
  try {
    // IMPORTANT: Never call setDoc here! If the account was deleted, updateDoc safely fails
    // instead of resurrecting a deleted user document in Firestore.
    await updateDoc(doc(db, 'users', uid), {
      isOnline,
      lastSeen: now,
      updatedAt: now
    });
  } catch {
    // Ignore when user document does not exist (e.g. deleted account)
  }
}

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  if (!uid) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('subscribeToUserProfile notice:', err);
    }
  );
}


export async function getAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs
      .map(d => {
        const u = { ...(d.data() as UserProfile), uid: (d.data() as UserProfile).uid || d.id };
        if (u.assignedSubAdminName && (u.assignedSubAdminName.includes('Regional Dispatch Lead') || u.assignedSubAdminName.includes('Marcus Vance'))) {
          u.assignedSubAdminName = 'Company Support';
        }
        return u;
      })
      .filter(u => Boolean(u.role && (u.email || u.fullName)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function sanitizeAndDeduplicateUsers(): Promise<void> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    const allUsers = snap.docs.map(d => ({ docId: d.id, ...d.data() } as UserProfile & { docId: string }));
    
    // Collect all sub admin & super admin emails
    const adminEmails = new Set<string>([
      'admin@gmail.com',
      'ebukaesieme@gmail.com',
      'subadmin@expresscargo.com'
    ]);

    allUsers.forEach(u => {
      if ((u.role === 'sub_admin' || u.role === 'super_admin') && u.email) {
        adminEmails.add(u.email.toLowerCase().trim());
      }
    });

    // Remove any accidental customer documents created with a sub-admin or super-admin email
    for (const u of allUsers) {
      const email = (u.email || '').toLowerCase().trim();
      if (u.role === 'customer' && adminEmails.has(email)) {
        console.warn(`Cleaning up duplicate customer document with admin email: ${u.docId} (${email})`);
        await deleteDoc(doc(db, 'users', u.docId));
      }
    }

    // Purge any auto-sent or template messages from the database
    const messagesSnap = await getDocs(collection(db, 'messages'));
    for (const msgDoc of messagesSnap.docs) {
      const data = msgDoc.data() as ChatMessage;
      const text = data.text || '';
      if (
        text.includes('welcome to International Express Cargo') ||
        text.includes('dedicated logistics dispatcher') ||
        text.includes('Welcome to our official cargo logistics portal') ||
        text.includes('avionics crate clears New York customs') ||
        text.includes('I am Marcus') ||
        text.includes('Thank you Marcus') ||
        text.includes('Marcus Vance')
      ) {
        await deleteDoc(doc(db, 'messages', msgDoc.id));
      }
    }

    // Clear template lastMessage from conversations
    const convSnap = await getDocs(collection(db, 'conversations'));
    for (const cDoc of convSnap.docs) {
      const cData = cDoc.data() as Conversation;
      if (
        cData.lastMessage &&
        (cData.lastMessage.includes('welcome to International Express Cargo') ||
         cData.lastMessage.includes('transatlantic Boeing') ||
         cData.lastMessage.includes('joined the channel') ||
         cData.lastMessage.includes('avionics crate') ||
         cData.lastMessage.includes('Marcus'))
      ) {
        await updateDoc(doc(db, 'conversations', cDoc.id), {
          lastMessage: '',
          updatedAt: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.warn('Error during user sanitization:', error);
  }
}

export async function getSubAdmins(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    const all = snap.docs
      .map(d => ({ ...(d.data() as UserProfile), uid: (d.data() as UserProfile).uid || d.id }))
      .filter(u => Boolean(u.role && (u.email || u.fullName)));
    
    const seenEmails = new Set<string>();
    const subAdmins: UserProfile[] = [];

    for (const u of all) {
      if (u.role === 'sub_admin') {
        const email = (u.email || '').toLowerCase().trim();
        const dedupeKey = email || u.uid;
        if (!seenEmails.has(dedupeKey)) {
          seenEmails.add(dedupeKey);
          subAdmins.push(u);
        }
      }
    }
    return subAdmins;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getCustomers(subAdminId?: string): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    
    // Collect all sub admin & super admin emails
    const adminEmails = new Set<string>([
      'admin@gmail.com',
      'ebukaesieme@gmail.com',
      'subadmin@expresscargo.com'
    ]);

    snap.docs.forEach(d => {
      const u = d.data() as UserProfile;
      if (u.role === 'sub_admin' || u.role === 'super_admin') {
        if (u.email) adminEmails.add(u.email.toLowerCase().trim());
      }
    });

    const all = snap.docs
      .map(d => {
        const raw = d.data() as UserProfile;
        const u: UserProfile = {
          ...raw,
          uid: d.id,
          role: raw.role || 'customer',
          fullName: raw.fullName || raw.email || 'Customer'
        };
        if (u.assignedSubAdminName && (u.assignedSubAdminName.includes('Regional Dispatch Lead') || u.assignedSubAdminName.includes('Marcus Vance'))) {
          u.assignedSubAdminName = 'Company Support';
        }
        return u;
      })
      .filter(u => Boolean(u.email || u.fullName));

    // Include every non-admin user account created (explicitly 'customer' or missing role)
    const customers = all.filter(u =>
      u.role !== 'super_admin' &&
      u.role !== 'sub_admin' &&
      !adminEmails.has((u.email || '').toLowerCase().trim())
    );

    customers.sort((a, b) => {
      const aUnassigned = !a.assignedSubAdminId || a.assignedSubAdminId === '' || a.assignedSubAdminId === 'unassigned';
      const bUnassigned = !b.assignedSubAdminId || b.assignedSubAdminId === '' || b.assignedSubAdminId === 'unassigned';
      if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    if (subAdminId) {
      return customers.filter(c => c.assignedSubAdminId === subAdminId);
    }
    return customers;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateUserSuspension(uid: string, isSuspended: boolean): Promise<void> {
  const path = `users/${uid}`;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        isSuspended,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
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
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'users', customerId),
      {
        uid: customerId,
        assignedSubAdminId: newSubAdminId,
        assignedSubAdminName: newSubAdminName,
        updatedAt: now
      },
      { merge: true }
    );

    // Update existing conversations for this customer, or create one linked to the assigned Sub-Admin
    const convQuery = query(collection(db, 'conversations'), where('customerId', '==', customerId));
    const convSnap = await getDocs(convQuery);
    if (!convSnap.empty) {
      for (const d of convSnap.docs) {
        await updateDoc(doc(db, 'conversations', d.id), {
          subAdminId: newSubAdminId,
          subAdminName: newSubAdminName,
          updatedAt: now
        });
      }
    } else {
      const custDoc = await getDoc(doc(db, 'users', customerId));
      const custData = custDoc.data() as UserProfile | undefined;
      const convId = `conv_${customerId}`;
      await setDoc(doc(db, 'conversations', convId), cleanFirestoreData({
        id: convId,
        customerId,
        customerName: custData?.fullName || 'Customer Consignee',
        customerEmail: custData?.email || '',
        subAdminId: newSubAdminId,
        subAdminName: newSubAdminName,
        lastMessage: '',
        lastMessageTime: now,
        unreadCustomerCount: 0,
        unreadAdminCount: 0,
        createdAt: now,
        updatedAt: now
      }));
    }

    // Assign any unassigned shipments of this customer to the assigned Sub-Admin
    try {
      const shipQuery = query(collection(db, 'shipments'), where('customerId', '==', customerId));
      const shipSnap = await getDocs(shipQuery);
      for (const s of shipSnap.docs) {
        const sData = s.data();
        if (!sData.subAdminId || sData.subAdminId === '' || sData.subAdminId === 'unassigned') {
          await updateDoc(doc(db, 'shipments', s.id), {
            subAdminId: newSubAdminId,
            subAdminName: newSubAdminName,
            updatedAt: now
          });
        }
      }
    } catch (shipErr) {
      console.warn('Notice assigning customer shipments to sub admin:', shipErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getUnassignedCustomers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    const all = snap.docs.map(d => d.data() as UserProfile);
    const customers = all.filter(u => u.role === 'customer');
    return customers.filter(c => !c.assignedSubAdminId || c.assignedSubAdminId === '' || c.assignedSubAdminId === 'unassigned');
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
      const convId = `conv_${customerId}`;
      await setDoc(doc(db, 'conversations', convId), cleanFirestoreData({
        id: convId,
        customerId,
        customerName: custData?.fullName || 'Customer Consignee',
        customerEmail: custData?.email || '',
        subAdminId,
        subAdminName,
        lastMessage: '',
        lastMessageTime: now,
        unreadCountSuperAdmin: 0,
        unreadCountSubAdmin: 0,
        unreadCountCustomer: 0,
        createdAt: now,
        updatedAt: now
      }));
    }

    // Automatically assign any of this customer's unassigned shipments to the accepting Sub Admin
    try {
      const shipQuery = query(collection(db, 'shipments'), where('customerId', '==', customerId));
      const shipSnap = await getDocs(shipQuery);
      for (const s of shipSnap.docs) {
        const sData = s.data();
        if (!sData.subAdminId || sData.subAdminId === '' || sData.subAdminId === 'unassigned') {
          await updateDoc(doc(db, 'shipments', s.id), {
            subAdminId: subAdminId,
            subAdminName: subAdminName,
            updatedAt: now
          });
        }
      }
    } catch (shipErr) {
      console.warn('Notice assigning customer shipments to sub admin:', shipErr);
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

export async function getDeletedAccountRegistry(): Promise<{ uids: Set<string>; emails: Set<string> }> {
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'deleted_accounts'));
    if (!snap.exists()) {
      return { uids: new Set(), emails: new Set() };
    }
    const data = snap.data() as { uids?: string[]; emails?: string[] };
    return {
      uids: new Set((data.uids || []).map(v => String(v).trim()).filter(Boolean)),
      emails: new Set((data.emails || []).map(v => String(v).toLowerCase().trim()).filter(Boolean))
    };
  } catch {
    return { uids: new Set(), emails: new Set() };
  }
}

export async function isAccountDeleted(uid?: string, email?: string): Promise<boolean> {
  const registry = await getDeletedAccountRegistry();
  const cleanUid = (uid || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  if (cleanUid && registry.uids.has(cleanUid)) return true;
  if (cleanEmail && registry.emails.has(cleanEmail)) return true;
  return false;
}

export async function unmarkAccountDeleted(uid?: string, email?: string): Promise<void> {
  try {
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    const cleanUid = (uid || '').trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    if (cleanUid) updates.uids = arrayRemove(cleanUid);
    if (cleanEmail) updates.emails = arrayRemove(cleanEmail);
    if (cleanUid || cleanEmail) {
      await setDoc(doc(db, 'system_settings', 'deleted_accounts'), updates, { merge: true });
    }
  } catch {
    // silent
  }
}

// Internal cleanup helper for UID migration or duplicate removal without blacklisting the account email
export async function deleteUserDocOnly(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteUser(uid: string, email?: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    let targetEmail = (email || '').toLowerCase().trim();
    const matchedDocIds = new Set<string>([uid]);
    const matchedUids = new Set<string>([uid]);

    // 1. Inspect direct document first to capture email if caller didn't pass it
    try {
      const directSnap = await getDoc(doc(db, 'users', uid));
      if (directSnap.exists()) {
        const d = directSnap.data() as UserProfile;
        if (!targetEmail && d.email) {
          targetEmail = d.email.toLowerCase().trim();
        }
        if (d.uid) matchedUids.add(d.uid);
      }
    } catch {
      // continue to full scan
    }

    // 2. Scan users collection for ALL duplicate documents matching either docId, uid field, or email
    try {
      const allSnap = await getDocs(collection(db, 'users'));
      for (const userDoc of allSnap.docs) {
        const data = userDoc.data() as UserProfile;
        const docEmail = (data.email || '').toLowerCase().trim();
        const isSameUid = userDoc.id === uid || data.uid === uid;
        const isSameEmail = Boolean(targetEmail && docEmail && docEmail === targetEmail);
        if (isSameUid || isSameEmail) {
          matchedDocIds.add(userDoc.id);
          if (data.uid) matchedUids.add(data.uid);
          if (!targetEmail && docEmail) targetEmail = docEmail;
        }
      }
    } catch (scanErr) {
      console.warn('Duplicate user scan notice during deletion:', scanErr);
    }

    // 3. Delete every matching user document so hidden duplicates never resurface
    await Promise.all(
      Array.from(matchedDocIds).map(docId => deleteDoc(doc(db, 'users', docId)).catch(() => {}))
    );

    // 4. Record permanently deleted UIDs and email in deleted_accounts registry so seeding or cached auth never resurrects it
    try {
      const registryUpdate: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };
      const uidList = Array.from(matchedUids).filter(Boolean);
      if (uidList.length > 0) {
        registryUpdate.uids = arrayUnion(...uidList);
      }
      if (targetEmail) {
        registryUpdate.emails = arrayUnion(targetEmail);
      }
      await setDoc(doc(db, 'system_settings', 'deleted_accounts'), registryUpdate, { merge: true });
    } catch (regErr) {
      console.warn('Deleted accounts registry update notice:', regErr);
    }

    // 5. Clean up orphaned conversations for deleted customer accounts
    try {
      const convSnap = await getDocs(collection(db, 'conversations'));
      const convDeletes: Promise<void>[] = [];
      for (const cDoc of convSnap.docs) {
        const c = cDoc.data() as Conversation;
        const cEmail = (c.customerEmail || '').toLowerCase().trim();
        const matchesCustomer =
          matchedUids.has(c.customerId) ||
          matchedDocIds.has(c.customerId) ||
          Array.from(matchedUids).some(id => cDoc.id === `conv_${id}`) ||
          Boolean(targetEmail && cEmail && cEmail === targetEmail);
        if (matchesCustomer) {
          convDeletes.push(deleteDoc(doc(db, 'conversations', cDoc.id)).catch(() => {}));
        }
      }
      if (convDeletes.length > 0) {
        await Promise.all(convDeletes);
      }
    } catch (convErr) {
      console.warn('Conversation cleanup notice during user deletion:', convErr);
    }
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
    case 'picked_up':
      return 'Package Picked Up from Origin Consignor';
    case 'processing':
      return 'Cargo Processing, Weighing & Security Screening';
    case 'sorting_facility':
      return 'Arrived at Central Sorting & Consolidation Facility';
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
    case 'delayed':
      return 'Shipment Delayed - Transit Exception';
    case 'failed':
      return 'Delivery Attempt Failed - Notice Left';
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

/* ---------------- ITEMIZED FEES (MULTI-FEE SUPPORT) ---------------- */

export async function addItemizedFee(
  shipmentId: string,
  fee: Omit<ItemizedFee, 'id' | 'addedAt'>,
  actorName: string
): Promise<string> {
  const path = `shipments/${shipmentId}`;
  try {
    const snap = await getDoc(doc(db, 'shipments', shipmentId));
    if (!snap.exists()) throw new Error('Shipment not found.');
    const shipment = snap.data() as Shipment;

    const feeId = 'fee_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newFee: ItemizedFee = {
      ...fee,
      id: feeId,
      addedBy: actorName,
      addedAt: new Date().toISOString()
    };

    const currentFees: ItemizedFee[] = Array.isArray(shipment.itemizedFees) ? [...shipment.itemizedFees] : [];
    
    // If this is the first time itemized fees are added and there was an existing customsDutyAmount, migrate it seamlessly
    if (currentFees.length === 0 && shipment.customsDutyAmount > 0) {
      currentFees.push({
        id: 'legacy_duty_' + Date.now(),
        title: 'Customs Duty Fee',
        purpose: shipment.feePurpose || shipment.customsNotes || 'Standard border clearance inspection. shipment has been assessed duties and taxes totaling.',
        amount: shipment.customsDutyAmount,
        currency: shipment.customsDutyCurrency || 'USD',
        status: shipment.customsPaymentStatus === 'paid' ? 'paid' : 'pending',
        addedBy: 'Logistics System',
        addedAt: shipment.createdAt || new Date().toISOString()
      });
    }

    currentFees.push(newFee);

    // Compute updated totals
    const pendingTotal = currentFees
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const newPaymentStatus: CustomsPaymentStatus = pendingTotal > 0 ? 'pending' : 'paid';

    await updateDoc(doc(db, 'shipments', shipmentId), cleanFirestoreData({
      itemizedFees: currentFees,
      customsDutyAmount: pendingTotal,
      customsPaymentStatus: newPaymentStatus,
      updatedAt: new Date().toISOString()
    }));

    // Generate real-time notification for customer
    if (shipment.customerId) {
      await createNotification({
        recipientId: shipment.customerId,
        recipientRole: 'customer',
        type: 'delivery_update',
        title: 'New Itemized Fee Added',
        message: `An itemized fee of $${fee.amount.toLocaleString()} for "${fee.title}" has been issued on waybill ${shipment.trackingNumber}. Purpose: ${fee.purpose}.`,
        linkId: shipment.id,
        read: false
      });
    }

    await addAuditLog(
      'subadmin_add_fee',
      actorName,
      'sub_admin',
      `Added fee "${fee.title}" ($${fee.amount}) with purpose "${fee.purpose}" on consignment ${shipment.trackingNumber}`,
      shipmentId
    );

    return feeId;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateItemizedFee(
  shipmentId: string,
  feeId: string,
  updates: Partial<ItemizedFee>,
  actorName: string
): Promise<void> {
  const path = `shipments/${shipmentId}`;
  try {
    const snap = await getDoc(doc(db, 'shipments', shipmentId));
    if (!snap.exists()) throw new Error('Shipment not found.');
    const shipment = snap.data() as Shipment;

    const currentFees: ItemizedFee[] = Array.isArray(shipment.itemizedFees) ? [...shipment.itemizedFees] : [];
    const idx = currentFees.findIndex(f => f.id === feeId);
    if (idx === -1) throw new Error('Fee not found.');

    currentFees[idx] = { ...currentFees[idx], ...updates };

    const pendingTotal = currentFees
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const newPaymentStatus: CustomsPaymentStatus = pendingTotal > 0 ? 'pending' : 'paid';

    await updateDoc(doc(db, 'shipments', shipmentId), cleanFirestoreData({
      itemizedFees: currentFees,
      customsDutyAmount: pendingTotal,
      customsPaymentStatus: newPaymentStatus,
      updatedAt: new Date().toISOString()
    }));

    await addAuditLog(
      'subadmin_update_fee',
      actorName,
      'sub_admin',
      `Updated fee "${currentFees[idx].title}" on consignment ${shipment.trackingNumber}`,
      shipmentId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteItemizedFee(
  shipmentId: string,
  feeId: string,
  actorName: string
): Promise<void> {
  const path = `shipments/${shipmentId}`;
  try {
    const snap = await getDoc(doc(db, 'shipments', shipmentId));
    if (!snap.exists()) throw new Error('Shipment not found.');
    const shipment = snap.data() as Shipment;

    const currentFees: ItemizedFee[] = (shipment.itemizedFees || []).filter(f => f.id !== feeId);

    const pendingTotal = currentFees
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const newPaymentStatus: CustomsPaymentStatus = pendingTotal > 0 ? 'pending' : 'paid';

    await updateDoc(doc(db, 'shipments', shipmentId), cleanFirestoreData({
      itemizedFees: currentFees,
      customsDutyAmount: pendingTotal,
      customsPaymentStatus: newPaymentStatus,
      updatedAt: new Date().toISOString()
    }));

    await addAuditLog(
      'subadmin_delete_fee',
      actorName,
      'sub_admin',
      `Deleted fee ID ${feeId} from consignment ${shipment.trackingNumber}`,
      shipmentId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function payItemizedFee(
  shipmentId: string,
  feeId: string,
  paymentMethod = 'Online Portal Checkout',
  reference?: string
): Promise<void> {
  const path = `shipments/${shipmentId}`;
  try {
    const snap = await getDoc(doc(db, 'shipments', shipmentId));
    if (!snap.exists()) throw new Error('Shipment not found.');
    const shipment = snap.data() as Shipment;

    const ref = reference || 'REF-' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    const currentFees: ItemizedFee[] = Array.isArray(shipment.itemizedFees) ? [...shipment.itemizedFees] : [];
    const feeItem = currentFees.find(f => f.id === feeId);
    if (!feeItem) throw new Error('Fee not found.');

    feeItem.status = 'paid';
    feeItem.paidAt = now;
    feeItem.paymentReference = ref;

    const pendingTotal = currentFees
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const newPaymentStatus: CustomsPaymentStatus = pendingTotal > 0 ? 'pending' : 'paid';

    await updateDoc(doc(db, 'shipments', shipmentId), cleanFirestoreData({
      itemizedFees: currentFees,
      customsDutyAmount: pendingTotal,
      customsPaymentStatus: newPaymentStatus,
      customsReference: ref,
      updatedAt: now
    }));

    // Record formal payment record
    await recordPayment({
      shipmentId,
      trackingNumber: shipment.trackingNumber,
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      amount: feeItem.amount,
      currency: feeItem.currency,
      paymentMethod,
      status: 'confirmed',
      reference: ref,
      notes: `Settled fee: ${feeItem.title}. Purpose: ${feeItem.purpose}`
    });

    // Notify Sub Admin & Customer
    if (shipment.subAdminId) {
      await createNotification({
        recipientId: shipment.subAdminId,
        recipientRole: 'sub_admin',
        type: 'delivery_update',
        title: 'Fee Paid by Customer',
        message: `Customer ${shipment.customerName} settled fee "${feeItem.title}" ($${feeItem.amount}) on ${shipment.trackingNumber}.`,
        linkId: shipmentId,
        read: false
      });
    }

    await addAuditLog(
      'customer_pay_fee',
      shipment.customerName || 'Customer',
      'customer',
      `Customer settled fee "${feeItem.title}" ($${feeItem.amount}) with reference ${ref}`,
      shipmentId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function payAllOutstandingFees(
  shipmentId: string,
  paymentMethod = 'Full Outstanding Settlement',
  reference?: string
): Promise<void> {
  const path = `shipments/${shipmentId}`;
  try {
    const snap = await getDoc(doc(db, 'shipments', shipmentId));
    if (!snap.exists()) throw new Error('Shipment not found.');
    const shipment = snap.data() as Shipment;

    const ref = reference || 'FULL-' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    const currentFees: ItemizedFee[] = Array.isArray(shipment.itemizedFees) ? [...shipment.itemizedFees] : [];
    let settledAmount = 0;

    currentFees.forEach(f => {
      if (f.status === 'pending') {
        f.status = 'paid';
        f.paidAt = now;
        f.paymentReference = ref;
        settledAmount += f.amount || 0;
      }
    });

    if (currentFees.length === 0 && shipment.customsDutyAmount > 0) {
      settledAmount = shipment.customsDutyAmount;
    }

    await updateDoc(doc(db, 'shipments', shipmentId), cleanFirestoreData({
      itemizedFees: currentFees,
      customsDutyAmount: 0,
      customsPaymentStatus: 'paid',
      customsReference: ref,
      updatedAt: now
    }));

    await recordPayment({
      shipmentId,
      trackingNumber: shipment.trackingNumber,
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      amount: settledAmount,
      currency: shipment.customsDutyCurrency || 'USD',
      paymentMethod,
      status: 'confirmed',
      reference: ref,
      notes: `Settled all outstanding balance of $${settledAmount.toLocaleString()} on ${shipment.trackingNumber}`
    });

    if (shipment.subAdminId) {
      await createNotification({
        recipientId: shipment.subAdminId,
        recipientRole: 'sub_admin',
        type: 'delivery_update',
        title: 'Full Balance Settled',
        message: `Customer ${shipment.customerName} settled all outstanding balance ($${settledAmount.toLocaleString()}) on ${shipment.trackingNumber}.`,
        linkId: shipmentId,
        read: false
      });
    }

    await addAuditLog(
      'customer_pay_all_fees',
      shipment.customerName || 'Customer',
      'customer',
      `Customer settled full balance ($${settledAmount.toLocaleString()}) on consignment ${shipment.trackingNumber}`,
      shipmentId
    );
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
      lastMessage: '',
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

export function isMessageVisibleToSubAdmin(m: Pick<ChatMessage, 'senderRole' | 'isDeleted' | 'hiddenFromSubAdmin' | 'isDirectToCustomer' | 'sharedWithSubAdmin' | 'moderationStatus'>): boolean {
  if (m.isDeleted) return false;
  if (m.senderRole === 'super_admin') {
    if (m.hiddenFromSubAdmin === true) return false;
    return m.sharedWithSubAdmin === true;
  }
  if (m.hiddenFromSubAdmin === true || m.isDirectToCustomer === true || m.sharedWithSubAdmin === false) {
    return false;
  }
  if (m.senderRole === 'sub_admin') {
    return true;
  }
  return (
    m.sharedWithSubAdmin === true &&
    m.moderationStatus !== 'rejected' &&
    m.moderationStatus !== 'pending_moderation'
  );
}

export async function sendMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<string> {
  const path = 'messages';
  try {
    const now = new Date().toISOString();
    const isCustomer = msg.senderRole === 'customer';
    const isSubAdmin = msg.senderRole === 'sub_admin';
    const hasAttachment = Boolean(msg.attachmentUrl || msg.attachmentType);

    // Rule 1: Whenever a customer sends a photo, image, video, document, or receipt,
    // ALWAYS hold it for Super Admin access approval before it arrives at Sub Admin dashboard.
    // Rule 2: All customer text messages stay AUTO ON for Sub Admin to see until Super Admin
    // manually turns Customer Messages to Sub Admin OFF in system settings.
    // Rule 3: ANY message (text or attachment) sent by a Sub Admin to a Customer MUST ALWAYS
    // wait for Super Admin approval before the Customer can receive it.
    let normalizedMsg: Omit<ChatMessage, 'id' | 'createdAt'> = msg;
    if (isSubAdmin) {
      normalizedMsg = {
        ...msg,
        sharedWithSubAdmin: true,
        hiddenFromSubAdmin: false,
        isDirectToCustomer: false,
        moderationStatus: 'pending_moderation'
      };
    } else if (isCustomer && hasAttachment) {
      normalizedMsg = {
        ...msg,
        sharedWithSubAdmin: false,
        hiddenFromSubAdmin: true,
        moderationStatus: 'pending_moderation'
      };
    } else if (isCustomer) {
      let autoOnForSubAdmin = true;
      try {
        const liveSettings = await getSystemSettings();
        autoOnForSubAdmin = liveSettings.customerMessagesToSubAdminAutoOn !== false;
      } catch {
        autoOnForSubAdmin = msg.sharedWithSubAdmin !== false;
      }
      normalizedMsg = {
        ...msg,
        sharedWithSubAdmin: autoOnForSubAdmin,
        hiddenFromSubAdmin: !autoOnForSubAdmin,
        moderationStatus: autoOnForSubAdmin ? 'approved' : 'pending_moderation'
      };
    }

    if (normalizedMsg.attachmentUrl && normalizedMsg.attachmentUrl.length > 920_000) {
      throw new Error('Attachment is too large (over Firestore 1MB limit). Please send a photo or screenshot.');
    }

    const dataToSave = cleanFirestoreData({
      ...normalizedMsg,
      createdAt: now
    });
    const docRef = await addDoc(collection(db, 'messages'), dataToSave);

    // Update conversation last message and unread counts
    if (normalizedMsg.moderationStatus !== 'rejected') {
      const msgSummary =
        normalizedMsg.text ||
        (normalizedMsg.attachmentType === 'image'
          ? 'Sent photo / receipt'
          : normalizedMsg.attachmentType === 'document'
          ? 'Sent receipt / document'
          : normalizedMsg.attachmentType === 'video'
          ? 'Sent video'
          : 'Sent attachment');
      const visibleToSubAdmin = isMessageVisibleToSubAdmin(normalizedMsg);
      const awaitingCustomerApproval = isSubAdmin && normalizedMsg.moderationStatus === 'pending_moderation';

      const convRef = doc(db, 'conversations', normalizedMsg.conversationId);
      const convSnap = await getDoc(convRef);
      let curUnreadCust = 0;
      let curUnreadAdmin = 0;
      if (convSnap.exists()) {
        const cData = convSnap.data() as Conversation;
        curUnreadCust = cData.unreadCustomerCount || 0;
        curUnreadAdmin = cData.unreadAdminCount || 0;
      }

      // If Sub Admin message is pending Super Admin approval:
      // - Do NOT update lastMessage or unreadCustomerCount so Customer does NOT see it or get notified yet
      // - DO update subAdminLastMessage so Sub Admin sees their sent message
      const updateData: Record<string, any> = {
        updatedAt: now
      };

      if (!awaitingCustomerApproval) {
        updateData.lastMessage = msgSummary;
        updateData.lastMessageTime = now;
        updateData.unreadCustomerCount = isCustomer ? curUnreadCust : (curUnreadCust + 1);
      }

      if (visibleToSubAdmin) {
        updateData.subAdminLastMessage = msgSummary;
        updateData.unreadAdminCount = isCustomer ? (curUnreadAdmin + 1) : curUnreadAdmin;
      }

      await updateDoc(convRef, updateData).catch(err => console.warn('Conversation count update notice:', err));
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markConversationRead(conversationId: string, role: UserRole): Promise<void> {
  const path = `conversations/${conversationId}`;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    if (role === 'customer') {
      await updateDoc(convRef, { unreadCustomerCount: 0 });
    } else {
      await updateDoc(convRef, { unreadAdminCount: 0 });
    }
  } catch (e) {
    // silent catch
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
      
      // Filter out deleted messages
      msgs = msgs.filter(m => !m.isDeleted);

      // If user is sub_admin, strictly apply Sub Admin visibility filter
      if (userRole === 'sub_admin') {
        msgs = msgs.filter(isMessageVisibleToSubAdmin);
      }

      // If user is customer, strictly hide rejected messages AND any Sub-Admin message awaiting Super Admin approval
      if (userRole === 'customer') {
        msgs = msgs.filter(m => {
          if (m.moderationStatus === 'rejected') return false;
          if (m.senderRole === 'sub_admin' && m.moderationStatus === 'pending_moderation') return false;
          return true;
        });
      }

      // Sort ascending by creation time
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(msgs);
    },
    (error) => {
      console.warn('Real-time message subscription notice:', error?.message || error);
    }
  );
}

export async function getPendingModerationMessages(): Promise<ChatMessage[]> {
  const path = 'messages';
  try {
    const q = query(collection(db, 'messages'), where('moderationStatus', '==', 'pending_moderation'));
    const snap = await getDocs(q);
    const msgs = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
      .filter(m => !m.isDeleted);
    return msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToPendingModerationMessages(callback: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'messages'), where('moderationStatus', '==', 'pending_moderation'));
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
        .filter(m => !m.isDeleted)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(msgs);
    },
    (err) => {
      console.warn('subscribeToPendingModerationMessages notice:', err);
    }
  );
}

export async function moderateMessage(
  messageId: string,
  status: 'approved' | 'rejected' | 'pending_moderation',
  conversationId: string,
  messageText: string,
  reason?: string
): Promise<void> {
  const path = `messages/${messageId}`;
  try {
    const now = new Date().toISOString();
    const msgRef = doc(db, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    const existingMsg = msgSnap.exists() ? (msgSnap.data() as ChatMessage) : null;
    const isSubAdminOutgoing = existingMsg?.senderRole === 'sub_admin';
    const isApproved = status === 'approved';
    const targetConvId = conversationId || existingMsg?.conversationId || '';

    if (isSubAdminOutgoing) {
      // Sub-Admin -> Customer approval flow:
      // Sub-Admin always retains visibility of their own sent message; Customer only receives it when approved.
      await updateDoc(msgRef, {
        moderationStatus: status,
        sharedWithSubAdmin: true,
        hiddenFromSubAdmin: false,
        rejectionReason: reason || ''
      });

      if (targetConvId) {
        try {
          const convRef = doc(db, 'conversations', targetConvId);
          const convSnap = await getDoc(convRef);
          const curUnreadCust = convSnap.exists() ? ((convSnap.data() as Conversation).unreadCustomerCount || 0) : 0;

          const q = query(collection(db, 'messages'), where('conversationId', '==', targetConvId));
          const remSnap = await getDocs(q);
          const customerVisibleMsgs = remSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
            .filter(m =>
              !m.isDeleted &&
              m.moderationStatus !== 'rejected' &&
              !(m.senderRole === 'sub_admin' && m.moderationStatus === 'pending_moderation')
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          const latestCust = customerVisibleMsgs[0];
          const custPreview = latestCust
            ? (
                (latestCust.showOriginalToCustomer
                  ? latestCust.originalText || latestCust.text
                  : latestCust.customerDisplayText || latestCust.text) ||
                (latestCust.attachmentType ? `[${latestCust.attachmentType.toUpperCase()}]` : '')
              )
            : '';

          const convUpdate: Record<string, any> = {
            lastMessage: custPreview,
            updatedAt: now
          };

          if (isApproved) {
            const deliveredText =
              (existingMsg?.showOriginalToCustomer
                ? existingMsg?.originalText || existingMsg?.text
                : existingMsg?.customerDisplayText || existingMsg?.text) ||
              messageText ||
              custPreview ||
              'Message approved';
            convUpdate.lastMessage = deliveredText;
            convUpdate.lastMessageTime = now;
            convUpdate.unreadCustomerCount = curUnreadCust + 1;
          }

          await updateDoc(convRef, convUpdate);
        } catch (e) {
          console.warn('Notice updating conversation on sub-admin approval:', e);
        }
      }
      return;
    }

    // Customer -> Sub-Admin access flow (existing behavior preserved)
    await updateDoc(msgRef, {
      moderationStatus: status,
      sharedWithSubAdmin: isApproved,
      hiddenFromSubAdmin: !isApproved,
      rejectionReason: reason || ''
    });

    if (targetConvId) {
      try {
        const convRef = doc(db, 'conversations', targetConvId);
        const convSnap = await getDoc(convRef);
        const curUnreadAdmin = convSnap.exists() ? ((convSnap.data() as Conversation).unreadAdminCount || 0) : 0;

        const q = query(collection(db, 'messages'), where('conversationId', '==', targetConvId));
        const remSnap = await getDocs(q);
        const visibleMsgs = remSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
          .filter(isMessageVisibleToSubAdmin)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const latestSub = visibleMsgs[0];
        const subPreview = latestSub
          ? (latestSub.originalText || latestSub.text || (latestSub.attachmentType ? `[${latestSub.attachmentType.toUpperCase()}]` : ''))
          : '';

        const convUpdate: Record<string, any> = {
          subAdminLastMessage: subPreview,
          updatedAt: now
        };

        if (isApproved) {
          convUpdate.lastMessage = messageText || subPreview || 'Photo / receipt approved';
          convUpdate.lastMessageTime = now;
          convUpdate.unreadAdminCount = curUnreadAdmin + 1;
        }

        await updateDoc(convRef, convUpdate);
      } catch (e) {
        console.warn('Notice updating conversation on moderation:', e);
      }
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

    // Preserve the original sub admin message text so sub admin continues to see it
    const originalText = current.originalText || current.text;

    await updateDoc(doc(db, 'messages', messageId), {
      customerDisplayText: newText,
      originalText: originalText,
      showOriginalToCustomer: false,
      isEdited: true,
      editedAt: new Date().toISOString(),
      editedBy
    });

    // Update conversation lastMessage so customer sees the new message preview,
    // while subAdminLastMessage is ONLY updated if this message is visible to Sub-Admin!
    if (current.conversationId) {
      try {
        const convUpdate: Record<string, any> = {
          lastMessage: newText,
          updatedAt: new Date().toISOString()
        };
        if (isMessageVisibleToSubAdmin(current)) {
          convUpdate.subAdminLastMessage = originalText;
        }
        await updateDoc(doc(db, 'conversations', current.conversationId), convUpdate);
      } catch (convErr) {
        console.warn('Notice updating conversation preview:', convErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Silent edit for Sub-Admin's own written message (enabled by Super Admin).
 * Updates the message text cleanly so after editing it remains completely like it was NEVER edited
 * for both Customer and Sub-Admin:
 * - isEdited stays false
 * - editedAt / editedBy are removed
 * - createdAt original timestamp is preserved untouched
 * - conversation preview updates only if this is the latest message (keeping original lastMessageTime)
 * - Super-Admin-only archive (silentOriginalText & silentEditHistory) preserves every old version before silent edits
 */
export async function silentEditSubAdminMessage(
  messageId: string,
  newText: string,
  editedByName?: string,
  editedByRole?: UserRole
): Promise<{
  silentOriginalText: string;
  silentEditHistory: NonNullable<ChatMessage['silentEditHistory']>;
  lastSilentEditedAt: string;
}> {
  const path = `messages/${messageId}`;
  const trimmed = newText.trim();
  if (!trimmed) {
    throw new Error('Message text cannot be empty.');
  }
  try {
    const msgRef = doc(db, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) {
      throw new Error('Message no longer exists.');
    }
    const current = snap.data() as ChatMessage;
    if (current.senderRole !== 'sub_admin') {
      throw new Error('Only Sub-Admin written messages can be updated with this action.');
    }

    const now = new Date().toISOString();
    const previousText = current.text || current.originalText || '';
    const firstOriginal = current.silentOriginalText || previousText;
    const existingHistory = Array.isArray(current.silentEditHistory) ? current.silentEditHistory : [];
    const nextHistory =
      previousText && previousText !== trimmed
        ? [
            ...existingHistory,
            {
              previousText,
              editedAt: now,
              editedBy: editedByName || current.senderName || 'Sub-Admin',
              editedByRole: editedByRole || 'sub_admin'
            }
          ]
        : existingHistory;

    await updateDoc(msgRef, {
      text: trimmed,
      originalText: trimmed,
      customerDisplayText: trimmed,
      isEdited: false,
      showOriginalToCustomer: false,
      editedAt: deleteField(),
      editedBy: deleteField(),
      silentOriginalText: firstOriginal,
      silentEditHistory: nextHistory,
      lastSilentEditedAt: now
    });

    if (current.conversationId) {
      try {
        const q = query(collection(db, 'messages'), where('conversationId', '==', current.conversationId));
        const allSnap = await getDocs(q);
        const nonDeleted = allSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
          .filter(m => !m.isDeleted && m.moderationStatus !== 'rejected')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const customerVisible = nonDeleted.filter(
          m => !(m.senderRole === 'sub_admin' && m.moderationStatus === 'pending_moderation')
        );
        const convUpdate: Record<string, any> = {};
        if (customerVisible[0]?.id === messageId) {
          convUpdate.lastMessage = trimmed;
        }
        const subVisible = nonDeleted.filter(isMessageVisibleToSubAdmin);
        if (subVisible[0]?.id === messageId) {
          convUpdate.subAdminLastMessage = trimmed;
        }
        if (Object.keys(convUpdate).length > 0) {
          await updateDoc(doc(db, 'conversations', current.conversationId), convUpdate);
        }
      } catch (convErr) {
        console.warn('Notice updating conversation preview on silent edit:', convErr);
      }
    }

    return {
      silentOriginalText: firstOriginal,
      silentEditHistory: nextHistory,
      lastSilentEditedAt: now
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateSubAdminCanEditMessages(
  uid: string,
  canEdit: boolean,
  email?: string
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const now = new Date().toISOString();
    const docIdsToUpdate = new Set<string>([uid]);
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(d => {
        const data = d.data() as UserProfile;
        if (data.role === 'sub_admin' && (data.email || '').toLowerCase().trim() === normalizedEmail) {
          docIdsToUpdate.add(d.id);
        }
      });
    }

    await Promise.all(
      Array.from(docIdsToUpdate).map(id =>
        setDoc(
          doc(db, 'users', id),
          { canEditOwnMessages: canEdit, updatedAt: now },
          { merge: true }
        )
      )
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateAllSubAdminsCanEditMessages(
  canEdit: boolean,
  updatedBy: string
): Promise<void> {
  const path = 'system_settings/general';
  try {
    const now = new Date().toISOString();
    await updateSystemSettings({ subAdminCanEditOwnMessages: canEdit }, updatedBy);

    const subAdminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'sub_admin')));
    await Promise.all(
      subAdminsSnap.docs.map(d =>
        setDoc(
          doc(db, 'users', d.id),
          { canEditOwnMessages: canEdit, updatedAt: now },
          { merge: true }
        )
      )
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleMessageOriginalForCustomer(
  messageId: string,
  showOriginal: boolean
): Promise<void> {
  const path = `messages/${messageId}`;
  try {
    const snap = await getDoc(doc(db, 'messages', messageId));
    if (!snap.exists()) return;
    const current = snap.data() as ChatMessage;
    const originalText = current.originalText || current.text;
    const editedText = current.customerDisplayText || current.text;

    await updateDoc(doc(db, 'messages', messageId), {
      showOriginalToCustomer: showOriginal
    });

    if (current.conversationId) {
      try {
        const q = query(collection(db, 'messages'), where('conversationId', '==', current.conversationId));
        const remSnap = await getDocs(q);
        const nonDeleted = remSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
          .filter(
            m =>
              !m.isDeleted &&
              m.moderationStatus !== 'rejected' &&
              !(m.senderRole === 'sub_admin' && m.moderationStatus === 'pending_moderation')
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (nonDeleted[0]?.id === messageId) {
          await updateDoc(doc(db, 'conversations', current.conversationId), {
            lastMessage: showOriginal ? originalText : editedText,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (convErr) {
        console.warn('Notice updating conversation preview on old-message toggle:', convErr);
      }
    }
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
    const snap = await getDoc(doc(db, 'messages', messageId));
    const existingMsg = snap.exists() ? (snap.data() as ChatMessage) : null;
    const convId = existingMsg?.conversationId || '';
    const isSuperAdminMsg = existingMsg?.senderRole === 'super_admin';

    const updatePayload: Record<string, any> = {
      sharedWithSubAdmin: allowSubAdmin,
      hiddenFromSubAdmin: !allowSubAdmin,
      moderationStatus: isSuperAdminMsg
        ? 'approved'
        : (allowSubAdmin ? 'approved' : 'pending_moderation')
    };

    if (isSuperAdminMsg) {
      updatePayload.isDirectToCustomer = !allowSubAdmin;
    }

    await updateDoc(doc(db, 'messages', messageId), updatePayload);

    if (convId) {
      try {
        const convRef = doc(db, 'conversations', convId);
        const convSnap = await getDoc(convRef);
        const curUnreadAdmin = convSnap.exists() ? ((convSnap.data() as Conversation).unreadAdminCount || 0) : 0;

        const q = query(collection(db, 'messages'), where('conversationId', '==', convId));
        const remSnap = await getDocs(q);
        const visibleMsgs = remSnap.docs
          .map(d => d.data() as ChatMessage)
          .filter(isMessageVisibleToSubAdmin)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const latestSub = visibleMsgs[0];
        const convUpdate: Record<string, any> = {
          subAdminLastMessage: latestSub
            ? (latestSub.originalText || latestSub.text || (latestSub.attachmentType ? `[${latestSub.attachmentType.toUpperCase()}]` : ''))
            : '',
          updatedAt: new Date().toISOString()
        };

        // When Super Admin grants Sub-Admin access to a held customer photo/receipt/message, notify Sub-Admin dashboard
        if (allowSubAdmin && existingMsg?.senderRole === 'customer' && !existingMsg?.sharedWithSubAdmin) {
          convUpdate.unreadAdminCount = curUnreadAdmin + 1;
        }

        await updateDoc(convRef, convUpdate);
      } catch (e) {
        console.warn('Notice refreshing subAdminLastMessage on access toggle:', e);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMessage(messageId: string, deletedBy: string): Promise<void> {
  const path = `messages/${messageId}`;
  try {
    const snap = await getDoc(doc(db, 'messages', messageId));
    let convId = '';
    if (snap.exists()) {
      const data = snap.data() as ChatMessage;
      convId = data.conversationId;
    }

    // Permanently remove message from Firestore
    await deleteDoc(doc(db, 'messages', messageId));

    // Update conversation last message if needed
    if (convId) {
      try {
        const q = query(collection(db, 'messages'), where('conversationId', '==', convId));
        const remSnap = await getDocs(q);
        if (!remSnap.empty) {
          const remMsgs = remSnap.docs.map(d => d.data() as ChatMessage).filter(m => !m.isDeleted);
          if (remMsgs.length > 0) {
            remMsgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const latest = remMsgs[0];
            const subAdminVisible = remMsgs.filter(isMessageVisibleToSubAdmin);
            const latestSub = subAdminVisible[0];
            await updateDoc(doc(db, 'conversations', convId), {
              lastMessage: latest.customerDisplayText || latest.text || '',
              subAdminLastMessage: latestSub
                ? (latestSub.originalText || latestSub.text || (latestSub.attachmentType ? `[${latestSub.attachmentType.toUpperCase()}]` : ''))
                : '',
              lastMessageTime: latest.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          } else {
            await updateDoc(doc(db, 'conversations', convId), {
              lastMessage: '',
              subAdminLastMessage: '',
              updatedAt: new Date().toISOString()
            });
          }
        } else {
          await updateDoc(doc(db, 'conversations', convId), {
            lastMessage: '',
            subAdminLastMessage: '',
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('Notice updating conv on message deletion:', e);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


/* ---------------- SYSTEM SETTINGS & AUDIT LOGS ---------------- */

const CUSTOMER_AUTO_ON_POLICY_VERSION = 'auto_on_v1';

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'general',
  messageModeration: false,
  customerMessagesToSubAdminAutoOn: true,
  customerAutoOnPolicyVersion: CUSTOMER_AUTO_ON_POLICY_VERSION,
  subAdminCanEditOwnMessages: false,
  companyName: 'International Express Cargo',
  supportEmail: 'support@internationalexpresscargo.com',
  supportPhone: '+1 (800) 555-CARGO',
  announcement: 'Worldwide air and sea cargo services operational 24/7 across 220+ global hub destinations.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System'
};

function normalizeSystemSettings(raw?: Partial<SystemSettings> | null): SystemSettings {
  const base = { ...DEFAULT_SYSTEM_SETTINGS, ...(raw || {}), id: 'general' };
  let messageModeration: boolean;
  let customerMessagesToSubAdminAutoOn: boolean;

  // One-time migration: ensure customer messages to Sub Admin default to AUTO ON
  // until Super Admin explicitly turns it OFF manually.
  if (raw?.customerAutoOnPolicyVersion !== CUSTOMER_AUTO_ON_POLICY_VERSION) {
    customerMessagesToSubAdminAutoOn = true;
    messageModeration = false;
  } else if (typeof raw?.customerMessagesToSubAdminAutoOn === 'boolean') {
    customerMessagesToSubAdminAutoOn = raw.customerMessagesToSubAdminAutoOn;
    messageModeration = !raw.customerMessagesToSubAdminAutoOn;
  } else if (typeof raw?.messageModeration === 'boolean') {
    messageModeration = raw.messageModeration;
    customerMessagesToSubAdminAutoOn = !raw.messageModeration;
  } else {
    messageModeration = false;
    customerMessagesToSubAdminAutoOn = true;
  }

  return {
    ...base,
    messageModeration,
    customerMessagesToSubAdminAutoOn,
    customerAutoOnPolicyVersion: CUSTOMER_AUTO_ON_POLICY_VERSION,
    subAdminCanEditOwnMessages: Boolean(raw?.subAdminCanEditOwnMessages)
  };
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const path = 'system_settings/general';
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'general'));
    if (snap.exists()) {
      const raw = snap.data() as Partial<SystemSettings>;
      const normalized = normalizeSystemSettings(raw);
      if (raw?.customerAutoOnPolicyVersion !== CUSTOMER_AUTO_ON_POLICY_VERSION) {
        setDoc(
          doc(db, 'system_settings', 'general'),
          {
            customerMessagesToSubAdminAutoOn: true,
            messageModeration: false,
            customerAutoOnPolicyVersion: CUSTOMER_AUTO_ON_POLICY_VERSION
          },
          { merge: true }
        ).catch(() => {});
      }
      return normalized;
    }
    const defaultSettings = normalizeSystemSettings();
    await setDoc(doc(db, 'system_settings', 'general'), defaultSettings, { merge: true });
    return defaultSettings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToSystemSettings(callback: (settings: SystemSettings) => void) {
  return onSnapshot(
    doc(db, 'system_settings', 'general'),
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as Partial<SystemSettings>;
        const normalized = normalizeSystemSettings(raw);
        if (raw?.customerAutoOnPolicyVersion !== CUSTOMER_AUTO_ON_POLICY_VERSION) {
          setDoc(
            doc(db, 'system_settings', 'general'),
            {
              customerMessagesToSubAdminAutoOn: true,
              messageModeration: false,
              customerAutoOnPolicyVersion: CUSTOMER_AUTO_ON_POLICY_VERSION
            },
            { merge: true }
          ).catch(() => {});
        }
        callback(normalized);
      } else {
        const defaults = normalizeSystemSettings();
        setDoc(doc(db, 'system_settings', 'general'), defaults, { merge: true }).catch(() => {});
        callback(defaults);
      }
    },
    (err) => {
      console.warn('subscribeToSystemSettings notice:', err);
    }
  );
}

export async function updateSystemSettings(updates: Partial<SystemSettings>, updatedBy: string): Promise<void> {
  const path = 'system_settings/general';
  try {
    const normalizedUpdates: Partial<SystemSettings> = {
      ...updates,
      customerAutoOnPolicyVersion: CUSTOMER_AUTO_ON_POLICY_VERSION
    };

    // Always keep customerMessagesToSubAdminAutoOn and messageModeration mutually synchronized across all devices
    if (typeof updates.customerMessagesToSubAdminAutoOn === 'boolean') {
      normalizedUpdates.customerMessagesToSubAdminAutoOn = updates.customerMessagesToSubAdminAutoOn;
      normalizedUpdates.messageModeration = !updates.customerMessagesToSubAdminAutoOn;
    } else if (typeof updates.messageModeration === 'boolean') {
      normalizedUpdates.messageModeration = updates.messageModeration;
      normalizedUpdates.customerMessagesToSubAdminAutoOn = !updates.messageModeration;
    }

    await setDoc(
      doc(db, 'system_settings', 'general'),
      cleanFirestoreData({
        id: 'general',
        ...normalizedUpdates,
        updatedAt: new Date().toISOString(),
        updatedBy
      }),
      { merge: true }
    );
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

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void) {
  return onSnapshot(
    collection(db, 'audit_logs'),
    (snap) => {
      const logs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as AuditLog))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    },
    (err) => {
      console.warn('subscribeToAuditLogs notice:', err);
    }
  );
}

export async function recordCustomerDeviceLogin(
  profile: Pick<UserProfile, 'uid' | 'fullName' | 'email' | 'role'>,
  loginMethod: string = 'Email & Password'
): Promise<void> {
  if (!profile?.uid || profile.role !== 'customer') return;
  try {
    const now = new Date().toISOString();
    const device = await detectCurrentDeviceInfoAsync();
    const recordId = `dev_${profile.uid}_${Date.now()}`;

    const record: DeviceLoginRecord = {
      id: recordId,
      customerId: profile.uid,
      customerName: profile.fullName || 'Customer',
      customerEmail: (profile.email || '').toLowerCase().trim(),
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      deviceModel: device.deviceModel,
      os: device.os,
      browser: device.browser,
      screenResolution: device.screenResolution,
      timezone: device.timezone,
      userAgent: device.userAgent,
      loginMethod,
      loggedInAt: now,
      isHistorical: false
    };

    // 1. Write permanent immutable record to audit_logs so ALL logins since website launch are preserved forever
    await addDoc(
      collection(db, 'audit_logs'),
      cleanFirestoreData({
        action: 'customer_device_login',
        performedBy: record.customerName,
        performedByRole: 'customer',
        targetId: profile.uid,
        targetType: 'device_login',
        details: `${record.customerName} (${record.customerEmail}) logged in using ${record.deviceName} [${record.deviceType}] via ${loginMethod}.`,
        timestamp: now,
        customerEmail: record.customerEmail,
        customerName: record.customerName,
        deviceName: record.deviceName,
        deviceType: record.deviceType,
        deviceModel: record.deviceModel,
        os: record.os,
        browser: record.browser,
        screenResolution: record.screenResolution,
        timezone: record.timezone,
        userAgent: record.userAgent,
        loginMethod
      })
    );

    // 2. Also update latest device summary + bounded array on users/{uid} (never resurrect deleted accounts)
    try {
      const userRef = doc(db, 'users', profile.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const existingData = userSnap.data() as UserProfile;
        const existingLogins = Array.isArray(existingData.deviceLogins) ? existingData.deviceLogins : [];
        const updatedLogins = [record, ...existingLogins].slice(0, 100);
        await updateDoc(userRef, {
          lastLoginAt: now,
          lastDeviceName: record.deviceName,
          lastDeviceType: record.deviceType,
          deviceLogins: updatedLogins,
          isOnline: true,
          lastSeen: now,
          updatedAt: now
        });
      }
    } catch {
      // Ignore if account no longer exists
    }
  } catch (err) {
    console.warn('recordCustomerDeviceLogin notice:', err);
  }
}

export function buildAllCustomerDeviceLogins(
  customers: UserProfile[],
  auditLogs: AuditLog[]
): DeviceLoginRecord[] {
  const customerById = new Map<string, UserProfile>();
  const customerByEmail = new Map<string, UserProfile>();
  for (const c of customers) {
    customerById.set(c.uid, c);
    if (c.email) {
      customerByEmail.set(c.email.toLowerCase().trim(), c);
    }
  }

  const records: DeviceLoginRecord[] = [];
  const seenKeys = new Set<string>();

  const pushUnique = (rec: DeviceLoginRecord) => {
    const tsBucket = Math.floor(new Date(rec.loggedInAt).getTime() / 5000);
    const dedupeKey = `${rec.customerId}|${rec.deviceName}|${tsBucket}`;
    if (seenKeys.has(dedupeKey)) return;
    seenKeys.add(dedupeKey);
    records.push(rec);
  };

  // 1. Primary source: immutable customer_device_login logs from audit_logs
  for (const log of auditLogs) {
    if (log.action === 'customer_device_login') {
      const cust =
        (log.targetId ? customerById.get(log.targetId) : undefined) ||
        (log.customerEmail ? customerByEmail.get(log.customerEmail.toLowerCase().trim()) : undefined);

      const customerId = cust?.uid || log.targetId || log.customerEmail || log.id;
      const customerName = cust?.fullName || log.customerName || log.performedBy || 'Customer';
      const customerEmail = cust?.email || log.customerEmail || '';

      pushUnique({
        id: log.id,
        customerId,
        customerName,
        customerEmail,
        deviceName: log.deviceName || 'Web Browser Device',
        deviceType: log.deviceType || 'Desktop / Laptop',
        deviceModel: log.deviceModel,
        os: log.os,
        browser: log.browser,
        screenResolution: log.screenResolution,
        timezone: log.timezone,
        userAgent: log.userAgent,
        loginMethod: log.loginMethod || 'Login',
        loggedInAt: log.timestamp,
        isHistorical: false
      });
    }
  }

  // 2. Secondary source: embedded deviceLogins array on each customer profile
  for (const cust of customers) {
    if (Array.isArray(cust.deviceLogins)) {
      for (const dev of cust.deviceLogins) {
        if (!dev?.loggedInAt) continue;
        pushUnique({
          ...dev,
          customerId: cust.uid,
          customerName: cust.fullName || dev.customerName || 'Customer',
          customerEmail: cust.email || dev.customerEmail || ''
        });
      }
    }
  }

  // 3. Historical sessions since website creation (pre-device-tracking registrations / past activity)
  for (const log of auditLogs) {
    if (log.action === 'customer_registered') {
      const cust =
        (log.targetId ? customerById.get(log.targetId) : undefined) ||
        customers.find(c => log.details?.toLowerCase().includes((c.email || '').toLowerCase().trim()));
      const customerId = cust?.uid || log.targetId || log.id;
      const customerName = cust?.fullName || log.performedBy || 'Customer';
      const customerEmail = cust?.email || '';

      // Only add as historical entry if no detailed device login already exists within 60 seconds
      const regTs = new Date(log.timestamp).getTime();
      const hasDetailedNear = records.some(
        (r) => r.customerId === customerId && Math.abs(new Date(r.loggedInAt).getTime() - regTs) < 60000
      );
      if (!hasDetailedNear) {
        pushUnique({
          id: `hist_reg_${log.id}`,
          customerId,
          customerName,
          customerEmail,
          deviceName: 'Legacy Web Session (Account Registration — Before Device Tracking)',
          deviceType: 'Historical Session',
          loginMethod: 'Account Registration',
          loggedInAt: log.timestamp,
          isHistorical: true
        });
      }
    }
  }

  // 4. Include customer profile createdAt / lastSeen historical records if not already covered
  for (const cust of customers) {
    const custRecords = records.filter(r => r.customerId === cust.uid);

    if (cust.lastSeen) {
      const lastSeenTs = new Date(cust.lastSeen).getTime();
      const hasCloseRecord = custRecords.some(
        r => Math.abs(new Date(r.loggedInAt).getTime() - lastSeenTs) < 15 * 60 * 1000
      );
      if (!hasCloseRecord && Number.isFinite(lastSeenTs)) {
        pushUnique({
          id: `hist_seen_${cust.uid}`,
          customerId: cust.uid,
          customerName: cust.fullName || 'Customer',
          customerEmail: cust.email || '',
          deviceName: cust.lastDeviceName || 'Earlier Logged Session (Prior to Device Name Capture)',
          deviceType: (cust.lastDeviceType as DeviceLoginRecord['deviceType']) || 'Historical Session',
          loginMethod: 'Previous Active Session',
          loggedInAt: cust.lastSeen,
          isHistorical: !cust.lastDeviceName
        });
      }
    }

    if (cust.createdAt) {
      const createdTs = new Date(cust.createdAt).getTime();
      const hasCreationRecord = records.some(
        r => r.customerId === cust.uid && Math.abs(new Date(r.loggedInAt).getTime() - createdTs) < 15 * 60 * 1000
      );
      if (!hasCreationRecord && Number.isFinite(createdTs)) {
        pushUnique({
          id: `hist_created_${cust.uid}`,
          customerId: cust.uid,
          customerName: cust.fullName || 'Customer',
          customerEmail: cust.email || '',
          deviceName: 'Initial Account Creation Session (Legacy)',
          deviceType: 'Historical Session',
          loginMethod: 'Initial Account Created',
          loggedInAt: cust.createdAt,
          isHistorical: true
        });
      }
    }
  }

  return records.sort((a, b) => new Date(b.loggedInAt).getTime() - new Date(a.loggedInAt).getTime());
}

/* ---------------- INITIAL SEED DATA FOR DEMO & TESTING ---------------- */

export async function seedInitialDemoData(): Promise<void> {
  try {
    // 0. Clean up any accidental customer records that have sub-admin emails
    await sanitizeAndDeduplicateUsers();

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
        customPassword: 'zara12345',
        passwordVersion: 'zara_v1',
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      const existingSuper = superAdminSnap.data() as UserProfile;
      if (existingSuper.passwordVersion !== 'zara_v1') {
        await updateDoc(doc(db, 'users', 'super_admin_seed'), {
          customPassword: 'zara12345',
          passwordVersion: 'zara_v1',
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 1b. Check whether initial demo seeding already ran once OR accounts were deleted.
    // Once initialized, NEVER re-create demo sub-admin or customer accounts that Super Admin deleted!
    const generalSettingsSnap = await getDoc(doc(db, 'system_settings', 'general'));
    const generalSettingsData = generalSettingsSnap.exists() ? (generalSettingsSnap.data() as Record<string, any>) : null;
    const alreadyInitialized = Boolean(generalSettingsSnap.exists() || generalSettingsData?.initialSeedCompleted);

    if (alreadyInitialized) {
      if (!generalSettingsData?.initialSeedCompleted) {
        await setDoc(
          doc(db, 'system_settings', 'general'),
          { initialSeedCompleted: true },
          { merge: true }
        ).catch(() => {});
      }
      return;
    }

    const deletedRegistry = await getDeletedAccountRegistry();
    const isSeedBlocked = (seedUid: string, seedEmail: string) =>
      deletedRegistry.uids.has(seedUid) || deletedRegistry.emails.has(seedEmail.toLowerCase().trim());

    // 2. First-time setup only: seed default sub admin if not deleted
    if (!isSeedBlocked('sub_admin_1', 'subadmin@expresscargo.com')) {
      const subAdminSnap = await getDoc(doc(db, 'users', 'sub_admin_1'));
      if (!subAdminSnap.exists()) {
        await setDoc(doc(db, 'users', 'sub_admin_1'), {
          uid: 'sub_admin_1',
          email: 'subadmin@expresscargo.com',
          fullName: 'Sub Admin Station',
          role: 'sub_admin',
          phoneNumber: '+44 20 7946 0991',
          address: 'Heathrow Cargo Logistics Hub, Terminal 4',
          city: 'London',
          country: 'United Kingdom',
          postalCode: 'TW6 3XZ',
          isSuspended: false,
          notes: 'Dispatch station authority for air and freight corridors.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 3. First-time setup only: seed sample customer if not deleted
    if (!isSeedBlocked('customer_demo_1', 'customer@apexlogistics.com')) {
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
          assignedSubAdminName: 'Sub Admin Station',
          isSuspended: false,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Mark initial seed complete so deleted demo/seeded accounts NEVER reappear on future page loads
    await setDoc(
      doc(db, 'system_settings', 'general'),
      {
        ...DEFAULT_SYSTEM_SETTINGS,
        initialSeedCompleted: true
      },
      { merge: true }
    );

    // 4. Sample shipment with exact itemized fees matching live bill telemetry
    const sampleTracking = 'IEC-748920-EXP';
    const sampleFees: ItemizedFee[] = [
      {
        id: 'fee_shipment_cost',
        title: 'Shipment Cost Fee',
        purpose: 'CAR',
        amount: 0,
        currency: 'USD',
        status: 'paid',
        paidAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        paymentReference: 'PAID-SYS-001',
        addedBy: 'Sub Admin Station'
      },
      {
        id: 'fee_customs_duty',
        title: 'Customs Duty Fee',
        purpose: 'Standard border clearance inspection. shipment has been assessed duties and taxes totaling.',
        amount: 20000,
        currency: 'USD',
        status: 'paid',
        paidAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        paymentReference: 'PAID-CBP-20000',
        addedBy: 'Sub Admin Station'
      },
      {
        id: 'fee_extra_gold',
        title: 'EXTRA GOLD FOUND AT THE SUV ,WORTH HUGE SUM OF DOLLARS',
        purpose: 'EXTRA GOLD FOUND AT THE SUV ,WORTH HUGE SUM OF DOLLARS',
        amount: 135000,
        currency: 'USD',
        status: 'pending',
        addedBy: 'Sub Admin Station'
      }
    ];

    const samplePackageImages = [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80'
    ];

    const shipmentSnap = await getDoc(doc(db, 'shipments', sampleTracking));
    const now = new Date();
    const createdDate = new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString();
    const estDelivery = 'Oct 9, 2026';

    const shipmentData: Shipment = {
      id: sampleTracking,
      trackingNumber: sampleTracking,
      customerId: 'customer_demo_1',
      customerName: 'Elena Rostova (Apex Global Imports)',
      customerEmail: 'customer@apexlogistics.com',
      customerPhone: '+1 (415) 890-3344',
      subAdminId: 'sub_admin_1',
      subAdminName: 'Sub Admin Station',
      description: 'SUV Consignment & High-Value Cargo Transport',
      packageType: 'SUV & Sealed High-Value Container',
      weightKg: 2450,
      pieces: 1,
      dimensions: '480 x 195 x 185 cm',
      senderName: 'UK International Freight Terminal',
      senderPhone: '+44 20 7946 0991',
      senderAddress: 'London Heathrow Gateway Ramp 4',
      senderCountry: 'United Kingdom',
      recipientName: 'Valued Consignee',
      recipientPhone: '+1 (415) 890-3344',
      recipientAddress: '40 North 400 West Heber City, Utah 84032',
      recipientCountry: 'United States',
      pickupAddress: 'Washington ; 1000 H St NW',
      deliveryAddress: '40 North 400 West Heber City, Utah 84032',
      departureLocation: 'U.K',
      destinationLocation: 'U.S.A',
      currentLocation: 'U.S.A',
      carrier: 'Intermodal Freight Express / Global Logistics',
      status: 'arrival_destination',
      statusNotes: 'Handed over for final doorstep delivery! Delivery Completed (100%)',
      deliveryProgressPercentage: 100,
      estimatedDeliveryDate: estDelivery,
      customsDutyAmount: 135000.00,
      customsDutyCurrency: 'USD',
      customsPaymentStatus: 'pending',
      feePurpose: 'EXTRA GOLD FOUND AT THE SUV ,WORTH HUGE SUM OF DOLLARS',
      customsReference: 'CBP-GOLD-135000',
      customsNotes: 'Standard border clearance inspection. shipment has been assessed duties and taxes totaling.',
      itemizedFees: sampleFees,
      packageImages: samplePackageImages,
      photos: samplePackageImages.map((url, i) => ({
        id: `pkg-${i + 1}`,
        name: `Package Inspection #${i + 1}`,
        url,
        caption: `Verified Cargo Package Photo #${i + 1}`,
        uploadedAt: createdDate
      })),
      createdAt: createdDate,
      updatedAt: now.toISOString(),
    };

    if (!shipmentSnap.exists()) {
      await setDoc(doc(db, 'shipments', sampleTracking), cleanFirestoreData(shipmentData));
    } else {
      // Ensure existing shipment document has itemizedFees and updated pickup/delivery addresses
      const current = shipmentSnap.data() as Shipment;
      if (!current.itemizedFees || current.itemizedFees.length === 0 || !current.pickupAddress) {
        await updateDoc(doc(db, 'shipments', sampleTracking), cleanFirestoreData({
          pickupAddress: 'Washington ; 1000 H St NW',
          deliveryAddress: '40 North 400 West Heber City, Utah 84032',
          departureLocation: 'U.K',
          destinationLocation: 'U.S.A',
          currentLocation: 'U.S.A',
          deliveryProgressPercentage: 100,
          status: 'arrival_destination',
          itemizedFees: sampleFees,
          packageImages: samplePackageImages,
          customsDutyAmount: 135000.00,
          customsPaymentStatus: 'pending'
        }));
      }
    }

    // Sample events matching screenshot timeline
    const existingEvents = await getTrackingEvents(sampleTracking);
    if (!existingEvents || existingEvents.length === 0) {
      await addDoc(collection(db, 'tracking_events'), {
        shipmentId: sampleTracking,
        trackingNumber: sampleTracking,
        status: 'arrival_destination',
        title: 'Package Arrived at Destination',
        description: 'Standard border clearance inspection. shipment has been assessed duties and taxes totaling.',
        location: 'USA',
        facility: 'U.S.A Final Fulfillment Center',
        deliveryProgressPercentage: 100,
        timestamp: '2026-10-09T14:34:00Z',
        recordedBy: 'Sub Admin Station',
        recordedByRole: 'sub_admin'
      });

      await addDoc(collection(db, 'tracking_events'), {
        shipmentId: sampleTracking,
        trackingNumber: sampleTracking,
        status: 'in_transit',
        title: 'In Transit - CANADA',
        description: 'Transshipment through Canada sorting and customs transit corridor.',
        location: 'CANADA',
        facility: 'Montreal Intermodal Rail Hub',
        deliveryProgressPercentage: 75,
        timestamp: '2026-10-09T14:34:00Z',
        recordedBy: 'Sub Admin Station',
        recordedByRole: 'sub_admin'
      });

      await addDoc(collection(db, 'tracking_events'), {
        shipmentId: sampleTracking,
        trackingNumber: sampleTracking,
        status: 'in_transit',
        title: 'ICELAND',
        description: 'Atlantic transit refueling and security checkpoint clearance.',
        location: 'ICELAND',
        facility: 'Keflavik Freight Airfield',
        deliveryProgressPercentage: 50,
        timestamp: '2026-10-08T08:05:00Z',
        recordedBy: 'Sub Admin Station',
        recordedByRole: 'sub_admin'
      });

      await addDoc(collection(db, 'tracking_events'), {
        shipmentId: sampleTracking,
        trackingNumber: sampleTracking,
        status: 'in_transit',
        title: 'Ireland',
        description: 'Departed Shannon bonded staging facility en route across North Atlantic.',
        location: 'Ireland',
        facility: 'Shannon Gateway Hub',
        deliveryProgressPercentage: 25,
        timestamp: '2026-10-04T16:42:00Z',
        recordedBy: 'Sub Admin Station',
        recordedByRole: 'sub_admin'
      });
    }

    // 5. Channel for demo customer (starts completely clean with no auto-sent messages)
    const convId = 'conv_customer_demo_1';
    const convSnap = await getDoc(doc(db, 'conversations', convId));
    if (!convSnap.exists()) {
      await setDoc(doc(db, 'conversations', convId), {
        id: convId,
        customerId: 'customer_demo_1',
        customerName: 'Elena Rostova (Apex Global Imports)',
        customerEmail: 'customer@apexlogistics.com',
        subAdminId: 'sub_admin_1',
        subAdminName: 'Company Support',
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCustomerCount: 0,
        unreadAdminCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Error seeding demo data:', err);
  }
}

/* ---------------- REAL-TIME SYNCHRONIZATION & SUB-ADMIN SERVICES ---------------- */

export function subscribeToSubAdminCustomers(
  subAdminId: string,
  callback: (customers: UserProfile[]) => void
) {
  const q = query(collection(db, 'users'));
  return onSnapshot(
    q,
    (snapshot) => {
      const adminEmails = new Set<string>([
        'admin@gmail.com',
        'ebukaesieme@gmail.com',
        'subadmin@expresscargo.com'
      ]);

      snapshot.docs.forEach(d => {
        const u = d.data() as UserProfile;
        if ((u.role === 'sub_admin' || u.role === 'super_admin') && u.email) {
          adminEmails.add(u.email.toLowerCase().trim());
        }
      });

      const all = snapshot.docs.map(d => {
        const u = d.data() as UserProfile;
        if (u.assignedSubAdminName && (u.assignedSubAdminName.includes('Regional Dispatch Lead') || u.assignedSubAdminName.includes('Marcus Vance'))) {
          u.assignedSubAdminName = 'Company Support';
        }
        return u;
      });
      // Strict access control: only customers assigned to this subAdminId, excluding admin emails
      const assigned = all.filter(u => 
        u.role === 'customer' && 
        !adminEmails.has((u.email || '').toLowerCase().trim()) &&
        u.assignedSubAdminId === subAdminId
      );
      callback(assigned);
    },
    (err) => {
      console.warn('Real-time sub admin customer listener error:', err);
    }
  );
}

export function subscribeToAllCustomers(
  callback: (customers: UserProfile[]) => void
) {
  const q = query(collection(db, 'users'));
  return onSnapshot(
    q,
    (snapshot) => {
      const adminEmails = new Set<string>([
        'admin@gmail.com',
        'ebukaesieme@gmail.com',
        'subadmin@expresscargo.com'
      ]);

      snapshot.docs.forEach(d => {
        const u = d.data() as UserProfile;
        if ((u.role === 'sub_admin' || u.role === 'super_admin') && u.email) {
          adminEmails.add(u.email.toLowerCase().trim());
        }
      });

      const all = snapshot.docs
        .map(d => {
          const data = d.data() as UserProfile;
          const u: UserProfile = {
            ...data,
            uid: d.id,
            role: data.role || 'customer',
            fullName: data.fullName || data.email || 'Customer'
          };
          if (u.assignedSubAdminName && (u.assignedSubAdminName.includes('Regional Dispatch Lead') || u.assignedSubAdminName.includes('Marcus Vance'))) {
            u.assignedSubAdminName = 'Company Support';
          }
          return u;
        })
        .filter(u => Boolean(u.email || u.fullName));

      const customers = all.filter(
        u =>
          u.role !== 'super_admin' &&
          u.role !== 'sub_admin' &&
          !adminEmails.has((u.email || '').toLowerCase().trim())
      );

      customers.sort((a, b) => {
        const aUnassigned = !a.assignedSubAdminId || a.assignedSubAdminId === '' || a.assignedSubAdminId === 'unassigned';
        const bUnassigned = !b.assignedSubAdminId || b.assignedSubAdminId === '' || b.assignedSubAdminId === 'unassigned';
        if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

      callback(customers);
    },
    (err) => {
      console.warn('Real-time all customers listener error:', err);
    }
  );
}

export function subscribeToAllSubAdmins(
  callback: (subAdmins: UserProfile[]) => void
) {
  const q = query(collection(db, 'users'));
  return onSnapshot(
    q,
    (snapshot) => {
      const seenEmails = new Set<string>();
      const subAdmins: UserProfile[] = [];
      for (const d of snapshot.docs) {
        const raw = d.data() as UserProfile;
        if (raw.role === 'sub_admin') {
          const u: UserProfile = { ...raw, uid: d.id };
          if (u.fullName && (u.fullName.includes('Marcus Vance') || u.fullName.includes('Regional Dispatch Lead'))) {
            u.fullName = 'London Station Dispatch';
          }
          const dedupeKey = (u.email || u.uid).toLowerCase().trim();
          if (!seenEmails.has(dedupeKey)) {
            seenEmails.add(dedupeKey);
            subAdmins.push(u);
          }
        }
      }
      callback(subAdmins);
    },
    (err) => {
      console.warn('Real-time sub admins listener error:', err);
    }
  );
}

export function subscribeToSubAdminShipments(
  subAdminId: string,
  callback: (shipments: Shipment[]) => void
) {
  const q = query(collection(db, 'shipments'), where('subAdminId', '==', subAdminId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as Shipment);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Real-time sub admin shipments listener error:', err);
    }
  );
}

export function subscribeToCustomerShipments(
  customerId: string,
  callback: (shipments: Shipment[]) => void
) {
  const q = query(collection(db, 'shipments'), where('customerId', '==', customerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as Shipment);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Real-time customer shipments listener error:', err);
    }
  );
}

export function subscribeToSubAdminConversations(
  subAdminId: string,
  callback: (convs: Conversation[]) => void
) {
  const q = query(collection(db, 'conversations'), where('subAdminId', '==', subAdminId));
  return onSnapshot(
    q,
    async (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));

      // Resolve only Sub-Admin-visible messages so Sub-Admin NEVER sees Super Admin direct messages or edits
      await Promise.all(
        list.map(async (conv) => {
          try {
            const msgQ = query(
              collection(db, 'messages'),
              where('conversationId', '==', conv.id)
            );
            const msgSnap = await getDocs(msgQ);
            if (!msgSnap.empty) {
              const msgs = msgSnap.docs.map(d => d.data() as ChatMessage);
              msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              const subAdminVisibleMsgs = msgs.filter(isMessageVisibleToSubAdmin);
              if (subAdminVisibleMsgs.length > 0) {
                const latestMsg = subAdminVisibleMsgs[0];
                // Sub Admin ALWAYS sees originalText || text, never customerDisplayText or Super Admin direct messages
                const previewText = latestMsg.originalText || latestMsg.text || (latestMsg.attachmentType ? `[${latestMsg.attachmentType.toUpperCase()}]` : '');
                conv.subAdminLastMessage = previewText;
                conv.lastMessage = previewText;
                conv.lastMessageTime = latestMsg.createdAt || conv.lastMessageTime;
              } else {
                conv.subAdminLastMessage = '';
                conv.lastMessage = '';
                conv.lastMessageTime = '';
                conv.unreadAdminCount = 0;
              }
            } else {
              conv.subAdminLastMessage = '';
              conv.lastMessage = '';
              conv.lastMessageTime = '';
              conv.unreadAdminCount = 0;
            }
          } catch {
            // Never leak raw conv.lastMessage to Sub Admin
            conv.lastMessage = conv.subAdminLastMessage || '';
          }
        })
      );

      list.sort((a, b) => new Date(b.lastMessageTime || b.updatedAt).getTime() - new Date(a.lastMessageTime || a.updatedAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Real-time sub admin conversations listener error:', err);
    }
  );
}

/* ---------------- NOTIFICATIONS ---------------- */

export async function createNotification(notif: Omit<AppNotification, 'id' | 'createdAt'>): Promise<string> {
  const path = 'notifications';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'notifications'), cleanFirestoreData({
      ...notif,
      createdAt: now
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToNotifications(
  recipientId: string,
  callback: (notifs: AppNotification[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', 'in', [recipientId, 'all'])
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Real-time notifications listener error:', err);
    }
  );
}

export async function markNotificationRead(notifId: string): Promise<void> {
  const path = `notifications/${notifId}`;
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/* ---------------- SUB-ADMIN STRICT SCOPED SERVICES ---------------- */

export async function verifyCustomerAssignedToSubAdmin(customerId: string, subAdminId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', customerId));
    if (!snap.exists()) return false;
    const user = snap.data() as UserProfile;
    return user.role === 'customer' && user.assignedSubAdminId === subAdminId;
  } catch {
    return false;
  }
}

export async function createShipmentForSubAdmin(
  subAdminId: string,
  data: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>,
  actorName: string
): Promise<Shipment> {
  const isAssigned = await verifyCustomerAssignedToSubAdmin(data.customerId, subAdminId);
  if (!isAssigned) {
    throw new Error('Access Denied: You can only create deliveries for customers assigned directly to your dispatch station.');
  }

  const shipment = await createShipment(
    {
      ...data,
      subAdminId,
      subAdminName: actorName
    },
    actorName,
    'sub_admin'
  );

  // Send real-time notification to the customer
  await createNotification({
    recipientId: data.customerId,
    recipientRole: 'customer',
    type: 'delivery_update',
    title: 'New Cargo Consignment Booked',
    message: `A new shipment with tracking number ${shipment.trackingNumber} has been booked for you.`,
    linkId: shipment.id,
    read: false
  });

  await addAuditLog(
    'subadmin_create_shipment',
    actorName,
    'sub_admin',
    `Created consignment ${shipment.trackingNumber} for assigned customer ${data.customerName} (${data.customerId})`,
    shipment.id
  );

  return shipment;
}

export async function updateShipmentForSubAdmin(
  subAdminId: string,
  shipmentId: string,
  updates: Partial<Shipment>,
  actorName: string
): Promise<void> {
  const snap = await getDoc(doc(db, 'shipments', shipmentId));
  if (!snap.exists()) throw new Error('Shipment not found.');
  const current = snap.data() as Shipment;

  if (current.subAdminId !== subAdminId) {
    const isAssigned = await verifyCustomerAssignedToSubAdmin(current.customerId, subAdminId);
    if (!isAssigned) {
      throw new Error('Access Denied: You can only edit consignments belonging to your assigned customers.');
    }
  }

  await updateShipment(shipmentId, updates, actorName, 'sub_admin');

  // Notify customer of update
  await createNotification({
    recipientId: current.customerId,
    recipientRole: 'customer',
    type: 'delivery_update',
    title: 'Consignment Updated',
    message: `Shipment ${current.trackingNumber} details have been updated. Status: ${(updates.status || current.status).replace(/_/g, ' ').toUpperCase()}`,
    linkId: shipmentId,
    read: false
  });

  await addAuditLog(
    'subadmin_update_shipment',
    actorName,
    'sub_admin',
    `Updated consignment ${current.trackingNumber}. Status: ${updates.status || current.status}`,
    shipmentId
  );
}

export async function addTrackingCheckpointForSubAdmin(
  subAdminId: string,
  event: Omit<TrackingEvent, 'id'>,
  actorName: string
): Promise<string> {
  const snap = await getDoc(doc(db, 'shipments', event.shipmentId));
  if (!snap.exists()) throw new Error('Shipment not found.');
  const current = snap.data() as Shipment;

  if (current.subAdminId !== subAdminId) {
    const isAssigned = await verifyCustomerAssignedToSubAdmin(current.customerId, subAdminId);
    if (!isAssigned) {
      throw new Error('Access Denied: You cannot update tracking for an unassigned customer.');
    }
  }

  const eventId = await addTrackingEvent({
    ...event,
    recordedBy: actorName,
    recordedByRole: 'sub_admin'
  });

  // Update current shipment state
  await updateDoc(doc(db, 'shipments', event.shipmentId), cleanFirestoreData({
    currentLocation: event.location,
    status: event.status,
    deliveryProgressPercentage: event.deliveryProgressPercentage ?? current.deliveryProgressPercentage,
    statusNotes: event.description,
    delayExplanation: event.delayExplanation || current.delayExplanation || '',
    coordinates: event.coordinates || current.coordinates || null,
    updatedAt: new Date().toISOString()
  }));

  // Generate notification for customer
  await createNotification({
    recipientId: current.customerId,
    recipientRole: 'customer',
    type: 'tracking_event',
    title: event.title,
    message: `${event.description} [Location: ${event.location}]`,
    linkId: event.shipmentId,
    read: false
  });

  await addAuditLog(
    'subadmin_add_tracking_checkpoint',
    actorName,
    'sub_admin',
    `Added tracking checkpoint "${event.title}" at "${event.location}" for ${current.trackingNumber}`,
    event.shipmentId
  );

  return eventId;
}

export async function deleteShipmentForSubAdmin(
  subAdminId: string,
  shipmentId: string,
  actorName: string
): Promise<void> {
  const snap = await getDoc(doc(db, 'shipments', shipmentId));
  if (!snap.exists()) throw new Error('Shipment not found.');
  const current = snap.data() as Shipment;

  if (current.subAdminId !== subAdminId) {
    const isAssigned = await verifyCustomerAssignedToSubAdmin(current.customerId, subAdminId);
    if (!isAssigned) {
      throw new Error('Access Denied: You cannot delete shipments belonging to other administrators.');
    }
  }

  await deleteShipment(shipmentId);

  await addAuditLog(
    'subadmin_delete_shipment',
    actorName,
    'sub_admin',
    `Deleted consignment ${current.trackingNumber} for customer ${current.customerName}`,
    shipmentId
  );
}

