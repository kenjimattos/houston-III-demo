"use client"

import { createContext, useContext, ReactNode } from "react";

export interface CurrentUserContextType {
  user: any | null;
  userName: string | null;
  grupoId: string | null;
  userRole: string | null;
  permissions: string[];
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextType | null>(null);

interface CurrentUserProviderProps {
  value: CurrentUserContextType;
  children: ReactNode;
}

export function CurrentUserProvider({ value, children }: CurrentUserProviderProps) {
  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return context;
}
