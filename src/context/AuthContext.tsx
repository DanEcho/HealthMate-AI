
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Mock User Type for prototype
interface MockUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
  registerWithEmailPassword: (email: string, pass: string) => Promise<void>;
  loginWithEmailPassword: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(false); // No real async auth, so loading is minimal
  const { toast } = useToast();
  const router = useRouter();

  // Simulate checking auth state on load (e.g., from localStorage if you want persistence)
  useEffect(() => {
    const storedUser = localStorage.getItem('healthAssistMockUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('healthAssistMockUser');
      }
    }
    setLoading(false);
  }, []);

  const simulateAuthAction = async (email: string, actionType: 'Login' | 'Registration') => {
    setLoading(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUserData: MockUser = {
      uid: `mock-${Date.now()}`,
      email: email,
      displayName: email.split('@')[0],
    };
    setUser(mockUserData);
    try {
      localStorage.setItem('healthAssistMockUser', JSON.stringify(mockUserData));
    } catch (e) {
      // LocalStorage might be full or disabled
      console.warn("Could not save mock user to localStorage", e);
    }
    

    toast({ title: `${actionType} Successful`, description: actionType === 'Login' ? 'Welcome back!' : 'Welcome! You are now logged in.' });
    router.push('/');
    setLoading(false);
  };

  const registerWithEmailPassword = async (email: string, _pass: string) => {
    // Password isn't actually used for mock auth
    await simulateAuthAction(email, 'Registration');
  };
  
  const loginWithEmailPassword = async (email: string, _pass: string) => {
    // Password isn't actually used for mock auth
    await simulateAuthAction(email, 'Login');
  };

  const logout = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    setUser(null);
    localStorage.removeItem('healthAssistMockUser');
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    router.push('/login');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, registerWithEmailPassword, loginWithEmailPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
