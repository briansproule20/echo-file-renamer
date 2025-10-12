import { EchoAccount } from '@/components/echo-account-next';
import { ThemeToggle } from '@/components/theme-toggle';
import { isSignedIn } from '@/echo';
import Image from 'next/image';
import type { FC } from 'react';

interface HeaderProps {
  title?: string;
  className?: string;
}

const Header: FC<HeaderProps> = async ({
  title = 'My App',
  className = '',
}) => {
  const signedIn = await isSignedIn();

  return (
    <header
      className={`border-b bg-background/80 backdrop-blur-md shadow-sm ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Echo File Renamer"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <h1 className="font-semibold text-foreground text-xl">{title}</h1>
          </div>

          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <EchoAccount />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
