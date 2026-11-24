import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import {
  GeoAccessError,
  isUsaOnlyRestrictedAccount,
  verifyUserInUSA
} from '../utils/geoAccess';
import {
  getUserProfile,
  subscribeToUserProfile,
  createOrUpdateUserProfile,
  updateUserPassword,
  updateUserPresence,
  getAllUsers,
  getSubAdmins,
  seedInitialDemoData,
  deleteUserDocOnly,
  isAccountDeleted,
  unmarkAccountDeleted,
  addAuditLog,
  recordCustomerDeviceLogin
} from '../services/cargoService';

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  passportId?: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerCustomer: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  quickLoginAsRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changeSuperAdminPassword: (newPassword: string, targetUid?: string) => Promise<void>;
  updateSuperAdminProfile: (updates: Partial<UserProfile>, targetUid?: string) => Promise<void>;
  isSuperAdmin: boolean;
  isSubAdmin: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_STORAGE_KEY = 'iec_last_activity';

const safeGetLocal = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetLocal = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors in restricted environments
  }
};

const safeRemoveLocal = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const safeGetSession = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetSession = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const safeRemoveSession = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggingOutRef = useRef(false);
  const lastActivityMemoryRef = useRef<number>(Date.now());
  const userProfileRef = useRef<UserProfile | null>(null);
  const currentUserRef = useRef<FirebaseUser | null>(null);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const markSessionActive = useCallback((timestamp = Date.now()) => {
    lastActivityMemoryRef.current = timestamp;
    safeSetLocal(ACTIVITY_STORAGE_KEY, timestamp.toString());
  }, []);

  const enforceAccountNotSuspended = useCallback(async (
    profile: Partial<UserProfile> | null
  ) => {
    if (profile && profile.role !== 'super_admin' && profile.isSuspended === true) {
      lastActivityMemoryRef.current = 0;
      safeRemoveLocal(ACTIVITY_STORAGE_KEY);
      safeRemoveSession('iec_demo_uid');
      safeRemoveSession('iec_demo_role');
      safeRemoveSession('iec_active_tab');
      setUserProfile(null);
      setCurrentUser(null);
      try {
        await signOut(auth);
      } catch {}
      throw new GeoAccessError('This account has been suspended. Please contact Company Support.');
    }
  }, []);

  const enforceUsaAccessForProfile = useCallback(async (
    profile: Partial<UserProfile> | null,
    fallbackEmail?: string
  ) => {
    await enforceAccountNotSuspended(profile);
    if (!isUsaOnlyRestrictedAccount(profile, fallbackEmail)) {
      return;
    }
    const geo = await verifyUserInUSA();
    if (!geo.allowed) {
      addAuditLog(
        'blocked_non_usa_login',
        profile?.fullName || fallbackEmail || 'Restricted User',
        profile?.role || 'customer',
        `Blocked login attempt for USA-only account (${profile?.email || fallbackEmail || profile?.uid || 'unknown'}) from location: ${geo.countryName || geo.countryCode || 'Unverified'}`,
        profile?.uid
      ).catch(() => {});

      lastActivityMemoryRef.current = 0;
      safeRemoveLocal(ACTIVITY_STORAGE_KEY);
      safeRemoveSession('iec_demo_uid');
      safeRemoveSession('iec_demo_role');
      safeRemoveSession('iec_active_tab');
      setUserProfile(null);
      setCurrentUser(null);
      try {
        await signOut(auth);
      } catch {}
      throw new GeoAccessError(
        geo.reason ||
          'Invalid email or password. Please verify your credentials.'
      );
    }
  }, [enforceAccountNotSuspended]);

  // Initial seed and auth sync
  useEffect(() => {
    seedInitialDemoData().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        // Check if previous session expired due to 30-minute inactivity
        const lastActivityStr = safeGetLocal(ACTIVITY_STORAGE_KEY);
        if (lastActivityStr) {
          const lastTime = parseInt(lastActivityStr, 10);
          if (Number.isFinite(lastTime) && Date.now() - lastTime >= INACTIVITY_TIMEOUT_MS) {
            lastActivityMemoryRef.current = 0;
            safeRemoveLocal(ACTIVITY_STORAGE_KEY);
            safeRemoveSession('iec_demo_uid');
            safeRemoveSession('iec_demo_role');
            safeRemoveSession('iec_active_tab');
            try {
              await signOut(auth);
            } catch (e) {}
            setCurrentUser(null);
            setUserProfile(null);
            return;
          }
        }

        setCurrentUser(user);
        if (user) {
          await syncUserProfile(user, false);
        } else {
          // Check if there was a local session override for demo accounts
          const cachedRole = safeGetSession('iec_demo_role');
          const cachedUid = safeGetSession('iec_demo_uid');
          if (cachedUid && cachedRole) {
            let profile = await getUserProfile(cachedUid);
            if (profile) {
              try {
                await enforceUsaAccessForProfile(profile);
              } catch (geoErr) {
                if (geoErr instanceof GeoAccessError) {
                  return;
                }
                throw geoErr;
              }
              if (profile.assignedSubAdminName && (profile.assignedSubAdminName.includes('Marcus Vance') || profile.assignedSubAdminName.includes('Regional Dispatch Lead'))) {
                profile = { ...profile, assignedSubAdminName: 'Company Support' };
              }
              if (profile.fullName && (profile.fullName.includes('Marcus Vance') || profile.fullName.includes('Regional Dispatch Lead'))) {
                profile = { ...profile, fullName: 'London Station Dispatch' };
              }
              markSessionActive();
              setUserProfile(profile);
              if (profile.role === 'customer' && !safeGetSession(`iec_device_logged_${profile.uid}`)) {
                safeSetSession(`iec_device_logged_${profile.uid}`, '1');
                recordCustomerDeviceLogin(profile, 'Active Session Restored').catch(() => {});
              }
              return;
            }
          }
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Auth state initialization error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [markSessionActive, enforceUsaAccessForProfile]);

  const syncUserProfile = async (user: FirebaseUser, throwOnGeoBlock = false) => {
    try {
      let profile = await getUserProfile(user.uid);
      const cleanEmail = (user.email || '').toLowerCase().trim();
      const isSuperAdminEmail =
        cleanEmail === 'admin@gmail.com' ||
        cleanEmail === 'ebukaesieme@gmail.com';

      // Check if an existing profile already exists with this email across all registered users
      const allExisting = await getAllUsers();
      const existingByEmail = allExisting.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);

      // If an existing Sub Admin has this email, PRESERVE their role and station functions!
      if (existingByEmail && existingByEmail.role === 'sub_admin') {
        profile = {
          ...existingByEmail,
          uid: user.uid,
          role: 'sub_admin'
        };
        await enforceUsaAccessForProfile(profile, cleanEmail);
        await createOrUpdateUserProfile(profile);
        if (existingByEmail.uid !== user.uid) {
          await deleteUserDocOnly(existingByEmail.uid);
        }
        markSessionActive();
        safeSetSession('iec_demo_uid', user.uid);
        safeSetSession('iec_demo_role', 'sub_admin');
        setUserProfile(profile);
        return;
      }

      if (!profile) {
        if (existingByEmail) {
          profile = {
            ...existingByEmail,
            uid: user.uid
          };
          await enforceUsaAccessForProfile(profile, cleanEmail);
          await createOrUpdateUserProfile(profile);
          if (existingByEmail.uid !== user.uid) {
            await deleteUserDocOnly(existingByEmail.uid);
          }
        } else {
          // NEVER auto-recreate an account that Super Admin permanently deleted!
          if (!isSuperAdminEmail && (await isAccountDeleted(user.uid, cleanEmail))) {
            lastActivityMemoryRef.current = 0;
            safeRemoveLocal(ACTIVITY_STORAGE_KEY);
            safeRemoveSession('iec_demo_uid');
            safeRemoveSession('iec_demo_role');
            safeRemoveSession('iec_active_tab');
            setUserProfile(null);
            setCurrentUser(null);
            try {
              await signOut(auth);
            } catch {}
            throw new GeoAccessError('Invalid email or password. Please verify your credentials.');
          }

          const isSubAdminEmail = cleanEmail.includes('subadmin') || cleanEmail.endsWith('@subadmin.com');
          profile = {
            uid: user.uid,
            email: user.email || '',
            fullName: user.displayName || (isSuperAdminEmail ? 'Super Administrator' : isSubAdminEmail ? 'Sub Admin Station' : 'Valued Customer'),
            role: isSuperAdminEmail ? 'super_admin' : isSubAdminEmail ? 'sub_admin' : 'customer',
            assignedSubAdminId: '',
            assignedSubAdminName: '',
            isSuspended: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await enforceUsaAccessForProfile(profile, cleanEmail);
          await createOrUpdateUserProfile(profile);
        }
      } else {
        await enforceUsaAccessForProfile(profile, cleanEmail);
        if (isSuperAdminEmail && profile.role !== 'super_admin') {
          profile.role = 'super_admin';
          await createOrUpdateUserProfile(profile);
        } else {
          if (profile.assignedSubAdminName && (profile.assignedSubAdminName.includes('Marcus Vance') || profile.assignedSubAdminName.includes('Regional Dispatch Lead'))) {
            profile = { ...profile, assignedSubAdminName: 'Company Support' };
            await createOrUpdateUserProfile(profile);
          }
          if (profile.fullName && (profile.fullName.includes('Marcus Vance') || profile.fullName.includes('Regional Dispatch Lead'))) {
            profile = { ...profile, fullName: 'London Station Dispatch' };
            await createOrUpdateUserProfile(profile);
          }
        }
      }

      markSessionActive();
      safeSetSession('iec_demo_uid', profile.uid);
      safeSetSession('iec_demo_role', profile.role);
      setUserProfile(profile);
      if (profile.role === 'customer' && (throwOnGeoBlock || !safeGetSession(`iec_device_logged_${profile.uid}`))) {
        safeSetSession(`iec_device_logged_${profile.uid}`, '1');
        recordCustomerDeviceLogin(profile, throwOnGeoBlock ? 'Sign In' : 'Active Session').catch(() => {});
      }
    } catch (err) {
      if (err instanceof GeoAccessError && throwOnGeoBlock) {
        throw err;
      }
      console.error('Failed to sync user profile:', err);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    markSessionActive();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Super Admin login (uses zara12345 or any newer custom password updated by Super Admin)
    if (cleanEmail === 'admin@gmail.com' || cleanEmail === 'ebukaesieme@gmail.com') {
      let superProfile = await getUserProfile('super_admin_seed');
      if (!superProfile && auth.currentUser) {
        superProfile = await getUserProfile(auth.currentUser.uid);
      }
      const savedCustomPass =
        superProfile?.passwordVersion === 'zara_v1' && superProfile?.customPassword
          ? superProfile.customPassword
          : null;
      const expectedPassword = savedCustomPass || 'zara12345';

      if (pass !== expectedPassword) {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }

      try {
        await signInWithEmailAndPassword(auth, cleanEmail, pass);
      } catch (fbErr: any) {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        } catch (createErr) {
          // Keep going with profile
        }
      }
      if (!superProfile) {
        superProfile = {
          uid: 'super_admin_seed',
          email: cleanEmail,
          fullName: 'Executive Super Administrator',
          role: 'super_admin',
          phoneNumber: '+1 (800) 999-CARGO',
          address: 'One World Cargo Center, JFK Airport',
          city: 'New York',
          country: 'United States',
          postalCode: '11430',
          customPassword: expectedPassword,
          passwordVersion: 'zara_v1',
          isSuspended: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await createOrUpdateUserProfile(superProfile);
      } else if (superProfile.passwordVersion !== 'zara_v1' || superProfile.customPassword !== expectedPassword) {
        superProfile = { ...superProfile, customPassword: expectedPassword, passwordVersion: 'zara_v1' };
        await createOrUpdateUserProfile(superProfile);
      }
      markSessionActive();
      safeSetSession('iec_demo_uid', superProfile.uid);
      safeSetSession('iec_demo_role', 'super_admin');
      setUserProfile(superProfile);
      return;
    }

    // 2. Check all registered accounts in Firestore database (Sub Admins, Customers)
    let matchedFirestorePasswordMismatch = false;
    try {
      const allUsers = await getAllUsers();
      const matchingUsers = allUsers.filter(u => (u.email || '').toLowerCase().trim() === cleanEmail);
      // Prefer the most recently password-updated profile if duplicate docs exist
      const match = matchingUsers.sort((a, b) => {
        const aTime = new Date(a.passwordUpdatedAt || a.updatedAt || 0).getTime();
        const bTime = new Date(b.passwordUpdatedAt || b.updatedAt || 0).getTime();
        if (bTime !== aTime) return bTime - aTime;
        return (b.customPassword ? 1 : 0) - (a.customPassword ? 1 : 0);
      })[0];

      if (match) {
        const expectedPass = (match.customPassword || '').trim() || (match.role === 'sub_admin' ? 'subadmin12345' : '');
        if (expectedPass) {
          if (pass === expectedPass) {
            // Enforce USA-only login restriction BEFORE signing in or creating session
            await enforceUsaAccessForProfile(match, cleanEmail);

            // Attempt background Firebase Auth sign-in / registration so Auth session exists
            try {
              await signInWithEmailAndPassword(auth, cleanEmail, pass);
            } catch {
              try {
                await createUserWithEmailAndPassword(auth, cleanEmail, pass);
              } catch {
                // Keep going with authoritative Firestore profile (e.g. after Super Admin changed password)
                if (auth.currentUser && (auth.currentUser.email || '').toLowerCase().trim() !== cleanEmail) {
                  try {
                    await signOut(auth);
                  } catch {}
                }
              }
            }
            markSessionActive();
            safeSetSession('iec_demo_uid', match.uid);
            safeSetSession('iec_demo_role', match.role);
            setUserProfile(match);
            if (match.role === 'customer') {
              safeSetSession(`iec_device_logged_${match.uid}`, '1');
              recordCustomerDeviceLogin(match, 'Email & Password').catch(() => {});
            }
            return;
          } else {
            // Password was explicitly set/updated in Firestore (e.g. by Super Admin) — NEVER fall through
            // to Firebase Auth with the stale old password.
            matchedFirestorePasswordMismatch = true;
          }
        }
      }
    } catch (e) {
      if (e instanceof GeoAccessError) {
        throw e;
      }
      console.warn('Firestore database credential check:', e);
    }

    if (matchedFirestorePasswordMismatch) {
      throw new Error('Invalid email or password. Please verify your credentials.');
    }

    // 3. Direct Firebase Authentication Sign In
    try {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await syncUserProfile(res.user, true);
      const profile = await getUserProfile(res.user.uid);
      await enforceUsaAccessForProfile(profile, cleanEmail);
      const resolvedRole = profile?.role || 'customer';
      safeSetSession('iec_demo_uid', res.user.uid);
      safeSetSession('iec_demo_role', resolvedRole);
      return;
    } catch (err: any) {
      if (err instanceof GeoAccessError) {
        throw err;
      }
      // Check sub admin demo accounts or customers (only if NOT deleted by Super Admin)
      if (cleanEmail === 'subadmin@expresscargo.com' && pass === 'subadmin12345') {
        if (await isAccountDeleted('sub_admin_1', cleanEmail)) {
          throw new Error('Invalid email or password. Please verify your credentials.');
        }
        const demoSub = await getUserProfile('sub_admin_1');
        if (!demoSub) {
          throw new Error('Invalid email or password. Please verify your credentials.');
        }
        await enforceUsaAccessForProfile(demoSub, cleanEmail);
        markSessionActive();
        safeSetSession('iec_demo_uid', 'sub_admin_1');
        safeSetSession('iec_demo_role', 'sub_admin');
        setUserProfile(demoSub);
        return;
      }

      if (cleanEmail === 'customer@apexlogistics.com' && pass === 'customer12345') {
        if (await isAccountDeleted('customer_demo_1', cleanEmail)) {
          throw new Error('Invalid email or password. Please verify your credentials.');
        }
        const demoCust = await getUserProfile('customer_demo_1');
        if (!demoCust) {
          throw new Error('Invalid email or password. Please verify your credentials.');
        }
        await enforceUsaAccessForProfile(demoCust, cleanEmail);
        markSessionActive();
        safeSetSession('iec_demo_uid', 'customer_demo_1');
        safeSetSession('iec_demo_role', 'customer');
        setUserProfile(demoCust);
        safeSetSession(`iec_device_logged_${demoCust.uid}`, '1');
        recordCustomerDeviceLogin(demoCust, 'Email & Password').catch(() => {});
        return;
      }

      throw err;
    }
  };

  const registerCustomer = async (data: RegisterData) => {
    markSessionActive();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPassword = data.password.trim();

    let uid = '';

      // 1. Register email and password directly on Firebase Authentication
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        uid = cred.user.uid;
        if (data.fullName.trim()) {
          try {
            await updateProfile(cred.user, { displayName: data.fullName.trim() });
          } catch (nameErr) {
            console.warn('Set display name warning:', nameErr);
          }
        }
      } catch (authErr: any) {
        console.warn('Firebase Auth registration:', authErr);
        if (authErr?.code === 'auth/email-already-in-use') {
          // Email already exists in Firebase Auth - attempt verification via password
          try {
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
            uid = cred.user.uid;
          } catch (signInErr) {
            throw new Error('This email address is already registered on Firebase. Please sign in or use a different email.');
          }
        } else if (authErr?.code === 'auth/weak-password') {
          throw new Error('Password must be at least 6 characters.');
        } else if (authErr?.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        } else {
          // Fallback uid if Firebase Auth email provider is disabled or limited
          uid = 'cust_' + Date.now();
        }
      }

      // Newly registered customers are left unassigned so any Sub Admin can accept the account
      const assignedSubAdminId = '';
      const assignedSubAdminName = 'Unassigned (Awaiting Sub Admin Acceptance)';

      const profile: UserProfile = {
        uid,
        email: cleanEmail,
        fullName: data.fullName.trim(),
        role: 'customer',
        phoneNumber: data.phoneNumber?.trim() || '+1 (555) 000-0000',
        address: data.address?.trim() || 'Standard Delivery Address',
        city: data.city?.trim() || 'Gateway City',
        country: data.country?.trim() || 'United States',
        postalCode: data.postalCode?.trim() || '',
        passportId: data.passportId?.trim() || '',
        customPassword: cleanPassword, // Always preserve in Firestore so login works reliably
        assignedSubAdminId,
        assignedSubAdminName,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 2. Clear any prior deletion tombstone if this email is intentionally registering fresh, then persist to Firestore
      await unmarkAccountDeleted(uid, cleanEmail);
      await createOrUpdateUserProfile(profile);
      markSessionActive();
      setUserProfile(profile);
      safeSetSession('iec_demo_uid', uid);
      safeSetSession('iec_demo_role', 'customer');
      safeSetSession(`iec_device_logged_${uid}`, '1');
      recordCustomerDeviceLogin(profile, 'New Account Registration').catch(() => {});

      await addAuditLog(
        'customer_registered',
        profile.fullName,
        'customer',
        `New customer account registered on Firebase: ${profile.fullName} (${profile.email}), Country: ${profile.country}. Awaiting dispatch station acceptance.`,
        uid
      );
  };

  const loginWithGoogle = async () => {
    markSessionActive();
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    await syncUserProfile(res.user, true);
  };

  const quickLoginAsRole = async (role: UserRole) => {
    markSessionActive();
    if (role === 'super_admin') {
        let profile = await getUserProfile('super_admin_seed');
        if (!profile) {
          profile = {
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
          };
          await createOrUpdateUserProfile(profile);
        }
        safeSetSession('iec_demo_uid', 'super_admin_seed');
        safeSetSession('iec_demo_role', 'super_admin');
        setUserProfile(profile);
      } else if (role === 'sub_admin') {
        const subAdmins = await getSubAdmins();
        const profile = subAdmins[0] || (await getUserProfile('sub_admin_1'));
        if (!profile || (await isAccountDeleted(profile.uid, profile.email))) {
          throw new Error('No active Sub Admin account is available.');
        }
        safeSetSession('iec_demo_uid', profile.uid);
        safeSetSession('iec_demo_role', 'sub_admin');
        setUserProfile(profile);
      } else {
        const profile = await getUserProfile('customer_demo_1');
        if (!profile || (await isAccountDeleted(profile.uid, profile.email))) {
          throw new Error('This account is no longer active.');
        }
        safeSetSession('iec_demo_uid', profile.uid);
        safeSetSession('iec_demo_role', 'customer');
        setUserProfile(profile);
        safeSetSession(`iec_device_logged_${profile.uid}`, '1');
        recordCustomerDeviceLogin(profile, 'Quick Access Login').catch(() => {});
      }
  };

  const changeSuperAdminPassword = async (newPassword: string, targetUid?: string) => {
    const targetId = targetUid || userProfile?.uid || 'super_admin_seed';
      // 1. If currently signed in user is changing their own password via Firebase Auth
      if (!targetUid || targetUid === userProfile?.uid) {
        if (currentUser) {
          try {
            await updatePassword(currentUser, newPassword);
          } catch (authErr) {
            console.warn('Firebase Auth updatePassword warning (persisted to Firestore):', authErr);
          }
        }
      }

      // 2. Persist in target user's Firestore record
      await updateUserPassword(targetId, newPassword);
      if (targetId === 'super_admin_seed' || (userProfile?.role === 'super_admin' && (!targetUid || targetUid === userProfile.uid))) {
        try {
          await updateUserPassword('super_admin_seed', newPassword);
        } catch (e) {
          console.warn('Sync super_admin_seed password note:', e);
        }
      }

      // 3. Log Audit
      await addAuditLog(
        'password_changed',
        userProfile?.fullName || 'Super Admin',
        userProfile?.role || 'super_admin',
        `Security password updated successfully for account: ${targetId}`,
        targetId
      );

      // Refresh state
      if (!targetUid || targetUid === userProfile?.uid) {
        if (userProfile) {
          setUserProfile({ ...userProfile, customPassword: newPassword });
        }
      }
  };

  const updateSuperAdminProfile = async (updates: Partial<UserProfile>, targetUid?: string) => {
    const targetId = targetUid || userProfile?.uid || 'super_admin_seed';
      await createOrUpdateUserProfile({
        ...updates,
        uid: targetId
      });

      if (targetId === 'super_admin_seed' || (userProfile?.role === 'super_admin' && (!targetUid || targetUid === userProfile.uid))) {
        try {
          await createOrUpdateUserProfile({ ...updates, uid: 'super_admin_seed' });
        } catch (e) {
          console.warn(e);
        }
      }

      await addAuditLog(
        'profile_updated',
        userProfile?.fullName || 'Super Admin',
        userProfile?.role || 'super_admin',
        `Profile details updated for account ${updates.fullName || targetId}`,
        targetId
      );

      if (!targetUid || targetUid === userProfile?.uid) {
        if (userProfile) {
          setUserProfile({ ...userProfile, ...updates });
        }
      }
  };

  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    const uidToOffline = userProfileRef.current?.uid || currentUserRef.current?.uid;

    // Immediately clear session state and storage so logout never blocks on network calls
    lastActivityMemoryRef.current = 0;
    safeRemoveLocal(ACTIVITY_STORAGE_KEY);
    if (uidToOffline) {
      safeRemoveSession(`iec_device_logged_${uidToOffline}`);
    }
    safeRemoveSession('iec_demo_uid');
    safeRemoveSession('iec_demo_role');
    safeRemoveSession('iec_active_tab');
    setUserProfile(null);
    setCurrentUser(null);

    try {
      const cleanupTasks: Promise<unknown>[] = [
        signOut(auth).catch((e) => {
          console.warn(e);
        })
      ];
      if (uidToOffline) {
        cleanupTasks.push(updateUserPresence(uidToOffline, false).catch(() => {}));
      }
      await Promise.race([
        Promise.allSettled(cleanupTasks),
        new Promise((resolve) => setTimeout(resolve, 2500))
      ]);
    } finally {
      isLoggingOutRef.current = false;
    }
  }, []);

  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // User online presence heartbeat & unload listener
  useEffect(() => {
    if (!userProfile?.uid) return;
    const uid = userProfile.uid;

    // Immediately mark online
    updateUserPresence(uid, true).catch(() => {});

    // Periodic heartbeat every 60s
    const heartbeat = setInterval(() => {
      updateUserPresence(uid, true).catch(() => {});
    }, 60000);

    const handleBeforeUnload = () => {
      updateUserPresence(uid, false).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userProfile?.uid]);

  // Real-time enforcement of admin rules (suspension, USA-only login, role/assignment/profile updates) across all devices
  useEffect(() => {
    const uid = userProfile?.uid;
    if (!uid) return;

    let cancelled = false;
    let usaGeoVerifiedForUid = false;

    const unsubscribe = subscribeToUserProfile(uid, async (liveProfile) => {
      if (cancelled) return;

      // 0. If this account was permanently deleted by Super Admin, immediately sign out on all devices
      if (!liveProfile) {
        if (userProfileRef.current?.role !== 'super_admin' && uid !== 'super_admin_seed') {
          await logoutRef.current();
        }
        return;
      }

      // 1. Immediately enforce account suspension on any open phone/tablet/PC
      if (liveProfile.role !== 'super_admin' && liveProfile.isSuspended === true) {
        await logoutRef.current();
        return;
      }

      // 2. Enforce USA-only rule in real time if Super Admin enabled it while account was already signed in
      if (isUsaOnlyRestrictedAccount(liveProfile)) {
        if (!usaGeoVerifiedForUid) {
          const geo = await verifyUserInUSA();
          if (cancelled) return;
          if (!geo.allowed) {
            await logoutRef.current();
            return;
          }
          usaGeoVerifiedForUid = true;
        }
      } else {
        usaGeoVerifiedForUid = false;
      }

      // 3. Sync meaningful admin-updated fields into local session without re-rendering on presence heartbeats
      const prev = userProfileRef.current;
      if (!prev || prev.uid !== liveProfile.uid) return;

      // 2b. If Super Admin changed this customer/sub-admin password while logged in, sign out immediately so new password takes effect on all devices
      if (
        liveProfile.role !== 'super_admin' &&
        liveProfile.passwordUpdatedAt &&
        prev.passwordUpdatedAt !== liveProfile.passwordUpdatedAt
      ) {
        await logoutRef.current();
        return;
      }

      const hasRuleOrProfileChange =
        prev.fullName !== liveProfile.fullName ||
        prev.email !== liveProfile.email ||
        prev.role !== liveProfile.role ||
        prev.assignedSubAdminId !== liveProfile.assignedSubAdminId ||
        prev.assignedSubAdminName !== liveProfile.assignedSubAdminName ||
        prev.isSuspended !== liveProfile.isSuspended ||
        prev.usaOnlyLogin !== liveProfile.usaOnlyLogin ||
        prev.country !== liveProfile.country ||
        prev.city !== liveProfile.city ||
        prev.phoneNumber !== liveProfile.phoneNumber ||
        prev.address !== liveProfile.address ||
        prev.notes !== liveProfile.notes ||
        prev.customPassword !== liveProfile.customPassword ||
        prev.passwordVersion !== liveProfile.passwordVersion ||
        prev.passwordUpdatedAt !== liveProfile.passwordUpdatedAt;

      if (hasRuleOrProfileChange) {
        setUserProfile((curr) => (curr && curr.uid === liveProfile.uid ? { ...curr, ...liveProfile } : curr));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userProfile?.uid]);

  // 30-minute inactivity auto-logout across the entire website (quietly logs out without displaying any reason)
  useEffect(() => {
    if (!userProfile && !currentUser) {
      lastActivityMemoryRef.current = 0;
      safeRemoveLocal(ACTIVITY_STORAGE_KEY);
      return;
    }

    const getLastRecordedTime = (): number => {
      const storedStr = safeGetLocal(ACTIVITY_STORAGE_KEY);
      if (storedStr) {
        const parsed = parseInt(storedStr, 10);
        if (Number.isFinite(parsed)) {
          return Math.max(parsed, lastActivityMemoryRef.current || 0);
        }
      }
      return lastActivityMemoryRef.current || Date.now();
    };

    // Ensure a valid activity timestamp exists when session starts
    if (!safeGetLocal(ACTIVITY_STORAGE_KEY) || !lastActivityMemoryRef.current) {
      markSessionActive();
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastRecorded = getLastRecordedTime();

    const performQuietLogout = async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      await logoutRef.current();
    };

    const scheduleTimeout = (referenceTime: number) => {
      if (timeoutId) clearTimeout(timeoutId);
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - (Date.now() - referenceTime));
      timeoutId = setTimeout(() => {
        checkInactivity();
      }, remaining + 50);
    };

    const checkInactivity = (): boolean => {
      const lastTime = getLastRecordedTime();
      if (Number.isFinite(lastTime) && lastTime > 0 && Date.now() - lastTime >= INACTIVITY_TIMEOUT_MS) {
        performQuietLogout();
        return true;
      }
      return false;
    };

    const updateActivity = () => {
      // If 30 minutes have already elapsed (e.g. device woke from sleep or background throttling), log out immediately
      if (checkInactivity()) return;

      const now = Date.now();
      if (now - lastRecorded > 1000) {
        lastRecorded = now;
        markSessionActive(now);
        scheduleTimeout(now);
      }
    };

    // Initial check & timer schedule
    if (!checkInactivity()) {
      const initialTime = getLastRecordedTime();
      lastRecorded = initialTime;
      scheduleTimeout(initialTime);
    }

    // Periodic fallback check every 10 seconds
    const intervalId = setInterval(checkInactivity, 10000);

    // Track user interaction events across all nested scrollable containers (capture: true)
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'input',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
      'wheel',
      'pointerdown'
    ];
    activityEvents.forEach((evt) => {
      document.addEventListener(evt, updateActivity, { passive: true, capture: true });
    });

    // Check when user returns to tab, window gains focus, or browser restores from bfcache
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    // Sync activity and logout across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_STORAGE_KEY && e.newValue === null) {
        performQuietLogout();
      } else if (e.key === ACTIVITY_STORAGE_KEY && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (Number.isFinite(parsed)) {
          lastRecorded = parsed;
          lastActivityMemoryRef.current = parsed;
          scheduleTimeout(parsed);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(intervalId);
      activityEvents.forEach((evt) => {
        document.removeEventListener(evt, updateActivity, { capture: true });
      });
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [userProfile?.uid, currentUser?.uid, markSessionActive]);

  const refreshProfile = async () => {
    if (userProfile?.uid) {
      const p = await getUserProfile(userProfile.uid);
      if (p) setUserProfile(p);
    }
  };

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isSubAdmin = userProfile?.role === 'sub_admin';
  const isCustomer = userProfile?.role === 'customer';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        loginWithEmail,
        registerCustomer,
        loginWithGoogle,
        quickLoginAsRole,
        logout,
        refreshProfile,
        changeSuperAdminPassword,
        updateSuperAdminProfile,
        isSuperAdmin,
        isSubAdmin,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
