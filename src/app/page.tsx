'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateEndpointResponse } from '@/types/database';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createWebhook() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create webhook');
      }
      
      const data: CreateEndpointResponse = await response.json();
      router.push(`/endpoint/${data.endpoint_id}?key=${data.manage_key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Webhook Tester</h1>
          <p className="text-lg text-foreground/70">
            Create unique URLs to test and debug webhooks. Capture requests, customize responses, and forward to your server.
          </p>
        </div>

        <div className="bg-foreground/5 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Create a new webhook endpoint</h2>
          <p className="text-foreground/60 mb-6">
            Generate a unique URL that will capture all incoming HTTP requests.
          </p>
          
          <button
            onClick={createWebhook}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create New Webhook'}
          </button>
          
          {error && (
            <p className="mt-4 text-red-500">{error}</p>
          )}
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-foreground/5 rounded-lg">
            <h3 className="font-semibold mb-2">Capture Requests</h3>
            <p className="text-sm text-foreground/60">
              View headers, body, query parameters, and metadata for every request.
            </p>
          </div>
          <div className="p-6 bg-foreground/5 rounded-lg">
            <h3 className="font-semibold mb-2">Custom Responses</h3>
            <p className="text-sm text-foreground/60">
              Configure custom status codes, headers, and response body.
            </p>
          </div>
          <div className="p-6 bg-foreground/5 rounded-lg">
            <h3 className="font-semibold mb-2">Forward Requests</h3>
            <p className="text-sm text-foreground/60">
              Proxy incoming requests to your development server.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
