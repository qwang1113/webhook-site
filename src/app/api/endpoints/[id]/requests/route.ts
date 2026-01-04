import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { verifyManageKey } from '@/lib/crypto';
import type { ListRequestsResponse, WebhookRequest } from '@/types/database';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const url = new URL(request.url);
  
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const direction = url.searchParams.get('direction') || 'older';
  
  const supabase = getServerClient();
  
  const { data: endpoint, error: endpointError } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', id)
    .single();
  
  if (endpointError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
  
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

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const requestId = url.searchParams.get('request_id');
  const deleteAll = url.searchParams.get('all') === 'true';
  
  if (!key) {
    return NextResponse.json({ error: 'Missing manage key' }, { status: 401 });
  }
  
  const supabase = getServerClient();
  
  const { data: endpoint, error: endpointError } = await supabase
    .from('webhook_endpoints')
    .select('manage_key_hash')
    .eq('id', id)
    .single();
  
  if (endpointError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
  
  const isValid = await verifyManageKey(key, endpoint.manage_key_hash);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid manage key' }, { status: 403 });
  }
  
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
