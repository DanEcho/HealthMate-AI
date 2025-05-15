
import type { ReactNode } from 'react';
import { Header } from './Header';

interface AppShellProps {
  children: ReactNode;
  headerLeftAction?: ReactNode; // Prop to pass an element to the Header's left side
}

export function AppShell({ children, headerLeftAction }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header headerLeftAction={headerLeftAction} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HealthAssist AI. All rights reserved.
      </footer>
    </div>
  );
}
