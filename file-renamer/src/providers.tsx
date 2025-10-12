'use client';

import { EchoProvider } from '@merit-systems/echo-next-sdk/client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <EchoProvider config={{ appId: process.env.NEXT_PUBLIC_ECHO_APP_ID! }}>
        {children}
      </EchoProvider>
    </ThemeProvider>
  );
}
