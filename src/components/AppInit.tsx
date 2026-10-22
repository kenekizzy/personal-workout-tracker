'use client';

import { useEffect } from 'react';
import { seedDatabase } from '../lib/seed';

export function AppInit() {
  useEffect(() => {
    // 1. Seed database with starter exercises & routines if first launch
    seedDatabase().catch(err => console.error('Database seed error:', err));

    // 2. Register Service Worker for offline capability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.error('SW registration failed:', err));
    }

    // 3. Request durable storage persistence
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) {
          console.log('IndexedDB persistent storage granted');
        }
      });
    }
  }, []);

  return null;
}
