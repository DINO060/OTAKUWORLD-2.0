import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ChatProvider } from './ChatContext';
import { ChaptersProvider } from './ChaptersContext';

// ============================================
// APP PROVIDERS - Combined Provider Wrapper
// ============================================

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <ChatProvider>
        <ChaptersProvider>
          {children}
        </ChaptersProvider>
      </ChatProvider>
    </AuthProvider>
  );
}

export default AppProviders;
