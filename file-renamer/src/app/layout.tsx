import Header from '@/app/_components/header';
import { Providers } from '@/providers';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Echo File Renamer',
  description: 'AI-powered bulk file renaming with Echo billing integration',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '500x500', type: 'image/png' },
    ],
    apple: '/icon.png',
    shortcut: '/icon.png',
  },
  openGraph: {
    title: 'Echo File Renamer',
    description: 'AI-powered bulk file renaming with Echo billing integration',
    type: 'website',
    images: [
      {
        url: '/icon.png',
        width: 500,
        height: 500,
        alt: 'Echo File Renamer',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Echo File Renamer',
    description: 'AI-powered bulk file renaming with Echo billing integration',
    images: ['/icon.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-screen flex-col antialiased`}
      >
        <Providers>
          <Header title="Echo File Renamer" />
          <div className="min-h-0 flex-1">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
