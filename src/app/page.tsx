'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface EndpointSummary {
  id: string;
  name: string | null;
  created_at: string;
  paused: boolean;
  forward_enabled: boolean;
  forward_url: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      // Get user info
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      // Fetch endpoints
      await fetchEndpoints();
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchEndpoints() {
    try {
      const res = await fetch('/api/endpoints');
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data.endpoints || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function createEndpoint() {
    setCreating(true);
    try {
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/endpoint/${data.endpoint_id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Webhook Tester</h1>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-sm text-foreground/60">{userEmail}</span>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Your Webhooks</h2>
          <button
            onClick={createEndpoint}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {creating ? 'Creating...' : 'New Webhook'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-foreground/60">Loading...</p>
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-16 bg-foreground/5 rounded-xl border border-foreground/10">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-foreground/20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No webhooks yet</h3>
            <p className="text-foreground/60 mb-6">
              Create your first webhook to start capturing requests.
            </p>
            <button
              onClick={createEndpoint}
              disabled={creating}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Your First Webhook'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <Link
                key={ep.id}
                href={`/endpoint/${ep.id}`}
                className="block p-4 bg-foreground/5 rounded-lg border border-foreground/10 hover:bg-foreground/[0.08] hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">
                      {ep.name || 'Unnamed Webhook'}
                    </h3>
                    <p className="text-sm text-foreground/50 font-mono mt-1">
                      /api/hook/{ep.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {ep.paused && (
                      <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                        Paused
                      </span>
                    )}
                    {ep.forward_enabled && (
                      <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                        Forwarding
                      </span>
                    )}
                    <span className="text-xs text-foreground/40">
                      {formatDate(ep.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Feature cards */}
        {endpoints.length === 0 && (
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-foreground/5 rounded-lg border border-foreground/10">
              <h3 className="font-semibold mb-2">Capture Requests</h3>
              <p className="text-sm text-foreground/60">
                View headers, body, query parameters, and metadata for every request.
              </p>
            </div>
            <div className="p-6 bg-foreground/5 rounded-lg border border-foreground/10">
              <h3 className="font-semibold mb-2">Custom Responses</h3>
              <p className="text-sm text-foreground/60">
                Configure custom status codes, headers, and response body.
              </p>
            </div>
            <div className="p-6 bg-foreground/5 rounded-lg border border-foreground/10">
              <h3 className="font-semibold mb-2">Forward Requests</h3>
              <p className="text-sm text-foreground/60">
                Proxy incoming requests to your development server.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
