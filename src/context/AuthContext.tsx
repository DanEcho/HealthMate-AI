
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
  // GoogleAuthProvider, // Removed
  // signInWithPopup, // Removed
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User as FirebaseUser,
  type AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Changed from 'next/navigation'

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  // signInWithGoogle: () => Promise<void>; // Removed
  registerWithEmailPassword: (email: string, pass: string) => Promise<void>;
  loginWithEmailPassword: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthError = (error: AuthError, context: string) => {
    console.error(`Error during ${context}:`, error);
    let message = error.message || `Failed to ${context.toLowerCase()}. Please try again.`;
    // More specific error messages
    if (error.code === 'auth/email-already-in-use') {
      message = 'This email address is already in use. Please try logging in or use a different email.';
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      message = 'Invalid email or password. Please check your credentials and try again.';
    } else if (error.code === 'auth/weak-password') {
      message = 'The password is too weak. Please choose a stronger password (at least 6 characters).';
    }
    toast({
      title: `${context} Failed`,
      description: message,
      variant: 'destructive',
    });
  };

  // const signInWithGoogle = async () => { // Removed
  //   setLoading(true);
  //   try {
  //     const provider = new GoogleAuthProvider();
  //     await signInWithPopup(auth, provider);
  //     toast({ title: 'Signed In Successfully', description: 'Welcome!' });
  //     router.push('/'); // Redirect to home after successful sign-in
  //   } catch (error) {
  //     handleAuthError(error as AuthError, 'Google Sign-In');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const registerWithEmailPassword = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      toast({ title: 'Registered Successfully', description: 'Welcome! You are now logged in.' });
      router.push('/'); // Redirect to home after successful registration
    } catch (error) {
      handleAuthError(error as AuthError, 'Registration');
      throw error; // Re-throw to allow form to handle its loading state
    } finally {
      setLoading(false);
    }
  };
  
  const loginWithEmailPassword = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({ title: 'Logged In Successfully', description: 'Welcome back!' });
      router.push('/'); // Redirect to home after successful login
    } catch (error) {
      handleAuthError(error as AuthError, 'Login');
      throw error; // Re-throw to allow form to handle its loading state
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login'); // Redirect to login after logout
    } catch (error) {
      handleAuthError(error as AuthError, 'Logout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, /*signInWithGoogle,*/ registerWithEmailPassword, loginWithEmailPassword, logout }}>
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
