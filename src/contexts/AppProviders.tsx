import { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ChatProvider } from './ChatContext';
import { ChaptersProvider } from './ChaptersContext';
import { PrivateMessagesProvider } from './PrivateMessagesContext';
import { PresenceProvider } from './PresenceContext';
import { NotificationsProvider } from './NotificationsContext';

// ============================================
// APP PROVIDERS - Combined Provider Wrapper
// ============================================

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <PresenceProvider>
        <NotificationsProvider>
          <ChatProvider>
            <ChaptersProvider>
              <PrivateMessagesProvider>
                {children}
              </PrivateMessagesProvider>
            </ChaptersProvider>
          </ChatProvider>
        </NotificationsProvider>
      </PresenceProvider>
    </AuthProvider>
  );
}

export default AppProviders;
