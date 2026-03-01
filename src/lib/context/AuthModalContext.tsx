'use client';

import { createContext, useContext, useState } from 'react';

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
  return (
    <AuthModalContext.Provider value={{
      open,
      openLoginModal: () => setOpen(true),
      closeLoginModal: () => setOpen(false),
    }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}
