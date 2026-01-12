import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateEndpointRequest, WebhookEndpoint } from '@/types/database';
import type { Database } from '@/types/supabase';

type EndpointUpdate = Database['public']['Tables']['webhook_endpoints']['Update'];
type RouteParams = { params: Promise<{ id: string }> };

// GET /api/endpoints/[id] - Get endpoint details
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  // Remove internal fields
  const { user_id: _userId, ...publicData } = data;
  void _userId;
  return NextResponse.json(publicData);
}

// PATCH /api/endpoints/[id] - Update endpoint
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: endpoint, error: fetchError } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  const body: UpdateEndpointRequest = await request.json();
  const updateData: EndpointUpdate = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.paused !== undefined) updateData.paused = body.paused;
  if (body.response_status !== undefined) updateData.response_status = body.response_status;
  if (body.response_content_type !== undefined) updateData.response_content_type = body.response_content_type;
  if (body.response_headers !== undefined) updateData.response_headers = body.response_headers;
  if (body.response_body !== undefined) updateData.response_body = body.response_body;
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
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { user_id: _userId2, ...publicData } = updated as WebhookEndpoint & { user_id: string };
  void _userId2;
  return NextResponse.json(publicData);
}

// DELETE /api/endpoints/[id] - Delete endpoint
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership and delete
  const { error: deleteError } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
