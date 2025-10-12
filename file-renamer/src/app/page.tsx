import { FileRenamer } from '@/components/file-renamer';
import SignInButton from '@/app/_components/echo/sign-in-button';
import { isSignedIn } from '@/echo';

export default async function Home() {
  const signedIn = await isSignedIn();

  if (!signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h2 className="mt-6 font-bold text-3xl text-foreground tracking-tight">
              Echo Renamer
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
    <div className="min-h-screen p-8 bg-background">
      <FileRenamer />
    </div>
  );
}
