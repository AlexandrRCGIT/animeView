'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthModalProvider } from '@/lib/context/AuthModalContext';
import { LoginModal } from '@/components/ui/LoginModal';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>
        {children}
        <LoginModal />
      </AuthModalProvider>
    </SessionProvider>
  );
}
