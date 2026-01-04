import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { verifyManageKey } from '@/lib/crypto';
import { base64ToUint8Array } from '@/lib/capture';
import type { WebhookEndpoint, WebhookRequest } from '@/types/database';
import type { Database } from '@/types/supabase';

type ForwardInsert = Database['public']['Tables']['webhook_forwards']['Insert'];
type RouteParams = { params: Promise<{ id: string; requestId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id, requestId } = await params;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing manage key' }, { status: 401 });
  }

  const supabase = getServerClient();

  const { data: endpoint, error: endpointError } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', id)
    .single();

  if (endpointError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  const config = endpoint as WebhookEndpoint;

  const isValid = await verifyManageKey(key, config.manage_key_hash);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid manage key' }, { status: 403 });
  }

  if (!config.forward_enabled || !config.forward_url) {
    return NextResponse.json({ error: 'Forwarding not enabled' }, { status: 400 });
  }

  const { data: webhookRequest, error: requestError } = await supabase
    .from('webhook_requests')
    .select('*')
    .eq('id', parseInt(requestId, 10))
    .eq('endpoint_id', id)
    .single();

  if (requestError || !webhookRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const req = webhookRequest as WebhookRequest;
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  try {
    const headers = new Headers();
    if (req.headers) {
      for (const [k, v] of Object.entries(req.headers)) {
        const lower = k.toLowerCase();
        if (!['connection', 'keep-alive', 'host', 'transfer-encoding'].includes(lower)) {
          headers.set(k, v);
        }
      }
    }

    const additionalHeaders = config.forward_add_headers as Record<string, string>;
    for (const [k, v] of Object.entries(additionalHeaders)) {
      headers.set(k, v);
    }

    let body: ArrayBuffer | null = null;
    if (req.body) {
      const bytes = base64ToUint8Array(req.body);
      body = new ArrayBuffer(bytes.length);
      new Uint8Array(body).set(bytes);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.forward_timeout_ms);

    const response = await fetch(config.forward_url, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const durationMs = Date.now() - startTime;

    const forwardData: ForwardInsert = {
      request_id: req.id,
      endpoint_id: id,
      target_url: config.forward_url,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ok: response.ok,
      status: response.status,
      duration_ms: durationMs,
      error: null,
    };

    await supabase.from('webhook_forwards').insert(forwardData);

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      duration_ms: durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const forwardData: ForwardInsert = {
      request_id: req.id,
      endpoint_id: id,
      target_url: config.forward_url,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ok: false,
      status: null,
      duration_ms: durationMs,
      error: errorMessage,
    };

    await supabase.from('webhook_forwards').insert(forwardData);

    return NextResponse.json({
      ok: false,
      status: null,
      duration_ms: durationMs,
      error: errorMessage,
    });
  }
}
