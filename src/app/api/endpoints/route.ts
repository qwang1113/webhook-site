import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateEndpointRequest } from '@/types/database';
import type { Database } from '@/types/supabase';

type EndpointInsert = Database['public']['Tables']['webhook_endpoints']['Insert'];

// GET /api/endpoints - List all endpoints for the current user
export async function GET() {
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
    .select('id, name, created_at, paused, forward_enabled, forward_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ endpoints: data });
}

// POST /api/endpoints - Create a new endpoint
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: CreateEndpointRequest = await request.json().catch(() => ({}));

    const insertData: EndpointInsert = {
      user_id: user.id,
      name: body.name || null,
      forward_enabled: !!body.forward_url,
      forward_url: body.forward_url || null,
    };

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json(
      {
        endpoint_id: data.id,
        hook_url: `${baseUrl}/api/hook/${data.id}`,
        manage_url: `${baseUrl}/endpoint/${data.id}`,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
