'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, BookOpen, Layers, History, Settings, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getActiveSession } from '../lib/data/sessions';

export function Navigation() {
  const pathname = usePathname();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkActive() {
      try {
        const session = await getActiveSession();
        if (isMounted) {
          setActiveSessionId(session?.id ?? null);
        }
      } catch {
        // ignore in tests / non-browser
      }
    }
    checkActive();
    const interval = setInterval(checkActive, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const navItems = [
    { label: 'Home', href: '/', icon: Dumbbell },
    { label: 'Library', href: '/library', icon: BookOpen },
    { label: 'Routines', href: '/routines', icon: Layers },
    { label: 'History', href: '/history', icon: History },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Floating Active Workout Banner if user navigated away from active session */}
      {activeSessionId && !pathname.startsWith('/session') && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto">
          <Link
            href={`/session?id=${activeSessionId}`}
            className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-xl shadow-emerald-950/40 border border-emerald-400/30 animate-pulse hover:brightness-110 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Active Workout</p>
                <p className="text-sm font-bold">Resume Logging</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur rounded-lg text-xs font-bold">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </div>
          </Link>
        </div>
      )}

      {/* Main Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e1017]/95 backdrop-blur-lg border-t border-zinc-800/80 pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-emerald-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-transform ${
                    isActive ? 'scale-110 bg-emerald-500/10' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
