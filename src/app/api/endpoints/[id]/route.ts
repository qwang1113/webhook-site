import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { verifyManageKey } from '@/lib/crypto';
import type { UpdateEndpointRequest, WebhookEndpoint } from '@/types/database';
import type { Database } from '@/types/supabase';

type EndpointUpdate = Database['public']['Tables']['webhook_endpoints']['Update'];

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getServerClient();
  
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
  
  const endpoint = data as WebhookEndpoint;
  const { manage_key_hash: _, ...publicData } = endpoint;
  
  return NextResponse.json(publicData);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  
  if (!key) {
    return NextResponse.json({ error: 'Missing manage key' }, { status: 401 });
  }
  
  const supabase = getServerClient();
  
  const { data: endpointData, error: fetchError } = await supabase
    .from('webhook_endpoints')
    .select('manage_key_hash')
    .eq('id', id)
    .single();
  
  if (fetchError || !endpointData) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
  
  const endpointForPatch = endpointData as { manage_key_hash: string };
  const isValid = await verifyManageKey(key, endpointForPatch.manage_key_hash);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid manage key' }, { status: 403 });
  }
  
  const body: UpdateEndpointRequest = await request.json();
  
  const updateData: EndpointUpdate = {};
  
  if (body.name !== undefined) updateData.name = body.name;
  if (body.paused !== undefined) updateData.paused = body.paused;
  if (body.response_status !== undefined) updateData.response_status = body.response_status;
  if (body.response_content_type !== undefined) updateData.response_content_type = body.response_content_type;
  if (body.response_headers !== undefined) updateData.response_headers = body.response_headers;
  if (body.response_body !== undefined) updateData.response_body = body.response_body;
  if (body.capture_headers !== undefined) updateData.capture_headers = body.capture_headers;
  if (body.capture_body !== undefined) updateData.capture_body = body.capture_body;
  if (body.capture_body_max_bytes !== undefined) updateData.capture_body_max_bytes = body.capture_body_max_bytes;
  if (body.forward_enabled !== undefined) updateData.forward_enabled = body.forward_enabled;
  if (body.forward_url !== undefined) updateData.forward_url = body.forward_url;
  if (body.forward_timeout_ms !== undefined) updateData.forward_timeout_ms = body.forward_timeout_ms;
  if (body.forward_add_headers !== undefined) updateData.forward_add_headers = body.forward_add_headers;
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  
  const { data: updated, error: updateError } = await supabase
    .from('webhook_endpoints')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();
  
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  
  const updatedEndpoint = updated as WebhookEndpoint;
  const { manage_key_hash: __, ...publicData } = updatedEndpoint;
  return NextResponse.json(publicData);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  
  if (!key) {
    return NextResponse.json({ error: 'Missing manage key' }, { status: 401 });
  }
  
  const supabase = getServerClient();
  
  const { data: endpointData2, error: fetchError } = await supabase
    .from('webhook_endpoints')
    .select('manage_key_hash')
    .eq('id', id)
    .single();
  
  if (fetchError || !endpointData2) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
  
  const endpointForDelete = endpointData2 as { manage_key_hash: string };
  const isValid = await verifyManageKey(key, endpointForDelete.manage_key_hash);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid manage key' }, { status: 403 });
  }
  
  const { error: deleteError } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id);
  
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  
  return new Response(null, { status: 204 });
}
