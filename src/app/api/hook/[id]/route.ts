import { after } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { captureRequest, uint8ArrayToBase64 } from '@/lib/capture';
import { forwardRequest } from '@/lib/forward';
import type { WebhookEndpoint } from '@/types/database';
import type { Database } from '@/types/supabase';

type RouteParams = { params: Promise<{ id: string }> };
type RequestInsert = Database['public']['Tables']['webhook_requests']['Insert'];
type ForwardInsert = Database['public']['Tables']['webhook_forwards']['Insert'];

async function handleWebhook(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getServerClient();
  
  const { data: endpoint, error: endpointError } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', id)
    .single();
  
  if (endpointError || !endpoint) {
    return new Response('Webhook not found', { status: 404 });
  }
  
  const config = endpoint as WebhookEndpoint;
  
  if (config.paused) {
    return new Response('Webhook paused', { status: 410 });
  }
  
  const captured = await captureRequest(request);
  
  const insertData: RequestInsert = {
    endpoint_id: id,
    method: captured.method,
    path: captured.path,
    query: captured.query,
    client_ip: captured.clientIp,
    user_agent: captured.userAgent,
    content_type: captured.contentType,
    content_length: captured.contentLength,
    body_size: captured.bodySize,
    body_sha256: captured.bodySha256,
    headers: captured.headers,
    body: captured.body ? uint8ArrayToBase64(captured.body) : null,
  };
  
  const { data: requestRecord, error: insertError } = await supabase
    .from('webhook_requests')
    .insert(insertData)
    .select('id')
    .single();
  
  if (insertError) {
    console.error('Failed to save request:', insertError);
  }
  
  if (config.forward_enabled && config.forward_url && requestRecord) {
    after(async () => {
      const startedAt = new Date().toISOString();
      
      const result = await forwardRequest(
        captured,
        config.forward_url!,
        config.forward_timeout_ms,
        config.forward_add_headers as Record<string, string>
      );
      
      const forwardData: ForwardInsert = {
        request_id: requestRecord.id,
        endpoint_id: id,
        target_url: config.forward_url!,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        ok: result.ok,
        status: result.status,
        duration_ms: result.durationMs,
        error: result.error,
      };
      
      await supabase.from('webhook_forwards').insert(forwardData);
    });
  }
  
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', config.response_content_type);
  
  if (config.response_headers) {
    const customHeaders = config.response_headers as Record<string, string>;
    for (const [key, value] of Object.entries(customHeaders)) {
      responseHeaders.set(key, value);
    }
  }
  
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', '*');
  
  return new Response(config.response_body, {
    status: config.response_status,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, ctx: RouteParams) {
  return handleWebhook(request, ctx);
}

export async function POST(request: Request, ctx: RouteParams) {
  return handleWebhook(request, ctx);
}

export async function PUT(request: Request, ctx: RouteParams) {
  return handleWebhook(request, ctx);
}

export async function PATCH(request: Request, ctx: RouteParams) {
  return handleWebhook(request, ctx);
}

export async function DELETE(request: Request, ctx: RouteParams) {
  return handleWebhook(request, ctx);
}

export async function OPTIONS(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getServerClient();
  
  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', id)
    .single();
  
  if (!endpoint) {
    return new Response('Webhook not found', { status: 404 });
  }
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}
