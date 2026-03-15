'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthModalProvider } from '@/lib/context/AuthModalContext';
import { LoginModal } from '@/components/ui/LoginModal';
import { TvModeProvider } from '@/components/providers/TvModeProvider';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OnlineHeartbeat } from '@/components/analytics/OnlineHeartbeat';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <AuthModalProvider>
          <TvModeProvider>
            <ServiceWorkerRegister />
            <OnlineHeartbeat />
            {children}
            <LoginModal />
          </TvModeProvider>
        </AuthModalProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
