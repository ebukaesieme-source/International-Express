import React, { createContext, useContext, useEffect, useState } from 'react';
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
  getUserProfile,
  createOrUpdateUserProfile,
  updateUserPassword,
  getAllUsers,
  getSubAdmins,
  seedInitialDemoData,
  deleteUser,
  addAuditLog
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial seed and auth sync
  useEffect(() => {
    seedInitialDemoData().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserProfile(user);
      } else {
        // Check if there was a local session override for demo accounts
        const cachedRole = sessionStorage.getItem('iec_demo_role');
        const cachedUid = sessionStorage.getItem('iec_demo_uid');
        if (cachedUid && cachedRole) {
          let profile = await getUserProfile(cachedUid);
          if (profile) {
            if (profile.assignedSubAdminName && (profile.assignedSubAdminName.includes('Marcus Vance') || profile.assignedSubAdminName.includes('Regional Dispatch Lead'))) {
              profile = { ...profile, assignedSubAdminName: 'Company Support' };
            }
            if (profile.fullName && (profile.fullName.includes('Marcus Vance') || profile.fullName.includes('Regional Dispatch Lead'))) {
              profile = { ...profile, fullName: 'London Station Dispatch' };
            }
            setUserProfile(profile);
            setLoading(false);
            return;
          }
        }
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const syncUserProfile = async (user: FirebaseUser) => {
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
        await createOrUpdateUserProfile(profile);
        if (existingByEmail.uid !== user.uid) {
          await deleteUser(existingByEmail.uid);
        }
        sessionStorage.setItem('iec_demo_uid', user.uid);
        sessionStorage.setItem('iec_demo_role', 'sub_admin');
        setUserProfile(profile);
        return;
      }

      if (!profile) {
        if (existingByEmail) {
          profile = {
            ...existingByEmail,
            uid: user.uid
          };
          await createOrUpdateUserProfile(profile);
        } else {
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
          await createOrUpdateUserProfile(profile);
        }
      } else if (isSuperAdminEmail && profile.role !== 'super_admin') {
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

      sessionStorage.setItem('iec_demo_uid', profile.uid);
      sessionStorage.setItem('iec_demo_role', profile.role);
      setUserProfile(profile);
    } catch (err) {
      console.error('Failed to sync user profile:', err);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Super Admin login (supports updated custom password OR default admin12345)
    if (cleanEmail === 'admin@gmail.com' || cleanEmail === 'ebukaesieme@gmail.com') {
      let superProfile = await getUserProfile('super_admin_seed');
      if (!superProfile && auth.currentUser) {
        superProfile = await getUserProfile(auth.currentUser.uid);
      }
      const expectedPassword = superProfile?.customPassword || 'admin12345';
      if (pass === expectedPassword || pass === 'admin12345') {
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
            isSuspended: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await createOrUpdateUserProfile(superProfile);
        }
        sessionStorage.setItem('iec_demo_uid', superProfile.uid);
        sessionStorage.setItem('iec_demo_role', 'super_admin');
        setUserProfile(superProfile);
        setLoading(false);
        return;
      }
    }

    // 2. Check all registered accounts in Firestore database (Sub Admins, Customers)
    try {
      const allUsers = await getAllUsers();
      const match = allUsers.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
      if (match) {
        const expectedPass = match.customPassword || (match.role === 'sub_admin' ? 'subadmin12345' : '');
        if (expectedPass && (pass === expectedPass || pass === match.customPassword)) {
          // Attempt background Firebase Auth sign-in / registration so Auth session exists
          try {
            await signInWithEmailAndPassword(auth, cleanEmail, pass);
          } catch (e) {
            try {
              await createUserWithEmailAndPassword(auth, cleanEmail, pass);
            } catch (createErr) {
              // Keep going with profile
            }
          }
          sessionStorage.setItem('iec_demo_uid', match.uid);
          sessionStorage.setItem('iec_demo_role', match.role);
          setUserProfile(match);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Firestore database credential check:', e);
    }

    // 3. Direct Firebase Authentication Sign In
    try {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await syncUserProfile(res.user);
      const profile = await getUserProfile(res.user.uid);
      const resolvedRole = profile?.role || 'customer';
      sessionStorage.setItem('iec_demo_uid', res.user.uid);
      sessionStorage.setItem('iec_demo_role', resolvedRole);
      setLoading(false);
      return;
    } catch (err: any) {
      // Check sub admin demo accounts or customers
      if (cleanEmail === 'subadmin@expresscargo.com' && pass === 'subadmin12345') {
        let demoSub = await getUserProfile('sub_admin_1');
        if (!demoSub || demoSub.fullName.includes('Marcus Vance')) {
          demoSub = {
            uid: 'sub_admin_1',
            email: 'subadmin@expresscargo.com',
            fullName: 'London Station Dispatch',
            role: 'sub_admin',
            phoneNumber: '+44 20 7946 0991',
            address: 'Heathrow Cargo Logistics Hub, Terminal 4',
            city: 'London',
            country: 'United Kingdom',
            postalCode: 'TW6 3XZ',
            isSuspended: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await createOrUpdateUserProfile(demoSub);
        }
        sessionStorage.setItem('iec_demo_uid', 'sub_admin_1');
        sessionStorage.setItem('iec_demo_role', 'sub_admin');
        setUserProfile(demoSub);
        setLoading(false);
        return;
      }

      if (cleanEmail === 'customer@apexlogistics.com' && pass === 'customer12345') {
        let demoCust = await getUserProfile('customer_demo_1');
        if (!demoCust || (demoCust.assignedSubAdminName && demoCust.assignedSubAdminName.includes('Marcus Vance'))) {
          demoCust = {
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
            assignedSubAdminName: 'Company Support',
            isSuspended: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await createOrUpdateUserProfile(demoCust);
        }
        sessionStorage.setItem('iec_demo_uid', 'customer_demo_1');
        sessionStorage.setItem('iec_demo_role', 'customer');
        setUserProfile(demoCust);
        setLoading(false);
        return;
      }

      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerCustomer = async (data: RegisterData) => {
    setLoading(true);
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPassword = data.password.trim();

    try {
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

      // 2. Persist customer account record to Firestore "users" collection
      await createOrUpdateUserProfile(profile);
      setUserProfile(profile);
      sessionStorage.setItem('iec_demo_uid', uid);
      sessionStorage.setItem('iec_demo_role', 'customer');

      await addAuditLog(
        'customer_registered',
        profile.fullName,
        'customer',
        `New customer account registered on Firebase: ${profile.fullName} (${profile.email}), Country: ${profile.country}. Awaiting dispatch station acceptance.`,
        uid
      );
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      await syncUserProfile(res.user);
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAsRole = async (role: UserRole) => {
    setLoading(true);
    try {
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
        sessionStorage.setItem('iec_demo_uid', 'super_admin_seed');
        sessionStorage.setItem('iec_demo_role', 'super_admin');
        setUserProfile(profile);
      } else if (role === 'sub_admin') {
        let profile = await getUserProfile('sub_admin_1');
        if (!profile || profile.fullName.includes('Marcus Vance')) {
          profile = {
            uid: 'sub_admin_1',
            email: 'subadmin@expresscargo.com',
            fullName: 'London Station Dispatch',
            role: 'sub_admin',
            phoneNumber: '+44 20 7946 0991',
            address: 'Heathrow Cargo Logistics Hub, Terminal 4',
            city: 'London',
            country: 'United Kingdom',
            postalCode: 'TW6 3XZ',
            isSuspended: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await createOrUpdateUserProfile(profile);
        }
        sessionStorage.setItem('iec_demo_uid', 'sub_admin_1');
        sessionStorage.setItem('iec_demo_role', 'sub_admin');
        setUserProfile(profile);
      } else {
        let profile = await getUserProfile('customer_demo_1');
        if (!profile || (profile.assignedSubAdminName && profile.assignedSubAdminName.includes('Marcus Vance'))) {
          profile = {
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
            assignedSubAdminName: 'Company Support',
            isSuspended: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await createOrUpdateUserProfile(profile);
        }
        sessionStorage.setItem('iec_demo_uid', 'customer_demo_1');
        sessionStorage.setItem('iec_demo_role', 'customer');
        setUserProfile(profile);
      }
    } finally {
      setLoading(false);
    }
  };

  const changeSuperAdminPassword = async (newPassword: string, targetUid?: string) => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  const updateSuperAdminProfile = async (updates: Partial<UserProfile>, targetUid?: string) => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('iec_last_activity');
    sessionStorage.removeItem('iec_demo_uid');
    sessionStorage.removeItem('iec_demo_role');
    sessionStorage.removeItem('iec_active_tab');
    setUserProfile(null);
    setCurrentUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn(e);
    }
  };

  // 30-minute session inactivity auto-logout (quietly logs out without writing any reason)
  useEffect(() => {
    if (!userProfile && !currentUser) {
      localStorage.removeItem('iec_last_activity');
      return;
    }

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
    const STORAGE_KEY = 'iec_last_activity';

    // Record initial activity if not set
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    const performQuietLogout = async () => {
      localStorage.removeItem(STORAGE_KEY);
      await logout();
    };

    let lastRecorded = Date.now();
    const updateActivity = () => {
      const now = Date.now();
      // Throttle updates to at most once every 5 seconds
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        localStorage.setItem(STORAGE_KEY, now.toString());
      }
    };

    const checkInactivity = () => {
      const lastStr = localStorage.getItem(STORAGE_KEY);
      const lastTime = lastStr ? parseInt(lastStr, 10) : lastRecorded;
      if (Date.now() - lastTime >= INACTIVITY_TIMEOUT_MS) {
        performQuietLogout();
      }
    };

    // Immediate check on mount/refresh
    checkInactivity();

    // Check periodically every 10 seconds
    const intervalId = setInterval(checkInactivity, 10000);

    // Track user interaction events
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, updateActivity, { passive: true });
    });

    // Check when user returns to tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [userProfile?.uid, currentUser?.uid]);

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
