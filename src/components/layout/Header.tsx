
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapIcon, Stethoscope, HomeIcon, LogIn, LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-[1000] w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="container flex h-16 items-center justify-between text-neutral-800">
        <div className="flex items-center gap-2"> {/* Reduced gap */}
          <Link href="/" passHref>
            <Button size="sm" className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <HomeIcon className="h-4 w-4" />
              <span>Home</span>
            </Button>
          </Link>
          <Link href="/hospitals" passHref>
            <Button size="sm" className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <MapIcon className="h-4 w-4" />
              <span>Hospitals</span>
            </Button>
          </Link>
        </div>
        
        <Link href="/" className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          <Stethoscope className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-neutral-800">
            HealthAssist AI
          </h1>
        </Link>

        <div className="flex items-center gap-2"> {/* Reduced gap */}
          {loading ? (
            <LoadingSpinner size={20} />
          ) : user ? (
            <>
              {user.email && <span className="text-sm text-neutral-500 hidden md:inline">Hi, {user.email.split('@')[0]}</span>}
              <Button size="sm" onClick={logout} className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" passHref>
                <Button size="sm" className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Button>
              </Link>
              <Link href="/signup" passHref>
                <Button variant="default" size="sm" className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  <UserPlus className="h-4 w-4" />
                  <span>Sign Up</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

