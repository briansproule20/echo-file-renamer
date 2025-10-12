import { FileRenamer } from '@/components/file-renamer';
import SignInButton from '@/app/_components/echo/sign-in-button';
import { isSignedIn } from '@/echo';
import { cn } from '@/lib/utils';

export default async function Home() {
  const signedIn = await isSignedIn();

  if (!signedIn) {
    return (
      <div className="relative flex h-full items-center justify-center p-4">
        {/* Base background color */}
        <div className="fixed inset-0 -z-50 bg-white dark:bg-black" />
        {/* Dot pattern background */}
        <div
          className={cn(
            'fixed inset-0 -z-40',
            '[background-size:20px_20px]',
            '[background-image:radial-gradient(#d4d4d4_1px,transparent_1px)]',
            'dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]',
          )}
        />
        {/* Radial gradient fade */}
        <div className="pointer-events-none fixed inset-0 -z-30 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black" />

        <div className="relative z-10 w-full max-w-md space-y-8 text-center">
          <div>
            <h2 className="mt-6 font-bold text-3xl text-foreground tracking-tight">
              Echo File Renamer
            </h2>
            <p className="mt-2 text-muted-foreground text-sm">
              AI-powered bulk file renaming with built-in billing
            </p>
          </div>

          <div className="space-y-4">
            <SignInButton />

            <div className="text-muted-foreground text-xs">
              Secure authentication with built-in AI billing
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto p-4 md:p-8">
      {/* Base background color */}
      <div className="fixed inset-0 -z-50 bg-white dark:bg-black" />
      {/* Dot pattern background */}
      <div
        className={cn(
          'fixed inset-0 -z-40',
          '[background-size:20px_20px]',
          '[background-image:radial-gradient(#d4d4d4_1px,transparent_1px)]',
          'dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]',
        )}
      />
      {/* Radial gradient fade */}
      <div className="pointer-events-none fixed inset-0 -z-30 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black" />

      <FileRenamer />
    </div>
  );
}
