'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const hasError = searchParams.get('error');

  const supabase = createClient();

  useEffect(() => {
    // If there's an error in URL, don't auto-redirect (show error instead)
    if (hasError) {
      setError(searchParams.get('error_description') || 'Login failed');
      return;
    }

    // Auto-trigger Google login
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
  }, [hasError, redirect, searchParams, supabase.auth]);

  return (
    <div className="w-full max-w-md text-center">
      {error ? (
        <div className="bg-foreground/5 rounded-xl p-8 border border-foreground/10">
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <p className="text-foreground/60">Redirecting to Google...</p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="text-foreground/60">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
