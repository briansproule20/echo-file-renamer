import { EchoAccount } from '@/components/echo-account-next';
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
      className={`border-gray-200 border-b bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Echo Renamer"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <h1 className="font-semibold text-gray-900 text-xl dark:text-white">{title}</h1>
          </div>

          <nav className="flex items-center space-x-4">
            <EchoAccount />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
