import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navigation } from '../components/Navigation';
import { AppInit } from '../components/AppInit';

export const metadata: Metadata = {
  title: 'Workout Tracker | Offline-First Gym Log',
  description: 'Personal offline-first PWA for logging workouts, tracking PRs, and progressive overload.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Workouts',
  },
};

export const viewport: Viewport = {
  themeColor: '#090a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090a0f] text-zinc-100 min-h-screen selection:bg-emerald-500/30 selection:text-emerald-200">
        <AppInit />
        <main className="max-w-lg mx-auto min-h-screen pb-28 px-4 pt-4">
          {children}
        </main>
        <Navigation />
      </body>
    </html>
  );
}
