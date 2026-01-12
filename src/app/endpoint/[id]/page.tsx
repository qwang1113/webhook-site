'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { base64ToUint8Array } from '@/lib/capture';
import type { WebhookEndpoint, WebhookRequest, ListRequestsResponse } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EndpointPage({ params }: PageProps) {
  const { id } = use(params);
  const [endpoint, setEndpoint] = useState<Omit<WebhookEndpoint, 'user_id'> | null>(null);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      // Silently ignore
    }
  }, [id]);

  useEffect(() => {
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

  function tryParseAndFormatJson(str: string): string {
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  }

  async function deleteRequest(requestId: number) {
    try {
      const res = await fetch(`/api/endpoints/${id}/requests?request_id=${requestId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(null);
        }
      }
    } catch {
      // Silently ignore
    }
  }

  async function deleteAllRequests() {
    if (!confirm('Delete all requests?')) return;
    try {
      const res = await fetch(`/api/endpoints/${id}/requests?all=true`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRequests([]);
        setSelectedRequest(null);
      }
    } catch {
      // Silently ignore
    }
  }

  // Frontend forwarding
  const [forwarding, setForwarding] = useState(false);
  const [forwardResult, setForwardResult] = useState<{
    ok: boolean;
    status: number | null;
    error?: string;
  } | null>(null);

  async function forwardRequestFromClient(req: WebhookRequest) {
    if (!endpoint?.forward_url) return;

    setForwarding(true);
    setForwardResult(null);

    const startTime = Date.now();

    try {
      // Build headers (skip hop-by-hop headers)
      const skipHeaders = new Set([
        'connection',
        'keep-alive',
        'host',
        'transfer-encoding',
        'proxy-authenticate',
        'proxy-authorization',
        'te',
        'trailers',
        'upgrade',
      ]);

      const headers = new Headers();
      if (req.headers) {
        for (const [key, value] of Object.entries(req.headers as Record<string, string>)) {
          if (!skipHeaders.has(key.toLowerCase())) {
            headers.set(key, value);
          }
        }
      }

      // Add custom forward headers
      if (endpoint.forward_add_headers) {
        for (const [key, value] of Object.entries(
          endpoint.forward_add_headers as Record<string, string>
        )) {
          headers.set(key, value);
        }
      }

      // Build body
      let body: ArrayBuffer | null = null;
      if (req.body) {
        const bytes = base64ToUint8Array(req.body);
        body = bytes.buffer as ArrayBuffer;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutMs = endpoint.forward_timeout_ms || 10000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint.forward_url, {
        method: req.method,
        headers,
        body,
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      setForwardResult({
        ok: response.ok,
        status: response.status,
      });

      console.log(`Forward completed in ${durationMs}ms, status: ${response.status}`);
    } catch (err) {
      const durationMs = Date.now() - startTime;

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setForwardResult({
            ok: false,
            status: null,
            error: `Timeout after ${endpoint.forward_timeout_ms || 10000}ms`,
          });
        } else if (err.message.includes('CORS') || err.message.includes('cross-origin')) {
          setForwardResult({
            ok: false,
            status: null,
            error: 'CORS error - ensure your target server allows cross-origin requests',
          });
        } else {
          setForwardResult({
            ok: false,
            status: null,
            error: err.message,
          });
        }
      } else {
        setForwardResult({
          ok: false,
          status: null,
          error: 'Network error',
        });
      }

      console.error(`Forward failed after ${durationMs}ms:`, err);
    } finally {
      setForwarding(false);
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
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Endpoint not found'}</p>
          <Link href="/" className="text-blue-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/hook/${id}`;

  return (
    <main className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-foreground/10 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="text-foreground/50 hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold truncate">
              {endpoint.name || 'Webhook Endpoint'}
            </h1>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 text-sm bg-foreground/10 rounded-md hover:bg-foreground/15 transition-colors"
          >
            {showConfig ? 'Hide Settings' : 'Settings'}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3 bg-foreground/5 px-3 py-2 rounded-md">
          <code className="flex-1 text-sm truncate">{hookUrl}</code>
          <button
            onClick={() => copyToClipboard(hookUrl)}
            className="flex-shrink-0 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </header>

      {showConfig && (
        <ConfigPanel endpoint={endpoint} endpointId={id} onUpdate={setEndpoint} />
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 flex-shrink-0 border-r border-foreground/10 flex flex-col">
          <div className="px-4 py-3 border-b border-foreground/10 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground/70">
              Requests ({requests.length})
            </h2>
            {requests.length > 0 && (
              <button
                onClick={deleteAllRequests}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
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
                    onClick={() => {
                      setSelectedRequest(req);
                      setForwardResult(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedRequest?.id === req.id
                        ? 'bg-blue-600/20 ring-1 ring-blue-500/50'
                        : 'hover:bg-foreground/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                          req.method === 'GET'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : req.method === 'POST'
                            ? 'bg-blue-500/20 text-blue-400'
                            : req.method === 'PUT'
                            ? 'bg-amber-500/20 text-amber-400'
                            : req.method === 'DELETE'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {req.method}
                      </span>
                      <span className="text-sm truncate flex-1 font-mono">{req.path}</span>
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
          <div className="px-6 py-3 border-b border-foreground/10 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground/70">Request Details</h2>
            {selectedRequest && (
              <div className="flex items-center gap-3">
                {endpoint.forward_enabled && endpoint.forward_url && (
                  <button
                    onClick={() => forwardRequestFromClient(selectedRequest)}
                    disabled={forwarding}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                  >
                    {forwarding ? 'Forwarding...' : 'Forward'}
                  </button>
                )}
                <button
                  onClick={() => deleteRequest(selectedRequest.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {selectedRequest ? (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
              <div className="space-y-6">
                {forwardResult && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      forwardResult.ok
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {forwardResult.ok
                      ? `Forwarded successfully (${forwardResult.status})`
                      : `Forward failed: ${forwardResult.error || `Status ${forwardResult.status}`}`}
                  </div>
                )}
                <section>
                  <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3">
                    General
                  </h3>
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
                      <span className="font-mono text-xs">
                        {selectedRequest.content_type || '-'}
                      </span>
                    </div>
                    <div className="flex col-span-2">
                      <span className="w-28 text-foreground/50">Time</span>
                      <span>{formatDate(selectedRequest.received_at)}</span>
                    </div>
                  </div>
                </section>

                {selectedRequest.query &&
                  Object.keys(selectedRequest.query as object).length > 0 && (
                    <section>
                      <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3">
                        Query Parameters
                      </h3>
                      <pre className="text-sm bg-foreground/5 p-4 rounded-lg overflow-x-auto">
                        {formatJson(selectedRequest.query)}
                      </pre>
                    </section>
                  )}

                {selectedRequest.headers &&
                  Object.keys(selectedRequest.headers as object).length > 0 && (
                    <section>
                      <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3">
                        Headers
                      </h3>
                      <pre className="text-sm bg-foreground/5 p-4 rounded-lg overflow-x-auto">
                        {formatJson(selectedRequest.headers)}
                      </pre>
                    </section>
                  )}

                {selectedRequest.body && (
                  <section>
                    <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-3">
                      Body
                      {selectedRequest.body_size && (
                        <span className="ml-2 text-foreground/40 normal-case">
                          ({selectedRequest.body_size} bytes)
                        </span>
                      )}
                    </h3>
                    <pre className="text-sm bg-foreground/5 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all font-mono">
                      {tryParseAndFormatJson(decodeBody(selectedRequest.body))}
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
  endpoint: Omit<WebhookEndpoint, 'user_id'>;
  endpointId: string;
  onUpdate: (endpoint: Omit<WebhookEndpoint, 'user_id'>) => void;
}

function ConfigPanel({ endpoint, endpointId, onUpdate }: ConfigPanelProps) {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    name: endpoint.name || '',
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
      const res = await fetch(`/api/endpoints/${endpointId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } catch {
      // Silently ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-shrink-0 border-b border-foreground/10 bg-foreground/[0.02] px-6 py-4">
      <div className="grid md:grid-cols-4 gap-6 max-w-6xl">
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Name
          </h3>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            placeholder="Webhook name"
            className="w-full px-3 py-1.5 text-sm bg-foreground/5 rounded border border-foreground/10 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Response
          </h3>
          <div className="space-y-2">
            <input
              type="number"
              value={config.response_status}
              onChange={(e) =>
                setConfig({ ...config, response_status: parseInt(e.target.value) })
              }
              placeholder="Status Code"
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
          <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Forwarding
          </h3>
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
          <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Status
          </h3>
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
