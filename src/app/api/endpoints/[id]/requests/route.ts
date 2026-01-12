import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ListRequestsResponse, WebhookRequest } from '@/types/database';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/endpoints/[id]/requests - List requests for an endpoint
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const url = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify endpoint ownership
  const { data: endpoint, error: endpointError } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (endpointError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const direction = url.searchParams.get('direction') || 'older';

  let query = supabase
    .from('webhook_requests')
    .select('*')
    .eq('endpoint_id', id)
    .order('id', { ascending: direction === 'newer' })
    .limit(limit + 1);

  if (cursor) {
    const cursorNum = parseInt(cursor, 10);
    if (direction === 'older') {
      query = query.lt('id', cursorNum);
    } else {
      query = query.gt('id', cursorNum);
    }
  }

  const { data: requests, error: requestsError } = await query;

  if (requestsError) {
    return NextResponse.json({ error: requestsError.message }, { status: 500 });
  }

  const hasMore = requests.length > limit;
  const items = (hasMore ? requests.slice(0, limit) : requests) as WebhookRequest[];

  if (direction === 'newer') {
    items.reverse();
  }

  const { count } = await supabase
    .from('webhook_requests')
    .select('*', { count: 'exact', head: true })
    .eq('endpoint_id', id);

  const response: ListRequestsResponse = {
    items,
    next_cursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
    latest_cursor: items.length > 0 ? items[0].id : null,
    total_count: count || 0,
  };

  return NextResponse.json(response);
}

// DELETE /api/endpoints/[id]/requests - Delete request(s)
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const url = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify endpoint ownership
  const { data: endpoint, error: endpointError } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (endpointError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  const requestId = url.searchParams.get('request_id');
  const deleteAll = url.searchParams.get('all') === 'true';

  if (deleteAll) {
    const { error } = await supabase
      .from('webhook_requests')
      .delete()
      .eq('endpoint_id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: 'all' });
  }

  if (!requestId) {
    return NextResponse.json({ error: 'Missing request_id or all=true' }, { status: 400 });
  }

  const { error } = await supabase
    .from('webhook_requests')
    .delete()
    .eq('id', parseInt(requestId, 10))
    .eq('endpoint_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: requestId });
}
