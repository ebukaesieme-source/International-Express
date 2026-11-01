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
          const profile = await getUserProfile(cachedUid);
          if (profile) {
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
      const isSuperAdminEmail =
        user.email?.toLowerCase() === 'admin@gmail.com' ||
        user.email?.toLowerCase() === 'ebukaesieme@gmail.com';

      if (!profile) {
        // Assign a default sub admin if customer
        let assignedSubAdminId = '';
        let assignedSubAdminName = '';
        if (!isSuperAdminEmail) {
          const subs = await getSubAdmins();
          if (subs && subs.length > 0) {
            assignedSubAdminId = subs[0].uid;
            assignedSubAdminName = subs[0].fullName;
          }
        }

        profile = {
          uid: user.uid,
          email: user.email || '',
          fullName: user.displayName || (isSuperAdminEmail ? 'Super Administrator' : 'Valued Customer'),
          role: isSuperAdminEmail ? 'super_admin' : 'customer',
          assignedSubAdminId,
          assignedSubAdminName,
          isSuspended: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await createOrUpdateUserProfile(profile);
      } else if (isSuperAdminEmail && profile.role !== 'super_admin') {
        profile.role = 'super_admin';
        await createOrUpdateUserProfile(profile);
      }

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

    // 2. Check all registered accounts in Firestore database
    try {
      const allUsers = await getAllUsers();
      const match = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
      if (match && match.customPassword && match.customPassword === pass) {
        // Attempt background Firebase Auth sign-in / registration so Auth user exists
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
    } catch (e) {
      console.warn('Firestore database credential check:', e);
    }

    // 3. Direct Firebase Authentication Sign In
    try {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await syncUserProfile(res.user);
      sessionStorage.setItem('iec_demo_uid', res.user.uid);
      sessionStorage.setItem('iec_demo_role', 'customer');
      setLoading(false);
      return;
    } catch (err: any) {
      // Check sub admin demo accounts or customers
      if (cleanEmail === 'subadmin@expresscargo.com' && pass === 'subadmin12345') {
        let demoSub = await getUserProfile('sub_admin_1');
        if (!demoSub) {
          demoSub = {
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
        if (!demoCust) {
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
            assignedSubAdminName: 'Marcus Vance (Regional Dispatch Lead)',
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
        if (!profile) {
          profile = {
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
        if (!profile) {
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
            assignedSubAdminName: 'Marcus Vance (Regional Dispatch Lead)',
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
    sessionStorage.removeItem('iec_demo_uid');
    sessionStorage.removeItem('iec_demo_role');
    setUserProfile(null);
    setCurrentUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn(e);
    }
  };

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
