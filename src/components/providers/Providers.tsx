'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthModalProvider } from '@/lib/context/AuthModalContext';
import { LoginModal } from '@/components/ui/LoginModal';
import { TvModeProvider } from '@/components/providers/TvModeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>
        <TvModeProvider>
          {children}
          <LoginModal />
        </TvModeProvider>
      </AuthModalProvider>
    </SessionProvider>
  );
}
