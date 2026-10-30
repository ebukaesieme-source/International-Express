import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import {
  getUserProfile,
  createOrUpdateUserProfile,
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

    // Check if logging in as specified super admin: admin@gmail.com / admin12345
    if (cleanEmail === 'admin@gmail.com' && pass === 'admin12345') {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, pass);
      } catch (fbErr: any) {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        } catch (createErr) {
          // Guaranteed fallback profile in Firestore
          let demoProfile = await getUserProfile('super_admin_seed');
          if (!demoProfile) {
            demoProfile = {
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
            await createOrUpdateUserProfile(demoProfile);
          }
          sessionStorage.setItem('iec_demo_uid', 'super_admin_seed');
          sessionStorage.setItem('iec_demo_role', 'super_admin');
          setUserProfile(demoProfile);
          setLoading(false);
          return;
        }
      }
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
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
    try {
      let uid = '';
      try {
        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        uid = cred.user.uid;
      } catch (authErr: any) {
        // If Firebase Auth creates error or limits, fallback to deterministic or random unique ID
        uid = 'cust_' + Date.now();
      }

      // Newly registered customers are left unassigned so any Sub Admin can accept the account
      const assignedSubAdminId = '';
      const assignedSubAdminName = 'Unassigned (Awaiting Sub Admin Acceptance)';

      const profile: UserProfile = {
        uid,
        email: data.email,
        fullName: data.fullName,
        role: 'customer',
        phoneNumber: data.phoneNumber,
        address: data.address,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode || '',
        passportId: data.passportId || '',
        assignedSubAdminId,
        assignedSubAdminName,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createOrUpdateUserProfile(profile);
      setUserProfile(profile);
      sessionStorage.setItem('iec_demo_uid', uid);
      sessionStorage.setItem('iec_demo_role', 'customer');

      await addAuditLog(
        'customer_registered',
        profile.fullName,
        'customer',
        `New customer account registered: ${profile.fullName} (${profile.email}), Country: ${profile.country}. Awaiting acceptance by any Sub Admin dispatch officer.`,
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
