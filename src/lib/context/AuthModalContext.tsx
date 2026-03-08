'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface AuthModalContextValue {
  open: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue>({
  open: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
});

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({
    open,
    openLoginModal: () => setOpen(true),
    closeLoginModal: () => setOpen(false),
  }), [open]);
  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}
