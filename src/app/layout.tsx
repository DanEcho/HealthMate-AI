
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HealthAssist AI',
  description: 'Get AI-powered health insights and find nearby medical facilities.',
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
};

// Note: We cannot directly pass props like headerLeftAction from RootLayout
// to AppShell if AppShell is a child of AuthProvider which is a client component.
// The AppLayoutClient will now be responsible for rendering the AppShell and passing the trigger.
// This file should remain a Server Component as much as possible.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
           {/* AppShell is now typically rendered by a client component (like AppLayoutClient)
               or the page itself if it needs to pass client-side interactive elements to it.
               For this structure to work with headerLeftAction being dynamic, the component
               that *creates* headerLeftAction (AppLayoutClient) would need to render AppShell.
               Alternatively, if AppShell is always static here, we'd need context for the toggle.

               For this iteration, let's assume AppLayoutClient will render AppShell.
               The children passed here will be the page content.
           */}
          {children} 
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
