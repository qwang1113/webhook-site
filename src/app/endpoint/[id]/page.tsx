'use client';

import { useEffect, useState, useCallback, use } from 'react';
import type { WebhookEndpoint, WebhookRequest, ListRequestsResponse } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EndpointPage({ params }: PageProps) {
  const { id } = use(params);
  const [endpoint, setEndpoint] = useState<Omit<WebhookEndpoint, 'manage_key_hash'> | null>(null);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manageKey, setManageKey] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/endpoints/${id}/requests?limit=100`);
      if (res.ok) {
        const data: ListRequestsResponse = await res.json();
        setRequests(data.items);
      }
    } catch {
    }
  }, [id]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const key = urlParams.get('key');
    if (key) {
      setManageKey(key);
    }

    async function fetchEndpoint() {
      try {
        const res = await fetch(`/api/endpoints/${id}`);
        if (!res.ok) {
          throw new Error('Endpoint not found');
        }
        const data = await res.json();
        setEndpoint(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load endpoint');
      } finally {
        setLoading(false);
      }
    }

    fetchEndpoint();
    fetchRequests();

    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [id, fetchRequests]);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }

  function decodeBody(base64: string | null): string {
    if (!base64) return '';
    try {
      return decodeURIComponent(escape(atob(base64)));
    } catch {
      try {
        return atob(base64);
      } catch {
        return '[Binary data]';
      }
    }
  }

  function formatJson(obj: unknown): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </div>
    );
  }

  if (error || !endpoint) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-red-500">{error || 'Endpoint not found'}</p>
      </div>
    );
  }

  const hookUrl = `${window.location.origin}/api/hook/${id}`;

  return (
    <main className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-foreground/10 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold truncate">
            {endpoint.name || 'Webhook Endpoint'}
          </h1>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            {manageKey && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="px-3 py-1.5 text-sm bg-foreground/10 rounded-md hover:bg-foreground/15 transition-colors"
              >
                {showConfig ? 'Hide Settings' : 'Settings'}
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3 bg-foreground/5 px-3 py-2 rounded-md">
          <code className="flex-1 text-sm truncate">{hookUrl}</code>
          <button
            onClick={() => copyToClipboard(hookUrl)}
            className="flex-shrink-0 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            {copySuccess ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </header>

      {showConfig && manageKey && (
        <ConfigPanel
          endpoint={endpoint}
          endpointId={id}
          manageKey={manageKey}
          onUpdate={setEndpoint}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 flex-shrink-0 border-r border-foreground/10 flex flex-col">
          <div className="px-4 py-3 border-b border-foreground/10 flex-shrink-0">
            <h2 className="text-sm font-medium text-foreground/70">
              Requests ({requests.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {requests.length === 0 ? (
              <div className="p-4 text-sm text-foreground/50">
                No requests yet. Send a request to the URL above.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {requests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedRequest?.id === req.id
                        ? 'bg-blue-600/20 ring-1 ring-blue-500/50'
                        : 'hover:bg-foreground/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                        req.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' :
                        req.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                        req.method === 'PUT' ? 'bg-amber-500/20 text-amber-400' :
                        req.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {req.method}
                      </span>
                      <span className="text-sm truncate flex-1 font-mono">
                        {req.path}
                      </span>
                    </div>
                    <div className="text-xs text-foreground/40 mt-1">
                      {formatDate(req.received_at)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-foreground/10 flex-shrink-0">
            <h2 className="text-sm font-medium text-foreground/70">Request Details</h2>
          </div>
          
          {selectedRequest ? (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
              <div className="space-y-6 max-w-4xl">
                <section>
                  <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3">General</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex">
                      <span className="w-28 text-foreground/50">Method</span>
                      <span className="font-mono">{selectedRequest.method}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-foreground/50">Client IP</span>
                      <span className="font-mono">{selectedRequest.client_ip || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-foreground/50">Path</span>
                      <span className="font-mono break-all">{selectedRequest.path}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-foreground/50">Content-Type</span>
                      <span className="font-mono text-xs">{selectedRequest.content_type || '-'}</span>
                    </div>
                    <div className="flex col-span-2">
                      <span className="w-28 text-foreground/50">Time</span>
                      <span>{formatDate(selectedRequest.received_at)}</span>
                    </div>
                  </div>
                </section>

                {selectedRequest.query && Object.keys(selectedRequest.query).length > 0 && (
                  <section>
                    <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3">Query Parameters</h3>
                    <pre className="text-sm bg-foreground/5 p-4 rounded-lg overflow-x-auto">
                      {formatJson(selectedRequest.query)}
                    </pre>
                  </section>
                )}

                {selectedRequest.headers && Object.keys(selectedRequest.headers).length > 0 && (
                  <section>
                    <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3">Headers</h3>
                    <pre className="text-sm bg-foreground/5 p-4 rounded-lg overflow-x-auto">
                      {formatJson(selectedRequest.headers)}
                    </pre>
                  </section>
                )}

                {selectedRequest.body_preview && (
                  <section>
                    <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3">
                      Body
                      {selectedRequest.body_truncated && (
                        <span className="ml-2 text-amber-500 normal-case">
                          (truncated, {selectedRequest.body_size} bytes total)
                        </span>
                      )}
                    </h3>
                    <pre className="text-sm bg-foreground/5 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                      {decodeBody(selectedRequest.body_preview)}
                    </pre>
                  </section>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-foreground/40">Select a request to view details</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

interface ConfigPanelProps {
  endpoint: Omit<WebhookEndpoint, 'manage_key_hash'>;
  endpointId: string;
  manageKey: string;
  onUpdate: (endpoint: Omit<WebhookEndpoint, 'manage_key_hash'>) => void;
}

function ConfigPanel({ endpoint, endpointId, manageKey, onUpdate }: ConfigPanelProps) {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    response_status: endpoint.response_status,
    response_body: endpoint.response_body,
    response_content_type: endpoint.response_content_type,
    forward_enabled: endpoint.forward_enabled,
    forward_url: endpoint.forward_url || '',
    paused: endpoint.paused,
  });

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch(`/api/endpoints/${endpointId}?key=${manageKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-shrink-0 border-b border-foreground/10 bg-foreground/[0.02] px-6 py-4">
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Response</h3>
          <div className="space-y-2">
            <input
              type="number"
              value={config.response_status}
              onChange={(e) => setConfig({ ...config, response_status: parseInt(e.target.value) })}
              placeholder="Status Code"
              className="w-full px-3 py-1.5 text-sm bg-foreground/5 rounded border border-foreground/10 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              value={config.response_content_type}
              onChange={(e) => setConfig({ ...config, response_content_type: e.target.value })}
              placeholder="Content-Type"
              className="w-full px-3 py-1.5 text-sm bg-foreground/5 rounded border border-foreground/10 focus:border-blue-500 focus:outline-none"
            />
            <textarea
              value={config.response_body}
              onChange={(e) => setConfig({ ...config, response_body: e.target.value })}
              placeholder="Response Body"
              rows={2}
              className="w-full px-3 py-1.5 text-sm bg-foreground/5 rounded border border-foreground/10 focus:border-blue-500 focus:outline-none font-mono resize-none"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Forwarding</h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={config.forward_enabled}
              onChange={(e) => setConfig({ ...config, forward_enabled: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            Enable forwarding
          </label>
          <input
            type="url"
            value={config.forward_url}
            onChange={(e) => setConfig({ ...config, forward_url: e.target.value })}
            placeholder="https://your-server.com/webhook"
            disabled={!config.forward_enabled}
            className="w-full px-3 py-1.5 text-sm bg-foreground/5 rounded border border-foreground/10 focus:border-blue-500 focus:outline-none disabled:opacity-40"
          />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Status</h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={config.paused}
              onChange={(e) => setConfig({ ...config, paused: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            Pause webhook (returns 410)
          </label>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
