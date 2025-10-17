'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface AdminSession {
  uid: string;
  email: string | null;
  timestamp: number;
  expiresAt: number;
  isDefaultAdmin?: boolean;
}

interface AdminAuthContextType {
  adminSession: AdminSession | null;
  loading: boolean;
  logout: () => void;
  checkAdminStatus: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  adminSession: null,
  loading: true,
  logout: () => {},
  checkAdminStatus: async () => false,
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if the admin session is valid
  const checkAdminStatus = async (): Promise<boolean> => {
    try {
      // Check if we have a session in localStorage
      const sessionData = localStorage.getItem('adminSession');
      if (!sessionData) {
        return false;
      }

      const session = JSON.parse(sessionData) as AdminSession;
      
      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        localStorage.removeItem('adminSession');
        return false;
      }

      // If using default admin credentials, don't verify in Firestore
      if (session.isDefaultAdmin) {
        // Only set if different to avoid infinite renders
        if (!adminSession || adminSession.uid !== session.uid) {
          setAdminSession(session);
        }
        return true;
      }

      // Verify that the user still has admin privileges in Firestore
      const userDoc = await getDoc(doc(db, 'users', session.uid));
      const userData = userDoc.data();
      
      if (!userData || userData.role !== 'admin') {
        localStorage.removeItem('adminSession');
        return false;
      }

      // Only set if different to avoid infinite renders
      if (!adminSession || adminSession.uid !== session.uid) {
        setAdminSession(session);
      }
      return true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('adminSession');
    setAdminSession(null);
    router.push('/admin/auth');
  };

  // Check admin status on initial load
  useEffect(() => {
    const initAdminAuth = async () => {
      const isAdmin = await checkAdminStatus();
      
      // If not on auth page and not admin, redirect to auth page
      if (!isAdmin && pathname !== '/admin/auth' && pathname?.startsWith('/admin')) {
        router.push('/admin/auth');
      }
      
      setLoading(false);
    };

    initAdminAuth();
  }, [pathname]);

  // Periodically check if the session is still valid
  useEffect(() => {
    const interval = setInterval(async () => {
      if (adminSession) {
        const isStillAdmin = await checkAdminStatus();
        if (!isStillAdmin && pathname?.startsWith('/admin') && pathname !== '/admin/auth') {
          router.push('/admin/auth');
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [adminSession, pathname]);

  return (
    <AdminAuthContext.Provider value={{ adminSession, loading, logout, checkAdminStatus }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
